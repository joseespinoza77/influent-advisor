/* ============================================================
   InfluentLab - JavaScript Calculation Engine
   Full Excel formula evaluator migrated from VBA
   ============================================================ */

(function () {
    'use strict';

    // --- State ---
    let cellsData = {};       // All cells (formulas + constants) for current sheet
    let computedValues = {};  // Latest computed values
    let userInputs = {};      // User-entered values for E column
    let formulaCells = [];    // List of formula cell refs for current sheet
    let currentSheetName = '';
    let computing = {};       // Cycle detection set (object used as set)
    let computePass = 0;
    const MAX_PASSES = 5;
    let refToName = {};       // Map: cell ref → variable name (for tooltip display)

    // --- DOM References ---
    const statusTag = document.getElementById('status-tag');
    const stateTable = document.getElementById('state-table');
    const defaultsBtn = document.getElementById('defaults-btn');

    // ================================================================
    //  FORMULA ENGINE
    // ================================================================

    function normalizeRef(ref) {
        const text = String(ref || '').replace(/\$/g, '').toUpperCase();
        const match = text.match(/^([A-Z]+)(\d+)$/);
        return match ? match[1] + match[2] : text;
    }

    function compareCellRefs(a, b) {
        const ma = normalizeRef(a).match(/^([A-Z]+)(\d+)$/);
        const mb = normalizeRef(b).match(/^([A-Z]+)(\d+)$/);
        if (!ma || !mb) return String(a).localeCompare(String(b));
        const ra = parseInt(ma[2], 10);
        const rb = parseInt(mb[2], 10);
        if (ra !== rb) return ra - rb;
        return ma[1].localeCompare(mb[1]);
    }

    /** Parse IF() arguments from string starting at the opening '(' */
    function parseIFArgs(str, startIdx) {
        const args = [];
        let depth = 0;
        let current = '';
        let i = startIdx;

        for (; i < str.length; i++) {
            const ch = str[i];
            if (ch === '(') {
                depth++;
                if (depth > 1) current += ch;
            } else if (ch === ')') {
                depth--;
                if (depth === 0) {
                    args.push(current.trim());
                    return { args: args, end: i + 1 };
                }
                current += ch;
            } else if (ch === ',' && depth === 1) {
                args.push(current.trim());
                current = '';
            } else {
                current += ch;
            }
        }
        // Fallback
        if (current.trim()) args.push(current.trim());
        return { args: args, end: i };
    }

    /** Convert IF(cond, t_val, f_val) to JS ternary (cond ? t_val : f_val) */
    function convertIFtoJS(expr) {
        let result = '';
        let i = 0;

        while (i < expr.length) {
            const ifPos = expr.indexOf('IF(', i);
            if (ifPos === -1) {
                result += expr.substring(i);
                break;
            }

            // Copy everything before IF(
            result += expr.substring(i, ifPos);

            // The '(' after "IF" is at position ifPos+2
            const parenIdx = ifPos + 2;
            const sub = expr.substring(parenIdx);
            const { args, end } = parseIFArgs(expr, parenIdx);

            if (args.length === 3) {
                const cond = convertIFtoJS(args[0]);
                const tVal = convertIFtoJS(args[1]);
                const fVal = convertIFtoJS(args[2]);
                result += '(' + cond + ' ? ' + tVal + ' : ' + fVal + ')';
            } else if (args.length === 2) {
                // Excel doesn't use IF(cond,val) but some formulas might
                result += '(' + convertIFtoJS(args[0]) + ' ? ' + convertIFtoJS(args[1]) + ' : 0)';
            } else {
                // Malformed - keep as-is
                result += expr.substring(ifPos, end);
            }

            i = end;
        }

        return result;
    }

    /** Get a cell's computed value (recursive with memoization & cycle detection) */
    function getCellValue(ref) {
        ref = normalizeRef(ref);

        // Return cached value if available
        if (computedValues[ref] !== undefined) return computedValues[ref];

        // Check if it's a user input (E column)
        if (ref.startsWith('E') && userInputs[ref] !== undefined) {
            computedValues[ref] = userInputs[ref];
            return computedValues[ref];
        }

        // Look up in cells data
        const cell = cellsData[ref];
        if (!cell) {
            computedValues[ref] = 0;
            return 0;
        }

        if (cell.type === 'constant') {
            const val = cell.value;
            computedValues[ref] = val;
            return val;
        }

        if (cell.type === 'formula') {
            // Cycle detection
            if (computing[ref]) {
                // Circular reference - return 0 for this pass
                return 0;
            }
            computing[ref] = true;
            try {
                const val = evaluateFormula(cell.formula);
                computedValues[ref] = val;
                return val;
            } catch (e) {
                computedValues[ref] = '#ERR';
                return '#ERR';
            } finally {
                delete computing[ref];
            }
        }

        computedValues[ref] = 0;
        return 0;
    }

    /** Check if a token is a cell reference (like E9, P10, J8) */
    function isCellRef(token) {
        return /^\$?[A-Z]+\$?\d+$/.test(token);
    }

    /** Resolve all cell references in an expression to their values */
    function resolveCellRefs(expr) {
        return expr.replace(/\$?([A-Z]+)\$?(\d+)/g, function (match, col, row) {
            // Skip if it's not a valid cell reference
            if (!/^[A-Z]+$/.test(col) || !/^\d+$/.test(row)) {
                return match;
            }

            const val = getCellValue(col + row);
            if (typeof val === 'string') {
                return JSON.stringify(val);
            }
            if (val === undefined || val === null || val === '' || val === '#ERR') {
                return '0';
            }
            return '(' + val + ')';
        });
    }

    /** Replace Excel comparison operators with JS equivalents */
    function fixComparisonOps(expr) {
        // Replace <> (not equal) first
        expr = expr.replace(/<>/g, '!==');
        // Replace = as equality (not preceded by !, <, >, = and not followed by =)
        expr = expr.replace(/(?<![!<>=])={1}(?!=)/g, '===');
        return expr;
    }

    /** Evaluate a single formula string */
    function evaluateFormula(formula) {
        try {
            let expr = formula.trim();
            if (expr.startsWith('=')) expr = expr.substring(1);

            // Pure number
            if (/^-?\d+\.?\d*$/.test(expr.trim())) {
                return parseFloat(expr);
            }

            // String constants
            if (expr === '"t"' || expr === "'t'") return 't';
            if (expr === '"f"' || expr === "'f'") return 'f';

            // Step 1: Resolve cell references
            let resolved = resolveCellRefs(expr);

            // Step 2: Convert IF() to ternary
            resolved = convertIFtoJS(resolved);

            // Step 3: Fix comparison operators
            resolved = fixComparisonOps(resolved);

            // Step 4: Handle Excel string concatenation (&)
            resolved = resolved.replace(/&/g, '+');

            // Step 5: Safe evaluation
            try {
                const fn = new Function('"use strict"; return (' + resolved + ')');
                const result = fn();

                if (typeof result === 'number') {
                    if (!Number.isFinite(result)) return '#DIV/0!';
                    // Avoid -0
                    return result === 0 ? 0 : result;
                }
                if (typeof result === 'boolean') return result ? 't' : 'f';
                if (result === 't' || result === 'f') return result;
                if (result !== undefined && result !== null) return result;
                return 0;
            } catch (evalErr) {
                // Try simpler evaluation without Function constructor for very nested formulas
                try {
                    const simpleFn = new Function('return (' + resolved + ')');
                    const result = simpleFn();
                    if (typeof result === 'number') {
                        if (!Number.isFinite(result)) return '#DIV/0!';
                        return result === 0 ? 0 : result;
                    }
                    if (typeof result === 'boolean') return result ? 't' : 'f';
                    return result || 0;
                } catch (e2) {
                    return '#ERR';
                }
            }
        } catch (e) {
            return '#ERR';
        }
    }

    /** Compute ALL formula cells for current sheet using iterative passes */
    function computeAll() {
        // Save user inputs directly from userInputs object
        const savedInputs = {};
        Object.keys(userInputs).forEach(function (key) {
            if (key.startsWith('E') && userInputs[key] !== undefined) {
                savedInputs[key] = userInputs[key];
            }
        });

        // Reset computed (keep user inputs)
        computedValues = {};
        Object.assign(computedValues, savedInputs);
        computing = {};

        // First pass: resolve constant references
        formulaCells.forEach(function (ref) {
            const cell = cellsData[ref];
            if (!cell || cell.type !== 'formula') return;
            const formula = cell.formula.replace(/^=/, '').trim();

            // Simple refs: just =E11 or =0
            if (/^[A-Z]+\d+$/.test(formula) || /^\d+\.?\d*$/.test(formula)) {
                getCellValue(ref);
            }
        });

        // Iterative passes for complex formulas
        for (let pass = 0; pass < MAX_PASSES; pass++) {
            computePass = pass;
            computing = {};

            formulaCells.forEach(function (ref) {
                const cell = cellsData[ref];
                if (!cell || cell.type !== 'formula') return;
                const formula = cell.formula.replace(/^=/, '').trim();

                // Skip simple refs (already resolved)
                if (/^[A-Z]+\d+$/.test(formula) || /^\d+\.?\d*$/.test(formula)) return;

                // Re-evaluate (will use cached values from prev pass)
                getCellValue(ref);
            });
        }
    }

    // ================================================================
    //  UI UPDATE
    // ================================================================

    /**
     * Build a map of cell ref → variable name from the DOM.
     * Each .calculated-value span has data-ref (e.g. "J8") and data-name (e.g. "si").
     * Also includes input cells (data-ref="E11" with data-name).
     */
    function buildRefToNameMap() {
        var map = {};
        // Calculated values (state + composite)
        document.querySelectorAll('.calculated-value').forEach(function (el) {
            var ref = normalizeRef(el.getAttribute('data-ref'));
            var name = el.getAttribute('data-name');
            if (ref && name) map[ref] = name;
        });
        // User inputs (E column)
        document.querySelectorAll('.value-input').forEach(function (el) {
            var ref = normalizeRef(el.getAttribute('data-ref'));
            var name = el.getAttribute('data-name');
            if (ref && name) map[ref] = name;
        });
        return map;
    }

    /**
     * Replace cell references in a formula string with their variable names.
     * Falls back to the original reference if no name is found.
     * e.g. "=E11+G10" → "=si + Ks"
     */
    function resolveFormulaToNames(formula, refMap) {
        if (!formula || !refMap) return formula;
        // Match cell references like E11, G10, J8 (but not numbers alone)
        return formula.replace(/\$?([A-Z]+)\$?(\d+)/g, function (match, col, row) {
            if (!/^[A-Z]+$/.test(col) || !/^\d+$/.test(row)) return match;
            var ref = col + row;
            return refMap[ref] || match;
        });
    }

    /** Update all calculated value displays */
    function updateStateDisplay() {
        var displays = document.querySelectorAll('.calculated-value');

        // Build ref→name map once from the DOM
        var refMap = buildRefToNameMap();

        displays.forEach(function (calcSpan) {
            var ref = normalizeRef(calcSpan.getAttribute('data-ref'));
            var display = calcSpan.querySelector('.value-display');
            if (!display || !ref) return;

            var val = getCellValue(ref);
            if (val === undefined || val === null) val = 0;

            var formatted = formatValue(val);
            display.textContent = formatted;

            // Attach formula tooltip with resolved variable names
            var cell = cellsData[ref];
            if (cell && cell.type === 'formula' && cell.formula) {
                var resolved = resolveFormulaToNames(cell.formula, refMap);
                calcSpan.setAttribute('data-formula', resolved);
                calcSpan.classList.add('has-formula');
            } else if (cell && cell.type === 'constant') {
                calcSpan.setAttribute('data-formula', '= ' + val + '  (constant)');
                calcSpan.classList.add('has-formula');
            }

            display.classList.remove('highlight');
            void display.offsetWidth;
            display.classList.add('highlight');
        });

        updateStatus('OK - ' + formulaCells.length + ' formulas', 'success');
    }

    /** Format a value for display */
    function formatValue(val) {
        if (val === '#ERR' || val === '#REF!' || val === '#VALUE!') return val;
        if (typeof val === 'string') return val;
        if (typeof val !== 'number') return String(val || '0');
        if (Number.isInteger(val)) return val.toString();
        return parseFloat(val.toFixed(6)).toString();
    }

    /** Update status bar */
    function updateStatus(text, type) {
        if (!statusTag) return;
        statusTag.textContent = 'Status: ' + text;
        if (type === 'success') statusTag.style.color = '#188038';
        else if (type === 'error') statusTag.style.color = '#d93025';
        else statusTag.style.color = '';
    }

    /** Show a toast notification */
    function showToast(message, type) {
        var toast = document.querySelector('.toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.className = 'toast show';
        if (type === 'success') toast.classList.add('success');
        if (type === 'error') toast.classList.add('error');
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(function () {
            toast.classList.remove('show');
        }, 2500);
    }

    // ================================================================
    //  DATA LOADING
    // ================================================================

    /** Load cells data for the current sheet */
    function loadCellsData(sheetName) {
        return fetch('/data/cells.json')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                const sheetCells = data[sheetName] || {};
                cellsData = sheetCells;
                currentSheetName = sheetName;

                // Collect every formula cell used by the extracted sheet.
                formulaCells = [];
                Object.keys(sheetCells).forEach(function (ref) {
                    const cell = sheetCells[ref];
                    if (cell.type === 'formula') {
                        formulaCells.push(normalizeRef(ref));
                    }
                });

                formulaCells.sort(compareCellRefs);
                return true;
            });
    }

    // ================================================================
    //  EVENT HANDLERS
    // ================================================================

    /** Handle input value changes */
    function onInputChange(event) {
        const input = event.target;
        const row = input.getAttribute('data-row');
        const ref = normalizeRef(input.getAttribute('data-ref') || ('E' + row));

        const rawValue = input.value.trim();
        const numValue = rawValue === '' ? 0 : parseFloat(rawValue);

        if (isNaN(numValue)) {
            input.value = '0';
            userInputs[ref] = 0;
        } else {
            userInputs[ref] = numValue;
        }

        input.classList.add('changed');
        updateStatus('Calculating...', '');

        // Recompute all formulas (3 passes to resolve circular refs)
        for (let p = 0; p < 3; p++) {
            computeAll();
        }

        updateStateDisplay();
    }

    /** Load defaults for current sheet */
    function onLoadDefaults() {
        if (!defaultsBtn) return;
        defaultsBtn.disabled = true;
        defaultsBtn.textContent = 'Loading...';

        const meta = document.getElementById('sheet-metadata');
        const sheetName = meta ? meta.getAttribute('data-sheet-name') : '';

        fetch('/api/defaults?sheet=' + encodeURIComponent(sheetName))
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.error) {
                    showToast('No defaults found for this sheet', 'error');
                    return;
                }

                const defaultsList = data.defaults || [];
                let loadedCount = 0;

                defaultsList.forEach(function (item) {
                    // FIX: API returns {cell: "E9", value: 30}, extract row from cell
                    const cellRef = item.cell || '';
                    const row = cellRef.replace(/^[A-Z]+/i, ''); // "E9" -> "9"
                    const value = item.value;
                    const ref = normalizeRef(cellRef || ('E' + row));

                    const input = document.querySelector(
                        '.value-input[data-ref="' + ref + '"], .value-input[data-row="' + row + '"]'
                    );
                    if (input) {
                        const numVal = typeof value === 'number' ? value : parseFloat(value);
                        if (!isNaN(numVal)) {
                            input.value = numVal;
                            userInputs[ref] = numVal;
                            loadedCount++;
                        } else if (typeof value === 'string' && value.trim()) {
                            input.value = value;
                            userInputs[ref] = value;
                            loadedCount++;
                        }
                        input.classList.add('changed');
                    }
                });

                // Recompute
                updateStatus('Calculating...', '');
                for (let p = 0; p < 3; p++) {
                    computeAll();
                }
                updateStateDisplay();

                showToast('Loaded ' + loadedCount + ' default values', 'success');
            })
            .catch(function (err) {
                showToast('Error loading defaults: ' + err.message, 'error');
            })
            .finally(function () {
                defaultsBtn.disabled = false;
                defaultsBtn.innerHTML =
                    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none">' +
                    '<rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>' +
                    '<path d="M5 8H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
                    '<path d="M8 5V11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
                    '</svg> Load Defaults';
            });
    }

    // ================================================================
    //  INITIALIZATION
    // ================================================================

    /** Initialize the sheet page */
    function initSheet() {
        const meta = document.getElementById('sheet-metadata');
        if (!meta) return; // Not on a sheet page

        const sheetName = meta.getAttribute('data-sheet-name');
        if (!sheetName) return;

        updateStatus('Loading data...', '');

        loadCellsData(sheetName)
            .then(function () {
                // Collect initial user inputs from DOM
                const inputs = document.querySelectorAll('.value-input');
                inputs.forEach(function (input) {
                    const row = input.getAttribute('data-row');
                    const ref = normalizeRef(input.getAttribute('data-ref') || ('E' + row));
                    const val = input.value.trim();
                    const numVal = val === '' ? 0 : parseFloat(val);
                    userInputs[ref] = isNaN(numVal) ? 0 : numVal;
                });

                // Compute all formulas (multiple passes for convergence)
                updateStatus('Calculating...', '');
                for (let p = 0; p < MAX_PASSES; p++) {
                    computeAll();
                }

                updateStateDisplay();

                // Attach input event listeners
                inputs.forEach(function (input) {
                    input.addEventListener('input', onInputChange);
                });

                // Attach defaults button
                if (defaultsBtn) {
                    defaultsBtn.addEventListener('click', onLoadDefaults);
                }

                showToast('Ready - ' + formulaCells.length + ' formula cells loaded', 'success');
            })
            .catch(function (err) {
                updateStatus('Error loading data', 'error');
                showToast('Failed to load: ' + err.message, 'error');
            });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSheet);
    } else {
        initSheet();
    }

})();
