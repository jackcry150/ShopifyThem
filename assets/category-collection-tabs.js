class CategoryCollectionTabs extends HTMLElement {
  connectedCallback() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    this.tabs = Array.from(this.querySelectorAll('[role="tab"]'));
    this.panels = Array.from(this.querySelectorAll('[role="tabpanel"]'));
    this.activeHeading = this.querySelector('[data-active-heading]');

    if (!this.tabs.length) return;

    this.tabs.forEach((tab) => {
      tab.addEventListener('click', () => this.activateTab(tab));
      tab.addEventListener('focus', () => this.activateTab(tab));
      tab.addEventListener('keydown', (event) => this.handleKeydown(event, tab));

      if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        tab.addEventListener('mouseenter', () => this.activateTab(tab));
      }
    });

    if (window.Shopify && window.Shopify.designMode) {
      this.addEventListener('shopify:block:select', (event) => {
        const tab = this.querySelector('[role="tab"][data-block-id="' + event.detail.blockId + '"]');
        if (tab) this.activateTab(tab, { focus: true });
      });
    }
  }

  activateTab(tab, options = {}) {
    if (!tab) return;

    const targetPanelId = tab.getAttribute('aria-controls');

    this.tabs.forEach((item) => {
      const isActive = item === tab;
      item.setAttribute('aria-selected', String(isActive));
      item.setAttribute('tabindex', isActive ? '0' : '-1');
      item.classList.toggle('is-active', isActive);
    });

    this.panels.forEach((panel) => {
      const isActive = panel.id === targetPanelId;
      panel.hidden = !isActive;
      panel.classList.toggle('is-active', isActive);
    });

    if (this.activeHeading) {
      this.activeHeading.textContent = tab.textContent.trim();
    }

    if (options.focus) tab.focus({ preventScroll: true });
  }

  handleKeydown(event, currentTab) {
    const currentIndex = this.tabs.indexOf(currentTab);
    const handledKeys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];

    if (!handledKeys.includes(event.key)) return;

    let targetIndex = currentIndex;

    if (event.key === 'ArrowRight') targetIndex = (currentIndex + 1) % this.tabs.length;
    if (event.key === 'ArrowLeft') targetIndex = (currentIndex - 1 + this.tabs.length) % this.tabs.length;
    if (event.key === 'Home') targetIndex = 0;
    if (event.key === 'End') targetIndex = this.tabs.length - 1;

    event.preventDefault();
    this.activateTab(this.tabs[targetIndex], { focus: true });
  }
}

if (!customElements.get('category-collection-tabs')) {
  customElements.define('category-collection-tabs', CategoryCollectionTabs);
}