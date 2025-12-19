// utils/domParser.js

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
 * @returns {Object} An object mapping dates to daily costs { "YYYY-MM-DD": cost, ... }.
 */
function parseDivTable(table) {
    console.log('[parseDivTable] START');
    group('parseDivTable started');
    log('Table element:', table);
    log('Table classes:', table.className);
    console.log('[parseDivTable] Table classes:', table.className);
    
    const dailyCosts = {};
    // Find rows container to exclude header row
    const rowsContainer = table.querySelector('.dashboard-table-rows') || table;
    log('Rows container found:', !!rowsContainer);
    log('Rows container classes:', rowsContainer.className);
    console.log('[parseDivTable] Rows container classes:', rowsContainer.className);
    
    // Use dashboard-table-row class to find actual data rows (excludes header)
    let rows = rowsContainer.querySelectorAll('.dashboard-table-row');
    log(`Total .dashboard-table-row found: ${rows.length}`);
    console.log('[parseDivTable] Total .dashboard-table-row found:', rows.length);
    
    // Fallback: if no dashboard-table-row found, use div[role="row"]
    if (rows.length === 0) {
        const fallbackRows = rowsContainer.querySelectorAll('div[role="row"]');
        log(`Fallback: Total div[role="row"] found: ${fallbackRows.length}`);
        // Use fallback rows but filter out header
        rows = Array.from(fallbackRows).filter(row => 
            !row.classList.contains('dashboard-table-header-row') && 
            !row.querySelector('div[role="columnheader"]')
        );
        log(`After filtering header rows: ${rows.length}`);
    }

    rows.forEach((row, rowIndex) => {
        // Skip header row
        if (row.classList.contains('dashboard-table-header-row') || 
            row.querySelector('div[role="columnheader"]')) {
            log(`Row ${rowIndex}: Skipped (header row)`);
            return;
        }

        const cells = row.querySelectorAll('div[role="cell"]');
        // Need at least 5 cells (Date, Type, Model, Tokens, Cost)
        if (cells.length < 5) {
            log(`Row ${rowIndex}: Skipped (not enough cells: ${cells.length})`);
            return; // Skip invalid rows
        }

        // Get date from first cell - prefer span title attribute, fallback to innerText
        const firstCell = cells[0];
        const dateSpan = firstCell.querySelector('span[title]');
        const dateText = dateSpan ? dateSpan.getAttribute('title') : firstCell.innerText.trim();
        
        if (!dateText) {
            log(`Row ${rowIndex}: Skipped (no date found)`);
            return; // Skip if no date found
        }

        // Normalize date: "Dec 15, 2025, 09:12:55 PM" -> "2025-12-15"
            const date = new Date(dateText);
        if (isNaN(date.getTime())) {
            log(`Row ${rowIndex}: Skipped (invalid date: "${dateText}")`);
            return; // Skip if date is invalid
        }
        const normalizedDate = date.toISOString().split('T')[0];

        // Get amount from last cell (Cost column)
        const lastCell = cells[cells.length - 1];
        let amount = 0;
        let extractMethod = 'none';
        
        // Try to find div with title attribute containing "$"
        // Note: title might be HTML-encoded like "&lt;$0.01"
        const costDivs = lastCell.querySelectorAll('div[title]');
        for (const div of costDivs) {
            const costTitle = div.getAttribute('title');
            // Decode HTML entities and check if contains "$"
            const decodedTitle = costTitle.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
            if (decodedTitle.includes('$')) {
                // Extract numeric value from title like "$0.01" or "<$0.01"
                amount = parseFloat(decodedTitle.replace(/[^0-9.-]+/g, ''));
                extractMethod = 'div[title]';
                log(`Row ${rowIndex}: Found cost from div title: "${costTitle}" (decoded: "${decodedTitle}") -> ${amount}`);
                break;
            }
        }
        
        // Fallback: check if there's a span with "$" prefix
        if (amount === 0 || isNaN(amount)) {
            const costSpans = lastCell.querySelectorAll('span');
            for (const span of costSpans) {
                const costText = span.innerText.trim();
                if (costText.startsWith('$')) {
                    amount = parseFloat(costText.replace(/[^0-9.-]+/g, ''));
                    extractMethod = 'span';
                    log(`Row ${rowIndex}: Found cost from span text: "${costText}" -> ${amount}`);
                    break;
                }
            }
        }

        // Check if it's "Included" - only skip if amount is 0 or NaN
        const lastCellText = lastCell.innerText.trim();
        const isIncluded = lastCellText.includes('Included');
        
        if (isIncluded && (isNaN(amount) || amount === 0)) {
            log(`Row ${rowIndex}: Skipped (Included with no cost)`);
            return; // Skip included items with no cost
        }

        // Aggregate costs for the same day
        if (!isNaN(amount) && amount > 0) {
            const absAmount = Math.abs(amount);
            if (dailyCosts[normalizedDate]) {
                dailyCosts[normalizedDate] += absAmount;
                log(`Row ${rowIndex}: ✅ Added to existing date - Date: ${normalizedDate}, Amount: $${absAmount.toFixed(4)}, Total: $${dailyCosts[normalizedDate].toFixed(4)}, Method: ${extractMethod}`);
                console.log(`[parseDivTable] Row ${rowIndex}: Added to ${normalizedDate}, +$${absAmount.toFixed(4)}, Total: $${dailyCosts[normalizedDate].toFixed(4)}`);
            } else {
                dailyCosts[normalizedDate] = absAmount;
                log(`Row ${rowIndex}: ✅ New date entry - Date: ${normalizedDate}, Amount: $${absAmount.toFixed(4)}, Method: ${extractMethod}`);
                console.log(`[parseDivTable] Row ${rowIndex}: New date ${normalizedDate}, $${absAmount.toFixed(4)}`);
            }
        } else {
            log(`Row ${rowIndex}: Skipped (invalid amount: ${amount}, isNaN: ${isNaN(amount)})`);
        }
    });
    
    log(`Total unique dates found: ${Object.keys(dailyCosts).length}`);
    log(`Total rows processed: ${rows.length}`);
    console.log('[parseDivTable] Total unique dates:', Object.keys(dailyCosts).length);
    console.log('[parseDivTable] Total rows processed:', rows.length);
    
    // Detailed summary by date
    group('Daily costs summary');
    for (const [date, cost] of Object.entries(dailyCosts)) {
      log(`${date}: $${cost.toFixed(4)}`);
      console.log(`[parseDivTable] ${date}: $${cost.toFixed(4)}`);
    }
    groupEnd();
    
    log('Final daily costs object:', dailyCosts);
    console.log('[parseDivTable] Final daily costs:', dailyCosts);
    groupEnd();
    
    return dailyCosts;
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
 * @returns {Promise<Object>} An object mapping dates to daily costs { "YYYY-MM-DD": cost, ... }.
 */
async function parseTransactionTable() {
    group('parseTransactionTable - Table detection');
    log('Timestamp:', new Date().toISOString());
    log('document.readyState:', document.readyState);
    log('URL:', window.location.href);
    
    // Check for div table - try multiple selectors
    let divTable = document.querySelector('div[role="table"]');
    log('div[role="table"] found?', !!divTable);
    
    // Try alternative selectors if first one doesn't work
    if (!divTable) {
        log('Trying alternative selectors...');
        divTable = document.querySelector('.dashboard-table-scroll-container[role="table"]');
        log('.dashboard-table-scroll-container[role="table"] found?', !!divTable);
    }
    
    if (!divTable) {
        // Check all divs with role="table"
        const allDivTables = document.querySelectorAll('div[role="table"]');
        log('Total div[role="table"] elements:', allDivTables.length);
        if (allDivTables.length > 0) {
            group('All div tables found');
            allDivTables.forEach((tbl, idx) => {
                log(`Div table ${idx} classes:`, tbl.className);
                log(`Div table ${idx} aria-label:`, tbl.getAttribute('aria-label'));
                log(`Div table ${idx} HTML preview:`, tbl.outerHTML.substring(0, 300));
            });
            groupEnd();
            // Use first one if found
            if (allDivTables.length > 0) {
                divTable = allDivTables[0];
                log('Using first div table found');
            }
        }
    }
    
    if (divTable) {
        log('✅ Found div-based table:', divTable);
        log('Table classes:', divTable.className);
        log('Table aria-label:', divTable.getAttribute('aria-label'));
        const rows = divTable.querySelectorAll('div[role="row"]');
        log('Rows found in div table:', rows.length);
        groupEnd();
        log('[SMTM Core] Found div-based table.');
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
        
        // Check for dashboard table rows
        const dashboardRows = document.querySelectorAll('.dashboard-table-row');
        log('Total .dashboard-table-row elements:', dashboardRows.length);
        
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
        log('[SMTM Core] No recognizable transaction table found.');
        return {};
    }

    log('✅ Found HTML table:', htmlTable);
    groupEnd();
    log('[SMTM Core] Found HTML table.');
    return await parseHtmlTable(htmlTable);
}
