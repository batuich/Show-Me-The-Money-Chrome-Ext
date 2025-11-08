/**
 * @fileoverview This file handles the initialization of the extension, including loading themes and configuration, creating the UI, and setting up observers.
 */

import { createPanel, createDebugBadge, enforceHiddenState, updateSinceButtonText } from '/ui/panel.js';
import { processTransactions } from '/core/main.js';
import { setupTableObserver, setupIntegrityCheck, setupScrollListener } from '/core/observer.js';
import { loadThemes } from '/ui/theme.js';

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
  await loadThemes();

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
    panel = await createPanel(theme);
  }

  // The panel's position is handled by createPanel and restorePanelPosition

  // Initial parsing and update
  window.SMTM.debug.log('📊 Starting initial processTransactions...');
  processTransactions();

  // Set up table observer with debouncing
  setupTableObserver();

  // Set up periodic integrity check
  setupIntegrityCheck();

  // Set up scroll listener
  setupScrollListener();

  // Restore and enforce visibility state from localStorage
  if (panel && storedVisibility === 'hidden') {
    enforceHiddenState(panel);
  }

  // Initial update for the "Since" button
  if (panel) {
    updateSinceButtonText();
  }
}

// Ensure the script runs after the page has fully loaded
if (document.readyState === 'loading') {
  window.SMTM.debug.log('⏳ Waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', () => {
    window.SMTM.debug.log('✅ DOMContentLoaded fired');
    createDebugBadge();
    init();
  });
} else {
  window.SMTM.debug.log('✅ DOM already ready');
  // Create debug badge immediately if DOM is ready
  if (document.body) {
    createDebugBadge();
  } else {
    // Wait a bit if body isn't ready yet
    setTimeout(createDebugBadge, 100);
  }
  init();
}
