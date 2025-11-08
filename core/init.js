/**
 * @fileoverview This file handles the initialization of the extension, including loading themes and configuration, creating the UI, and setting up observers.
 */

window.SMTM = window.SMTM || {};

/**
 * Initializes the extension.
 */
async function init() {
  window.SMTM.debug.group('Script Initialization');
  window.SMTM.debug.log('Timestamp:', new Date().toISOString());
  window.SMTM.debug.log('document.readyState:', document.readyState);
  window.SMTM.debug.log('URL:', window.location.href);
  window.SMTM.debug.log('Hostname:', window.location.hostname);
  window.SMTM.debug.groupEnd();

  console.log("Show Me The Money: Initializing...");

  // Wait for themes to be loaded
  await window.SMTM.loadThemes();

  // Load configuration
  try {
    const url = chrome.runtime.getURL('config.json');
    console.log('[SMTM config] URL:', url);
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    window.SMTM.config = await res.json();
    window.SMTM.debug.log('Configuration loaded:', window.SMTM.config);
  } catch (error) {
    console.error('[SMTM] config.json not accessible; using defaults:', error);
    // Define a default config to prevent errors if loading fails
    window.SMTM.config = {
      "bar": {
        "sinceButton": true,
        "1dButton": true,
        "7dButton": true,
        "30dButton": true,
        "total": true
      }
    };
  }

  const storedVisibility = localStorage.getItem('smtmPanelVisibility');
  const shouldRenderPanel = storedVisibility !== 'hidden';

  if (!shouldRenderPanel) {
    console.log('[SMTM Init] Panel hidden — skipping render due to stored state.');
  }

  const theme = window.location.hostname.includes('cursor.com') ? 'cursor' : 'dark';

  // Create the panel and insert it into the DOM when appropriate
  let panel = null;
  if (shouldRenderPanel) {
    panel = await window.SMTM.createPanel(theme);
  }

  // The panel's position is handled by createPanel and restorePanelPosition

  // Initial parsing and update
  window.SMTM.debug.log('📊 Starting initial processTransactions...');
  window.SMTM.processTransactions();

  // Set up table observer with debouncing
  window.SMTM.setupTableObserver();

  // Set up periodic integrity check
  window.SMTM.setupIntegrityCheck();

  // Set up scroll listener
  window.SMTM.setupScrollListener();

  // Restore and enforce visibility state from localStorage
  if (panel && storedVisibility === 'hidden') {
    window.SMTM.enforceHiddenState(panel);
  }

  // Initial update for the "Since" button
  if (panel) {
    window.SMTM.updateSinceButtonText();
  }
}

// Ensure the script runs after the page has fully loaded
window.SMTM.init = async function() {
  if (document.readyState === 'loading') {
    window.SMTM.debug.log('⏳ Waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', () => {
      window.SMTM.debug.log('✅ DOMContentLoaded fired');
      init();
    });
  } else {
    window.SMTM.debug.log('✅ DOM already ready');
    init();
  }
}
