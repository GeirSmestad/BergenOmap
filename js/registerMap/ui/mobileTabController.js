
export function initMobileTabs() {
  const tabNav = document.getElementById('mobileTabNav');
  const tabs = document.querySelectorAll('.mobile-tab-item');
  const panels = document.querySelectorAll('.tab-panel');

  if (!tabNav) return;

  // Internal tab keys (data-tab values) vs UI labels:
  // - start    => "Map selection"
  // - terrain  => "Terrain view"
  // - overlay  => "Map view"
  // - metadata => "Details"
  const DEFAULT_TAB = 'start';
  const TERRAIN_VIEW_TAB = 'terrain';

  function switchToTab(targetTabName) {
    // 1. Update Tab Buttons (visual state)
    tabs.forEach(tab => {
      const isActive = tab.dataset.tab === targetTabName;
      tab.classList.toggle('mobile-tab-item--active', isActive);
      tab.setAttribute('aria-selected', isActive);
    });

    // 2. Set global state for CSS-based layout adjustments (e.g. hiding header)
    document.body.dataset.mobileTab = targetTabName;

    // 3. Toggle Content Panels
    panels.forEach(panel => {
      const panelTabName = panel.dataset.tab;
      const isActive = panelTabName === targetTabName;
      
      panel.classList.toggle('tab-content--active', isActive);

      // Special handling: Trigger map resize when switching to Terrain view tab
      if (isActive && panelTabName === TERRAIN_VIEW_TAB && window.map) {
         setTimeout(() => window.map.invalidateSize(), 100);
      }
    });
  }

  // Bind click events
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchToTab(tab.dataset.tab);
    });
  });

  // Initialize
  switchToTab(DEFAULT_TAB);

  return { switchToTab };
}
