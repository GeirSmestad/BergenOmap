import { createOverlayMarkerManager } from './overlayMarkerManager.js';

const ensureOverlayWrapper = (overlayElement) => {
  const parentElement = overlayElement.parentElement;
  if (parentElement?.classList.contains('overlay-view-wrapper')) {
    return parentElement;
  }

  const wrapper = document.createElement('div');
  wrapper.classList.add('overlay-view-wrapper');

  if (parentElement) {
    parentElement.insertBefore(wrapper, overlayElement);
  }

  wrapper.appendChild(overlayElement);
  return wrapper;
};

const ensureMarkerLayer = (wrapperElement) => {
  const existingLayer = wrapperElement.querySelector('.overlay-marker-layer');
  if (existingLayer) {
    return existingLayer;
  }

  const markerLayer = document.createElement('div');
  markerLayer.classList.add('overlay-marker-layer');
  wrapperElement.appendChild(markerLayer);
  return markerLayer;
};

const applyOverlayLayerStyling = (wrapperElement, overlayElement, markerLayer) => {
  if (wrapperElement) {
    wrapperElement.style.position = wrapperElement.style.position || 'relative';
    wrapperElement.style.width = wrapperElement.style.width || '100%';
  }

  if (overlayElement) {
    overlayElement.style.display = 'block';
    overlayElement.style.position = 'relative';
    overlayElement.style.zIndex = '1';
  }

  if (markerLayer) {
    markerLayer.style.position = 'absolute';
    markerLayer.style.top = '0';
    markerLayer.style.right = '0';
    markerLayer.style.bottom = '0';
    markerLayer.style.left = '0';
    markerLayer.style.pointerEvents = 'none';
    markerLayer.style.zIndex = '2';
  }
};

export function createOverlayController({ // TODO: Can rename to orienteeringMapController? Overlay isn't accurately descriptive
  coordinateStore,
  onOverlayLoaded
}) {
  const overlayElement = document.getElementById('overlayView');

  if (!overlayElement) {
    throw new Error('Overlay element #overlayView was not found in the DOM');
  }

  const overlayWrapper = ensureOverlayWrapper(overlayElement);
  const markerLayer = ensureMarkerLayer(overlayWrapper);
  applyOverlayLayerStyling(overlayWrapper, overlayElement, markerLayer);

  const markerManager = createOverlayMarkerManager({
    imageElement: overlayElement,
    markerLayerElement: markerLayer,
    coordinateStore
  });

  if (typeof onOverlayLoaded === 'function') {
    overlayElement.addEventListener('load', onOverlayLoaded);
  }

  window.overlayView = overlayElement;

  return {
    getElement: () => overlayElement,
    setSource: (src) => {
      overlayElement.src = src;
    },
    markerManager
  };
}

