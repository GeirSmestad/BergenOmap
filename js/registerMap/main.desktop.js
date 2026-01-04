import { initRegisterMapApp } from './initRegisterMapApp.js';
import { AppMenu } from '../appMenu.js';

const DESKTOP_MEDIA_QUERY = '(min-width: 769px)';
const PALETTE_STICKY_BUFFER = 0;

const initPaletteStickyOffset = () => {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  const headerElement = document.querySelector('.registration-map-header');
  const rootElement = document.documentElement;

  if (!headerElement || !rootElement) {
    return;
  }

  const desktopMediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);

  const updateOffset = () => {
    if (!desktopMediaQuery.matches) {
      rootElement.style.removeProperty('--palette-sticky-offset');
      return;
    }

    const headerHeight = headerElement.getBoundingClientRect().height || 0;
    const offset = Math.max(0, Math.round(headerHeight + PALETTE_STICKY_BUFFER));

    rootElement.style.setProperty('--palette-sticky-offset', `${offset}px`);
  };

  updateOffset();

  const handleMediaQueryChange = () => updateOffset();

  if (typeof desktopMediaQuery.addEventListener === 'function') {
    desktopMediaQuery.addEventListener('change', handleMediaQueryChange);
  } else if (typeof desktopMediaQuery.addListener === 'function') {
    desktopMediaQuery.addListener(handleMediaQueryChange);
  }

  window.addEventListener('resize', updateOffset);

  if (typeof ResizeObserver !== 'undefined') {
    const resizeObserver = new ResizeObserver(() => updateOffset());
    resizeObserver.observe(headerElement);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  new AppMenu();
  initPaletteStickyOffset();
  initRegisterMapApp();
});

