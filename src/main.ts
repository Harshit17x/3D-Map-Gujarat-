import * as Cesium from 'cesium';
import { initializeCesiumViewer } from './modules/terrain.ts';
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

    (window as any).viewer = viewer;

    // 2. Initialize 3D Custom Points System
    const pointsManager = new CustomPointsManager(viewer);

    // 3. Render HUD Overlay: Direct Features Left Rail (Clean, no drawers or unnecessary text)
    const hudContainer = document.getElementById('appHud');
    if (!hudContainer) return;

    hudContainer.innerHTML = `
      <!-- Pin Placement Prompt Banner -->
      <div class="placement-banner" id="placementBanner" style="display: none;">
        <span class="banner-icon">📍</span>
        <span class="banner-text">Click anywhere on the terrain to drop a 3D pin</span>
        <button class="banner-cancel-btn" id="btnCancelPlacement">Cancel</button>
      </div>

      <!-- Viewshed Placement Prompt Banner -->
      <div class="placement-banner" id="viewshedBanner" style="display: none;">
        <span class="banner-icon">👁️</span>
        <span class="banner-text">Click terrain to place observer for line-of-sight analysis</span>
        <button class="banner-cancel-btn" id="btnCancelViewshed">Cancel</button>
      </div>

      <!-- ====================================================================
           DIRECT FEATURE LEFT RAIL (Every Feature is Right Here!)
           ==================================================================== -->
      <nav class="gmap-rail hud-interactive" id="gmapRail">
        <!-- 1. 3D / 2D Perspective Toggle -->
        <button class="rail-item active" id="railBtn3D" title="Toggle 3D Globe / 2D Map">
          <div class="rail-icon-wrap">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          </div>
          <span class="rail-label" id="railLabel3D">3D</span>
        </button>

        <!-- 2. Multidirectional Hillshade 30m -->
        <button class="rail-item" id="railBtnHillshade" title="Toggle Multidirectional Hillshade 30m">
          <div class="rail-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="3 20 9 4 15 14 19 8 21 20 3 20"/>
            </svg>
            <span class="rail-badge-on" id="badgeHillshade" style="display:none;">ON</span>
          </div>
          <span class="rail-label">Hillshade</span>
        </button>

        <!-- 3. 2m Elevation Contours -->
        <button class="rail-item" id="railBtnContours" title="Toggle 2m Topographic Contour Lines">
          <div class="rail-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12 Q7 6 12 12 Q17 18 21 12"/>
              <path d="M3 7 Q7 3 12 7 Q17 11 21 7" opacity="0.7"/>
              <path d="M3 17 Q7 11 12 17 Q17 23 21 17" opacity="0.7"/>
            </svg>
            <span class="rail-badge-on" id="badgeContours" style="display:none;">ON</span>
          </div>
          <span class="rail-label">Contours</span>
        </button>

        <!-- 4. Line-of-Sight Viewshed Analysis -->
        <button class="rail-item" id="railBtnViewshed" title="Line-of-Sight Viewshed Analysis">
          <div class="rail-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
          <span class="rail-label">Viewshed</span>
        </button>

        <!-- 5. Drop 3D Location Pin -->
        <button class="rail-item" id="railBtnAddPin" title="Drop a 3D Location Pin on the terrain">
          <div class="rail-hero-pill">
            <span>📍</span>
          </div>
          <span class="rail-label">Add Pin</span>
        </button>

        <div class="rail-divider"></div>

        <!-- 6. Solar Sun & Shadows Cycle -->
        <button class="rail-item" id="railBtnLighting" title="Click to cycle Sun lighting (Golden / Sunset / Dawn / Noon)">
          <div class="rail-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            </svg>
          </div>
          <span class="rail-label" id="railLabelSun">Golden</span>
        </button>

        <!-- 7. Floating 3D Navigation Dock Toggle -->
        <button class="rail-item active" id="railBtnNav" title="Toggle On-Screen 3D Navigation Pad">
          <div class="rail-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
            </svg>
          </div>
          <span class="rail-label">Navigation</span>
        </button>

        <div class="rail-spacer"></div>
        <div class="rail-divider"></div>

        <!-- 8. Reset Camera View -->
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
           FLOATING ZOOM CONTROLS (Top-Right Corner)
           ==================================================================== -->
      <div class="hud-zoom-control hud-interactive" id="floatingZoomControl">
        <button class="zoom-ctrl-btn" id="btnZoomIn" title="Zoom In (+)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        <div class="zoom-ctrl-divider"></div>
        <button class="zoom-ctrl-btn" id="btnZoomOut" title="Zoom Out (−)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      <!-- ====================================================================
           FLOATING ON-SCREEN 3D NAVIGATION DOCK (Bottom-Right Corner)
           ==================================================================== -->
      <div class="hud-nav-dock hud-interactive" id="floatingNavDock">
        <div class="dock-header-bar">
          <div class="dock-title-wrap">
            <span class="dock-title">Navigation</span>
          </div>
          <button class="dock-minimize-btn" id="btnDockMinimize" title="Minimize / Expand Navigation">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
        <div class="dock-body" id="dockBody">
          <div class="dpad-cross-container">
            <button class="dpad-btn dpad-up" id="btnDpadUp" title="Tilt Up towards horizon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
            </button>
            <button class="dpad-btn dpad-left" id="btnDpadLeft" title="Rotate Left">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button class="dpad-btn dpad-center" id="btnDpadCenter" title="Click to Reset North (0°) & 3D Tilt">
              <span class="compass-dial" id="compassNeedle">🧭</span>
            </button>
            <button class="dpad-btn dpad-right" id="btnDpadRight" title="Rotate Right">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <button class="dpad-btn dpad-down" id="btnDpadDown" title="Tilt Down towards ground">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Viewshed HUD Legend (Bottom-Right Pill) -->
      <div class="viewshed-hud-legend" id="viewshedHudLegend" style="display: none;" title="Viewshed Legend: Green = Visible, Red = Blocked">
        <span class="vs-legend-title">Viewshed:</span>
        <span class="vs-legend-item"><span class="vs-legend-swatch vs-visible"></span> Visible</span>
        <span class="vs-legend-item"><span class="vs-legend-swatch vs-blocked"></span> Blocked</span>
        <button class="vs-clear-btn" id="btnClearViewshed" title="Clear viewshed">Clear</button>
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

      <!-- Spatial Telemetry Status Bar (GIS Standard at Bottom) -->
      <div class="hud-telemetry-bar hud-interactive" id="telemetryHudBar">
        <div class="telem-item">
          <span class="telem-icon">📍</span>
          <span id="telemetryCoords">23.8450° N, 69.5200° E</span>
        </div>
        <div class="telem-divider"></div>
        <div class="telem-item">
          <span class="telem-icon">⛰️</span>
          <span id="telemetryAlt">2,400 m</span>
        </div>
        <div class="telem-divider"></div>
        <div class="telem-item">
          <span class="telem-icon">🧭</span>
          <span id="telemetryHeading">0° N</span>
        </div>
        <div class="telem-divider"></div>
        <div class="telem-item">
          <span class="telem-icon">🌐</span>
          <span id="telemetryMode">3D Globe</span>
        </div>
      </div>
    `;

    // =========================================================================
    // FEATURE 1: 3D GLOBE / 2D MAP TOGGLE
    // =========================================================================
    const railBtn3D = document.getElementById('railBtn3D');
    const railLabel3D = document.getElementById('railLabel3D');
    let is3DMode = true;

    const toggle3DMode = () => {
      is3DMode = !is3DMode;
      setSceneMode(is3DMode ? '3D' : '2D');
      railBtn3D?.classList.toggle('active', is3DMode);
      if (railLabel3D) railLabel3D.textContent = is3DMode ? '3D' : '2D';
    };

    railBtn3D?.addEventListener('click', toggle3DMode);

    viewer.scene.morphComplete.addEventListener((_transitioner, _prev, currentMode) => {
      is3DMode = (currentMode === Cesium.SceneMode.SCENE3D || currentMode === Cesium.SceneMode.COLUMBUS_VIEW);
      railBtn3D?.classList.toggle('active', is3DMode);
      if (railLabel3D) railLabel3D.textContent = is3DMode ? '3D' : '2D';
      const telemetryMode = document.getElementById('telemetryMode');
      if (telemetryMode) {
        telemetryMode.textContent = currentMode === Cesium.SceneMode.SCENE2D ? '2D Topo' : '3D Globe';
      }
    });

    // =========================================================================
    // FEATURE 2: MULTIDIRECTIONAL HILLSHADE 30M TOGGLE
    // =========================================================================
    const railBtnHillshade = document.getElementById('railBtnHillshade');
    const badgeHillshade = document.getElementById('badgeHillshade');
    let isHillshadeActive = false;

    railBtnHillshade?.addEventListener('click', () => {
      isHillshadeActive = !isHillshadeActive;
      toggleHillshadeLayer(isHillshadeActive);
      railBtnHillshade.classList.toggle('active', isHillshadeActive);
      if (badgeHillshade) badgeHillshade.style.display = isHillshadeActive ? 'inline-block' : 'none';
    });

    // =========================================================================
    // FEATURE 3: 2M TOPOGRAPHIC CONTOUR LINES TOGGLE
    // =========================================================================
    const railBtnContours = document.getElementById('railBtnContours');
    const badgeContours = document.getElementById('badgeContours');
    let isContoursActive = false;

    railBtnContours?.addEventListener('click', () => {
      isContoursActive = !isContoursActive;
      toggleContourLayer(isContoursActive);
      railBtnContours.classList.toggle('active', isContoursActive);
      if (badgeContours) badgeContours.style.display = isContoursActive ? 'inline-block' : 'none';
    });

    // =========================================================================
    // FEATURE 4: LINE-OF-SIGHT VIEWSHED ANALYSIS
    // =========================================================================
    let isViewshedPlacementMode = false;
    const railBtnViewshed   = document.getElementById('railBtnViewshed');
    const viewshedBanner    = document.getElementById('viewshedBanner');
    const btnCancelViewshed = document.getElementById('btnCancelViewshed');
    const vsHudLegend       = document.getElementById('viewshedHudLegend');
    const btnClearViewshed  = document.getElementById('btnClearViewshed');

    const viewshedHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    let vsHandlerBound = false;

    const exitViewshed = () => {
      isViewshedPlacementMode = false;
      viewshedManager.clear();
      if (viewshedBanner) viewshedBanner.style.display = 'none';
      if (vsHudLegend)    vsHudLegend.style.display = 'none';
      railBtnViewshed?.classList.remove('active');
    };

    const enterViewshed = () => {
      isViewshedPlacementMode = true;
      if (viewshedBanner) viewshedBanner.style.display = 'flex';
      railBtnViewshed?.classList.add('active');

      if (!vsHandlerBound) {
        vsHandlerBound = true;
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

          isViewshedPlacementMode = false;
          if (viewshedBanner) viewshedBanner.style.display = 'none';

          await viewshedManager.setObserver(lat, lon);
          await viewshedManager.enable();

          if (vsHudLegend) vsHudLegend.style.display = 'inline-flex';
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
      }
    };

    railBtnViewshed?.addEventListener('click', () => {
      if (viewshedManager.isEnabled() || isViewshedPlacementMode) {
        exitViewshed();
      } else {
        enterViewshed();
      }
    });

    btnCancelViewshed?.addEventListener('click', exitViewshed);
    btnClearViewshed?.addEventListener('click', exitViewshed);

    // =========================================================================
    // FEATURE 5: 3D LOCATION PIN DROPPING
    // =========================================================================
    const railBtnAddPin = document.getElementById('railBtnAddPin');
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

    railBtnAddPin?.addEventListener('click', () => {
      pointsManager.setAddMode(true);
    });

    btnCancelPlacement?.addEventListener('click', () => {
      pointsManager.setAddMode(false);
    });

    pointsManager.onAddModeChanged((isActive) => {
      if (placementBanner) placementBanner.style.display = isActive ? 'flex' : 'none';
      railBtnAddPin?.classList.toggle('active', isActive);
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

    // Point Details Floating Card (when a 3D pin on map is clicked)
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

    // =========================================================================
    // FEATURE 6: SOLAR SUN & LIGHTING CYCLE (1-Click Direct Cycle)
    // =========================================================================
    const solarPresets: Array<{ id: 'golden' | 'sunset' | 'sunrise' | 'noon'; label: string }> = [
      { id: 'golden',  label: 'Golden' },
      { id: 'sunset',  label: 'Sunset' },
      { id: 'sunrise', label: 'Dawn' },
      { id: 'noon',    label: 'Noon' }
    ];
    let solarIndex = 0;
    const railBtnLighting = document.getElementById('railBtnLighting');
    const railLabelSun = document.getElementById('railLabelSun');

    railBtnLighting?.addEventListener('click', () => {
      solarIndex = (solarIndex + 1) % solarPresets.length;
      const current = solarPresets[solarIndex];
      setLightingPreset(current.id);
      if (railLabelSun) railLabelSun.textContent = current.label;
    });

    // =========================================================================
    // FEATURE 7: FLOATING 3D NAVIGATION DOCK TOGGLE
    // =========================================================================
    const floatingNavDock = document.getElementById('floatingNavDock');
    const btnDockMinimize = document.getElementById('btnDockMinimize');
    const railBtnNav = document.getElementById('railBtnNav');

    setupNavigationPad(viewer);

    bindHoldAction(document.getElementById('btnZoomIn'), () => zoomIn());
    bindHoldAction(document.getElementById('btnZoomOut'), () => zoomOut());

    btnDockMinimize?.addEventListener('click', () => {
      floatingNavDock?.classList.toggle('dock-collapsed');
    });

    railBtnNav?.addEventListener('click', () => {
      if (!floatingNavDock) return;
      const isHidden = floatingNavDock.classList.contains('dock-hidden');
      floatingNavDock.classList.toggle('dock-hidden', !isHidden);
      railBtnNav.classList.toggle('active', isHidden);
    });

    // =========================================================================
    // FEATURE 8: RESET CAMERA VIEW
    // =========================================================================
    const resetView = () => {
      flyToStudyArea('default', 2.0);
    };
    document.getElementById('railBtnReset')?.addEventListener('click', resetView);

    // =========================================================================
    // REAL-TIME SPATIAL TELEMETRY & ROTATING COMPASS NEEDLE
    // =========================================================================
    const coordsEl = document.getElementById('telemetryCoords');
    const altEl = document.getElementById('telemetryAlt');
    const headingEl = document.getElementById('telemetryHeading');
    const compassNeedle = document.getElementById('compassNeedle');

    viewer.camera.changed.addEventListener(() => {
      try {
        const carto = viewer.camera.positionCartographic;
        if (!carto || typeof carto.latitude !== 'number' || typeof carto.longitude !== 'number') return;
        if (isNaN(carto.latitude) || isNaN(carto.longitude)) return;

        const lat = Cesium.Math.toDegrees(carto.latitude);
        const lon = Cesium.Math.toDegrees(carto.longitude);
        const alt = typeof carto.height === 'number' && !isNaN(carto.height) ? carto.height : 0;

        const rawHeading = typeof viewer.camera.heading === 'number' && !isNaN(viewer.camera.heading)
          ? viewer.camera.heading
          : 0;
        const heading = Cesium.Math.toDegrees(rawHeading);
        const compassHeading = Math.round((heading + 360) % 360);

        if (coordsEl) {
          coordsEl.textContent = `${lat.toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}, ${lon.toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;
        }
        if (altEl) {
          altEl.textContent = alt >= 1000
            ? `${(alt / 1000).toFixed(1)} km`
            : `${Math.round(alt)} m`;
        }
        if (headingEl) {
          headingEl.textContent = `${compassHeading}° N`;
        }

        if (compassNeedle) {
          compassNeedle.style.transform = `rotate(${-compassHeading}deg)`;
        }
      } catch (err) {
        // Guard against telemetry errors during mode morph transitions
      }
    });

    // Keyboard Shortcuts & Escape
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Escape') {
        pointsManager.setAddMode(false);
        closeModal();
        if (pointDetailCard) pointDetailCard.style.display = 'none';
        if (isViewshedPlacementMode) exitViewshed();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomOut();
      }
    });

    console.log('✅ Kutch 3D Interactive Map ready: Tour removed from sidebar.');
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
