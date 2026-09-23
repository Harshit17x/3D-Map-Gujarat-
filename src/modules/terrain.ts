import * as Cesium from 'cesium';
import {
  KUTCH_STUDY_AREA,
  DEFAULT_CAMERA_VIEW,
  CAMERA_PRESETS,
  CAMERA_CONSTRAINTS
} from '../config/camera.config.ts';
import {
  createPrimaryImageryProvider,
  createPrimaryTerrainProvider
} from '../config/layer.config.ts';

export interface ViewerSetupResult {
  viewer: Cesium.Viewer;
  flyToStudyArea: (presetId?: string) => void;
  setSceneMode: (mode: '3D' | 'COLUMBUS' | '2D') => void;
  setLightingPreset: (preset: 'golden' | 'noon' | 'sunset') => void;
  zoomIn: (factor?: number) => void;
  zoomOut: (factor?: number) => void;
  toggleOrbit: () => boolean;
  tiltToHorizon: () => void;
}

/**
 * Initializes Cesium Viewer, applies terrain, imagery, atmosphere, and spatial limits.
 */
export async function initializeCesiumViewer(containerId: string): Promise<ViewerSetupResult> {
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Cesium container element with id '${containerId}' was not found.`);
  }

  // Load satellite imagery and 3D terrain providers
  const imageryProvider = await createPrimaryImageryProvider();
  const terrainProvider = await createPrimaryTerrainProvider();

  // Initialize Cesium Viewer with clean, uncluttered custom interface
  const viewer = new Cesium.Viewer(container, {
    baseLayer: new Cesium.ImageryLayer(imageryProvider),
    terrainProvider: terrainProvider,
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    scene3DOnly: false, // Allows 2D and Columbus View toggling
    contextOptions: {
      webgl: {
        powerPreference: 'high-performance'
      }
    }
  });

  // Ensure high rendering quality on retina/high-DPI screens
  viewer.resolutionScale = Math.min(window.devicePixelRatio || 1.0, 2.0);

  // Configure camera movement constraints
  const controller = viewer.scene.screenSpaceCameraController;
  controller.minimumZoomDistance = CAMERA_CONSTRAINTS.minZoomDistance;
  controller.maximumZoomDistance = CAMERA_CONSTRAINTS.maxZoomDistance;
  controller.enableCollisionDetection = true;

  // Configure desert lighting and atmospheric fog
  tuneAtmosphereAndLighting(viewer);

  // Set default lighting to late afternoon (golden hour)
  setLightingPreset(viewer, 'golden');

  // Add subtle bounding outline for the 20 km² study area
  drawStudyAreaBoundary(viewer);

  // Fly directly to the default oblique camera view on load
  flyToStudyArea(viewer, 'default');

  return {
    viewer,
    flyToStudyArea: (presetId?: string) => flyToStudyArea(viewer, presetId),
    setSceneMode: (mode: '3D' | 'COLUMBUS' | '2D') => setSceneMode(viewer, mode),
    setLightingPreset: (preset: 'golden' | 'noon' | 'sunset') => setLightingPreset(viewer, preset),
    zoomIn: (factor?: number) => zoomIn(viewer, factor),
    zoomOut: (factor?: number) => zoomOut(viewer, factor),
    toggleOrbit: () => toggleOrbitMode(viewer),
    tiltToHorizon: () => tiltToHorizon(viewer)
  };
}

/**
 * Adjust atmosphere, sky, and fog to counteract white-salt glare.
 */
function tuneAtmosphereAndLighting(viewer: Cesium.Viewer): void {
  const scene = viewer.scene;
  const globe = scene.globe;

  // Globe lighting brings out subtle surface terrain gradients
  globe.enableLighting = true;
  globe.depthTestAgainstTerrain = true;

  // Atmospheric fog adds depth perception across the flat horizon
  scene.fog.enabled = true;
  scene.fog.density = 0.00012;
  scene.fog.minimumBrightness = 0.08;

  // Fine-tune sky atmosphere
  if (scene.skyAtmosphere) {
    scene.skyAtmosphere.saturationShift = 0.05;
    scene.skyAtmosphere.brightnessShift = -0.05;
  }
}

/**
 * Switch solar time to control shadows and light angle over the desert.
 */
export function setLightingPreset(viewer: Cesium.Viewer, preset: 'golden' | 'noon' | 'sunset'): void {
  // Kutch local time is UTC+5:30.
  let utcHour = 11; // 16:30 local = 11:00 UTC (Golden Hour)

  if (preset === 'noon') {
    utcHour = 7; // 12:30 local = 07:00 UTC (High Noon)
  } else if (preset === 'sunset') {
    utcHour = 12.75; // 18:15 local = 12:45 UTC (Sunset)
  }

  const julianDate = Cesium.JulianDate.fromDate(new Date(Date.UTC(2025, 0, 15, Math.floor(utcHour), Math.floor((utcHour % 1) * 60))));
  viewer.clock.currentTime = julianDate;
  viewer.clock.shouldAnimate = false;
}

/**
 * Smoothly fly camera to study area or preset viewpoint.
 */
export function flyToStudyArea(viewer: Cesium.Viewer, presetId = 'default'): void {
  const preset = CAMERA_PRESETS.find(p => p.id === presetId) || CAMERA_PRESETS[0];

  viewer.camera.flyTo({
    destination: preset.destination,
    orientation: preset.orientation,
    duration: DEFAULT_CAMERA_VIEW.duration,
    easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT
  });
}

/**
 * Smoothly transition between 3D, 2.5D Columbus View, and 2D Planar modes.
 */
export function setSceneMode(viewer: Cesium.Viewer, mode: '3D' | 'COLUMBUS' | '2D'): void {
  switch (mode) {
    case '3D':
      viewer.scene.mode = Cesium.SceneMode.SCENE3D;
      break;
    case 'COLUMBUS':
      viewer.scene.mode = Cesium.SceneMode.COLUMBUS_VIEW;
      break;
    case '2D':
      viewer.scene.mode = Cesium.SceneMode.SCENE2D;
      break;
  }
}

/**
 * Adds an elegant, translucent boundary outlining the 20 km² study area.
 */
function drawStudyAreaBoundary(viewer: Cesium.Viewer): void {
  const { west, south, east, north } = KUTCH_STUDY_AREA.bounds;

  viewer.entities.add({
    name: '20 km² Study Area Boundary',
    rectangle: {
      coordinates: Cesium.Rectangle.fromDegrees(west, south, east, north),
      material: Cesium.Color.fromCssColorString('#38BDF8').withAlpha(0.04),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString('#38BDF8').withAlpha(0.7),
      outlineWidth: 2,
      height: 2
    }
  });
}

/**
 * Smoothly zooms the camera in toward the ground/target, respecting minimum altitude.
 */
export function zoomIn(viewer: Cesium.Viewer, factor = 0.35): void {
  const camera = viewer.camera;
  const carto = camera.positionCartographic;
  const currentHeight = carto ? carto.height : 2500;
  const minHeight = CAMERA_CONSTRAINTS.minZoomDistance;

  if (currentHeight <= minHeight + 10) return;
  const zoomAmount = Math.max((currentHeight - minHeight) * factor, 30);
  camera.zoomIn(zoomAmount);
}

/**
 * Smoothly zooms the camera out toward the sky, respecting maximum altitude.
 */
export function zoomOut(viewer: Cesium.Viewer, factor = 0.45): void {
  const camera = viewer.camera;
  const carto = camera.positionCartographic;
  const currentHeight = carto ? carto.height : 2500;
  const maxHeight = CAMERA_CONSTRAINTS.maxZoomDistance;

  if (currentHeight >= maxHeight - 50) return;
  const zoomAmount = Math.max(currentHeight * factor, 50);
  camera.zoomOut(zoomAmount);
}

let orbitListener: (() => void) | null = null;

/**
 * Toggle cinematic 3D continuous rotation around the study area.
 */
export function toggleOrbitMode(viewer: Cesium.Viewer): boolean {
  if (orbitListener) {
    viewer.clock.onTick.removeEventListener(orbitListener);
    orbitListener = null;
    return false;
  }

  orbitListener = () => {
    viewer.camera.rotate(Cesium.Cartesian3.UNIT_Z, 0.0012);
  };
  viewer.clock.onTick.addEventListener(orbitListener);
  return true;
}

/**
 * Instantly tilt camera to an oblique 3D angle (~22°) revealing the horizon and sky.
 */
export function tiltToHorizon(viewer: Cesium.Viewer): void {
  const currentPitch = viewer.camera.pitch;
  const targetPitch = Cesium.Math.toRadians(-22.0);
  viewer.camera.lookUp(currentPitch - targetPitch);
}
