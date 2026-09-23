import * as Cesium from 'cesium';

/**
 * Access Cesium ion token from Vite environment variables.
 */
export const CESIUM_ION_TOKEN = import.meta.env.VITE_CESIUM_ION_TOKEN || '';

/**
 * Configure Cesium Default Access Token if present.
 */
if (CESIUM_ION_TOKEN) {
  Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;
}

/**
 * Available satellite basemap providers with graceful fallback.
 */
export async function createPrimaryImageryProvider(): Promise<Cesium.ImageryProvider> {
  // If Ion token is provided, use high-resolution Bing Aerial via Cesium ion
  if (CESIUM_ION_TOKEN) {
    try {
      return await Cesium.IonImageryProvider.fromAssetId(2); // Bing Maps Aerial
    } catch (err) {
      console.warn('Cesium ion imagery load failed, falling back to ESRI World Imagery:', err);
    }
  }

  // High-resolution ESRI World Imagery (free, no token needed)
  return await Cesium.ArcGisMapServerImageryProvider.fromUrl(
    'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
    {
      enablePickFeatures: false
    }
  );
}

/**
 * Configure 3D Terrain Provider.
 * Defaults to Cesium World Terrain when Ion token is valid,
 * falling back to EllipsoidTerrainProvider for offline/token-free environments.
 */
export async function createPrimaryTerrainProvider(): Promise<Cesium.TerrainProvider> {
  if (CESIUM_ION_TOKEN) {
    try {
      return await Cesium.createWorldTerrainAsync({
        requestVertexNormals: true,
        requestWaterMask: true
      });
    } catch (err) {
      console.warn('Cesium World Terrain load failed, falling back to EllipsoidTerrainProvider:', err);
    }
  }

  return new Cesium.EllipsoidTerrainProvider();
}

/**
 * Geographic bounds of the clipped hillshade raster.
 * Matches the study-area KUTCH_STUDY_AREA.bounds + ~10% buffer used
 * by the DTM processing pipeline in scripts/convert-data.py.
 */
const HILLSHADE_BOUNDS = {
  west:  69.823,
  south: 23.845,
  east:  69.877,
  north: 23.895
} as const;

/**
 * Analytical multidirectional hillshade overlay derived from Copernicus GLO-30 DTM.
 * Served as a static single-tile PNG (public/assets/terrain/kutch_hillshade.png),
 * pinned to the exact clipped raster extent.
 *
 * Distinct from the dynamic globe.enableLighting sun-shadow already in the scene —
 * this is a 360° composite hillshade with exaggerated z-factor for extra contrast
 * on the nearly-flat salt terrain, useful as an additive analytical overlay.
 */
export async function createHillshadeImageryProvider(): Promise<Cesium.ImageryProvider> {
  return await Cesium.SingleTileImageryProvider.fromUrl(
    '/assets/terrain/kutch_hillshade.png',
    {
      rectangle: Cesium.Rectangle.fromDegrees(
        HILLSHADE_BOUNDS.west,
        HILLSHADE_BOUNDS.south,
        HILLSHADE_BOUNDS.east,
        HILLSHADE_BOUNDS.north
      )
    }
  );
}

/**
 * 2m-interval contour lines derived from the Copernicus GLO-30 DTM,
 * clipped to the study-area bounding box.
 * Styled with thin, translucent sky-blue lines that are readable over
 * both the hillshade and the satellite imagery basemap.
 */
export async function createContourDataSource(): Promise<Cesium.GeoJsonDataSource> {
  const dataSource = await Cesium.GeoJsonDataSource.load(
    '/assets/terrain/kutch_contours.geojson',
    {
      stroke: Cesium.Color.fromCssColorString('#7dd3fc').withAlpha(0.60),
      strokeWidth: 1.2,
      fill: Cesium.Color.TRANSPARENT,
      markerSize: 0,
      clampToGround: true
    }
  );
  return dataSource;
}

