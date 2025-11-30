import {
  exportDatabase,
  getOverlayCoordinates,
  transformAndStoreMapData, // TODO: Rename to saveRegistration, can optionally drop re-submitting map to server
  transformMap // TODO: Rename to computeRegistration
} from '../services/apiClient.js';

const roundLatLon = (value) => parseFloat(value.toFixed(6));

export function initRegisterActions({
  coordinateStore,
  registrationStore,
  overlayController,
  previewController,
  elements
}) {
  const {
    computeRegistrationButton,
    saveMapButton,
    registrationPreviewButton,
    outputDatabaseButton
  } = elements;

  if (computeRegistrationButton) {
    computeRegistrationButton.addEventListener('click', () => computeRegistration());
  }

  if (saveMapButton) {
    saveMapButton.addEventListener('click', () => saveRegistration());
  }

  if (registrationPreviewButton) {
    registrationPreviewButton.addEventListener('click', () => previewController.togglePreview());
  }

  if (outputDatabaseButton) {
    outputDatabaseButton.addEventListener('click', () => exportDatabaseSnapshot());
  }

  // TODO: Might rename this to "handleRegistrationResult" or something.
  const handleTransformResult = (blob) => {
    const url = URL.createObjectURL(blob);
    registrationStore.setOverlayImageUrl(url);
    previewController.clearPreview();
  };

  const ensureOverlayDimensions = (overlayElement) => {
    const { naturalWidth, naturalHeight } = overlayElement;
    if (!naturalWidth || !naturalHeight) {
      throw new Error('Please load an overlay image before processing.');
    }
    return { naturalWidth, naturalHeight };
  };

  const getImageCoordinatePairs = () => (
    coordinateStore.getImageCoordinates().map(coord => [Math.round(coord.x), Math.round(coord.y)])
  );

  const getLatLonPairs = () => (
    coordinateStore.getLatLonCoordinates().map(coord => [roundLatLon(coord.lat), roundLatLon(coord.lon)])
  );

  const getOverlayPayload = (overlayElement) => {
    const { naturalWidth, naturalHeight } = ensureOverlayDimensions(overlayElement);
    return {
      image_coords: getImageCoordinatePairs(),
      real_coords: getLatLonPairs(),
      overlayWidth: naturalWidth,
      overlayHeight: naturalHeight
    };
  };

  const buildFormData = (file, data) => {
    if (!file) {
      throw new Error('Please drop an image before processing.');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('imageRegistrationData', JSON.stringify(data));
    return formData;
  };

  const mergeWithLatestMetadata = (registrationData) => ({ // TODO: Remove "latest"
    ...registrationData,
    ...registrationStore.getRegistrationMetadata()
  });

  const showLatestPreview = () => {
    if (typeof previewController.showPreview === 'function') {
      previewController.showPreview();
      return;
    }

    if (typeof previewController.togglePreview === 'function') {
      previewController.togglePreview();
      return;
    }

    console.warn('Preview controller is missing showPreview/togglePreview handlers.');
  };

  async function computeRegistration() {
    try {
      const overlayElement = overlayController.getElement();
      const payload = getOverlayPayload(overlayElement);
      const registrationData = await getOverlayCoordinates(payload);
      const enrichedData = mergeWithLatestMetadata(registrationData);

      registrationStore.setRegistrationData(enrichedData);

      const formData = buildFormData(registrationStore.getDroppedImage(), enrichedData);
      const blob = await transformMap(formData); // TODO: TransformData should maybe be renamed to "getRegisteredMap" or something. Also don't like "blob".
      handleTransformResult(blob);
      showLatestPreview();
    } catch (error) {
      console.error('Error computing registration:', error);
    }
  }

  async function saveRegistration() {
    try {
      const latestRegistration = registrationStore.getRegistrationData();

      if (!latestRegistration || !latestRegistration.nw_coords || !latestRegistration.se_coords) {
        throw new Error('Please compute a registration before saving.');
      }

      const enrichedData = mergeWithLatestMetadata(latestRegistration);
      registrationStore.setRegistrationData(enrichedData);

      const formData = buildFormData(registrationStore.getDroppedImage(), enrichedData);
      const blob = await transformAndStoreMapData(formData); // TODO: Rename to "registerAndStoreMap" or something
      handleTransformResult(blob);
      showLatestPreview();
    } catch (error) {
      console.error('Error saving map:', error);
    }
  }

  async function exportDatabaseSnapshot() {
    try {
      const payload = {
        include_original: true,
        overwrite: true
      };

      const response = await exportDatabase(payload);
      console.log('Database export result:', response);
    } catch (error) {
      console.error('Error exporting database:', error);
    }
  }
}

