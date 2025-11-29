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

