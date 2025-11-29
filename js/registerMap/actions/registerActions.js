import {
  exportDatabase,
  getOverlayCoordinates,
  transformAndStoreMapData
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
    processButton,
    registrationPreviewButton,
    outputDatabaseButton
  } = elements;

  if (processButton) {
    processButton.addEventListener('click', () => processRegistration());
  }

  if (registrationPreviewButton) {
    registrationPreviewButton.addEventListener('click', () => previewController.togglePreview());
  }

  if (outputDatabaseButton) {
    outputDatabaseButton.addEventListener('click', () => exportDatabaseSnapshot());
  }

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

  async function processRegistration() {
    try {
      const overlayElement = overlayController.getElement();
      const payload = getOverlayPayload(overlayElement);
      const registrationData = await getOverlayCoordinates(payload);
      const metadata = registrationStore.getRegistrationMetadata();
      const enrichedData = { ...registrationData, ...metadata };

      registrationStore.setRegistrationData(enrichedData);

      const formData = buildFormData(registrationStore.getDroppedImage(), enrichedData);
      const blob = await transformAndStoreMapData(formData);
      handleTransformResult(blob);
    } catch (error) {
      console.error('Error processing registration:', error);
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

