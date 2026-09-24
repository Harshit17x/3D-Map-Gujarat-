# 3D Interactive Map of Gujarat — White Rann of Kutch

[![CesiumJS](https://img.shields.io/badge/CesiumJS-1.120+-blue.svg)](https://cesium.com/platform/cesiumjs/)
[![Vite](https://img.shields.io/badge/Vite-5.4+-646CFF.svg)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-3178C6.svg)](https://www.typescriptlang.org/)
[![Copernicus DEM](https://img.shields.io/badge/Data-Copernicus%20GLO--30-008080.svg)](https://spacedata.copernicus.eu/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An interactive, high-performance **3D Digital Terrain & Elevation Map** of the **White Rann of Kutch (Gujarat, India)** built with **CesiumJS**, **Vite**, and **TypeScript**.

The application visualizes high-resolution satellite imagery integrated with a **Copernicus GLO-30 Digital Terrain Model (DTM)**, multi-directional hillshading, 2m-interval elevation contour lines, real-time dynamic solar illumination, line-of-sight **Viewshed Analysis**, an on-screen **3D Navigation D-Pad**, and a full-featured **3D Custom Points Management System**.

---

## Key Features

### 1. Direct-Access Left Navigation Rail (Google Maps-Style)
- **Minimalist Icon Rail**: Sleek, vertical left navigation rail providing instant one-click access to all primary analytical and visualization tools without cluttering the 3D globe.
- **One-Click Feature Toggles**:
  - **3D / 2D Mode**: Toggle between 3D ellipsoidal globe perspective and top-down 2D orthographic map with smooth scene morphing.
  - **Multidirectional Hillshade**: 8-azimuth composite RGBA hillshade layer (30m resolution) with active status badges.
  - **2m Contours**: 2m-interval elevation contour lines vectorized directly into GeoJSON and clamped to terrain.
  - **Viewshed Analysis**: Interactive line-of-sight analysis tool with radial visibility sectors.
  - **Add Pin**: Quick location drop tool to mark points of interest directly on the 3D surface.
  - **Solar Lighting Cycle**: Real-time celestial sun position cycling through *Golden Hour*, *Sunset*, *Dawn*, and *Noon*.
  - **3D Navigation Dock**: Show or hide the floating on-screen navigation D-Pad.
  - **Reset Camera**: Instantly re-centers camera on the White Desert study area.

### 2. Line-of-Sight Viewshed Analysis
- **Interactive Observer Placement**: Click the Viewshed tool on the left rail, then click anywhere on the terrain to place an observer (default eye height: `+1.8m` above ground).
- **High-Density Radial Ray Sampling**:
  - Samples **360 radial bearings** at `1.0°` angular resolution with up to 50 radial distance steps (extending up to 2,500m).
  - Eliminates diamond/square interpolation artifacts, rendering smooth, solid, continuous visibility patches.
- **Terrain-Clamped Surface Classification**: Uses Cesium's `ClassificationType.TERRAIN` ground polygons:
  - **Visible Areas (Green)**: Direct line of sight from the observer's eye height.
  - **Occluded Areas (Red)**: Obstructed by terrain ridges, dunes, or elevation relief.
- **HUD Legend & Clear Control**: Live floating status pill indicating visibility color states with a single-click "Clear" button.

### 3. Floating On-Screen 3D Navigation D-Pad & Controls
- **Ergonomic Directional D-Pad**: Floating widget anchored at the bottom-right corner for touch and mouse navigation:
  - **Tilt Up / Down**: Pitch camera toward the horizon or downward toward nadir.
  - **Rotate Left / Right**: Smooth heading orbit around the terrain focal point.
  - **Compass Needle / Center Button**: Real-time compass indicator tracking true camera heading; click to instantly reset heading to True North (`0°`) and restore optimal 3D pitch.
  - **Continuous Hold Action**: Smooth continuous camera motion when holding down directional buttons.
  - **Collapsible Body**: Minimize/expand toggle to maximize screen real estate when desired.
- **Floating Zoom Stack**: Top-right floating controls (`+` / `−`) with smooth raycast-targeted altitude zooming.

### 4. 3D Digital Terrain & Copernicus GLO-30 DTM Overlays
- **Terrain Relief & Globe**: Powered by CesiumJS with high-resolution satellite basemaps and true-to-scale terrain rendering centered on the Dhordo / White Desert study area (`69.828°E–69.872°E, 23.850°N–23.890°N`).
- **Multidirectional Hillshade**: 8-azimuth composite RGBA raster derived from Copernicus GLO-30 elevation data with Z-factor exaggeration (3.0×) to highlight subtle salt pans and elevation undulations.
- **Topographic Contour Lines**: 2m-interval elevation contour lines clamped directly to the 3D terrain surface with high-contrast styling.

### 5. Interactive 3D Custom Points Management
- **Click-to-Place Pinning**: Click "Add Pin" and click anywhere on the 3D terrain to capture exact Cartesian coordinates and raycasted ground elevation.
- **Rich Metadata Modal**: Define Point Name, Category (*Viewpoint*, *Camp / Tent*, *Heritage*), and detailed descriptions.
- **Interactive Marker Visualizations**: Color-coded billboard pins and point labels clamped to the ground with selection indicators.
- **Fly-To & Inspection**: Click any pin to open a point detail card with coordinates and a smooth "Fly Here in 3D" camera transition.
- **Local Persistence**: Automatic synchronization to browser `localStorage`.

### 6. Real-Time Solar Illumination & Lighting Presets
- **Astronomical Sun Simulation**: Physical lighting engine (`globe.enableLighting = true`) with Julian dates calculated for Kutch's geographic coordinates (`23.8° N, 69.8° E`).
- **One-Click Lighting Presets**:
  - **Golden Hour**: Warm, low-angle grazing light accentuating subtle terrain contours and salt crusts.
  - **Noon**: High-overhead sun with maximum visibility and vivid salt reflectivity.
  - **Sunset**: Deep orange and twilight ambient tones.
  - **Dawn**: Soft early-morning atmospheric glow.

### 7. Camera Presets & Tour Modes
- **Quick-Access Tour Presets**:
  - *White Desert Expanse* (North-facing horizon view across the salt flats)
  - *White Rann Sunset View* (West-facing view toward the Arabian Sea horizon)
  - *Rann Utsav Tent City* (Cultural encampment and festival hub near Dhordo)
  - *Kalo Dungar (Black Hills)* (Highest peak in Kutch at 462m overlooking the Great Rann)
  - *Top-down Nadir Map* (Vertical 90° view for boundary inspection)

---

## Navigation & Keyboard Controls

| Control | Action |
| :--- | :--- |
| **D-Pad Up / Down** | Tilt camera pitch (horizon ↔ nadir) |
| **D-Pad Left / Right** | Rotate / yaw camera heading around terrain center |
| **D-Pad Center (Compass)** | Reset heading to True North (`0°`) and restore 3D pitch |
| **Floating `+` / `−`** | Zoom in / Zoom out toward terrain |
| **`+` / `=` / `-` / `_` (Keyboard)** | Zoom in / Zoom out |
| **`Escape` (Keyboard)** | Cancel active pin or viewshed placement |
| **Left Mouse Drag** | Pan across the map (2D) / Rotate & pan (3D) |
| **Right Mouse Drag / Scroll** | Smooth continuous zoom |
| **Middle Mouse Drag** | 3D look-around, pitch, and heading adjustment |

---

## Project Architecture

```
3D-Map-Gujarat-/
├── index.html                  # HTML entry point with font imports & HUD container
├── package.json                # Project dependencies and npm scripts
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
    ├── main.ts                 # Application bootstrap, HUD left rail, event bus
    ├── config/
    │   ├── camera.config.ts    # Study area boundaries, camera angles & presets
    │   └── layer.config.ts     # Imagery & Terrain providers (Sentinel, World Terrain)
    ├── modules/
    │   ├── customPoints.ts     # 3D Custom Points manager, pins, raycasting, LocalStorage
    │   ├── navigationPad.ts    # Floating 3D Navigation D-Pad, compass dial & tilt controls
    │   ├── terrain.ts          # Cesium Viewer lifecycle, lighting, navigation, overlays
    │   └── viewshed.ts         # High-resolution radial ray viewshed analysis module
    └── ui/
        └── styles.css          # Glassmorphic HUD styles, rail, modal, D-pad & cards
```

---

## Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher recommended
- **npm**, **yarn**, or **pnpm**
- *(Optional for DTM processing)*: Python 3.9+ with `rasterio`, `numpy`, `scipy`, `shapely`, `fiona`

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

> **Note:** A free personal token from [Cesium Ion](https://ion.cesium.com/tokens) can be used to stream Cesium World Terrain and Bing/Sentinel basemaps.

### 4. Start Development Server

```bash
npm run dev
```

Open your browser at `http://localhost:5173/`.

### 5. Build for Production

```bash
npm run build
```

The compiled, minified bundle will be output to the `dist/` directory. Preview the production build with:

```bash
npm run preview
```

---

## DTM Processing Pipeline (Python)

To re-generate or modify the analytical hillshade and contour overlays from raw GeoTIFF elevation rasters:

1. Ensure the source DTM raster (`output_hh.tif` or Copernicus GLO-30 tile) is placed in the project root.
2. Install Python dependencies:
   ```bash
   pip install rasterio numpy scipy shapely fiona
   ```
3. Run the processing pipeline:
   ```bash
   python scripts/convert-data.py
   ```
4. The outputs are automatically updated in `public/assets/terrain/`:
   - `kutch_hillshade.png`: 8-azimuth composite RGBA hillshade raster.
   - `kutch_contours.geojson`: 2m contour intervals clipped to the study boundary.

---

## Data Credits & Attributions

- **Elevation Model**: [Copernicus DEM GLO-30](https://spacedata.copernicus.eu/) (European Space Agency / Sinergise)
- **3D Globe Engine**: [CesiumJS](https://cesium.com/platform/cesiumjs/)
- **Study Area**: Dhordo, White Rann of Kutch, Gujarat, India (`23.85°N, 69.85°E`)

---

## License

This project is licensed under the [MIT License](LICENSE).
