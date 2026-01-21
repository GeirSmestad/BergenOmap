export function createShowPositionButton({
  buttonElement,
  store,
  onToggle
} = {}) {
  if (!buttonElement || !store) {
    return null;
  }

  function syncButtonState(state = store.getState()) {
    const isEnabled = state.toggleButtons.showPosition;
    buttonElement.classList.toggle('is-active', isEnabled);
    buttonElement.setAttribute('aria-pressed', isEnabled ? 'true' : 'false');
  }

  function handleClick() {
    const state = store.getState();
    const next = !state.toggleButtons.showPosition;
    store.setShowPositionEnabled(next);

    if (typeof onToggle === 'function') {
      onToggle(next);
    }
  }

  buttonElement.addEventListener('click', handleClick);

  const unsubscribe = store.subscribe((state, prevState, change) => {
    if (change?.type === 'showPosition') {
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
