import { initRegisterMapApp } from './initRegisterMapApp.js';
import { initMobileTabs } from './ui/mobileTabController.js';

document.addEventListener('DOMContentLoaded', () => {
  const mobileTabs = initMobileTabs();

  initRegisterMapApp({
    onAdvanceToTerrain: () => {
      mobileTabs?.switchToTab?.('terrain');
    }
  });
});

