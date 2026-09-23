"""
convert-data.py — DTM Processing Pipeline for White Rann 3D Map
================================================================
Inputs:
  output_hh.tif  — Copernicus GLO-30, EPSG:4326, ~30m res, full Gujarat extent

Outputs (written to public/assets/terrain/):
  kutch_hillshade.png     — Multidirectional RGBA hillshade (additive analytical overlay)
  kutch_contours.geojson  — 2m-interval contour lines, WGS84 GeoJSON

KUTCH_STUDY_AREA.bounds (from camera.config.ts):
  west=69.828, south=23.850, east=69.872, north=23.890
Clip bbox adds ~10% buffer (≈0.005°) on each side:
  west=69.823, south=23.845, east=69.877, north=23.895

Dependencies: rasterio, numpy, scipy, shapely, fiona (all pre-installed)
"""

import os
import sys
import json
import math
import struct
import zlib
import numpy as np
from pathlib import Path

import rasterio
from rasterio.windows import from_bounds

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Paths relative to the repo root (script is run from repo root)
DTM_PATH = Path("output_hh.tif")
OUT_DIR  = Path("public/assets/terrain")

# KUTCH_STUDY_AREA.bounds + 10% buffer
CLIP = {
    "west":  69.823,
    "south": 23.845,
    "east":  69.877,
    "north": 23.895,
}

# Hillshade parameters
Z_FACTOR   = 3.0   # Exaggerate ~flat salt-terrain relief for visibility
DIRECTIONS = 8     # Number of azimuth angles for multidirectional composite

# Contour parameters
CONTOUR_INTERVAL = 2.0  # metres

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def compute_single_hillshade(elev: np.ndarray, azimuth_deg: float, altitude_deg: float, z_factor: float) -> np.ndarray:
    """Return per-pixel intensity 0–1 for one sun direction."""
    az = math.radians(360.0 - azimuth_deg + 90.0)  # convert to math convention
    alt = math.radians(altitude_deg)

    # Gradient via central differences (axis=0=rows=y, axis=1=cols=x)
    dy, dx = np.gradient(elev.astype(np.float64) * z_factor)

    # Slope and aspect
    slope   = np.arctan(np.sqrt(dx**2 + dy**2))
    aspect  = np.arctan2(-dy, dx)  # north-referenced

    hs = (
        np.cos(alt) * np.cos(slope)
        + np.sin(alt) * np.sin(slope) * np.cos(az - aspect)
    )
    return np.clip(hs, 0.0, 1.0)


def compute_multidirectional_hillshade(elev: np.ndarray, n_dirs: int, z_factor: float) -> np.ndarray:
    """Composite hillshade from n_dirs equally-spaced azimuths (225° altitude bias for desert micro-relief)."""
    azimuths = [i * (360.0 / n_dirs) for i in range(n_dirs)]
    altitude = 30.0  # moderate sun elevation — enhances subtle relief
    accum = np.zeros(elev.shape, dtype=np.float64)
    for az in azimuths:
        accum += compute_single_hillshade(elev, az, altitude, z_factor)
    composite = accum / n_dirs
    return composite


def write_png_rgba(path: Path, data_uint8: np.ndarray, alpha_uint8: np.ndarray) -> None:
    """
    Minimal PNG encoder (no external lib needed — only stdlib struct/zlib).
    data_uint8: (H, W) luminance 0-255
    alpha_uint8: (H, W) alpha 0-255
    """
    H, W = data_uint8.shape

    def chunk(ctype: bytes, data: bytes) -> bytes:
        c = ctype + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    # IHDR
    ihdr_data = struct.pack(">IIBBBBB", W, H, 8, 2, 0, 0, 0)  # 8-bit, RGB (we'll do RGBA manually: colour type 6)
    # Correct colour type for RGBA = 6
    ihdr_data = struct.pack(">II", W, H) + bytes([8, 6, 0, 0, 0])  # bit depth=8, colour=6(RGBA), compress/filter/interlace=0

    # IDAT — build raw scanlines (filter byte 0 per row), RGBA
    raw_rows = b""
    for row in range(H):
        raw_rows += b"\x00"  # filter type = None
        for col in range(W):
            L = data_uint8[row, col]
            A = alpha_uint8[row, col]
            raw_rows += bytes([L, L, L, A])  # R=G=B=L, A

    compressed = zlib.compress(raw_rows, level=6)

    png_bytes = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr_data)
        + chunk(b"IDAT", compressed)
        + chunk(b"IEND", b"")
    )
    path.write_bytes(png_bytes)


def marching_squares_contours(elev: np.ndarray, transform, level: float):
    """
    Extract iso-contour line segments at `level` metres using marching squares.
    Returns a list of GeoJSON LineString feature dicts.
    """
    from scipy.ndimage import uniform_filter

    # Mild smoothing to reduce pixelation at 30m resolution
    smoothed = uniform_filter(elev.astype(np.float64), size=2)

    rows, cols = smoothed.shape
    features = []

    # For each 2x2 cell of pixels, determine which edges the contour crosses
    for r in range(rows - 1):
        for c in range(cols - 1):
            corners = [
                smoothed[r,     c],
                smoothed[r,     c + 1],
                smoothed[r + 1, c + 1],
                smoothed[r + 1, c],
            ]
            # Corner pixel centres in geographic coordinates
            def geo(rr, cc):
                x, y = transform * (cc + 0.5, rr + 0.5)
                return [round(x, 7), round(y, 7)]

            pts = [geo(r, c), geo(r, c + 1), geo(r + 1, c + 1), geo(r + 1, c)]

            # Build 4-bit case index (bit i = 1 if corner[i] >= level)
            case = sum((1 << i) for i, v in enumerate(corners) if v >= level)

            # Interpolation helper: find crossing fraction along edge a->b
            def lerp_pt(ia, ib):
                va, vb = corners[ia], corners[ib]
                if abs(vb - va) < 1e-9:
                    t = 0.5
                else:
                    t = (level - va) / (vb - va)
                t = max(0.0, min(1.0, t))
                ax, ay = pts[ia]
                bx, by = pts[ib]
                return [round(ax + t * (bx - ax), 7), round(ay + t * (by - ay), 7)]

            # Edge midpoints for 15 non-trivial cases (marching squares lookup)
            # Edges: 0=top(0-1), 1=right(1-2), 2=bottom(2-3), 3=left(3-0)
            segments = {
                0:  [],
                1:  [(3, 0)],
                2:  [(0, 1)],
                3:  [(3, 1)],
                4:  [(1, 2)],
                5:  [(3, 0), (1, 2)],  # saddle — split into two
                6:  [(0, 2)],
                7:  [(3, 2)],
                8:  [(2, 3)],
                9:  [(0, 2)],
                10: [(0, 1), (2, 3)],  # saddle
                11: [(0, 1)],          # NOTE: marching squares case 11 -> edge 0 and edge 3 crossed
                12: [(1, 3)],
                13: [(0, 1)],
                14: [(3, 0)],
                15: [],
            }

            # Proper marching squares edge crossing table (edges: top=0-1, right=1-2, bottom=3-2, left=0-3)
            # Redefine using correct edge pairs for corners [TL, TR, BR, BL]
            # corners[0]=TL, [1]=TR, [2]=BR, [3]=BL
            # edges: top=[0,1], right=[1,2], bottom=[2,3], left=[3,0]
            edge_pairs = {
                1:  [([0,1],[3,0])],
                2:  [([0,1],[1,2])],
                3:  [([3,0],[1,2])],
                4:  [([1,2],[2,3])],
                5:  [([0,1],[2,3]), ([1,2],[3,0])],
                6:  [([0,1],[2,3])],
                7:  [([3,0],[2,3])],
                8:  [([2,3],[3,0])],
                9:  [([0,1],[2,3])],
                10: [([0,1],[3,0]), ([1,2],[2,3])],
                11: [([0,1],[1,2])],
                12: [([1,2],[3,0])],
                13: [([0,1],[1,2])],
                14: [([0,1],[3,0])],
            }

            def lerp_edge(ea, eb):
                # ea = [ia, ib] corner indices defining the edge
                return lerp_pt(ea[0], ea[1]), lerp_pt(eb[0], eb[1])

            if case in edge_pairs:
                for seg_edges in edge_pairs[case]:
                    pa, pb = lerp_edge(seg_edges[0], seg_edges[1])
                    if pa != pb:
                        features.append({
                            "type": "Feature",
                            "properties": {"elevation": level},
                            "geometry": {
                                "type": "LineString",
                                "coordinates": [pa, pb]
                            }
                        })

    return features


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    if not DTM_PATH.exists():
        print(f"ERROR: {DTM_PATH} not found. Run from the repo root.", file=sys.stderr)
        sys.exit(1)

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"[1/3] Clipping DTM to study-area bbox: {CLIP}")
    with rasterio.open(DTM_PATH) as src:
        window = from_bounds(
            CLIP["west"], CLIP["south"], CLIP["east"], CLIP["north"],
            src.transform
        )
        clip_transform = src.window_transform(window)
        elev = src.read(1, window=window)
        clip_crs = src.crs

    rows, cols = elev.shape
    print(f"    Clipped shape: {cols}w × {rows}h pixels")
    print(f"    Elevation in clip: {elev.min():.1f}m – {elev.max():.1f}m")

    # -----------------------------------------------------------------------
    print("[2/3] Computing multidirectional hillshade...")
    hs_float = compute_multidirectional_hillshade(elev, DIRECTIONS, Z_FACTOR)

    # Luminance: stretch 0-1 → 30-230 (keep mid-grey base, avoid pure white/black)
    hs_lum = (hs_float * 200.0 + 30.0).clip(0, 255).astype(np.uint8)

    # Alpha: 178 ≈ 70% opacity; edges fade slightly for smooth blending
    hs_alpha = np.full_like(hs_lum, 178, dtype=np.uint8)

    # Soft edge fade: pixels within 3px of the raster edge get reduced alpha
    fade = 3
    if rows > 2 * fade and cols > 2 * fade:
        for i in range(fade):
            a = int(178 * i / fade)
            hs_alpha[i, :]     = a
            hs_alpha[-1-i, :]  = a
            hs_alpha[:, i]     = a
            hs_alpha[:, -1-i]  = a

    out_hs = OUT_DIR / "kutch_hillshade.png"
    write_png_rgba(out_hs, hs_lum, hs_alpha)
    print(f"    Saved: {out_hs}  ({out_hs.stat().st_size:,} bytes)")

    # -----------------------------------------------------------------------
    print("[3/3] Generating 2m-interval contour lines...")

    # Determine contour levels within the clipped elevation range
    elev_min = float(elev.min())
    elev_max = float(elev.max())
    start_level = math.ceil(elev_min / CONTOUR_INTERVAL) * CONTOUR_INTERVAL
    levels = np.arange(start_level, elev_max + CONTOUR_INTERVAL, CONTOUR_INTERVAL)
    print(f"    Levels: {levels[0]:.0f}m – {levels[-1]:.0f}m, {len(levels)} contours")

    all_features = []
    for level in levels:
        feats = marching_squares_contours(elev, clip_transform, float(level))
        all_features.extend(feats)

    print(f"    Total line segments: {len(all_features)}")

    geojson = {
        "type": "FeatureCollection",
        "name": "kutch_contours_2m",
        "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
        "features": all_features
    }

    out_ctr = OUT_DIR / "kutch_contours.geojson"
    out_ctr.write_text(json.dumps(geojson, separators=(",", ":")), encoding="utf-8")
    print(f"    Saved: {out_ctr}  ({out_ctr.stat().st_size:,} bytes)")

    # -----------------------------------------------------------------------
    print("\n[OK] Done.")
    print(f"   Hillshade bounds for SingleTileImageryProvider:")
    print(f"   west={CLIP['west']}, south={CLIP['south']}, east={CLIP['east']}, north={CLIP['north']}")



if __name__ == "__main__":
    main()
