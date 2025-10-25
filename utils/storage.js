// utils/storage.js

/**
 * Retrieves daily usage data from localStorage.
 * @returns {Object} An object mapping dates (YYYY-MM-DD) to daily costs.
 */
function getDailyUsageData() {
  const data = localStorage.getItem('smtmUsageDaily');
  return data ? JSON.parse(data) : {};
}

/**
 * Saves daily usage data to localStorage.
 * @param {Object} data An object mapping dates to daily costs.
 */
function saveDailyUsageData(data) {
  localStorage.setItem('smtmUsageDaily', JSON.stringify(data));
}

/**
 * Merges new daily cost data with existing data in localStorage.
 * @param {Object} newData An object mapping dates to daily costs.
 * @returns {number} The number of new or updated entries.
 */
function mergeDailyData(newData) {
  const existingData = getDailyUsageData();
  let updateCount = 0;

  for (const [date, cost] of Object.entries(newData)) {
    // Add new dates or update if the new cost is different/greater
    if (!existingData[date] || existingData[date] !== cost) {
      existingData[date] = cost;
      updateCount++;
    }
  }

  saveDailyUsageData(existingData);
  return updateCount;
}

/**
 * Retrieves all transaction history from localStorage (legacy support).
 * @returns {Array} An array of transaction objects.
 */
function getHistory() {
  // First try to get from the new daily format
  const dailyData = getDailyUsageData();
  if (Object.keys(dailyData).length > 0) {
    // Convert daily data to transaction array format for compatibility
    return Object.entries(dailyData).map(([date, amount]) => ({
      date,
      amount,
      id: date // Use date as ID for daily data
    }));
  }

  // Fallback to legacy transaction format
  const history = localStorage.getItem('transactionHistory');
  return history ? JSON.parse(history) : [];
}

/**
 * Saves the transaction history to localStorage (legacy support).
 * @param {Array} history An array of transaction objects.
 */
function saveHistory(history) {
  localStorage.setItem('transactionHistory', JSON.stringify(history));
}

/**
 * Adds a new transaction to the history, avoiding duplicates (legacy support).
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
