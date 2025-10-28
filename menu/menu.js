// Load theme configuration
let themeConfig = null;

// Arrow icon SVG
const ARROW_ICON = `
<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 6L8 10L12 6" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

// Initialize menu
async function initMenu() {
  try {
    // Load theme configuration
    const response = await fetch('menu.json');
    themeConfig = await response.json();
    
    // Build menu
    buildMenu();
    
    // Apply styles from theme config
    applyThemeStyles();
    
    // Setup event listeners
    setupEventListeners();
  } catch (error) {
    console.error('Error initializing menu:', error);
  }
}

// Build menu structure
function buildMenu() {
  const container = document.getElementById('menu-container');
  
  const menuHTML = `
    <!-- Theme Section -->
    <div class="menu-section" data-section="theme">
      <div class="section-row">
        <span class="section-title">Theme</span>
        <div class="toggle-group">
          <button class="menu-button" data-theme="light">Light</button>
          <button class="menu-button active" data-theme="dark">Dark</button>
        </div>
      </div>
    </div>

    <!-- Teach Mode Section -->
    <div class="menu-section" data-section="teach-mode">
      <div class="section-row">
        <span class="section-title">Teach Mode</span>
        <button class="menu-button">Start detection</button>
      </div>
    </div>

    <!-- Check Mapping Section (Expandable) -->
    <div class="menu-section" data-section="check-mapping">
      <div class="section-row">
        <span class="section-title clickable" data-expand="check-mapping">Check Mapping</span>
        <div class="icon-button" data-expand="check-mapping">
          ${ARROW_ICON}
        </div>
      </div>
      <div class="expand-content" data-content="check-mapping">
        <div class="expand-inner">
          <span class="expand-paragraph">No site mapping found.</span>
        </div>
      </div>
    </div>

    <!-- Reset Buttons Section -->
    <div class="menu-section" data-section="reset">
      <div class="section-row">
        <div class="button-group" style="width: 100%;">
          <button class="menu-button">Reset Stats</button>
          <button class="menu-button">Reset Mapping</button>
        </div>
      </div>
    </div>

    <!-- How it works Section (Expandable) -->
    <div class="menu-section" data-section="how-it-works">
      <div class="section-row">
        <span class="section-title clickable" data-expand="how-it-works">How it works</span>
        <div class="icon-button" data-expand="how-it-works">
          ${ARROW_ICON}
        </div>
      </div>
      <div class="expand-content" data-content="how-it-works">
        <div class="expand-inner">
          <span class="expand-paragraph">Counts only the data visible in the table. Scroll through all rows to get complete stats.</span>
          <span class="expand-paragraph">To train it for a new site, use "Teach Mode".</span>
          <span class="expand-paragraph">All collected data stays on your device — nothing is sent anywhere.</span>
        </div>
      </div>
    </div>
  `;
  
  container.innerHTML = menuHTML;
}

// Apply theme styles from menu.json
function applyThemeStyles() {
  if (!themeConfig) return;
  
  const container = document.getElementById('menu-container');
  const { menu, section, title, iconButton, expandContent, button } = themeConfig;
  
  // Apply menu styles
  if (menu) {
    container.style.background = menu.background;
    container.style.padding = menu.padding;
    container.style.borderRadius = menu.borderRadius;
  }
  
  // Apply section styles
  if (section) {
    const sections = document.querySelectorAll('.menu-section');
    sections.forEach((sec, index) => {
      sec.style.background = section.background;
      sec.style.padding = section.padding;
      sec.style.display = 'flex';
      sec.style.flexDirection = 'column';
      sec.style.gap = section.gap;
      
      // Apply border-top except for first child
      if (index === 0 && section.firstChildBorder) {
        sec.style.borderTop = section.firstChildBorder;
      } else if (section.borderTop) {
        sec.style.borderTop = section.borderTop;
      }
    });
  }
  
  // Apply title styles
  if (title) {
    const titles = document.querySelectorAll('.section-title');
    titles.forEach(t => {
      t.style.color = title.color;
      t.style.fontSize = title.fontSize;
      t.style.padding = title.padding;
    });
  }
  
  // Apply icon button styles
  if (iconButton) {
    const buttons = document.querySelectorAll('.icon-button');
    buttons.forEach(btn => {
      btn.style.background = iconButton.background;
      btn.style.borderRadius = iconButton.borderRadius;
      btn.style.padding = iconButton.padding;
      btn.style.display = iconButton.display;
      btn.style.alignItems = iconButton.alignItems;
      btn.style.justifyContent = iconButton.justifyContent;
    });
  }
  
  // Apply expand content styles
  if (expandContent) {
    const expandInners = document.querySelectorAll('.expand-inner');
    expandInners.forEach(inner => {
      inner.style.color = expandContent.color;
      inner.style.fontSize = expandContent.fontSize;
      inner.style.padding = expandContent.padding;
      inner.style.gap = expandContent.gap;
      inner.style.lineHeight = expandContent.lineHeight;
    });
  }

  // Apply button styles
  if (button) {
    applyButtonStyles();
  }
}

// Apply button styles
function applyButtonStyles() {
  const buttons = document.querySelectorAll('.menu-button');
  const { button, buttonHover, buttonActive, buttonDisabled } = themeConfig;

  buttons.forEach(btn => {
    // Apply base styles
    Object.assign(btn.style, button);

    // Hover and active states
    btn.addEventListener('mouseenter', () => {
      Object.assign(btn.style, buttonHover);
    });
    btn.addEventListener('mouseleave', () => {
      Object.assign(btn.style, button); // Revert to base
    });
    btn.addEventListener('mousedown', () => {
      Object.assign(btn.style, buttonActive);
    });
    btn.addEventListener('mouseup', () => {
      Object.assign(btn.style, buttonHover); // Revert to hover
    });

    // Handle disabled state
    if (btn.disabled) {
      Object.assign(btn.style, buttonDisabled);
    }
  });
}

// Setup event listeners
function setupEventListeners() {
  // Expandable sections
  const expandTriggers = document.querySelectorAll('[data-expand]');
  expandTriggers.forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      const targetId = e.currentTarget.getAttribute('data-expand');
      toggleExpand(targetId);
    });
  });
}

// Toggle expand/collapse for sections
function toggleExpand(sectionId) {
  const content = document.querySelector(`[data-content="${sectionId}"]`);
  const iconButton = document.querySelector(`.icon-button[data-expand="${sectionId}"]`);
  
  if (!content || !iconButton) return;
  
  const isOpen = content.classList.contains('open');
  
  if (isOpen) {
    // Close
    content.classList.remove('open');
    iconButton.classList.remove('expanded');
  } else {
    // Open
    content.classList.add('open');
    iconButton.classList.add('expanded');
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMenu);
} else {
  initMenu();
}
