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

  const clearMarker = (index) => {
    if (isMap) {
      coordinateStore.clearLatLonAt(index);
    } else {
      coordinateStore.clearImageCoordinateAt(index);
    }
  };

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
      const markerWrapper = document.createElement('div');
      markerWrapper.className = 'marker-palette-item';
      markerWrapper.dataset.index = index;

      if (isOccupied) {
        markerWrapper.classList.add('marker-palette-item--placed');
        markerWrapper.title = `Marker ${index + 1} already placed. Click to remove.`;
      } else {
        markerWrapper.title = `Select marker ${index + 1}`;
        if (index === currentIndex) {
          markerWrapper.classList.add('marker-palette-item--active');
        }
      }

      markerWrapper.innerHTML = buildMarkerSvgMarkup(index);
      
      markerWrapper.addEventListener('click', (event) => {
        if (isOccupied) {
          // Click to remove/reset placed marker
          clearMarker(index);
          return;
        }

        // Click to select available marker
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
