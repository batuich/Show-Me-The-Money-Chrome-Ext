// menu.js

(function() {
  'use strict';

  let themes = {};

  /**
   * Applies theme styles to an element
   * @param {HTMLElement} el - Element to style
   * @param {Object} theme - Theme object
   * @param {string} themeKey - Key in theme object (e.g., 'menuContainer')
   * @param {string} state - State (e.g., 'default', 'hover')
   */
  function applyThemeStyles(el, theme, themeKey, state = "default") {
    const style = theme[themeKey]?.[state];
    if (!style || !el) return;

    for (const [prop, value] of Object.entries(style)) {
      if (value === null || value === undefined) continue;

      const cssProp = prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
      let finalValue = value;

      // Handle numeric values that need 'px' suffix
      const pixelProps = ['borderRadius', 'fontSize', 'height', 'width', 'top', 'left', 'right', 'bottom', 'padding', 'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'gap'];
      if (pixelProps.includes(prop) && typeof value === 'number') {
        finalValue = `${value}px`;
      }

      // Handle display properties that don't need 'px'
      if (prop === 'display' || prop === 'alignItems' || prop === 'justifyContent' || prop === 'lineHeight') {
        finalValue = value;
      }

      el.style.setProperty(cssProp, finalValue, 'important');
    }
  }

  /**
   * Loads themes from themes.json
   * @returns {Promise<void>}
   */
  function loadThemes() {
    return fetch(chrome.runtime.getURL('themes.json'))
      .then(response => response.json())
      .then(data => {
        themes = data;
      })
      .catch(error => {
        console.error('Show Me The Money: Error loading themes:', error);
        // Fallback styles are already in HTML, so we can continue
      });
  }

  /**
   * Applies menu styles from theme
   */
  function applyMenuStyles() {
    // Use 'cursor' theme by default (same as content.js)
    const themeName = 'cursor';
    const theme = themes[themeName];
    
    if (!theme || !theme.menu) {
      console.warn('Show Me The Money: Menu theme not found, using fallback styles');
      return;
    }

    const container = document.getElementById('smtm-menu-container');
    const toggleRow = document.querySelector('.smtm-menu-toggle-row');
    const toggleText = document.querySelector('.smtm-menu-toggle-text');
    const toggleButton = document.querySelector('.smtm-menu-toggle-button');
    const buttonWrapper = document.querySelector('.smtm-menu-button-wrapper');
    const button = document.querySelector('.smtm-menu-button');
    const helpBlock = document.querySelector('.smtm-menu-help-block');
    const helpTitle = document.querySelector('.smtm-menu-help-title');
    const helpTexts = document.querySelectorAll('.smtm-menu-help-text');

    // Apply styles using menu theme structure
    if (container && theme.menu.menuContainer) {
      applyThemeStyles(container, theme.menu, 'menuContainer');
    }

    if (toggleRow && theme.menu.menuToggleRow) {
      applyThemeStyles(toggleRow, theme.menu, 'menuToggleRow');
    }

    if (toggleText && theme.menu.menuToggleText) {
      applyThemeStyles(toggleText, theme.menu, 'menuToggleText');
    }

    if (toggleButton && theme.menu.menuToggleButton) {
      applyThemeStyles(toggleButton, theme.menu, 'menuToggleButton');
      
      // Add hover state
      if (theme.menu.menuToggleButton.hover) {
        toggleButton.addEventListener('mouseenter', () => {
          applyThemeStyles(toggleButton, theme.menu, 'menuToggleButton', 'hover');
        });
        
        toggleButton.addEventListener('mouseleave', () => {
          applyThemeStyles(toggleButton, theme.menu, 'menuToggleButton');
        });
      }
    }

    if (buttonWrapper && theme.menu.menuButtonWrapper) {
      applyThemeStyles(buttonWrapper, theme.menu, 'menuButtonWrapper');
    }

    if (button && theme.menu.menuButton) {
      applyThemeStyles(button, theme.menu, 'menuButton');
      
      // Add hover state
      if (theme.menu.menuButton.hover) {
        button.addEventListener('mouseenter', () => {
          applyThemeStyles(button, theme.menu, 'menuButton', 'hover');
        });
        
        button.addEventListener('mouseleave', () => {
          applyThemeStyles(button, theme.menu, 'menuButton');
        });
      }
    }

    if (helpBlock && theme.menu.menuHelpBlock) {
      applyThemeStyles(helpBlock, theme.menu, 'menuHelpBlock');
    }

    if (helpTitle && theme.menu.menuHelpTitle) {
      applyThemeStyles(helpTitle, theme.menu, 'menuHelpTitle');
    }

    if (helpTexts.length > 0 && theme.menu.menuHelpText) {
      helpTexts.forEach(text => {
        applyThemeStyles(text, theme.menu, 'menuHelpText');
      });
    }
  }

  // Initialize menu when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  async function init() {
    await loadThemes();
    applyMenuStyles();

    const toggleButton = document.querySelector('.smtm-menu-toggle-button');
    if (toggleButton) {
      toggleButton.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0] && tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'togglePanel' }, (response) => {
              if (chrome.runtime.lastError) {
                console.error('Show Me The Money: Error sending message:', chrome.runtime.lastError.message);
                return;
              }
              
              const icon = toggleButton.querySelector('img');
              if (response && icon) {
                if (response.status === 'visible') {
                  icon.src = chrome.runtime.getURL('assets/icons/eye-open.svg');
                } else {
                  icon.src = chrome.runtime.getURL('assets/icons/eye-closed.svg');
                }
              }
            });
          }
        });
      });
    }
  }
})();
