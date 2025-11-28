function addOrienteeringMapOverlay(definition, map) {
  const { nw_coords: nwCoords, se_coords: seCoords, map_filename: overlayFile } = definition;
  const overlayCoords = [nwCoords, seCoords];

  return L.imageOverlay(overlayFile, overlayCoords, {
    opacity: 1,
    alt: '',
    interactive: true
  }).addTo(map);
}

export function createPreviewController({
  map,
  registrationStore
}) {
  let previewLayer = null;
  let isVisible = false;

  const clearPreview = () => {
    if (previewLayer) {
      previewLayer.remove();
      previewLayer = null;
    }
    isVisible = false;
  };

  const togglePreview = () => {
    const registrationData = registrationStore.getRegistrationData();
    const overlayImageUrl = registrationStore.getOverlayImageUrl();

    if (!registrationData.nw_coords || !registrationData.se_coords || !overlayImageUrl) {
      console.warn('No registration data available for preview yet.');
      return;
    }

    if (isVisible) {
      clearPreview();
      return;
    }

    clearPreview();

    const previewDefinition = {
      nw_coords: registrationData.nw_coords,
      se_coords: registrationData.se_coords,
      map_filename: overlayImageUrl
    };

    previewLayer = addOrienteeringMapOverlay(previewDefinition, map);
    previewLayer.setOpacity(0.35);
    isVisible = true;
  };

  return {
    togglePreview,
    clearPreview
  };
}

