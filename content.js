// content.js

async function init() {
  console.log("Show Me The Money: Initializing...");

  // Wait for themes to be loaded
  await loadThemes();

  const theme = window.location.hostname.includes('cursor.com') ? 'cursor' : 'dark';

  // Create the panel and insert it into the DOM
  const panel = createPanel(theme);

  // Position the panel
  if (!restorePanelPosition(panel)) {
    const userMenu = document.querySelector('[aria-label="User menu"]');
    if (userMenu) {
      const rect = userMenu.getBoundingClientRect();
      panel.style.top = `${rect.top}px`;
      panel.style.left = `${rect.left - panel.offsetWidth - 10}px`;
    }
  }

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

  // Start observing the table body for changes
  const table = document.querySelector('table');
  if (table) {
    const tableBody = table.querySelector('tbody');
    if (tableBody) {
      observer.observe(tableBody, { childList: true });
    }
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

  const missingDays = checkForMissingDays(history, startDate, endDate);
  if (missingDays.length > 0) {
    const theme = window.location.hostname.includes('cursor.com') ? 'cursor' : 'dark';
    showMissingDataLabel(theme, missingDays);
  } else {
    // Hide or remove the label if it exists and there are no missing days
    const label = document.getElementById('smtm-missing-data-label');
    if (label) {
      label.remove();
    }
  }
}

// Ensure the script runs after the page has fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
