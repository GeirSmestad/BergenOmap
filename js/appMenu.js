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

    this.pilotUsers = new Set(['geir.smestad']);
    this.pilotItems = [
      { label: '🧭 Synfaring', url: 'fieldInspection.html' },
    ];
    
    // Detect current page to highlight active link
    this.currentPath = window.location.pathname.split('/').pop() || 'index.html';
    if (this.currentPath === '') this.currentPath = 'index.html';

    this.init();
    this.enhanceForPilotUsers().catch((err) => {
      console.warn('Unable to resolve pilot menu items:', err);
    });
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
    this.listEl = list;
    
    this.renderItems();

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

  renderItems() {
    if (!this.listEl) {
      return;
    }

    this.listEl.innerHTML = '';
    this.items.forEach((item) => {
      const link = document.createElement('a');
      link.href = item.url;
      link.className = 'app-menu-link';
      link.textContent = item.label;

      if (this.isActivePath(item.url)) {
        link.classList.add('is-active');
      }

      this.listEl.appendChild(link);
    });
  }

  async enhanceForPilotUsers() {
    if (!this.listEl) {
      return;
    }

    const username = await this.fetchCurrentUsername();
    if (!username || !this.pilotUsers.has(username)) {
      return;
    }

    const pilotAlreadyPresent = this.items.some((i) => i.url === 'fieldInspection.html');
    if (pilotAlreadyPresent) {
      return;
    }

    this.items = [...this.items, ...this.pilotItems];
    this.renderItems();
  }

  async fetchCurrentUsername() {
    const hostname = window.location.hostname || '';
    const isLocalhost =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '';
    const apiBase = isLocalhost ? 'http://127.0.0.1:5000' : '';

    const response = await fetch(`${apiBase}/api/auth/me`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data?.username || null;
  }
}

