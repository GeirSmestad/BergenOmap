import { convertPdfToImage, processDroppedImage } from './apiClient.js';

export function initfileDropService({
  dropArea,
  fileInput,
  registrationStore,
  onOverlayReady,
  onStatusMessage
}) {
  const STATUS_MESSAGES = {
    uploadingOverlay: 'Uploading map, please wait...',
    uploadComplete: "Finished uploading map. To fit the map to the terrain, please select three points in the terrain view and their three corresponding locations in the map view. Press 'Fit map to terrain' when done."
  };

  const setStatusMessage = (message) => {
    if (typeof onStatusMessage === 'function' && typeof message === 'string') {
      onStatusMessage(message);
    }
  };

  if (fileInput) {
    fileInput.addEventListener('change', async (event) => {
      const files = event.target.files;
      await handleFiles(files);
      // Reset input so same file can be selected again if needed
      event.target.value = '';
    });
  }

  if (!dropArea) {
    return;
  }

  const preventDefaults = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => dropArea.classList.add('highlight'), false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => dropArea.classList.remove('highlight'), false);
  });

  dropArea.addEventListener('drop', async (event) => {
    const files = event.dataTransfer?.files;
    await handleFiles(files);
  });

  async function handleFiles(fileList) {
    const file = fileList?.[0];

    if (!file) {
      return;
    }

    try {
      setStatusMessage(STATUS_MESSAGES.uploadingOverlay);
      const imageFile = await ensureImageFile(file);
      registrationStore.setDroppedImage(imageFile);
      populateDefaultFields(imageFile.name);

      const overlayUrl = await uploadAndPreviewImage(imageFile);
      if (typeof onOverlayReady === 'function') {
        onOverlayReady(overlayUrl);
      }
      setStatusMessage(STATUS_MESSAGES.uploadComplete);
    } catch (error) {
      console.error('Error while handling dropped file:', error);
      if (typeof onStatusMessage === 'function') {
        onStatusMessage(error.message);
      } else {
        alert(error.message);
      }
    }
  }

  async function ensureImageFile(file) {
    if (file.type === 'application/pdf') {
      return convertPdfFile(file);
    }

    if (file.type.startsWith('image/')) {
      return file;
    }

    throw new Error('Please drop an image or PDF file.');
  }

  async function convertPdfFile(pdfFile) {
    const formData = new FormData();
    formData.append('file', pdfFile);

    const blob = await convertPdfToImage(formData);
    const pngName = pdfFile.name.replace(/\.pdf$/i, '.png');
    return new File([blob], pngName, { type: 'image/png' });
  }

  async function uploadAndPreviewImage(imageFile) {
    const formData = new FormData();
    formData.append('file', imageFile);

    const blob = await processDroppedImage(formData);
    return URL.createObjectURL(blob);
  }

  function populateDefaultFields(filename) {
    const mapNameInput = document.getElementById('mapName');
    const filenameInput = document.getElementById('filename');

    if (mapNameInput && mapNameInput.value.trim() === '') {
      mapNameInput.value = filename;
    }

    if (filenameInput && filenameInput.value.trim() === '') {
      filenameInput.value = filename;
    }
  }
}

