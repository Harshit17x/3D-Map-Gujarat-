import * as Cesium from 'cesium';
import { KUTCH_STUDY_AREA } from '../config/camera.config.ts';

/**
 * ViewshedManager — Radial Raycast / Terrain Sampling Viewshed Analysis
 *
 * APPROACH USED: Radial raycast / terrain-sampling (NOT shadow-map/shader).
 *
 * WHY NOT SHADOW-MAP:
 *   Cesium's `ShadowMap` API is internal/undocumented and not exposed on the
 *   public `Cesium.ShadowMap` constructor in CesiumJS 1.120. The PostProcessStage
 *   GLSL approach requires direct access to the shadow map framebuffer texture
 *   by name (e.g. `czm_shadowMap_textureCube`), which is an internal uniform
 *   that Cesium does not guarantee stable access to and changed between versions.
 *   Attempting to use it causes silent uniform-binding failures with no visible
 *   output — a fragile, unreliable path for this use case.
 *
 * WHY RAYCAST/SAMPLING:
 *   - Uses the stable public API: `viewer.scene.sampleHeightMostDetailed()` /
 *     `viewer.scene.clampToHeightMostDetailed()` which are fully documented.
 *   - Produces correct, inspectable results: green polylines for visible terrain
 *     cells, red polylines for occluded cells, clamped to terrain surface.
 *   - Follows the same DataSource pattern as contour lines — toggled via
 *     `dataSource.show`, zero post-process overhead when disabled.
 *   - Deterministic and easy to debug vs. a shader pass.
 *
 * Algorithm:
 *   1. Sample `NUM_BEARINGS` evenly spaced azimuths (0°–360°).
 *   2. Along each bearing, cast `SAMPLES_PER_RAY` range steps from min to max
 *      analysis radius.
 *   3. For each sample position, use the terrain height at that point and the
 *      observer eye height to compute whether the terrain horizon angle to that
 *      point is below or above the maximum horizon angle seen so far along the ray.
 *   4. Accumulate polyline segments: green = visible (angle not yet blocked),
 *      red = occluded (angle below running horizon maximum).
 *   5. Add all entities to a hidden CustomDataSource, toggled by `.show`.
 */

export interface ViewshedConfig {
  /** Observer height above terrain surface in metres (default 1.8 — eye height) */
  observerHeightAboveGround: number;
  /** Maximum analysis radius in metres (default 2500 — covers ~20 km² study area) */
  maxRadiusMetres: number;
  /** Number of radial bearings to sample (higher = more accurate, slower) */
  numBearings: number;
  /** Number of distance samples per bearing ray */
  samplesPerRay: number;
}

const DEFAULT_CONFIG: ViewshedConfig = {
  observerHeightAboveGround: 1.8,
  maxRadiusMetres: 2500,
  numBearings: 72,       // 5° step — good balance of accuracy vs. entity count
  samplesPerRay: 30,     // ~83m step at max radius
};

/** Colour for terrain/cells determined to be visible from the observer */
const COLOR_VISIBLE = Cesium.Color.fromCssColorString('#22c55e').withAlpha(0.55);  // green-500
/** Colour for terrain/cells determined to be hidden/occluded */
const COLOR_OCCLUDED = Cesium.Color.fromCssColorString('#ef4444').withAlpha(0.45); // red-500
/** Colour of the observer marker */
const COLOR_OBSERVER = Cesium.Color.fromCssColorString('#facc15'); // yellow-400

const DATA_SOURCE_NAME = 'viewshed-analysis';

export class ViewshedManager {
  private viewer: Cesium.Viewer;
  private config: ViewshedConfig;

  private dataSource: Cesium.CustomDataSource;
  private observerLat: number | null = null;
  private observerLon: number | null = null;
  private active = false;
  private computing = false;

  /** Optional callback invoked when computation starts/finishes */
  private onStateChangedCallback: ((state: 'idle' | 'computing' | 'ready' | 'disabled') => void) | null = null;

  constructor(viewer: Cesium.Viewer, config: Partial<ViewshedConfig> = {}) {
    this.viewer = viewer;
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.dataSource = new Cesium.CustomDataSource(DATA_SOURCE_NAME);
    // Start hidden — enabled only when the user places an observer
    this.dataSource.show = false;
    this.viewer.dataSources.add(this.dataSource);
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  /**
   * Set observer position (lat/lon in degrees) and immediately recompute the viewshed.
   * Mirror of toggleHillshadeLayer / toggleContourLayer pattern: sets `dataSource.show`.
   */
  async setObserver(lat: number, lon: number): Promise<void> {
    this.observerLat = lat;
    this.observerLon = lon;
    if (this.active) {
      await this.recompute();
    }
  }

  /** Enable (or reenable) the viewshed analysis layer. Recomputes if observer is set. */
  async enable(): Promise<void> {
    this.active = true;
    this.dataSource.show = true;
    if (this.observerLat !== null && this.observerLon !== null) {
      await this.recompute();
    }
    this.notifyState('idle');
  }

  /** Hide the viewshed layer (like hillshadeLayer.show = false). Does not destroy. */
  disable(): void {
    this.active = false;
    this.dataSource.show = false;
    this.dataSource.entities.removeAll();
    this.notifyState('disabled');
  }

  isEnabled(): boolean {
    return this.active;
  }

  /**
   * Update observer height and recompute if currently active.
   * Allows simulating a person (1.8m) vs tower (10m+) etc.
   */
  async updateObserverHeight(heightMetres: number): Promise<void> {
    this.config.observerHeightAboveGround = Math.max(0.1, heightMetres);
    if (this.active && this.observerLat !== null && this.observerLon !== null) {
      await this.recompute();
    }
  }

  /** Register a state-change callback for UI feedback */
  onStateChanged(cb: (state: 'idle' | 'computing' | 'ready' | 'disabled') => void): void {
    this.onStateChangedCallback = cb;
  }

  /** Clean up all entities and remove data source from viewer */
  destroy(): void {
    this.disable();
    this.viewer.dataSources.remove(this.dataSource, true);
  }

  // ─── Internal computation ─────────────────────────────────────────────────

  private async recompute(): Promise<void> {
    if (this.computing) return;
    if (this.observerLat === null || this.observerLon === null) return;

    this.computing = true;
    this.notifyState('computing');
    this.dataSource.entities.removeAll();

    const lat = this.observerLat;
    const lon = this.observerLon;
    const { observerHeightAboveGround, maxRadiusMetres, numBearings, samplesPerRay } = this.config;

    try {
      // ── 1. Sample terrain height at observer position ──────────────────────
      const observerCartographic = Cesium.Cartographic.fromDegrees(lon, lat);
      await this.sampleTerrainHeight([observerCartographic]);
      const observerTerrainHeight = observerCartographic.height;

      // Eye position of observer (terrain + eye height above ground)
      const observerEyeHeight = observerTerrainHeight + observerHeightAboveGround;
      const observerPosition = Cesium.Cartesian3.fromDegrees(lon, lat, observerTerrainHeight);

      // ── 2. Add observer marker ─────────────────────────────────────────────
      this.addObserverMarker(observerPosition, lat, lon);

      // ── 3. Radial raycast loop ─────────────────────────────────────────────
      const bearingStep = 360.0 / numBearings;

      for (let b = 0; b < numBearings; b++) {
        const bearingDeg = b * bearingStep;
        const bearingRad = Cesium.Math.toRadians(bearingDeg);

        // Collect sample cartographics along this ray
        const samples: Cesium.Cartographic[] = [];
        const distances: number[] = [];

        const minRadius = 30; // Skip the immediate ~30m around observer (avoids self-occlusion)

        for (let s = 1; s <= samplesPerRay; s++) {
          const dist = minRadius + ((maxRadiusMetres - minRadius) / samplesPerRay) * s;
          const sampleLonLat = this.destinationPoint(lat, lon, bearingRad, dist);
          samples.push(Cesium.Cartographic.fromDegrees(sampleLonLat.lon, sampleLonLat.lat));
          distances.push(dist);
        }

        // Batch-sample terrain heights for this ray
        await this.sampleTerrainHeight(samples);

        // ── 4. Determine visibility by running horizon angle ───────────────
        let maxHorizonAngle = -Infinity; // radians above horizontal from observer eye

        for (let s = 0; s < samples.length; s++) {
          const dist = distances[s];
          const sampleHeight = samples[s].height;
          const sampleLon = Cesium.Math.toDegrees(samples[s].longitude);
          const sampleLat = Cesium.Math.toDegrees(samples[s].latitude);

          // Elevation angle from observer eye to sample terrain top
          const heightDiff = sampleHeight - observerEyeHeight;
          const angle = Math.atan2(heightDiff, dist); // radians

          const visible = angle >= maxHorizonAngle;
          if (angle > maxHorizonAngle) {
            maxHorizonAngle = angle;
          }

          // ── 5. Render a short clamped polyline segment for this cell ──────
          // We draw from this sample position to the next (or just a tiny
          // stub at this sample point if it's the last sample on the ray).
          // Both endpoints are clamped to terrain so the line "paints" on it.
          let nextLonLat: { lat: number; lon: number };
          if (s + 1 < samples.length) {
            nextLonLat = {
              lat: Cesium.Math.toDegrees(samples[s + 1].latitude),
              lon: Cesium.Math.toDegrees(samples[s + 1].longitude)
            };
          } else {
            // Last point — extend a small stub forward
            const stub = this.destinationPoint(lat, lon, bearingRad, dist + 50);
            nextLonLat = stub;
          }

          this.dataSource.entities.add({
            polyline: {
              positions: Cesium.Cartesian3.fromDegreesArray([
                sampleLon, sampleLat,
                nextLonLat.lon, nextLonLat.lat
              ]),
              width: 2.5,
              material: visible ? COLOR_VISIBLE : COLOR_OCCLUDED,
              clampToGround: true,
              classificationType: Cesium.ClassificationType.TERRAIN
            }
          });
        }
      }

      this.notifyState('ready');
    } catch (err) {
      console.error('[ViewshedManager] Computation failed:', err);
      this.notifyState('idle');
    } finally {
      this.computing = false;
    }
  }

  /**
   * Sample terrain heights in-place using sampleTerrainMostDetailed when available,
   * falling back to globe.getHeight for immediate (lower-accuracy) results.
   */
  private async sampleTerrainHeight(positions: Cesium.Cartographic[]): Promise<void> {
    const terrainProvider = this.viewer.terrainProvider;
    try {
      // Most detailed sampling — uses the terrain tile tree
      const sampled = await Cesium.sampleTerrainMostDetailed(terrainProvider, positions);
      // Copy heights back in place (sampleTerrainMostDetailed returns a new array)
      for (let i = 0; i < positions.length; i++) {
        positions[i].height = sampled[i].height ?? 0;
      }
    } catch {
      // Fallback: read from currently loaded globe tiles (less accurate but synchronous)
      for (const pos of positions) {
        const h = this.viewer.scene.globe.getHeight(pos);
        pos.height = h ?? 0;
      }
    }
  }

  /**
   * Compute destination lat/lon given start lat/lon (degrees), bearing (radians),
   * and distance in metres. Uses the flat-earth approximation (valid for
   * distances << Earth radius, i.e., well within our 2500m study radius).
   */
  private destinationPoint(
    latDeg: number,
    lonDeg: number,
    bearingRad: number,
    distMetres: number
  ): { lat: number; lon: number } {
    const EARTH_RADIUS = 6_371_000; // metres
    const d = distMetres / EARTH_RADIUS;
    const lat1 = Cesium.Math.toRadians(latDeg);
    const lon1 = Cesium.Math.toRadians(lonDeg);

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(d) +
      Math.cos(lat1) * Math.sin(d) * Math.cos(bearingRad)
    );
    const lon2 =
      lon1 +
      Math.atan2(
        Math.sin(bearingRad) * Math.sin(d) * Math.cos(lat1),
        Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
      );

    return {
      lat: Cesium.Math.toDegrees(lat2),
      lon: Cesium.Math.toDegrees(lon2)
    };
  }

  /** Drop a small glowing yellow marker at the observer position. */
  private addObserverMarker(position: Cesium.Cartesian3, lat: number, lon: number): void {
    this.dataSource.entities.add({
      name: 'Viewshed Observer',
      position,
      point: {
        pixelSize: 12,
        color: COLOR_OBSERVER,
        outlineColor: Cesium.Color.fromCssColorString('#0B0F19'),
        outlineWidth: 2,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      },
      label: {
        text: `Observer\n${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`,
        font: '500 11px "Outfit", sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.fromCssColorString('#0B0F19'),
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -16),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        showBackground: true,
        backgroundColor: Cesium.Color.fromCssColorString('#0F172A').withAlpha(0.85),
        backgroundPadding: new Cesium.Cartesian2(6, 4)
      }
    });
  }

  private notifyState(state: 'idle' | 'computing' | 'ready' | 'disabled'): void {
    if (this.onStateChangedCallback) {
      this.onStateChangedCallback(state);
    }
  }

  // ─── Convenience getters for terrain bounds clamping ─────────────────────

  /** Returns the configured study-area bounds for caller reference. */
  static getStudyBounds(): typeof KUTCH_STUDY_AREA.bounds {
    return KUTCH_STUDY_AREA.bounds;
  }
}
