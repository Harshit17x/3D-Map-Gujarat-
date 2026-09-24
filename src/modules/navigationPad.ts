import * as Cesium from 'cesium';

export type NavMode = 'tilt' | 'pan';

export interface NavigationPadControls {
  setNavMode: (mode: NavMode) => void;
  getNavMode: () => NavMode;
  tiltUp: (continuous?: boolean) => void;
  tiltDown: (continuous?: boolean) => void;
  rotateLeft: (continuous?: boolean) => void;
  rotateRight: (continuous?: boolean) => void;
  pan: (direction: 'up' | 'down' | 'left' | 'right', continuous?: boolean) => void;
  reset3DNorth: () => void;
  set3DOblique: () => void;
  setTopDown: () => void;
}

/**
 * Finds the ground point in the camera viewport for orbit calculations.
 * If looking toward the horizon/sky, it samples downward so the camera stays anchored to the terrain peak.
 */
function getCameraLookTarget(viewer: Cesium.Viewer): { target: Cesium.Cartesian3; range: number } | null {
  const camera = viewer.camera;
  const cx = viewer.container.clientWidth / 2;
  const cy = viewer.container.clientHeight / 2;
  const height = viewer.container.clientHeight;

  // Sample center first, then progressively lower on the screen to catch terrain when looking at peaks
  const testY = [cy, cy + height * 0.15, cy + height * 0.3, cy + height * 0.42];

  for (const y of testY) {
    const pt = new Cesium.Cartesian2(cx, Math.min(y, height - 10));
    const ray = camera.getPickRay(pt);
    if (!ray) continue;

    const target = viewer.scene.globe.pick(ray, viewer.scene) || camera.pickEllipsoid(pt);
    if (target) {
      const range = Cesium.Cartesian3.distance(camera.position, target);
      if (range > 10 && range < 50000000) {
        return { target, range };
      }
    }
  }

  return null;
}

/**
 * Adjusts camera pitch and heading around the screen center target (replicates 3D middle-click orbit).
 */
export function adjustTiltAndHeading(
  viewer: Cesium.Viewer,
  deltaPitchRad: number,
  deltaHeadingRad: number
): void {
  const camera = viewer.camera;

  // In 2D planar mode, pitch is locked to nadir (-90°); allow twist rotation
  if (viewer.scene.mode === Cesium.SceneMode.SCENE2D) {
    if (Math.abs(deltaHeadingRad) > 0.0001) {
      camera.twistRight(-deltaHeadingRad);
    }
    return;
  }

  const currentHeading = camera.heading;
  const currentPitch = camera.pitch;

  // Pitch constraints: -89.5° (nadir straight down) to +2.5° (deep ground level to see peaks against the sky)
  const minPitch = Cesium.Math.toRadians(-89.5);
  const maxPitch = Cesium.Math.toRadians(2.5);
  const newPitch = Cesium.Math.clamp(currentPitch + deltaPitchRad, minPitch, maxPitch);
  const newHeading = Cesium.Math.zeroToTwoPi(currentHeading + deltaHeadingRad);

  const lookData = getCameraLookTarget(viewer);

  if (lookData && lookData.range > 10 && lookData.range < 50000000) {
    camera.lookAt(lookData.target, new Cesium.HeadingPitchRange(newHeading, newPitch, lookData.range));
    camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
  } else {
    camera.setView({
      orientation: {
        heading: newHeading,
        pitch: newPitch,
        roll: 0.0
      }
    });
  }
}

/**
 * Smoothly pans camera across the terrain surface without changing altitude.
 */
export function panCamera(
  viewer: Cesium.Viewer,
  direction: 'up' | 'down' | 'left' | 'right',
  continuous = false
): void {
  const camera = viewer.camera;

  // 2D planar mode panning
  if (viewer.scene.mode === Cesium.SceneMode.SCENE2D) {
    const frustum = camera.frustum as any;
    let dist = 500;
    if (frustum && typeof frustum.right === 'number' && typeof frustum.left === 'number') {
      const w = Math.abs(frustum.right - frustum.left);
      dist = Math.max(w * (continuous ? 0.02 : 0.08), 20);
    }
    switch (direction) {
      case 'up':    camera.moveUp(dist); break;
      case 'down':  camera.moveDown(dist); break;
      case 'left':  camera.moveLeft(dist); break;
      case 'right': camera.moveRight(dist); break;
    }
    return;
  }

  const carto = camera.positionCartographic;
  const height = carto ? carto.height : 2500;

  const factor = continuous ? 0.015 : 0.09;
  const moveDist = Math.max(height * factor, 15);

  const cameraPos = camera.position;
  const up = Cesium.Cartesian3.normalize(cameraPos, new Cesium.Cartesian3());
  const right = Cesium.Cartesian3.clone(camera.right);
  const forward = Cesium.Cartesian3.cross(right, up, new Cesium.Cartesian3());
  Cesium.Cartesian3.normalize(forward, forward);

  switch (direction) {
    case 'up':
      camera.move(forward, moveDist);
      break;
    case 'down':
      camera.move(forward, -moveDist);
      break;
    case 'left':
      camera.move(right, -moveDist);
      break;
    case 'right':
      camera.move(right, moveDist);
      break;
  }
}

/**
 * Attaches mouse down / touch hold continuous action dispatcher.
 */
export function bindHoldAction(element: HTMLElement | null, action: (continuous: boolean) => void): void {
  if (!element) return;

  let timer: number | null = null;
  let interval: number | null = null;

  const start = (e: Event) => {
    e.preventDefault();
    action(false); // First immediate single step

    timer = window.setTimeout(() => {
      interval = window.setInterval(() => {
        action(true); // Continuous animation
      }, 35);
    }, 220);
  };

  const stop = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (interval !== null) {
      clearInterval(interval);
      interval = null;
    }
  };

  element.addEventListener('mousedown', start);
  element.addEventListener('touchstart', start, { passive: false });

  element.addEventListener('mouseup', stop);
  element.addEventListener('mouseleave', stop);
  element.addEventListener('touchend', stop);
  element.addEventListener('touchcancel', stop);
}

/**
 * Initializes the Bottom-Left 3D Navigation D-Pad & View Controller.
 */
export function setupNavigationPad(viewer: Cesium.Viewer): NavigationPadControls {
  let navMode: NavMode = 'tilt';

  const btnUp = document.getElementById('btnDpadUp');
  const btnDown = document.getElementById('btnDpadDown');
  const btnLeft = document.getElementById('btnDpadLeft');
  const btnRight = document.getElementById('btnDpadRight');
  const btnCenter = document.getElementById('btnDpadCenter');

  const btnModeTilt = document.getElementById('btnNavModeTilt');
  const btnModePan = document.getElementById('btnNavModePan');

  const btnQuickTilt3D = document.getElementById('btnQuickTilt3D');
  const btnQuickTopDown = document.getElementById('btnQuickTopDown');

  const updateModeUI = () => {
    if (btnModeTilt) btnModeTilt.classList.toggle('active', navMode === 'tilt');
    if (btnModePan) btnModePan.classList.toggle('active', navMode === 'pan');

    // Update tooltips to match active mode
    if (btnUp) {
      btnUp.title = navMode === 'tilt' ? 'Tilt Up towards horizon' : 'Pan Forward / North';
    }
    if (btnDown) {
      btnDown.title = navMode === 'tilt' ? 'Tilt Down towards ground' : 'Pan Backward / South';
    }
    if (btnLeft) {
      btnLeft.title = navMode === 'tilt' ? 'Rotate Left (heading)' : 'Pan Left / West';
    }
    if (btnRight) {
      btnRight.title = navMode === 'tilt' ? 'Rotate Right (heading)' : 'Pan Right / East';
    }
  };

  const setNavMode = (mode: NavMode) => {
    navMode = mode;
    updateModeUI();
  };

  btnModeTilt?.addEventListener('click', () => setNavMode('tilt'));
  btnModePan?.addEventListener('click', () => setNavMode('pan'));

  const tiltUp = (continuous = false) => {
    const delta = continuous ? Cesium.Math.toRadians(1.0) : Cesium.Math.toRadians(7.0);
    adjustTiltAndHeading(viewer, delta, 0);
  };

  const tiltDown = (continuous = false) => {
    const delta = continuous ? Cesium.Math.toRadians(1.0) : Cesium.Math.toRadians(7.0);
    adjustTiltAndHeading(viewer, -delta, 0);
  };

  const rotateLeft = (continuous = false) => {
    const delta = continuous ? Cesium.Math.toRadians(1.1) : Cesium.Math.toRadians(10.0);
    adjustTiltAndHeading(viewer, 0, -delta);
  };

  const rotateRight = (continuous = false) => {
    const delta = continuous ? Cesium.Math.toRadians(1.1) : Cesium.Math.toRadians(10.0);
    adjustTiltAndHeading(viewer, 0, delta);
  };

  const pan = (direction: 'up' | 'down' | 'left' | 'right', continuous = false) => {
    panCamera(viewer, direction, continuous);
  };

  // Bind D-pad buttons with continuous hold support
  bindHoldAction(btnUp, (continuous) => {
    if (navMode === 'tilt') tiltUp(continuous);
    else pan('up', continuous);
  });

  bindHoldAction(btnDown, (continuous) => {
    if (navMode === 'tilt') tiltDown(continuous);
    else pan('down', continuous);
  });

  bindHoldAction(btnLeft, (continuous) => {
    if (navMode === 'tilt') rotateLeft(continuous);
    else pan('left', continuous);
  });

  bindHoldAction(btnRight, (continuous) => {
    if (navMode === 'tilt') rotateRight(continuous);
    else pan('right', continuous);
  });

  // Center button: Reset to 3D North view
  const reset3DNorth = () => {
    const lookData = getCameraLookTarget(viewer);
    const targetHeading = Cesium.Math.toRadians(0.0); // North
    const targetPitch = Cesium.Math.toRadians(-32.0); // 3D oblique horizon angle

    if (lookData) {
      viewer.camera.flyTo({
        destination: viewer.camera.position,
        orientation: {
          heading: targetHeading,
          pitch: targetPitch,
          roll: 0.0
        },
        duration: 1.0,
        easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT
      });
    } else {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(69.850, 23.830, 2600.0),
        orientation: {
          heading: targetHeading,
          pitch: targetPitch,
          roll: 0.0
        },
        duration: 1.0,
        easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT
      });
    }
  };

  btnCenter?.addEventListener('click', reset3DNorth);

  // Quick 3D Perspective Button
  const set3DOblique = () => {
    if (viewer.scene.mode === Cesium.SceneMode.SCENE2D) {
      viewer.scene.morphTo3D(1.0);
      return;
    }
    const currentHeading = typeof viewer.camera.heading === 'number' && !isNaN(viewer.camera.heading)
      ? viewer.camera.heading
      : 0;
    viewer.camera.flyTo({
      destination: viewer.camera.position,
      orientation: {
        heading: currentHeading,
        pitch: Cesium.Math.toRadians(-32.0),
        roll: 0.0
      },
      duration: 1.0,
      easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT
    });
  };
  btnQuickTilt3D?.addEventListener('click', set3DOblique);

  // Quick Top-Down (Nadir) Button
  const setTopDown = () => {
    const currentHeading = typeof viewer.camera.heading === 'number' && !isNaN(viewer.camera.heading)
      ? viewer.camera.heading
      : 0;
    viewer.camera.flyTo({
      destination: viewer.camera.position,
      orientation: {
        heading: currentHeading,
        pitch: Cesium.Math.toRadians(-89.5),
        roll: 0.0
      },
      duration: 1.0,
      easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT
    });
  };
  btnQuickTopDown?.addEventListener('click', setTopDown);

  // Keyboard navigation support: Arrow keys
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (e.shiftKey || navMode === 'pan') pan('up');
      else tiltUp();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (e.shiftKey || navMode === 'pan') pan('down');
      else tiltDown();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (e.shiftKey || navMode === 'pan') pan('left');
      else rotateLeft();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (e.shiftKey || navMode === 'pan') pan('right');
      else rotateRight();
    }
  });

  updateModeUI();

  return {
    setNavMode,
    getNavMode: () => navMode,
    tiltUp,
    tiltDown,
    rotateLeft,
    rotateRight,
    pan,
    reset3DNorth,
    set3DOblique,
    setTopDown
  };
}
