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

const disableNativeDragBehavior = (imageElement) => {
  if (!imageElement) {
    return () => {};
  }

  imageElement.setAttribute('draggable', 'false');
  const handleDragStart = (event) => event.preventDefault();
  imageElement.addEventListener('dragstart', handleDragStart);

  return () => imageElement.removeEventListener('dragstart', handleDragStart);
};

const ensurePlaceholder = (wrapperElement) => {
  const existingPlaceholder = wrapperElement.querySelector('.overlay-placeholder');
  if (existingPlaceholder) {
    return existingPlaceholder;
  }

  const placeholder = document.createElement('div');
  placeholder.className = 'overlay-placeholder';
  
  const content = document.createElement('div');
  content.className = 'overlay-placeholder-content';
  content.textContent = 'Load a map to commence registration';
  
  placeholder.appendChild(content);
  wrapperElement.appendChild(placeholder);
  return placeholder;
};

export function createOverlayController({
  coordinateStore,
  onOverlayLoaded
}) {
  const overlayElement = document.getElementById('overlayView');

  if (!overlayElement) {
    throw new Error('Overlay element #overlayView was not found in the DOM');
  }

  const overlayWrapper = ensureOverlayWrapper(overlayElement);
  const cleanupDragHandler = disableNativeDragBehavior(overlayElement);
  const panZoomCanvas = ensurePanZoomCanvas(overlayWrapper, overlayElement);
  const markerLayer = ensureMarkerLayer(panZoomCanvas);
  
  // Create placeholder (hidden if image already present/loaded)
  // We'll manage visibility based on load events and source setting.
  const placeholder = ensurePlaceholder(overlayWrapper);

  const togglePlaceholder = (show) => {
    placeholder.style.display = show ? 'flex' : 'none';
  };

  // Initially show placeholder if no src
  if (!overlayElement.src || overlayElement.src === window.location.href) {
    togglePlaceholder(true);
  } else {
    // If src is set, it might be loaded or loading.
    // If already complete, hide.
    if (overlayElement.complete && overlayElement.naturalWidth > 0) {
      togglePlaceholder(false);
    } else {
      togglePlaceholder(true);
    }
  }

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
    imageContentMetricsResolver: panZoomController.getImageContentMetrics,
    shouldIgnoreClick: panZoomController.shouldIgnoreClick
  });

  const handleOverlayLoad = () => {
    panZoomController.reset();
    togglePlaceholder(false);
    if (typeof onOverlayLoaded === 'function') {
      onOverlayLoaded();
    }
  };

  overlayElement.addEventListener('load', handleOverlayLoad);

  window.overlayView = overlayElement;

  return {
    getElement: () => overlayElement,
    setSource: (src) => {
      if (!src) {
        overlayElement.removeAttribute('src');
        togglePlaceholder(true);
      } else {
        overlayElement.src = src;
        // Keep placeholder visible until 'load' fires
        togglePlaceholder(true);
      }
    },
    markerManager,
    destroy: () => {
      cleanupDragHandler();
      panZoomController.destroy();
      markerManager.destroy?.();
      overlayElement.removeEventListener('load', handleOverlayLoad);
    }
  };
}

