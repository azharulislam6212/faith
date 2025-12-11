class CartRemoveButton extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('click', (event) => {
      event.preventDefault();
      const cartItems = this.closest('cart-items') || this.closest('side-cart-items');
      cartItems.updateQuantity(this.dataset.index, 0, event);
    });
  }
}

customElements.define('cart-remove-button', CartRemoveButton);

class CartItems extends HTMLElement {
  constructor() {
    super();
    this.lineItemStatusElement = document.querySelector('[data-cart-line-item-status]') || document.querySelector('[data-live-item-text-status]');
    const debouncedOnChange = debounce((event) => { this.onChange(event); }, ON_CHANGE_DEBOUNCE_TIMER);
    this.addEventListener('change', debouncedOnChange.bind(this));
  }

  cartUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.cartUpdateUnsubscriber = subscribe(EVENT_TYPES.cartUpdate, (event) => {
      if (event.source === 'cart-items') {
        return;
      }
      return this.onCartUpdate();
    });
  }

  disconnectedCallback() {
    if (this.cartUpdateUnsubscriber) {
      this.cartUpdateUnsubscriber();
    }
  }

  resetQuantityInput(id) {
    const input = this.querySelector(`#Quantity-${id}`);
    if (input != null) {
      input.value = input.getAttribute('value');
    }
    this.isEnterPressed = false;
  }

  applyValidation(event, index, message) {
    event.target.setCustomValidity(message);
    event.target.reportValidity();
    this.resetQuantityInput(index);
    event.target.select();
  }

  checkQuantity(event) {
    const inputValue = parseInt(event.target.value);
    const index = event.target.dataset.index;
    let message = '';

    if (inputValue < event.target.dataset.min) {
      message = theme.quickOrderListStrings.min_error.replace('[min]', event.target.dataset.min);
    } else if (inputValue > parseInt(event.target.max)) {
      message = theme.quickOrderListStrings.max_error.replace('[max]', event.target.max);
    } else if (inputValue % parseInt(event.target.step) !== 0) {
      message = theme.quickOrderListStrings.step_error.replace('[step]', event.target.step);
    }

    if (message) {
      this.applyValidation(event, index, message);
    } else {
      event.target.setCustomValidity('');
      event.target.reportValidity();
      this.updateQuantity(
        index,
        inputValue,
        event,
        document.activeElement.getAttribute('name'),
        event.target.dataset.quantityVariantId
      );
    }
  }

  onChange(event) {
    this.checkQuantity(event);
  }

  onCartUpdate() {
    if (this.tagName === 'SIDE-CART-ITEMS') {
      return fetch(`${theme.routes.cart_url}?section_id=side-cart`)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(responseText, 'text/html');
          const selectors = ['side-cart-items'];
          for (const selector of selectors) {
            const targetElement = document.querySelector(selector);
            const sourceElement = html.querySelector(selector);
            if (targetElement && sourceElement) {
              targetElement.replaceWith(sourceElement);
            }
          }
        })
        .catch((e) => {
          console.error(e);
        });
    } else {
      return fetch(`${theme.routes.cart_url}?section_id=main-cart-items`)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(responseText, 'text/html');
          const sourceQty = html.querySelector('cart-items');
          this.innerHTML = sourceQty.innerHTML;
        })
        .catch((e) => {
          console.error(e);
        });
    }
  }
  
  getSectionsToRender() {
    return [
      {
        id: 'main-cart-items',
        section: document.getElementById('main-cart-items').dataset.id,
        selector: '.js-contents',
      },
      {
        id: 'cart-counter',
        section: 'cart-counter',
        selector: '.shopify-section',
      },
      {
        id: 'cart-live-region-text',
        section: 'cart-live-region-text',
        selector: '.shopify-section',
      },
      {
        id: 'main-cart-footer',
        section: document.getElementById('main-cart-footer').dataset.id,
        selector: '.js-contents',
      },
    ];
  }

  async updateQuantity(line, quantity, event, name, variantId) {
    this.showLoading(line);
    try {
      const body = JSON.stringify({
        line,
        quantity,
        sections: this.getSectionsToRender().map((section) => section.section),
        sections_url: window.location.pathname,
      });
      const eventTarget = event.currentTarget instanceof CartRemoveButton ? 'clear' : 'change';
      const response = await fetch(`${theme.routes.cart_change_url}`, { ...fetchConfig(), ...{ body } });
      const state = await response.text();
      const parsedState = JSON.parse(state);
      CartTracker.measure(`${eventTarget}:paint-updated-sections"`, () => {
        this.updateCart(parsedState, line, name);
      });
      CartTracker.measureFromEvent(`${eventTarget}:user-action`, event);
      publish(EVENT_TYPES.cartUpdate, { source: 'cart-items', cartData: parsedState, variantId: variantId });

    } catch (error) {
      this.querySelectorAll('.loading-overlay').forEach((overlay) => overlay.classList.add('hidden'));
      const errors = document.querySelector('[data-cart-errors]') || document.querySelector('[data-side-cart-errors]');
      errors.textContent = theme.cartStrings.error;
    } finally {
      this.hideLoading(line);
    }
  }

  updateLiveRegions(line, message) {
    const lineItemError =
      document.getElementById(`Line-item-error-${line}`) || document.getElementById(`SideCart-LineItemError-${line}`);
    if (lineItemError) lineItemError.querySelector('.cart-item__error-text').textContent = message;

    this.lineItemStatusElement.setAttribute('aria-hidden', true);

    const cartStatus =
      document.querySelector('[data-cart-live-region-text]') || document.querySelector('[data-live-region-text-error]');
    cartStatus.setAttribute('aria-hidden', false);

    setTimeout(() => {
      cartStatus.setAttribute('aria-hidden', true);
    }, 1000);
  }

  updateCart(parsedState, line, name) {
    const quantityElement =
      document.getElementById(`Quantity-${line}`) || document.getElementById(`Drawer-quantity-${line}`);
    const items = document.querySelectorAll('.cart-item');

    if (parsedState.errors) {
      quantityElement.value = quantityElement.getAttribute('value');
      this.updateLiveRegions(line, parsedState.errors);
      return;
    }

    this.classList.toggle('is-empty', parsedState.item_count === 0);
    const cartDrawerWrapper = document.querySelector('side-cart');
    const cartheader= document.querySelector('[data-cart-header]');

    if (cartheader) cartheader.classList.toggle('is-empty', parsedState.item_count === 0);
    if (cartDrawerWrapper) cartDrawerWrapper.classList.toggle('is-empty', parsedState.item_count === 0);

    this.getSectionsToRender().forEach((section) => {
      const elementToReplace = document.getElementById(section.id)?.querySelector(section.selector) || document.getElementById(section.id);
      elementToReplace.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.section], section.selector);
    });
    const updatedValue = parsedState.items[line - 1] ? parsedState.items[line - 1].quantity : undefined;
    let message = '';
    if (items.length === parsedState.items.length && updatedValue !== parseInt(quantityElement.value)) {
      if (typeof updatedValue === 'undefined') {
        message = theme.cartStrings.error;
      } else {
        message = theme.cartStrings.quantityError.replace('[quantity]', updatedValue);
      }
    }
    this.updateLiveRegions(line, message);
    this.handleFocus(line, name, parsedState, cartDrawerWrapper);
    this.performRecommendations();
  }

  handleFocus(line, name, parsedState, cartDrawerWrapper) {
    const lineItem =
      document.getElementById(`CartItem-${line}`) ||
      document.getElementById(`SideCart-Item-${line}`);

    if (lineItem && lineItem.querySelector(`[name="${name}"]`)) {
      const focusEl = lineItem.querySelector(`[name="${name}"]`);
      cartDrawerWrapper ? trapFocus(cartDrawerWrapper, focusEl) : focusEl.focus();
    } else if (parsedState.item_count === 0 && cartDrawerWrapper) {
      trapFocus(cartDrawerWrapper.querySelector('.side-cart__inner-empty'), cartDrawerWrapper.querySelector('a'));
    } else if (document.querySelector('.cart-item') && cartDrawerWrapper) {
      trapFocus(cartDrawerWrapper, document.querySelector('.cart-item__name'));
    }
  }

  getSectionInnerHTML(html, selector) {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }

  showLoading(line) {
    const mainCartItems = document.getElementById('main-cart-items') || document.querySelector('[data-side-cart-items]');
    mainCartItems.classList.add('cart__items--disabled');

    const cartItemElements = this.querySelectorAll(`#CartItem-${line} .loading-overlay`);
    const cartDrawerItemElements = this.querySelectorAll(`#SideCart-Item-${line} .loading-overlay`);

    [...cartItemElements, ...cartDrawerItemElements].forEach((overlay) => overlay.classList.remove('hidden'));

    document.activeElement.blur();
    this.lineItemStatusElement.setAttribute('aria-hidden', false);
  }


  hideLoading(line) {
    const mainCartItems = document.getElementById('main-cart-items') || document.querySelector('[data-side-cart-items]');
    mainCartItems.classList.remove('cart__items--disabled');

    const cartItemElements = this.querySelectorAll(`#CartItem-${line} .loading-overlay`);
    const cartDrawerItemElements = this.querySelectorAll(`#SideCart-Item-${line} .loading-overlay`);

    cartItemElements.forEach((overlay) => overlay.classList.add('hidden'));
    cartDrawerItemElements.forEach((overlay) => overlay.classList.add('hidden'));
  }
}

customElements.define('cart-items', CartItems);

if (!customElements.get('cart-note')) {
  customElements.define(
    'cart-note',
    class CartNote extends HTMLElement {
      constructor() {
        super();
        this.addEventListener(
          'input',
          debounce((event) => {
            const body = JSON.stringify({ note: event.target.value });
            fetch(`${theme.routes.cart_update_url}`, { ...fetchConfig(), ...{ body } })
              .then(() => CartTracker.measureFromEvent('note-update:user-action', event));
          }, ON_CHANGE_DEBOUNCE_TIMER)
        );
      }
    }
  );
}

if (!customElements.get('estimate-shipping-rate')) {

  class EstimateShippingRate extends HTMLElement {
    constructor() {
      super();
      this.shippingCountry = null;
      this.countryState = null;
      this.shippingCountryZip = null;
      this.shippingRatePackage = null;
      this.shippingAddressWrapper = null;
      this.shippingAddressCount = null;
      this.button = null;
    }

    connectedCallback() {
      // Scope elements inside component
      this.shippingCountry = this.querySelector("#AddressCountry_Shipping");
      this.countryState = this.querySelector("#AddressProvince_shipping");
      this.shippingCountryZip = this.querySelector("#ShippingAddressZip");
      this.shippingRatePackage = this.querySelector(".shipping_rate_package");
      this.shippingAddressWrapper = this.querySelector(".shipping_rate_message");
      this.shippingAddressCount = this.querySelector(".shipping_address_count");
      this.button = this.querySelector(".shipping_calc_save");

      // Shopify Region Selector
      if (Shopify && Shopify.CountryProvinceSelector) {
        new Shopify.CountryProvinceSelector("AddressCountry_Shipping", "AddressProvince_shipping", { hideElement: "AddressProvinceContainerNewShiping" }
        );
      }

      // Event listener
      this.button.addEventListener("click", () => this.calculateRates());
    }

    disconnectedCallback() {
      this.button.removeEventListener("click", () => this.calculateRates());
    }

    async calculateRates() {
      this.shippingRatePackage.innerHTML = "";

      // Validate
      if (this.shippingCountry.value === "---") {
        this.shippingAddressWrapper.classList.add("no-js-inline");
        this.shippingRatePackage.innerHTML = `<p class="error-message">${theme.shipping.country_label}</p>`;
        return;
      }

      // ZIP validation
      if (!this.shippingCountryZip.value.trim()) {
        this.shippingAddressWrapper.classList.add("no-js-inline");
        this.shippingRatePackage.innerHTML = `<p class="error-message">${theme.shipping.zip_required_label}</p>`;
        return;
      }

      // Loader start
      this.button.classList.add("loading");
      this.button.querySelector(".loading-overlay").classList.remove("hidden");

      try {
        const response = await fetch(
          `/cart/shipping_rates.json?shipping_address%5Bzip%5D=${this.shippingCountryZip.value}&shipping_address%5Bcountry%5D=${this.shippingCountry.value}&shipping_address%5Bprovince%5D=${this.countryState.value}`
        );

        if (!response.ok) {
          throw new Error(theme.shipping.wrong_message);
        }

        const data = await response.json();

        // Success UI
        this.toggleLoader(false);
        this.shippingAddressWrapper.classList.remove("no-js-inline");
        this.shippingAddressCount.innerText = data.shipping_rates.length;

        data.shipping_rates.forEach(rate => {
          const text = document.createElement("p");
          text.className = "mb-0";
          text.innerText = `${rate.name}: ${rate.price}`;
          this.shippingRatePackage.appendChild(text);
        });

      } catch (err) {
        // Error UI
        this.toggleLoader(false);
        this.shippingAddressWrapper.classList.add("no-js-inline");
        this.shippingRatePackage.innerHTML = `<p class="error-message">${err.message || err}</p>`;
      }
    }

    toggleLoader(enable) {
      this.button.classList.toggle("loading", enable);
      this.button.querySelector(".loading-overlay").classList.toggle("hidden", !enable);
    }
  }

  customElements.define("estimate-shipping-rate", EstimateShippingRate);

}


class GiftWrapping extends HTMLElement {
  constructor() {
    if (
      (super(),
        (this.giftWrapId = this.dataset.giftWrapId),
        (this.itemInCart = parseInt(this.getAttribute("item-in-cart"))),
        (this.itemsInCart = parseInt(this.getAttribute("items-in-cart"))))
    ) return this.removeGiftWrap();
    this.sideCart = document.querySelector('side-cart');
    const debouncedOnChange = debounce(this.onChange.bind(this), 10);
    this.addEventListener("change", debouncedOnChange);
  }

 performRecommendations() {
    this.sideCart.recommendationsPerformed = false;
    this.sideCart.performRecommendations();
  }

  onChange(event) {
    event.target.checked && (this.addGiftWrap());
  }
  addGiftWrap() {
    const body = JSON.stringify({
      updates: { [this.giftWrapId]: this.itemInCart },
      sections:
        this.getAttribute("gift-template") === "cart"
          ? this.getcartSectionsToRender().map((section) => section.section)
          : this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname,
    });
    this.fetchGiftWrap(body);
  }
  removeGiftWrap() {
    const body = JSON.stringify({
      updates: { [this.giftWrapId]: 0 },
      sections:
        this.getAttribute("gift-template") === "cart"
          ? this.getcartSectionsToRender().map((section) => section.section)
          : this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname,
    });
    this.fetchGiftWrap(body);
  }

  fetchGiftWrap(body) {
    fetch(`${theme.routes.cart_update_url}`, { ...fetchConfig(), body })
      .then((response) => response.text())
      .then((state) => {
        const parsedState = JSON.parse(state);

        const sectionsToRender =
          this.getAttribute("gift-template") === "cart"
            ? this.getcartSectionsToRender()
            : this.getSectionsToRender();

        sectionsToRender.forEach((section) => {
          const elementToReplace =
            document.getElementById(section.id).querySelector(section.selector) ||
            document.getElementById(section.id);

          elementToReplace.innerHTML = this.getSectionInnerHTML(
            parsedState.sections[section.section],
            section.selector
          );
        });

        publish(EVENT_TYPES.cartUpdate, {
          source: "gift-wrapping",
          cartData: parsedState
        });

        this.performRecommendations();
      })
      .catch((error) => {
        console.log(error);
      });
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
      }
    ];
  }
  getcartSectionsToRender() {
    return [
      {
        id: 'main-cart-items',
        section: document.getElementById('main-cart-items').dataset.id,
        selector: '.js-contents',
      },
      {
        id: 'cart-counter',
        section: 'cart-counter',
        selector: '.shopify-section',
      },
      {
        id: 'cart-live-region-text',
        section: 'cart-live-region-text',
        selector: '.shopify-section',
      },
      {
        id: 'main-cart-footer',
        section: document.getElementById('main-cart-footer').dataset.id,
        selector: '.js-contents',
      }
    ];
  }
  getSectionInnerHTML(html, selector2) {
    return new DOMParser().parseFromString(html, "text/html").querySelector(selector2).innerHTML;
  }
}
customElements.define("gift-wrapping", GiftWrapping);



