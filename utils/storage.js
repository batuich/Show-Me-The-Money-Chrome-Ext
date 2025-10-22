// utils/storage.js

/**
 * Retrieves all transaction history from localStorage.
 * @returns {Array} An array of transaction objects.
 */
function getHistory() {
  const history = localStorage.getItem('transactionHistory');
  return history ? JSON.parse(history) : [];
}

/**
 * Saves the transaction history to localStorage.
 * @param {Array} history An array of transaction objects.
 */
function saveHistory(history) {
  localStorage.setItem('transactionHistory', JSON.stringify(history));
}

/**
 * Adds a new transaction to the history, avoiding duplicates.
 * @param {Object} transaction The transaction object to add.
 * @returns {boolean} True if the transaction was added, false otherwise.
 */
function addTransaction(transaction) {
  const history = getHistory();
  const isDuplicate = history.some(t => t.id === transaction.id);
  if (!isDuplicate) {
    history.push(transaction);
    saveHistory(history);
    return true;
  }
  return false;
}

/**
 * Retrieves the saved panel position from localStorage.
 * @returns {Object|null} An object with top and left properties, or null.
 */
function getPanelPosition() {
  const position = localStorage.getItem('panelPosition');
  return position ? JSON.parse(position) : null;
}

/**
 * Saves the panel position to localStorage.
 * @param {Object} position An object with top and left properties.
 */
function savePanelPosition(position) {
  localStorage.setItem('panelPosition', JSON.stringify(position));
}
