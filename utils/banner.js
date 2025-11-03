// utils/banner.js

/**
 * Checks if valid mapping exists in smtmLocalConfig
 * @returns {boolean} True if mapping exists with both unique and value keys
 */
function hasValidMapping() {
  try {
    const cfgRaw = localStorage.getItem('smtmLocalConfig');
    if (!cfgRaw) return false;
    
    const config = JSON.parse(cfgRaw);
    return config?.mapping && 
           config.mapping.unique && 
           config.mapping.value &&
           Object.keys(config.mapping).length > 0;
  } catch (error) {
    console.error('[SMTM Banner] Error checking mapping:', error);
    return false;
  }
}

/**
 * Checks if mapping contains date-type columns
 * @returns {boolean} True if either unique or value column has type === 'date'
 */
function hasDateKeys() {
  try {
    const cfgRaw = localStorage.getItem('smtmLocalConfig');
    if (!cfgRaw) return false;
    
    const config = JSON.parse(cfgRaw);
    if (!config?.mapping) return false;
    
    const uniqueType = config.mapping.unique?.type;
    const valueType = config.mapping.value?.type;
    
    return uniqueType === 'date' || valueType === 'date';
  } catch (error) {
    console.error('[SMTM Banner] Error checking date keys:', error);
    return false;
  }
}

/**
 * Gets total sum from history
 * @returns {number} Total sum
 */
function getTotalSum() {
  try {
    const history = getHistory();
    return history.reduce((total, t) => total + (t.amount || 0), 0);
  } catch (error) {
    console.error('[SMTM Banner] Error getting total sum:', error);
    return 0;
  }
}

/**
 * Gets cell count from global state (tracked during parsing)
 * @returns {number} Cell count
 */
function getCellCount() {
  return window.SMTM?.cellCount || 0;
}

/**
 * Restores cursor panel position from localStorage
 * @param {HTMLElement} panel The panel element
 * @returns {boolean} True if position was restored
 */
function restoreCursorPanelPosition(panel) {
  const savedPosition = getCursorPanelPosition();
  if (savedPosition && savedPosition.top && savedPosition.left) {
    panel.style.position = 'fixed';
    panel.style.top = savedPosition.top;
    panel.style.left = savedPosition.left;
    panel.style.transform = 'none'; // Remove center transform when restoring position
    return true;
  }
  return false;
}

/**
 * Creates date range buttons (1d, 7d, 30d)
 * @param {Object} theme Theme configuration
 * @returns {HTMLElement} Container with buttons
 */
function createDateRangeButtons(theme) {
  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.gap = '4px';
  container.style.alignItems = 'center';

  const ranges = [
    { label: '1d', period: '1d' },
    { label: '7d', period: '7d' },
    { label: '30d', period: '30d' }
  ];

  ranges.forEach((range, index) => {
    const button = document.createElement('button');
    button.innerText = range.label;
    button.dataset.period = range.period;
    
    // Apply button theme (using shared button styles)
    if (typeof applyThemeStyles === 'function' && theme.button) {
      applyThemeStyles(button, theme, 'button', 'default');
      
      // Set default active state for first button
      if (index === 0) {
        button.classList.add('active');
        applyThemeStyles(button, theme, 'button', 'active');
      }
    }
    
    // Only cursor and border styles inline
    Object.assign(button.style, {
      cursor: 'pointer',
      border: 'none'
    });

    // Hover effects
    button.addEventListener('mouseenter', () => {
      if (!button.classList.contains('active') && typeof applyThemeStyles === 'function' && theme.button) {
        applyThemeStyles(button, theme, 'button', 'hover');
      }
    });

    button.addEventListener('mouseleave', () => {
      if (!button.classList.contains('active') && typeof applyThemeStyles === 'function' && theme.button) {
        applyThemeStyles(button, theme, 'button', 'default');
      }
    });

    // Click handler
    button.addEventListener('click', () => {
      // Update active button
      container.querySelectorAll('button').forEach(btn => {
        btn.classList.remove('active');
        if (typeof applyThemeStyles === 'function' && theme.button) {
          applyThemeStyles(btn, theme, 'button', 'default');
        }
      });
      
      button.classList.add('active');
      if (typeof applyThemeStyles === 'function' && theme.button) {
        applyThemeStyles(button, theme, 'button', 'active');
      }

      // Update selected period and refresh display
      if (window.SMTM) {
        window.SMTM.selectedPeriod = range.period;
      }

      if (typeof window.updateTotalDisplay === 'function') {
        window.updateTotalDisplay();
      }
    });

    container.appendChild(button);
  });

  return container;
}

/**
 * Creates cells counted text element with styled container
 * @param {Object} theme Theme configuration
 * @param {number} cellCount Cell count to display
 * @returns {HTMLElement} Container element with text
 */
function createCellsCountedText(theme, cellCount) {
  // Create container with cellsCount style
  const container = document.createElement('div');
  
  // Apply cellsCount theme
  if (typeof applyThemeStyles === 'function' && theme.cellsCount?.default) {
    applyThemeStyles(container, theme, 'cellsCount', 'default');
  }
  
  // Layout styles only
  Object.assign(container.style, {
    display: 'flex',
    alignItems: 'center'
  });
  
  // Create text element (no styling, just text)
  const textElement = document.createElement('span');
  textElement.innerText = `Cells counted: ${cellCount}`;
  
  // Only apply color and fontSize from panel.default (no background, border, padding)
  if (theme.panel?.default) {
    const panelStyle = theme.panel.default;
    if (panelStyle.color) {
      textElement.style.color = panelStyle.color;
    }
    if (panelStyle.fontSize) {
      const fontSize = typeof panelStyle.fontSize === 'number' ? `${panelStyle.fontSize}px` : panelStyle.fontSize;
      textElement.style.fontSize = fontSize;
    }
  }
  
  container.appendChild(textElement);
  
  return container;
}

/**
 * Creates total display block
 * @param {Object} theme Theme configuration
 * @param {boolean} showInfoIcon Whether to show info icon
 * @returns {HTMLElement} Total display container
 */
function createTotalBlock(theme, showInfoIcon = false) {
  const container = document.createElement('div');
  container.id = 'smtm-cursor-total-block';
  
  if (typeof applyThemeStyles === 'function') {
    applyThemeStyles(container, theme, 'totalBlock', 'default');
  }
  
  // Only layout styles
  Object.assign(container.style, {
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  });

  const label = document.createElement('span');
  label.innerText = 'Total:';
  if (typeof applyThemeStyles === 'function') {
    applyThemeStyles(label, theme, 'totalLabel', 'default');
  }

  const value = document.createElement('span');
  value.id = 'smtm-cursor-total-value';
  const totalSum = getTotalSum();
  const currencySymbol = window.location.hostname.includes('cursor.com') ? '$' : '';
  value.innerText = `${currencySymbol}${totalSum.toFixed(2)}`;
  if (typeof applyThemeStyles === 'function') {
    applyThemeStyles(value, theme, 'totalValue', 'default');
  }

  container.appendChild(label);
  container.appendChild(value);

  if (showInfoIcon) {
    const infoIcon = document.createElement('span');
    infoIcon.style.cursor = 'pointer';
    infoIcon.style.display = 'flex';
    infoIcon.style.alignItems = 'center';
    
    // Get dot color from theme for info icon
    const dotColor = theme.dragHandleDot?.default?.backgroundColor || theme.totalValue?.default?.color || '#878787';
    infoIcon.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 1.5C6.71442 1.5 5.45772 1.88122 4.3888 2.59545C3.31988 3.30968 2.48676 4.32484 1.99479 5.51256C1.50282 6.70028 1.37409 8.00721 1.6249 9.26809C1.8757 10.529 2.49477 11.6872 3.40381 12.5962C4.31285 13.5052 5.47104 14.1243 6.73192 14.3751C7.99279 14.6259 9.29973 14.4972 10.4874 14.0052C11.6752 13.5132 12.6903 12.6801 13.4046 11.6112C14.1188 10.5423 14.5 9.28558 14.5 8C14.4982 6.27665 13.8128 4.62441 12.5942 3.40582C11.3756 2.18722 9.72335 1.50182 8 1.5ZM8 13.5C6.91221 13.5 5.84884 13.1774 4.94437 12.5731C4.0399 11.9687 3.33495 11.1098 2.91867 10.1048C2.50238 9.09977 2.39347 7.9939 2.60568 6.927C2.8179 5.86011 3.34173 4.8801 4.11092 4.11091C4.8801 3.34172 5.86011 2.8179 6.92701 2.60568C7.9939 2.39346 9.09977 2.50238 10.1048 2.91866C11.1098 3.33494 11.9687 4.03989 12.5731 4.94436C13.1774 5.84883 13.5 6.9122 13.5 8C13.4983 9.45818 12.9184 10.8562 11.8873 11.8873C10.8562 12.9184 9.45819 13.4983 8 13.5ZM9 11C9 11.1326 8.94732 11.2598 8.85356 11.3536C8.75979 11.4473 8.63261 11.5 8.5 11.5C8.23479 11.5 7.98043 11.3946 7.7929 11.2071C7.60536 11.0196 7.5 10.7652 7.5 10.5V8C7.36739 8 7.24022 7.94732 7.14645 7.85355C7.05268 7.75979 7 7.63261 7 7.5C7 7.36739 7.05268 7.24021 7.14645 7.14645C7.24022 7.05268 7.36739 7 7.5 7C7.76522 7 8.01957 7.10536 8.20711 7.29289C8.39465 7.48043 8.5 7.73478 8.5 8V10.5C8.63261 10.5 8.75979 10.5527 8.85356 10.6464C8.94732 10.7402 9 10.8674 9 11ZM7 5.25C7 5.10166 7.04399 4.95666 7.1264 4.83332C7.20881 4.70999 7.32595 4.61386 7.46299 4.55709C7.60003 4.50032 7.75084 4.48547 7.89632 4.51441C8.04181 4.54335 8.17544 4.61478 8.28033 4.71967C8.38522 4.82456 8.45665 4.9582 8.48559 5.10368C8.51453 5.24917 8.49968 5.39997 8.44291 5.53701C8.38615 5.67406 8.29002 5.79119 8.16668 5.8736C8.04334 5.95601 7.89834 6 7.75 6C7.55109 6 7.36032 5.92098 7.21967 5.78033C7.07902 5.63968 7 5.44891 7 5.25Z" fill="${dotColor}"/></svg>`;
    
    container.appendChild(infoIcon);
  }

  return container;
}

/**
 * Updates the total value in cursor panel
 * Uses the same filtered total as the main panel (from updateTotalDisplay)
 */
function updateCursorTotal() {
  const totalValue = document.getElementById('smtm-cursor-total-value');
  const mainTotalValue = document.getElementById('smtm-total-value');
  
  if (totalValue && mainTotalValue) {
    // Use the same value as the main panel (which is already filtered by date range if applicable)
    totalValue.innerText = mainTotalValue.innerText;
  } else if (totalValue) {
    // Fallback: calculate from history if main panel doesn't exist
    const totalSum = getTotalSum();
    const currencySymbol = window.location.hostname.includes('cursor.com') ? '$' : '';
    totalValue.innerText = `${currencySymbol}${totalSum.toFixed(2)}`;
  }
}

/**
 * Updates the cells counted text in cursor panel
 */
function updateCursorCellCount() {
  const panel = document.getElementById('smtm-cursor-panel');
  if (!panel) return;
  
  // Find the cells count container and then the text span inside it
  const cellsCountContainer = panel.querySelector('div[id*="cells-count"]') || 
                              Array.from(panel.querySelectorAll('div')).find(div => 
    div.querySelector('span')?.innerText?.startsWith('Cells counted:'));
  
  if (cellsCountContainer) {
    const cellsCountedText = cellsCountContainer.querySelector('span');
    if (cellsCountedText) {
      const cellCount = getCellCount();
      cellsCountedText.innerText = `Cells counted: ${cellCount}`;
    }
  }
}

/**
 * Loads themes from themes.json if not already loaded
 * @returns {Promise<boolean>} True if themes were loaded successfully
 */
async function loadThemesIfNeeded() {
  // Check if themes are already loaded with panelThemes
  if (window.SMTM?.themes?.panelThemes?.light?.panel?.default && 
      window.SMTM?.themes?.panelThemes?.dark?.panel?.default) {
    return true;
  }

  try {
    const url = chrome.runtime.getURL('themes.json');
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch themes: ${response.statusText}`);
    }
    const themes = await response.json();
    
    // Validate structure
    if (!themes.panelThemes || !themes.panelThemes.light?.panel?.default || !themes.panelThemes.dark?.panel?.default) {
      console.error('[SMTM Cursor Panel] Invalid themes.json structure - missing panelThemes.light.panel.default or panelThemes.dark.panel.default');
      return false;
    }
    
    window.SMTM = window.SMTM || {};
    window.SMTM.themes = themes;
    console.log('[SMTM Cursor Panel] Themes loaded successfully');
    return true;
  } catch (error) {
    console.error('[SMTM Cursor Panel] Error loading themes:', error);
    window.SMTM = window.SMTM || {};
    window.SMTM.themes = window.SMTM.themes || {};
    return false;
  }
}

/**
 * Waits for themes to be loaded with retry logic
 * @param {number} maxAttempts - Maximum number of retry attempts
 * @param {number} delayMs - Delay between attempts in milliseconds
 * @returns {Promise<boolean>} True if themes are available, false if timeout
 */
async function waitForThemes(maxAttempts = 10, delayMs = 200) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Check if themes are loaded with required structure
    if (window.SMTM?.themes?.panelThemes?.light?.panel?.default && 
        window.SMTM?.themes?.panelThemes?.dark?.panel?.default) {
      return true;
    }
    
    // Try to load themes if not loaded
    if (attempt === 0) {
      const loaded = await loadThemesIfNeeded();
      if (loaded) {
        return true;
      }
    }
    
    // Wait before next attempt
    if (attempt < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  console.error('[SMTM Cursor Panel] Timeout waiting for themes to load');
  return false;
}

/**
 * Creates the Cursor-style panel DOM element
 * @param {string} themeName - The active theme name
 * @returns {Promise<HTMLElement|null>} The panel element or null if creation fails
 */
async function createCursorPanel(themeName = 'light') {
  if (!hasValidMapping()) {
    return null;
  }
  
  // Check if panel already exists (singleton pattern)
  const existingPanel = document.getElementById('smtm-cursor-panel');
  if (existingPanel) {
    return existingPanel;
  }
  
  // Wait for themes to be loaded
  const themesReady = await waitForThemes();
  if (!themesReady) {
    console.error('[SMTM Cursor Panel] Themes not available, cannot create panel');
    return null;
  }
  
  const themes = window.SMTM?.themes || {};
  const panelThemes = themes.panelThemes || {};
  const theme = panelThemes[themeName] || panelThemes.light || {};
  
  if (!theme) {
    console.error('[SMTM Cursor Panel] Theme not found:', themeName);
    return null;
  }
  
  // Create panel container
  const panel = document.createElement('div');
  panel.id = 'smtm-cursor-panel';
  
  // Ensure theme is fully loaded before applying
  const panelDefault = theme.panel?.default;
  if (!panelDefault) {
    console.error('[SMTM Cursor Panel] Theme panel.default not found for:', themeName);
    console.error('[SMTM Cursor Panel] Available themes:', Object.keys(panelThemes));
    console.error('[SMTM Cursor Panel] Theme structure:', theme);
    return null;
  }
  
  // Apply panel theme (using shared panel.default)
  if (typeof applyThemeStyles === 'function') {
    applyThemeStyles(panel, theme, 'panel', 'default');
  }
  
  // Apply defensive !important styles to ensure theme is fully applied
  // This overrides any site CSS that might interfere
  if (panelDefault.backgroundColor) {
    panel.style.setProperty('background-color', panelDefault.backgroundColor, 'important');
  }
  if (panelDefault.border) {
    panel.style.setProperty('border', panelDefault.border, 'important');
  }
  if (panelDefault.color) {
    panel.style.setProperty('color', panelDefault.color, 'important');
  }
  if (panelDefault.padding) {
    const paddingValue = typeof panelDefault.padding === 'number' 
      ? `${panelDefault.padding}px` 
      : panelDefault.padding;
    panel.style.setProperty('padding', paddingValue, 'important');
  }
  if (panelDefault.borderRadius !== undefined) {
    const borderRadiusValue = typeof panelDefault.borderRadius === 'number'
      ? `${panelDefault.borderRadius}px`
      : panelDefault.borderRadius;
    panel.style.setProperty('border-radius', borderRadiusValue, 'important');
  }
  if (panelDefault.fontSize) {
    const fontSizeValue = typeof panelDefault.fontSize === 'number'
      ? `${panelDefault.fontSize}px`
      : panelDefault.fontSize;
    panel.style.setProperty('font-size', fontSizeValue, 'important');
  }
  
  // Positioning and layout styles with !important for isolation from site CSS
  panel.style.setProperty('position', 'fixed', 'important');
  panel.style.setProperty('z-index', '10000', 'important');
  panel.style.setProperty('display', 'flex', 'important');
  panel.style.setProperty('align-items', 'center', 'important');
  panel.style.setProperty('pointer-events', 'auto', 'important');
  
  // Positioning values (no !important needed for these)
  Object.assign(panel.style, {
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    gap: '4px'
  });
  
  // Restore position if saved
  if (!restoreCursorPanelPosition(panel)) {
    // Use default centered position
    panel.style.top = '20px';
    panel.style.left = '50%';
    panel.style.transform = 'translateX(-50%)';
  }
  
  // Create drag handle
  const dragHandle = createDragHandle(theme);
  dragHandle.classList.add('drag-handle');
  panel.appendChild(dragHandle);
  
  const hasDates = hasDateKeys();
  
  if (hasDates) {
    // Create date range buttons
    const buttonContainer = createDateRangeButtons(theme);
    panel.appendChild(buttonContainer);
    
    // Create total display (without info icon when dates exist)
    const totalBlock = createTotalBlock(theme, false);
    panel.appendChild(totalBlock);
  } else {
    // Create cells counted text
    const cellCount = getCellCount();
    const cellsCountedText = createCellsCountedText(theme, cellCount);
    panel.appendChild(cellsCountedText);
    
    // Create total block with info icon
    const totalBlock = createTotalBlock(theme, true);
    panel.appendChild(totalBlock);
  }
  
  // Make panel draggable
  makeDraggable(panel, dragHandle, saveCursorPanelPosition);
  
  return panel;
}

/**
 * Shows the cursor panel if valid mapping exists
 * @param {string} themeName - The active theme name
 */
async function showCursorPanel(themeName) {
  if (!hasValidMapping()) {
    hideCursorPanel();
    return;
  }
  
  // Ensure themes are loaded before creating panel
  const themesReady = await waitForThemes();
  if (!themesReady) {
    console.error('[SMTM Cursor Panel] Cannot show panel - themes not available');
    return;
  }
  
  const panel = await createCursorPanel(themeName);
  if (panel && !document.getElementById('smtm-cursor-panel')) {
    document.body.appendChild(panel);
    console.log('[SMTM Cursor Panel] Panel displayed');
    
    // Ensure styles are fully applied after panel is added to DOM
    requestAnimationFrame(() => {
      reapplyPanelStyles(panel, themeName);
    });
  }
}

/**
 * Hides and removes the cursor panel from DOM
 */
function hideCursorPanel() {
  const panel = document.getElementById('smtm-cursor-panel');
  if (panel) {
    panel.remove();
    console.log('[SMTM Cursor Panel] Panel hidden');
  }
}

/**
 * Updates cursor panel content based on current data
 * @param {string} themeName - The active theme name
 */
async function updateCursorPanelContent(themeName) {
  const panel = document.getElementById('smtm-cursor-panel');
  if (!panel) {
    await showCursorPanel(themeName);
    return;
  }
  
  // Update total and cell count without recreating
  updateCursorTotal();
  updateCursorCellCount();
}

/**
 * Applies theme styles to the cursor panel
 * @param {string} themeName - The active theme name
 */
async function applyCursorPanelTheme(themeName) {
  const panel = document.getElementById('smtm-cursor-panel');
  if (!panel) {
    // Panel doesn't exist, check if it should be shown
    if (hasValidMapping()) {
      await showCursorPanel(themeName);
      // Ensure styles are applied after panel is created
      requestAnimationFrame(() => {
        const newPanel = document.getElementById('smtm-cursor-panel');
        if (newPanel) {
          reapplyPanelStyles(newPanel, themeName);
        }
      });
    }
    return;
  }
  
  // Recreate panel with new theme
  hideCursorPanel();
  await showCursorPanel(themeName);
  
  // Explicitly reapply all styles after recreation to ensure they stick
  requestAnimationFrame(() => {
    const newPanel = document.getElementById('smtm-cursor-panel');
    if (newPanel) {
      reapplyPanelStyles(newPanel, themeName);
    }
  });
}

/**
 * Reapplies all panel styles with !important flags
 * @param {HTMLElement} panel - The panel element
 * @param {string} themeName - The active theme name
 */
async function reapplyPanelStyles(panel, themeName) {
  // Ensure themes are loaded before accessing them
  const themesReady = await waitForThemes();
  if (!themesReady) {
    console.error('[SMTM Cursor Panel] Cannot reapply styles - themes not available');
    return;
  }
  
  const themes = window.SMTM?.themes || {};
  const panelThemes = themes.panelThemes || {};
  const theme = panelThemes[themeName] || panelThemes.light || {};
  const panelDefault = theme.panel?.default;
  
  if (!panelDefault) {
    console.error('[SMTM Cursor Panel] Cannot reapply styles - theme not found:', themeName);
    console.error('[SMTM Cursor Panel] Available themes:', Object.keys(panelThemes));
    return;
  }
  
  // Reapply defensive !important styles
  if (panelDefault.backgroundColor) {
    panel.style.setProperty('background-color', panelDefault.backgroundColor, 'important');
  }
  if (panelDefault.border) {
    panel.style.setProperty('border', panelDefault.border, 'important');
  }
  if (panelDefault.color) {
    panel.style.setProperty('color', panelDefault.color, 'important');
  }
  if (panelDefault.padding) {
    const paddingValue = typeof panelDefault.padding === 'number' 
      ? `${panelDefault.padding}px` 
      : panelDefault.padding;
    panel.style.setProperty('padding', paddingValue, 'important');
  }
  if (panelDefault.borderRadius !== undefined) {
    const borderRadiusValue = typeof panelDefault.borderRadius === 'number'
      ? `${panelDefault.borderRadius}px`
      : panelDefault.borderRadius;
    panel.style.setProperty('border-radius', borderRadiusValue, 'important');
  }
  if (panelDefault.fontSize) {
    const fontSizeValue = typeof panelDefault.fontSize === 'number'
      ? `${panelDefault.fontSize}px`
      : panelDefault.fontSize;
    panel.style.setProperty('font-size', fontSizeValue, 'important');
  }
  
  // Ensure critical layout properties
  panel.style.setProperty('position', 'fixed', 'important');
  panel.style.setProperty('z-index', '10000', 'important');
  panel.style.setProperty('display', 'flex', 'important');
}

// Export functions to global scope
window.SMTM = window.SMTM || {};
window.SMTM.banner = {
  hasValidMapping,
  hasDateKeys,
  showBanner: showCursorPanel,
  hideBanner: hideCursorPanel,
  updateBannerContent: updateCursorPanelContent,
  applyBannerTheme: applyCursorPanelTheme,
  updateCursorTotal,
  updateCursorCellCount
};
