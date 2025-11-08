/**
 * @fileoverview This file contains the logic for loading and applying themes to UI elements.
 */

let themes = {};

/**
 * Fetches and stores themes from themes.json.
 * @returns {Promise<void>} A promise that resolves when themes are loaded.
 */
export function loadThemes() {
  return fetch(chrome.runtime.getURL('themes.json'))
    .then(response => response.json())
    .then(data => {
      themes = data;
    })
    .catch(error => console.error('Show Me The Money: Error loading themes:', error));
}

/**
 * Applies theme styles to an element.
 * @param {HTMLElement} el The element to style.
 * @param {string} themeName The name of the theme to use.
 * @param {string} themeKey The key of the style to apply.
 * @param {string} [state="default"] The state of the element (e.g., "hover").
 */
export function applyThemeStyles(el, themeName, themeKey, state = "default") {
    const theme = themes[themeName];
    if (!theme) {
        console.error(`Show Me The Money: Theme "${themeName}" not found.`);
        return;
    }

    const style = theme[themeKey]?.[state];
    if (!style || !el) return;

    for (const [prop, value] of Object.entries(style)) {
        if (value === null || value === undefined) continue;

        const cssProp = prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
        let finalValue = value;

        const pixelProps = ['borderRadius', 'fontSize', 'height', 'width', 'top', 'left', 'right', 'bottom', 'padding', 'margin'];
        if (pixelProps.includes(prop) && typeof value === 'number') {
            finalValue = `${value}px`;
        }

        el.style.setProperty(cssProp, finalValue, 'important');
    }
}

/**
 * Gets a theme by name.
 * @param {string} themeName The name of the theme to get.
 * @returns {object|null} The theme object or null if not found.
 */
export function getTheme(themeName) {
    return themes[themeName] || null;
}
