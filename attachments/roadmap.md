# Roadmap — 3D Interactive Map of the Kutch Desert (CesiumJS)

## Project goal
Build a browser-based, interactive 3D map of the Kutch / Rann of Kutch region (Gujarat, India) on CesiumJS, with an extensible feature system — starting with symbology (themed icons, colors, legends) and designed to grow into additional layers (routes, seasonal flooding, points of interest, cultural sites, wildlife zones, etc.).

## Guiding principles
- Ship a thin, working globe first. Add richness in layers, not in one big push.
- Keep terrain and imagery separate from feature data (points/polygons) so symbology can evolve without touching the base scene.
- Every feature gets a `type` attribute from day one — symbology is always driven by data, never hardcoded per-feature.
- Performance budget matters more than visual maximalism — Kutch is a huge, mostly flat area; don't over-render.

---

## Phase 0 — Setup & Accounts (Day 1–2)
- [ ] Create a free Cesium ion account (for hosted terrain/imagery streaming + asset tiling).
- [ ] Set up project repo (Git), folder structure (see `architecture.md`).
- [ ] Install CesiumJS via npm + bundler (Vite recommended) — decide against CDN-only for a real app.
- [ ] Get a basic empty globe rendering in the browser as a smoke test.
- [ ] Decide on hosting target (Netlify/Vercel/GitHub Pages/self-host) — confirms build constraints early.

**Deliverable:** blank Cesium globe loads in browser, camera controls work.

---

## Phase 1 — Base Scene: Terrain & Imagery (Week 1)

**Study area locked: ~20 km² of open salt flat in the White Rann, near Dhordo** (Great Rann of Kutch) — pure desert terrain, not the whole district. See `architecture.md` §6 for the working bounding box (unverified, confirm against satellite imagery first).

- [ ] **Verify the bounding box against real satellite imagery** (Google Earth / Bhuvan) before tiling anything — confirm it sits on open salt flat, clear of the Dhordo tent-city footprint and BSF checkpoint road.
- [ ] Source elevation data clipped to that ~20 km² box only:
  - Bhuvan CartoDEM (preferred, India-specific) or SRTM 30m as fallback.
  - Given the area's near-total flatness, treat raw DEM relief as unreliable at this scale — plan for a shader/normal-map approach to convey salt-crust micro-texture rather than expecting real elevation variation to do the visual work.
- [ ] Add a base imagery layer (satellite: Bing/Sentinel/ESRI World Imagery) — at 20 km², prioritize the highest resolution source available; low-res imagery will read as a blurry white blob and defeat the point of a small, detailed study area.
- [ ] Set the default camera to fly directly to this bounding box on load (not the district), pitched moderately (~30–45°) so the horizon-to-horizon flatness reads clearly.
- [ ] Add basic atmosphere/lighting tuning (sun position, fog) for readability over a flat salt desert (avoid overexposure glare — this is a real risk given how reflective the salt surface is).
- [ ] Add a fallback 2D/2.5D "flat mode" toggle for moments when 3D tilt hurts readability (measuring, comparing areas) — see research notes on when 3D helps vs. hurts.

**Deliverable:** navigable 3D view of the White Rann salt-flat study area with real imagery, camera locked to the 20 km² box on load.

---

## Phase 2 — Boundaries & Reference Layers (Week 2)
- [ ] Add Kutch district / Rann of Kutch boundary polygons (Great Rann vs Little Rann distinguished).
- [ ] Add watershed/drainage/river reference layers (context only, minimal styling, likely excluded from legend per cartography best practice).
- [ ] Add labels for major towns (Bhuj, Dholavira, Mandvi, Rann Utsav site at Dhordo, etc.).
- [ ] Verify all reference data sits under terrain correctly (no z-fighting / floating polygons).

**Deliverable:** Map has geographic "context" — you can orient yourself even with zero thematic layers on.

---

## Phase 3 — Symbology System (Week 3) ⭐ core deliverable
This is the heart of "add features like symbology" — build it as a system, not one-off styling.

- [ ] Define the feature schema (see `architecture.md` → Data Model) — every point/polygon has `type`, `subtype`, `name`, `description`, `mediaUrl`, `season` (optional), etc.
- [ ] Build a **symbology config** (JSON) mapping `type` → { icon, color, scale, category } — single source of truth, not scattered in code.
- [ ] Implement `Entity`/`DataSource` loading that reads GeoJSON and applies symbology config automatically (style-by-attribute, not per-feature).
- [ ] Categories to seed first:
  - Settlements / villages (Banni villages, handicraft clusters)
  - Salt pans / salt industry sites
  - Wildlife & conservation (Wild Ass Sanctuary, flamingo sites)
  - Cultural & heritage (Dholavira, forts, temples)
  - Tourism infrastructure (Rann Utsav tent city, viewpoints)
- [ ] Build the on-screen **legend UI** synced 1:1 with symbology config (icon/color must exactly match map — see cartography research).
- [ ] Add category toggle checkboxes (show/hide by type) — respect performance constraints (batch entities per DataSource per category so toggling is cheap).
- [ ] Add hover/click info popups (Cesium `InfoBox` or custom HTML overlay) pulling from feature `description`/`mediaUrl`.

**Deliverable:** Users can see categorized points on the map, toggle categories on/off, and read a legend that matches exactly what's rendered.

---

## Phase 4 — Interactivity & UX Polish (Week 4)
- [ ] Search/geocode box to fly camera to a place or feature by name.
- [ ] "Fly to" preset tour buttons (e.g., "Great Rann at sunset," "Dholavira," "Wild Ass Sanctuary").
- [ ] Mobile responsiveness pass (Cesium canvas + UI panels on small screens).
- [ ] Loading states / progressive loading indicators for terrain & data sources.
- [ ] Color-blind-safe palette check for symbology categories.
- [ ] Basic analytics on which layers/features get used (optional, if this is a public-facing product).

**Deliverable:** Feels like a polished product, not a demo.

---

## Phase 5 — Advanced / Stretch Features (post-MVP, prioritize later)
- [ ] Seasonal toggle: Rann appearance during monsoon flooding vs. dry salt desert (may need two imagery sets or a shader-based effect).
- [ ] Time-dynamic layer using Cesium's Clock/CZML (e.g., Rann Utsav festival dates, migratory bird seasons).
- [ ] 3D models (glTF) for landmark structures (Kalo Dungar viewpoint, forts) instead of flat icons, for close-up views.
- [ ] Heatmap/data layer (e.g., tourist footfall, salt production volume) — likely needs deck.gl-style overlay or Cesium's `ImageryLayer` heat rendering.
- [ ] User-contributed pins / CMS-backed feature editing (would require a backend + auth).
- [ ] Story-mode / guided narrative walkthrough (Cesium supports "CesiumJS Stories"-style scripted camera flights).
- [ ] Multi-language support (Gujarati/Hindi/English) for labels and popups.

---

## Milestones summary

| Milestone | Target | Outcome |
|---|---|---|
| M0 | Day 2 | Blank globe renders |
| M1 | End Wk 1 | Real Kutch terrain + imagery, camera locked to region |
| M2 | End Wk 2 | Boundaries, rivers, town labels visible |
| M3 | End Wk 3 | Full symbology system + legend + toggles live |
| M4 | End Wk 4 | Polished, mobile-friendly, interactive MVP |
| M5 | Ongoing | Stretch features added incrementally |

## Open decisions to make before Phase 1
1. **Confirm the exact 20 km² bounding box** against satellite imagery (see Phase 1) — the coordinates in `architecture.md` are a starting estimate, not surveyed.
2. Terrain source: rely on real DEM relief (likely near-flat/uninteresting at this scale) vs. a shader-driven salt-crust texture approach for visual richness?
3. Hosting for Cesium ion assets: free tier limits vs. paid, based on expected traffic.
4. Is this public-facing (needs polish, SEO, multi-language) or an internal/portfolio tool (can stay leaner)?
5. Given the study area is pure open desert (no village/heritage sites inside the box), what symbology categories actually apply here? Likely candidates: viewing points, BSF checkpoint/permit boundary, seasonal flood-line markers, sunrise/sunset photo spots, camel-cart routes — rather than the settlement/heritage categories originally scoped for the whole district. Worth revisiting Phase 3's category list against this specific area.
