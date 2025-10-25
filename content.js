// content.js

// Debug mode - set to false to disable detailed logging
const SMTM_DEBUG = true;

function debugLog(message, data) {
  if (!SMTM_DEBUG) return;
  console.log(`[SMTM DEBUG] ${message}`, data !== undefined ? data : '');
}

function debugGroup(title) {
  if (!SMTM_DEBUG) return;
  console.group(`🔍 [SMTM DEBUG] ${title}`);
}

function debugGroupEnd() {
  if (!SMTM_DEBUG) return;
  console.groupEnd();
}

async function init() {
  debugGroup('Script Initialization');
  debugLog('Timestamp:', new Date().toISOString());
  debugLog('document.readyState:', document.readyState);
  debugLog('URL:', window.location.href);
  debugLog('Hostname:', window.location.hostname);
  debugGroupEnd();
  
  console.log("Show Me The Money: Initializing...");

  // Wait for themes to be loaded
  await loadThemes();

  const theme = window.location.hostname.includes('cursor.com') ? 'cursor' : 'dark';

  // Create the panel and insert it into the DOM
  const panel = await createPanel(theme);

  // The panel's position is handled by createPanel and restorePanelPosition

  // Initial parsing and update
  debugLog('📊 Starting initial processTransactions...');
  processTransactions();

  // Set up a MutationObserver to watch for changes in the table
  const observer = new MutationObserver(mutations => {
    debugGroup('MutationObserver triggered');
    debugLog('Timestamp:', new Date().toISOString());
    debugLog('Mutations count:', mutations.length);
    
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        debugLog('ChildList mutation detected');
        debugLog('Added nodes:', mutation.addedNodes.length);
        debugLog('Removed nodes:', mutation.removedNodes.length);
        debugLog('Target:', mutation.target);
        debugGroupEnd();
        
        // A simple check to see if rows were added/removed
        console.log("Show Me The Money: Table changed, reprocessing...");
        blinkDebugBadge(); // Visual indicator
        processTransactions();
        break;
      }
    }
  });

  // Identify the correct table container to observe
  debugGroup('Setting up MutationObserver');
  const tableContainer = document.querySelector('div[role="table"]') || document.querySelector('table.w-full') || document.querySelector('table');
  debugLog('Table container found?', !!tableContainer);
  
  if (tableContainer) {
      debugLog('Table container type:', tableContainer.tagName);
      debugLog('Table container classes:', tableContainer.className);
      
      // For div-tables, observe the container. For html tables, observe the tbody.
      const targetNode = tableContainer.tagName.toLowerCase() === 'table' ? tableContainer.querySelector('tbody') : tableContainer;
      debugLog('Target node for observation:', targetNode);
      
      if (targetNode) {
          observer.observe(targetNode, { childList: true, subtree: true });
          debugLog('✅ Observer started successfully');
          console.log("Show Me The Money: Observer started on table container.");
      } else {
          debugLog('❌ Could not find tbody or suitable target');
          console.log("Show Me The Money: Could not find a suitable node to observe for table changes.");
      }
  } else {
      debugLog('❌ No table container found');
      console.log("Show Me The Money: No table container found to observe.");
      
      // Set up a delayed retry mechanism
      debugLog('Setting up delayed table detection (retry in 2s, 5s, 10s)...');
      const retryTimes = [2000, 5000, 10000];
      retryTimes.forEach(delay => {
          setTimeout(() => {
              debugLog(`🔄 Retry attempt at ${delay}ms...`);
              const table = document.querySelector('table.w-full');
              if (table) {
                  debugLog('✅ Table found on retry!');
                  blinkDebugBadge();
                  processTransactions();
              } else {
                  debugLog('❌ Still no table found');
              }
          }, delay);
      });
  }
  debugGroupEnd();
}

function processTransactions() {
  debugGroup('processTransactions');
  debugLog('Timestamp:', new Date().toISOString());
  
  const parsedData = parseTransactionTable();
  debugLog('Parsed data type:', Array.isArray(parsedData) ? 'Array' : typeof parsedData);
  debugLog('Parsed data:', parsedData);
  
  let newEntriesCount = 0;

  // Check if we got daily data (object) or transaction array (legacy)
  if (parsedData && typeof parsedData === 'object') {
    if (Array.isArray(parsedData)) {
      debugLog('Processing as legacy transaction array format');
      debugLog('Array length:', parsedData.length);
      // Legacy transaction array format
      parsedData.forEach(t => {
        if (addTransaction(t)) {
          newEntriesCount++;
        }
      });
    } else {
      debugLog('Processing as new daily data format');
      debugLog('Number of dates:', Object.keys(parsedData).length);
      // New daily data format
      newEntriesCount = mergeDailyData(parsedData);
    }
  } else {
    debugLog('⚠️ No valid data returned from parseTransactionTable');
  }

  debugLog('New/updated entries count:', newEntriesCount);
  
  if (newEntriesCount > 0) {
    console.log(`Show Me The Money: Added/updated ${newEntriesCount} entries.`);
  } else {
    debugLog('⚠️ No new entries were added to storage');
  }

  // Check current storage state
  const currentData = getDailyUsageData();
  debugLog('Current localStorage data:', currentData);
  debugLog('Total dates in storage:', Object.keys(currentData).length);

  updateTotalDisplay(); // Initial display with default range
  debugGroupEnd();
}

function updateTotalDisplay(startDate, endDate) {
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
  if (!SMTM_DEBUG) return;
  
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
  debugLog('✅ Debug badge created');
  
  return badge;
}

/**
 * Makes the debug badge blink to indicate parsing activity
 */
function blinkDebugBadge() {
  if (!SMTM_DEBUG) return;
  
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
  debugLog('⏳ Waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', () => {
    debugLog('✅ DOMContentLoaded fired');
    createDebugBadge();
    init();
  });
} else {
  debugLog('✅ DOM already ready');
  // Create debug badge immediately if DOM is ready
  if (document.body) {
    createDebugBadge();
  } else {
    // Wait a bit if body isn't ready yet
    setTimeout(createDebugBadge, 100);
  }
  init();
}
