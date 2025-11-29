const roundToFiveDecimals = (num) => Math.round(num * 100000) / 100000;

export function initCoordinatePanel({
  coordinateStore,
  latLonElements,
  xyElements
}) {
  if (!coordinateStore || !latLonElements || !xyElements) {
    return;
  }

  const render = (snapshot = coordinateStore.getSnapshot()) => {
    const {
      latLon,
      xy,
      currentLatLonIndex,
      currentXYIndex,
      latLonOccupancy = [],
      xyOccupancy = []
    } = snapshot;

    for (let i = 0; i < latLon.length; i += 1) {
      const latLonElement = latLonElements[i];
      if (latLonElement) {
        const { lat, lon } = latLon[i];
        const isSet = latLonOccupancy[i] ?? true;
        latLonElement.textContent = isSet
          ? `Point ${i + 1} - Lat: ${roundToFiveDecimals(lat)}, Lon: ${roundToFiveDecimals(lon)}`
          : `Point ${i + 1} - Not set`;
        latLonElement.style.fontWeight = typeof currentLatLonIndex === 'number' && i === currentLatLonIndex
          ? 'bold'
          : 'normal';
      }
    }

    for (let i = 0; i < xy.length; i += 1) {
      const xyElement = xyElements[i];
      if (xyElement) {
        const { x, y } = xy[i];
        const isSet = xyOccupancy[i] ?? true;
        xyElement.textContent = isSet
          ? `Point ${i + 1} - X: ${Math.round(x)}, Y: ${Math.round(y)}`
          : `Point ${i + 1} - Not set`;
        xyElement.style.fontWeight = typeof currentXYIndex === 'number' && i === currentXYIndex
          ? 'bold'
          : 'normal';
      }
    }
  };

  coordinateStore.addEventListener('change', (event) => {
    render(event.detail);
  });

  render();

  return {
    render
  };
}

