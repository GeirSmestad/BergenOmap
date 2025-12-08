import { buildMarkerSvgMarkup } from '../markers/markerDefinitions.js';

export function initMarkerPalettePanel({
  element,
  coordinateStore,
  type // 'map' or 'overlay'
}) {
  if (!element || !coordinateStore) {
    return;
  }

  const isMap = type === 'map';

  const render = (snapshot = coordinateStore.getSnapshot()) => {
    const {
      latLonOccupancy,
      xyOccupancy,
      currentLatLonIndex,
      currentXYIndex
    } = snapshot;

    const occupancy = isMap ? latLonOccupancy : xyOccupancy;
    const currentIndex = isMap ? currentLatLonIndex : currentXYIndex;

    element.innerHTML = '';

    occupancy.forEach((isOccupied, index) => {
      // Hide markers that are already placed
      if (isOccupied) {
        return;
      }

      const markerWrapper = document.createElement('div');
      markerWrapper.className = 'marker-palette-item';
      markerWrapper.dataset.index = index;
      markerWrapper.title = `Select marker ${index + 1}`;

      if (index === currentIndex) {
        markerWrapper.classList.add('marker-palette-item--active');
      }

      markerWrapper.innerHTML = buildMarkerSvgMarkup(index);
      
      markerWrapper.addEventListener('click', () => {
        if (isMap) {
          coordinateStore.selectLatLonIndex(index);
        } else {
          coordinateStore.selectXYIndex(index);
        }
      });

      element.appendChild(markerWrapper);
    });
  };

  coordinateStore.addEventListener('change', (event) => {
    render(event.detail);
  });

  render();

  return {
    render
  };
}

