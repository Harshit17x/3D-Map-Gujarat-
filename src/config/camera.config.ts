import * as Cesium from 'cesium';

/**
 * Verified Study Area bounding box in the iconic White Rann of Kutch (Dhordo Expanse).
 * Centered north of Dhordo Tent City / Sunset View Point directly over the gleaming
 * white salt desert floor.
 */
export const KUTCH_STUDY_AREA = {
  name: 'White Rann of Kutch (Dhordo Salt Desert)',
  bounds: {
    west: 69.495,
    south: 23.825,
    east: 69.545,
    north: 23.865
  },
  center: {
    longitude: 69.520,
    latitude: 23.845,
    height: 0
  },
  approxAreaKm2: 20.0
};

/**
 * Default camera fly-to configuration on load:
 * Positioned south of the white salt flats looking North across the vast expanse
 * with a shallow ~22° pitch to showcase the horizon-to-horizon 3D expanse and sky.
 */
export const DEFAULT_CAMERA_VIEW = {
  destination: Cesium.Cartesian3.fromDegrees(69.520, 23.810, 2400.0),
  orientation: {
    heading: Cesium.Math.toRadians(0.0),   // Looking True North across White Desert
    pitch: Cesium.Math.toRadians(-22.0),  // Low oblique angle revealing 3D horizon & sky
    roll: 0.0
  },
  duration: 2.5
};

/**
 * Preset camera angles for quick navigation and 3D exploration.
 */
export const CAMERA_PRESETS = [
  {
    id: 'default',
    label: 'Horizon Expanse',
    description: 'Looking North across the white salt flats toward the horizon',
    destination: Cesium.Cartesian3.fromDegrees(69.520, 23.810, 2400.0),
    orientation: {
      heading: Cesium.Math.toRadians(0.0),
      pitch: Cesium.Math.toRadians(-22.0),
      roll: 0.0
    }
  },
  {
    id: 'low-glider',
    label: 'Low 3D Glider',
    description: 'Cinematic low-altitude glide across the salt crust',
    destination: Cesium.Cartesian3.fromDegrees(69.520, 23.830, 600.0),
    orientation: {
      heading: Cesium.Math.toRadians(15.0),
      pitch: Cesium.Math.toRadians(-14.0),
      roll: 0.0
    }
  },
  {
    id: 'sunset',
    label: 'Sunset View',
    description: 'Looking West toward the golden horizon',
    destination: Cesium.Cartesian3.fromDegrees(69.540, 23.840, 1800.0),
    orientation: {
      heading: Cesium.Math.toRadians(275.0),
      pitch: Cesium.Math.toRadians(-20.0),
      roll: 0.0
    }
  },
  {
    id: 'ortho',
    label: 'Top-down Map',
    description: 'Nadir vertical view for area and boundary inspection',
    destination: Cesium.Cartesian3.fromDegrees(69.520, 23.845, 8000.0),
    orientation: {
      heading: Cesium.Math.toRadians(0.0),
      pitch: Cesium.Math.toRadians(-90.0),
      roll: 0.0
    }
  }
];

/**
 * Altitude and zoom navigation constraints.
 */
export const CAMERA_CONSTRAINTS = {
  minZoomDistance: 150,    // 150 meters above ground
  maxZoomDistance: 35000,  // 35 km max altitude
  maximumScreenSpaceError: 2
};
