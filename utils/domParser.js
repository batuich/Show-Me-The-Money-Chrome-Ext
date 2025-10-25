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
 * Parses a `div`-based table (found on `cursor.com/dashboard`).
 * @param {HTMLElement} table The table element.
 * @returns {Array} An array of transaction objects.
 */
function parseDivTable(table) {
    const transactions = [];
    const rows = table.querySelectorAll('div[role="row"]');

    rows.forEach(row => {
        const cells = row.querySelectorAll('div[role="cell"]');
        if (cells.length >= 2) {
            const dateText = cells[0].innerText.trim();
            const amountText = cells[1].innerText.trim();
            const date = new Date(dateText);

            if (!isNaN(date.getTime())) {
                const amount = parseFloat(amountText);
                if (!isNaN(amount)) {
                    const rowContent = `${dateText}-${amountText}`;
                    const id = simpleHash(rowContent);
                    transactions.push({ id, date: date.toISOString().split('T')[0], amount: Math.abs(amount) });
                }
            }
        }
    });
    return transactions;
}

/**
 * Parses a standard `<table>` element (found on `cursor.com/spending`).
 * @param {HTMLElement} table The table element.
 * @returns {Array} An array of transaction objects.
 */
function parseHtmlTable(table) {
    const transactions = [];
    const rows = table.querySelectorAll('tbody tr');

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 2) { // We need at least date and cost
            const dateText = cells[0].innerText.trim();
            const amountText = cells[cells.length - 1].innerText.trim(); // Last cell is the cost

            // Normalize date: "Oct 25, 2025" -> "2025-10-25"
            const date = new Date(dateText);
            if (isNaN(date.getTime())) {
                return; // Skip if date is invalid
            }
            const normalizedDate = date.toISOString().split('T')[0];

            // Normalize amount: "$0.03" -> 0.03
            const amount = parseFloat(amountText.replace(/[^0-9.-]+/g, ''));

            if (!isNaN(amount)) {
                const rowContent = `${normalizedDate}-${amount}`;
                const id = simpleHash(rowContent);
                transactions.push({ id, date: normalizedDate, amount: Math.abs(amount) });
            }
        }
    });
    return transactions;
}

/**
 * Parses the transaction table on the page, supporting multiple structures.
 * @returns {Array} An array of transaction objects.
 */
function parseTransactionTable() {
    const divTable = document.querySelector('div[role="table"]');
    if (divTable) {
        console.log("Show Me The Money: Found div-based table.");
        return parseDivTable(divTable);
    }

    const htmlTable = document.querySelector('table.w-full');
    if (htmlTable) {
        console.log("Show Me The Money: Found HTML table.");
        return parseHtmlTable(htmlTable);
    }

    console.log("Show Me The Money: No recognizable transaction table found.");
    return [];
}
