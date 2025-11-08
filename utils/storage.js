// utils/storage.js

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDateInput(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDateKey(value);
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  return null;
}

/**
 * Returns the stored date used for the "Since" range.
 * @returns {string|null} ISO-like date string.
 */
function getStoredDate() {
  return localStorage.getItem('smtmSelectedDate');
}

/**
 * Persists the selected date in localStorage.
 * @param {string|Date} value - Date string or object.
 * @returns {string|null} Stored value for chaining.
 */
function setStoredDate(value) {
  const normalized = normalizeDateInput(value);
  if (!normalized) return null;
  localStorage.setItem('smtmSelectedDate', normalized);
  return normalized;
}

/**
 * Returns the stored visibility state for the floating panel.
 * @returns {string} Either 'visible' or 'hidden'.
 */
function getVisibilityState() {
  return localStorage.getItem('smtmPanelVisibility') || 'visible';
}

/**
 * Sets the visibility state for the floating panel.
 * @param {string} state - Desired state.
 * @returns {string} Persisted state value.
 */
function setVisibilityState(state) {
  const normalized = state === 'hidden' ? 'hidden' : 'visible';
  localStorage.setItem('smtmPanelVisibility', normalized);
  return normalized;
}

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
  // Local aliases for debug logging
  const log = window.SMTM?.debug?.log || function() {};
  const group = window.SMTM?.debug?.group || function() {};
  const groupEnd = window.SMTM?.debug?.groupEnd || function() {};
  
  group('mergeDailyData');
  
  const existingData = getDailyUsageData();
  const beforeCount = Object.keys(existingData).length;
  let updateCount = 0;
  let newDatesCount = 0;
  let updatedDatesCount = 0;
  let skippedDatesCount = 0;

  log('Merging new data into localStorage...');
  log('Existing dates before merge:', beforeCount);
  log('New dates to merge:', Object.keys(newData).length);

  for (const [date, cost] of Object.entries(newData)) {
    // Add new dates or update if the new cost is greater (accumulation over time)
    if (!existingData[date]) {
      existingData[date] = cost;
      updateCount++;
      newDatesCount++;
      log(`✨ NEW: ${date} = $${cost.toFixed(4)}`);
    } else if (cost > existingData[date]) {
      const oldCost = existingData[date];
      existingData[date] = cost;
      updateCount++;
      updatedDatesCount++;
      log(`📈 UPDATED: ${date} = $${cost.toFixed(4)} (was $${oldCost.toFixed(4)})`);
    } else {
      skippedDatesCount++;
      log(`⏭️ SKIPPED: ${date} = $${cost.toFixed(4)} (existing $${existingData[date].toFixed(4)} is >= new value)`);
    }
  }

  saveDailyUsageData(existingData);
  
  const afterCount = Object.keys(existingData).length;
  
  log('=== Merge Summary ===');
  log('📊 Dates before merge:', beforeCount);
  log('📊 Dates after merge:', afterCount);
  log('✨ New dates added:', newDatesCount);
  log('📈 Dates updated (higher cost):', updatedDatesCount);
  log('⏭️ Dates skipped (same or lower):', skippedDatesCount);
  log('Total changes:', updateCount);
  
  groupEnd();
  
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

/**
 * Retrieves the selected range from localStorage.
 * @returns {string|null} The saved range ('1d', '7d', '30d') or null.
 */
function getSelectedRange() {
  return localStorage.getItem('selectedRange');
}

/**
 * Saves the selected range to localStorage.
 * @param {string} range The range to save.
 */
function saveSelectedRange(range) {
  localStorage.setItem('selectedRange', range);
}
