export function createGpxUploadDialog({
  elements,
  onSubmit
} = {}) {
  const {
    triggerButton,
    fileInput,
    modal,
    descriptionInput,
    errorText,
    cancelButton,
    submitButton
  } = elements ?? {};

  if (!triggerButton || !fileInput || !modal) {
    throw new Error('Upload dialog requires trigger button, file input, and modal elements');
  }

  let selectedFile = null;
  let isSubmitting = false;

  function openModal(defaultName = '') {
    modal.classList.add('is-visible');
    modal.setAttribute('aria-hidden', 'false');
    descriptionInput.value = defaultName;
    errorText.textContent = '';
    descriptionInput.focus();
  }

  function closeModal() {
    modal.classList.remove('is-visible');
    modal.setAttribute('aria-hidden', 'true');
    selectedFile = null;
    fileInput.value = '';
    descriptionInput.value = '';
    errorText.textContent = '';
  }

  function setError(message) {
    errorText.textContent = message ?? '';
  }

  function validateDescription() {
    const value = descriptionInput.value.trim();
    if (!value) {
      setError('Navn kan ikke være tomt.');
      return null;
    }
    return value;
  }

  async function handleSubmit() {
    if (!selectedFile || isSubmitting) {
      return;
    }

    const description = validateDescription();
    if (!description) {
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      await onSubmit?.({
        file: selectedFile,
        description
      });
      closeModal();
    } catch (error) {
      console.error('Failed to upload GPX track', error);
      setError(error?.message || 'Kunne ikke laste opp GPX-filen.');
    } finally {
      setSubmitting(false);
    }
  }

  function setSubmitting(shouldSubmit) {
    isSubmitting = Boolean(shouldSubmit);
    submitButton.disabled = isSubmitting;
    cancelButton.disabled = isSubmitting;
    descriptionInput.disabled = isSubmitting;
  }

  triggerButton.addEventListener('click', () => {
    if (isSubmitting) {
      return;
    }
    fileInput.value = '';
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    const [file] = fileInput.files || [];
    if (!file) {
      return;
    }
    selectedFile = file;
    const defaultName = file.name.replace(/\.gpx$/i, '');
    openModal(defaultName);
  });

  cancelButton?.addEventListener('click', () => {
    if (isSubmitting) {
      return;
    }
    closeModal();
  });

  submitButton?.addEventListener('click', handleSubmit);

  modal.querySelector('.gpx-upload-modal__backdrop')?.addEventListener('click', () => {
    if (!isSubmitting) {
      closeModal();
    }
  });

  return {
    close: closeModal
  };
}

