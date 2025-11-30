function addOrienteeringMapOverlay(definition, map) {
  const { nw_coords: nwCoords, se_coords: seCoords, map_filename: overlayFile } = definition;
  const overlayCoords = [nwCoords, seCoords];

  return L.imageOverlay(overlayFile, overlayCoords, {
    opacity: 1,
    alt: '',
    interactive: true
  }).addTo(map);
}

export function createPreviewController({ // TODO: Can rename to registrationPreviewController
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

  const hasPreviewData = (registrationData, overlayImageUrl) => (
    !!(registrationData?.nw_coords && registrationData?.se_coords && overlayImageUrl)
  );

  const renderPreview = (registrationData, overlayImageUrl) => {
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

  const showPreview = () => {
    const registrationData = registrationStore.getRegistrationData();
    const overlayImageUrl = registrationStore.getOverlayImageUrl();

    if (!hasPreviewData(registrationData, overlayImageUrl)) {
      console.warn('No registration data available for preview yet.');
      return;
    }

    renderPreview(registrationData, overlayImageUrl);
  };

  const togglePreview = () => {
    if (isVisible) {
      clearPreview();
      return;
    }

    showPreview();
  };

  return {
    togglePreview,
    clearPreview,
    showPreview
  };
}

