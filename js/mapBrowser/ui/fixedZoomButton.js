export function createFixedZoomButton({
  buttonElement,
  store,
  onToggle
} = {}) {
  if (!buttonElement || !store) {
    return null;
  }

  function syncButtonState(state = store.getState()) {
    const isEnabled = state.toggleButtons.fixedZoom;
    buttonElement.classList.toggle('is-active', isEnabled);
    buttonElement.setAttribute('aria-pressed', isEnabled ? 'true' : 'false');
  }

  function handleClick() {
    const state = store.getState();
    const next = !state.toggleButtons.fixedZoom;
    store.setFixedZoomEnabled(next);

    if (typeof onToggle === 'function') {
      onToggle(next);
    }
  }

  buttonElement.addEventListener('click', handleClick);

  const unsubscribe = store.subscribe((state, prevState, change) => {
    if (change?.type === 'fixedZoom') {
      syncButtonState(state);
    }
  });

  syncButtonState();

  return {
    destroy() {
      unsubscribe();
      buttonElement.removeEventListener('click', handleClick);
    }
  };
}
