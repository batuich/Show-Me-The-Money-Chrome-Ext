// content.js

(function() {
  'use strict';

  const PANEL_ID = 'show-me-the-money-panel';
  const DEFAULT_CONFIG = {
    bar: {
      sinceButton: true,
      '1dButton': true,
      '7dButton': true,
      '30dButton': true,
      total: true
    }
  };

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

  // Re-injection guard - prevent multiple script injections
  if (window.__SMTM_CONTENT_ATTACHED__) {
    window.SMTM.debug.log('[SMTM Core] Content script already attached, skipping re-injection');
    return;
  }
  window.__SMTM_CONTENT_ATTACHED__ = true;

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

  async function loadConfig() {
    if (window.SMTM.config) {
      return window.SMTM.config;
    }

    try {
      const url = chrome.runtime.getURL('config.json');
      window.SMTM.debug.log('[SMTM Config] Loading:', url);
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      window.SMTM.config = await res.json();
      window.SMTM.debug.log('Configuration loaded:', window.SMTM.config);
    } catch (error) {
      console.error('[SMTM] config.json not accessible; using defaults:', error);
      window.SMTM.config = { ...DEFAULT_CONFIG };
    }

    return window.SMTM.config;
  }

/**
 * Enforces the 'hidden' state of the panel by hiding it and observing
 * for style changes that might make it visible again.
 * @param {HTMLElement} panel The main panel element.
 */
function enforceHiddenState(panel) {
  const missingDataContainer = document.getElementById('smtm-missing-data-container');
  const infoTooltipContainer = document.getElementById('smtm-info-tooltip-container');

  const hideAll = () => {
    if (panel.style.display !== 'none') {
      panel.style.display = 'none';
    }
    if (missingDataContainer && missingDataContainer.style.display !== 'none') {
      missingDataContainer.style.display = 'none';
    }
    if (infoTooltipContainer && infoTooltipContainer.style.display !== 'none') {
      infoTooltipContainer.style.display = 'none';
    }
  };

  // Hide it once immediately
  hideAll();

  // Create an observer to re-apply the hidden state if it's changed by other scripts
  const observer = new MutationObserver(() => {
    if (getVisibilityState() === 'hidden' && panel.style.display !== 'none') {
      window.SMTM.debug.log('Panel visibility was changed externally. Re-enforcing hidden state.');
      hideAll();
    }
  });

  observer.observe(panel, { attributes: true, attributeFilter: ['style'] });
  window.SMTM.visibilityObserver = observer;
  window.SMTM.debug.log('Visibility observer attached to enforce hidden state.');
}

async function init() {
  window.SMTM.debug.group('Script Initialization');
  window.SMTM.debug.log('Timestamp:', new Date().toISOString());
  window.SMTM.debug.log('document.readyState:', document.readyState);
  window.SMTM.debug.log('URL:', window.location.href);
  window.SMTM.debug.log('Hostname:', window.location.hostname);
  window.SMTM.debug.groupEnd();
  window.SMTM.debug.log('[SMTM Core] Initializing content script...');

  // Wait for themes and config to be loaded
  await loadThemes();
  await loadConfig();

  const storedVisibility = getVisibilityState();
  const shouldRenderPanel = storedVisibility !== 'hidden';

  if (!shouldRenderPanel) {
    window.SMTM.debug.log('[SMTM Core] Panel hidden — skipping render due to stored state.');
  }

  const theme = window.location.hostname.includes('cursor.com') ? 'cursor' : 'dark';

  // Create the panel and insert it into the DOM when appropriate
  let panel = document.getElementById(PANEL_ID);
  if (shouldRenderPanel && !panel) {
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

  window.SMTM.debug.log('[SMTM] Refactor completed successfully.');
}

/**
 * Updates the "Since" button text based on the selected date in localStorage.
 */
function updateSinceButtonText() {
  const sinceButton = document.querySelector('.smtm-since-button');
  if (!sinceButton) return;

  const savedDate = getStoredDate();
  let selectedDate = savedDate ? new Date(savedDate) : null;

  if (!selectedDate || Number.isNaN(selectedDate.getTime())) {
    const today = new Date();
    selectedDate = new Date(today.getFullYear(), today.getMonth(), 1);
    setStoredDate(selectedDate);
  }

  const label = formatDateShort(selectedDate) || 'N/A';
  sinceButton.innerText = `Since: ${label}`;
}

// Expose the function to be called from other scripts like calendar.js
window.SMTM.updateSinceButtonText = updateSinceButtonText;

/**
 * Sets up a MutationObserver to watch for table changes with debouncing
 */
function setupTableObserver() {
  window.SMTM.debug.group('Setting up MutationObserver');
  
  // Debounce timer
  let debounceTimer = null;
  const DEBOUNCE_DELAY = 1000; // 1 second as requested
  
  // Flag to prevent processing during our own operations
  let isProcessing = false;
  
  // Track previous state to detect content changes
  let previousInnerText = '';
  let previousChildCount = 0;
  
  // Create the observer with debounced callback
  const observer = new MutationObserver(mutations => {
    // Skip if currently processing
    if (isProcessing) {
      window.SMTM.debug.log('⏭️ Ignoring mutation (currently processing)');
      return;
    }
    
    // Find the tbody to check for content changes
    const table = document.querySelector('table.w-full');
    const tbody = table?.querySelector('tbody') || table;
    
    if (!tbody) {
      window.SMTM.debug.log('⚠️ tbody not found for content comparison');
      return;
    }
    
    // Get current state
    const currentInnerText = tbody.innerText;
    const currentChildCount = tbody.children.length;
    
    // Detect content changes (React virtual DOM updates or structural changes)
    const hasContentChange = currentInnerText !== previousInnerText || currentChildCount !== previousChildCount;
    
    if (!hasContentChange) {
      window.SMTM.debug.log('⏭️ Ignoring mutation (no content changes detected)');
      return;
    }
    
    // Update tracked state
    previousInnerText = currentInnerText;
    previousChildCount = currentChildCount;
    
    window.SMTM.debug.log('[SMTM DEBUG] Triggered by MutationObserver');
    window.SMTM.debug.log('Child count:', currentChildCount);
    window.SMTM.debug.log('Mutations count:', mutations.length);
    
    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      window.SMTM.debug.log('⏱️ Debounce timer reset');
    }
    
    // Set new timer
    debounceTimer = setTimeout(() => {
      window.SMTM.debug.group('MutationObserver - Debounced execution');
      window.SMTM.debug.log('Timestamp:', new Date().toISOString());
      
      window.SMTM.debug.log('[SMTM Core] Table changed, reprocessing...');
      blinkDebugBadge(); // Visual indicator
      
      // Set processing flag
      isProcessing = true;
      
      // Process transactions
      processTransactions().finally(() => {
        isProcessing = false;
        window.SMTM.debug.log('✅ Processing complete, ready for next mutation');
      });
      
      window.SMTM.debug.groupEnd();
    }, DEBOUNCE_DELAY);
    
    window.SMTM.debug.log(`⏱️ Debounce timer set (${DEBOUNCE_DELAY}ms)`);
  });

  // Find and observe the table
  const tableContainer = document.querySelector('table.w-full') || document.querySelector('table');
  window.SMTM.debug.log('Table container found?', !!tableContainer);
  
  if (tableContainer) {
      window.SMTM.debug.log('Table container type:', tableContainer.tagName);
      window.SMTM.debug.log('Table container classes:', tableContainer.className);
      
      // Watch the <tbody> inside table.w-full, fallback to table itself
      let targetNode = tableContainer.querySelector('tbody');
      if (!targetNode) {
        // Fallback: if no tbody, observe the table itself
        targetNode = tableContainer;
        window.SMTM.debug.log('⚠️ No tbody found, observing table directly');
      } else {
        window.SMTM.debug.log('✅ Found tbody, will observe it');
      }
      
      window.SMTM.debug.log('Target node for observation:', targetNode);
      window.SMTM.debug.log('Target node tag:', targetNode?.tagName);
      
      if (targetNode) {
          // Initialize tracking with current state
          previousInnerText = targetNode.innerText || '';
          previousChildCount = targetNode.children.length || 0;
          window.SMTM.debug.log('Initial innerText length:', previousInnerText.length);
          window.SMTM.debug.log('Initial child count:', previousChildCount);
          
          // Updated observer options to catch React virtual DOM changes
          observer.observe(targetNode, { 
            childList: true,
            subtree: true,
            characterData: true,
            characterDataOldValue: false,
            attributes: false
          });
          window.SMTM.debug.log('✅ Observer started successfully');
          window.SMTM.debug.log('Observer config: { childList: true, subtree: true, characterData: true, characterDataOldValue: false, attributes: false }');
          window.SMTM.debug.log('[SMTM Core] Observer started on table tbody with React virtual DOM detection.');
          
          // Store observer reference for potential cleanup
          window.SMTM.tableObserver = observer;
      } else {
          window.SMTM.debug.log('❌ Could not find tbody or suitable target');
          window.SMTM.debug.log('[SMTM Core] Could not find a suitable node to observe for table changes.');
      }
  } else {
      window.SMTM.debug.log('❌ No table container found');
      window.SMTM.debug.log('[SMTM Core] No table container found to observe.');
      
      // Set up a delayed retry mechanism to find and observe the table
      window.SMTM.debug.log('Setting up delayed table detection (retry in 2s, 5s, 10s)...');
      const retryTimes = [2000, 5000, 10000];
      retryTimes.forEach(delay => {
          setTimeout(() => {
              window.SMTM.debug.log(`🔄 Retry attempt at ${delay}ms...`);
              const table = document.querySelector('table.w-full');
              if (table && !window.SMTM.tableObserver) {
                  window.SMTM.debug.log('✅ Table found on retry! Setting up observer...');
                  setupTableObserver(); // Recursively call to set up observer
                  blinkDebugBadge();
                  processTransactions();
              } else if (window.SMTM.tableObserver) {
                  window.SMTM.debug.log('ℹ️ Observer already running');
              } else {
                  window.SMTM.debug.log('❌ Still no table found');
              }
          }, delay);
      });
  }
  window.SMTM.debug.groupEnd();
}

/**
 * Sets up a periodic integrity check to detect React virtual DOM updates
 * that don't trigger DOM mutations
 */
function setupIntegrityCheck() {
  window.SMTM.debug.group('Setting up periodic integrity check');
  
  // Track previous state for comparison
  let previousHash = 0;
  let debounceTimer = null;
  const DEBOUNCE_DELAY = 1000; // 1 second
  const CHECK_INTERVAL = 2000; // 2 seconds
  
  // Flag to prevent processing during our own operations
  let isProcessing = false;
  
  // Function to compute hash of table content
  function computeTableHash() {
    const table = document.querySelector('table.w-full') || document.querySelector('table');
    if (!table) return 0;
    
    const tbody = table.querySelector('tbody') || table;
    const innerTextLength = tbody.innerText.length;
    const rowCount = tbody.querySelectorAll('tr').length;
    
    // Combine both metrics for a more robust hash
    return innerTextLength * 1000 + rowCount;
  }
  
  // Initialize with current state
  previousHash = computeTableHash();
  window.SMTM.debug.log('Initial table hash:', previousHash);
  
  // Set up periodic check
  const intervalId = setInterval(() => {
    // Skip if currently processing
    if (isProcessing) {
      window.SMTM.debug.log('⏭️ Integrity check skipped (currently processing)');
      return;
    }
    
    const currentHash = computeTableHash();
    
    if (currentHash === 0) {
      window.SMTM.debug.log('⚠️ Table not found during integrity check');
      return;
    }
    
    // Check if content changed
    if (currentHash !== previousHash) {
      window.SMTM.debug.log('[SMTM DEBUG] Triggered by integrity check');
      window.SMTM.debug.log('Previous hash:', previousHash);
      window.SMTM.debug.log('Current hash:', currentHash);
      
      // Update tracked state
      previousHash = currentHash;
      
      // Clear existing timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        window.SMTM.debug.log('⏱️ Integrity check debounce timer reset');
      }
      
      // Set new timer
      debounceTimer = setTimeout(() => {
        window.SMTM.debug.group('Integrity Check - Debounced execution');
        window.SMTM.debug.log('Timestamp:', new Date().toISOString());
        
        window.SMTM.debug.log('[SMTM Core] Integrity check detected changes, reprocessing...');
        blinkDebugBadge(); // Visual indicator
        
        // Set processing flag
        isProcessing = true;
        
        // Process transactions
        processTransactions().finally(() => {
          isProcessing = false;
          window.SMTM.debug.log('✅ Integrity check processing complete');
        });
        
        window.SMTM.debug.groupEnd();
      }, DEBOUNCE_DELAY);
      
      window.SMTM.debug.log(`⏱️ Integrity check debounce timer set (${DEBOUNCE_DELAY}ms)`);
    }
  }, CHECK_INTERVAL);
  
  // Store interval reference for potential cleanup
  window.SMTM.integrityCheckInterval = intervalId;
  
  window.SMTM.debug.log('✅ Integrity check started');
  window.SMTM.debug.log(`Check interval: ${CHECK_INTERVAL}ms, Debounce: ${DEBOUNCE_DELAY}ms`);
  window.SMTM.debug.log('[SMTM Core] Periodic integrity check started (every 2s).');
  
  window.SMTM.debug.groupEnd();
}

/**
 * Sets up a scroll listener to detect new rows appearing
 */
function setupScrollListener() {
  window.SMTM.debug.group('Setting up scroll listener');
  
  // Track previous row count
  let previousRowCount = 0;
  let debounceTimer = null;
  const DEBOUNCE_DELAY = 1000; // 1 second
  
  // Flag to prevent processing during our own operations
  let isProcessing = false;
  
  // Function to get current row count
  function getRowCount() {
    const table = document.querySelector('table.w-full') || document.querySelector('table');
    if (!table) return 0;
    
    const tbody = table.querySelector('tbody') || table;
    return tbody.querySelectorAll('tr').length;
  }
  
  // Initialize with current state
  previousRowCount = getRowCount();
  window.SMTM.debug.log('Initial row count:', previousRowCount);
  
  // Set up scroll listener
  const scrollHandler = () => {
    // Skip if currently processing
    if (isProcessing) {
      window.SMTM.debug.log('⏭️ Scroll check skipped (currently processing)');
      return;
    }
    
    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    // Set new timer to check after scroll ends
    debounceTimer = setTimeout(() => {
      const currentRowCount = getRowCount();
      
      if (currentRowCount === 0) {
        window.SMTM.debug.log('⚠️ Table not found during scroll check');
        return;
      }
      
      // Check if row count increased (new rows loaded)
      if (currentRowCount > previousRowCount) {
        window.SMTM.debug.log('[SMTM DEBUG] Triggered by scroll activity');
        window.SMTM.debug.log('Previous row count:', previousRowCount);
        window.SMTM.debug.log('Current row count:', currentRowCount);
        window.SMTM.debug.log('New rows detected:', currentRowCount - previousRowCount);
        
        // Update tracked state
        previousRowCount = currentRowCount;
        
        window.SMTM.debug.group('Scroll Listener - Debounced execution');
        window.SMTM.debug.log('Timestamp:', new Date().toISOString());
        
        window.SMTM.debug.log('[SMTM Core] Scroll detected new rows, reprocessing...');
        blinkDebugBadge(); // Visual indicator
        
        // Set processing flag
        isProcessing = true;
        
        // Process transactions
        processTransactions().finally(() => {
          isProcessing = false;
          window.SMTM.debug.log('✅ Scroll processing complete');
        });
        
        window.SMTM.debug.groupEnd();
      } else if (currentRowCount < previousRowCount) {
        // Row count decreased - update tracking but don't process
        window.SMTM.debug.log('Row count decreased:', currentRowCount);
        previousRowCount = currentRowCount;
      }
    }, DEBOUNCE_DELAY);
  };
  
  // Attach scroll listener to window and main scrollable container
  window.addEventListener('scroll', scrollHandler, { passive: true });
  
  // Also listen on the table container if it's scrollable
  const tableContainer = document.querySelector('table.w-full')?.closest('div[style*="overflow"]');
  if (tableContainer) {
    tableContainer.addEventListener('scroll', scrollHandler, { passive: true });
    window.SMTM.debug.log('✅ Scroll listener attached to table container');
  }
  
  // Store handler reference for potential cleanup
  window.SMTM.scrollHandler = scrollHandler;
  
  window.SMTM.debug.log('✅ Scroll listener started');
  window.SMTM.debug.log(`Debounce delay: ${DEBOUNCE_DELAY}ms`);
  window.SMTM.debug.log('[SMTM Core] Scroll listener started (debounced 1s).');
  
  window.SMTM.debug.groupEnd();
}

async function processTransactions() {
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
    window.SMTM.debug.log(`[SMTM Core] Added/updated ${newEntriesCount} entries.`);
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

  if (!startDate) {
    const savedDate = getStoredDate();
    if (savedDate) {
      startDate = new Date(savedDate);
    }
    if (!startDate || Number.isNaN(startDate.getTime())) {
      const today = new Date();
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      setStoredDate(startDate);
    }
  }

  if (!endDate) {
    endDate = new Date();
  }

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  const filteredHistory = history.filter(t => {
    const transactionDate = new Date(t.date);
    return transactionDate >= startDate && transactionDate <= endDate;
  });

  const isCursorHost = window.location.hostname.includes('cursor.com');
  const currencySymbol = isCursorHost ? '$' : '';
  const themeName = isCursorHost ? 'cursor' : 'dark';
  const total = filteredHistory.reduce((sum, t) => sum + t.amount, 0);
  updateTotal(total, currencySymbol);

  const hasData = filteredHistory.length > 0;
  const missingDays = hasData ? checkForMissingDays(history, startDate, endDate) : [];
  const today = new Date();
  try {
    if (!hasData) {
      toggleMissingDataLabel(themeName, [], { forceShow: true });
    } else if (today.getDate() > 3) {
      toggleMissingDataLabel(themeName, missingDays);
    } else {
      toggleMissingDataLabel(themeName, []);
    }
  } catch (error) {
    window.SMTM?.debug?.log('[SMTM Tip] toggle failed, using safe no-op', error?.message || error);
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

  function bootstrap() {
    if (window.__SMTM_INIT_STARTED__) return;
    window.__SMTM_INIT_STARTED__ = true;
    window.SMTM.debug.log('[SMTM Init] Bootstrap triggered');

    try {
      createDebugBadge();
      init();
    } catch (error) {
      console.error('[SMTM Init] Initialization failed:', error);
    }
  }

  // Ensure the script runs after the page has fully loaded
  if (document.readyState === 'loading') {
    window.SMTM.debug.log('⏳ Waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', () => {
      window.SMTM.debug.log('✅ DOMContentLoaded fired');
      bootstrap();
    });
  } else {
    window.SMTM.debug.log('✅ DOM already ready');
    bootstrap();
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
          const currentVisibility = getVisibilityState();
          const newVisibility = currentVisibility === 'hidden' ? 'visible' : 'hidden';
          let panel = document.getElementById(PANEL_ID);

          if (!panel && newVisibility === 'visible') {
            await loadThemes();
            await loadConfig();
            const theme = window.location.hostname.includes('cursor.com') ? 'cursor' : 'dark';
            panel = await createPanel(theme);
            updateTotalDisplay();
          }

          if (!panel) {
            setVisibilityState('hidden');
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

          setVisibilityState(newVisibility);

          sendResponse({ status: newVisibility });
        } catch (error) {
          console.error('Show Me The Money: Failed to toggle panel:', error);
          sendResponse({ status: 'error', message: error?.message || 'unknown_error' });
        }
      })();
    }
    return true; // Indicates that the response is sent asynchronously
  });

})(); // End of IIFE
