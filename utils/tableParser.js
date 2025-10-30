// utils/tableParser.js
console.log('[SMTM] tableParser.js loaded');

// Ensure the global SMTM object exists
window.SMTM = window.SMTM || {};

/**
 * Extracts and cleans the text content of a cell, ignoring irrelevant sub-elements.
 * @param {HTMLElement} cell The cell element.
 * @returns {{raw: string, cleaned: string}}
 */
function cleanCellContent(cell) {
    if (!cell) return { raw: '', cleaned: '' };

    // Clone the cell to avoid modifying the live DOM
    const clone = cell.cloneNode(true);

    // Remove non-informative elements
    clone.querySelectorAll('svg, img, button, [role="progressbar"]').forEach(el => el.remove());

    const raw = clone.innerText.trim();

    // Clean the text for analysis
    let cleaned = raw
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/[\s,]/g, '') // Remove spaces and commas for number parsing
        .replace(/(\(.*\)|\[.*\])/g, '') // Remove content in brackets
        .replace(/[^\d.-]/g, ''); // Keep only digits, dots, and hyphens

    return { raw, cleaned };
}


/**
 * Identifies all potential table elements on the page.
 * @returns {HTMLElement[]} An array of found table elements.
 */
function findTables() {
    const selectors = ['table', '[role="table"]', '[role="grid"]', '.table', '[data-table]'];
    const tables = Array.from(document.querySelectorAll(selectors.join(',')));
    console.log(`[SMTM] Tables detected: ${tables.length}`);
    return tables;
}

/**
 * Builds a normalized matrix of a table, accounting for rowspan and colspan.
 * @param {HTMLElement} tableElement The table element to parse.
 * @returns {object | null}
 */
function normalizeTable(tableElement) {
    const matrix = [];
    const headers = [];
    let colCount = 0;

    const rows = Array.from(tableElement.querySelectorAll('tr, [role="row"]'));
    if (rows.length === 0) return null;

    rows.forEach((row, rowIndex) => {
        if (!matrix[rowIndex]) matrix[rowIndex] = [];
        const cells = Array.from(row.querySelectorAll('td, th, [role="cell"], [role="gridcell"]'));
        let matrixColIndex = 0;

        cells.forEach((cell) => {
            while (matrix[rowIndex][matrixColIndex]) {
                matrixColIndex++;
            }
            const colspan = parseInt(cell.getAttribute('colspan') || '1', 10);
            const rowspan = parseInt(cell.getAttribute('rowspan') || '1', 10);

            for (let r = 0; r < rowspan; r++) {
                for (let c = 0; c < colspan; c++) {
                    const targetRow = rowIndex + r;
                    if (!matrix[targetRow]) matrix[targetRow] = [];
                    matrix[targetRow][matrixColIndex + c] = { element: cell, isPlaceholder: r > 0 || c > 0 };
                }
            }
            matrixColIndex += colspan;
        });
        colCount = Math.max(colCount, matrix[rowIndex].length);
    });

    if (matrix.length > 0) {
        matrix[0].forEach((cell, index) => {
            if (cell && !cell.isPlaceholder) {
                headers.push({ text: cell.element.innerText.trim(), index: index, element: cell.element });
            }
        });
    }

    return { matrix, headers, colCount };
}

/**
 * Analyzes all columns in a table and classifies them based on content.
 * @param {object} normalizedTable The table object from normalizeTable.
 * @param {object} options Configuration for thresholds.
 * @returns {Array} An array of column analysis objects.
 */
function analyzeColumns(normalizedTable, options = {}) {
    const { matrix, colCount } = normalizedTable;
    const results = [];
    const sampleSize = Math.min(matrix.length, 100); // Sample up to 100 rows

    const thresholds = {
        numeric: options.numeric || 0.6,
        date: options.date || 0.5,
        unique: options.unique || 0.9
    };

    for (let colIndex = 0; colIndex < colCount; colIndex++) {
        let numericCount = 0;
        let dateCount = 0;
        const values = new Set();
        let cellCount = 0;

        for (let rowIndex = 1; rowIndex < sampleSize; rowIndex++) { // Skip header row
            const cellData = matrix[rowIndex]?.[colIndex];
            if (!cellData || cellData.isPlaceholder) continue;

            const { raw, cleaned } = cleanCellContent(cellData.element);
            if (raw === '') continue;

            cellCount++;
            values.add(cleaned);

            if (!isNaN(parseFloat(cleaned))) {
                numericCount++;
            }
            const dateRegex = /(\d{4}-\d{2}-\d{2})|(\d{1,2}\/\d{1,2}\/\d{2,4})|(\d+ (sec|min|hour|day)s? ago)/i;
            if (dateRegex.test(raw)) {
                dateCount++;
            }
        }

        if (cellCount === 0) continue;

        const numericRatio = numericCount / cellCount;
        const dateRatio = dateCount / cellCount;
        const uniqueRatio = values.size / cellCount;

        let type = 'text';
        if (numericRatio >= thresholds.numeric) type = 'number';
        else if (dateRatio >= thresholds.date) type = 'date';

        let classification = 'base';
        let reason = 'low-signal';

        const isValueCandidate = type === 'number';
        const isUniqueCandidate = uniqueRatio >= thresholds.unique || type === 'date';

        if (isValueCandidate && isUniqueCandidate) {
            classification = 'ambiguous';
            reason = 'value and unique';
        } else if (isValueCandidate) {
            classification = 'value';
            reason = 'value candidate';
        } else if (isUniqueCandidate) {
            classification = 'unique';
            reason = 'unique candidate';
        }

        const summary = {
            idx: colIndex,
            type,
            classification,
            numeric: numericRatio.toFixed(2),
            date: dateRatio.toFixed(2),
            unique: uniqueRatio.toFixed(2),
            reason
        };

        console.log(`[SMTM] Column summary: idx=${summary.idx}, type=${summary.type}, numeric=${summary.numeric}, date=${summary.date}, unique=${summary.unique}, reason=${summary.reason}`);
        results.push(summary);
    }

    return results;
}


window.SMTM.tableParser = {
    findTables,
    normalizeTable,
    analyzeColumns
};
