/**
 * @fileoverview This file contains helper functions for parsing the DOM to extract transaction data.
 */

// Local aliases for convenience (optional - direct window.SMTM.debug calls work too)
var log = window.SMTM?.debug?.log || function() {};
var group = window.SMTM?.debug?.group || function() {};
var groupEnd = window.SMTM?.debug?.groupEnd || function() {};
var table = window.SMTM?.debug?.table || function() {};

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
 * Waits for the table rows to stabilize (React dynamic loading).
 * @param {HTMLElement} tableElement The table element.
 * @returns {Promise<NodeList>} The final list of rows.
 */
async function waitForTableRows(tableElement) {
    const maxWaitTime = 10000; // 10 seconds
    const checkInterval = 500; // 500 ms
    const maxRetries = maxWaitTime / checkInterval;
    
    let retryCount = 0;
    let previousCount = 0;
    let stableCount = 0;
    const stabilityThreshold = 2; // Need 2 consecutive checks with same count
    
    log('⏳ Waiting for table rows to load...');
    
    while (retryCount < maxRetries) {
        const rows = tableElement.querySelectorAll('tbody tr');
        const currentCount = rows.length;
        
        log(`Total rows found: ${currentCount} (retry ${retryCount + 1}/${maxRetries})`);
        
        if (currentCount === previousCount && currentCount > 0) {
            stableCount++;
            log(`Row count stable (${stableCount}/${stabilityThreshold})`);
            
            if (stableCount >= stabilityThreshold) {
                log(`✅ Row count stabilized at ${currentCount} rows`);
                return rows;
            }
        } else {
            stableCount = 0; // Reset stability counter if count changed
        }
        
        previousCount = currentCount;
        retryCount++;
        
        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    // Return whatever we have after timeout
    const finalRows = tableElement.querySelectorAll('tbody tr');
    log(`⚠️ Timeout reached. Proceeding with ${finalRows.length} rows`);
    return finalRows;
}

/**
 * Parses a standard `<table>` element (found on `cursor.com/spending`).
 * @param {HTMLElement} tableElement The table element.
 * @returns {Promise<Object>} An object mapping dates to daily costs { "YYYY-MM-DD": cost, ... }.
 */
async function parseHtmlTable(tableElement) {
    group('parseHtmlTable started');
    log('Table element:', tableElement);
    log('Table classes:', tableElement.className);
    
    const dailyCosts = {};
    
    // Wait for rows to stabilize before parsing
    const rows = await waitForTableRows(tableElement);
    
    log(`Total rows found: ${rows.length} (before parsing)`);
    
    if (rows.length === 0) {
        log('⚠️ WARNING: No rows found! Checking table structure...');
        log('Table HTML (first 500 chars):', tableElement.outerHTML.substring(0, 500));
        log('tbody exists?', !!tableElement.querySelector('tbody'));
        log('All tr elements:', tableElement.querySelectorAll('tr').length);
        groupEnd();
        return dailyCosts;
    }

    // Preview first 3 rows
    if (rows.length > 0) {
        group('First 3 rows preview');
        for (let i = 0; i < Math.min(3, rows.length); i++) {
            log(`Row ${i} innerText:`, rows[i].innerText);
            log(`Row ${i} HTML:`, rows[i].outerHTML.substring(0, 300));
        }
        groupEnd();
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
            log(`⚠️ Row ${rowInfo.index}: Invalid date "${dateText}"`);
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

    group('Row parsing details');
    table(rowDetails);
    groupEnd();

    group('Final daily costs');
    log('Total unique dates found:', Object.keys(dailyCosts).length);
    log('Total rows parsed:', rows.length);
    table(dailyCosts);
    groupEnd();

    groupEnd(); // End parseHtmlTable
    return dailyCosts;
}

/**
 * Parses the transaction table on the page, supporting multiple structures.
 * @returns {Promise<Object|Array>} An object mapping dates to costs for HTML tables, or an array of transaction objects for div tables.
 */
window.SMTM.parseTransactionTable = async function() {
    group('parseTransactionTable - Table detection');
    log('Timestamp:', new Date().toISOString());
    log('document.readyState:', document.readyState);
    
    // Check for div table
    const divTable = document.querySelector('div[role="table"]');
    log('div[role="table"] found?', !!divTable);
    if (divTable) {
        log('✅ Found div-based table:', divTable);
        groupEnd();
        console.log("Show Me The Money: Found div-based table.");
        return parseDivTable(divTable);
    }

    // Check for HTML table
    const htmlTable = document.querySelector('table.w-full');
    log('table.w-full found?', !!htmlTable);
    
    if (!htmlTable) {
        // Deep diagnostic if table not found
        log('❌ table.w-full NOT FOUND. Running diagnostics...');
        
        const allTables = document.querySelectorAll('table');
        log('Total <table> elements on page:', allTables.length);
        
        if (allTables.length > 0) {
            group('All table elements found');
            allTables.forEach((tbl, idx) => {
                log(`Table ${idx} classes:`, tbl.className);
                log(`Table ${idx} HTML preview:`, tbl.outerHTML.substring(0, 200));
            });
            groupEnd();
        }
        
        // Check if it might be in a shadow root
        log('Checking for shadow roots...');
        const elementsWithShadow = document.querySelectorAll('*');
        let shadowRootCount = 0;
        elementsWithShadow.forEach(el => {
            if (el.shadowRoot) {
                shadowRootCount++;
                log('Shadow root found on:', el.tagName, el.className);
            }
        });
        log('Total shadow roots found:', shadowRootCount);
        
        groupEnd();
        console.log("Show Me The Money: No recognizable transaction table found.");
        return {};
    }

    log('✅ Found HTML table:', htmlTable);
    groupEnd();
    console.log("Show Me The Money: Found HTML table.");
    return await parseHtmlTable(htmlTable);
}
