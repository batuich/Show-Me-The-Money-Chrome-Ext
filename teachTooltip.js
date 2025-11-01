class TeachTooltip {
    constructor() {
        this.tooltip = null;
        this.currentState = '';
        this.timeoutId = null;
        this.init();
    }

    init() {
        if (document.getElementById('smtm-teach-tooltip')) {
            return;
        }

        this.tooltip = document.createElement('div');
        this.tooltip.id = 'smtm-teach-tooltip';
        this.tooltip.className = 'smtm-teach-tooltip';
        document.body.appendChild(this.tooltip);

        console.log('[SMTM TeachTooltip] Created');
        this.setState('selectUnique');

        document.addEventListener('mousemove', this.onMouseMove.bind(this));
    }

    setState(state) {
        if (this.currentState === state) {
            return;
        }

        this.currentState = state;
        console.log(`[SMTM TeachTooltip] State → ${state}`);

        this.tooltip.classList.add('fade-out');

        clearTimeout(this.timeoutId);

        setTimeout(() => {
            this.renderContent();
            this.applyTheme();
            this.tooltip.classList.remove('fade-out');
        }, 150);

        if (state === 'saved') {
            this.timeoutId = setTimeout(() => {
                this.destroy();
            }, 2000);
            console.log('[SMTM TeachTooltip] State → saved (auto-hide)');
        }
    }

    renderContent() {
        let title = 'Teach Mode';
        let content = '';

        switch (this.currentState) {
            case 'selectUnique':
                content = `
                    <div class="smtm-teach-tooltip-section">
                        <div class="smtm-teach-tooltip-marker unique"></div>
                        <div>
                            <strong>Click to define a unique key column (ID / Date).</strong>
                            <div class="hint">Used to align rows and avoid duplicate sums.</div>
                        </div>
                    </div>
                `;
                break;
            case 'selectValue':
                content = `
                    <div class="smtm-teach-tooltip-section">
                        <div class="smtm-teach-tooltip-marker value"></div>
                        <div>
                            <strong>Click to define a value column (number, amount).</strong>
                            <div class="hint">Used to calculate totals.</div>
                        </div>
                    </div>
                `;
                break;
            case 'saved':
                content = `
                    <div class="smtm-teach-tooltip-section saved">
                        <strong>Saved!</strong>
                    </div>
                `;
                break;
        }

        this.tooltip.innerHTML = `
            <div class="smtm-teach-tooltip-title">${title}</div>
            ${content}
        `;
    }

    applyTheme() {
        const themeName = window.SMTM?.activeTheme || 'light';
        const themes = window.SMTM?.themes?.panelThemes;
        const activeTheme = themes ? themes[themeName] : null;

        if (activeTheme) {
            this.tooltip.style.setProperty('--tooltip-background', activeTheme.tooltipBackground);
            this.tooltip.style.setProperty('--tooltip-text', activeTheme.tooltipText);
            this.tooltip.style.setProperty('--tooltip-border', activeTheme.tooltipBorder);
            this.tooltip.style.setProperty('--tooltip-accent-unique', activeTheme.tooltipAccentUnique);
            this.tooltip.style.setProperty('--tooltip-accent-value', activeTheme.tooltipAccentValue);
            console.log('[SMTM TeachTooltip] Theme applied:', themeName);
        } else {
            // Fallback theme
            this.tooltip.style.setProperty('--tooltip-background', '#ffffff');
            this.tooltip.style.setProperty('--tooltip-text', '#111111');
            this.tooltip.style.setProperty('--tooltip-border', '#e0e0e0');
            this.tooltip.style.setProperty('--tooltip-accent-unique', '#4A90E2');
            this.tooltip.style.setProperty('--tooltip-accent-value', '#F5A623');
            console.log('[SMTM TeachTooltip] Applied fallback theme (themes not ready)');
        }
    }

    onMouseMove(e) {
        if (!this.tooltip) return;

        const x = e.clientX;
        const y = e.clientY;

        // Debounce or throttle this if performance is an issue
        setTimeout(() => {
            this.tooltip.style.left = `${x + 12}px`;
            this.tooltip.style.top = `${y + 12}px`;
        }, 50);
    }

    destroy() {
        if (!this.tooltip) return;

        this.tooltip.classList.add('fade-out');
        console.log('[SMTM TeachTooltip] Hidden');
        setTimeout(() => {
            if (this.tooltip && this.tooltip.parentNode) {
                this.tooltip.parentNode.removeChild(this.tooltip);
                this.tooltip = null;
            }
            document.removeEventListener('mousemove', this.onMouseMove.bind(this));
        }, 300);
    }
}
