function clampDegrees(value) {
  if (!Number.isFinite(value)) return 0;
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function getScreenOrientationAngle() {
  const angle = globalThis?.screen?.orientation?.angle;
  if (Number.isFinite(angle)) return angle;
  // iOS Safari (deprecated but still common)
  const legacy = globalThis?.orientation;
  return Number.isFinite(legacy) ? legacy : 0;
}

function getHeadingDegreesFromEvent(event) {
  // iOS Safari (when enabled) provides a real compass heading.
  if (typeof event?.webkitCompassHeading === 'number' && Number.isFinite(event.webkitCompassHeading)) {
    return clampDegrees(event.webkitCompassHeading);
  }

  // Generic DeviceOrientationEvent: alpha may be relative or absolute depending on browser/device.
  if (typeof event?.alpha !== 'number' || !Number.isFinite(event.alpha)) {
    return null;
  }

  // Common best-effort formula used across mobile browsers:
  // https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/alpha
  const screenAngle = getScreenOrientationAngle();
  const heading = 360 - event.alpha - screenAngle;
  return clampDegrees(heading);
}

function isProbablySecureContext() {
  if (typeof globalThis?.isSecureContext === 'boolean') return globalThis.isSecureContext;
  try {
    const { protocol, hostname } = globalThis.location || {};
    return protocol === 'https:' || hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

export function createCompassControl({ map } = {}) {
  if (!map || typeof L === 'undefined') {
    return null;
  }

  let needleEl = null;
  let buttonEl = null;
  let containerEl = null;
  let rafId = null;
  let mapOriginRafId = null;
  let pendingRotation = 0;
  let isListening = false;
  let isCompassEnabled = false; // Toggle state (controls map rotation)
  let lastHeading = null;
  let mapRotationUnwrappedDeg = 0;

  const rotatablePaneNames = [
    'tilePane',
    'overlayPane',
    'shadowPane',
    'markerPane',
    'tooltipPane',
    'popupPane'
  ];

  function setNeedleRotation(rotationDegrees) {
    if (!needleEl) return;
    const deg = clampDegrees(rotationDegrees);
    // Rotate around the center of the 24x24 viewBox (12,12)
    needleEl.setAttribute('transform', `rotate(${deg} 12 12)`);
  }

  function scheduleNeedleRotation(rotationDegrees) {
    pendingRotation = rotationDegrees;
    if (rafId) return;
    rafId = globalThis.requestAnimationFrame(() => {
      rafId = null;
      setNeedleRotation(pendingRotation);
    });
  }

  function applyMapRotation(rotationDeg, { animate = true } = {}) {
    const normalized = clampDegrees(rotationDeg);
    const currentNormalized = clampDegrees(mapRotationUnwrappedDeg);
    const delta = ((normalized - currentNormalized + 540) % 360) - 180;
    mapRotationUnwrappedDeg += delta;

    const size = map.getSize?.();
    const mapPane = map.getPane?.('mapPane');
    const mapPanePos = mapPane ? L.DomUtil.getPosition(mapPane) : null;
    const originX = (size?.x ?? 0) / 2 - (mapPanePos?.x ?? 0);
    const originY = (size?.y ?? 0) / 2 - (mapPanePos?.y ?? 0);
    const origin = `${originX}px ${originY}px`;

    for (const paneName of rotatablePaneNames) {
      const pane = map.getPane(paneName);
      if (!pane) continue;

      // Rotate around the *viewport center*, not the pane's bounding box.
      // We account for Leaflet's current pan transform (mapPane position).
      pane.style.transformOrigin = origin;
      pane.style.willChange = 'transform';
      pane.style.transition = animate ? 'transform 140ms linear' : '';
      pane.style.transform = `rotate(${mapRotationUnwrappedDeg}deg)`;
    }
  }

  function resetMapRotation({ animate = true } = {}) {
    applyMapRotation(0, { animate });
  }

  function handleMapViewChangeForRotationOrigin() {
    if (!isCompassEnabled) return;
    if (mapOriginRafId) return;
    mapOriginRafId = globalThis.requestAnimationFrame(() => {
      mapOriginRafId = null;
      applyMapRotation(clampDegrees(mapRotationUnwrappedDeg), { animate: false });
    });
  }

  function syncToggleUI() {
    if (!buttonEl) return;
    buttonEl.classList.toggle('is-active', isCompassEnabled);
    buttonEl.setAttribute('aria-pressed', isCompassEnabled ? 'true' : 'false');
  }

  function handleOrientation(event) {
    const rawHeading = getHeadingDegreesFromEvent(event);
    if (rawHeading == null) return;
    lastHeading = rawHeading;

    // Rotate the needle opposite the device heading so it points towards north.
    // Example: facing west (heading=270) => north is to the right => rotation=90.
    const rotation = clampDegrees(360 - rawHeading);
    scheduleNeedleRotation(rotation);

    if (buttonEl) {
      buttonEl.dataset.compassState = 'receiving';
    }

    // When toggled on: rotate the map so its north points towards magnetic north.
    // (We assume magnetic and geographic north are identical for now.)
    if (isCompassEnabled) {
      applyMapRotation(rotation, { animate: true });
    }
  }

  function startListening() {
    if (isListening) return;
    isListening = true;

    // Reset to north until we get data.
    setNeedleRotation(0);
    if (buttonEl) {
      buttonEl.dataset.compassState = 'listening';
    }

    globalThis.addEventListener('deviceorientationabsolute', handleOrientation, true);
    globalThis.addEventListener('deviceorientation', handleOrientation, true);
  }

  function stopListening() {
    if (!isListening) return;
    isListening = false;
    globalThis.removeEventListener('deviceorientationabsolute', handleOrientation, true);
    globalThis.removeEventListener('deviceorientation', handleOrientation, true);
    if (buttonEl) buttonEl.dataset.compassState = 'stopped';
  }

  async function requestPermissionIfNeeded() {
    // iOS requires a user gesture + explicit permission request.
    const ctor = globalThis.DeviceOrientationEvent;
    if (ctor && typeof ctor.requestPermission === 'function') {
      const result = await ctor.requestPermission();
      return result === 'granted';
    }
    return true;
  }

  async function handleClick() {
    if (!isProbablySecureContext()) {
      if (buttonEl) buttonEl.dataset.compassState = 'insecure';
      return;
    }

    try {
      // Toggle is always allowed. Listening (permission) is handled separately.
      isCompassEnabled = !isCompassEnabled;
      syncToggleUI();

      if (!isCompassEnabled) {
        // Toggled off => reset to north-up.
        resetMapRotation({ animate: true });
      } else if (lastHeading != null) {
        // Toggled on => immediately apply last known rotation.
        applyMapRotation(clampDegrees(360 - lastHeading), { animate: true });
      }

      // Important: once sensor permission is granted, we keep listening even if toggled off
      // so the compass needle continues spinning.
      if (isListening) return;

      const granted = await requestPermissionIfNeeded();
      if (!granted) {
        if (buttonEl) buttonEl.dataset.compassState = 'denied';
        return;
      }
      startListening();
    } catch (error) {
      console.warn('Compass permission/listening failed:', error);
      if (buttonEl) buttonEl.dataset.compassState = 'error';
    }
  }

  const CompassLeafletControl = L.Control.extend({
    options: { position: 'bottomright' },
    onAdd() {
      containerEl = L.DomUtil.create('div', 'compass-control leaflet-control');
      buttonEl = L.DomUtil.create('button', 'map-control-button compass-control__button', containerEl);
      buttonEl.type = 'button';
      buttonEl.setAttribute('aria-label', 'Kompass');
      buttonEl.setAttribute('aria-pressed', 'false');
      buttonEl.dataset.compassState = 'idle';

      // Keep the control from interfering with map gestures.
      L.DomEvent.disableClickPropagation(containerEl);
      L.DomEvent.disableScrollPropagation(containerEl);

      buttonEl.innerHTML = `
        <svg class="compass-control__icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="10.25" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.7"/>
          <g data-compass-needle>
            <path d="M12 4.6l2.8 7.4-2.8-1.2-2.8 1.2z" fill="#e53935"/>
            <path d="M12 19.4l-2.8-7.4 2.8 1.2 2.8-1.2z" fill="#1e88e5"/>
            <circle cx="12" cy="12" r="1.2" fill="currentColor" opacity="0.9"/>
          </g>
        </svg>
      `;

      needleEl = buttonEl.querySelector('[data-compass-needle]');
      setNeedleRotation(0);
      syncToggleUI();

      buttonEl.addEventListener('click', handleClick);

      // Best-effort: start immediately on browsers that don't require a user gesture.
      // iOS Safari requires a user gesture + explicit permission, so we wait for a tap.
      const needsPermissionTap =
        !!globalThis.DeviceOrientationEvent &&
        typeof globalThis.DeviceOrientationEvent.requestPermission === 'function';

      if (isProbablySecureContext() && !needsPermissionTap) {
        startListening();
      } else {
        buttonEl.dataset.compassState = isProbablySecureContext() ? 'needs-permission' : 'insecure';
      }

      // Keep rotation pivot correct while panning/zooming/resizing.
      // This doesn't change the rotation angle; it only updates the transform-origin.
      map.on('move', handleMapViewChangeForRotationOrigin);
      map.on('zoom', handleMapViewChangeForRotationOrigin);
      map.on('resize', handleMapViewChangeForRotationOrigin);

      return containerEl;
    },
    onRemove() {
      stopListening();
      resetMapRotation({ animate: false });
      map.off('move', handleMapViewChangeForRotationOrigin);
      map.off('zoom', handleMapViewChangeForRotationOrigin);
      map.off('resize', handleMapViewChangeForRotationOrigin);
      if (mapOriginRafId) {
        globalThis.cancelAnimationFrame(mapOriginRafId);
        mapOriginRafId = null;
      }
      if (rafId) {
        globalThis.cancelAnimationFrame(rafId);
        rafId = null;
      }
      buttonEl?.removeEventListener('click', handleClick);
      needleEl = null;
      buttonEl = null;
      containerEl = null;
    }
  });

  const control = new CompassLeafletControl();
  control.addTo(map);

  return {
    destroy() {
      control.remove();
    }
  };
}

