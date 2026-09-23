import * as Cesium from 'cesium';
import { initializeCesiumViewer } from './modules/terrain.ts';
import { CAMERA_PRESETS } from './config/camera.config.ts';

async function bootstrapApp() {
  try {
    // 1. Initialize Cesium 3D Globe with White Rann Study Area
    const { viewer, flyToStudyArea, setSceneMode, setLightingPreset, toggleHillshadeLayer, toggleContourLayer } =
      await initializeCesiumViewer('cesiumContainer');

    // 2. Render HUD Overlay
    const hudContainer = document.getElementById('appHud');
    if (!hudContainer) return;

    hudContainer.innerHTML = `
      <!-- Header: Title & Info -->
      <header class="hud-header">
        <div class="glass-panel brand-card hud-interactive">
          <div class="brand-badge">
            <span class="pulse-dot"></span>
            White Rann of Kutch
          </div>
          <h1 class="brand-title">3D Interactive Map</h1>
          <p class="brand-subtitle">20 km² High-Res Study Area • Gujarat, India</p>
        </div>

        <!-- Controls: Mode Switcher & Presets -->
        <div class="control-deck hud-interactive">
          <!-- 3D / 2.5D / 2D View Switcher -->
          <div class="glass-panel segmented-group" id="viewModeGroup">
            <button class="hud-btn active" data-mode="3D" id="btnMode3D">3D Perspective</button>
            <button class="hud-btn" data-mode="COLUMBUS" id="btnModeColumbus">2.5D Flat Mode</button>
            <button class="hud-btn" data-mode="2D" id="btnMode2D">2D Map</button>
          </div>

          <!-- Quick Action Buttons -->
          <div class="action-row">
            <!-- Camera Presets Dropdown/Toggle -->
            <button class="action-btn glass-panel" id="btnCyclePreset" title="Cycle through camera tour viewpoints">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
              <span id="presetLabel">View: Oblique</span>
            </button>

            <!-- Lighting Mode Button -->
            <button class="action-btn glass-panel" id="btnCycleLighting" title="Switch sun & lighting condition">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
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

            <!-- Reset to Dhordo Study Area -->
            <button class="action-btn glass-panel" id="btnResetView" title="Re-center camera on the 20 km² study area">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <path d="M3 3v5h5"></path>
              </svg>
              Reset
            </button>
          </div>
        </div>
      </header>

      <!-- Footer: Telemetry & Navigation Tips -->
      <footer class="hud-footer">
        <!-- Spatial Telemetry Readout -->
        <div class="glass-panel telemetry-card hud-interactive">
          <div class="stat-item">
            <span class="stat-label">Latitude</span>
            <span class="stat-value" id="telemetryLat">23.8700° N</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-label">Longitude</span>
            <span class="stat-value" id="telemetryLon">69.8500° E</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-label">Altitude</span>
            <span class="stat-value" id="telemetryAlt">2,600 m</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-label">Heading</span>
            <span class="stat-value" id="telemetryHeading">0° N</span>
          </div>
        </div>

        <!-- Navigation Shortcut Hints -->
        <div class="glass-panel hint-pill">
          <span><span class="key-badge">Left Click + Drag</span> Rotate</span>
          <span><span class="key-badge">Right Click / Scroll</span> Zoom</span>
          <span><span class="key-badge">Middle Drag</span> Tilt</span>
        </div>
      </footer>
    `;

    // 3. Bind View Mode Buttons (3D / Columbus / 2D)
    const modeButtons = document.querySelectorAll<HTMLButtonElement>('#viewModeGroup button');
    modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.getAttribute('data-mode') as '3D' | 'COLUMBUS' | '2D';
        setSceneMode(mode);
      });
    });

    // 4. Bind Camera Preset Viewpoints
    let currentPresetIndex = 0;
    const btnCyclePreset = document.getElementById('btnCyclePreset');
    const presetLabel = document.getElementById('presetLabel');

    btnCyclePreset?.addEventListener('click', () => {
      currentPresetIndex = (currentPresetIndex + 1) % CAMERA_PRESETS.length;
      const nextPreset = CAMERA_PRESETS[currentPresetIndex];
      if (presetLabel) presetLabel.textContent = `View: ${nextPreset.label.split(' ')[0]}`;
      flyToStudyArea(nextPreset.id);
    });

    // 5. Bind Solar Lighting Presets
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

    // 6. Bind Reset View Button
    const btnResetView = document.getElementById('btnResetView');
    btnResetView?.addEventListener('click', () => {
      currentPresetIndex = 0;
      if (presetLabel) presetLabel.textContent = 'View: Oblique';
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

    // 9. Real-Time Telemetry Listener
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

    console.log('✅ Kutch 3D Interactive Map (Phase 1) successfully initialized.');
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
