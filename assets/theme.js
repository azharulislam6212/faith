/**
 * theme.js — faith template
 * Sections:
 *  1. Constants & Events
 *  2. Pub/Sub
 *  3. Utilities
 *  4. Accessibility helpers (focus trap, details handling)
 *  5. Shopify core helpers & money formatter
 *  6. Performance tracer (CartTracker)
 *  7. Small UI helpers (hover text) 
 *  8. Components (customElements)
 */



/* ==========================================================================
   1. Constants & Events
   ========================================================================== */

const ON_CHANGE_DEBOUNCE_TIMER = 300;

const EVENT_TYPES = {
  cartUpdate: 'cart-update',
  quantityUpdate: 'quantity-update',
  optionValueSelectionChange: 'option-value-selection-change',
  variantChange: 'variant-change',
  cartError: 'cart-error',
};

/* ==========================================================================
   2. Pub/Sub (simple)
   ========================================================================== */

let subscribers = {};

const subscribe = (eventName, callback) => {
  if (!subscribers[eventName]) subscribers[eventName] = [];
  subscribers[eventName].push(callback);
  return () => {
    subscribers[eventName] = subscribers[eventName].filter(cb => cb !== callback);
  };
};

const publish = (eventName, data) => {
  if (!subscribers[eventName]) return Promise.resolve();
  try {
    const promises = subscribers[eventName].map(cb => cb(data));
    return Promise.all(promises);
  } catch (err) {
    return Promise.reject(err);
  }
};


/* ==========================================================================
   3. Utilities
   ========================================================================== */

const getFocusableElements = container => Array.from(
  container.querySelectorAll(
    "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe"
  )
);

const SectionId = class {
  static #separator = '__';
  static parseId(qualifiedSectionId) {
    return qualifiedSectionId.split(SectionId.#separator)[0];
  }
  static parseSectionName(qualifiedSectionId) {
    return qualifiedSectionId.split(SectionId.#separator)[1];
  }
  static getIdForSection(sectionId, sectionName) {
    return `${sectionId}${SectionId.#separator}${sectionName}`;
  }
};

const HTMLUpdate = class {
  static viewTransition(oldNode, newContent, preCallbacks = [], postCallbacks = []) {
    preCallbacks?.forEach(cb => cb(newContent));
    const wrapper = document.createElement('div');
    HTMLUpdate.setInnerHTML(wrapper, newContent.outerHTML);
    const newNode = wrapper.firstChild;

    const uniqueKey = Date.now();
    oldNode.querySelectorAll('[id], [form]').forEach(el => {
      if (el.id) el.id = `${el.id}-${uniqueKey}`;
      if (el.form) el.setAttribute('form', `${el.form.getAttribute('id')}-${uniqueKey}`);
    });

    oldNode.parentNode.insertBefore(newNode, oldNode);
    oldNode.style.display = 'none';

    postCallbacks?.forEach(cb => cb(newNode));

    setTimeout(() => oldNode.remove(), 500);
  }

  static setInnerHTML(el, html) {
    el.innerHTML = html;
    // Re-execute scripts
    el.querySelectorAll('script').forEach(oldScript => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
      newScript.appendChild(document.createTextNode(oldScript.innerHTML));
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });
  }
};

window.pauseAllMedia = (element = document) => {
  element.querySelectorAll('.js-youtube').forEach(video => {
    try {
      video.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
    } catch (e) { }
  });

  element.querySelectorAll('.js-vimeo').forEach(video => {
    try {
      video.contentWindow.postMessage('{"method":"pause"}', '*');
    } catch (e) { }
  });

  // element.querySelectorAll('video').forEach(video => video.pause());

  element.querySelectorAll('product-model').forEach(model => {
    if (model.modelViewerUI) model.modelViewerUI.pause();
  });
};

const resumeMedia = (element = document) => {
  element.querySelectorAll('.js-youtube, .js-vimeo, video').forEach(video => {
    if (!isInViewport(video)) return;

    const postMessage =
      video.classList.contains('js-youtube') && video.tagName !== 'VIDEO'
        ? '{"event":"command","func":"playVideo","args":""}'
        : video.classList.contains('js-vimeo') && video.tagName !== 'VIDEO'
          ? '{"method":"play"}'
          : null;

    if (postMessage) {
      try { video.contentWindow.postMessage(postMessage, '*'); } catch (e) { }
    }

    if (video.tagName === 'VIDEO') {
      try { video.play(); } catch (e) { }
    }
  });
};

const serializeForm = form => {
  const obj = {};
  const formData = new FormData(form);
  for (const key of formData.keys()) obj[key] = formData.get(key);
  return JSON.stringify(obj);
};

const deepClone = obj => JSON.parse(JSON.stringify(obj));

const handleize = str => (str || '').replace(/[ /_]/g, '-').toLowerCase();

const decode = str => decodeURIComponent((str || '')).replace(/\+/g, ' ');

const getOffsetTop = el => {
  let offsetTop = 0;
  while (el) {
    if (!isNaN(el.offsetTop)) offsetTop += el.offsetTop;
    el = el.offsetParent;
  }
  return offsetTop;
};

const debounce = (fn, wait) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
};

const Throttle = (fn, delay) => {
  let lastCall = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastCall < delay) return;
    lastCall = now;
    return fn(...args);
  };
};

const fetchConfig = (type = 'json') => ({
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Accept: `application/${type}`,
  },
});

function isInViewport(el) {
  if (!el || typeof el.getBoundingClientRect !== 'function') return false;
  const rect = el.getBoundingClientRect();
  return rect.top < (window.innerHeight || document.documentElement.clientHeight) && rect.bottom >= 0;
}


/* ==========================================================================
   4. Accessibility helpers (focus trap & details)
   ========================================================================== */

const trapFocusHandlers = {};

const removeTrapFocus = (elementToFocus = null) => {
  document.removeEventListener('focusin', trapFocusHandlers.focusin);
  document.removeEventListener(
    'focusout',
    trapFocusHandlers.focusout
  );
  document.removeEventListener('keydown', trapFocusHandlers.keydown);

  if (elementToFocus) elementToFocus.focus();
};

const trapFocus = (container, elementToFocus = container) => {
  var elements = getFocusableElements(container);
  var first = elements[0];
  var last = elements[elements.length - 1];

  removeTrapFocus();

  trapFocusHandlers.focusin = event => {
    if (
      event.target !== container &&
      event.target !== last &&
      event.target !== first
    )
      return;

    document.addEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.focusout = function () {
    document.removeEventListener(
      'keydown',
      trapFocusHandlers.keydown
    );
  };

  trapFocusHandlers.keydown = function (event) {
    if (event.code.toUpperCase() !== 'TAB') return; // If not TAB key
    // On the last focusable element and tab forward, focus the first element.
    if (event.target === last && !event.shiftKey) {
      event.preventDefault();
      first.focus();
    }

    //  On the first focusable element and tab backward, focus the last element.
    if (
      (event.target === container || event.target === first) &&
      event.shiftKey
    ) {
      event.preventDefault();
      last.focus();
    }
  };

  document.addEventListener('focusout', trapFocusHandlers.focusout);
  document.addEventListener('focusin', trapFocusHandlers.focusin);

  elementToFocus.focus();
};

const OnKeyUpEscape = (event) => {
  if (event.code.toUpperCase() !== 'ESCAPE') return;

  const openDetails = event.target.closest('details[open]');
  if (!openDetails) return;

  const summaryEl = openDetails.querySelector('summary');
  openDetails.removeAttribute('open');
  summaryEl.setAttribute('aria-expanded', false);
  summaryEl.focus();
};

document.querySelectorAll('[id^="Details-"] summary').forEach(summary => {
  summary.setAttribute('role', 'button');
  summary.setAttribute('aria-expanded', summary.parentNode.hasAttribute('open'));

  const contentEl = summary.nextElementSibling;
  if (contentEl && contentEl.id) summary.setAttribute('aria-controls', contentEl.id);

  summary.addEventListener('click', event => {
    const details = event.currentTarget.closest('details');
    const isOpen = details.hasAttribute('open');
    event.currentTarget.setAttribute('aria-expanded', !isOpen);
  });

  summary.parentElement.addEventListener('keyup', OnKeyUpEscape);
});

/* Initialize trap focus on open details */
document.querySelectorAll('.disclosure-has-popup').forEach(details => {
  details.addEventListener('toggle', () => {
    if (details.hasAttribute('open')) trapFocus.trap(details);
  });
});


/* ==========================================================================
   5. Shopify core helpers & formatMoney
   ========================================================================== */

if (typeof window.Shopify == 'undefined') {
  window.Shopify = window.Shopify || {};
}

Shopify.bind = function (fn, scope) {
  return function () { return fn.apply(scope, arguments); };
};

Shopify.setSelectorByValue = function (selector, value) {
  for (var i = 0, count = selector.options.length; i < count; i++) {
    var option = selector.options[i];
    if (value == option.value || value == option.innerHTML) {
      selector.selectedIndex = i;
      return i;
    }
  }
};

Shopify.addListener = function (target, eventName, callback) {
  target.addEventListener
    ? target.addEventListener(eventName, callback, false)
    : target.attachEvent('on' + eventName, callback);
};

Shopify.postLink = function (path, options) {
  options = options || {};
  var method = options['method'] || 'post';
  var params = options['parameters'] || {};
  var form = document.createElement('form');
  form.setAttribute('method', method);
  form.setAttribute('action', path);
  for (var key in params) {
    var hiddenField = document.createElement('input');
    hiddenField.setAttribute('type', 'hidden');
    hiddenField.setAttribute('name', key);
    hiddenField.setAttribute('value', params[key]);
    form.appendChild(hiddenField);
  }
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};

Shopify.CountryProvinceSelector = function (country_domid, province_domid, options) {
  this.countryEl = document.getElementById(country_domid);
  this.provinceEl = document.getElementById(province_domid);
  this.provinceContainer = document.getElementById(options['hideElement'] || province_domid);

  Shopify.addListener(this.countryEl, 'change', Shopify.bind(this.countryHandler, this));
  this.initCountry();
  this.initProvince();
};

Shopify.CountryProvinceSelector.prototype = {
  initCountry: function () {
    var value = this.countryEl.getAttribute('data-default');
    Shopify.setSelectorByValue(this.countryEl, value);
    this.countryHandler();
  },
  initProvince: function () {
    var value = this.provinceEl.getAttribute('data-default');
    if (value && this.provinceEl.options.length > 0) Shopify.setSelectorByValue(this.provinceEl, value);
  },
  countryHandler: function () {
    var opt = this.countryEl.options[this.countryEl.selectedIndex];
    var raw = opt.getAttribute('data-provinces');
    var provinces = JSON.parse(raw);
    this.clearOptions(this.provinceEl);
    if (provinces && provinces.length == 0) {
      this.provinceContainer.style.display = 'none';
    } else {
      for (var i = 0; i < provinces.length; i++) {
        var opt = document.createElement('option');
        opt.value = provinces[i][0];
        opt.innerHTML = provinces[i][1];
        this.provinceEl.appendChild(opt);
      }
      this.provinceContainer.style.display = '';
    }
  },
  clearOptions: function (selector) {
    while (selector.firstChild) selector.removeChild(selector.firstChild);
  },
  setOptions: function (selector, values) {
    for (var i = 0, count = values.length; i < count; i++) {
      var opt = document.createElement('option');
      opt.value = values[i];
      opt.innerHTML = values[i];
      selector.appendChild(opt);
    }
  }
};

// Money format handler
Shopify.money_format = "${{amount_no_decimals}}";
Shopify.formatMoney = function (cents, format) {
  if (typeof cents == 'string') cents = cents.replace('.', '');
  var value = '';
  var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
  var formatString = (format || this.money_format);

  function defaultOption(opt, def) {
    return (typeof opt === 'undefined' ? def : opt);
  }

  function formatWithDelimiters(number, precision, thousands, decimal) {
    precision = defaultOption(precision, 2);
    thousands = defaultOption(thousands, ',');
    decimal = defaultOption(decimal, '.');

    if (isNaN(number) || number == null) return 0;
    number = (number / 100.0).toFixed(precision);
    var parts = number.split('.'),
      dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands),
      cents = parts[1] ? (decimal + parts[1]) : '';
    return dollars + cents;
  }

  var match = formatString.match(placeholderRegex);
  if (!match) return formatString;

  switch (match[1]) {
    case 'amount':
      value = formatWithDelimiters(cents, 2);
      break;
    case 'amount_no_decimals':
      value = formatWithDelimiters(cents, 0);
      break;
    case 'amount_with_comma_separator':
      value = formatWithDelimiters(cents, 2, '.', ',');
      break;
    case 'amount_no_decimals_with_comma_separator':
      value = formatWithDelimiters(cents, 0, '.', ',');
      break;
  }

  return formatString.replace(placeholderRegex, value);
};

/* ==========================================================================
   6. Performance tracer (CartTracker)
   ========================================================================== */

class CartTracker {
  static #metric_prefix = "cart-performance"

  static createStartingMarker(benchmarkName) {
    const metricName = `${CartTracker.#metric_prefix}:${benchmarkName}`
    return performance.mark(`${metricName}:start`);
  }

  static measureFromEvent(benchmarkName, event) {
    const metricName = `${CartTracker.#metric_prefix}:${benchmarkName}`
    const startMarker = performance.mark(`${metricName}:start`, {
      startTime: event.timeStamp
    });

    const endMarker = performance.mark(`${metricName}:end`);

    performance.measure(
      metricName,
      `${metricName}:start`,
      `${metricName}:end`
    );
  }

  static measureFromMarker(benchmarkName, startMarker) {
    const metricName = `${CartTracker.#metric_prefix}:${benchmarkName}`
    const endMarker = performance.mark(`${metricName}:end`);

    performance.measure(
      metricName,
      startMarker.name,
      `${metricName}:end`
    );
  }

  static measure(benchmarkName, callback) {
    const metricName = `${CartTracker.#metric_prefix}:${benchmarkName}`
    const startMarker = performance.mark(`${metricName}:start`);

    callback();

    const endMarker = performance.mark(`${metricName}:end`);

    performance.measure(
      metricName,
      `${metricName}:start`,
      `${metricName}:end`
    );
  }
}

/* ==========================================================================
   7. Small UI helpers
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  const addHoverText = () => {
    document.querySelectorAll(".button").forEach((button) => {
      if (button.querySelector(".hover--text")) return;
      const normalText = button.querySelector(".button--text");
      if (!normalText) return;
      const hoverText = normalText.cloneNode(true);
      hoverText.classList.replace("button--text", "hover--text");
      button.appendChild(hoverText);
    });
  };
  new MutationObserver(addHoverText).observe(document.body, { childList: true, subtree: true });
  addHoverText();
});

/* ==========================================================================
   8. Components (customElements)
   ========================================================================== */

/* -----------------------------
 Quantity Input
 ----------------------------- */
if (!customElements.get('quantity-input')) {
  customElements.define('quantity-input', class QuantityInput extends HTMLElement {
    constructor() {
      super();
      this.input = this.querySelector('input');
      this.changeEvent = new Event('change', { bubbles: true });
      this.input.addEventListener('change', this.onInputChange.bind(this));
      this.querySelectorAll('button').forEach((button) =>
        button.addEventListener('click', this.onButtonClick.bind(this))
      );
    }

    quantityUpdateUnsubscriber = undefined;

    connectedCallback() {
      this.validateQtyRules();
      this.quantityUpdateUnsubscriber = subscribe(EVENT_TYPES.quantityUpdate, this.validateQtyRules.bind(this));
    }

    disconnectedCallback() {
      if (this.quantityUpdateUnsubscriber) {
        this.quantityUpdateUnsubscriber();
      }
    }

    onInputChange(event) {
      this.validateQtyRules();
    }

    onButtonClick(event) {
      event.preventDefault();
      const previousValue = this.input.value;

      if (event.target.name === 'plus') {
        if (parseInt(this.input.dataset.min) > parseInt(this.input.step) && this.input.value == 0) {
          this.input.value = this.input.dataset.min;
        } else {
          this.input.stepUp();
        }
      } else {
        this.input.stepDown();
      }
      if (previousValue !== this.input.value) this.input.dispatchEvent(this.changeEvent);

      if (this.input.dataset.min === previousValue && event.target.name === 'minus') {
        this.input.value = parseInt(this.input.min);
      }
    }

    validateQtyRules() {
      const value = parseInt(this.input.value);
      if (this.input.min) {
        const buttonMinus = this.querySelector(".quantity__button[name='minus']");
        buttonMinus.classList.toggle('disabled', parseInt(value) <= parseInt(this.input.min));
      }
      if (this.input.max) {
        const max = parseInt(this.input.max);
        const buttonPlus = this.querySelector(".quantity__button[name='plus']");
        buttonPlus.classList.toggle('disabled', value >= max);
      }
    }
  }
  );
}

/* -----------------------------
   Announcement Drawer
   ----------------------------- */
if (!customElements.get('announcement-drawer')) {
  customElements.define('announcement-drawer', class AnnouncementDrawer extends HTMLElement {
    constructor() {
      super();
    }

    connectedCallback() {
      this.drawer = this.querySelector(".announcement-bar-drawer");
      this.toggler = this.querySelector(".announcement-bar-toggler");
      this.overlay = this.querySelector(".overlay");

      if (!this.drawer || !this.toggler || !this.overlay) return;

      this.toggler.addEventListener("click", () => {
        if (this.drawer.classList.contains("active")) {
          this.closeDrawer();
        } else {
          this.openDrawer();
        }
      });

      this.overlay.addEventListener("click", () => {
        this.closeDrawer();
      });
    }

    openDrawer() {
      this.drawer.setAttribute('aria-hidden', false);
      this.drawer.classList.add("active");
      this.toggler.classList.add("show");
      this.overlay.classList.add("show");
      document.body.style.overflow = "hidden";
    }

    closeDrawer() {
      this.drawer.setAttribute('aria-hidden', true);
      this.drawer.classList.remove("active");
      this.toggler.classList.remove("show");
      this.overlay.classList.remove("show");
      if (this.header) this.header.style.zIndex = "";
      document.body.style.overflow = "";
    }
  }
  );
}

/* -----------------------------
   Lazy loading video wrapper (fth-load-video)
   ----------------------------- */
if (!customElements.get('fth-load-video')) {
  customElements.define('fth-load-video', class FTHLazyLoadingVideo extends HTMLElement {
    constructor() {
      super(),
        (this.iframe = this.querySelector("iframe")),
        (this.template = this.querySelector("template")),
        (this.isMouseenter = !1);
    }
    loadVideo() {
      var t;
      this.iframe &&
        (this.iframe.setAttribute("src", this.iframe.getAttribute("data-src")),
          this.iframe.addEventListener(
            "load",
            function () {
              "youtube" == this.dataVideoType &&
                this.iframe.contentWindow.postMessage(
                  '{"event":"command","func":"playVideo","args":""}',
                  "*"
                ),
                "vimeo" == this.dataVideoType &&
                this.iframe.contentWindow.postMessage('{"method":"play"}', "*");
            }.bind(this)
          )),
        "local_video" == this.dataVideoType &&
        ((this.local_video = this.querySelector("video")),
          (t = this.local_video.querySelector("source").getAttribute("data-src")),
          (this.local_video.src = t));
    }
    execute() {
      Shopify.designMode
        ? this.loadVideo()
        : (["mousemove", "touchstart"].forEach(
          function (t) {
            document.querySelector("body").addEventListener(
              t,
              function (t) {
                this.isMouseenter || this.loadVideo(), (this.isMouseenter = !0);
              }.bind(this),
              { once: !0 }
            );
          }.bind(this)
        ),
          window.addEventListener(
            "scroll",
            function (t) {
              this.isMouseenter || this.loadVideo(), (this.isMouseenter = !0);
            }.bind(this),
            { once: !0 }
          ));
    }
    static get observedAttributes() {
      return ["data-video-type", "data-video-id"];
    }
    set dataVideoType(t) {
      this.setAttribute("data-video-type", t);
    }
    get dataVideoType() {
      return this.getAttribute("data-video-type");
    }
    set dataVideoId(t) {
      this.setAttribute("data-video-id", t);
    }
    get dataVideoId() {
      return this.getAttribute("data-video-id");
    }
    attributeChangedCallback(t, e, s) {
      e !== s && this.execute();
    }
    connectedCallback() {
      this.execute();
    }
    disconnectedCallback() { }
  });
}
/* -----------------------------
   FTHLoadMedia (main media lazy loader + YouTube/Vimeo/native control)
   ----------------------------- */

if (!customElements.get('fth-load-media')) {
  customElements.define('fth-load-media', class FTHLoadMedia extends HTMLElement {
    constructor() {
      super(),
        (this.$ = this.querySelector.bind(this)),
        (this.sectionID = this.dataset.sectionId),
        (this.idVideo = this.dataset.idVideo),
        (this.typeVideo = this.dataset.type),
        (this.eleVideo = `fthVideo-${this.sectionID}-` + this.idVideo),
        (this.onPlayerStateYTChange = this.onPlayerStateYTChange.bind(this)),
        (this.onPlayerPlay = this.onPlayerPlay.bind(this)),
        (this.playPauseButton = this.$(".video-play-pause-button")),
        (this.trigger = this.$(".js-load-media-trigger")),
        this.trigger && this.trigger.addEventListener("click", this.handlePlayVideo.bind(this));

      if (this.playPauseButton) {
        this.playPauseButton.addEventListener("click", this.togglePlayPauseVideo.bind(this));
      }
    }


    togglePlayPauseVideo() {
      this.classList.add("playing");
      this.loadContent();

      const video = this.$(".js-media-item-video");

      if (!video) return;

      // First time play: pause others, play this
      if (video.paused || video.ended) {
        this.pauseAllVideo(video);
        video.play();
        this.updatePlayPauseIcon(true);
      } else {
        video.pause();
        this.updatePlayPauseIcon(false);
      }


      if (this.player && typeof this.player.getPlayerState === "function") {
        const state = this.player.getPlayerState();
        if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.ENDED) {
          this.pauseAllVideo(this.player);
          this.player.playVideo();
          this.updatePlayPauseIcon(true);
        } else if (state === YT.PlayerState.PLAYING) {
          this.player.pauseVideo();
          this.updatePlayPauseIcon(false);
        }
      }



    }

    updatePlayPauseIcon(isPlaying) {
      const playIcon = this.playPauseButton?.querySelector(".video-play-icon");
      const pauseIcon = this.playPauseButton?.querySelector(".video-pause-icon");

      if (!playIcon || !pauseIcon) return;

      if (isPlaying) {
        playIcon.style.display = "none";
        pauseIcon.style.display = "inline";
      } else {
        playIcon.style.display = "inline";
        pauseIcon.style.display = "none";
      }
    }



    handlePlayVideo() {
      this.classList.add("playing");
      this.loadContent();
      const t = this.querySelector(".js-media-item-video");
      t &&
        t.addEventListener("play", () => {
          this.pauseAllVideo(t), t.play();
        });
    }
    onYouTubeIframeAPIReady() {
      if ("undefined" != typeof YT && void 0 !== YT.Player)
        try {
          this.player = new YT.Player(this.eleVideo, {
            videoId: this.idVideo,
            playerVars: { playsinline: 1 },
            events: {
              onReady: this.onPlayerYTReady,
              onStateChange: this.onPlayerStateYTChange,
            },
          });
        } catch (t) {
          console.error("Lỗi khi tạo trình phát YouTube:", t);
        }
      else {
        var t = document.createElement("script"),
          e =
            ((t.src = "https://www.youtube.com/iframe_api"),
              (t.onload = () => {
                this.onYouTubeIframeAPIReady();
              }),
              document.getElementsByTagName("script")[0]);
        e.parentNode.insertBefore(t, e);
      }
    }
    onVimeoIframeAPIReady() {
      if ("undefined" != typeof Vimeo && void 0 !== Vimeo.Player)
        try {
          var t = { id: this.idVideo, autoplay: 1 };
          (this.playerVimeo = new Vimeo.Player(this.eleVideo, t)),
            this.playerVimeo.on("play", () => {
              this.pauseAllVideo(this.playerVimeo);
            });
        } catch (t) {
          console.error("Lỗi khi tạo trình phát Vimeo:", t);
        }
      else {
        var t = document.createElement("script"),
          e =
            ((t.src = "https://player.vimeo.com/api/player.js"),
              (t.onload = () => {
                this.onVimeoIframeAPIReady();
              }),
              document.getElementsByTagName("script")[0]);
        e.parentNode.insertBefore(t, e);
      }
    }
    onPlayerYTReady = () => {
      this.pauseAllVideo(this.player), this.player.playVideo();
    };
    // onPlayerStateYTChange = (t) => {
    //   1 == t.data && this.onPlayerPlay();
    // };

    onPlayerStateYTChange = (t) => {
      const state = t.data;

      if (state === YT.PlayerState.PLAYING) {
        this.onPlayerPlay(); // pause other videos
        this.updatePlayPauseIcon(true);
      } else if (
        state === YT.PlayerState.PAUSED ||
        state === YT.PlayerState.ENDED
      ) {
        this.updatePlayPauseIcon(false);
      }
    };



    onPlayerPlay = () => {
      this.pauseAllVideo(this.player);
    };
    loadContent() {
      if (!this.getAttribute("loaded")) {
        if (this.$("template")) {
          var t = this.$("template").content.firstElementChild.cloneNode(!0);
          this.appendChild(t),
            this.isLoaded(!0),
            this.trigger && this.trigger.remove();

          // 🔽 ADD HERE AFTER APPENDING VIDEO
          const video = this.$(".js-media-item-video");
          if (video && !video.hasAttribute("data-listeners-added")) {
            video.addEventListener("play", () => this.updatePlayPauseIcon(true));
            video.addEventListener("pause", () => this.updatePlayPauseIcon(false));
            video.addEventListener("ended", () => this.updatePlayPauseIcon(false));
            video.setAttribute("data-listeners-added", "true");
          }

        } else {
          if ("youtube" == this.typeVideo) this.onYouTubeIframeAPIReady();
          else {
            if ("vimeo" != this.typeVideo) return !0;
            this.onVimeoIframeAPIReady();
          }
          this.trigger?.classList.add("d-none"),
            this.$(".js-media-item").classList.add("d-flex");
          const video = this.$(".js-media-item-video");
          if (video && !video.hasAttribute("data-listeners-added")) {
            video.addEventListener("play", () => this.updatePlayPauseIcon(true));
            video.addEventListener("pause", () => this.updatePlayPauseIcon(false));
            video.addEventListener("ended", () => this.updatePlayPauseIcon(false));
            video.setAttribute("data-listeners-added", "true");
          }

        }
        return !0;
      }
    }
    pauseAllVideo(e) {
      document.querySelectorAll(
        ".js-product-media-deferred-video:has([data-type='youtube']"
      ).forEach((t) => {
        t.player && e !== t.player && t.player?.pauseVideo();
      }),
        document.querySelectorAll(
          ".js-product-media-deferred-video:has([data-type='vimeo'])"
        ).forEach((t) => {
          t.playerVimeo !== e && t.playerVimeo?.pause();
        }),
        document.querySelectorAll(".js-media-item-video").forEach((t) => {
          t !== e && t.pause();
        });
    }
    isLoaded(t) {
      t ? this.setAttribute("loaded", !0) : this.removeAttribute("loaded");
    }
  }
  );
}


/* -----------------------------
   slideshow Swiper (uses Swiper)
   ----------------------------- */
if (!customElements.get('slideshow-swiper')) {
  customElements.define('slideshow-swiper', class slideshowSwiper extends HTMLElement {
    constructor() {
      super();
      this.slider;
      this.resizeObserver;
      window.addEventListener("resize", this.handleResize.bind(this));
    }

    connectedCallback() {
      this.sliderWrapper = this.querySelector(".slideshow__swiper");
      this.optionsData = this.sliderWrapper.dataset.option
        ? JSON.parse(this.sliderWrapper.dataset.option)
        : {};
      this.desktopslider = this.optionsData.desktopSlider;
      this.grid = this.optionsData.grid;
      this.resizeObserver = new ResizeObserver((entries) => this.initials());
      this.resizeObserver.observe(this.sliderWrapper);
    }

    initials() {
      if (this.desktopslider == false) {
        if (this.slider) {
          this.slider.destroy(true, true);
          this.slider = null;
        }
        if (window.innerWidth < 768) {
          this.initSlider();
        }
      } else {
        this.initSlider();
      }
    }

    initSlider() {
      let next = this.querySelector(".arrow-next-button");
      let prev = this.querySelector(".arrow-prev-button");
      let pagination = this.querySelector(".swiper-pagination");
      let scrollbar = this.querySelector(".swiper-scrollbar");

      let defaults = {
        effect: "slide",
        slidesPerView: "auto",
        centeredSlides: false,
        grabCursor: false,
        horizontal: true,
        watchSlidesProgress: true,
        draggable: !0,
        autoHeight: !1,
        watchOverflow: !0,
        threshold: 10,
        speed: 700,
        freeMode: false,
        loop: false,
        autoplay: {
          enabled: false,
          disableOnInteraction: false,
          delay: 1500,
        },
        mousewheel: {
          forceToAxis: true,
        },
        navigation: {
          nextEl: next,
          prevEl: prev,
        },
        scrollbar: {
          el: scrollbar,
          draggable: true,
        },
        pagination: {
          el: pagination,
          clickable: true,
        },
      };

      let options = { ...defaults, ...this.optionsData };

      this.slider = new Swiper(this.sliderWrapper, options);
      this.slider.on("slideChangeTransitionStart", () => {
        this.handleSlideChange();
      });
    }

    handleSlideChange() {
      if (this.querySelectorAll("fth-load-media").length > 0) {


        this.querySelectorAll("fth-load-media").forEach((mediaEl) => {
          // YouTube player API
          if (mediaEl.player && typeof mediaEl.player.pauseVideo === "function") {
            mediaEl.player.pauseVideo();
          }

          // Vimeo player API
          if (
            mediaEl.playerVimeo &&
            typeof mediaEl.playerVimeo.pause === "function"
          ) {
            mediaEl.playerVimeo.pause();
          }

          // Native video
          mediaEl.querySelectorAll(".js-media-item-video").forEach((vid) => {
            if (!vid.paused) {
              vid.pause();
            }
          });

          // Fallback: Reset any raw iframe that is NOT API controlled
          mediaEl.querySelectorAll("iframe").forEach((iframe) => {
            const isYouTube = iframe.src.includes("youtube.com");
            const isVimeo = iframe.src.includes("vimeo.com");
            // Only if no API player exists on this mediaEl
            if (!mediaEl.player && !mediaEl.playerVimeo && (isYouTube || isVimeo)) {
              const currentSrc = iframe.src;
              iframe.src = currentSrc; // Reset iframe (force reload)
            }
          });
        });
      }
    }

    handleResize() {
      this.initials();
    }

    disconnectedCallback() {
      if (this.resizeObserver) {
        this.resizeObserver.unobserve(this.sliderWrapper);
      }
      if (this.slider) {
        this.slider.destroy(true, true);
      }
    }
  }
  );
}

/* -----------------------------
   hoverImages
   ----------------------------- */
if (!customElements.get("hover-images")) {
  customElements.define('hover-images', class hoverImages extends HTMLElement {
    connectedCallback() {
      const swiperEl = this.querySelector('.product-card__media-slider');
      if (swiperEl) {
        new Swiper(swiperEl, {
          loop: false,
          slidesPerView: 1,
          spaceBetween: 10,
          allowTouchMove: false,
          navigation: {
            nextEl: this.querySelector('.arrow-prev-button-js'),
            prevEl: this.querySelector('.arrow-next-button-js'),
          },
          breakpoints: {
            359: {
              allowTouchMove: false,
            },
            768: {
              allowTouchMove: true
            }
          },
        });
      }
    }
  }
  );
}


/* -----------------------------
   collapsible content
   ----------------------------- */
if (!customElements.get('collapsible-content')) {
  customElements.define(
    'collapsible-content', class collapsibleContent extends HTMLElement {
    constructor() {
      super();
      this.disclosure = this.querySelector('details');
      this.toggle = this.querySelector('summary');
      this.panel = this.toggle.nextElementSibling;
      this.init();
    }

    init() {
      // Check if the content element has a CSS transition.
      if (window.getComputedStyle(this.panel).transitionDuration !== '0s') {
        this.toggle.addEventListener('click', this.handleToggle.bind(this));
        this.disclosure.addEventListener('transitionend', this.handleTransitionEnd.bind(this));
      }
    }

    /**
     * Handles 'click' events on the summary element.
     * @param {object} evt - Event object.
     */
    handleToggle(evt) {
      evt.preventDefault();

      if (!this.disclosure.open) {
        this.open();
      } else {
        this.close();
      }
    }

    /**
     * Handles 'transitionend' events on the details element.
     * @param {object} evt - Event object.
     */
    handleTransitionEnd(evt) {
      if (evt.target !== this.panel) return;

      if (this.disclosure.classList.contains('is-closing')) {
        this.disclosure.classList.remove('is-closing');
        this.disclosure.open = false;
      }

      this.panel.removeAttribute('style');
    }

    /**
     * Adds inline 'height' style to the content element, to trigger open transition.
     */
    addContentHeight() {
      this.panel.style.height = `${this.panel.scrollHeight}px`;
    }

    /**
     * Opens the details element.
     */
    open() {
      // Set content 'height' to zero before opening the details element.
      this.panel.style.height = '0';

      // Open the details element
      this.disclosure.open = true;

      // Set content 'height' to its scroll height, to enable CSS transition.
      this.addContentHeight();
    }

    /**
     * Closes the details element.
     */
    close() {
      // Set content height to its scroll height, to enable transition to zero.
      this.addContentHeight();

      // Add class to enable styling of content or toggle icon before or during close transition.
      this.disclosure.classList.add('is-closing');

      // Set content height to zero to trigger the transition.
      // Slight delay required to allow scroll height to be applied before changing to '0'.
      setTimeout(() => {
        this.panel.style.height = '0';
      });
    }
  }
  );
}

/* -----------------------------
   product form 
   ----------------------------- */
if (!customElements.get('product-form')) {
  customElements.define(
    'product-form',
    class productForm extends HTMLElement {
      constructor() {
        super();
      }
      connectedCallback() {
        this.form = this.querySelector('.js-product-form');
        if (this.form != null) {
          this.form.querySelector('[name=id]').disabled = false;
          this.form.addEventListener('submit', this.handleSubmit.bind(this));
          this.cart = document.querySelector('side-cart');
          this.submitBtn = this.querySelector('[type="submit"]');
          this.submitBtnText = this.submitBtn.querySelector('span');

          if (document.querySelector('side-cart')) this.submitBtn.setAttribute('aria-haspopup', 'dialog');
          this.hideErrors = this.dataset.hideErrors === 'true';

        }

      }

      /**
       * Handles submission of the quick add.
       * @param {object} evt - Event object.
       */
      async handleSubmit(evt) {
        evt.preventDefault();
        this.errorMsg = null;
        this.handleErrorMsg();

        if (this.submitBtn.getAttribute('aria-disabled') === 'true') return;
        this.submitBtn.setAttribute('aria-disabled', true);
        this.querySelector('.loading-overlay').classList.remove('hidden');

        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];

        const formData = new FormData(this.form);

        if (this.cart) {
          formData.append('sections', this.cart.getSectionsToRender().map((section) => section.id));
          formData.append('sections_url', window.location.pathname);
          this.cart.setActiveElement(document.activeElement);
        }
        config.body = formData;

        try {
          const response = await fetch(`${theme.routes.cart_add_url}`, config).then(r => r.json());

          if (response.status) {
            publish(EVENT_TYPES.cartError, {
              source: 'product-form',
              productVariantId: formData.get('id'),
              errors: response.errors || response.description,
              message: response.message,
            });

            this.handleErrorMsg(response.description);
            this.showToastMessage(response.description);

            if (response.description.includes('maximum quantity')) {
              this.error = true;
              this.submitBtn.removeAttribute('aria-disabled');
              this.querySelector('.loading-overlay').classList.add('hidden');
              return;
            }

            const soldOut = this.submitBtn.querySelector('.sold-out');
            if (!soldOut) return;
            this.submitBtn.setAttribute('aria-disabled', true);
            this.submitBtn.querySelector('span').classList.add('hidden');
            soldOut.classList.remove('hidden');
            this.error = true;
            return;

          } else if (!this.cart) {
            window.location = theme.routes.cart_url;
            return;
          }

          if (!this.error) {
            publish(EVENT_TYPES.cartUpdate, {
              source: 'product-form',
              productVariantId: formData.get('id'),
              cartData: response,
            });
          }

          this.error = false;
          this.querySelector('.loading-overlay').classList.add('hidden');
          this.submitBtn.classList.add('is-success');
          setTimeout(() => {
            this.querySelector('.loading-overlay').classList.add('hidden');
            this.submitBtn.classList.remove('is-success');
            this.cart.renderContents(response);
          }, 1400);


        } catch (e) {
          console.error(e);
        } finally {
          // this.submitBtn.classList.remove('is-loading');

          if (this.cart && this.cart.classList.contains('is-empty')) {
            this.cart.classList.remove('is-empty');
          }

          if (!this.error) {
            this.submitBtn.removeAttribute('aria-disabled');
          }
        }
      }

      /**
       * Shows/hides an error message.
       * @param {string} [error=false] - Error to show a message for.
       */
      handleErrorMsg(errorMessage = false) {
        if (this.hideErrors) return;
        this.errorWrapper = this.errorWrapper || this.querySelector('[data-error-wrapper]');
        if (!this.errorWrapper) return;
        this.errorMessage = this.errorMessage || this.errorWrapper.querySelector('[data-error-message]');
        this.errorWrapper.toggleAttribute('hidden', !errorMessage);
        if (errorMessage) {
          this.errorMessage.textContent = errorMessage;
        }
      }


      toggleSubmitButton(disable = true, text) {
        if (disable) {
          this.submitBtn.setAttribute('disabled', 'disabled');
          if (text) this.submitBtnText.textContent = text;
        } else {
          this.submitBtn.removeAttribute('disabled');
          this.submitBtn.textContent = theme.variantStrings.addToCart;
        }
      }

      showToastMessage(message = '') {
        if (!message) return;

        // Get wrapper and message element
        this.toastWrapper = document.querySelector('[data-toast-wrapper]');
        this.toastMessage = this.toastWrapper.querySelector('[data-toast-message]');

        if (!this.toastWrapper || !this.toastMessage) return;

        // Set message and show
        this.toastMessage.textContent = message;
        this.toastWrapper.classList.add('active');

        // Clear previous timeout if exists
        clearTimeout(this._toastTimeout);

        // Auto hide after 5 seconds
        this._toastTimeout = setTimeout(() => {
          this.toastWrapper.classList.remove('active');
          this.toastMessage.textContent = '';
        }, 5000);
      }

    }
  );
}


/* -----------------------------
   Tabs
   ----------------------------- */


if (!customElements.get('collection-tab-content')) {
  customElements.define(
    'collection-tab-content',
    class Tabs extends HTMLElement {
      constructor() {
        super();

        this.tabList = this.querySelector('[role="tablist"]');
        this.activeTab = this.tabList.querySelector('[aria-selected="true"]');
        this.isVerticalTablist =
          this.tabList.getAttribute('aria-orientation') === 'vertical';
        this.tabs = this.querySelectorAll('[role="tab"]');
        this.panels = this.querySelectorAll('[role="tabpanel"]');

        // Create active indicator
        this.tabActiveEl = document.createElement('div');
        this.tabActiveEl.classList.add('tabs-button-active-shape');
        this.tabList.appendChild(this.tabActiveEl);

        if (!this.activeTab) this.activeTab = this.tabs[0];

        this.activateTab(this.activeTab, true);
        this.addListeners();
      }

      addListeners() {
        this.tabList.addEventListener('click', this.handleClick.bind(this));
        this.tabList.addEventListener('keydown', this.handleKeydown.bind(this));
        window.addEventListener('resize', () => this.updateActiveIndicator());
      }

      handleClick(evt) {
        if (!evt.target.matches('[role="tab"]') || evt.target === this.activeTab) return;

        this.activateTab(evt.target);
      }

      handleKeydown(evt) {
        const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
        if (!keys.includes(evt.key)) return;

        evt.preventDefault();

        if (evt.key === 'Home') return this.activateTab(this.tabs[0]);
        if (evt.key === 'End') return this.activateTab(this.tabs[this.tabs.length - 1]);
        this.switchTabOnKeyPress(evt.key);
      }

      switchTabOnKeyPress(key) {
        let newTab;
        if (key === 'ArrowRight' || key === 'ArrowDown') {
          newTab = this.activeTab.nextElementSibling ?? this.tabs[0];
        } else {
          newTab = this.activeTab.previousElementSibling ?? this.tabs[this.tabs.length - 1];
        }
        this.activateTab(newTab);
      }

      activateTab(tab, skipAnimation = false) {
        this.deactivateActiveTab();

        Tabs.setTabState(tab, true);
        tab.removeAttribute('tabindex');
        tab.classList.add('is-active');
        this.activeTab = tab;
        const panelId = tab.getAttribute('aria-controls');
        const panel = document.getElementById(panelId);
        if (panel) {
          panel.classList.add('is-active');
        }
        this.updateActiveIndicator(skipAnimation);
        if (document.activeElement.matches('[role="tab"]')) {
          tab.focus();
        }
      }

      deactivateActiveTab() {
        if (!this.activeTab) return;
        Tabs.setTabState(this.activeTab, false);
        this.activeTab.setAttribute('tabindex', '-1');
        this.activeTab.classList.remove('is-active');


        const panelId = this.activeTab.getAttribute('aria-controls');
        const panel = document.getElementById(panelId);
        if (panel) panel.classList.remove('is-active');
        this.activeTab = null;
      }

      updateActiveIndicator(skipAnimation = false) {
        if (!this.activeTab) return;

        const left = this.activeTab.offsetLeft;
        const width = this.activeTab.offsetWidth;
        this.tabActiveEl.style.transition = skipAnimation ? 'none' : 'transform 0.3s ease, width 0.3s ease';
        this.tabActiveEl.style.transform = `translateX(${left}px)`;
        this.tabActiveEl.style.width = `${width}px`;
        if (skipAnimation) {
          void this.tabActiveEl.offsetWidth;
          this.tabActiveEl.style.transition = 'transform 0.3s ease, width 0.3s ease';
        }
      }

      static setTabState(tab, active) {
        tab.setAttribute('aria-selected', active);
      }
    }
  );
}

/* -----------------------------
   Marquee content
   ----------------------------- */

if (!customElements.get("marquee-content")) {
  class Marquee extends HTMLElement {
    constructor() {
      super();
    }
    connectedCallback() {
      this.init();
    }
    calculationPaddingSection() {
      (this.heightSection = this.offsetHeight),
        (this.heightSection =
          this.heightSection < 18
            ? 18
            : 96 < this.heightSection
              ? 96
              : this.heightSection),
        this.closest(".js-running-content").style.setProperty(
          "--spacing-padding-block",
          this.heightSection + "px"
        );
    }
    init() {
      (this.distance =
        this.querySelector(".js-marquee-item").offsetWidth),
        (this.speed = this.dataset.speed),
        this.style.setProperty(
          "--marquee-duration",
          this.distance / this.speed + "s"
        );
    }
  }
  customElements.define("marquee-content", Marquee);
}

/* -----------------------------
   VariantSelects
   ----------------------------- */

class VariantSelects extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.addEventListener('change', (event) => {
      const target = this.getInputForEventTarget(event.target);
      this.updateSelectionMetadata(event);

      publish(EVENT_TYPES.optionValueSelectionChange, {
        data: {
          event,
          target,
          selectedOptionValues: this.selectedOptionValues,
        },
      });
    });
  }

  updateSelectionMetadata({ target }) {
    const { value, tagName } = target;

    if (tagName === 'SELECT' && target.selectedOptions.length) {
      Array.from(target.options)
        .find((option) => option.getAttribute('selected'))
        .removeAttribute('selected');
      target.selectedOptions[0].setAttribute('selected', 'selected');

      const swatchValue = target.selectedOptions[0].dataset.optionSwatchValue;
      const selectedDropdownSwatchValue = target
        .closest('.product-form__input')
        .querySelector('[data-selected-value] > .swatch');
      if (!selectedDropdownSwatchValue) return;
      if (swatchValue) {
        selectedDropdownSwatchValue.style.setProperty('--swatch--background', swatchValue);
        selectedDropdownSwatchValue.classList.remove('swatch--unavailable');
      } else {
        selectedDropdownSwatchValue.style.setProperty('--swatch--background', 'unset');
        selectedDropdownSwatchValue.classList.add('swatch--unavailable');
      }

      selectedDropdownSwatchValue.style.setProperty(
        '--swatch-focal-point',
        target.selectedOptions[0].dataset.optionSwatchFocalPoint || 'unset'
      );
    } else if (tagName === 'INPUT' && target.type === 'radio') {
      const selectedSwatchValue = target.closest(`.product-form__input`).querySelector('[data-selected-value]');
      if (selectedSwatchValue) selectedSwatchValue.innerHTML = value;
    }
  }

  getInputForEventTarget(target) {
    return target.tagName === 'SELECT' ? target.selectedOptions[0] : target;
  }

  get selectedOptionValues() {
    return Array.from(this.querySelectorAll('select option[selected], fieldset input:checked')).map(
      ({ dataset }) => dataset.optionValueId
    );
  }
}
customElements.define('variant-selects', VariantSelects);




/* -----------------------------
   Modal dialog
   ----------------------------- */

   class ModalOpener extends HTMLElement {
  constructor() {
    super();

    const button = this.querySelector('button');

    if (!button) return;

    button.addEventListener('click', () => {
      this.onButtonClick(button);
    });
  }

  onButtonClick(button) {
    const modal = document.querySelector(
      this.getAttribute('data-modal')
    );

    if (modal) modal.show(button);
  }
}
customElements.define('modal-opener', ModalOpener);

class ModalDialog extends HTMLElement {
  constructor() {
    super();

    this.dialogHolder = this.querySelector('[role="dialog"]');
    this.querySelectorAll('[id^="ModalClose-"]').forEach(button => {
      button.addEventListener('click', this.hide.bind(this, false));
    });
    this.addEventListener('keyup', event => {
      if (event.code?.toUpperCase() === 'ESCAPE') this.hide();
    });
    this.addEventListener('click', event => {
      if (event.target === this) this.hide();
    });
  }

  connectedCallback() {
    if (this.moved) return;
    this.moved = true;
    document.body.appendChild(this);
  }

  show(opener) {
    this.openedBy = opener;
    this.setAttribute('open', '');
    this.dialogHolder.addEventListener(
      'transitionend',
      () => {
        trapFocus(this, this.dialogHolder);
      },
      { once: true }
    );
    window.pauseAllMedia();
  }

  hide() {
    if (this.hasAttribute('data-remove')) {
      const transitionDisabled = window
        .getComputedStyle(this, null)
        .getPropertyValue('transition')
        .includes('none');
      if (transitionDisabled) {
        this.remove();
      } else {
        this.addEventListener(
          'transitionend',
          () => {
            this.remove();
          },
          { once: true }
        );
      }
    }
    document.body.dispatchEvent(new CustomEvent('modalClosed'));
    this.removeAttribute('open');
    removeTrapFocus(this.openedBy);
    window.pauseAllMedia();
    resumeMedia();
  }
}
customElements.define('modal-dialog', ModalDialog);  


/* -----------------------------
   ColorSwatch
   ----------------------------- */

class ColorSwatch extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {

    this.cached = {};
    this.option = this.querySelector(".color-swatch__radio");
    this.productHandle = this.option.dataset.productHandle;
    this.collectionHandle = this.option.dataset.collectionHandle;
    this.mediaId = this.option.dataset.mediaId;
    this.productCard = this.closest(".product-card");
    this.options = this.productCard?.querySelectorAll(".color-swatch__radio");
    this.form = this.productCard?.querySelector(".js-product-form");

    this.updateSwatchAvailability();
    this.querySelector('a')?.addEventListener('click', (event) => event.preventDefault());
    this.option.addEventListener("change", this.onSwatchChange.bind(this));

    // this.updateMediaSlider(this.mediaId);
  }


  getSelectedVariantId(productCard) {
    const selectedColor = productCard.querySelector('.color-swatch__radio:checked')?.value;
    const selectedSize = productCard.querySelector('.size-input__radio:checked')?.value;
    if (!selectedColor || !selectedSize) return null;

    const variants = JSON.parse(productCard.querySelector('[type="application/json"][data-variants]').textContent);

    const variant = variants.find(v =>
      v.option1 === selectedColor && v.option2 === selectedSize
    );

    return variant ? variant.id : null;
  }



  updateSwatchAvailability() {
    // If the variant is disabled in HTML, leave disabled
    if (!this.option.disabled) {
      this.classList.remove("sold-out");
    } else {
      this.classList.add("sold-out");
    }
  }


  onSwatchChange() {

    this.options.forEach(opt => {
      if (opt !== this.option) {
        opt.checked = false;
        opt.removeAttribute("checked");
      }
    });

    this.option.checked = true;
    this.option.setAttribute("checked", "");

    const selectedVariantId = this.getSelectedVariantId(this.productCard);
    if (!selectedVariantId) return;


    this.variantId = selectedVariantId;


    let sectionUrl = `${theme.routes.root_url}/products/${this.productHandle}?variant=${this.variantId}&view=card`;

    if (this.collectionHandle.length > 0) {
      sectionUrl = `${theme.routes.root_url}/collections/${this.collectionHandle}/products/${this.productHandle}?variant=${this.variantId}&view=card`;
    }



    sectionUrl = sectionUrl.replace('//', '/');

    if (this.cached[sectionUrl]) {
      this.renderProductInfo(this.cached[sectionUrl]);
      return;
    }


    fetch(sectionUrl)
      .then((response) => response.text())
      .then((responseText) => {
        const html = new DOMParser().parseFromString(responseText, "text/html");
        this.cached[sectionUrl] = html;
        this.renderProductInfo(html);

      })
      .catch((e) => {
        console.error(e);
      });
  }

  renderProductInfo(html) {
    this.form.querySelector('input[name="id"]').value = this.variantId;
    this.updatePrice(html);
    this.updateMedia();
    this.updateMediaSlider(this.mediaId);
    this.cartButton(html);
    this.cardBadge(html);
    this.updateSwatchAvailability();
  }



  updateMedia() {
    if (this.productCard) {
      this.variantsImages = JSON.parse(this.productCard.querySelector('[type="application/json"][data-variants-images]').textContent);
      const picture = this.productCard.querySelector(".product-media [data-primary-image]");
      if (picture != null) {
        const source = picture.querySelector("source");
        const img = picture.querySelector("img");
        const variantImage = this.variantsImages.find(v => v.id == this.variantId);
        if (img && variantImage) {
          img.src = variantImage.image.src;
          img.srcset = variantImage.image.srcset;
          source.srcset = variantImage.image.srcset;
        }
      }
    }

  }

  updateMediaSlider(mediaId) {
    if (!mediaId) return;
    const swiperEl = this.productCard.querySelector('.product-card__media-slider') || this.productCard.querySelector('.swiper');

    const hasSwiper = swiperEl && swiperEl.swiper;

    let targetIndex = -1;
    let targetSlide = null;
    if (swiperEl) {
      const slides = swiperEl.querySelectorAll('.swiper-slide');
      slides.forEach((slide, index) => {
        const slideMediaId = slide.getAttribute('data-media-id');
        if (String(slideMediaId) === String(mediaId)) {
          targetIndex = index;
          targetSlide = slide;
        }
      });
      slides.forEach(slide => slide.classList.remove('swiper-slide-active'));
      if (targetSlide) targetSlide.classList.add('swiper-slide-active');
    }

    if (hasSwiper && targetIndex >= 0) {
      swiperEl.swiper.slideTo(targetIndex, 300);
    } else if (targetSlide) {
      targetSlide.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

  }


  updatePrice(html) {
    const selector = '.price';
    const destination = this.productCard.querySelector(selector);
    const source = html.querySelector(selector);
    if (source && destination) destination.innerHTML = source.innerHTML;
  }
  cardBadge(html) {
    const selector = '.product-badge-container';
    const destination = this.productCard.querySelector(selector);
    const source = html.querySelector(selector);
    if (source && destination) destination.innerHTML = source.innerHTML;
  }


  cartButton(html) {
    const selector = '.button-with-icon';
    const selector_icon_only = '.button-icon-only';
    this.cartButtonChanger(html, selector);
    this.cartButtonChanger(html, selector_icon_only);
  }

  cartButtonChanger(html, selector) {
    const destination = this.productCard.querySelector(selector);
    const source = html.querySelector(selector);

    if (source && destination) {
      // Update button content
      destination.innerHTML = source.innerHTML;

      // Sync disabled / aria-disabled
      if (source.disabled) {
        destination.disabled = true;
        destination.querySelector(".sold-out")?.classList.remove("hidden");
      } else {
        destination.disabled = false;
        destination.querySelector(".sold-out")?.classList.add("hidden");
      }
    }

  }

}
customElements.define("color-swatch", ColorSwatch);

/* -----------------------------
   SizeVariant
   ----------------------------- */

class SizeVariant extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {

    this.cached = {};
    this.option = this.querySelector(".size-input__radio");
    this.productHandle = this.option.dataset.productHandle;
    this.collectionHandle = this.option.dataset.collectionHandle;
    this.mediaId = this.option.dataset.mediaId;
    this.productCard = this.closest(".product-card");
    this.options = this.productCard?.querySelectorAll(".size-input__radio");
    this.form = this.productCard?.querySelector(".js-product-form");
    this.updateSwatchAvailability();
    this.option.addEventListener("change", this.onSwatchChange.bind(this));

  }

  updateSwatchAvailability() {
    // If the variant is disabled in HTML, leave disabled
    if (!this.option.disabled) {
      this.classList.remove("sold-out");
    } else {
      this.classList.add("sold-out");
    }
  }
  getSelectedVariantId(productCard) {
    const selectedColor = productCard.querySelector('.color-swatch__radio:checked')?.value;
    const selectedSize = productCard.querySelector('.size-input__radio:checked')?.value;
    if (!selectedColor || !selectedSize) return null;
    const variants = JSON.parse(productCard.querySelector('[type="application/json"][data-variants]').textContent);
    const variant = variants.find(v =>
      v.option1 === selectedColor && v.option2 === selectedSize
    );
    return variant ? variant.id : null;
  }

  onSwatchChange() {

    this.options.forEach(opt => {
      if (opt !== this.option) {
        opt.checked = false;
        opt.removeAttribute("checked");
      }
    });

    this.option.checked = true;
    this.option.setAttribute("checked", "");

    const selectedVariantId = this.getSelectedVariantId(this.productCard);
    if (!selectedVariantId) return;
    this.variantId = selectedVariantId;

    let sectionUrl = `${theme.routes.root_url}/products/${this.productHandle}?variant=${this.variantId}&view=card`;

    if (this.collectionHandle.length > 0) {
      sectionUrl = `${theme.routes.root_url}/collections/${this.collectionHandle}/products/${this.productHandle}?variant=${this.variantId}&view=card`;
    }


    sectionUrl = sectionUrl.replace('//', '/');
    if (this.cached[sectionUrl]) {
      this.renderProductInfo(this.cached[sectionUrl]);
      return;
    }


    fetch(sectionUrl)
      .then((response) => response.text())
      .then((responseText) => {
        const html = new DOMParser().parseFromString(responseText, "text/html");
        this.cached[sectionUrl] = html;
        this.renderProductInfo(html);

      })
      .catch((e) => {
        console.error(e);
      });
  }

  renderProductInfo(html) {
    this.form.querySelector('input[name="id"]').value = this.variantId;
    this.selectedLebel(html);
    this.cartButton(html);
    this.updateSwatchAvailability();
  }



  selectedLebel(html) {
    const selector = '.selected-size';

    const destination = this.productCard.querySelector(selector);
    const source = html.querySelector(selector);

    if (source && destination) {
      // Update button content
      destination.innerHTML = source.innerHTML;
    }

  }

  cartButton(html) {
    const selector = '.button-with-icon';
    const selector_icon_only = '.button-icon-only';
    this.cartButtonChanger(html, selector);
    this.cartButtonChanger(html, selector_icon_only);
  }

  cartButtonChanger(html, selector) {
    const destination = this.productCard.querySelector(selector);
    const source = html.querySelector(selector);

    if (source && destination) {
      // Update button content
      destination.innerHTML = source.innerHTML;

      // Sync disabled / aria-disabled
      if (source.disabled) {
        destination.disabled = true;
        destination.querySelector(".sold-out")?.classList.remove("hidden");
      } else {
        destination.disabled = false;
        destination.querySelector(".sold-out")?.classList.add("hidden");
      }
    }

  }




}
customElements.define("size-variant", SizeVariant);


/* -----------------------------
   CountdownTimer
   ----------------------------- */

class CountdownTimer extends HTMLElement {
  constructor() {
    super();
    this.interval = null;
  }

  connectedCallback() {
    this.render();
    this.startTimer();
  }

  disconnectedCallback() {
    clearInterval(this.interval);
  }

  parseEndTimeUTCMinus4(str) {
    const date = new Date(str); // parse as local time
    const localOffset = date.getTimezoneOffset(); // minutes
    const targetOffset = 4 * 60; // 240 minutes for UTC-4
    return date.getTime() + (localOffset + targetOffset) * 60 * 1000;
  }

  startTimer() {
    const endDate = this.dataset.endDate;
    if (!endDate) return;

    const endTime = this.parseEndTimeUTCMinus4(endDate);

    this.interval = setInterval(() => {
      const now = Date.now();
      let timeLeft = Math.floor((endTime - now) / 1000);

      if (timeLeft <= 0) {
        clearInterval(this.interval);
        this.innerHTML = `<span class="expired">00<span>Days</span></span>
                          <span class="count-divider">:</span>
                          <span class="expired">00<span>Hrs</span></span>
                          <span class="count-divider">:</span>
                          <span class="expired">00<span>Min</span></span>
                          <span class="count-divider">:</span>
                          <span class="expired">00<span>Sec</span></span>`;
        return;
      }

      const days = String(Math.floor(timeLeft / 86400)).padStart(2, '0');
      timeLeft %= 86400;
      const hours = String(Math.floor(timeLeft / 3600)).padStart(2, '0');
      timeLeft %= 3600;
      const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
      const seconds = String(timeLeft % 60).padStart(2, '0');

      this.innerHTML = `
        <span>${days}<span class="count-text">Days</span></span>
         <span class="count-divider">:</span>
        <span>${hours}<span class="count-text">Hrs</span></span>
         <span class="count-divider">:</span>
        <span>${minutes}<span class="count-text">Min</span></span>
         <span class="count-divider">:</span>
        <span>${seconds}<span class="count-text">Sec</span></span>
      `;
    }, 1000);
  }

  render() {
    this.style.display = 'inline-flex';
    this.innerHTML = `Loading...`;
  }
}

customElements.define('countdown-timer', CountdownTimer);




/* -----------------------------
   BeforeAfterImages
   ----------------------------- */

class BeforeAfterImages extends HTMLElement {
  constructor() {
    super(),
      (this.$ = this.querySelector.bind(this)),
      (this.$$ = this.querySelectorAll.bind(this)),
      this.init();
  }

  connectedCallback() {
    this.observeResize();
    this.animateToCenter(); // Run animation on load
  }

  observeResize() {
    (this.resizeObserver = new ResizeObserver(() => this.init())),
      this.resizeObserver.observe(this.afterImage);
  }

  init() {
    this.afterImage = this.$(".js-after-image");
    this.splitCusor = this.$(".js-split-cursor");
    this.imageWith = this.afterImage.offsetWidth;
    this.imageHeight = this.afterImage.offsetHeight;
    this.isClicked = false;
    this.handleEvent();
  }

  handleEvent() {
    this.splitCusor.addEventListener("mousedown", this.slideReady.bind(this), { passive: true });
    this.splitCusor.addEventListener("touchstart", this.slideReady.bind(this), { passive: true });
    this.splitCusor.addEventListener("mouseup", this.slideFinish.bind(this), { passive: true });
    this.splitCusor.addEventListener("touchend", this.slideFinish.bind(this), { passive: true });
  }

  slideReady() {
    this.isClicked = true;
    document.addEventListener("mousemove", this.slideMoveBind = this.slideMove.bind(this));
    document.addEventListener("touchmove", this.slideMoveBind);
  }

  slideFinish() {
    this.isClicked = false;
    document.removeEventListener("mousemove", this.slideMoveBind);
    document.removeEventListener("touchmove", this.slideMoveBind);
  }

  slideMove(t) {
    if (this.isClicked) {
      const e = this.offsetLeft;
      t = (t.changedTouches ? t.changedTouches[0] : t).clientX - e;
      this.posSplitCusor = (t / this.imageWith) * 100;
      this.posSplitCusor = Math.min(100, Math.max(0, this.posSplitCusor));
      requestAnimationFrame(() => {
        this.style.setProperty("--before-after-initial-drag-position", this.posSplitCusor + "%");
      });
    }
  }

  animateToCenter() {
    // Start from 0%
    this.style.setProperty("--before-after-initial-drag-position", "0%");
    // Smoothly move to 50% after a short delay
    requestAnimationFrame(() => {
      this.style.transition = "--before-after-initial-drag-position 1.5s ease-in-out";
      this.style.setProperty("--before-after-initial-drag-position", "50%");
      // Remove transition after animation so manual dragging is instant
      setTimeout(() => {
        this.style.transition = "";
      }, 1600);
    });
  }
}

customElements.define("before-after-images", BeforeAfterImages);





