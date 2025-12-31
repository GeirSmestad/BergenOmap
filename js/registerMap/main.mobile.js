import { initRegisterMapApp } from './initRegisterMapApp.js';
import { initMobileTabs } from './ui/mobileTabController.js';

function syncMobileAppHeight() {
  const height = window.visualViewport?.height ?? window.innerHeight;
  if (typeof height === 'number' && height > 0) {
    document.documentElement.style.setProperty('--app-height', `${Math.round(height)}px`);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // iOS Safari: keep layout locked to the *visual* viewport so the bottom tab bar
  // doesn't slip under the URL/toolbars on load/scroll/orientation changes.
  syncMobileAppHeight();
  window.addEventListener('resize', syncMobileAppHeight);
  window.addEventListener('orientationchange', () => setTimeout(syncMobileAppHeight, 250));
  window.visualViewport?.addEventListener?.('resize', syncMobileAppHeight);
  window.visualViewport?.addEventListener?.('scroll', syncMobileAppHeight);

  const mobileTabs = initMobileTabs();

  initRegisterMapApp({
    onAdvanceToTerrainView: () => {
      mobileTabs?.switchToTab?.('terrain');
    }
  });
});

