/**
 * Simple App Menu Component
 * Renders a bottom-left pill button that expands into a navigation menu.
 */
export class AppMenu {
  constructor() {
    this.items = [
      { label: '🗺️ Kartvisning', url: 'map.html' },
      { label: '🛰️ Vis GPX', url: 'gpxBrowser.html' },
      { label: '🔥 Strava', url: 'stravaConnection.html' },
      { label: '📝 Registrer nytt kart', url: 'registerMap.html' },
      // { label: '🏃 Besøk poster', url: '#' } // Future placeholder
    ];
    
    // Detect current page to highlight active link
    this.currentPath = window.location.pathname.split('/').pop() || 'index.html';
    if (this.currentPath === '') this.currentPath = 'index.html';

    this.init();
  }

  /**
   * Check if the current path matches a menu item URL.
   * Handles special cases like registerMap.html -> registerMap.desktop.html/registerMap.mobile.html
   */
  isActivePath(itemUrl) {
    if (this.currentPath === itemUrl) {
      return true;
    }
    // index.html is an alias for map.html
    if (this.currentPath === 'index.html' && itemUrl === 'map.html') {
      return true;
    }
    // registerMap.html redirects to desktop/mobile variants
    if (itemUrl === 'registerMap.html') {
      if (this.currentPath === 'registerMap.desktop.html' || this.currentPath === 'registerMap.mobile.html') {
        return true;
      }
    }
    return false;
  }

  init() {
    // 1. Create Container
    const container = document.createElement('div');
    container.className = 'app-menu-container';

    // 2. Create Toggle Button
    const button = document.createElement('button');
    button.className = 'app-menu-toggle';
    button.type = 'button';
    button.ariaLabel = 'Meny';
    button.innerHTML = `
      <span class="app-menu-icon">☰</span>
    `;
    
    // 3. Create Menu List
    const list = document.createElement('nav');
    list.className = 'app-menu-list';
    
    this.items.forEach(item => {
      const link = document.createElement('a');
      link.href = item.url;
      link.className = 'app-menu-link';
      link.textContent = item.label;
      
      if (this.isActivePath(item.url)) {
        link.classList.add('is-active');
      }
      
      list.appendChild(link);
    });

    // 4. Assemble
    container.appendChild(button);
    container.appendChild(list);
    document.body.appendChild(container);

    // 5. Event Listeners
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      container.classList.toggle('is-open');
      const isExpanded = container.classList.contains('is-open');
      button.setAttribute('aria-expanded', isExpanded);
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!container.contains(e.target) && container.classList.contains('is-open')) {
        container.classList.remove('is-open');
        button.setAttribute('aria-expanded', 'false');
      }
    });
  }
}

