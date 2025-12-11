class SideCart extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
    this.querySelector('#SideCart-Overlay').addEventListener('click', this.close.bind(this));
    this.setCartLink();
  }

  connectedCallback() {
    this.toggleCheckoutButton();
  }

  setCartLink() {
    const cartLink = document.querySelector('[data-cart-link]');
    if (!cartLink) return;
    cartLink.setAttribute('role', 'button');
    cartLink.setAttribute('aria-haspopup', 'dialog');
    cartLink.addEventListener('click', (event) => {
      event.preventDefault();
      this.open(cartLink);
    });
    cartLink.addEventListener('keydown', (event) => {
      if (event.code.toUpperCase() === 'SPACE') {
        event.preventDefault();
        this.open(cartLink);
      }
    });
  }

    performRecommendations() {
    const recommendationsHolder = this.querySelector(
      '[data-side-cart-upsells]'
    );
    if (!recommendationsHolder || this.recommendationsPerformed)
      return;
    this.recommendationsPerformed = true;

    fetch(recommendationsHolder.dataset.url)
      .then(response => response.text())
      .then(text => {
        const recommendations = new DOMParser()
          .parseFromString(text, 'text/html')
          .querySelector('[data-side-cart-upsells]').outerHTML;
        recommendationsHolder.outerHTML = recommendations;
      });
  }

  open(opener) {
    if (opener) this.setActiveElement(opener);
    this.handleSideCartNote();
    setTimeout(() => { this.classList.add('is-visible'); });
    this.addEventListener('transitionend', () => { this.focusOnSideCart(); }, { once: true });
    document.body.classList.add('overflow-hidden');
    this.performRecommendations();
  }

  close() {
    this.classList.remove('is-visible');
    removeTrapFocus(this.activeElement);
    document.body.classList.remove('overflow-hidden');
  }

  handleSideCartNote() {
    const CartNote = this.querySelector('[id^="Details-"] summary');
    if (CartNote && !CartNote.hasAttribute('role')) {
      CartNote.setAttribute('role', 'button');
      CartNote.setAttribute('aria-expanded', 'false');
      if (CartNote.nextElementSibling.getAttribute('id')) {
        CartNote.setAttribute('aria-controls', CartNote.nextElementSibling.id);
      }
      CartNote.addEventListener('click', (event) => {
        event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
      });
      CartNote.parentElement.addEventListener('keyup', OnKeyUpEscape);

    }
  }

  focusOnSideCart() {
    const containerToTrapFocusOn = this.classList.contains('is-empty') ? this.querySelector('.side-cart__inner-empty') : document.getElementById('SideCart');
    const focusElement = this.querySelector('.side-cart__inner') || this.querySelector('[side-cart__close]');
    trapFocus(containerToTrapFocusOn, focusElement);
  }

  renderContents(parsedState) {
    this.querySelector('.side-cart__inner').classList.contains('is-empty') && this.querySelector('.side-cart__inner').classList.remove('is-empty');
    this.productId = parsedState.id;
    this.getSectionsToRender().forEach((section) => {
      const sectionElement = section.selector ? document.querySelector(section.selector) : document.getElementById(section.id);
      if (!sectionElement) return;
      sectionElement.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);

      });

    setTimeout(() => {
      this.querySelector('#SideCart-Overlay').addEventListener('click', this.close.bind(this));
      this.open();
    });
  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }

  getSectionsToRender() {
    return [
      {
        id: 'side-cart',
        selector: '#SideCart',
      },
      {
        id: 'cart-counter',
      },
    ];
  }

  setActiveElement(element) {
    this.activeElement = element;
  }

  toggleCheckoutButton() {
    this.addEventListener('change', event => {
      if (event.target.getAttribute('name') !== 'terms') return;
      this.querySelector('[name="checkout"]')?.classList.toggle('not-allowed', !event.target.checked);
    });
  }
}

customElements.define('side-cart', SideCart);

class SideCartItems extends CartItems {
    constructor() {
    super();
    this.sideCart = document.querySelector('side-cart');
  }

    performRecommendations() {
    this.sideCart.recommendationsPerformed = false;
    this.sideCart.performRecommendations();
  }

  getSectionsToRender() {
    return [
      {
        id: 'SideCart',
        section: 'side-cart',
        selector: '.side-cart__inner',
      },
      {
        id: 'cart-counter',
        section: 'cart-counter',
        selector: '.shopify-section',
      },
    ];
  }
}

customElements.define('side-cart-items', SideCartItems);


class ShippingBar extends HTMLElement {
  constructor() {
    super();
    this.currentCurrency = Shopify.currency.active;
    this.conversionRate = Shopify.currency.rate;
    this.threshold = this.dataset.threshold;
    this.convertedThreshold = 0;
    this.totalPrice = this.dataset.totalPrice;
    this.moneyFormat = this.dataset.moneyFormat;
    this.empty = this.dataset.empty === 'true';
    this.showCurrencyCode = this.dataset.showCurrencyCode === 'true';
  }

  connectedCallback() {
    this.calculateConvertedPrices();
    if (this.empty) {
      this.emptyText = this.querySelector('[data-empty-text]');
      this.showEmptyText();
      return;
    }
    this.successText = this.querySelector('[data-success-text]');
    this.progressText = this.querySelector('[data-progress-text]');
    this.progressBar = this.querySelector('[data-progress-bar]');

    const thresholdIsPassed =
      Number(this.totalPrice) > Number(this.threshold);
    if (!thresholdIsPassed && Number(this.threshold) > 0) {
      this.showProgress();
      return;
    }
    // this.progressBar.style.width = '100%';
    this.progressBar.parentElement.style.setProperty('--width', `100%`);

    this.progressBar.parentElement.classList.remove('hidden');
    this.successText.classList.remove('hidden');
  }

  showEmptyText() {
    this.emptyText.innerHTML = this.emptyText.innerHTML.replace(
      '[amount]',
      this.getFormattedPrice(this.threshold)
    );
    this.emptyText.classList.remove('hidden');
  }

  calculateConvertedPrices() {
    this.threshold = (
      this.threshold * (this.conversionRate || 1)
    ).toFixed(0);
  }

  showProgress() {
    // Calculate progress percent
    const progressPercent = (this.totalPrice * 100) / this.threshold;
    // this.progressBar.style.width = `${progressPercent}%`;
    this.progressBar.parentElement.style.setProperty('--width', `${progressPercent}%`);
    // Replace price
    const progressText = this.progressText.innerHTML.replace(
      '[amount]',
      this.getFormattedPrice(this.threshold - this.totalPrice)
    );
    this.progressText.innerHTML = progressText;

    this.progressBar.parentElement.classList.remove('hidden');
    this.progressText.classList.remove('hidden');
  }

  getFormattedPrice(price) {
    const formattedPrice = Shopify.formatMoney(
      price,
      this.moneyFormat
    );
    return this.showCurrencyCode
      ? `${formattedPrice} ${this.currentCurrency}`
      : formattedPrice;
  }
}

customElements.define('shipping-bar', ShippingBar);



