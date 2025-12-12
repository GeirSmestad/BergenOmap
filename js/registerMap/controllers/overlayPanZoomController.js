const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const distanceBetween = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const midpointBetween = (a, b) => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2
});

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const WHEEL_SENSITIVITY = 0.0025;
const DRAG_THRESHOLD_PX = 4;

export function createOverlayPanZoomController({
  wrapperElement,
  canvasElement,
  imageElement
}) {
  if (!wrapperElement || !canvasElement || !imageElement) {
    throw new Error('Overlay pan/zoom controller requires wrapper, canvas and image elements.');
  }

  const state = {
    scale: 1,
    translateX: 0,
    translateY: 0
  };

  const pointerState = new Map();
  let skipNextClick = false;
  let singlePointerId = null;
  let singlePointerStart = null;
  let lastPanPoint = null;
  let pinchSnapshot = null;
  let lastPinchMidpoint = null;

  const applyTransform = () => {
    canvasElement.style.transform = `matrix(${state.scale}, 0, 0, ${state.scale}, ${state.translateX}, ${state.translateY})`;
    // Keep overlay markers a constant on-screen size by letting CSS apply an inverse scale.
    // (Markers live inside the scaled canvas, so without this they grow/shrink with zoom.)
    canvasElement.style.setProperty('--overlay-marker-scale', String(1 / state.scale));
  };

  const clampTranslation = () => {
    const baseWidth = imageElement.clientWidth;
    const baseHeight = imageElement.clientHeight;
    const viewportWidth = wrapperElement.clientWidth;
    const viewportHeight = wrapperElement.clientHeight;

    if (!baseWidth || !baseHeight || !viewportWidth || !viewportHeight) {
      return;
    }

    const contentWidth = baseWidth * state.scale;
    const contentHeight = baseHeight * state.scale;

    const minTranslateX = Math.min(0, viewportWidth - contentWidth);
    const minTranslateY = Math.min(0, viewportHeight - contentHeight);

    state.translateX = Math.min(0, Math.max(minTranslateX, state.translateX));
    state.translateY = Math.min(0, Math.max(minTranslateY, state.translateY));
  };

  const updateTransform = () => {
    clampTranslation();
    applyTransform();
  };

  const panBy = (dx = 0, dy = 0) => {
    if (!dx && !dy) {
      return;
    }
    state.translateX += dx;
    state.translateY += dy;
    updateTransform();
  };

  const setScale = (nextScale, anchorX, anchorY) => {
    const targetScale = clamp(nextScale, MIN_ZOOM, MAX_ZOOM);

    if (targetScale === state.scale) {
      return;
    }

    const rect = wrapperElement.getBoundingClientRect();
    const resolvedAnchorX = typeof anchorX === 'number' ? anchorX : rect.width / 2;
    const resolvedAnchorY = typeof anchorY === 'number' ? anchorY : rect.height / 2;

    const scaleRatio = targetScale / state.scale;
    state.translateX = resolvedAnchorX - scaleRatio * (resolvedAnchorX - state.translateX);
    state.translateY = resolvedAnchorY - scaleRatio * (resolvedAnchorY - state.translateY);
    state.scale = targetScale;
    updateTransform();
  };

  const clientPointToWrapperPoint = (point) => {
    const rect = wrapperElement.getBoundingClientRect();
    return {
      x: point.x - rect.left,
      y: point.y - rect.top
    };
  };

  const pointerDistanceFromStart = (point) => {
    if (!singlePointerStart) {
      return 0;
    }
    return Math.hypot(point.x - singlePointerStart.x, point.y - singlePointerStart.y);
  };

  const handlePointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    pointerState.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointerState.size === 1) {
      singlePointerId = event.pointerId;
      singlePointerStart = { x: event.clientX, y: event.clientY };
      lastPanPoint = { ...singlePointerStart };
    } else if (pointerState.size === 2) {
      const points = Array.from(pointerState.values());
      pinchSnapshot = {
        distance: distanceBetween(points[0], points[1]),
        scale: state.scale
      };
      lastPinchMidpoint = midpointBetween(points[0], points[1]);
    }
  };

  const handlePointerMove = (event) => {
    const pointer = pointerState.get(event.pointerId);
    if (!pointer) {
      return;
    }

    pointer.x = event.clientX;
    pointer.y = event.clientY;

    if (pointerState.size >= 2) {
      const points = Array.from(pointerState.values());
      const currentMidpoint = midpointBetween(points[0], points[1]);
      if (lastPinchMidpoint) {
        panBy(currentMidpoint.x - lastPinchMidpoint.x, currentMidpoint.y - lastPinchMidpoint.y);
      }

      if (pinchSnapshot?.distance) {
        const distance = distanceBetween(points[0], points[1]);
        if (pinchSnapshot.distance > 0) {
          const nextScale = pinchSnapshot.scale * (distance / pinchSnapshot.distance);
          const anchorPoint = clientPointToWrapperPoint(currentMidpoint);
          setScale(nextScale, anchorPoint.x, anchorPoint.y);
        }
      }

      skipNextClick = true;
      lastPinchMidpoint = currentMidpoint;
      event.preventDefault();
      return;
    }

    if (pointerState.size === 1 && event.pointerId === singlePointerId && lastPanPoint) {
      const dx = event.clientX - lastPanPoint.x;
      const dy = event.clientY - lastPanPoint.y;

      if (!skipNextClick && pointerDistanceFromStart(pointer) > DRAG_THRESHOLD_PX) {
        skipNextClick = true;
      }

      if (skipNextClick) {
        panBy(dx, dy);
        event.preventDefault();
      }

      lastPanPoint = { x: event.clientX, y: event.clientY };
    }
  };

  const handlePointerUp = (event) => {
    pointerState.delete(event.pointerId);

    if (event.pointerId === singlePointerId) {
      singlePointerId = null;
      singlePointerStart = null;
      lastPanPoint = null;
    }

    if (pointerState.size < 2) {
      pinchSnapshot = null;
      lastPinchMidpoint = null;
    }
  };

  const handleWheel = (event) => {
    if (!imageElement.naturalWidth || !imageElement.naturalHeight) {
      return;
    }

    if (event.deltaY === 0) {
      return;
    }

    event.preventDefault();
    const rect = wrapperElement.getBoundingClientRect();
    const anchorX = event.clientX - rect.left;
    const anchorY = event.clientY - rect.top;
    const scaleFactor = Math.exp(-event.deltaY * WHEEL_SENSITIVITY);
    setScale(state.scale * scaleFactor, anchorX, anchorY);
    skipNextClick = true;
  };

  const toImageCoordinates = (event) => {
    if (!imageElement.naturalWidth || !imageElement.naturalHeight) {
      return null;
    }

    const rect = wrapperElement.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;

    const baseWidth = imageElement.clientWidth;
    const baseHeight = imageElement.clientHeight;
    if (!baseWidth || !baseHeight) {
      return null;
    }

    const contentX = (pointerX - state.translateX) / state.scale;
    const contentY = (pointerY - state.translateY) / state.scale;

    const xPercent = clamp(contentX / baseWidth, 0, 1);
    const yPercent = clamp(contentY / baseHeight, 0, 1);

    return {
      xPercent,
      yPercent,
      imageX: xPercent * imageElement.naturalWidth,
      imageY: yPercent * imageElement.naturalHeight
    };
  };

  const shouldIgnoreClick = () => {
    if (!skipNextClick) {
      return false;
    }
    skipNextClick = false;
    return true;
  };

  const reset = () => {
    state.scale = 1;
    state.translateX = 0;
    state.translateY = 0;
    skipNextClick = false;
    updateTransform();
  };

  const handleResize = () => updateTransform();

  const resizeObserver = 'ResizeObserver' in window
    ? new ResizeObserver(() => handleResize())
    : null;

  if (resizeObserver) {
    resizeObserver.observe(imageElement);
    resizeObserver.observe(wrapperElement);
  } else {
    window.addEventListener('resize', handleResize);
  }

  wrapperElement.addEventListener('pointerdown', handlePointerDown);
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);
  window.addEventListener('pointercancel', handlePointerUp);
  wrapperElement.addEventListener('wheel', handleWheel, { passive: false });

  updateTransform();

  const destroy = () => {
    wrapperElement.removeEventListener('pointerdown', handlePointerDown);
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerUp);
    wrapperElement.removeEventListener('wheel', handleWheel);

    if (resizeObserver) {
      resizeObserver.disconnect();
    } else {
      window.removeEventListener('resize', handleResize);
    }
  };

  return {
    reset,
    destroy,
    toImageCoordinates,
    shouldIgnoreClick
  };
}


