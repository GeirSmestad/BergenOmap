import { buildMarkerSvgMarkup } from '../markers/markerDefinitions.js';

const clamp = value => Math.min(1, Math.max(0, value));
const MARKER_BODY_CENTER_Y_RATIO = 21 / 54; // Matches the SVG label baseline, a good proxy for "body center".
// When dragging on touch devices, keep the finger away from the marker tip pixel.
// 0 means "grab at the very top of the marker". Negative values would mean "grab above the marker".
const MARKER_GRAB_Y_RATIO_TOUCH = -0.3;
const MARKER_GRAB_Y_RATIO_MOUSE = MARKER_BODY_CENTER_Y_RATIO;

export function createOverlayMarkerManager({
  imageElement,
  markerLayerElement,
  coordinateStore,
  coordinateResolver,
  imageContentMetricsResolver,
  shouldIgnoreClick
}) {
  if (!imageElement || !markerLayerElement) {
    throw new Error('Overlay marker manager requires both an image and marker layer element.');
  }

  const markersByIndex = new Map();
  let latestSnapshot = coordinateStore.getSnapshot();

  const isMobileRegisterUi = () => Boolean(document.getElementById('mobileTabNav'));

  const pointerState = {
    active: false,
    index: null,
    pointerId: null,
    marker: null,
    dragClientOffset: { x: 0, y: 0 }
  };

  const isImageReady = () => Boolean(imageElement.naturalWidth && imageElement.naturalHeight);

  const getImageContentMetrics = () => {
    if (typeof imageContentMetricsResolver === 'function') {
      return imageContentMetricsResolver();
    }

    // Fallback: assume content fills the element box.
    const boxWidth = imageElement.clientWidth;
    const boxHeight = imageElement.clientHeight;
    return {
      boxWidth: boxWidth || 0,
      boxHeight: boxHeight || 0,
      offsetX: 0,
      offsetY: 0,
      width: boxWidth || 0,
      height: boxHeight || 0
    };
  };

  const buildMarkerElement = (index) => {
    const marker = document.createElement('div');
    marker.className = 'registration-marker registration-marker--anchored';
    marker.dataset.index = String(index);
    marker.innerHTML = buildMarkerSvgMarkup(index);

    markerLayerElement.appendChild(marker);
    attachMarkerEventHandlers(marker, index);
    markersByIndex.set(index, marker);
    return marker;
  };

  const removeMarker = (index) => {
    const marker = markersByIndex.get(index);
    if (!marker) {
      return;
    }

    if (pointerState.active && pointerState.index === index) {
      pointerState.active = false;
      pointerState.index = null;
      pointerState.pointerId = null;
      pointerState.marker = null;
    }

    marker.remove();
    markersByIndex.delete(index);
  };

  const setMarkerPosition = (marker, xPercent, yPercent) => {
    const metrics = getImageContentMetrics();
    const x = metrics.offsetX + (xPercent * metrics.width);
    const y = metrics.offsetY + (yPercent * metrics.height);
    marker.style.left = `${x.toFixed(2)}px`;
    marker.style.top = `${y.toFixed(2)}px`;
    marker.style.opacity = '1';
  };

  const storeNaturalCoordinatesOnMarker = (marker, x, y) => {
    marker.dataset.naturalX = String(x);
    marker.dataset.naturalY = String(y);
  };

  const naturalCoordsToPercentOfImage = (x, y) => {
    if (!isImageReady()) {
      return null;
    }

    return {
      xPercent: clamp(x / imageElement.naturalWidth),
      yPercent: clamp(y / imageElement.naturalHeight)
    };
  };


  // In order to correctly handle marker positioning when elements are re-sized, we track
  // their position in percent of their bounding client rectangle in addition to their
  // absolute positions.
  const resolveCoordsFromEvent = (event) => {
    if (!isImageReady()) {
      return null;
    }

    if (typeof coordinateResolver === 'function') {
      return coordinateResolver(event);
    }

    const rect = imageElement.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return null;
    }

    const xPercent = clamp((event.clientX - rect.left) / rect.width);
    const yPercent = clamp((event.clientY - rect.top) / rect.height);
    const imageX = xPercent * imageElement.naturalWidth;
    const imageY = yPercent * imageElement.naturalHeight;

    return {
      xPercent,
      yPercent,
      imageX,
      imageY
    };
  };

  const updateMarkerFromStore = (index, x, y) => {
    const marker = markersByIndex.get(index) ?? buildMarkerElement(index);
    storeNaturalCoordinatesOnMarker(marker, x, y);

    const percents = naturalCoordsToPercentOfImage(x, y);
    if (!percents) {
      marker.style.opacity = '0';
      return;
    }

    setMarkerPosition(marker, percents.xPercent, percents.yPercent);
  };

  const syncMarkersFromStore = (snapshot = coordinateStore.getSnapshot()) => {
    latestSnapshot = snapshot;

    snapshot.xy.forEach((point, index) => {
      if (snapshot.xyOccupancy[index]) {
        updateMarkerFromStore(index, point.x, point.y);
      } else {
        removeMarker(index);
      }
    });
  };

  const handleImageClick = (event) => {
    const { currentXYIndex } = coordinateStore.getCurrentIndices();

    if (typeof currentXYIndex !== 'number' || !isImageReady()) {
      return;
    }

    if (coordinateStore.isImageCoordinateSet(currentXYIndex)) {
      return;
    }

    if (typeof shouldIgnoreClick === 'function' && shouldIgnoreClick()) {
      return;
    }

    const coords = resolveCoordsFromEvent(event);
    if (!coords) {
      return;
    }

    coordinateStore.setImageCoordinateAt(currentXYIndex, coords.imageX, coords.imageY);
  };

  const handleMarkerContextMenu = (index, event) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Disable right-click/long-press removal on mobile
    if (isMobileRegisterUi()) {
      return;
    }

    coordinateStore.clearImageCoordinateAt(index);
    removeMarker(index);
  };

  const handlePointerDown = (index, marker, event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isImageReady()) {
      return;
    }

    marker.setPointerCapture(event.pointerId);
    const rect = marker.getBoundingClientRect();
    const markerHeight = rect.height || 52;

    // During dragging we want the stored image coordinate to remain the sharp tip pixel.
    // The marker is anchored at the tip, so we translate pointer -> tip by adding a
    // constant downward screen offset.
    //
    // On touch devices the finger covers the tip; prefer grabbing the marker by its top
    // so the tip pixel stays visible under the finger.
    const grabYRatio = (event.pointerType === 'touch' || event.pointerType === 'pen')
      ? MARKER_GRAB_Y_RATIO_TOUCH
      : MARKER_GRAB_Y_RATIO_MOUSE;

    pointerState.dragClientOffset = {
      x: 0,
      y: markerHeight * (1 - grabYRatio)
    };
    pointerState.active = true;
    pointerState.index = index;
    pointerState.pointerId = event.pointerId;
    pointerState.marker = marker;
  };

  const handlePointerMove = (event) => {
    if (!pointerState.active || pointerState.pointerId !== event.pointerId) {
      return;
    }

    const coords = resolveCoordsFromEvent({
      clientX: event.clientX + (pointerState.dragClientOffset?.x ?? 0),
      clientY: event.clientY + (pointerState.dragClientOffset?.y ?? 0)
    });
    if (!coords || !pointerState.marker) {
      return;
    }

    storeNaturalCoordinatesOnMarker(pointerState.marker, coords.imageX, coords.imageY);
    setMarkerPosition(pointerState.marker, coords.xPercent, coords.yPercent);
    coordinateStore.setImageCoordinateAt(pointerState.index, coords.imageX, coords.imageY, { skipAdvance: true });
  };

  const handlePointerUp = (event) => {
    if (!pointerState.active || pointerState.pointerId !== event.pointerId || !pointerState.marker) {
      return;
    }

    pointerState.marker.releasePointerCapture(event.pointerId);
    pointerState.active = false;
    pointerState.index = null;
    pointerState.pointerId = null;
    pointerState.marker = null;
    pointerState.dragClientOffset = { x: 0, y: 0 };
  };

  const attachMarkerEventHandlers = (marker, index) => {
    marker.addEventListener('pointerdown', (event) => handlePointerDown(index, marker, event));
    marker.addEventListener('pointermove', handlePointerMove);
    marker.addEventListener('pointerup', handlePointerUp);
    marker.addEventListener('pointercancel', handlePointerUp);
    marker.addEventListener('contextmenu', (event) => handleMarkerContextMenu(index, event));
  };

  const refreshMarkerPositions = () => {
    markersByIndex.forEach((marker) => {
      const x = Number(marker.dataset.naturalX);
      const y = Number(marker.dataset.naturalY);
      if (Number.isNaN(x) || Number.isNaN(y)) {
        return;
      }

      const percents = naturalCoordsToPercentOfImage(x, y);
      if (!percents) {
        marker.style.opacity = '0';
        return;
      }

      setMarkerPosition(marker, percents.xPercent, percents.yPercent);
    });
  };

  const onImageLoad = () => {
    syncMarkersFromStore();
  };

  const handleStoreChange = (event) => syncMarkersFromStore(event.detail);

  const resizeObserver = 'ResizeObserver' in window
    ? new ResizeObserver(() => refreshMarkerPositions())
    : null;

  if (resizeObserver) {
    resizeObserver.observe(imageElement);
  } else {
    window.addEventListener('resize', refreshMarkerPositions);
  }

  imageElement.addEventListener('click', handleImageClick);
  imageElement.addEventListener('load', onImageLoad);
  coordinateStore.addEventListener('change', handleStoreChange);
  syncMarkersFromStore(latestSnapshot);

  const destroy = () => {
    imageElement.removeEventListener('click', handleImageClick);
    imageElement.removeEventListener('load', onImageLoad);
    coordinateStore.removeEventListener('change', handleStoreChange);

    if (resizeObserver) {
      resizeObserver.disconnect();
    } else {
      window.removeEventListener('resize', refreshMarkerPositions);
    }

    markersByIndex.forEach((marker) => marker.remove());
    markersByIndex.clear();
  };

  return {
    sync: syncMarkersFromStore,
    destroy
  };
}
