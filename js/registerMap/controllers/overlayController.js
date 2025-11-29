function calculateClickedImageCoordinates(img, event) {
  const naturalWidth = img.naturalWidth;
  const naturalHeight = img.naturalHeight;

  const rect = img.getBoundingClientRect();
  const displayedWidth = rect.width;
  const displayedHeight = rect.height;

  const scaleX = naturalWidth / displayedWidth;
  const scaleY = naturalHeight / displayedHeight;

  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  return {
    imageX: x * scaleX,
    imageY: y * scaleY
  };
}

export function createOverlayController({ // TODO: Can rename to orienteeringMapController? Overlay isn't accurately descriptive
  coordinateStore,
  onOverlayLoaded
}) {
  const overlayElement = document.getElementById('overlayView');

  if (!overlayElement) {
    throw new Error('Overlay element #overlayView was not found in the DOM');
  }

  overlayElement.addEventListener('click', (event) => {
    const { imageX, imageY } = calculateClickedImageCoordinates(overlayElement, event);
    coordinateStore.recordImageCoordinate(imageX, imageY);
  });

  if (typeof onOverlayLoaded === 'function') {
    overlayElement.addEventListener('load', onOverlayLoaded);
  }

  window.overlayView = overlayElement;

  return {
    getElement: () => overlayElement,
    setSource: (src) => {
      overlayElement.src = src;
    }
  };
}

