# 3D Interactive Map of Gujarat — White Rann of Kutch 🗺️✨

[![CesiumJS](https://img.shields.io/badge/CesiumJS-1.120+-blue.svg?logo=cesium)](https://cesium.com/platform/cesiumjs/)
[![Vite](https://img.shields.io/badge/Vite-5.4+-646CFF.svg?logo=vite)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Copernicus DEM](https://img.shields.io/badge/Data-Copernicus%20GLO--30-008080.svg)](https://spacedata.copernicus.eu/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An interactive, high-performance **3D Digital Terrain Map** of the **White Rann of Kutch (Gujarat, India)** built with **CesiumJS**, **Vite**, and **TypeScript**. 

The application visualizes high-resolution satellite imagery integrated with a **Copernicus GLO-30 Digital Terrain Model (DTM)**, multi-directional hillshading, 2m-interval elevation contour lines, real-time dynamic solar illumination, and a full-featured **3D Custom Points Management System**.

---

## 🌟 Key Features

### 1. 🏔️ 3D Digital Terrain & High-Resolution Satellite Imagery
- **Terrain Relief & Globe**: Powered by CesiumJS with high-resolution satellite imagery, true-to-scale terrain rendering, and study area boundary clipping (Dhordo / White Desert 20 km² region: `69.828°E–69.872°E, 23.850°N–23.890°N`).
- **Dynamic Terrain Providers**: Seamless fallback between Cesium World Terrain and Ellipsoid with customizable vertical exaggeration for flat salt-marsh relief.

### 2. 🔬 Analytical Overlays (DTM Pipeline)
- **Multi-directional Hillshade**: 8-azimuth composite RGBA hillshade layer derived from the Copernicus GLO-30 dataset with Z-factor exaggeration (3.0×) to reveal subtle surface undulations and salt pans.
- **Topographic Contour Lines**: 2m-interval elevation contour lines vectorized directly into GeoJSON and clamped directly to the 3D globe terrain.
- **Toggleable Overlays**: Instant HUD toggle buttons for Hillshade and Contour layers with smooth alpha blending.

### 3. 📍 Interactive 3D Custom Points Management System
- **Click-to-Place Pinning**: Click "+ Add 3D Point" in the HUD, then click anywhere on the 3D terrain to capture exact Cartesian coordinates and raycasted ground elevation.
- **Rich Metadata Modal**: Define Name, Category (*Viewpoint*, *Landmark*, *Camp*, *Research*, *Hazard*), and detailed descriptions.
- **Interactive Marker Visualizations**: Color-coded billboard pins and point labels clamped to ground with selection indicators.
- **Fly-To & Inspection**: Click any pin or list item to smoothly fly the camera to the target location with point detail cards.
- **Local Persistence**: Automatic synchronization to browser `localStorage` with real-time badge count.

### 4. ☀️ Real-Time Solar Illumination & Lighting Presets
- **Julian Date Solar Simulation**: Uses Cesium's physical lighting engine (`globe.enableLighting = true`) with astronomical Julian dates calculated for Kutch's geographic coordinates (`23.8° N, 69.8° E`).
- **One-Click Lighting Presets**:
  - 🌅 **Dawn / Golden Hour**: Warm, low-angle grazing light accentuating subtle terrain contours and salt crusts.
  - ☀️ **Noon**: High-overhead sun with maximum visibility and vivid salt reflectivity.
  - 🌇 **Sunset**: Deep orange and twilight ambient tones.
  - 🌌 **Night**: Starry celestial skybox with minimal ambient lunar glow.

### 5. 🎥 Cinematic Camera Controls & Navigation
- **View Modes**:
  - **3D Perspective**: True ellipsoidal 3D globe.
  - **2.5D Columbus View**: Planar perspective mode with elevation extrusion.
  - **2D Map**: Top-down orthographic cartographic map.
- **Tour Presets**: One-click smooth camera flythroughs: *White Desert Overview*, *Rann Focus*, *Low-Angle Horizon*, *Oblique South*, and *Top-Down Nadir*.
- **360° Continuous Orbit**: Automatic hands-free continuous orbital rotation around the active center of interest.
- **3D Horizon Tilt**: Quick-tilt mechanism switching between top-down overview and dramatic low-angle horizon inspection.
- **Zoom Stack**: Floating right-hand zoom controls (`+` / `−`) and smooth mouse-wheel zooming.

### 6. 📊 Real-Time HUD Telemetry & Modern Glassmorphic UI
- **Live Flight Telemetry**: Live readout of Camera Latitude, Longitude, Altitude (m / km), and Compass Heading.
- **Responsive Dark HUD**: Frosted glassmorphism panels styled with modern typography (Outfit & Inter), SVG iconography, and zero-dependency Vanilla CSS.

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| `+` / `=` | Zoom In toward terrain |
| `-` / `_` | Zoom Out from terrain |
| `Escape` | Cancel active point placement / Close dialogs & drawer |
| `Left Mouse Drag` | Rotate / Tilt / Pan camera view |
| `Right Mouse Drag` / `Scroll` | Zoom in / Zoom out |
| `Middle Mouse Drag` | Look around / pitch and heading adjustment |

---

## 📁 Project Architecture

```
3D-Map-Gujarat-/
├── index.html                  # HTML entry point with fonts & HUD container
├── package.json                # Project dependencies & scripts
├── tsconfig.json               # TypeScript compiler configuration
├── vite.config.ts              # Vite configuration with vite-plugin-cesium
├── .env                        # Environment variables (Cesium Ion Token)
│
├── public/
│   └── assets/
│       └── terrain/
│           ├── kutch_hillshade.png    # Pre-rendered 8-direction composite hillshade
│           └── kutch_contours.geojson # 2m-interval elevation contour lines
│
├── scripts/
│   └── convert-data.py         # Python DTM processing pipeline (Copernicus GLO-30)
│
└── src/
    ├── main.ts                 # App bootstrap, HUD layout, telemetry, event bus
    ├── config/
    │   ├── camera.config.ts    # Study area bounding box, camera angles & presets
    │   └── layer.config.ts     # Imagery & Terrain providers (Sentinel, World Terrain, Hillshade)
    ├── modules/
    │   ├── customPoints.ts     # 3D Point manager, markers, raycasting, LocalStorage
    │   └── terrain.ts          # Cesium Viewer lifecycle, lighting, navigation, overlays
    └── ui/
        └── styles.css          # Glassmorphic HUD styles, drawer, cards, modal
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- `npm` or `yarn` / `pnpm`
- (Optional for DTM processing) Python 3.9+ with `rasterio`, `numpy`, `scipy`, `shapely`, `fiona`

### 1. Clone the Repository

```bash
git clone https://github.com/Harshit17x/3D-Map-Gujarat-.git
cd 3D-Map-Gujarat-
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Cesium Ion Token

Create or edit `.env` in the root directory:

```env
VITE_CESIUM_ION_TOKEN=your_cesium_ion_access_token_here
```

> **Note:** A default fallback token or free personal token from [Cesium Ion](https://ion.cesium.com/tokens) can be used to stream Cesium World Terrain and Bing/Sentinel basemaps.

### 4. Start Development Server

```bash
npm run dev
```

Open your browser at `http://localhost:5173/`.

### 5. Build for Production

```bash
npm run build
```

The compiled, minified bundle will be output to the `dist/` directory. You can preview it with:

```bash
npm run preview
```

---

## 🛠️ DTM Processing Pipeline (Python)

To re-generate or modify the analytical hillshade and contour overlays from raw GeoTIFF elevation rasters:

1. Ensure the source DTM raster (`output_hh.tif` or Copernicus GLO-30 tile) is placed in the project root.
2. Install Python dependencies:
   ```bash
   pip install rasterio numpy scipy shapely fiona
   ```
3. Run the pipeline:
   ```bash
   python scripts/convert-data.py
   ```
4. The outputs are automatically updated in `public/assets/terrain/`:
   - `kutch_hillshade.png`: 8-azimuth composite RGBA hillshade raster.
   - `kutch_contours.geojson`: 2m contour intervals clipped to the study boundary.

---

## 🛰️ Data Credits & Attributions

- **Elevation Model**: [Copernicus DEM GLO-30](https://spacedata.copernicus.eu/) (European Space Agency / Sinergise)
- **3D Globe Engine**: [CesiumJS](https://cesium.com/platform/cesiumjs/)
- **Study Area**: Dhordo, White Rann of Kutch, Gujarat, India (`23.85°N, 69.85°E`)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
