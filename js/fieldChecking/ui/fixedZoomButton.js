import {
  formatMapScaleLabel,
  parseMapScaleDenominator
} from '../utils/geo.js';

import { DEFAULT_FIXED_ZOOM_SCALE_DENOMINATOR } from '../config.js';

export function createFixedZoomButton({
  buttonElement,
  store,
  onToggle
} = {}) {
  if (!buttonElement || !store) {
    return null;
  }

  function resolveButtonScaleDenominator(state) {
    const mapName = state?.selectedMapName;
    if (!mapName) {
      return DEFAULT_FIXED_ZOOM_SCALE_DENOMINATOR;
    }

    const definitions = Array.isArray(state.mapDefinitions) ? state.mapDefinitions : [];
    const definition = definitions.find((d) => d?.map_name === mapName);
    const parsed = parseMapScaleDenominator(definition?.map_scale);
    return parsed || DEFAULT_FIXED_ZOOM_SCALE_DENOMINATOR;
  }

  function syncButtonState(state = store.getState()) {
    const isEnabled = state.toggleButtons.fixedZoom;
    buttonElement.classList.toggle('is-active', isEnabled);
    buttonElement.setAttribute('aria-pressed', isEnabled ? 'true' : 'false');

    const scaleDenominator = resolveButtonScaleDenominator(state);
    const label = formatMapScaleLabel(scaleDenominator) || formatMapScaleLabel(DEFAULT_FIXED_ZOOM_SCALE_DENOMINATOR);
    buttonElement.textContent = label;
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
    if (
      change?.type === 'fixedZoom' ||
      change?.type === 'selectedMapName' ||
      change?.type === 'mapDefinitions'
    ) {
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
