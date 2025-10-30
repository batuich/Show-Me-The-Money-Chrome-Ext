// teachMode.js
(function() {
    console.log(`[SMTM] Teach Mode activated on ${window.location.hostname}`);

    const SMTM_LOCAL_CONFIG_KEY = 'smtmLocalConfig';
    const CURRENT_VERSION = '1.2'; // Updated version

    // --- Initialize Local Config ---
    try {
        let localConfig = JSON.parse(window.localStorage.getItem(SMTM_LOCAL_CONFIG_KEY));
        if (!localConfig) {
            localConfig = {
                ui: {}, data: {}, mapping: {},
                createdAt: new Date().toISOString(), version: CURRENT_VERSION,
            };
            window.localStorage.setItem(SMTM_LOCAL_CONFIG_KEY, JSON.stringify(localConfig));
        }
    } catch (error) {
        console.error('[SMTM] Error accessing localStorage:', error);
    }

    // --- Theming and Styles ---
    const theme = window.SMTM?.themes?.teachMode || {};
    const styleElement = document.createElement('style');
    document.head.appendChild(styleElement);

    const styles = {
        tableOutline: theme.tableOutline || { border: '2px dashed #007bff' },
        preColumnBase: theme.preColumnBase || { background: 'rgba(128,128,128,0.1)', border: '1px dotted #ccc' },
        preColumnAmbiguous: theme.preColumnAmbiguous || { background: 'rgba(255,193,7,0.2)', border: '1px dotted #FFC107' },
        preColumnValueCandidate: theme.preColumnValueCandidate || { background: 'rgba(245,166,35,0.3)', border: '1px solid #F5A623' },
        preColumnUniqueCandidate: theme.preColumnUniqueCandidate || { background: 'rgba(74,144,226,0.3)', border: '1px solid #4A90E2' },
        colSelectedUniqueBg: theme.colSelectedUniqueBg || 'rgba(74, 144, 226, 0.25)',
        colSelectedValueBg: theme.colSelectedValueBg || 'rgba(245, 166, 35, 0.25)',
        transition: theme.transition || 'all 0.2s ease-in-out'
    };

    styleElement.sheet.insertRule(`.smtm-table-outline { position: absolute; z-index: 9998; border: ${styles.tableOutline.border}; border-radius: ${styles.tableOutline.borderRadius || '8px'}; box-shadow: ${styles.tableOutline.boxShadow || 'none'}; pointer-events: none; transition: ${styles.transition}; }`);
    styleElement.sheet.insertRule(`.smtm-col-highlight { position: absolute; z-index: 9999; pointer-events: auto; cursor: pointer; transition: ${styles.transition}; }`);
    styleElement.sheet.insertRule(`.smtm-col-base { background: ${styles.preColumnBase.background}; border: ${styles.preColumnBase.border}; }`);
    styleElement.sheet.insertRule(`.smtm-col-ambiguous { background: ${styles.preColumnAmbiguous.background}; border: ${styles.preColumnAmbiguous.border}; }`);
    styleElement.sheet.insertRule(`.smtm-col-value { background: ${styles.preColumnValueCandidate.background}; border: ${styles.preColumnValueCandidate.border}; }`);
    styleElement.sheet.insertRule(`.smtm-col-unique { background: ${styles.preColumnUniqueCandidate.background}; border: ${styles.preColumnUniqueCandidate.border}; }`);
    styleElement.sheet.insertRule(`.smtm-col-selected-unique { background-color: ${styles.colSelectedUniqueBg} !important; }`);
    styleElement.sheet.insertRule(`.smtm-col-selected-value { background-color: ${styles.colSelectedValueBg} !important; }`);

    // --- State Management ---
    let detectedTables = [];
    let selectionState = { currentRole: 'unique', unique: null, value: null };

    // --- DOM Overlay and Legend ---
    const overlayContainer = document.createElement('div');
    overlayContainer.id = 'smtm-overlay-container';
    document.body.appendChild(overlayContainer);

    function createLegend() {
        const legend = document.createElement('div');
        legend.id = 'smtm-legend';
        legend.style.cssText = `position: fixed; top: 20px; right: 20px; z-index: 10001; background: #fff; border: 1px solid #ccc; border-radius: 8px; padding: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); font-family: sans-serif; font-size: 14px;`;
        legend.innerHTML = `
            <h4 style="margin: 0 0 10px; padding-bottom: 5px; border-bottom: 1px solid #eee;">SMTM Teach Mode</h4>
            <div style="display: flex; align-items: center; margin-bottom: 5px;"><span style="width: 20px; height: 20px; background: ${styles.colSelectedUniqueBg}; border-radius: 4px; margin-right: 8px;"></span>Unique Column (ID, Date)</div>
            <div style="display: flex; align-items: center;"><span style="width: 20px; height: 20px; background: ${styles.colSelectedValueBg}; border-radius: 4px; margin-right: 8px;"></span>Value Column (Amount)</div>
            <p style="margin: 10px 0 0; font-size: 12px; color: #666;">Click a column to select it as <b>${selectionState.currentRole}</b>.</p>`;
        document.body.appendChild(legend);
    }

    function updateLegend() {
        const p = document.querySelector('#smtm-legend p');
        if (p) p.innerHTML = selectionState.currentRole ? `Click a column to select it as <b>${selectionState.currentRole}</b>.` : 'Both columns selected. Deactivate to save.';
    }

    // --- Core Logic ---
    function getCssSelector(el) {
        if (!(el instanceof Element)) return;
        const path = [];
        while (el.nodeType === Node.ELEMENT_NODE) {
            let selector = el.nodeName.toLowerCase();
            if (el.id) {
                selector += '#' + el.id;
                path.unshift(selector);
                break;
            } else {
                let sib = el, nth = 1;
                while (sib = sib.previousElementSibling) {
                    if (sib.nodeName.toLowerCase() === selector) nth++;
                }
                if (nth !== 1) selector += `:nth-of-type(${nth})`;
            }
            path.unshift(selector);
            el = el.parentNode;
        }
        return path.join(' > ');
    }

    function highlightColumn(tableInfo, colAnalysis) {
        const { matrix } = tableInfo.normalized;
        const firstCell = matrix[0]?.[colAnalysis.idx]?.element;
        if (!firstCell) return;

        const rect = firstCell.getBoundingClientRect();
        const tableRect = tableInfo.element.getBoundingClientRect();

        const highlight = document.createElement('div');
        highlight.className = `smtm-col-highlight smtm-col-${colAnalysis.classification}`;
        highlight.style.left = `${rect.left + window.scrollX}px`;
        highlight.style.top = `${tableRect.top + window.scrollY}px`;
        highlight.style.width = `${rect.width}px`;
        highlight.style.height = `${tableRect.height}px`;
        highlight.dataset.tableId = tableInfo.id;
        highlight.dataset.colIndex = colAnalysis.idx;

        overlayContainer.appendChild(highlight);
    }

    function handleColumnClick(e) {
        const target = e.target;
        if (!target.classList.contains('smtm-col-highlight')) return;

        const { tableId, colIndex } = target.dataset;
        const role = selectionState.currentRole;
        if (!role) return;

        selectionState[role] = { tableId, colIndex };
        
        // Clear previous selections of this role and apply new class
        document.querySelectorAll(`.smtm-col-selected-${role}`).forEach(el => el.classList.remove(`smtm-col-selected-${role}`));
        target.classList.add(`smtm-col-selected-${role}`);
        
        const tableInfo = detectedTables.find(t => t.id === tableId);
        console.log(`[SMTM] Column fixed: role=${role}, header="${tableInfo.normalized.headers[colIndex]?.text}"`);
        
        selectionState.currentRole = (role === 'unique') ? 'value' : null;
        updateLegend();
    }

    function analyzeAndHighlight() {
        const tables = window.SMTM.tableParser.findTables();
        let tableCounter = 0;

        tables.forEach(tableEl => {
            const normalized = window.SMTM.tableParser.normalizeTable(tableEl);
            if (!normalized || normalized.colCount < 1) return;

            const tableId = `table-${tableCounter++}`;
            const tableInfo = { id: tableId, element: tableEl, normalized };
            detectedTables.push(tableInfo);

            const rect = tableEl.getBoundingClientRect();
            const outline = document.createElement('div');
            outline.className = 'smtm-table-outline';
            outline.style.left = `${rect.left + window.scrollX}px`;
            outline.style.top = `${rect.top + window.scrollY}px`;
            outline.style.width = `${rect.width}px`;
            outline.style.height = `${rect.height}px`;
            overlayContainer.appendChild(outline);

            const columnAnalyses = window.SMTM.tableParser.analyzeColumns(normalized);
            columnAnalyses.forEach(analysis => highlightColumn(tableInfo, analysis));
        });
    }

    function saveMapping() {
        if (!selectionState.unique || !selectionState.value) return;

        const getMappingData = (role) => {
            const selection = selectionState[role];
            const info = detectedTables.find(t => t.id === selection.tableId);
            const colIdx = selection.colIndex;
            const header = info.normalized.headers.find(h => h.index == colIdx);
            const cell = info.normalized.matrix[1]?.[colIdx]?.element;
            const { raw } = window.SMTM.tableParser.cleanCellContent(cell);

            return {
                selector: getCssSelector(cell),
                headerSelector: getCssSelector(header?.element),
                role: role,
                type: window.SMTM.tableParser.analyzeColumns(info.normalized).find(c => c.idx == colIdx).type,
                sample: [raw],
                createdAt: new Date().toISOString(),
                version: CURRENT_VERSION
            };
        };

        try {
            const localConfig = JSON.parse(window.localStorage.getItem(SMTM_LOCAL_CONFIG_KEY));
            localConfig.mapping = {
                unique: getMappingData('unique'),
                value: getMappingData('value')
            };
            window.localStorage.setItem(SMTM_LOCAL_CONFIG_KEY, JSON.stringify(localConfig));
            console.log('[SMTM] New mapping saved:', localConfig.mapping);
        } catch (error) {
            console.error('[SMTM] Error saving mapping:', error);
        }
    }

    function cleanup() {
        saveMapping();
        document.removeEventListener('click', handleColumnClick, true);
        if (overlayContainer) overlayContainer.remove();
        if (styleElement) styleElement.remove();
        const legend = document.getElementById('smtm-legend');
        if (legend) legend.remove();
        console.log('[SMTM] Teach Mode deactivated and cleaned up.');
    }

    // --- Activation ---
    createLegend();
    analyzeAndHighlight();
    document.addEventListener('click', handleColumnClick, true);

    window.SMTM_cleanupTeachMode = cleanup;
})();
