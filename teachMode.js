// teachMode.js
(function() {
    console.log(`[SMTM TeachMode] Started`);

    const SMTM_LOCAL_CONFIG_KEY = 'smtmLocalConfig';
    const CURRENT_VERSION = '1.3'; // Updated version for new logic

    // --- Initialize Local Config ---
    try {
        let localConfig = JSON.parse(window.localStorage.getItem(SMTM_LOCAL_CONFIG_KEY));
        if (!localConfig) {
            localConfig = {
                ui: {}, data: {}, mapping: {},
                createdAt: new Date().toISOString(), version: CURRENT_VERSION,
                teachModeActive: true
            };
            window.localStorage.setItem(SMTM_LOCAL_CONFIG_KEY, JSON.stringify(localConfig));
        } else {
            // Clear old highlight classes if any exist from a previous session
            document.querySelectorAll('.smtm-col-highlight, .smtm-table-outline').forEach(el => el.remove());
            // Set teachModeActive flag
            localConfig.teachModeActive = true;
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
        colBaseHighlight: theme.colBaseHighlight || 'rgba(255, 230, 150, 0.30)',
        colUniqueHighlight: theme.colUniqueHighlight || 'rgba(100, 200, 255, 0.40)',
        colValueHighlight: theme.colValueHighlight || 'rgba(255, 180, 120, 0.40)',
        highlightBorder: theme.highlightBorder || '2px solid rgba(0, 0, 0, 0.20)',
        transition: theme.transition || 'all 0.2s ease-in-out'
    };

    styleElement.sheet.insertRule(`.smtm-table-outline { position: absolute; z-index: 9998; border: ${styles.tableOutline.border}; border-radius: ${styles.tableOutline.borderRadius || '8px'}; box-shadow: ${styles.tableOutline.boxShadow || 'none'}; pointer-events: none; transition: ${styles.transition}; }`);
    styleElement.sheet.insertRule(`.smtm-col-highlight { position: absolute; z-index: 9999; pointer-events: auto; cursor: pointer; transition: ${styles.transition}; box-sizing: border-box; }`);
    styleElement.sheet.insertRule(`.smtm-col-base { background-color: ${styles.colBaseHighlight}; }`);
    styleElement.sheet.insertRule(`.smtm-col-unique { background-color: ${styles.colUniqueHighlight}; }`);
    styleElement.sheet.insertRule(`.smtm-col-value { background-color: ${styles.colValueHighlight}; }`);
    styleElement.sheet.insertRule(`.smtm-col-highlight:hover { border: ${styles.highlightBorder}; }`);

    // --- State Management ---
    let detectedTables = [];
    let selectionState = { currentRole: 'unique', unique: null, value: null };
    let teachTooltip = null;

    // --- DOM Overlay ---
    const overlayContainer = document.createElement('div');
    overlayContainer.id = 'smtm-overlay-container';
    document.body.appendChild(overlayContainer);

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
                while ((sib = sib.previousElementSibling)) {
                    if (sib.nodeName.toLowerCase() === selector) nth++;
                }
                if (nth !== 1) selector += `:nth-of-type(${nth})`;
            }
            path.unshift(selector);
            el = el.parentNode;
        }
        return path.join(' > ');
    }

    function highlightColumn(tableInfo, colIndex) {
        const firstCell = tableInfo.normalized.matrix[0]?.[colIndex]?.element;
        if (!firstCell) return;

        const rect = firstCell.getBoundingClientRect();
        const tableRect = tableInfo.element.getBoundingClientRect();

        const highlight = document.createElement('div');
        highlight.className = 'smtm-col-highlight smtm-col-base';
        highlight.style.left = `${rect.left + window.scrollX}px`;
        highlight.style.top = `${tableRect.top + window.scrollY}px`;
        highlight.style.width = `${rect.width}px`;
        highlight.style.height = `${tableRect.height}px`;
        highlight.dataset.tableId = tableInfo.id;
        highlight.dataset.colIndex = colIndex;
        highlight.dataset.colSelector = getCssSelector(firstCell); // For re-applying mapping

        overlayContainer.appendChild(highlight);
    }

    function handleColumnClick(e) {
        const target = e.target;
        if (!target.classList.contains('smtm-col-highlight')) return;

        const { tableId, colIndex } = target.dataset;
        const role = selectionState.currentRole;
        if (!role) return;

        // Clear previous selection for this role
        if (selectionState[role]) {
            const prevSelection = selectionState[role];
            const prevEl = document.querySelector(`.smtm-col-highlight[data-table-id="${prevSelection.tableId}"][data-col-index="${prevSelection.colIndex}"]`);
            if (prevEl) {
                prevEl.classList.remove(`smtm-col-${role}`);
                prevEl.classList.add('smtm-col-base');
            }
        }
        
        // Update state and apply new class
        selectionState[role] = { tableId, colIndex };
        target.classList.remove('smtm-col-base');
        target.classList.add(`smtm-col-${role}`);
        
        const tableInfo = detectedTables.find(t => t.id === tableId);
        console.log(`[SMTM TeachMode] Column selected: ${role}`);
        
        if (role === 'unique') {
            selectionState.currentRole = 'value';
            if (teachTooltip) teachTooltip.setState('selectValue');
        } else {
            selectionState.currentRole = null;
            if (teachTooltip) teachTooltip.setState('saved');
            saveMapping();
        }
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

            for (let i = 0; i < normalized.colCount; i++) {
                highlightColumn(tableInfo, i);
            }
        });
    }

    function saveMapping() {
        if (!selectionState.unique || !selectionState.value) return;

        const getMappingData = (role) => {
            const selection = selectionState[role];
            const info = detectedTables.find(t => t.id === selection.tableId);
            const colIdx = parseInt(selection.colIndex, 10);
            const cell = info.normalized.matrix[0]?.[colIdx]?.element;
            if (!cell) {
                console.error(`[SMTM] Could not find cell for role ${role}`);
                return null;
            }

            return {
                selector: getCssSelector(cell),
                role: role,
                type: window.SMTM.tableParser.analyzeColumns(info.normalized).find(c => c.idx == colIdx)?.type || 'unknown',
                createdAt: new Date().toISOString(),
            };
        };

        try {
            const localConfig = JSON.parse(window.localStorage.getItem(SMTM_LOCAL_CONFIG_KEY));
            const uniqueMapping = getMappingData('unique');
            const valueMapping = getMappingData('value');

            if (uniqueMapping && valueMapping) {
                localConfig.mapping = {
                    unique: uniqueMapping,
                    value: valueMapping
                };
                window.localStorage.setItem(SMTM_LOCAL_CONFIG_KEY, JSON.stringify(localConfig));
                console.log(`[SMTM TeachMode] Saved mapping for ${window.location.hostname}`);
                
                // Dispatch event to trigger banner display
                window.dispatchEvent(new CustomEvent('smtm-mapping-saved', {
                    detail: { mapping: localConfig.mapping }
                }));
                
                // Try to show banner directly if available
                if (window.SMTM?.banner?.showBanner) {
                    const themeName = window.SMTM.activeTheme || 'light';
                    setTimeout(() => {
                        window.SMTM.banner.showBanner(themeName);
                    }, 2100); // Show banner after teach mode ends
                }
                
                // Trigger automatic cleanup after successful save
                setTimeout(() => {
                    endTeachMode();
                }, 2000); // Wait 2 seconds so user sees the "Saved!" tooltip
            }
        } catch (error) {
            console.error('[SMTM] Error saving mapping:', error);
        }
    }

    function loadAndApplyMapping() {
        try {
            const localConfig = JSON.parse(window.localStorage.getItem(SMTM_LOCAL_CONFIG_KEY));
            if (!localConfig?.mapping?.unique?.selector || !localConfig?.mapping?.value?.selector) {
                return;
            }

            const { unique, value } = localConfig.mapping;

            // Use querySelectorAll to handle cases where selector might not be unique enough
            const uniqueEls = document.querySelectorAll(`.smtm-col-highlight[data-col-selector="${unique.selector}"]`);
            const valueEls = document.querySelectorAll(`.smtm-col-highlight[data-col-selector="${value.selector}"]`);

            if (uniqueEls.length > 0) {
                const uniqueEl = uniqueEls[0]; // Assume first match is correct
                selectionState.unique = { tableId: uniqueEl.dataset.tableId, colIndex: uniqueEl.dataset.colIndex };
                uniqueEl.classList.remove('smtm-col-base');
                uniqueEl.classList.add('smtm-col-unique');
            }

            if (valueEls.length > 0) {
                const valueEl = valueEls[0]; // Assume first match is correct
                selectionState.value = { tableId: valueEl.dataset.tableId, colIndex: valueEl.dataset.colIndex };
                valueEl.classList.remove('smtm-col-base');
                valueEl.classList.add('smtm-col-value');
            }

            if (uniqueEls.length > 0 && valueEls.length > 0) {
                selectionState.currentRole = null;
                console.log('[SMTM] Previously saved mapping loaded and applied.');
            }
        } catch (error) {
            console.error('[SMTM] Error loading or applying mapping:', error);
        }
    }

    function endTeachMode() {
        console.log('[SMTM TeachMode] Exiting — cleaning up highlights...');
        
        // Remove event listener
        document.removeEventListener('click', handleColumnClick, true);
        
        // Remove all highlight overlays (check if still in DOM before removal)
        if (overlayContainer && overlayContainer.parentNode) {
            overlayContainer.remove();
        }
        
        // Remove any stray highlight elements
        document.querySelectorAll('.smtm-col-highlight, .smtm-table-outline').forEach(el => {
            if (el.parentNode) el.remove();
        });
        
        // Remove injected styles
        if (styleElement && styleElement.parentNode) {
            styleElement.remove();
        }
        
        // Destroy tooltip
        if (teachTooltip) {
            teachTooltip.destroy();
        }
        
        // Update localStorage to mark Teach Mode as inactive
        try {
            const localConfig = JSON.parse(window.localStorage.getItem(SMTM_LOCAL_CONFIG_KEY));
            if (localConfig) {
                localConfig.teachModeActive = false;
                window.localStorage.setItem(SMTM_LOCAL_CONFIG_KEY, JSON.stringify(localConfig));
            }
        } catch (error) {
            console.error('[SMTM] Error updating teachModeActive flag:', error);
        }
        
        console.log('[SMTM TeachMode] Exited — highlights cleared');
        
        // Trigger sum recalculation if valid mapping exists
        // This would normally be handled by the main content script
        // We just need to reload the page or trigger the processing
        // For now, we'll just log that cleanup is complete
    }

    // --- Activation ---
    teachTooltip = new TeachTooltip();
    analyzeAndHighlight();
    document.addEventListener('click', handleColumnClick, true);

    window.SMTM_cleanupTeachMode = endTeachMode;
})();
