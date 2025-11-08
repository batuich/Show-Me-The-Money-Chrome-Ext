/**
 * @fileoverview This file contains the logic for the extension's popup menu.
 */

import { applyThemeStyles, loadThemes, getTheme } from '/ui/theme.js';

/**
 * Applies menu styles from theme
 */
function applyMenuStyles() {
  // Use 'cursor' theme by default (same as content.js)
  const themeName = 'cursor';
  const theme = getTheme(themeName);

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
    applyThemeStyles(container, themeName, 'menu.menuContainer');
  }

  if (toggleRow && theme.menu.menuToggleRow) {
    applyThemeStyles(toggleRow, themeName, 'menu.menuToggleRow');
  }

  if (toggleText && theme.menu.menuToggleText) {
    applyThemeStyles(toggleText, themeName, 'menu.menuToggleText');
  }

  if (toggleButton && theme.menu.menuToggleButton) {
    applyThemeStyles(toggleButton, themeName, 'menu.menuToggleButton');

    // Add hover state
    if (theme.menu.menuToggleButton.hover) {
      toggleButton.addEventListener('mouseenter', () => {
        applyThemeStyles(toggleButton, themeName, 'menu.menuToggleButton', 'hover');
      });

      toggleButton.addEventListener('mouseleave', () => {
        applyThemeStyles(toggleButton, themeName, 'menu.menuToggleButton');
      });
    }
  }

  if (buttonWrapper && theme.menu.menuButtonWrapper) {
    applyThemeStyles(buttonWrapper, themeName, 'menu.menuButtonWrapper');
  }

  if (button && theme.menu.menuButton) {
    applyThemeStyles(button, themeName, 'menu.menuButton');

    // Add hover state
    if (theme.menu.menuButton.hover) {
      button.addEventListener('mouseenter', () => {
        applyThemeStyles(button, themeName, 'menu.menuButton', 'hover');
      });

      button.addEventListener('mouseleave', () => {
        applyThemeStyles(button, themeName, 'menu.menuButton');
      });
    }
  }

  if (helpBlock && theme.menu.menuHelpBlock) {
    applyThemeStyles(helpBlock, themeName, 'menu.menuHelpBlock');
  }

  if (helpTitle && theme.menu.menuHelpTitle) {
    applyThemeStyles(helpTitle, themeName, 'menu.menuHelpTitle');
  }

  if (helpTexts.length > 0 && theme.menu.menuHelpText) {
    helpTexts.forEach(text => {
      applyThemeStyles(text, themeName, 'menu.menuHelpText');
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
    const updateToggleIcon = (visibility) => {
      if (!icon) return;
      const iconPath = visibility === 'hidden' ? '/assets/icons/eye-closed.svg' : '/assets/icons/eye-open.svg';
      icon.src = chrome.runtime.getURL(iconPath);
    };

    // Sync icon on popup open
    const initialVisibility = localStorage.getItem('smtmPanelVisibility');
    const icon = toggleButton.querySelector('img');
    if (icon) {
      updateToggleIcon(initialVisibility);
    }

    toggleButton.addEventListener('click', () => {
      // Determine new state and save it
      const currentVisibility = localStorage.getItem('smtmPanelVisibility');
      const newVisibility = currentVisibility === 'hidden' ? 'visible' : 'hidden';
      localStorage.setItem('smtmPanelVisibility', newVisibility);

      // Send message to content script to toggle the panel
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'togglePanel' }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('Show Me The Money: Error sending message:', chrome.runtime.lastError.message);
              localStorage.setItem('smtmPanelVisibility', currentVisibility);
              updateToggleIcon(currentVisibility);
              return;
            }

            if (!response || response.status === 'error') {
              console.error('Show Me The Money: Toggle response error:', response?.message || 'unknown_error');
              localStorage.setItem('smtmPanelVisibility', currentVisibility);
              updateToggleIcon(currentVisibility);
              return;
            }

            const resolvedVisibility = response.status === 'not_found' ? 'hidden' : response.status;
            localStorage.setItem('smtmPanelVisibility', resolvedVisibility);
            updateToggleIcon(resolvedVisibility);
          });
        }
      });
    });
  }

  const clearButton = document.querySelector('.smtm-menu-button');
  if (clearButton) {
    const originalText = clearButton.textContent;
    const theme = getTheme('cursor');

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
          applyThemeStyles(clearButton, 'cursor', 'menu.menuButton');
        }
      }, 2500);
    });
  }
}
