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
 * @returns {Object} An object mapping dates to daily costs { "YYYY-MM-DD": cost, ... }.
 */
function parseHtmlTable(table) {
    const dailyCosts = {};
    const rows = table.querySelectorAll('tbody tr');

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 2) { // We need at least date and cost
            // Get date from the first td, prefer title attribute
            const firstCell = cells[0];
            const dateText = firstCell.getAttribute('title') || firstCell.innerText.trim();

            // Normalize date: "Oct 25, 2025, 10:14:00 AM" -> "2025-10-25"
            const date = new Date(dateText);
            if (isNaN(date.getTime())) {
                return; // Skip if date is invalid
            }
            const normalizedDate = date.toISOString().split('T')[0];

            // Extract cost from the last td
            const lastCell = cells[cells.length - 1];
            let amount = 0;

            // Try to find div with title attribute starting with "$"
            const costDiv = lastCell.querySelector('div[title^="$"]');
            if (costDiv) {
                const costTitle = costDiv.getAttribute('title');
                amount = parseFloat(costTitle.replace(/[^0-9.-]+/g, ''));
            } else {
                // Fallback: look for span with "$" prefix
                const costSpan = lastCell.querySelector('span');
                if (costSpan) {
                    const costText = costSpan.innerText.trim();
                    if (costText.startsWith('$')) {
                        amount = parseFloat(costText.replace(/[^0-9.-]+/g, ''));
                    }
                }
            }

            // If amount is still 0 or NaN, check if it's "Included"
            if (isNaN(amount) || amount === 0) {
                const lastCellText = lastCell.innerText.trim();
                if (lastCellText.includes('Included')) {
                    amount = 0;
                }
            }

            // Aggregate costs for the same day
            if (!isNaN(amount)) {
                if (dailyCosts[normalizedDate]) {
                    dailyCosts[normalizedDate] += Math.abs(amount);
                } else {
                    dailyCosts[normalizedDate] = Math.abs(amount);
                }
            }
        }
    });
    return dailyCosts;
}

/**
 * Parses the transaction table on the page, supporting multiple structures.
 * @returns {Object|Array} An object mapping dates to costs for HTML tables, or an array of transaction objects for div tables.
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
    return {};
}
