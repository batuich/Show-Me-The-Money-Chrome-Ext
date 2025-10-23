// content.js

async function init() {
  console.log("Show Me The Money: Initializing...");

  // Wait for themes to be loaded
  await loadThemes();

  const theme = window.location.hostname.includes('cursor.com') ? 'cursor' : 'dark';

  // Create the panel and insert it into the DOM
  const panel = await createPanel(theme);

  // The panel's position is handled by createPanel and restorePanelPosition

  // Initial parsing and update
  processTransactions();

  // Set up a MutationObserver to watch for changes in the table
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        // A simple check to see if rows were added/removed
        console.log("Show Me The Money: Table changed, reprocessing...");
        processTransactions();
        break;
      }
    }
  });

  // Identify the correct table container to observe
  const tableContainer = document.querySelector('div[role="table"]') || document.querySelector('table');
  if (tableContainer) {
      // For div-tables, observe the container. For html tables, observe the tbody.
      const targetNode = tableContainer.tagName.toLowerCase() === 'table' ? tableContainer.querySelector('tbody') : tableContainer;
      if (targetNode) {
          observer.observe(targetNode, { childList: true, subtree: true });
          console.log("Show Me The Money: Observer started on table container.");
      } else {
          console.log("Show Me The Money: Could not find a suitable node to observe for table changes.");
      }
  } else {
      console.log("Show Me The Money: No table container found to observe.");
  }
}

function processTransactions() {
  const newTransactions = parseTransactionTable();
  let newEntriesCount = 0;

  newTransactions.forEach(t => {
    if (addTransaction(t)) {
      newEntriesCount++;
    }
  });

  if (newEntriesCount > 0) {
    console.log(`Show Me The Money: Added ${newEntriesCount} new transactions.`);
  }

  updateTotalDisplay(); // Initial display with default range
}

function updateTotalDisplay(startDate, endDate) {
  const history = getHistory();

  if (!startDate || !endDate) {
    endDate = new Date();
    startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
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
  toggleMissingDataLabel(theme, missingDays);
}

// Ensure the script runs after the page has fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
