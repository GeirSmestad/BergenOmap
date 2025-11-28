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
    const { latLon, xy, currentLatLonIndex, currentXYIndex } = snapshot;

    for (let i = 0; i < latLon.length; i += 1) {
      const latLonElement = latLonElements[i];
      if (latLonElement) {
        const { lat, lon } = latLon[i];
        latLonElement.textContent = `Point ${i + 1} - Lat: ${roundToFiveDecimals(lat)}, Lon: ${roundToFiveDecimals(lon)}`;
        latLonElement.style.fontWeight = i === currentLatLonIndex ? 'bold' : 'normal';
      }
    }

    for (let i = 0; i < xy.length; i += 1) {
      const xyElement = xyElements[i];
      if (xyElement) {
        const { x, y } = xy[i];
        xyElement.textContent = `Point ${i + 1} - X: ${Math.round(x)}, Y: ${Math.round(y)}`;
        xyElement.style.fontWeight = i === currentXYIndex ? 'bold' : 'normal';
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

