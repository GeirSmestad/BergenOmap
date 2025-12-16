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
  let pendingRotation = 0;
  let isListening = false;

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

  function handleOrientation(event) {
    const heading = getHeadingDegreesFromEvent(event);
    if (heading == null) return;

    // Compass starts pointing north (0deg) and rotates with received heading.
    const rotation = clampDegrees(heading);
    scheduleNeedleRotation(rotation);

    if (buttonEl) {
      buttonEl.classList.add('is-active');
      buttonEl.dataset.compassState = 'receiving';
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
    if (buttonEl) {
      buttonEl.classList.remove('is-active');
      buttonEl.dataset.compassState = 'stopped';
    }
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
      buttonEl.dataset.compassState = 'idle';

      // Keep the control from interfering with map gestures.
      L.DomEvent.disableClickPropagation(containerEl);
      L.DomEvent.disableScrollPropagation(containerEl);

      buttonEl.innerHTML = `
        <svg class="compass-control__icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="10.25" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.7"/>
          <path d="M12 2.9l1.5 3.2h-3z" fill="currentColor" opacity="0.65"/>
          <g data-compass-needle>
            <path d="M12 4.6l2.8 7.4-2.8-1.2-2.8 1.2z" fill="#e53935"/>
            <path d="M12 19.4l-2.8-7.4 2.8 1.2 2.8-1.2z" fill="#1e88e5"/>
            <circle cx="12" cy="12" r="1.2" fill="currentColor" opacity="0.9"/>
          </g>
        </svg>
      `;

      needleEl = buttonEl.querySelector('[data-compass-needle]');
      setNeedleRotation(0);

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

      return containerEl;
    },
    onRemove() {
      stopListening();
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

