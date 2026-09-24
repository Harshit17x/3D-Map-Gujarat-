import * as Cesium from 'cesium';
import { initializeCesiumViewer } from './modules/terrain.ts';
import { CAMERA_PRESETS } from './config/camera.config.ts';
import { CustomPointsManager, CustomPoint } from './modules/customPoints.ts';
import { setupNavigationPad, bindHoldAction } from './modules/navigationPad.ts';

async function bootstrapApp() {
  try {
    // 1. Initialize Cesium 3D Globe with White Rann Study Area
    const {
      viewer,
      flyToStudyArea,
      setSceneMode,
      setLightingPreset,
      toggleHillshadeLayer,
      toggleContourLayer,
      zoomIn,
      zoomOut,
      viewshedManager
    } = await initializeCesiumViewer('cesiumContainer');

    // 2. Initialize 3D Custom Points System
    const pointsManager = new CustomPointsManager(viewer);

    // 3. Render HUD Overlay (Google Maps Architecture: Slim Rail + Spacious Side Drawer)
    const hudContainer = document.getElementById('appHud');
    if (!hudContainer) return;

    hudContainer.innerHTML = `
      <!-- Placement Instruction Banner (Shown when clicking map to drop 3D pin) -->
      <div class="placement-banner" id="placementBanner" style="display: none;">
        <span class="banner-icon">📍</span>
        <span class="banner-text">Click anywhere on the map to drop 3D pin</span>
        <button class="banner-cancel-btn" id="btnCancelPlacement">Cancel</button>
      </div>

      <!-- Viewshed Placement Banner (Shown when clicking map to place observer) -->
      <div class="placement-banner" id="viewshedBanner" style="display: none;">
        <span class="banner-icon">👁️</span>
        <span class="banner-text">Click anywhere on the terrain to place observer</span>
        <button class="banner-cancel-btn" id="btnCancelViewshed">Cancel</button>
      </div>

      <!-- ====================================================================
           1. SLIM LEFT RAIL (Reference Image 2)
           ==================================================================== -->
      <nav class="gmap-rail hud-interactive" id="gmapRail">
        <!-- Menu Hamburger Button -->
        <button class="rail-item" id="railBtnMenu" title="Open Features Menu">
          <div class="rail-icon-wrap">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </div>
          <span class="rail-label">Menu</span>
        </button>

        <!-- Add Pin Button (Pill highlight matching Image 2 'Ask Maps' shape) -->
        <button class="rail-item" id="railBtnAddPin" title="Drop a 3D Location Pin on the map">
          <div class="rail-hero-pill">
            <span>📍</span>
          </div>
          <span class="rail-label">Add Pin</span>
        </button>

        <!-- Saved Points -->
        <button class="rail-item" id="railBtnSaved" title="Saved Points & Locations">
          <div class="rail-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
            <span class="rail-badge" id="railBadgeCount">4</span>
          </div>
          <span class="rail-label">Saved</span>
        </button>

        <!-- Terrain Layers (Hillshade & Contours) -->
        <button class="rail-item" id="railBtnLayers" title="Terrain & Analytical Layers">
          <div class="rail-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 2 7 12 12 22 7 12 2"/>
              <polyline points="2 17 12 22 22 17"/>
              <polyline points="2 12 12 17 22 12"/>
            </svg>
          </div>
          <span class="rail-label">Layers</span>
        </button>

        <!-- Viewshed Analysis -->
        <button class="rail-item" id="railBtnViewshed" title="Line-of-Sight Viewshed Analysis">
          <div class="rail-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
          <span class="rail-label">Viewshed</span>
        </button>

        <!-- 3D Navigation Pad & Tilt -->
        <button class="rail-item" id="railBtnNav" title="3D Navigation & Tilt Gimbal">
          <div class="rail-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
            </svg>
          </div>
          <span class="rail-label">3D Nav</span>
        </button>

        <div class="rail-divider"></div>

        <!-- Solar Lighting Mode -->
        <button class="rail-item" id="railBtnLighting" title="Switch Sun & Solar Lighting">
          <div class="rail-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            </svg>
          </div>
          <span class="rail-label" id="railLightingLabel">Lighting</span>
        </button>

        <!-- Scenic 3D Tour -->
        <button class="rail-item" id="railBtnTour" title="Cycle Scenic Camera Tour">
          <div class="rail-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="23 7 16 12 23 17 23 7"/>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
          </div>
          <span class="rail-label" id="railTourLabel">Tour</span>
        </button>

        <div class="rail-spacer"></div>
        <div class="rail-divider"></div>

        <!-- Reset Camera View -->
        <button class="rail-item" id="railBtnReset" title="Re-center camera on the White Desert">
          <div class="rail-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
          </div>
          <span class="rail-label">Reset</span>
        </button>
      </nav>

      <!-- ====================================================================
           2. SLIDE-OUT DRAWER / MENU (Reference Image 1)
           ==================================================================== -->
      <aside class="gmap-drawer hud-interactive drawer-closed" id="gmapDrawer">
        <!-- Header -->
        <div class="drawer-header-row">
          <div class="drawer-brand">
            <span class="gmap-logo-text">
              <span class="g-blue">Kutch</span>
              <span class="g-red">3D</span>
              <span class="g-yellow">Desert</span>
              <span class="g-green">Map</span>
            </span>
            <span class="drawer-sub">White Rann of Kutch • Dhordo, Gujarat</span>
          </div>
          <button class="drawer-close-btn" id="btnDrawerClose" title="Close drawer">&times;</button>
        </div>

        <!-- Scrollable Content -->
        <div class="drawer-content">
          <!-- Toggle Row: Show On-Screen Nav Pad (matching 'Show side bar' switch in Image 1) -->
          <div class="drawer-toggle-row">
            <div class="drawer-row-left">
              <div class="drawer-row-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="9"/>
                  <polygon points="12 2 15 9 12 7 9 9 12 2"/>
                </svg>
              </div>
              <div class="drawer-row-text">
                <span class="drawer-row-title">On-Screen 3D Gimbal</span>
                <span class="drawer-row-desc">Show floating navigation dock on map</span>
              </div>
            </div>
            <label class="gmap-switch">
              <input type="checkbox" id="switchNavDock" checked />
              <span class="gmap-slider"></span>
            </label>
          </div>

          <!-- Hero Action Button (matching 'Ask Maps' in Image 1) -->
          <div class="drawer-hero-container">
            <button class="drawer-hero-btn" id="drawerBtnAddPin">
              <span class="drawer-hero-icon">📍</span>
              <span id="drawerAddPinLabel">Drop 3D Location Pin</span>
            </button>
          </div>

          <!-- Saved Points Action Row -->
          <button class="drawer-action-row" id="drawerRowSaved">
            <div class="drawer-row-left">
              <div class="drawer-row-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div class="drawer-row-text">
                <span class="drawer-row-title">Saved Locations</span>
                <span class="drawer-row-desc">Custom pins & cultural landmarks</span>
              </div>
            </div>
            <span class="drawer-badge" id="drawerBadgeSaved">4 saved</span>
          </button>
          <!-- Collapsible Saved List -->
          <div class="drawer-saved-collapsible" id="drawerSavedList" style="display: none;">
            <div class="points-list" id="pointsListContainer"></div>
          </div>

          <div class="drawer-divider"></div>

          <!-- MAP & TERRAIN LAYERS SECTION -->
          <div class="drawer-section-title" id="sectionLayersTitle">MAP & TERRAIN LAYERS</div>

          <!-- Multidirectional Hillshade Toggle -->
          <div class="drawer-toggle-row">
            <div class="drawer-row-left">
              <div class="drawer-row-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="3 20 9 4 15 14 19 8 21 20 3 20"/>
                </svg>
              </div>
              <div class="drawer-row-text">
                <span class="drawer-row-title">Multidirectional Hillshade</span>
                <span class="drawer-row-desc">Copernicus 30m terrain relief</span>
              </div>
            </div>
            <label class="gmap-switch">
              <input type="checkbox" id="switchHillshade" />
              <span class="gmap-slider"></span>
            </label>
          </div>

          <!-- 2m Contour Lines Toggle -->
          <div class="drawer-toggle-row">
            <div class="drawer-row-left">
              <div class="drawer-row-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 12 Q7 6 12 12 Q17 18 21 12"/>
                  <path d="M3 7 Q7 3 12 7 Q17 11 21 7" opacity="0.6"/>
                </svg>
              </div>
              <div class="drawer-row-text">
                <span class="drawer-row-title">2m Contour Lines</span>
                <span class="drawer-row-desc">Hypsometric topographic elevation</span>
              </div>
            </div>
            <label class="gmap-switch">
              <input type="checkbox" id="switchContours" />
              <span class="gmap-slider"></span>
            </label>
          </div>

          <!-- Viewshed Analysis Toggle -->
          <div class="drawer-toggle-row">
            <div class="drawer-row-left">
              <div class="drawer-row-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </div>
              <div class="drawer-row-text">
                <span class="drawer-row-title">Viewshed Analysis</span>
                <span class="drawer-row-desc" id="drawerVsDesc">Line-of-sight visual coverage</span>
              </div>
            </div>
            <label class="gmap-switch">
              <input type="checkbox" id="switchViewshed" />
              <span class="gmap-slider"></span>
            </label>
          </div>

          <div class="drawer-divider"></div>

          <!-- VIEW PROJECTION SECTION -->
          <div class="drawer-section-title">VIEW PROJECTION</div>
          <div class="view-mode-container">
            <div class="view-mode-pills" id="viewModeGroup">
              <button class="view-pill active" data-mode="3D" id="btnMode3D">3D Globe</button>
              <button class="view-pill" data-mode="COLUMBUS" id="btnModeColumbus">2.5D Columbus</button>
              <button class="view-pill" data-mode="2D" id="btnMode2D">2D Map</button>
            </div>
          </div>

          <div class="drawer-divider"></div>

          <!-- ENVIRONMENT & TOUR SECTION -->
          <div class="drawer-section-title">ENVIRONMENT & TOUR</div>

          <!-- Solar Lighting -->
          <button class="drawer-action-row" id="drawerRowLighting">
            <div class="drawer-row-left">
              <div class="drawer-row-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                </svg>
              </div>
              <div class="drawer-row-text">
                <span class="drawer-row-title">Solar Lighting</span>
                <span class="drawer-row-desc">Simulate sun angle & shadows</span>
              </div>
            </div>
            <span class="drawer-badge" id="lightingBadge">Golden Hour</span>
          </button>

          <!-- Scenic 3D Tour -->
          <button class="drawer-action-row" id="drawerRowTour">
            <div class="drawer-row-left">
              <div class="drawer-row-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="23 7 16 12 23 17 23 7"/>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                </svg>
              </div>
              <div class="drawer-row-text">
                <span class="drawer-row-title">Scenic 3D Tour</span>
                <span class="drawer-row-desc">Fly to viewpoints across Dhordo</span>
              </div>
            </div>
            <span class="drawer-badge" id="tourBadge">White Desert ›</span>
          </button>

          <!-- Reset Camera -->
          <button class="drawer-action-row" id="drawerRowReset">
            <div class="drawer-row-left">
              <div class="drawer-row-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/>
                </svg>
              </div>
              <div class="drawer-row-text">
                <span class="drawer-row-title">Reset Camera</span>
                <span class="drawer-row-desc">Return to Dhordo study area</span>
              </div>
            </div>
            <span class="drawer-row-arrow">›</span>
          </button>

          <div class="drawer-divider"></div>

          <!-- 3D NAVIGATION & TILT SECTION -->
          <div class="drawer-section-title" id="sectionNavTitle">3D CAMERA GIMBAL & TILT</div>
          <div class="drawer-nav-card">
            <div class="nav-mode-switcher">
              <button class="nav-mode-pill active" id="btnNavModeTilt">3D Tilt & Rotate</button>
              <button class="nav-mode-pill" id="btnNavModePan">Pan Map</button>
            </div>
            <div class="nav-controls-layout">
              <div class="dpad-cross-container">
                <button class="dpad-btn dpad-up" id="btnDpadUp" title="Tilt Up / Pan forward">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
                </button>
                <button class="dpad-btn dpad-left" id="btnDpadLeft" title="Rotate Left / Pan left">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <button class="dpad-btn dpad-center" id="btnDpadCenter" title="Reset North & 3D tilt">
                  🧭
                </button>
                <button class="dpad-btn dpad-right" id="btnDpadRight" title="Rotate Right / Pan right">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                <button class="dpad-btn dpad-down" id="btnDpadDown" title="Tilt Down / Pan backward">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
              </div>
              <div class="nav-quick-side">
                <div class="nav-zoom-group">
                  <button class="nav-zoom-btn" id="btnZoomIn" title="Zoom In (+)">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    <span>Zoom +</span>
                  </button>
                  <button class="nav-zoom-btn" id="btnZoomOut" title="Zoom Out (−)">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    <span>Zoom −</span>
                  </button>
                </div>
                <div class="nav-angle-group">
                  <button class="dpad-pill-btn" id="btnQuickTilt3D" title="Tilt into 3D horizon view">
                    <span>📐 3D Tilt</span>
                  </button>
                  <button class="dpad-pill-btn" id="btnQuickTopDown" title="Look straight down (90° Top-Down)">
                    <span>🗺️ Nadir</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="drawer-divider"></div>

          <!-- SPATIAL TELEMETRY SECTION -->
          <div class="drawer-section-title">SPATIAL TELEMETRY</div>
          <div style="padding: 0 18px 16px;">
            <div class="telemetry-grid">
              <div class="telem-cell"><span class="telem-label">Latitude</span><span class="telem-val" id="telemetryLat">23.8450° N</span></div>
              <div class="telem-cell"><span class="telem-label">Longitude</span><span class="telem-val" id="telemetryLon">69.5200° E</span></div>
              <div class="telem-cell"><span class="telem-label">Altitude</span><span class="telem-val" id="telemetryAlt">2,400 m</span></div>
              <div class="telem-cell"><span class="telem-label">Heading</span><span class="telem-val" id="telemetryHeading">0° N</span></div>
            </div>
          </div>
        </div>
      </aside>

      <!-- ====================================================================
           3. FLOATING ON-SCREEN 3D NAV DOCK (Positioned bottom-left next to rail)
           ==================================================================== -->
      <div class="hud-nav-dock hud-interactive" id="floatingNavDock">
        <div class="dpad-cross-container">
          <button class="dpad-btn dpad-up" id="btnFloatDpadUp" title="Tilt Up / Pan forward">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
          </button>
          <button class="dpad-btn dpad-left" id="btnFloatDpadLeft" title="Rotate Left / Pan left">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button class="dpad-btn dpad-center" id="btnFloatDpadCenter" title="Reset North & 3D tilt">
            🧭
          </button>
          <button class="dpad-btn dpad-right" id="btnFloatDpadRight" title="Rotate Right / Pan right">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <button class="dpad-btn dpad-down" id="btnFloatDpadDown" title="Tilt Down / Pan backward">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
        <div class="nav-zoom-group">
          <button class="nav-zoom-btn" id="btnFloatZoomIn" title="Zoom In (+)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>+</span>
          </button>
          <button class="nav-zoom-btn" id="btnFloatZoomOut" title="Zoom Out (−)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>−</span>
          </button>
        </div>
      </div>

      <!-- Viewshed HUD Legend (Floating Pill in Bottom-Right) -->
      <div class="viewshed-hud-legend" id="viewshedHudLegend" style="display: none;" title="Viewshed Legend: Green = Visible, Red = Blocked">
        <span class="vs-legend-title">Viewshed:</span>
        <span class="vs-legend-item"><span class="vs-legend-swatch vs-visible"></span> Visible</span>
        <span class="vs-legend-item"><span class="vs-legend-swatch vs-blocked"></span> Blocked</span>
      </div>

      <!-- Point Details Floating Card (Shown when a 3D pin is clicked) -->
      <div class="point-detail-card hud-interactive" id="pointDetailCard" style="display: none;">
        <div class="card-top">
          <span class="card-cat-badge" id="cardCategoryBadge">📍 VIEWPOINT</span>
          <button class="modal-close-btn" id="btnCloseCard">&times;</button>
        </div>
        <h3 class="card-title" id="cardTitle">Landmark Name</h3>
        <p class="card-desc" id="cardDescription">Description text goes here.</p>
        <div class="card-coords" id="cardCoords">23.8450° N, 69.5200° E</div>
        <div class="card-btn-row">
          <button class="card-fly-btn" id="btnFlyToSelected">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
            Fly Here in 3D
          </button>
          <button class="card-del-btn" id="btnDeleteSelected" title="Delete Point">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Point Creation Modal Dialog -->
      <div class="modal-overlay" id="pointModalOverlay" style="display: none;">
        <div class="modal-dialog" id="pointModal">
          <div class="modal-header">
            <h3 class="modal-title">
              <span>📍</span> Add New 3D Point
            </h3>
            <button class="modal-close-btn" id="btnCloseModal">&times;</button>
          </div>

          <div class="form-field">
            <label class="form-label">Point Name *</label>
            <input type="text" class="form-input" id="inputPointName" placeholder="e.g. Sunset Observation Deck, Desert Camp..." />
          </div>

          <div class="form-field">
            <label class="form-label">Category</label>
            <div class="category-chips" id="categoryChips">
              <button type="button" class="chip-btn selected" data-cat="viewpoint">📍 Viewpoint</button>
              <button type="button" class="chip-btn" data-cat="camp">🎪 Camp / Tent</button>
              <button type="button" class="chip-btn" data-cat="heritage">🏛️ Heritage</button>
              <button type="button" class="chip-btn" data-cat="nature">🦩 Nature</button>
              <button type="button" class="chip-btn" data-cat="custom">⭐ Custom</button>
            </div>
          </div>

          <div class="coords-row">
            <div class="form-field">
              <label class="form-label">Latitude</label>
              <input type="number" step="any" class="form-input" id="inputPointLat" />
            </div>
            <div class="form-field">
              <label class="form-label">Longitude</label>
              <input type="number" step="any" class="form-input" id="inputPointLon" />
            </div>
          </div>

          <div class="form-field">
            <label class="form-label">Description (Optional)</label>
            <textarea class="form-textarea" id="inputPointDesc" rows="2" placeholder="Brief notes about this location..."></textarea>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-secondary" id="btnCancelModal">Cancel</button>
            <button type="button" class="btn-primary" id="btnSavePoint">Place 3D Pin</button>
          </div>
        </div>
      </div>

      <!-- Viewshed Observer Height Modal -->
      <div class="modal-overlay" id="viewshedModalOverlay" style="display: none;">
        <div class="modal-dialog" id="viewshedModal">
          <div class="modal-header">
            <h3 class="modal-title">
              <span>👁️</span> Viewshed Analysis
            </h3>
            <button class="modal-close-btn" id="btnCloseViewshedModal">&times;</button>
          </div>

          <p style="color:#5f6368; font-size:0.82rem; margin:0 0 1rem 0; line-height:1.5;">
            Observer placed. Computing line-of-sight analysis&hellip;<br/>
            <strong style="color:#00c853;">Green</strong> = visible terrain &nbsp;&bull;&nbsp;
            <strong style="color:#d50000;">Red</strong> = occluded terrain
          </p>

          <div class="form-field">
            <label class="form-label">Observer Height Above Ground</label>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <input type="range" id="viewshedHeightSlider" min="1" max="30" step="0.5" value="1.8"
                style="flex:1; accent-color:#1a73e8;" />
              <span id="viewshedHeightValue" style="color:#202124; font-size:0.85rem; font-weight:600; min-width:3rem;">1.8 m</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-top:0.35rem;">
              <button type="button" class="chip-btn" id="vsPresetPerson" style="font-size:0.7rem;">Person (1.8m)</button>
              <button type="button" class="chip-btn" id="vsPresetTower" style="font-size:0.7rem;">Tower (10m)</button>
              <button type="button" class="chip-btn" id="vsPresetMast" style="font-size:0.7rem;">Mast (25m)</button>
            </div>
          </div>

          <div class="modal-actions" style="margin-top:0.75rem;">
            <button type="button" class="btn-secondary" id="btnClearViewshed">Clear Analysis</button>
            <button type="button" class="btn-primary" id="btnRecomputeViewshed">Recompute</button>
          </div>
        </div>
      </div>
    `;

    // =========================================================================
    // 4. RAIL & DRAWER TOGGLE LOGIC
    // =========================================================================
    const gmapDrawer = document.getElementById('gmapDrawer');
    const railBtnMenu = document.getElementById('railBtnMenu');
    const btnDrawerClose = document.getElementById('btnDrawerClose');

    const toggleDrawer = (open?: boolean) => {
      if (!gmapDrawer) return;
      const isCurrentlyClosed = gmapDrawer.classList.contains('drawer-closed');
      const shouldOpen = open !== undefined ? open : isCurrentlyClosed;
      gmapDrawer.classList.toggle('drawer-closed', !shouldOpen);
      railBtnMenu?.classList.toggle('active', shouldOpen);
    };

    railBtnMenu?.addEventListener('click', () => toggleDrawer());
    btnDrawerClose?.addEventListener('click', () => toggleDrawer(false));

    // Floating On-Screen Nav Dock toggle switch
    const switchNavDock = document.getElementById('switchNavDock') as HTMLInputElement | null;
    const floatingNavDock = document.getElementById('floatingNavDock');
    switchNavDock?.addEventListener('change', () => {
      if (floatingNavDock) {
        floatingNavDock.classList.toggle('dock-hidden', !switchNavDock.checked);
      }
    });

    // =========================================================================
    // 5. VIEW MODES (3D Globe / 2.5D Columbus / 2D Map)
    // =========================================================================
    const modeButtons = document.querySelectorAll<HTMLButtonElement>('#viewModeGroup button');
    modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.getAttribute('data-mode') as '3D' | 'COLUMBUS' | '2D';
        setSceneMode(mode);
      });
    });

    // =========================================================================
    // 6. SCENIC CAMERA TOUR
    // =========================================================================
    let currentPresetIndex = 0;
    const railBtnTour = document.getElementById('railBtnTour');
    const drawerRowTour = document.getElementById('drawerRowTour');
    const tourBadge = document.getElementById('tourBadge');
    const railTourLabel = document.getElementById('railTourLabel');

    const advanceTour = () => {
      currentPresetIndex = (currentPresetIndex + 1) % CAMERA_PRESETS.length;
      const nextPreset = CAMERA_PRESETS[currentPresetIndex];
      const shortName = nextPreset.label.split(' ')[0];
      if (tourBadge) tourBadge.textContent = `${shortName} ›`;
      if (railTourLabel) railTourLabel.textContent = shortName;
      flyToStudyArea(nextPreset.id);
    };

    railBtnTour?.addEventListener('click', advanceTour);
    drawerRowTour?.addEventListener('click', advanceTour);

    // =========================================================================
    // 7. SOLAR LIGHTING PRESETS
    // =========================================================================
    const lightingModes: Array<'golden' | 'noon' | 'sunset'> = ['golden', 'noon', 'sunset'];
    const lightingLabels = ['Golden Hour', 'High Noon', 'Sunset'];
    let currentLightingIndex = 0;
    const railBtnLighting = document.getElementById('railBtnLighting');
    const drawerRowLighting = document.getElementById('drawerRowLighting');
    const lightingBadge = document.getElementById('lightingBadge');
    const railLightingLabel = document.getElementById('railLightingLabel');

    const cycleLighting = () => {
      currentLightingIndex = (currentLightingIndex + 1) % lightingModes.length;
      const nextMode = lightingModes[currentLightingIndex];
      const label = lightingLabels[currentLightingIndex];
      if (lightingBadge) lightingBadge.textContent = label;
      if (railLightingLabel) railLightingLabel.textContent = label.split(' ')[0];
      setLightingPreset(nextMode);
    };

    railBtnLighting?.addEventListener('click', cycleLighting);
    drawerRowLighting?.addEventListener('click', cycleLighting);

    // =========================================================================
    // 8. 3D NAVIGATION CONTROLLER (Embedded D-Pad & Floating Dock)
    // =========================================================================
    const navControls = setupNavigationPad(viewer);

    // Bind floating dock duplicate controls
    bindHoldAction(document.getElementById('btnFloatDpadUp'), (c) => {
      if (navControls.getNavMode() === 'pan') navControls.pan('up', c);
      else navControls.tiltUp(c);
    });
    bindHoldAction(document.getElementById('btnFloatDpadDown'), (c) => {
      if (navControls.getNavMode() === 'pan') navControls.pan('down', c);
      else navControls.tiltDown(c);
    });
    bindHoldAction(document.getElementById('btnFloatDpadLeft'), (c) => {
      if (navControls.getNavMode() === 'pan') navControls.pan('left', c);
      else navControls.rotateLeft(c);
    });
    bindHoldAction(document.getElementById('btnFloatDpadRight'), (c) => {
      if (navControls.getNavMode() === 'pan') navControls.pan('right', c);
      else navControls.rotateRight(c);
    });
    document.getElementById('btnFloatDpadCenter')?.addEventListener('click', () => {
      navControls.reset3DNorth();
    });
    bindHoldAction(document.getElementById('btnFloatZoomIn'), () => zoomIn());
    bindHoldAction(document.getElementById('btnFloatZoomOut'), () => zoomOut());

    // Drawer zoom buttons
    bindHoldAction(document.getElementById('btnZoomIn'), () => zoomIn());
    bindHoldAction(document.getElementById('btnZoomOut'), () => zoomOut());

    // Rail 3D Nav item: open drawer and scroll to Nav section
    const railBtnNav = document.getElementById('railBtnNav');
    railBtnNav?.addEventListener('click', () => {
      toggleDrawer(true);
      document.getElementById('sectionNavTitle')?.scrollIntoView({ behavior: 'smooth' });
    });

    // Reset View button (Rail & Drawer)
    const resetView = () => {
      currentPresetIndex = 0;
      if (tourBadge) tourBadge.textContent = 'White Desert ›';
      if (railTourLabel) railTourLabel.textContent = 'Tour';
      flyToStudyArea('default');
    };
    document.getElementById('railBtnReset')?.addEventListener('click', resetView);
    document.getElementById('drawerRowReset')?.addEventListener('click', resetView);

    // =========================================================================
    // 9. ANALYTICAL TERRAIN LAYERS (Hillshade & 2m Contours)
    // =========================================================================
    const switchHillshade = document.getElementById('switchHillshade') as HTMLInputElement | null;
    switchHillshade?.addEventListener('change', () => {
      toggleHillshadeLayer(switchHillshade.checked);
    });

    const switchContours = document.getElementById('switchContours') as HTMLInputElement | null;
    switchContours?.addEventListener('change', () => {
      toggleContourLayer(switchContours.checked);
    });

    // Rail Layers item: open drawer and scroll to Layers section
    const railBtnLayers = document.getElementById('railBtnLayers');
    railBtnLayers?.addEventListener('click', () => {
      toggleDrawer(true);
      document.getElementById('sectionLayersTitle')?.scrollIntoView({ behavior: 'smooth' });
    });

    // =========================================================================
    // 10. VIEWSHED ANALYSIS
    // =========================================================================
    let isViewshedPlacementMode = false;
    const railBtnViewshed    = document.getElementById('railBtnViewshed');
    const switchViewshed     = document.getElementById('switchViewshed') as HTMLInputElement | null;
    const viewshedBanner     = document.getElementById('viewshedBanner');
    const btnCancelViewshed  = document.getElementById('btnCancelViewshed');
    const drawerVsDesc       = document.getElementById('drawerVsDesc');
    const viewshedModal      = document.getElementById('viewshedModalOverlay');
    const btnCloseVsModal    = document.getElementById('btnCloseViewshedModal');
    const btnClearViewshed   = document.getElementById('btnClearViewshed');
    const btnRecompute       = document.getElementById('btnRecomputeViewshed');
    const vsHeightSlider     = document.getElementById('viewshedHeightSlider') as HTMLInputElement;
    const vsHeightValue      = document.getElementById('viewshedHeightValue');

    const viewshedHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    let vsHandlerActive = false;

    const enterViewshedPlacement = () => {
      isViewshedPlacementMode = true;
      toggleDrawer(false); // Close drawer so the user can easily click map
      if (viewshedBanner) viewshedBanner.style.display = 'flex';
      railBtnViewshed?.classList.add('active');

      if (!vsHandlerActive) {
        vsHandlerActive = true;
        viewshedHandler.setInputAction(async (click: { position: Cesium.Cartesian2 }) => {
          if (!isViewshedPlacementMode) return;

          const ray = viewer.camera.getPickRay(click.position);
          if (!ray) return;

          let cartesian: Cesium.Cartesian3 | undefined;
          if (viewer.scene.globe) {
            cartesian = viewer.scene.globe.pick(ray, viewer.scene);
          }
          if (!cartesian) {
            cartesian = viewer.camera.pickEllipsoid(click.position, viewer.scene.globe.ellipsoid);
          }
          if (!cartesian) return;

          const carto = Cesium.Cartographic.fromCartesian(cartesian);
          const lat = Cesium.Math.toDegrees(carto.latitude);
          const lon = Cesium.Math.toDegrees(carto.longitude);

          // Exit placement mode
          isViewshedPlacementMode = false;
          if (viewshedBanner) viewshedBanner.style.display = 'none';
          if (switchViewshed) switchViewshed.checked = true;
          if (drawerVsDesc) drawerVsDesc.textContent = 'Active: Line-of-sight visual coverage';

          // Run viewshed analysis
          await viewshedManager.setObserver(lat, lon);
          await viewshedManager.enable();

          if (viewshedModal) viewshedModal.style.display = 'flex';
          const vsHudLegend = document.getElementById('viewshedHudLegend');
          if (vsHudLegend) vsHudLegend.style.display = 'inline-flex';
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
      }
    };

    const exitViewshed = () => {
      isViewshedPlacementMode = false;
      viewshedManager.clear();
      if (viewshedBanner)  viewshedBanner.style.display = 'none';
      if (viewshedModal)   viewshedModal.style.display = 'none';
      const vsHudLegend = document.getElementById('viewshedHudLegend');
      if (vsHudLegend)     vsHudLegend.style.display = 'none';
      railBtnViewshed?.classList.remove('active');
      if (switchViewshed) switchViewshed.checked = false;
      if (drawerVsDesc) drawerVsDesc.textContent = 'Line-of-sight visual coverage';
    };

    railBtnViewshed?.addEventListener('click', () => {
      if (viewshedManager.isEnabled()) {
        exitViewshed();
      } else if (isViewshedPlacementMode) {
        exitViewshed();
      } else {
        enterViewshedPlacement();
      }
    });

    switchViewshed?.addEventListener('change', () => {
      if (switchViewshed.checked) {
        enterViewshedPlacement();
      } else {
        exitViewshed();
      }
    });

    btnCancelViewshed?.addEventListener('click', () => {
      exitViewshed();
    });

    btnCloseVsModal?.addEventListener('click', () => {
      if (viewshedModal) viewshedModal.style.display = 'none';
    });

    btnClearViewshed?.addEventListener('click', () => {
      exitViewshed();
    });

    btnRecompute?.addEventListener('click', async () => {
      await viewshedManager.enable();
    });

    // Observer height slider
    vsHeightSlider?.addEventListener('input', () => {
      const h = parseFloat(vsHeightSlider.value);
      if (vsHeightValue) vsHeightValue.textContent = `${h.toFixed(1)} m`;
    });
    vsHeightSlider?.addEventListener('change', async () => {
      const h = parseFloat(vsHeightSlider.value);
      await viewshedManager.updateObserverHeight(h);
    });

    const setVsHeight = async (h: number) => {
      if (vsHeightSlider) vsHeightSlider.value = h.toString();
      if (vsHeightValue)  vsHeightValue.textContent = `${h.toFixed(1)} m`;
      await viewshedManager.updateObserverHeight(h);
    };
    document.getElementById('vsPresetPerson')?.addEventListener('click', () => setVsHeight(1.8));
    document.getElementById('vsPresetTower')?.addEventListener('click',  () => setVsHeight(10));
    document.getElementById('vsPresetMast')?.addEventListener('click',   () => setVsHeight(25));

    // =========================================================================
    // 11. 3D CUSTOM POINTS (Add Pin & Saved Points List)
    // =========================================================================
    const railBtnAddPin = document.getElementById('railBtnAddPin');
    const drawerBtnAddPin = document.getElementById('drawerBtnAddPin');
    const placementBanner = document.getElementById('placementBanner');
    const btnCancelPlacement = document.getElementById('btnCancelPlacement');

    const pointModalOverlay = document.getElementById('pointModalOverlay');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const btnCancelModal = document.getElementById('btnCancelModal');
    const btnSavePoint = document.getElementById('btnSavePoint');
    const inputPointName = document.getElementById('inputPointName') as HTMLInputElement;
    const inputPointLat = document.getElementById('inputPointLat') as HTMLInputElement;
    const inputPointLon = document.getElementById('inputPointLon') as HTMLInputElement;
    const inputPointDesc = document.getElementById('inputPointDesc') as HTMLTextAreaElement;

    let selectedCategory: CustomPoint['category'] = 'viewpoint';
    const categoryChips = document.querySelectorAll<HTMLButtonElement>('#categoryChips button');
    categoryChips.forEach(chip => {
      chip.addEventListener('click', () => {
        categoryChips.forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        selectedCategory = chip.getAttribute('data-cat') as CustomPoint['category'];
      });
    });

    const startAddPin = () => {
      toggleDrawer(false); // Close drawer to reveal full 3D map
      pointsManager.setAddMode(true);
    };

    railBtnAddPin?.addEventListener('click', startAddPin);
    drawerBtnAddPin?.addEventListener('click', startAddPin);

    btnCancelPlacement?.addEventListener('click', () => {
      pointsManager.setAddMode(false);
    });

    pointsManager.onAddModeChanged((isActive) => {
      if (placementBanner) placementBanner.style.display = isActive ? 'flex' : 'none';
      railBtnAddPin?.classList.toggle('active', isActive);
      drawerBtnAddPin?.classList.toggle('active-mode', isActive);
    });

    pointsManager.onMapClickForNewPoint((lat, lon) => {
      if (inputPointLat) inputPointLat.value = lat.toFixed(5);
      if (inputPointLon) inputPointLon.value = lon.toFixed(5);
      if (inputPointName) {
        inputPointName.value = '';
        setTimeout(() => inputPointName.focus(), 100);
      }
      if (inputPointDesc) inputPointDesc.value = '';
      if (pointModalOverlay) pointModalOverlay.style.display = 'flex';
    });

    const closeModal = () => {
      if (pointModalOverlay) pointModalOverlay.style.display = 'none';
    };
    btnCloseModal?.addEventListener('click', closeModal);
    btnCancelModal?.addEventListener('click', closeModal);

    btnSavePoint?.addEventListener('click', () => {
      const name = inputPointName?.value.trim() || 'My 3D Point';
      const lat = parseFloat(inputPointLat?.value) || 23.845;
      const lon = parseFloat(inputPointLon?.value) || 69.520;
      const desc = inputPointDesc?.value.trim() || '';

      pointsManager.addPoint({
        name,
        category: selectedCategory,
        latitude: lat,
        longitude: lon,
        altitude: 15,
        description: desc
      });

      closeModal();
    });

    // Point Details Floating Card
    let selectedPointId: string | null = null;
    const pointDetailCard = document.getElementById('pointDetailCard');
    const cardCategoryBadge = document.getElementById('cardCategoryBadge');
    const cardTitle = document.getElementById('cardTitle');
    const cardDescription = document.getElementById('cardDescription');
    const cardCoords = document.getElementById('cardCoords');
    const btnCloseCard = document.getElementById('btnCloseCard');
    const btnFlyToSelected = document.getElementById('btnFlyToSelected');
    const btnDeleteSelected = document.getElementById('btnDeleteSelected');

    btnCloseCard?.addEventListener('click', () => {
      if (pointDetailCard) pointDetailCard.style.display = 'none';
      selectedPointId = null;
    });

    btnFlyToSelected?.addEventListener('click', () => {
      if (selectedPointId) {
        pointsManager.flyToPoint(selectedPointId);
      }
    });

    btnDeleteSelected?.addEventListener('click', () => {
      if (selectedPointId) {
        pointsManager.deletePoint(selectedPointId);
        if (pointDetailCard) pointDetailCard.style.display = 'none';
        selectedPointId = null;
      }
    });

    pointsManager.onPointSelected((point) => {
      selectedPointId = point.id;
      if (cardTitle) cardTitle.textContent = point.name;
      if (cardDescription) cardDescription.textContent = point.description || 'Custom 3D point placed on the Kutch map.';
      if (cardCoords) cardCoords.textContent = `${point.latitude.toFixed(4)}° N, ${point.longitude.toFixed(4)}° E`;

      if (cardCategoryBadge) {
        cardCategoryBadge.textContent = `${point.category.toUpperCase()}`;
      }

      if (pointDetailCard) pointDetailCard.style.display = 'flex';
    });

    // Saved Locations: Expandable List in Drawer + Rail Badge
    const railBtnSaved = document.getElementById('railBtnSaved');
    const drawerRowSaved = document.getElementById('drawerRowSaved');
    const drawerSavedList = document.getElementById('drawerSavedList');
    const railBadgeCount = document.getElementById('railBadgeCount');
    const drawerBadgeSaved = document.getElementById('drawerBadgeSaved');
    const pointsListContainer = document.getElementById('pointsListContainer');

    const toggleSavedList = (expand?: boolean) => {
      if (!drawerSavedList) return;
      const isHidden = drawerSavedList.style.display === 'none';
      const shouldShow = expand !== undefined ? expand : isHidden;
      drawerSavedList.style.display = shouldShow ? 'flex' : 'none';
    };

    drawerRowSaved?.addEventListener('click', () => toggleSavedList());

    railBtnSaved?.addEventListener('click', () => {
      toggleDrawer(true);
      toggleSavedList(true);
      drawerRowSaved?.scrollIntoView({ behavior: 'smooth' });
    });

    const updatePointsDrawerList = (points: CustomPoint[]) => {
      const countStr = points.length.toString();
      if (railBadgeCount) railBadgeCount.textContent = countStr;
      if (drawerBadgeSaved) drawerBadgeSaved.textContent = `${countStr} saved`;
      if (!pointsListContainer) return;

      if (points.length === 0) {
        pointsListContainer.innerHTML = `<div style="padding: 12px; color: #70757a; font-size: 0.8rem; text-align: center;">No points saved yet. Click "+ Drop 3D Location Pin" to save one!</div>`;
        return;
      }

      pointsListContainer.innerHTML = points.map(p => `
        <div class="point-item" data-id="${p.id}">
          <div class="point-item-info">
            <span class="point-item-icon">📍</span>
            <div class="point-item-text">
              <span class="point-item-name">${p.name}</span>
              <span class="point-item-sub">${p.latitude.toFixed(3)}° N, ${p.longitude.toFixed(3)}° E</span>
            </div>
          </div>
          <button class="point-item-del" data-delete-id="${p.id}" title="Delete">&times;</button>
        </div>
      `).join('');

      pointsListContainer.querySelectorAll<HTMLDivElement>('.point-item').forEach(item => {
        item.addEventListener('click', (e) => {
          if ((e.target as HTMLElement).classList.contains('point-item-del')) return;
          const id = item.getAttribute('data-id');
          if (id) {
            pointsManager.flyToPoint(id);
            const pt = points.find(p => p.id === id);
            if (pt) pointsManager['onPointSelectedCallback']?.(pt);
          }
        });
      });

      pointsListContainer.querySelectorAll<HTMLButtonElement>('.point-item-del').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-delete-id');
          if (id) pointsManager.deletePoint(id);
        });
      });
    };

    pointsManager.onPointsUpdated((pts) => {
      updatePointsDrawerList(pts);
    });
    updatePointsDrawerList(pointsManager.getPoints());

    // =========================================================================
    // 12. KEYBOARD SHORTCUTS & ESCAPE DISMISSAL
    // =========================================================================
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Escape') {
        pointsManager.setAddMode(false);
        closeModal();
        if (pointDetailCard) pointDetailCard.style.display = 'none';
        toggleDrawer(false);

        if (isViewshedPlacementMode) {
          exitViewshed();
        }
        if (viewshedModal) viewshedModal.style.display = 'none';
        if (!viewshedManager.isEnabled()) {
          const vsHudLegend = document.getElementById('viewshedHudLegend');
          if (vsHudLegend) vsHudLegend.style.display = 'none';
        }
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomOut();
      }
    });

    // =========================================================================
    // 13. REAL-TIME SPATIAL TELEMETRY
    // =========================================================================
    const latEl = document.getElementById('telemetryLat');
    const lonEl = document.getElementById('telemetryLon');
    const altEl = document.getElementById('telemetryAlt');
    const headingEl = document.getElementById('telemetryHeading');

    viewer.camera.changed.addEventListener(() => {
      const carto = viewer.camera.positionCartographic;
      if (!carto) return;

      const lat = Cesium.Math.toDegrees(carto.latitude);
      const lon = Cesium.Math.toDegrees(carto.longitude);
      const alt = carto.height;
      const heading = Cesium.Math.toDegrees(viewer.camera.heading);

      if (latEl) latEl.textContent = `${lat.toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
      if (lonEl) lonEl.textContent = `${lon.toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;
      if (altEl) {
        altEl.textContent = alt >= 1000
          ? `${(alt / 1000).toFixed(1)} km`
          : `${Math.round(alt)} m`;
      }
      if (headingEl) {
        const compassHeading = Math.round((heading + 360) % 360);
        headingEl.textContent = `${compassHeading}°`;
      }
    });

    console.log('✅ Kutch 3D Interactive Map initialized with Google Maps Rail & Drawer navigation.');
  } catch (err) {
    console.error('Failed to initialize 3D Map:', err);
  }
}

// Bootstrap once DOM content is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapApp);
} else {
  bootstrapApp();
}
