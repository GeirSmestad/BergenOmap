import { buildMarkerSvgMarkup } from '../markers/markerDefinitions.js';

const clamp = value => Math.min(1, Math.max(0, value));

export function createOverlayMarkerManager({
  imageElement,
  markerLayerElement,
  coordinateStore,
  coordinateResolver,
  shouldIgnoreClick
}) {
  if (!imageElement || !markerLayerElement) {
    throw new Error('Overlay marker manager requires both an image and marker layer element.');
  }

  const markersByIndex = new Map();
  let latestSnapshot = coordinateStore.getSnapshot();

  const pointerState = {
    active: false,
    index: null,
    pointerId: null,
    marker: null
  };

  const isImageReady = () => Boolean(imageElement.naturalWidth && imageElement.naturalHeight);

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
    marker.style.left = `${(xPercent * 100).toFixed(4)}%`;
    marker.style.top = `${(yPercent * 100).toFixed(4)}%`;
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
    pointerState.active = true;
    pointerState.index = index;
    pointerState.pointerId = event.pointerId;
    pointerState.marker = marker;
  };

  const handlePointerMove = (event) => {
    if (!pointerState.active || pointerState.pointerId !== event.pointerId) {
      return;
    }

    const coords = resolveCoordsFromEvent(event);
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

