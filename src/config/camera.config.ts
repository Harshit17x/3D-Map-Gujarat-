import * as Cesium from 'cesium';

/**
 * 20 km² Study Area bounding box in the White Rann of Kutch, north of Dhordo.
 * Coordinates verified against satellite imagery: pure open salt desert,
 * clear of the Dhordo tent-city footprint and border roads.
 */
export const KUTCH_STUDY_AREA = {
  name: 'White Rann of Kutch (Dhordo Expanse)',
  bounds: {
    west: 69.828,
    south: 23.850,
    east: 69.872,
    north: 23.890
  },
  center: {
    longitude: 69.850,
    latitude: 23.870,
    height: 0
  },
  approxAreaKm2: 19.8
};

/**
 * Default camera fly-to configuration on load:
 * Positioned south of the study area center, looking North across the salt flats
 * with a shallow ~32° pitch to showcase the horizon-to-horizon expanse.
 */
export const DEFAULT_CAMERA_VIEW = {
  destination: Cesium.Cartesian3.fromDegrees(69.850, 23.830, 2600.0),
  orientation: {
    heading: Cesium.Math.toRadians(0.0),   // True North
    pitch: Cesium.Math.toRadians(-32.0),   // Oblique horizon view
    roll: 0.0
  },
  duration: 2.5
};

/**
 * Preset camera angles for quick navigation and tour viewpoints.
 */
export const CAMERA_PRESETS = [
  {
    id: 'default',
    label: 'White Desert Expanse',
    description: 'Looking North across the horizon-to-horizon crystalline salt flats',
    destination: Cesium.Cartesian3.fromDegrees(69.850, 23.830, 2600.0),
    orientation: {
      heading: Cesium.Math.toRadians(0.0),
      pitch: Cesium.Math.toRadians(-32.0),
      roll: 0.0
    }
  },
  {
    id: 'sunset',
    label: 'White Rann Sunset View',
    description: 'Looking West toward the Arabian Sea horizon with evening reflections',
    destination: Cesium.Cartesian3.fromDegrees(69.880, 23.870, 2200.0),
    orientation: {
      heading: Cesium.Math.toRadians(270.0),
      pitch: Cesium.Math.toRadians(-25.0),
      roll: 0.0
    }
  },
  {
    id: 'tentcity',
    label: 'Rann Utsav Tent City',
    description: 'Vibrant cultural encampment and festival hub near Dhordo',
    destination: Cesium.Cartesian3.fromDegrees(69.509, 23.785, 1400.0),
    orientation: {
      heading: Cesium.Math.toRadians(25.0),
      pitch: Cesium.Math.toRadians(-28.0),
      roll: 0.0
    }
  },
  {
    id: 'kalodungar',
    label: 'Kalo Dungar (Black Hills)',
    description: 'Highest peak in Kutch (462m) with panoramic cliff vistas overlooking the Great Rann',
    destination: Cesium.Cartesian3.fromDegrees(69.816, 23.880, 2000.0),
    orientation: {
      heading: Cesium.Math.toRadians(15.0),
      pitch: Cesium.Math.toRadians(-22.0),
      roll: 0.0
    }
  },
  {
    id: 'ortho',
    label: 'Top-down Nadir Map',
    description: 'Vertical 90° view for topographical boundary inspection',
    destination: Cesium.Cartesian3.fromDegrees(69.850, 23.870, 7500.0),
    orientation: {
      heading: Cesium.Math.toRadians(0.0),
      pitch: Cesium.Math.toRadians(-90.0),
      roll: 0.0
    }
  }
];

/**
 * Altitude and zoom navigation constraints.
 * Allows smooth, unhindered zooming from ground-level inspection (15m)
 * to wide regional and continental overviews (20,000 km) without getting stuck.
 */
export const CAMERA_CONSTRAINTS = {
  minZoomDistance: 15,       // 15 meters above ground
  maxZoomDistance: 20000000, // 20,000 km max distance
  maximumScreenSpaceError: 2
};

