import { createOverlayMarkerManager } from './overlayMarkerManager.js';
import { createOverlayPanZoomController } from './overlayPanZoomController.js';

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

const ensureMarkerLayer = (parentElement) => {
  const existingLayer = parentElement.querySelector('.overlay-marker-layer');
  if (existingLayer) {
    return existingLayer;
  }

  const markerLayer = document.createElement('div');
  markerLayer.classList.add('overlay-marker-layer');
  parentElement.appendChild(markerLayer);
  return markerLayer;
};

const ensurePanZoomCanvas = (wrapperElement, overlayElement) => {
  const parentElement = overlayElement.parentElement;
  if (parentElement?.classList.contains('overlay-panzoom-canvas')) {
    return parentElement;
  }

  const canvas = document.createElement('div');
  canvas.classList.add('overlay-panzoom-canvas');
  wrapperElement.insertBefore(canvas, overlayElement);
  canvas.appendChild(overlayElement);
  return canvas;
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
  const panZoomCanvas = ensurePanZoomCanvas(overlayWrapper, overlayElement);
  const markerLayer = ensureMarkerLayer(panZoomCanvas);
  const panZoomController = createOverlayPanZoomController({
    wrapperElement: overlayWrapper,
    canvasElement: panZoomCanvas,
    imageElement: overlayElement
  });

  const markerManager = createOverlayMarkerManager({
    imageElement: overlayElement,
    markerLayerElement: markerLayer,
    coordinateStore,
    coordinateResolver: panZoomController.toImageCoordinates,
    shouldIgnoreClick: panZoomController.shouldIgnoreClick
  });

  const handleOverlayLoad = () => {
    panZoomController.reset();
    if (typeof onOverlayLoaded === 'function') {
      onOverlayLoaded();
    }
  };

  overlayElement.addEventListener('load', handleOverlayLoad);

  window.overlayView = overlayElement;

  return {
    getElement: () => overlayElement,
    setSource: (src) => {
      overlayElement.src = src;
    },
    markerManager
  };
}

