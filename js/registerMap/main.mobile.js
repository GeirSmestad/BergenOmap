import { initRegisterMapApp } from './initRegisterMapApp.js';
import { initMobileTabs } from './ui/mobileTabController.js';

document.addEventListener('DOMContentLoaded', () => {
  const mobileTabs = initMobileTabs();

  initRegisterMapApp({
    onAdvanceToTerrainView: () => {
      mobileTabs?.switchToTab?.('terrain');
    }
  });
});

