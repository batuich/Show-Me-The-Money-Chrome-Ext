/**
 * @fileoverview This file is the main entry point for the extension's content script.
 */

import { parseTransactionTable } from '/utils/dom.js';
import { addTransaction, getDailyUsageData, mergeDailyData } from '/utils/storage.js';
import { updateTotalDisplay, enforceHiddenState, updateSinceButtonText, createPanel } from '/ui/panel.js';
import { loadThemes } from '/ui/theme.js';

// Re-injection guard - prevent multiple script injections
if (window.__SMTM_CONTENT_ATTACHED__) {
  console.log('[SMTM] Content script already attached, skipping re-injection');
} else {
  window.__SMTM_CONTENT_ATTACHED__ = true;

  // Create global namespace and debug helpers (only once)
  if (!window.SMTM) window.SMTM = {};
  if (!window.SMTM.debug) window.SMTM.debug = {};
  if (typeof window.SMTM.DEBUG !== 'boolean') window.SMTM.DEBUG = true;

  if (typeof window.SMTM.debug.log !== 'function') {
    window.SMTM.debug.log = function(message, data) {
      if (!window.SMTM.DEBUG) return;
      console.log('[SMTM DEBUG] ' + message, (data ?? ''));
    };
  }

  if (typeof window.SMTM.debug.group !== 'function') {
    window.SMTM.debug.group = function(label) {
      if (!window.SMTM.DEBUG) return;
      console.group('🔍 [SMTM DEBUG] ' + label);
    };
  }

  if (typeof window.SMTM.debug.groupEnd !== 'function') {
    window.SMTM.debug.groupEnd = function() {
      if (!window.SMTM.DEBUG) return;
      console.groupEnd();
    };
  }

  if (typeof window.SMTM.debug.table !== 'function') {
    window.SMTM.debug.table = function(obj) {
      if (!window.SMTM.DEBUG) return;
      console.table(obj);
    };
  }

  /**
   * Parses the transaction table, updates the storage, and refreshes the UI.
   */
  export async function processTransactions() {
    window.SMTM.debug.group('processTransactions');
    window.SMTM.debug.log('Timestamp:', new Date().toISOString());

    const parsedData = await parseTransactionTable();
    window.SMTM.debug.log('Parsed data type:', Array.isArray(parsedData) ? 'Array' : typeof parsedData);
    window.SMTM.debug.log('Parsed data:', parsedData);

    let newEntriesCount = 0;

    // Check if we got daily data (object) or transaction array (legacy)
    if (parsedData && typeof parsedData === 'object') {
      if (Array.isArray(parsedData)) {
        window.SMTM.debug.log('Processing as legacy transaction array format');
        window.SMTM.debug.log('Array length:', parsedData.length);
        // Legacy transaction array format
        parsedData.forEach(t => {
          if (addTransaction(t)) {
            newEntriesCount++;
          }
        });
      } else {
        window.SMTM.debug.log('Processing as new daily data format');
        window.SMTM.debug.log('📊 Parsed rows count:', Object.keys(parsedData).length);

        // Get existing data before merge
        const existingData = getDailyUsageData();
        const beforeMergeCount = Object.keys(existingData).length;
        window.SMTM.debug.log('📦 Unique days BEFORE merge:', beforeMergeCount);

        // New daily data format
        newEntriesCount = mergeDailyData(parsedData);

        // Get data after merge
        const afterMergeData = getDailyUsageData();
        const afterMergeCount = Object.keys(afterMergeData).length;
        window.SMTM.debug.log('📦 Unique days AFTER merge:', afterMergeCount);
        window.SMTM.debug.log('✨ New or updated entries:', newEntriesCount);
      }
    } else {
      window.SMTM.debug.log('⚠️ No valid data returned from parseTransactionTable');
    }

    window.SMTM.debug.log('New/updated entries count:', newEntriesCount);

    if (newEntriesCount > 0) {
      console.log(`Show Me The Money: Added/updated ${newEntriesCount} entries.`);
    } else {
      window.SMTM.debug.log('⚠️ No new entries were added to storage');
    }

    // Check current storage state
    const currentData = getDailyUsageData();
    window.SMTM.debug.log('Current localStorage data:', currentData);
    window.SMTM.debug.log('Total dates in storage:', Object.keys(currentData).length);

    updateTotalDisplay(); // Initial display with default range
    window.SMTM.debug.groupEnd();
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'clearData') {
      // Clear the page's localStorage, where the extension data is stored.
      localStorage.clear();

      // Now, update the UI to reflect the cleared data.
      if (window.updateTotalDisplay) {
        window.updateTotalDisplay();
      }

      sendResponse({ status: 'cleared_and_updated' });
      return true; // Keep message channel open for async response
    }

    if (request.action === 'togglePanel') {
      (async () => {
        try {
          const currentVisibility = localStorage.getItem('smtmPanelVisibility') || 'visible';
          const newVisibility = currentVisibility === 'hidden' ? 'visible' : 'hidden';
          let panel = document.getElementById('smtm-cursor-panel') || document.getElementById('show-me-the-money-panel');

          if (!panel && newVisibility === 'visible') {
            await loadThemes();
            // Ensure config is loaded before creating the panel
            if (!window.SMTM.config) {
              try {
                const url = chrome.runtime.getURL('config.json');
                console.log('[SMTM config] URL:', url);
                const res = await fetch(url, { cache: 'no-store' });
                if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
                window.SMTM.config = await res.json();
                window.SMTM.debug.log('Configuration loaded during toggle:', window.SMTM.config);
              } catch (error) {
                console.error('[SMTM] config.json not accessible; using defaults:', error);
                window.SMTM.config = {
                  "bar": { "sinceButton": true, "1dButton": true, "7dButton": true, "30dButton": true, "total": true }
                };
              }
            }
            const theme = window.location.hostname.includes('cursor.com') ? 'cursor' : 'dark';
            panel = await createPanel(theme);
            updateTotalDisplay();
          }

          if (!panel) {
            localStorage.setItem('smtmPanelVisibility', 'hidden');
            sendResponse({ status: 'not_found' });
            return;
          }

          // If there's an observer enforcing a hidden state, disconnect it
          // so the user's action can take effect.
          if (window.SMTM.visibilityObserver) {
            window.SMTM.visibilityObserver.disconnect();
            window.SMTM.visibilityObserver = null;
            window.SMTM.debug.log('Visibility observer disconnected by user action.');
          }

          const missingDataContainer = document.getElementById('smtm-missing-data-container');
          const infoTooltipContainer = document.getElementById('smtm-info-tooltip-container');

          if (newVisibility === 'hidden') {
            // Hide everything and enforce persisted hidden state
            panel.style.display = 'none';
            if (missingDataContainer) {
              missingDataContainer.style.display = 'none';
            }
            if (infoTooltipContainer) {
              infoTooltipContainer.style.display = 'none';
            }
            enforceHiddenState(panel);
          } else {
            // Show panel and missing data container (if it exists)
            panel.style.display = 'flex';
            if (missingDataContainer) {
              missingDataContainer.style.display = 'block';
            }
          }

          localStorage.setItem('smtmPanelVisibility', newVisibility);

          sendResponse({ status: newVisibility });
        } catch (error) {
          console.error('Show Me The Money: Failed to toggle panel:', error);
          sendResponse({ status: 'error', message: error?.message || 'unknown_error' });
        }
      })();
    }
    return true; // Indicates that the response is sent asynchronously
  });
}
