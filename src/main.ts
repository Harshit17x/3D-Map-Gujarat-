import * as Cesium from 'cesium';
import { initializeCesiumViewer } from './modules/terrain.ts';
import { CAMERA_PRESETS } from './config/camera.config.ts';
import { CustomPointsManager, CustomPoint } from './modules/customPoints.ts';
import { setupNavigationPad } from './modules/navigationPad.ts';

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

    // 3. Render HUD Overlay
    const hudContainer = document.getElementById('appHud');
    if (!hudContainer) return;

    hudContainer.innerHTML = `
      <!-- Placement Instruction Banner (Shown when clicking map to drop point) -->
      <div class="placement-banner" id="placementBanner" style="display: none;">
        <div class="banner-pulse"></div>
        <span class="banner-text">Click anywhere on the 3D map to drop your 3D pin</span>
        <button class="banner-cancel-btn" id="btnCancelPlacement">Cancel</button>
      </div>

      <!-- Viewshed Placement Banner (Shown when clicking map to place observer) -->
      <div class="placement-banner" id="viewshedBanner" style="display: none;">
        <div class="banner-pulse" style="background: #22c55e;"></div>
        <span class="banner-text">Click anywhere on the 3D terrain to place the viewshed observer</span>
        <button class="banner-cancel-btn" id="btnCancelViewshed">Cancel</button>
      </div>

      <!-- Header: Title & Info -->
      <header class="hud-header">
        <div class="glass-panel brand-card hud-interactive">
          <div class="brand-badge">
            <span class="pulse-dot"></span>
            White Rann of Kutch
          </div>
          <h1 class="brand-title">3D Interactive Map</h1>
          <p class="brand-subtitle">White Salt Desert (Dhordo) • 23.84°N, 69.52°E</p>
        </div>

        <!-- Controls: Mode Switcher & Actions -->
        <div class="control-deck hud-interactive">
          <!-- 3D / 2.5D / 2D View Switcher -->
          <div class="glass-panel segmented-group" id="viewModeGroup">
            <button class="hud-btn active" data-mode="3D" id="btnMode3D">3D Perspective</button>
            <button class="hud-btn" data-mode="COLUMBUS" id="btnModeColumbus">2.5D Flat Mode</button>
            <button class="hud-btn" data-mode="2D" id="btnMode2D">2D Map</button>
          </div>

          <!-- Quick Action Buttons -->
          <div class="action-row">
            <!-- Add 3D Point Button -->
            <button class="action-btn glass-panel" id="btnAddPoint" title="Click on map to drop an interactive 3D location pin">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                <circle cx="12" cy="9" r="2.5"/>
              </svg>
              <span id="addPointLabel">+ Add 3D Point</span>
            </button>

            <!-- Saved Points List Drawer Button -->
            <button class="action-btn glass-panel" id="btnTogglePointsList" title="View all saved 3D points">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="8" y1="6" x2="21" y2="6"/>
                <line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/>
                <line x1="3" y1="12" x2="3.01" y2="12"/>
                <line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
              <span>Points (<span id="pointsBadgeCount">4</span>)</span>
            </button>


            <!-- Camera Presets -->
            <button class="action-btn glass-panel" id="btnCyclePreset" title="Cycle through camera tour viewpoints">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <span id="presetLabel">View: Horizon</span>
            </button>

            <!-- Lighting Mode Button -->
            <button class="action-btn glass-panel" id="btnCycleLighting" title="Switch sun & lighting condition">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
              </svg>
              <span id="lightingLabel">Golden Hour</span>
            </button>

            <!-- Hillshade Analytical Overlay Toggle -->
            <button class="action-btn glass-panel" id="btnToggleHillshade" title="Toggle multidirectional hillshade analytical overlay">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="3 20 9 4 15 14 19 8 21 20 3 20"></polygon>
              </svg>
              <span>Hillshade</span>
            </button>

            <!-- Contour Lines Toggle -->
            <button class="action-btn glass-panel" id="btnToggleContours" title="Toggle 2m-interval contour lines from Copernicus GLO-30 DTM">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12 Q7 6 12 12 Q17 18 21 12"></path>
                <path d="M3 7 Q7 3 12 7 Q17 11 21 7" opacity="0.5"></path>
                <path d="M3 17 Q7 13 12 17 Q17 21 21 17" opacity="0.5"></path>
              </svg>
              <span>Contours</span>
            </button>

            <!-- Viewshed Analysis Toggle -->
            <button class="action-btn glass-panel" id="btnToggleViewshed" title="Viewshed Analysis: click terrain to place observer, see green=visible / red=occluded">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
                <line x1="12" y1="3" x2="12" y2="1" stroke-width="1.5" opacity="0.7"/>
                <line x1="20.5" y1="7.5" x2="22" y2="6" stroke-width="1.5" opacity="0.7"/>
                <line x1="20.5" y1="16.5" x2="22" y2="18" stroke-width="1.5" opacity="0.7"/>
              </svg>
              <span id="viewshedLabel">Viewshed</span>
            </button>

            <!-- Viewshed HUD Legend -->
            <div class="viewshed-hud-legend" id="viewshedHudLegend" style="display: none;" title="Viewshed Legend: Green = Visible, Red = Blocked">
              <span class="vs-legend-title">Viewshed:</span>
              <span class="vs-legend-item"><span class="vs-legend-swatch vs-visible"></span> Visible</span>
              <span class="vs-legend-item"><span class="vs-legend-swatch vs-blocked"></span> Blocked</span>
            </div>

            <!-- Reset to Dhordo Study Area -->
            <button class="action-btn glass-panel" id="btnResetView" title="Re-center camera on the White Desert">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
              Reset
            </button>
          </div>
        </div>
      </header>

      <!-- Floating Right-Hand Navigation Controls (Zoom In/Out) -->
      <aside class="hud-nav-dock hud-interactive">
        <div class="glass-panel nav-control-stack">
          <button class="nav-icon-btn" id="btnZoomIn" title="Zoom In (+)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <div class="nav-btn-divider"></div>
          <button class="nav-icon-btn" id="btnZoomOut" title="Zoom Out (−)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
      </aside>

      <!-- Saved Points Drawer (Hidden by default) -->
      <div class="glass-panel points-drawer hud-interactive" id="pointsDrawer" style="display: none;">
        <div class="drawer-header">
          <span class="drawer-title">📍 Saved 3D Points</span>
          <button class="modal-close-btn" id="btnCloseDrawer">&times;</button>
        </div>
        <div class="points-list" id="pointsListContainer"></div>
      </div>

      <!-- Point Details Floating Card (Shown when a 3D pin is clicked) -->
      <div class="glass-panel point-detail-card hud-interactive" id="pointDetailCard" style="display: none;">
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
        <div class="glass-panel modal-dialog" id="pointModal">
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

      <!-- Footer: Bottom-Left 3D Navigation Controls, Telemetry & Tips -->
      <footer class="hud-footer">
        <div class="hud-bottom-left hud-interactive">
          <!-- 3D Directional View Controller (Replaces middle-click scroll drag) -->
          <div class="glass-panel nav-dpad-card" id="navDpadCard">
            <div class="dpad-card-header">
              <div class="dpad-title-wrap">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5">
                  <circle cx="12" cy="12" r="10"/>
                  <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
                </svg>
                <span class="dpad-title">3D View Control</span>
              </div>
              <div class="dpad-mode-toggle" id="dpadModeToggle">
                <button class="dpad-mode-btn active" id="btnNavModeTilt" title="Tilt pitch up/down & rotate 360°">3D Tilt</button>
                <button class="dpad-mode-btn" id="btnNavModePan" title="Pan map forward, backward, left, right">Pan</button>
              </div>
            </div>

            <div class="dpad-body">
              <div class="dpad-cross-container">
                <!-- UP -->
                <button class="dpad-btn dpad-up" id="btnDpadUp" title="Tilt Up towards horizon / Pan forward">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="18 15 12 9 6 15"/>
                  </svg>
                </button>

                <!-- LEFT -->
                <button class="dpad-btn dpad-left" id="btnDpadLeft" title="Rotate Left / Pan left">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </button>

                <!-- CENTER (Reset North & 3D Tilt) -->
                <button class="dpad-btn dpad-center" id="btnDpadCenter" title="Click to reset North (0°) & 3D perspective">
                  <span class="dpad-compass-icon">🧭</span>
                </button>

                <!-- RIGHT -->
                <button class="dpad-btn dpad-right" id="btnDpadRight" title="Rotate Right / Pan right">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>

                <!-- DOWN -->
                <button class="dpad-btn dpad-down" id="btnDpadDown" title="Tilt Down towards ground / Pan backward">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
              </div>

              <!-- Quick Angles -->
              <div class="dpad-quick-actions">
                <button class="dpad-pill-btn" id="btnQuickTilt3D" title="Tilt into 3D oblique horizon view (-32°)">
                  <span>📐 3D View</span>
                </button>
                <button class="dpad-pill-btn" id="btnQuickTopDown" title="Look straight down (90° Top-Down view)">
                  <span>🗺️ Top Down</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Spatial Telemetry Readout -->
          <div class="glass-panel telemetry-card hud-interactive">
            <div class="stat-item">
              <span class="stat-label">Latitude</span>
              <span class="stat-value" id="telemetryLat">23.8450° N</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-label">Longitude</span>
              <span class="stat-value" id="telemetryLon">69.5200° E</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-label">Altitude</span>
              <span class="stat-value" id="telemetryAlt">2,400 m</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-label">Heading</span>
              <span class="stat-value" id="telemetryHeading">0° N</span>
            </div>
          </div>
        </div>

        <!-- Navigation Shortcut Hints -->
        <div class="glass-panel hint-pill">
          <span><span class="key-badge">D-Pad / Arrows</span> 3D Tilt & Turn</span>
          <span><span class="key-badge">Scroll / + -</span> Zoom</span>
          <span><span class="key-badge">Click Pin</span> Info</span>
        </div>
      </footer>

      <!-- Viewshed Observer Height Modal -->
      <div class="modal-overlay" id="viewshedModalOverlay" style="display: none;">
        <div class="glass-panel modal-dialog" id="viewshedModal">
          <div class="modal-header">
            <h3 class="modal-title">
              <span>&#x1F441;</span> Viewshed Analysis
            </h3>
            <button class="modal-close-btn" id="btnCloseViewshedModal">&times;</button>
          </div>

          <p style="color:#94a3b8; font-size:0.8rem; margin:0 0 1rem 0; line-height:1.5;">
            Observer placed. Computing line-of-sight analysis&hellip;<br/>
            <strong style="color:#22c55e;">Green</strong> = visible terrain &nbsp;&bull;&nbsp;
            <strong style="color:#ef4444;">Red</strong> = occluded terrain
          </p>

          <div class="form-field">
            <label class="form-label">Observer Height Above Ground</label>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <input type="range" id="viewshedHeightSlider" min="1" max="30" step="0.5" value="1.8"
                style="flex:1; accent-color:#22c55e;" />
              <span id="viewshedHeightValue" style="color:#f8fafc; font-size:0.85rem; min-width:3rem;">1.8 m</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-top:0.35rem;">
              <button type="button" class="chip-btn" id="vsPresetPerson" style="font-size:0.7rem;">Person (1.8m)</button>
              <button type="button" class="chip-btn" id="vsPresetTower" style="font-size:0.7rem;">Tower (10m)</button>
              <button type="button" class="chip-btn" id="vsPresetMast" style="font-size:0.7rem;">Mast (25m)</button>
            </div>
          </div>

          <div class="modal-actions" style="margin-top:0.75rem;">
            <button type="button" class="btn-secondary" id="btnClearViewshed">Clear Analysis</button>
            <button type="button" class="btn-primary" id="btnRecomputeViewshed" style="background:rgba(34,197,94,0.2); border-color:rgba(34,197,94,0.5); color:#22c55e;">Recompute</button>
          </div>
        </div>
      </div>
    `;

    // 4. Bind View Mode Buttons (3D / Columbus / 2D)
    const modeButtons = document.querySelectorAll<HTMLButtonElement>('#viewModeGroup button');
    modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.getAttribute('data-mode') as '3D' | 'COLUMBUS' | '2D';
        setSceneMode(mode);
      });
    });

    // 5. Bind Camera Tour Presets
    let currentPresetIndex = 0;
    const btnCyclePreset = document.getElementById('btnCyclePreset');
    const presetLabel = document.getElementById('presetLabel');

    btnCyclePreset?.addEventListener('click', () => {
      currentPresetIndex = (currentPresetIndex + 1) % CAMERA_PRESETS.length;
      const nextPreset = CAMERA_PRESETS[currentPresetIndex];
      if (presetLabel) presetLabel.textContent = `View: ${nextPreset.label.split(' ')[0]}`;
      flyToStudyArea(nextPreset.id);
    });

    // 6. Bind Solar Lighting Presets
    const lightingModes: Array<'golden' | 'noon' | 'sunset'> = ['golden', 'noon', 'sunset'];
    const lightingLabels = ['Golden Hour', 'High Noon', 'Sunset'];
    let currentLightingIndex = 0;
    const btnCycleLighting = document.getElementById('btnCycleLighting');
    const lightingLabel = document.getElementById('lightingLabel');

    btnCycleLighting?.addEventListener('click', () => {
      currentLightingIndex = (currentLightingIndex + 1) % lightingModes.length;
      const nextMode = lightingModes[currentLightingIndex];
      if (lightingLabel) lightingLabel.textContent = lightingLabels[currentLightingIndex];
      setLightingPreset(nextMode);
    });

    // 7. Initialize Bottom-Left 3D Navigation D-Pad & View Controller
    setupNavigationPad(viewer);

    // 8. Bind Reset View Button
    const btnResetView = document.getElementById('btnResetView');
    btnResetView?.addEventListener('click', () => {
      currentPresetIndex = 0;
      if (presetLabel) presetLabel.textContent = 'View: Tour';
      flyToStudyArea('default');
    });

    // 7. Bind Hillshade Overlay Toggle
    let isHillshadeOn = false;
    const btnToggleHillshade = document.getElementById('btnToggleHillshade');
    btnToggleHillshade?.addEventListener('click', () => {
      isHillshadeOn = !isHillshadeOn;
      toggleHillshadeLayer(isHillshadeOn);
      btnToggleHillshade.classList.toggle('active', isHillshadeOn);
    });

    // 8. Bind Contour Lines Toggle
    let isContourOn = false;
    const btnToggleContours = document.getElementById('btnToggleContours');
    btnToggleContours?.addEventListener('click', () => {
      isContourOn = !isContourOn;
      toggleContourLayer(isContourOn);
      btnToggleContours.classList.toggle('active', isContourOn);
    });

    // ── Viewshed Analysis ────────────────────────────────────────────────────
    //
    // Interaction flow (mirrors btnAddPoint pattern):
    //   1. First click on btnToggleViewshed → enter placement mode (show banner).
    //   2. User clicks terrain → setObserver(lat,lon) + enable() → computation.
    //   3. Viewshed modal opens so user can adjust observer height / recompute.
    //   4. Second click on btnToggleViewshed (while active) → disable + clear.
    //
    let isViewshedPlacementMode = false;
    const btnToggleViewshed  = document.getElementById('btnToggleViewshed');
    const viewshedBanner     = document.getElementById('viewshedBanner');
    const btnCancelViewshed  = document.getElementById('btnCancelViewshed');
    const viewshedLabel      = document.getElementById('viewshedLabel');
    const viewshedModal      = document.getElementById('viewshedModalOverlay');
    const btnCloseVsModal    = document.getElementById('btnCloseViewshedModal');
    const btnClearViewshed   = document.getElementById('btnClearViewshed');
    const btnRecompute       = document.getElementById('btnRecomputeViewshed');
    const vsHeightSlider     = document.getElementById('viewshedHeightSlider') as HTMLInputElement;
    const vsHeightValue      = document.getElementById('viewshedHeightValue');

    // A dedicated ScreenSpaceEventHandler for viewshed observer placement
    const viewshedHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    let vsHandlerActive = false;

    const enterViewshedPlacement = () => {
      isViewshedPlacementMode = true;
      if (viewshedBanner) viewshedBanner.style.display = 'flex';
      if (btnToggleViewshed) btnToggleViewshed.classList.add('active-mode');

      if (!vsHandlerActive) {
        vsHandlerActive = true;
        viewshedHandler.setInputAction(async (click: { position: Cesium.Cartesian2 }) => {
          if (!isViewshedPlacementMode) return;

          // Ray-pick against terrain globe
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
          if (btnToggleViewshed) btnToggleViewshed.classList.remove('active-mode');
          if (btnToggleViewshed) btnToggleViewshed.classList.add('active');
          if (viewshedLabel) viewshedLabel.textContent = 'Computing…';

          // Run the analysis
          await viewshedManager.setObserver(lat, lon);
          await viewshedManager.enable();

          if (viewshedLabel) viewshedLabel.textContent = 'Viewshed On';
          if (viewshedModal) viewshedModal.style.display = 'flex';
          const vsHudLegend = document.getElementById('viewshedHudLegend');
          if (vsHudLegend) vsHudLegend.style.display = 'inline-flex';
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
      }
    };

    const exitViewshed = () => {
      isViewshedPlacementMode = false;
      viewshedManager.clear();
      if (viewshedBanner)    viewshedBanner.style.display = 'none';
      if (viewshedModal)     viewshedModal.style.display  = 'none';
      const vsHudLegend = document.getElementById('viewshedHudLegend');
      if (vsHudLegend)       vsHudLegend.style.display    = 'none';
      if (btnToggleViewshed) btnToggleViewshed.classList.remove('active', 'active-mode');
      if (viewshedLabel)     viewshedLabel.textContent = 'Viewshed';
    };

    btnToggleViewshed?.addEventListener('click', () => {
      if (viewshedManager.isEnabled()) {
        exitViewshed();
      } else if (isViewshedPlacementMode) {
        // Cancel mid-placement
        isViewshedPlacementMode = false;
        if (viewshedBanner) viewshedBanner.style.display = 'none';
        btnToggleViewshed.classList.remove('active-mode');
      } else {
        enterViewshedPlacement();
      }
    });

    btnCancelViewshed?.addEventListener('click', () => {
      isViewshedPlacementMode = false;
      if (viewshedBanner) viewshedBanner.style.display = 'none';
      btnToggleViewshed?.classList.remove('active-mode');
    });

    btnCloseVsModal?.addEventListener('click', () => {
      if (viewshedModal) viewshedModal.style.display = 'none';
    });

    btnClearViewshed?.addEventListener('click', () => {
      exitViewshed();
    });

    btnRecompute?.addEventListener('click', async () => {
      if (viewshedLabel) viewshedLabel.textContent = 'Computing…';
      await viewshedManager.enable();
      if (viewshedLabel) viewshedLabel.textContent = 'Viewshed On';
    });

    // Observer height slider
    vsHeightSlider?.addEventListener('input', () => {
      const h = parseFloat(vsHeightSlider.value);
      if (vsHeightValue) vsHeightValue.textContent = `${h.toFixed(1)} m`;
    });
    vsHeightSlider?.addEventListener('change', async () => {
      const h = parseFloat(vsHeightSlider.value);
      if (viewshedLabel) viewshedLabel.textContent = 'Computing…';
      await viewshedManager.updateObserverHeight(h);
      if (viewshedLabel) viewshedLabel.textContent = 'Viewshed On';
    });

    // Height preset buttons
    const setVsHeight = async (h: number) => {
      if (vsHeightSlider) vsHeightSlider.value = h.toString();
      if (vsHeightValue)  vsHeightValue.textContent = `${h.toFixed(1)} m`;
      if (viewshedLabel)  viewshedLabel.textContent = 'Computing…';
      await viewshedManager.updateObserverHeight(h);
      if (viewshedLabel)  viewshedLabel.textContent = 'Viewshed On';
    };
    document.getElementById('vsPresetPerson')?.addEventListener('click', () => setVsHeight(1.8));
    document.getElementById('vsPresetTower')?.addEventListener('click',  () => setVsHeight(10));
    document.getElementById('vsPresetMast')?.addEventListener('click',   () => setVsHeight(25));

    // Escape key cancels viewshed placement mode too
    // (inserted into the existing keydown handler below by extending it)

    // 9. Bind Zoom In / Out Controls
    const btnZoomIn = document.getElementById('btnZoomIn');
    const btnZoomOut = document.getElementById('btnZoomOut');

    btnZoomIn?.addEventListener('click', () => zoomIn());
    btnZoomOut?.addEventListener('click', () => zoomOut());

    // 10. Bind 3D Custom Points Interaction
    const btnAddPoint = document.getElementById('btnAddPoint');
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

    // Toggle Add Point mode
    btnAddPoint?.addEventListener('click', () => {
      pointsManager.setAddMode(true);
    });

    btnCancelPlacement?.addEventListener('click', () => {
      pointsManager.setAddMode(false);
    });

    // Update banner & button state when mode changes
    pointsManager.onAddModeChanged((isActive) => {
      if (placementBanner) placementBanner.style.display = isActive ? 'flex' : 'none';
      if (btnAddPoint) btnAddPoint.classList.toggle('active-mode', isActive);
    });

    // Open Modal when user clicks map in Add Mode
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

    // Save Point handler
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

    // Point Details Card UI
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
        cardCategoryBadge.style.background = `rgba(56, 189, 248, 0.15)`;
        cardCategoryBadge.style.color = '#38bdf8';
      }

      if (pointDetailCard) pointDetailCard.style.display = 'flex';
    });

    // Saved Points Drawer UI
    const pointsDrawer = document.getElementById('pointsDrawer');
    const btnTogglePointsList = document.getElementById('btnTogglePointsList');
    const btnCloseDrawer = document.getElementById('btnCloseDrawer');
    const pointsListContainer = document.getElementById('pointsListContainer');
    const pointsBadgeCount = document.getElementById('pointsBadgeCount');

    btnTogglePointsList?.addEventListener('click', () => {
      if (pointsDrawer) {
        const isHidden = pointsDrawer.style.display === 'none';
        pointsDrawer.style.display = isHidden ? 'flex' : 'none';
      }
    });

    btnCloseDrawer?.addEventListener('click', () => {
      if (pointsDrawer) pointsDrawer.style.display = 'none';
    });

    const updatePointsDrawerList = (points: CustomPoint[]) => {
      if (pointsBadgeCount) pointsBadgeCount.textContent = points.length.toString();
      if (!pointsListContainer) return;

      if (points.length === 0) {
        pointsListContainer.innerHTML = `<div style="padding: 1rem; color: #64748b; font-size: 0.8rem; text-align: center;">No points saved yet. Click "+ Add 3D Point" to drop one!</div>`;
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

      // Bind click on items to fly
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

      // Bind delete button
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

    // Populate initial points list
    updatePointsDrawerList(pointsManager.getPoints());

    // 11. Keyboard Shortcuts (+ / -, Esc)
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Escape') {
        pointsManager.setAddMode(false);
        closeModal();
        if (pointDetailCard) pointDetailCard.style.display = 'none';
        if (pointsDrawer) pointsDrawer.style.display = 'none';
        // Cancel viewshed placement / close viewshed modal
        if (isViewshedPlacementMode) {
          isViewshedPlacementMode = false;
          const _vsb = document.getElementById('viewshedBanner');
          if (_vsb) _vsb.style.display = 'none';
          btnToggleViewshed?.classList.remove('active-mode');
        }
        const _vsm = document.getElementById('viewshedModalOverlay');
        if (_vsm) _vsm.style.display = 'none';
        if (!viewshedManager.isEnabled()) {
          const _vsl = document.getElementById('viewshedHudLegend');
          if (_vsl) _vsl.style.display = 'none';
        }
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomOut();
      }
    });

    // 12. Real-Time Telemetry Listener
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

    console.log('✅ Kutch 3D Interactive Map initialized with 3D Custom Points support.');
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
