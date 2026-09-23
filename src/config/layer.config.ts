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
