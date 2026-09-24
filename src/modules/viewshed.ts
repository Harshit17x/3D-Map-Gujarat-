import * as Cesium from 'cesium';
import { KUTCH_STUDY_AREA } from '../config/camera.config.ts';

/**
 * ViewshedManager — Continuous Draped Angular-Sector Viewshed Analysis
 *
 * APPROACH:
 *   Continuous angular sector mesh draped onto terrain using Cesium's
 *   ClassificationType.TERRAIN ground polygons.
 *
 * WHY CONTINUOUS ANGULAR SECTORS VS. SHADER POST-PROCESS:
 *   1. Full compatibility with Cesium 1.120+ without fragile internal uniform
 *      bindings (e.g. czm_shadowMap_textureCube) or shadow map framebuffers.
 *   2. Replaces discrete radial polylines (spoke/wheel pattern) with continuous,
 *      solid translucent color wash polygons matching professional GIS tools (QGIS/ArcGIS).
 *   3. High performance: samples all ray points in a single batch via
 *      sampleTerrainMostDetailed, then merges contiguous radial intervals into single
 *      quadrilaterals/triangles per angular wedge. This reduces entity count from
 *      thousands down to ~250-350 terrain-clamped polygons.
 *   4. Zero depth-buffer artifacts or black voids around observer: sampling starts
 *      right from observer feet (r=0) and observer is marked with a clean SVG pin billboard.
 *   5. Smooth edge falloff: polygon alpha fades towards outer radius edge so the boundary
 *      has a soft transition rather than a hard-cut circular ring.
 */

export interface ViewshedConfig {
  /** Observer height above terrain surface in metres (default 1.8 — eye height) */
  observerHeightAboveGround: number;
  /** Maximum analysis radius in metres (default 2500 — covers ~20 km² study area) */
  maxRadiusMetres: number;
  /** Number of radial bearings to sample (180 = 2° per sector for gapless coverage) */
  numBearings: number;
  /** Number of distance sample steps per radial bearing */
  samplesPerRay: number;
}

const DEFAULT_CONFIG: ViewshedConfig = {
  observerHeightAboveGround: 1.8,
  maxRadiusMetres: 2500,
  numBearings: 180,     // 2.0° per sector — gapless continuous coverage
  samplesPerRay: 25,    // 100m radial resolution up to 2500m
};

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
   */
  async setObserver(lat: number, lon: number): Promise<void> {
    this.observerLat = lat;
    this.observerLon = lon;
    if (this.active) {
      await this.recompute();
    }
  }

  /** Enable (or re-enable) the viewshed analysis layer. Recomputes if observer is set. */
  async enable(): Promise<void> {
    this.active = true;
    this.dataSource.show = true;
    if (this.observerLat !== null && this.observerLon !== null) {
      await this.recompute();
    }
    this.notifyState('idle');
  }

  /** Hide the viewshed layer and clear all entities to prevent leftover artifacts. */
  disable(): void {
    this.active = false;
    this.dataSource.show = false;
    this.dataSource.entities.removeAll();
    this.notifyState('disabled');
  }

  /** Fully reset observer and clear all entities */
  clear(): void {
    this.observerLat = null;
    this.observerLon = null;
    this.disable();
  }

  isEnabled(): boolean {
    return this.active;
  }

  /**
   * Update observer height and recompute if currently active.
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
    // Ensure all prior entities are purged with zero leftovers
    this.dataSource.entities.removeAll();

    const lat = this.observerLat;
    const lon = this.observerLon;
    const { observerHeightAboveGround, maxRadiusMetres, numBearings, samplesPerRay } = this.config;

    try {
      // ── 1. Sample terrain height at observer position ──────────────────────
      const observerCartographic = Cesium.Cartographic.fromDegrees(lon, lat);
      await this.sampleTerrainHeight([observerCartographic]);
      const observerTerrainHeight = observerCartographic.height ?? 0;

      // Eye height in absolute metres
      const observerEyeHeight = observerTerrainHeight + observerHeightAboveGround;
      const observerPosition = Cesium.Cartesian3.fromDegrees(lon, lat, observerTerrainHeight);

      // ── 2. Add observer pin marker (reusing CustomPoint style) ────────────
      this.addObserverMarker(observerPosition, lat, lon);

      // ── 3. Precompute destination grid coordinates ─────────────────────────
      // gridPoints[b][s] where b = bearing index (0..numBearings-1),
      // s = step index (0..samplesPerRay).
      // s = 0 is observer center (dist = 0).
      // s = 1..samplesPerRay are distance steps out to maxRadiusMetres.
      const bearingStepDeg = 360.0 / numBearings;
      const gridPoints: Array<Array<{ lat: number; lon: number }>> = [];
      const allSampleCartographics: Cesium.Cartographic[] = [];

      for (let b = 0; b < numBearings; b++) {
        const bearingDeg = b * bearingStepDeg;
        const bearingRad = Cesium.Math.toRadians(bearingDeg);
        const rayPoints: Array<{ lat: number; lon: number }> = [];

        // s = 0: origin
        rayPoints.push({ lat, lon });

        for (let s = 1; s <= samplesPerRay; s++) {
          const dist = (s / samplesPerRay) * maxRadiusMetres;
          const pt = this.destinationPoint(lat, lon, bearingRad, dist);
          rayPoints.push(pt);
          allSampleCartographics.push(Cesium.Cartographic.fromDegrees(pt.lon, pt.lat));
        }
        gridPoints.push(rayPoints);
      }

      // ── 4. Batch-sample all terrain heights in one single operation ────────
      await this.sampleTerrainHeight(allSampleCartographics);

      // Extract sampled heights into 2D grid: heights[b][s]
      const heights: number[][] = [];
      let sampleIdx = 0;
      for (let b = 0; b < numBearings; b++) {
        const rayHeights: number[] = [observerTerrainHeight]; // s = 0 is observer ground
        for (let s = 1; s <= samplesPerRay; s++) {
          rayHeights.push(allSampleCartographics[sampleIdx++].height ?? 0);
        }
        heights.push(rayHeights);
      }

      // ── 5. Compute visibility per distance interval along each bearing ─────
      // visInterval[b][s] represents visibility of interval [dist_s, dist_{s+1}] for s = 0..samplesPerRay-1
      const visInterval: boolean[][] = [];

      for (let b = 0; b < numBearings; b++) {
        const rayVis: boolean[] = [];
        let maxHorizonAngle = -Infinity;

        for (let s = 0; s < samplesPerRay; s++) {
          const sampleDist = ((s + 1) / samplesPerRay) * maxRadiusMetres;
          const sampleTerrainH = heights[b][s + 1];

          // Elevation angle from observer eye to terrain sample
          const heightDiff = sampleTerrainH - observerEyeHeight;
          const angle = Math.atan2(heightDiff, sampleDist);

          // Near observer (first step) is inherently visible from eye level
          const isVisible = s === 0 || angle >= maxHorizonAngle;
          if (angle > maxHorizonAngle) {
            maxHorizonAngle = angle;
          }

          rayVis.push(isVisible);
        }
        visInterval.push(rayVis);
      }

      // ── 6. Construct continuous angular sector polygons ────────────────────
      // Between bearing b and (b+1)%numBearings, merge consecutive radial intervals
      // that share the same visibility into unified draped polygons.
      this.dataSource.entities.suspendEvents();

      for (let b = 0; b < numBearings; b++) {
        const nextB = (b + 1) % numBearings;
        let s = 0;

        while (s < samplesPerRay) {
          // Sector cell visibility: visible if either bounding ray is visible
          const currentVis = visInterval[b][s] || visInterval[nextB][s];
          let endS = s;

          // Merge contiguous cells with matching visibility
          while (endS + 1 < samplesPerRay) {
            const nextVis = visInterval[b][endS + 1] || visInterval[nextB][endS + 1];
            if (nextVis === currentVis) {
              endS++;
            } else {
              break;
            }
          }

          // Distances for this merged wedge segment
          const rStart = (s / samplesPerRay) * maxRadiusMetres;
          const rEnd = ((endS + 1) / samplesPerRay) * maxRadiusMetres;
          const rMid = (rStart + rEnd) / 2;

          // Radial fade: smooth falloff towards outer perimeter (fade starts at 60% radius)
          const fadeStartDist = maxRadiusMetres * 0.60;
          let fadeFactor = 1.0;
          if (rMid > fadeStartDist) {
            fadeFactor = 1.0 - 0.85 * ((rMid - fadeStartDist) / (maxRadiusMetres - fadeStartDist));
            fadeFactor = Math.max(0.12, fadeFactor);
          }

          // Green (rgba ~0,255,120,0.35) if visible, Red (rgba ~255,60,60,0.30) if occluded
          const baseAlpha = currentVis ? 0.35 : 0.28;
          const finalAlpha = baseAlpha * fadeFactor;
          const materialColor = currentVis
            ? new Cesium.Color(0.0, 1.0, 0.47, finalAlpha)
            : new Cesium.Color(1.0, 0.235, 0.235, finalAlpha);

          // Build polygon coordinate array
          let coords: number[];
          if (s === 0) {
            // Triangle extending directly from observer location (r=0)
            const pEnd1 = gridPoints[b][endS + 1];
            const pEnd2 = gridPoints[nextB][endS + 1];
            coords = [
              lon, lat,
              pEnd1.lon, pEnd1.lat,
              pEnd2.lon, pEnd2.lat
            ];
          } else {
            // Quadrilateral wedge segment
            const pStart1 = gridPoints[b][s];
            const pEnd1   = gridPoints[b][endS + 1];
            const pEnd2   = gridPoints[nextB][endS + 1];
            const pStart2 = gridPoints[nextB][s];
            coords = [
              pStart1.lon, pStart1.lat,
              pEnd1.lon,   pEnd1.lat,
              pEnd2.lon,   pEnd2.lat,
              pStart2.lon, pStart2.lat
            ];
          }

          this.dataSource.entities.add({
            polygon: {
              hierarchy: new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray(coords)),
              material: materialColor,
              classificationType: Cesium.ClassificationType.TERRAIN
            }
          });

          s = endS + 1;
        }
      }

      this.dataSource.entities.resumeEvents();
      this.notifyState('ready');
    } catch (err) {
      console.error('[ViewshedManager] Computation failed:', err);
      this.notifyState('idle');
    } finally {
      this.computing = false;
    }
  }

  /**
   * Sample terrain heights in-place in a single batch using sampleTerrainMostDetailed,
   * falling back to globe.getHeight for immediate (lower-accuracy) cached tiles.
   */
  private async sampleTerrainHeight(positions: Cesium.Cartographic[]): Promise<void> {
    const terrainProvider = this.viewer.terrainProvider;
    try {
      const sampled = await Cesium.sampleTerrainMostDetailed(terrainProvider, positions);
      for (let i = 0; i < positions.length; i++) {
        positions[i].height = sampled[i].height ?? 0;
      }
    } catch {
      for (const pos of positions) {
        const h = this.viewer.scene.globe.getHeight(pos);
        pos.height = h ?? 0;
      }
    }
  }

  /**
   * Compute destination lat/lon given start lat/lon (degrees), bearing (radians),
   * and distance in metres using the standard spherical great-circle formulation.
   */
  private destinationPoint(
    latDeg: number,
    lonDeg: number,
    bearingRad: number,
    distMetres: number
  ): { lat: number; lon: number } {
    const EARTH_RADIUS = 6_371_000;
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

  /**
   * Creates an SVG pin icon data URL matching the CustomPoint pin style.
   */
  private createObserverPinSvg(): string {
    const svg = `
      <svg width="40" height="52" viewBox="0 0 40 52" fill="none" xmlns="http://www.w3.org/2000/svg">
        <filter id="shadow" x="0" y="0" width="40" height="52" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000000" flood-opacity="0.6"/>
        </filter>
        <g filter="url(#shadow)">
          <path d="M20 4C11.163 4 4 11.163 4 20C4 30.5 20 44 20 44C20 44 36 30.5 36 20C36 11.163 28.837 4 20 4Z" fill="#10b981"/>
          <path d="M20 5C11.716 5 5 11.716 5 20C5 29.8 19.5 42.6 20 43C20.5 42.6 35 29.8 35 20C35 11.716 28.284 5 20 5Z" stroke="#FFFFFF" stroke-width="1.8"/>
          <circle cx="20" cy="20" r="9" fill="#0B0F19"/>
          <text x="20" y="24" text-anchor="middle" font-size="11" font-family="-apple-system, sans-serif" fill="#FFFFFF">👁️</text>
        </g>
      </svg>
    `;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /**
   * Drop a small CustomPoint-styled pin billboard and label at the observer position.
   * Completely transparent background around pin — no solid black disc or void.
   */
  private addObserverMarker(position: Cesium.Cartesian3, lat: number, lon: number): void {
    const pinImage = this.createObserverPinSvg();

    this.dataSource.entities.add({
      name: 'Viewshed Observer',
      position,
      billboard: {
        image: pinImage,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scale: 0.85
      },
      label: {
        text: `Observer (${this.config.observerHeightAboveGround.toFixed(1)}m eye)\n${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`,
        font: '600 11px "Outfit", -apple-system, sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.fromCssColorString('#0B0F19'),
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -48),
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
