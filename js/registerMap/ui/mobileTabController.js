
export function initMobileTabs() {
  const tabNav = document.getElementById('mobileTabNav');
  const tabs = document.querySelectorAll('.mobile-tab-item');
  const contentSections = {
    start: document.getElementById('tab-content-start'),
    terrain: document.getElementById('tab-content-terrain'),
    overlay: document.getElementById('tab-content-overlay'),
    metadata: document.getElementById('tab-content-metadata')
  };
  const header = document.querySelector('.registration-map-header');

  if (!tabNav) return;

  function switchToTab(tabName) {
    // Update tab buttons
    tabs.forEach(tab => {
      if (tab.dataset.tab === tabName) {
        tab.classList.add('mobile-tab-item--active');
        tab.setAttribute('aria-selected', 'true');
      } else {
        tab.classList.remove('mobile-tab-item--active');
        tab.setAttribute('aria-selected', 'false');
      }
    });

    // Set data attribute on body for global styling access
    document.body.dataset.mobileTab = tabName;

    // Toggle content sections
    Object.keys(contentSections).forEach(key => {
      const section = contentSections[key];
      if (section) {
        if (key === tabName) {
          section.classList.add('tab-content--active');
          // Trigger a resize event for maps when switching tabs
          if (key === 'terrain' && window.map) {
             setTimeout(() => window.map.invalidateSize(), 100);
          }
        } else {
          section.classList.remove('tab-content--active');
        }
      }
    });

    // Toggle header visibility
    // Deprecated: CSS now handles this via body[data-mobile-tab="start"]
    // if (header) {
    //   if (tabName === 'start') {
    //     header.classList.add('registration-map-header--hidden');
    //   } else {
    //     header.classList.remove('registration-map-header--hidden');
    //   }
    // }
  }

  // Add click listeners
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      switchToTab(tabName);
    });
  });

  // Initialize to start tab
  switchToTab('start');

  return {
    switchToTab
  };
}

