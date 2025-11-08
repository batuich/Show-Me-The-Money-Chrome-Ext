// menu.js

(function() {
  'use strict';

  let themes = {};
  let config = null;

  const DEFAULT_CONFIG = {
    bar: {
      sinceButton: true,
      '1dButton': true,
      '7dButton': true,
      '30dButton': true,
      total: true
    }
  };

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
   * Loads config.json so the popup can reflect the current feature set.
   * @returns {Promise<Object>}
   */
  function loadConfig() {
    if (config) return Promise.resolve(config);

    return fetch(chrome.runtime.getURL('config.json'), { cache: 'no-store' })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        config = data;
        return config;
      })
      .catch(error => {
        console.error('[SMTM Menu] Failed to load config.json, using defaults:', error);
        config = { ...DEFAULT_CONFIG };
        return config;
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
        Object.assign(text.style, {
          display: 'block',
          whiteSpace: 'normal',
          overflow: 'visible',
          lineHeight: text.style.lineHeight || '1.5',
          marginBottom: text.style.marginBottom || '8px'
        });
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
    await Promise.all([loadThemes(), loadConfig()]);
    applyMenuStyles();

    const toggleButton = document.querySelector('.smtm-menu-toggle-button');
    if (toggleButton) {
      const updateToggleIcon = (visibility) => {
        if (!icon) return;
        const iconPath = visibility === 'hidden' ? 'assets/icons/eye-closed.svg' : 'assets/icons/eye-open.svg';
        icon.src = chrome.runtime.getURL(iconPath);
      };

      // Sync icon on popup open
      const initialVisibility = getVisibilityState();
      const icon = toggleButton.querySelector('img');
      if (icon) {
        updateToggleIcon(initialVisibility);
      }

      toggleButton.addEventListener('click', () => {
        // Determine new state and save it
        const currentVisibility = getVisibilityState();
        const newVisibility = currentVisibility === 'hidden' ? 'visible' : 'hidden';
        setVisibilityState(newVisibility);

        // Send message to content script to toggle the panel
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0] && tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'togglePanel' }, (response) => {
              if (chrome.runtime.lastError) {
                console.error('Show Me The Money: Error sending message:', chrome.runtime.lastError.message);
                setVisibilityState(currentVisibility);
                updateToggleIcon(currentVisibility);
                return;
              }

              if (!response || response.status === 'error') {
                console.error('Show Me The Money: Toggle response error:', response?.message || 'unknown_error');
                setVisibilityState(currentVisibility);
                updateToggleIcon(currentVisibility);
                return;
              }

              const resolvedVisibility = response.status === 'not_found' ? 'hidden' : response.status;
              setVisibilityState(resolvedVisibility);
              updateToggleIcon(resolvedVisibility);
            });
          }
        });
      });
    }

    const clearButton = document.querySelector('.smtm-menu-button');
    if (clearButton) {
      const originalText = clearButton.textContent;
      const theme = themes['cursor'];

      clearButton.addEventListener('click', () => {
        // Send a message to the content script to clear the data
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0] && tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'clearData' });
          }
        });

        // Update button text and style for user feedback
        clearButton.textContent = 'Done!';
        if (theme && theme.menu && theme.menu.doneTextColor) {
          clearButton.style.color = theme.menu.doneTextColor;
        }

        setTimeout(() => {
          clearButton.textContent = originalText;
          // Re-apply original styles from the theme
          if (theme && theme.menu && theme.menu.menuButton) {
            applyThemeStyles(clearButton, theme.menu, 'menuButton');
          }
        }, 2500);
      });
    }
  }
})();
