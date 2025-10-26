// content.js

(function() {
  'use strict';

  // Re-injection guard - prevent multiple script injections
  if (window.__SMTM_CONTENT_ATTACHED__) {
    console.log('[SMTM] Content script already attached, skipping re-injection');
    return;
  }
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

  const theme = window.location.hostname.includes('cursor.com') ? 'cursor' : 'dark';

  // Create the panel and insert it into the DOM
  const panel = await createPanel(theme);

  // The panel's position is handled by createPanel and restorePanelPosition

  // Initial parsing and update
  window.SMTM.debug.log('📊 Starting initial processTransactions...');
  processTransactions();

  // Set up a MutationObserver to watch for changes in the table
  const observer = new MutationObserver(mutations => {
    window.SMTM.debug.group('MutationObserver triggered');
    window.SMTM.debug.log('Timestamp:', new Date().toISOString());
    window.SMTM.debug.log('Mutations count:', mutations.length);
    
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        window.SMTM.debug.log('ChildList mutation detected');
        window.SMTM.debug.log('Added nodes:', mutation.addedNodes.length);
        window.SMTM.debug.log('Removed nodes:', mutation.removedNodes.length);
        window.SMTM.debug.log('Target:', mutation.target);
        window.SMTM.debug.groupEnd();
        
        // A simple check to see if rows were added/removed
        console.log("Show Me The Money: Table changed, reprocessing...");
        blinkDebugBadge(); // Visual indicator
        processTransactions();
        break;
      }
    }
  });

  // Identify the correct table container to observe
  window.SMTM.debug.group('Setting up MutationObserver');
  const tableContainer = document.querySelector('div[role="table"]') || document.querySelector('table.w-full') || document.querySelector('table');
  window.SMTM.debug.log('Table container found?', !!tableContainer);
  
  if (tableContainer) {
      window.SMTM.debug.log('Table container type:', tableContainer.tagName);
      window.SMTM.debug.log('Table container classes:', tableContainer.className);
      
      // For div-tables, observe the container. For html tables, observe the tbody.
      const targetNode = tableContainer.tagName.toLowerCase() === 'table' ? tableContainer.querySelector('tbody') : tableContainer;
      window.SMTM.debug.log('Target node for observation:', targetNode);
      
      if (targetNode) {
          observer.observe(targetNode, { childList: true, subtree: true });
          window.SMTM.debug.log('✅ Observer started successfully');
          console.log("Show Me The Money: Observer started on table container.");
      } else {
          window.SMTM.debug.log('❌ Could not find tbody or suitable target');
          console.log("Show Me The Money: Could not find a suitable node to observe for table changes.");
      }
  } else {
      window.SMTM.debug.log('❌ No table container found');
      console.log("Show Me The Money: No table container found to observe.");
      
      // Set up a delayed retry mechanism
      window.SMTM.debug.log('Setting up delayed table detection (retry in 2s, 5s, 10s)...');
      const retryTimes = [2000, 5000, 10000];
      retryTimes.forEach(delay => {
          setTimeout(() => {
              window.SMTM.debug.log(`🔄 Retry attempt at ${delay}ms...`);
              const table = document.querySelector('table.w-full');
              if (table) {
                  window.SMTM.debug.log('✅ Table found on retry!');
                  blinkDebugBadge();
                  processTransactions();
              } else {
                  window.SMTM.debug.log('❌ Still no table found');
              }
          }, delay);
      });
  }
  window.SMTM.debug.groupEnd();
}

function processTransactions() {
  window.SMTM.debug.group('processTransactions');
  window.SMTM.debug.log('Timestamp:', new Date().toISOString());
  
  const parsedData = parseTransactionTable();
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
      window.SMTM.debug.log('Number of dates:', Object.keys(parsedData).length);
      // New daily data format
      newEntriesCount = mergeDailyData(parsedData);
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

// Make updateTotalDisplay globally accessible so it can be called from uiHelpers.js
window.updateTotalDisplay = function(startDate, endDate) {
  const history = getHistory();

  if (!startDate || !endDate) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    startDate = thirtyDaysAgo;
    endDate = new Date();
  }

  const filteredHistory = history.filter(t => {
    const transactionDate = new Date(t.date);
    return transactionDate >= startDate && transactionDate <= endDate;
  });

  const total = filteredHistory.reduce((sum, t) => sum + t.amount, 0);
  const currencySymbol = window.location.hostname.includes('cursor.com') ? '$' : '';

  updateTotal(total, currencySymbol);

  const theme = window.location.hostname.includes('cursor.com') ? 'cursor' : 'dark';
  const missingDays = checkForMissingDays(history, startDate, endDate);

  // Show warning only if today is not within the first 3 days of the month
  const today = new Date();
  if (today.getDate() > 3) {
    toggleMissingDataLabel(theme, missingDays);
  } else {
    toggleMissingDataLabel(theme, []); // Pass empty array to hide it
  }
}

/**
 * Creates a debug badge indicator in the top-right corner
 */
function createDebugBadge() {
  if (!window.SMTM_DEBUG) return;
  
  const badge = document.createElement('div');
  badge.id = 'smtm-debug-badge';
  badge.innerText = 'SMTM Debug ON';
  
  Object.assign(badge.style, {
    position: 'fixed',
    top: '10px',
    right: '10px',
    backgroundColor: '#ff6b35',
    color: '#fff',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 'bold',
    fontFamily: 'monospace',
    zIndex: '99999',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    transition: 'all 0.3s ease',
    pointerEvents: 'none'
  });
  
  document.body.appendChild(badge);
  window.SMTM.debug.log('✅ Debug badge created');
  
  return badge;
}

/**
 * Makes the debug badge blink to indicate parsing activity
 */
function blinkDebugBadge() {
  if (!window.SMTM_DEBUG) return;
  
  const badge = document.getElementById('smtm-debug-badge');
  if (!badge) return;
  
  // Blink animation
  badge.style.backgroundColor = '#00ff00';
  badge.style.transform = 'scale(1.1)';
  
  setTimeout(() => {
    badge.style.backgroundColor = '#ff6b35';
    badge.style.transform = 'scale(1)';
  }, 300);
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

})(); // End of IIFE
