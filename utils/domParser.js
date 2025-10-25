// utils/domParser.js

// Debug mode - set to false to disable detailed logging
const SMTM_DEBUG = true;

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
 * Debug logging helper
 */
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

function debugTable(data) {
  if (!SMTM_DEBUG) return;
  console.table(data);
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
    debugGroup('parseHtmlTable started');
    debugLog('Table element:', table);
    debugLog('Table classes:', table.className);
    
    const dailyCosts = {};
    const rows = table.querySelectorAll('tbody tr');
    
    debugLog(`Found ${rows.length} rows in tbody`);
    
    if (rows.length === 0) {
        debugLog('⚠️ WARNING: No rows found! Checking table structure...');
        debugLog('Table HTML (first 500 chars):', table.outerHTML.substring(0, 500));
        debugLog('tbody exists?', !!table.querySelector('tbody'));
        debugLog('All tr elements:', table.querySelectorAll('tr').length);
        debugGroupEnd();
        return dailyCosts;
    }

    // Preview first 3 rows
    if (rows.length > 0) {
        debugGroup('First 3 rows preview');
        for (let i = 0; i < Math.min(3, rows.length); i++) {
            debugLog(`Row ${i} innerText:`, rows[i].innerText);
            debugLog(`Row ${i} HTML:`, rows[i].outerHTML.substring(0, 300));
        }
        debugGroupEnd();
    }

    const rowDetails = [];
    let rowIndex = 0;

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const rowInfo = {
            index: rowIndex++,
            cellCount: cells.length,
            status: 'processing'
        };

        if (cells.length < 2) {
            rowInfo.status = '❌ skipped (not enough cells)';
            rowDetails.push(rowInfo);
            return;
        }

        // Get date from the first td, prefer title attribute
        const firstCell = cells[0];
        const dateTitle = firstCell.getAttribute('title');
        const dateInnerText = firstCell.innerText.trim();
        const dateText = dateTitle || dateInnerText;

        rowInfo.dateTitle = dateTitle;
        rowInfo.dateInnerText = dateInnerText;
        rowInfo.dateUsed = dateText;

        // Normalize date: "Oct 25, 2025, 10:14:00 AM" -> "2025-10-25"
        const date = new Date(dateText);
        if (isNaN(date.getTime())) {
            rowInfo.status = '❌ invalid date';
            rowInfo.dateParseResult = 'NaN';
            rowDetails.push(rowInfo);
            debugLog(`⚠️ Row ${rowInfo.index}: Invalid date "${dateText}"`);
            return; // Skip if date is invalid
        }
        const normalizedDate = date.toISOString().split('T')[0];
        rowInfo.normalizedDate = normalizedDate;

        // Extract cost from the last td
        const lastCell = cells[cells.length - 1];
        let amount = 0;
        rowInfo.lastCellHTML = lastCell.outerHTML.substring(0, 200);
        rowInfo.lastCellText = lastCell.innerText.trim();

        // Try to find div with title attribute starting with "$"
        const costDiv = lastCell.querySelector('div[title^="$"]');
        if (costDiv) {
            const costTitle = costDiv.getAttribute('title');
            rowInfo.costDivTitle = costTitle;
            amount = parseFloat(costTitle.replace(/[^0-9.-]+/g, ''));
            rowInfo.extractMethod = 'div[title]';
        } else {
            rowInfo.costDivTitle = 'not found';
            // Fallback: look for span with "$" prefix
            const costSpan = lastCell.querySelector('span');
            if (costSpan) {
                const costText = costSpan.innerText.trim();
                rowInfo.costSpanText = costText;
                if (costText.startsWith('$')) {
                    amount = parseFloat(costText.replace(/[^0-9.-]+/g, ''));
                    rowInfo.extractMethod = 'span';
                } else {
                    rowInfo.extractMethod = 'span (no $)';
                }
            } else {
                rowInfo.costSpanText = 'not found';
                rowInfo.extractMethod = 'none';
            }
        }

        // If amount is still 0 or NaN, check if it's "Included"
        if (isNaN(amount) || amount === 0) {
            const lastCellText = lastCell.innerText.trim();
            if (lastCellText.includes('Included')) {
                amount = 0;
                rowInfo.extractMethod += ' (Included)';
            }
        }

        rowInfo.parsedAmount = amount;
        rowInfo.amountValid = !isNaN(amount);

        // Aggregate costs for the same day
        if (!isNaN(amount)) {
            if (dailyCosts[normalizedDate]) {
                rowInfo.status = '✅ added to existing date';
                dailyCosts[normalizedDate] += Math.abs(amount);
            } else {
                rowInfo.status = '✅ new date entry';
                dailyCosts[normalizedDate] = Math.abs(amount);
            }
        } else {
            rowInfo.status = '❌ invalid amount (NaN)';
        }

        rowDetails.push(rowInfo);
    });

    debugGroup('Row parsing details');
    debugTable(rowDetails);
    debugGroupEnd();

    debugGroup('Final daily costs');
    debugLog('Total unique dates found:', Object.keys(dailyCosts).length);
    debugTable(dailyCosts);
    debugGroupEnd();

    debugGroupEnd(); // End parseHtmlTable
    return dailyCosts;
}

/**
 * Parses the transaction table on the page, supporting multiple structures.
 * @returns {Object|Array} An object mapping dates to costs for HTML tables, or an array of transaction objects for div tables.
 */
function parseTransactionTable() {
    debugGroup('parseTransactionTable - Table detection');
    debugLog('Timestamp:', new Date().toISOString());
    debugLog('document.readyState:', document.readyState);
    
    // Check for div table
    const divTable = document.querySelector('div[role="table"]');
    debugLog('div[role="table"] found?', !!divTable);
    if (divTable) {
        debugLog('✅ Found div-based table:', divTable);
        debugGroupEnd();
        console.log("Show Me The Money: Found div-based table.");
        return parseDivTable(divTable);
    }

    // Check for HTML table
    const htmlTable = document.querySelector('table.w-full');
    debugLog('table.w-full found?', !!htmlTable);
    
    if (!htmlTable) {
        // Deep diagnostic if table not found
        debugLog('❌ table.w-full NOT FOUND. Running diagnostics...');
        
        const allTables = document.querySelectorAll('table');
        debugLog('Total <table> elements on page:', allTables.length);
        
        if (allTables.length > 0) {
            debugGroup('All table elements found');
            allTables.forEach((tbl, idx) => {
                debugLog(`Table ${idx} classes:`, tbl.className);
                debugLog(`Table ${idx} HTML preview:`, tbl.outerHTML.substring(0, 200));
            });
            debugGroupEnd();
        }
        
        // Check if it might be in a shadow root
        debugLog('Checking for shadow roots...');
        const elementsWithShadow = document.querySelectorAll('*');
        let shadowRootCount = 0;
        elementsWithShadow.forEach(el => {
            if (el.shadowRoot) {
                shadowRootCount++;
                debugLog('Shadow root found on:', el.tagName, el.className);
            }
        });
        debugLog('Total shadow roots found:', shadowRootCount);
        
        debugGroupEnd();
        console.log("Show Me The Money: No recognizable transaction table found.");
        return {};
    }

    debugLog('✅ Found HTML table:', htmlTable);
    debugGroupEnd();
    console.log("Show Me The Money: Found HTML table.");
    return parseHtmlTable(htmlTable);
}
