# Debug Guide - Show Me The Money Extension

## Overview
This guide explains how to use the comprehensive debugging features added to diagnose DOM parsing issues.

## Enabling/Disabling Debug Mode

Debug mode is controlled by the `window.SMTM.DEBUG` global variable, which is initialized in **content.js** (line 13):

```javascript
if (typeof window.SMTM.DEBUG !== 'boolean') window.SMTM.DEBUG = true;
```

To disable debug mode, change `true` to `false` and reload the extension. All debug functionality is namespaced under `window.SMTM.debug` to prevent redeclaration errors and support safe re-injection.

## Debug Features

### 1. Visual Debug Badge
When debug mode is enabled, you'll see an orange badge in the top-right corner that says **"SMTM Debug ON"**.

- **Orange**: Normal state
- **Green blink**: Indicates parsing activity (table data is being processed)

### 2. Console Output

Open your browser's Developer Console (F12) to see detailed diagnostic information grouped by operation:

#### Script Initialization
```
🔍 [SMTM DEBUG] Script Initialization
  - Timestamp
  - document.readyState
  - URL
  - Hostname
```

#### Table Detection
```
🔍 [SMTM DEBUG] parseTransactionTable - Table detection
  - Timestamp
  - document.readyState
  - Whether div[role="table"] was found
  - Whether table.w-full was found
  - If not found: Lists ALL tables on the page with their classes
  - Checks for shadow roots
```

#### HTML Table Parsing
```
🔍 [SMTM DEBUG] parseHtmlTable started
  - Table element details
  - Number of rows found
  - Preview of first 3 rows (innerText and HTML)
  - Detailed table showing for each row:
    * Row index
    * Cell count
    * Date extraction (title vs innerText)
    * Normalized date
    * Cost extraction method (div[title], span, or Included)
    * Parsed amount
    * Status (✅ success or ❌ failure with reason)
  - Final daily costs object
```

#### Data Processing
```
🔍 [SMTM DEBUG] processTransactions
  - Timestamp
  - Parsed data type and contents
  - Number of entries processed
  - Storage merge results
  - Current localStorage state
```

#### MutationObserver
```
🔍 [SMTM DEBUG] MutationObserver triggered
  - When table changes are detected
  - Number of mutations
  - Added/removed nodes
  - Target element
```

### 3. Retry Mechanism

If the table is not found initially, the extension will automatically retry at:
- 2 seconds
- 5 seconds  
- 10 seconds

Each retry is logged with a "🔄 Retry attempt" message.

## Common Issues You Can Diagnose

### Issue 1: Table Not Found
**Symptoms**: Console shows "❌ table.w-full NOT FOUND"

**What to check**:
1. Look at "All table elements found" section - shows all tables with their classes
2. The table might have different classes than expected
3. Check if table is in a shadow root

### Issue 2: Rows Not Being Parsed
**Symptoms**: Console shows "Found 0 rows in tbody"

**What to check**:
1. Check if tbody exists in the table
2. Look at "Table HTML (first 500 chars)" to see structure
3. The rows might be added dynamically after initial load

### Issue 3: Invalid Dates
**Symptoms**: Rows marked as "❌ invalid date" in the parsing table

**What to check**:
1. Look at `dateTitle` and `dateInnerText` columns
2. Check if the date format matches what JavaScript's `Date()` can parse
3. The `title` attribute might be missing

### Issue 4: Cost Not Extracted
**Symptoms**: Rows show `extractMethod: "none"` or parsed amount is 0

**What to check**:
1. Look at `lastCellHTML` to see the actual structure
2. Check if `div[title^="$"]` exists
3. Check if the span contains a "$" prefix
4. Might be marked as "Included"

### Issue 5: Timing Issues
**Symptoms**: Initial parse finds nothing, but retry succeeds

**What to check**:
1. Look at timestamps to see when table appears
2. Check MutationObserver logs to see if table is added dynamically
3. May need to adjust retry timings

## Example Debug Session

1. **Load the page** → Debug badge appears in top-right
2. **Open Console** (F12)
3. **Look for**: "Script Initialization" group
4. **Scroll down to**: "parseTransactionTable - Table detection"
   - If table found: ✅ Proceed to next step
   - If not found: ❌ Check diagnostics
5. **Expand**: "parseHtmlTable started"
   - Check row count
   - Review parsing table for errors
6. **Check**: "Final daily costs" to see what was extracted
7. **Look at**: "processTransactions" to see if data was saved to localStorage

## Disabling Debug Mode

Once you've identified the issue:

1. Set `window.SMTM.DEBUG = false` in **content.js** (line 13)
2. Reload the extension
3. Debug badge will disappear
4. Console will show minimal logs

Alternatively, you can disable it at runtime in the browser console:
```javascript
window.SMTM.DEBUG = false;
```
Then reload the page to apply the change.

## Re-injection Protection

The extension includes a re-injection guard to prevent multiple script injections:
```javascript
if (window.__SMTM_CONTENT_ATTACHED__) {
  console.log('[SMTM] Content script already attached, skipping re-injection');
  return;
}
window.__SMTM_CONTENT_ATTACHED__ = true;
```

This ensures the extension loads only once, even during SPA navigation or hot reloads.

## Performance Note

Debug mode generates significant console output, especially with large tables (100+ rows). This is normal and won't affect extension functionality, but you may want to disable it in production.

