// utils/uiHelpers.js

const SMTM_DEBUG_STYLES = false;
const SMTM_PIXEL_PROPS = new Set([
  'borderRadius',
  'fontSize',
  'height',
  'width',
  'top',
  'left',
  'right',
  'bottom',
  'padding',
  'margin',
  'gap',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'paddingTop',
  'paddingBottom',
  'paddingLeft',
  'paddingRight'
]);

/**
 * Logs computed styles for visual debugging when enabled.
 * @param {HTMLElement} el - Element to inspect.
 * @param {string} label - Name used in console output.
 */
function logComputedStyles(el, label) {
  if (!SMTM_DEBUG_STYLES || !el) return;
  requestAnimationFrame(() => {
    try {
      const computed = getComputedStyle(el);
      const summary = {
        fontSize: computed.fontSize,
        fontFamily: computed.fontFamily,
        color: computed.color,
        background: computed.backgroundColor,
        borderRadius: computed.borderRadius,
        padding: computed.padding,
        margin: computed.margin
      };
      console.groupCollapsed(`🧩 ${label} computed styles`);
      console.table(summary);
      console.groupEnd();
    } catch (error) {
      console.warn('logComputedStyles error:', error);
    }
  });
}

function resolveThemeStyle(theme, themeKey, state) {
  if (!theme) return null;
  const keys = (themeKey || '').split('.');
  let pointer = theme;

  keys.forEach(key => {
    if (!key) return;
    pointer = pointer?.[key];
  });

  if (!pointer) return null;
  return pointer[state] || pointer.default || pointer;
}

/**
 * Applies theme styles declared in themes.json to a DOM element.
 * Supports nested keys like `calendar.container`.
 * @param {HTMLElement} el - Target element.
 * @param {Object} theme - Theme or theme subsection.
 * @param {string} themeKey - Key or dotted path inside the theme object.
 * @param {string} [state='default'] - Variant to apply (default, hover, etc.).
 */
function applyThemeStyles(el, theme, themeKey, state = 'default') {
  if (!el || !theme) return;

  const style = resolveThemeStyle(theme, themeKey, state);
  if (!style) return;

  Object.entries(style).forEach(([prop, value]) => {
    if (value === null || value === undefined) return;

    const cssProp = prop.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`);
    let finalValue = value;

    if (SMTM_PIXEL_PROPS.has(prop) && typeof value === 'number') {
      finalValue = `${value}px`;
    }

    el.style.setProperty(cssProp, finalValue, 'important');
  });

  if (SMTM_DEBUG_STYLES) {
    logComputedStyles(el, themeKey || el.tagName);
  }
}

/**
 * Creates an element with optional attributes, dataset, and styles.
 * @param {string} tagName - Tag to create.
 * @param {Object} [options] - Configuration options.
 * @returns {HTMLElement} Created element.
 */
function createElement(tagName, options = {}) {
  const element = document.createElement(tagName);
  const {
    id,
    className,
    text,
    html,
    attrs = {},
    dataset = {},
    styles = {}
  } = options;

  if (id) element.id = id;
  if (className) element.className = className;
  if (typeof text === 'string') element.textContent = text;
  if (typeof html === 'string') element.innerHTML = html;

  Object.entries(attrs).forEach(([key, value]) => {
    if (value !== undefined) element.setAttribute(key, value);
  });

  Object.entries(dataset).forEach(([key, value]) => {
    if (value !== undefined) element.dataset[key] = value;
  });

  Object.entries(styles).forEach(([key, value]) => {
    if (value !== undefined) element.style[key] = value;
  });

  return element;
}

/**
 * Removes an element from the DOM.
 * @param {HTMLElement|string} target - Element instance or selector.
 */
function removeElement(target) {
  if (!target) return;
  const element = typeof target === 'string' ? document.querySelector(target) : target;
  if (element?.parentNode) {
    element.parentNode.removeChild(element);
  }
}
