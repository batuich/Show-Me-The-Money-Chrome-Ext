// utils/domParser.js

/**
 * A simple hash function to generate a unique ID from a string.
 * @param {string} str The string to hash.
 * @returns {string} A 32-bit hash string.
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash; // Convert to 32bit integer
  }
  return new Uint32Array([hash])[0].toString(36);
}

/**
 * Parses the transaction table on the page to extract spending data.
 * @returns {Array} An array of transaction objects.
 */
function parseTransactionTable() {
  const transactions = [];
  // Assuming the main data is within the first table found.
  // This selector may need to be more specific for other sites.
  const table = document.querySelector('table');

  if (!table) {
    console.log("Show Me The Money: No table found on the page.");
    return transactions;
  }

  const rows = table.querySelectorAll('tbody tr');

  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    // Assuming at least 3 columns: Date, Description, Amount
    if (cells.length >= 3) {
      const date = cells[0].innerText.trim();
      const description = cells[1].innerText.trim();
      const amountText = cells[2].innerText.trim();

      // Extract numeric value from amount string (e.g., "-$1.50" -> 1.50)
      const amount = parseFloat(amountText.replace(/[^0-9.]/g, ''));

      if (date && !isNaN(amount)) {
        // Create a unique ID from the row's content to prevent duplicates
        const rowContent = `${date}-${description}-${amountText}`;
        const id = simpleHash(rowContent);

        transactions.push({ id, date, amount });
      }
    }
  });

  return transactions;
}
