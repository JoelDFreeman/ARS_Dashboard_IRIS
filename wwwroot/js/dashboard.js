// Dashboard interactivity

const getIrisTokenColor = tokenName => window.irisChartTokens?.token(tokenName) || getComputedStyle(document.body).getPropertyValue(tokenName).trim();
const getIrisChartColor = colorName => window.irisChartTokens?.color(colorName) || getIrisTokenColor('--oi-chart-color-' + colorName);
if (typeof Chart !== 'undefined') window.irisChartTokens?.apply(Chart);

let activeKpiModalPanel = null;
let activeKpiModalPlaceholder = null;
let activeKpiModalTrigger = null;
let activeKpiModalHeading = null;
let activeKpiModalHeadingWasHidden = false;
let activeKpiModalWasActive = false;
let previousBodyOverflow = '';

function initializeKpiDetailTriggers(root = document) {
    root.querySelectorAll('.kpi[data-section]').forEach(kpi => {
        if (!['BUTTON', 'A'].includes(kpi.tagName)) {
            kpi.setAttribute('role', 'button');
            kpi.setAttribute('tabindex', '0');
        }
        kpi.setAttribute('aria-haspopup', 'dialog');
        kpi.setAttribute('aria-controls', 'kpiDetailModal');
        if (!kpi.hasAttribute('aria-expanded')) kpi.setAttribute('aria-expanded', 'false');
    });
}

initializeKpiDetailTriggers();

function openKpiDetailModal(panel, trigger) {
    const modal = document.getElementById('kpiDetailModal');
    const body = document.getElementById('kpiDetailModalBody');
    const title = document.getElementById('kpiDetailModalTitle');
    if (!modal || !body || !title || !panel) return false;
    if (activeKpiModalPanel === panel) return true;
    if (activeKpiModalPanel) closeKpiDetailModal();

    const panelHeading = panel.querySelector(':scope > h2, :scope > summary h2');
    const titleClone = panelHeading?.cloneNode(true);
    titleClone?.querySelectorAll('.sec-icon, .sec-tree-btn').forEach(element => element.remove());
    title.textContent = titleClone?.textContent.trim() || trigger?.getAttribute('aria-label') || 'Details';
    activeKpiModalPanel = panel;
    activeKpiModalTrigger = trigger || document.activeElement;
    activeKpiModalHeading = panelHeading;
    activeKpiModalHeadingWasHidden = panelHeading?.hidden || false;
    activeKpiModalWasActive = panel.classList.contains('active');
    activeKpiModalPlaceholder = document.createComment('KPI detail modal return point');
    panel.parentNode.insertBefore(activeKpiModalPlaceholder, panel);
    if (panelHeading) panelHeading.hidden = true;
    panel.classList.add('iris-kpi-modal-content');
    panel.classList.remove('active');
    body.replaceChildren(panel);

    document.querySelectorAll('.kpi[data-section]').forEach(kpi => kpi.classList.remove('kpi-active'));
    if (trigger) {
        trigger.classList.add('kpi-active');
        trigger.setAttribute('aria-expanded', 'true');
        activeKpiModalTrigger = trigger;
    }

    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    modal.hidden = false;
    document.getElementById('kpiDetailModalClose')?.focus();
    return true;
}

function closeKpiDetailModal() {
    const modal = document.getElementById('kpiDetailModal');
    if (!activeKpiModalPanel || !modal) return;

    if (activeKpiModalPlaceholder?.parentNode) {
        activeKpiModalPlaceholder.parentNode.insertBefore(activeKpiModalPanel, activeKpiModalPlaceholder);
        activeKpiModalPlaceholder.remove();
    }
    activeKpiModalPanel.classList.remove('iris-kpi-modal-content');
    if (activeKpiModalWasActive) activeKpiModalPanel.classList.add('active');
    if (activeKpiModalHeading) activeKpiModalHeading.hidden = activeKpiModalHeadingWasHidden;
    modal.hidden = true;
    document.body.style.overflow = previousBodyOverflow;
    document.querySelectorAll('.kpi[data-section]').forEach(kpi => {
        kpi.classList.remove('kpi-active');
    });

    const trigger = activeKpiModalTrigger;
    trigger?.setAttribute('aria-expanded', 'false');
    activeKpiModalPanel = null;
    activeKpiModalPlaceholder = null;
    activeKpiModalTrigger = null;
    activeKpiModalHeading = null;
    if (trigger instanceof HTMLElement) trigger.focus();
}

// KPI click -> show its existing server-rendered detail panel in the shared Iris modal.
function openDashboardSection(section, scroll) {
    const panel = document.getElementById('panel-' + section);
    if (!panel) return false;
    const trigger = document.querySelector('.kpi[data-section="' + section + '"]');
    return openKpiDetailModal(panel, trigger);
}

const irisAccordionRuns = new WeakMap();

function getIrisAccordionParts(accordion) {
    const header = Array.from(accordion.children).find(child =>
        child.matches('summary.iris-accordion-header, .iris-accordion-header'));
    const content = Array.from(accordion.children).find(child =>
        child.classList.contains('iris-accordion-content'));
    return { header, content };
}

function initializeIrisAccordions(root = document) {
    root.querySelectorAll('.iris-accordion').forEach(accordion => {
        const { header, content } = getIrisAccordionParts(accordion);
        if (!header || !content) return;
        const expanded = accordion instanceof HTMLDetailsElement
            ? accordion.open
            : !accordion.classList.contains('collapsed');
        header.setAttribute('aria-expanded', String(expanded));
        const button = header.querySelector('.btn-collapse');
        if (button) button.setAttribute('aria-expanded', String(expanded));
        content.style.height = expanded ? 'auto' : '0px';
        content.style.opacity = expanded ? '1' : '0';
        content.inert = !expanded;
    });
}

function toggleIrisAccordion(accordion, header) {
    const { content } = getIrisAccordionParts(accordion);
    if (!content) return;

    const isDetails = accordion instanceof HTMLDetailsElement;
    const expanded = isDetails ? accordion.open : !accordion.classList.contains('collapsed');
    const nextExpanded = !expanded;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const runId = (irisAccordionRuns.get(accordion) || 0) + 1;
    irisAccordionRuns.set(accordion, runId);

    header.setAttribute('aria-expanded', String(nextExpanded));
    const button = header.querySelector('.btn-collapse');
    if (button) {
        button.setAttribute('aria-expanded', String(nextExpanded));
        button.title = nextExpanded ? 'Collapse' : 'Expand';
        button.setAttribute('aria-label', button.title);
    }

    if (reducedMotion) {
        if (isDetails) accordion.open = nextExpanded;
        else accordion.classList.toggle('collapsed', !nextExpanded);
        content.style.height = nextExpanded ? 'auto' : '0px';
        content.style.opacity = nextExpanded ? '1' : '0';
        content.inert = !nextExpanded;
        return;
    }

    if (nextExpanded) {
        if (isDetails) accordion.open = true;
        else accordion.classList.remove('collapsed');
        content.inert = false;
        content.style.height = '0px';
        content.style.opacity = '0';
        void content.offsetHeight;
        requestAnimationFrame(() => {
            if (irisAccordionRuns.get(accordion) !== runId) return;
            content.style.height = content.scrollHeight + 'px';
            content.style.opacity = '1';
        });
    } else {
        content.style.height = content.getBoundingClientRect().height + 'px';
        content.style.opacity = '1';
        void content.offsetHeight;
        content.inert = true;
        requestAnimationFrame(() => {
            if (irisAccordionRuns.get(accordion) !== runId) return;
            content.style.height = '0px';
            content.style.opacity = '0';
        });
    }

    let finished = false;
    const finish = event => {
        if (finished || (event && (event.target !== content || event.propertyName !== 'height'))) return;
        finished = true;
        content.removeEventListener('transitionend', finish);
        if (irisAccordionRuns.get(accordion) !== runId) return;
        if (!nextExpanded) {
            if (isDetails) accordion.open = false;
            else accordion.classList.add('collapsed');
        }
        content.style.height = nextExpanded ? 'auto' : '0px';
        content.style.opacity = nextExpanded ? '1' : '0';
    };
    content.addEventListener('transitionend', finish);
    setTimeout(finish, 260);
}

initializeIrisAccordions();

document.addEventListener('click', event => {
    const header = event.target.closest('.iris-accordion-header');
    if (!header) return;
    const accordion = header.closest('.iris-accordion');
    if (!accordion) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    toggleIrisAccordion(accordion, header);
}, true);

document.addEventListener('click', event => {
    const accordionToggle = event.target.closest('.ad-accordion-toggle');
    if (accordionToggle) {
        const expanded = accordionToggle.getAttribute('aria-expanded') === 'true';
        const content = document.getElementById(accordionToggle.getAttribute('aria-controls'));
        if (content) {
            content.hidden = expanded;
            accordionToggle.setAttribute('aria-expanded', String(!expanded));
            const action = expanded ? 'Expand' : 'Collapse';
            accordionToggle.setAttribute('aria-label', action + ' Governance and Risk');
            accordionToggle.title = action + ' Governance and Risk';
        }
        return;
    }

    const kpi = event.target.closest('.kpi[data-section]');
    if (kpi) openDashboardSection(kpi.getAttribute('data-section'), true);
});

document.addEventListener('keydown', event => {
    const kpi = event.target.closest('.kpi[data-section]');
    if (kpi && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        openDashboardSection(kpi.getAttribute('data-section'), true);
        return;
    }

    if (!activeKpiModalPanel) return;
    if (event.key === 'Escape') {
        event.preventDefault();
        closeKpiDetailModal();
        return;
    }
    if (event.key !== 'Tab') return;

    const modal = document.querySelector('#kpiDetailModal .iris-kpi-modal');
    const focusable = modal?.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
});

document.getElementById('kpiDetailModal')?.addEventListener('click', event => {
    if (event.target.id === 'kpiDetailModal') closeKpiDetailModal();
});
document.getElementById('kpiDetailModalClose')?.addEventListener('click', closeKpiDetailModal);
document.getElementById('kpiDetailModalExport')?.addEventListener('click', () => {
    closeKpiDetailModal();
    document.getElementById('btnExport')?.click();
});

// On load, restore the panel referenced by the URL hash (e.g. #panel-globalgroups),
// e.g. when returning from the Group Membership Tree page.
(function restorePanelFromHash() {
    const hash = window.location.hash;
    if (hash && hash.indexOf('#panel-') === 0) {
        openDashboardSection(hash.substring('#panel-'.length), true);
    }
})();

// Table sorting
function initTableSort() {
    document.querySelectorAll('.panel table').forEach(table => {
        const headers = table.querySelectorAll('thead th');
        headers.forEach((th, colIndex) => {
            // Skip columns with no text (e.g. manage/action icon columns) - these are not sortable or filterable
            if (!th.textContent.trim()) return;

            th.classList.add('sortable');

            // Clicking the header label sorts; the filter button (added below) handles filtering.
            th.addEventListener('click', (e) => {
                // Ignore clicks that originate on the filter button / dropdown
                if (e.target.closest('.col-filter')) return;

                const currentDir = th.getAttribute('data-sort-dir');
                const newDir = currentDir === 'asc' ? 'desc' : 'asc';

                // Clear sort state from all headers in this table
                headers.forEach(h => {
                    h.removeAttribute('data-sort-dir');
                    h.classList.remove('sort-asc', 'sort-desc');
                });

                th.setAttribute('data-sort-dir', newDir);
                th.classList.add(newDir === 'asc' ? 'sort-asc' : 'sort-desc');

                sortTable(table, colIndex, newDir);
            });

            initColumnFilter(table, th, colIndex);
        });
    });
}

function sortTable(table, colIndex, direction) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr:not(.empty-row-tr)'));

    // Skip if only empty-row placeholder
    if (rows.length === 0) return;

    // Filter out empty-row placeholders
    const dataRows = rows.filter(r => !r.querySelector('.empty-row'));

    dataRows.sort((a, b) => {
        const aCell = a.cells[colIndex];
        const bCell = b.cells[colIndex];
        if (!aCell || !bCell) return 0;

        const aText = (aCell.textContent || '').trim().toLowerCase();
        const bText = (bCell.textContent || '').trim().toLowerCase();

        // Try numeric comparison first
        const aNum = parseFloat(aText);
        const bNum = parseFloat(bText);
        if (!isNaN(aNum) && !isNaN(bNum)) {
            return direction === 'asc' ? aNum - bNum : bNum - aNum;
        }

        // String comparison
        if (aText < bText) return direction === 'asc' ? -1 : 1;
        if (aText > bText) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    // Re-append sorted rows
    dataRows.forEach(row => tbody.appendChild(row));
}

// ---------------------------------------------------------------------------
// Excel-like per-column filtering
// ---------------------------------------------------------------------------
// Filter state is tracked per table on the DOM element itself:
//   table.__colFilters = { [colIndex]: Set(selectedValues) }
// A column is considered "unfiltered" when it has no entry (all values shown).

function getDataRows(table) {
    const tbody = table.querySelector('tbody');
    if (!tbody) return [];
    return Array.from(tbody.querySelectorAll('tr')).filter(r => !r.querySelector('.empty-row'));
}

function getColumnValues(table, colIndex) {
    const values = new Set();
    getDataRows(table).forEach(row => {
        const cell = row.cells[colIndex];
        if (cell) values.add((cell.textContent || '').trim());
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

function applyFilters(table) {
    const filters = table.__colFilters || {};
    const activeCols = Object.keys(filters).map(Number);

    getDataRows(table).forEach(row => {
        let visible = true;
        for (const colIndex of activeCols) {
            const selected = filters[colIndex];
            const cell = row.cells[colIndex];
            const value = cell ? (cell.textContent || '').trim() : '';
            if (!selected.has(value)) { visible = false; break; }
        }
        row.style.display = visible ? '' : 'none';
    });

    // Toggle empty-state placeholder if all data rows are hidden by filters
    const tbody = table.querySelector('tbody');
    if (tbody) {
        const anyVisible = getDataRows(table).some(r => r.style.display !== 'none');
        let placeholder = tbody.querySelector('.filter-empty-row');
        if (!anyVisible) {
            if (!placeholder) {
                const colCount = table.querySelectorAll('thead th').length || 1;
                const tr = document.createElement('tr');
                tr.className = 'filter-empty-row empty-row-tr';
                tr.innerHTML = `<td colspan="${colCount}" class="empty-row">No rows match the current filters</td>`;
                tbody.appendChild(tr);
            }
        } else if (placeholder) {
            placeholder.remove();
        }
    }
}

function initColumnFilter(table, th, colIndex) {
    if (!table.__colFilters) table.__colFilters = {};

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'col-filter';
    btn.title = 'Filter column';
    btn.setAttribute('aria-label', 'Filter column');
    btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>';
    th.appendChild(btn);

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFilterDropdown(table, th, colIndex, btn);
    });
}

function closeAllFilterDropdowns() {
    document.querySelectorAll('.col-filter-dropdown').forEach(d => d.remove());
    document.querySelectorAll('th .col-filter.open').forEach(b => b.classList.remove('open'));
}

function toggleFilterDropdown(table, th, colIndex, btn) {
    const alreadyOpen = btn.classList.contains('open');
    closeAllFilterDropdowns();
    if (alreadyOpen) return;

    btn.classList.add('open');

    const filters = table.__colFilters || {};
    const allValues = getColumnValues(table, colIndex);
    const selected = filters[colIndex] ? new Set(filters[colIndex]) : new Set(allValues);

    const dropdown = document.createElement('div');
    dropdown.className = 'col-filter-dropdown';
    dropdown.innerHTML = `
        <div class="cfd-search"><input type="text" placeholder="Search..." /></div>
        <label class="cfd-all"><input type="checkbox" class="cfd-select-all" /> (Select All)</label>
        <div class="cfd-list"></div>
        <div class="cfd-actions">
            <button type="button" class="cfd-apply">Apply</button>
            <button type="button" class="cfd-clear">Clear</button>
        </div>`;

    const list = dropdown.querySelector('.cfd-list');
    allValues.forEach(val => {
        const label = document.createElement('label');
        label.className = 'cfd-item';
        const display = val === '' ? '(Blanks)' : val;
        label.innerHTML = `<input type="checkbox" value="${val.replace(/"/g, '&quot;')}" ${selected.has(val) ? 'checked' : ''} /> <span></span>`;
        label.querySelector('span').textContent = display;
        list.appendChild(label);
    });

    const selectAll = dropdown.querySelector('.cfd-select-all');
    const syncSelectAll = () => {
        const boxes = Array.from(list.querySelectorAll('input[type=checkbox]'));
        const visibleBoxes = boxes.filter(b => b.closest('.cfd-item').style.display !== 'none');
        const checkedCount = visibleBoxes.filter(b => b.checked).length;
        selectAll.checked = checkedCount === visibleBoxes.length && visibleBoxes.length > 0;
        selectAll.indeterminate = checkedCount > 0 && checkedCount < visibleBoxes.length;
    };
    syncSelectAll();

    selectAll.addEventListener('change', () => {
        list.querySelectorAll('.cfd-item').forEach(item => {
            if (item.style.display === 'none') return;
            item.querySelector('input[type=checkbox]').checked = selectAll.checked;
        });
    });

    list.addEventListener('change', syncSelectAll);

    // Search box filters the checkbox list
    const search = dropdown.querySelector('.cfd-search input');
    search.addEventListener('input', () => {
        const term = search.value.trim().toLowerCase();
        list.querySelectorAll('.cfd-item').forEach(item => {
            const text = item.querySelector('span').textContent.toLowerCase();
            item.style.display = text.includes(term) ? '' : 'none';
        });
        syncSelectAll();
    });

    dropdown.querySelector('.cfd-apply').addEventListener('click', () => {
        const checked = Array.from(list.querySelectorAll('input[type=checkbox]:checked')).map(b => b.value);
        if (checked.length === allValues.length) {
            delete table.__colFilters[colIndex];
            th.classList.remove('filtered');
        } else {
            table.__colFilters[colIndex] = new Set(checked);
            th.classList.add('filtered');
        }
        applyFilters(table);
        closeAllFilterDropdowns();
    });

    dropdown.querySelector('.cfd-clear').addEventListener('click', () => {
        delete table.__colFilters[colIndex];
        th.classList.remove('filtered');
        applyFilters(table);
        closeAllFilterDropdowns();
    });

    // Prevent clicks inside the dropdown from bubbling to the header (which would sort/close)
    dropdown.addEventListener('click', (e) => e.stopPropagation());

    th.appendChild(dropdown);
    search.focus();
}

// Close open filter dropdowns when clicking elsewhere
document.addEventListener('click', (e) => {
    if (!e.target.closest('.col-filter-dropdown') && !e.target.closest('.col-filter')) {
        closeAllFilterDropdowns();
    }
});

// Initialize sorting on page load
initTableSort();

// Category charts (rendered via Chart.js, self-hosted)
const CHART_COLORS = {
    blue: getIrisChartColor('blue'),
    green: getIrisChartColor('green'),
    purple: getIrisChartColor('purple'),
    teal: getIrisChartColor('teal'),
    amber: getIrisChartColor('amber'),
    pink: getIrisChartColor('pink'),
    slate: getIrisChartColor('slate'),
    red: getIrisChartColor('red'),
    orange: getIrisChartColor('orange'),
    indigo: getIrisChartColor('indigo')
};

// External HTML tooltip handler for charts. Renders the tooltip as a DOM element
// appended to <body> so it can overflow small canvases without being clipped.
function htmlTooltipHandler(context) {
    const { chart, tooltip } = context;
    let el = document.getElementById('chartjs-html-tooltip');
    if (!el) {
        el = document.createElement('div');
        el.id = 'chartjs-html-tooltip';
        el.className = 'chartjs-html-tooltip';
        document.body.appendChild(el);
    }

    if (tooltip.opacity === 0) {
        el.style.opacity = '0';
        return;
    }

    if (tooltip.body) {
        const lines = tooltip.body.map(b => b.lines).flat();
        const colors = tooltip.labelColors || [];
        el.innerHTML = lines.map((line, i) => {
            const bg = colors[i] ? colors[i].backgroundColor : 'transparent';
            return '<div class="tt-row"><span class="tt-swatch" style="background:' + bg + '"></span><span>' + line + '</span></div>';
        }).join('');
    }

    const rect = chart.canvas.getBoundingClientRect();
    el.style.left = rect.left + tooltip.caretX + 'px';
    el.style.top = rect.top + tooltip.caretY + 'px';
    el.style.opacity = '1';
}

// Custom Chart.js plugin: draws the percentage of the total centered on each
// pie/doughnut slice. Written inline so no external plugin download is required.
const sliceLabelsPlugin = {
    id: 'sliceLabels',
    afterDatasetsDraw(chart) {
        const { ctx } = chart;
        const meta = chart.getDatasetMeta(0);
        if (!meta || !meta.data) return;

        const dataset = chart.data.datasets[0];
        const total = dataset.data.reduce((sum, v) => sum + (Number(v) || 0), 0);
        if (total <= 0) return;

        ctx.save();
        ctx.font = '700 12px system-ui, -apple-system, Segoe UI, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        meta.data.forEach((arc, i) => {
            const value = Number(dataset.data[i]) || 0;
            if (value <= 0) return;

            const pct = Math.round((value / total) * 100);
            if (pct < 5) return; // skip labels on very thin slices to avoid clutter

            const pos = arc.tooltipPosition();
            ctx.fillStyle = getIrisTokenColor('--oi-background-color-primary');
            ctx.strokeStyle = getIrisTokenColor('--oi-border-color-strong');
            ctx.lineWidth = 3;
            const text = pct + '%';
            ctx.strokeText(text, pos.x, pos.y);
            ctx.fillText(text, pos.x, pos.y);
        });

        ctx.restore();
    }
};

// Iris-style donut center metric: total value plus a compact "Total" label.
const donutCenterPlugin = {
    id: 'donutCenter',
    afterDraw(chart) {
        const dataset = chart.data.datasets[0];
        if (!dataset) return;
        const total = dataset.data.reduce((sum, value) => sum + (Number(value) || 0), 0);
        const area = chart.chartArea;
        if (!area || total <= 0) return;

        const x = (area.left + area.right) / 2;
        const y = (area.top + area.bottom) / 2;
        const ctx = chart.ctx;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = getIrisTokenColor('--oi-content-color-primary');
        ctx.font = '600 18px "IBM Plex Mono", ui-monospace, monospace';
        ctx.fillText(total.toLocaleString(), x, y - 6);
        ctx.fillStyle = getIrisTokenColor('--oi-content-color-tertiary');
        ctx.font = '10px "Inter", system-ui, sans-serif';
        ctx.fillText('Total', x, y + 12);
        ctx.restore();
    }
};

// Custom Chart.js plugin: gives vertical bars a pseudo 3-D appearance by drawing
// a shaded right face and a lighter top face behind/around each bar.
const bar3dPlugin = {
    id: 'bar3d',
    afterDatasetsDraw(chart) {
        const meta = chart.getDatasetMeta(0);
        if (!meta || !meta.data || meta.data.length === 0) return;
        const ctx = chart.ctx;
        const depth = 12;
        ctx.save();
        meta.data.forEach((bar, i) => {
            const color = chart.data.datasets[0].backgroundColor[i] || getIrisTokenColor('--oi-content-color-tertiary');
            const { x, y, base, width } = bar.getProps(['x', 'y', 'base', 'width'], true);
            const half = width / 2;
            const left = x - half;
            const right = x + half;
            const top = Math.min(y, base);
            const bottom = Math.max(y, base);

            // Right (side) face - darker shade.
            ctx.fillStyle = shadeColor(color, -0.22);
            ctx.beginPath();
            ctx.moveTo(right, top);
            ctx.lineTo(right + depth, top - depth);
            ctx.lineTo(right + depth, bottom - depth);
            ctx.lineTo(right, bottom);
            ctx.closePath();
            ctx.fill();

            // Top face - lighter shade.
            ctx.fillStyle = shadeColor(color, 0.18);
            ctx.beginPath();
            ctx.moveTo(left, top);
            ctx.lineTo(left + depth, top - depth);
            ctx.lineTo(right + depth, top - depth);
            ctx.lineTo(right, top);
            ctx.closePath();
            ctx.fill();
        });
        ctx.restore();
    }
};

// Lightens (amount > 0) or darkens (amount < 0) a hex color. amount is -1..1.
function shadeColor(hex, amount) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    let r = (num >> 16) & 0xff, g = (num >> 8) & 0xff, b = num & 0xff;
    const t = amount < 0 ? 0 : 255;
    const p = Math.abs(amount);
    r = Math.round((t - r) * p) + r;
    g = Math.round((t - g) * p) + g;
    b = Math.round((t - b) * p) + b;
    return 'rgb(' + r + ',' + g + ',' + b + ')';
}

// Tracks live Chart.js instances per canvas so they can be destroyed on toggle.
const chartInstances = new WeakMap();

// Builds (or rebuilds) a Chart on the given canvas. mode is 'original' or 'bar3d'.
function buildChart(canvas, mode) {
    let labels, values, colorNames;
    try {
        labels = JSON.parse(canvas.getAttribute('data-chart-labels') || '[]');
        values = JSON.parse(canvas.getAttribute('data-chart-values') || '[]');
        colorNames = JSON.parse(canvas.getAttribute('data-chart-colors') || '[]');
    } catch (e) {
        return;
    }
    if (!values.length) return;

    const originalType = canvas.getAttribute('data-chart-type') || 'doughnut';
    const type = mode === 'bar3d' ? 'bar' : originalType;
    const backgroundColor = colorNames.map(c => CHART_COLORS[c] || getIrisTokenColor('--oi-content-color-tertiary'));
    const surfaceColor = getIrisTokenColor('--oi-background-color-primary');
    const isCircular = type === 'doughnut' || type === 'pie';
    const isBar3d = mode === 'bar3d';
    const offset = parseInt(canvas.getAttribute('data-chart-offset') || '0', 10) || 0;
    const total = values.reduce((sum, v) => sum + v, 0);

    const existing = chartInstances.get(canvas);
    if (existing) { existing.destroy(); }

    // Mark bar mode so CSS can size the canvas like the doughnut (fixed height),
    // overriding any pie-specific compact sizing. Applies to 3-D toggle bars and
    // charts declared as bar (notoggle account-option column charts).
    canvas.classList.toggle('chart-bar3d', isBar3d || type === 'bar');

    const chart = new Chart(canvas, {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: backgroundColor,
                borderWidth: isCircular ? 1 : 0,
                borderColor: surfaceColor,
                offset: isCircular && offset > 0 ? offset : 0,
                hoverOffset: isCircular ? offset + 6 : 0,
                // Leave headroom so the 3-D top face isn't clipped at the top.
                maxBarThickness: 54,
                categoryPercentage: 0.7,
                barPercentage: 0.8
            }]
        },
        plugins: isCircular
            ? (type === 'doughnut' ? [sliceLabelsPlugin, donutCenterPlugin] : [sliceLabelsPlugin])
            : (isBar3d ? [bar3dPlugin] : []),
        options: {
            responsive: true,
            animation: {
                duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 760,
                easing: 'easeOutQuart'
            },
            // Pies keep a true 1:1 ratio; doughnuts and 3-D bars fill the fixed-height container.
            maintainAspectRatio: type === 'pie',
            cutout: type === 'doughnut' ? '70%' : undefined,
            layout: isBar3d ? { padding: { top: 16, right: 16 } } : {},
            plugins: {
                legend: {
                    display: isCircular,
                    position: type === 'pie' ? 'bottom' : 'right',
                    labels: {
                        boxWidth: 12,
                        font: { size: 11 },
                        // Long source names (e.g. Entra tenant FQDNs) can overflow the legend
                        // box and get clipped. Build labels directly from data.labels and
                        // truncate the visible text with an ellipsis; the full name remains
                        // available in the slice tooltip.
                        generateLabels: function(chart) {
                            const data = chart.data;
                            const ds = data.datasets[0] || {};
                            const MAX = 22;
                            return (data.labels || []).map((label, i) => {
                                const text = String(label);
                                const bg = Array.isArray(ds.backgroundColor) ? ds.backgroundColor[i] : ds.backgroundColor;
                                return {
                                    text: text.length > MAX ? text.slice(0, MAX - 1) + '\u2026' : text,
                                    fillStyle: bg,
                                    strokeStyle: bg,
                                    lineWidth: 0,
                                    hidden: false,
                                    index: i
                                };
                            });
                        }
                    }
                },
                tooltip: {
                    enabled: !isCircular,
                    external: isCircular ? htmlTooltipHandler : undefined,
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y !== undefined && !isCircular ? context.parsed.y : context.parsed;
                            const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                            return context.label + ': ' + value.toLocaleString() + ' (' + pct + '%)';
                        }
                    }
                }
            },
            scales: isCircular ? {} : {
                x: { ticks: { font: { size: 10 } } },
                y: { beginAtZero: true, ticks: { precision: 0 } }
            }
        }
    });

    chartInstances.set(canvas, chart);
}

function initCategoryCharts() {
    // Chart.js may not be present (e.g. file not yet deployed) - fail gracefully.
    if (typeof Chart === 'undefined') {
        return;
    }

    document.querySelectorAll('canvas.dashboard-chart').forEach(canvas => {
        // Avoid double-initialization.
        if (canvas.dataset.chartInitialized === 'true') return;
        buildChart(canvas, 'original');
        canvas.dataset.chartInitialized = 'true';
    });
}

let dashboardVisualAnimationFrame = 0;

function animateDashboardVisuals(root = document) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const countElements = Array.from(root.querySelectorAll(
        '.ad-summary-value, .ad-risk-value, .chart-ring-total, .ad-source-legend strong, .iris-kpi-row .val'
    ));
    const counts = countElements.map(element => {
        const text = element.textContent.trim();
        if (!/^\d[\d.,\s\u00a0\u202f]*$/.test(text)) return null;
        const value = Number(text.replace(/[.,\s\u00a0\u202f]/g, ''));
        if (!Number.isFinite(value)) return null;
        return { element, value: Math.round(value) };
    }).filter(Boolean);

    const formatter = new Intl.NumberFormat(document.documentElement.lang || undefined, { maximumFractionDigits: 0 });
    if (dashboardVisualAnimationFrame) cancelAnimationFrame(dashboardVisualAnimationFrame);
    if (reducedMotion) {
        counts.forEach(({ element, value }) => { element.textContent = formatter.format(value); });
        return;
    }

    counts.forEach(({ element }) => { element.textContent = formatter.format(0); });
    const startTime = performance.now();
    const duration = 760;
    function countFrame(now) {
        const progress = Math.min(1, (now - startTime) / duration);
        const eased = 1 - Math.pow(1 - progress, 4);
        counts.forEach(({ element, value }) => {
            element.textContent = formatter.format(Math.round(value * eased));
        });
        if (progress < 1) dashboardVisualAnimationFrame = requestAnimationFrame(countFrame);
        else dashboardVisualAnimationFrame = 0;
    }
    dashboardVisualAnimationFrame = requestAnimationFrame(countFrame);

    root.querySelectorAll('.ad-capacity-track > span').forEach(fill => {
        fill.style.transition = 'none';
        fill.style.transformOrigin = 'left center';
        fill.style.transform = 'scaleX(0)';
        void fill.offsetWidth;
        requestAnimationFrame(() => {
            fill.style.transition = '';
            fill.style.transform = 'scaleX(1)';
        });
    });

    root.querySelectorAll('.ad-source-card .chart-ring').forEach(ring => {
        const targets = Array.from(ring.querySelectorAll('circle')).map(circle => {
            const target = circle.getAttribute('stroke-dasharray') || '';
            const circumference = Number(target.trim().split(/[\s,]+/)[1]) || 0;
            return { circle, target, collapsed: '0 ' + circumference };
        });
        targets.forEach(({ circle, collapsed }) => { circle.style.strokeDasharray = collapsed; });
        void ring.getBoundingClientRect();
        requestAnimationFrame(() => {
            ring.classList.add('is-animated');
            targets.forEach(({ circle, target }) => { circle.style.strokeDasharray = target; });
        });
    });
}

// Toggles all charts within a category chart area between their original
// (pie/doughnut) type and pseudo 3-D column charts.
function toggleCategoryChartType(btn) {
    if (typeof Chart === 'undefined') return;
    const wrap = btn.closest('.category-charts-wrap');
    if (!wrap) return;
    const newMode = btn.dataset.mode === 'bar3d' ? 'original' : 'bar3d';
    wrap.querySelectorAll('canvas.dashboard-chart').forEach(canvas => {
        // Charts flagged notoggle are locked to their declared type (e.g. account-option
        // column charts whose series are overlapping subsets, not a share-of-whole).
        if (canvas.getAttribute('data-chart-notoggle') === 'true') return;
        buildChart(canvas, newMode);
    });
    btn.dataset.mode = newMode;
    const title = newMode === 'bar3d' ? 'Switch to donut charts' : 'Switch to 3-D column charts';
    btn.title = title;
    btn.setAttribute('aria-label', title);
}


initCategoryCharts();

// Export modal
(function initExport() {
    const overlay = document.getElementById('exportModalOverlay');
    const openBtn = document.getElementById('btnExport');
    if (!overlay || !openBtn) return;

    const closeBtn = document.getElementById('exportModalClose');
    const cancelBtn = document.getElementById('exportCancel');
    const scopeSel = document.getElementById('exportScope');
    const subDashboardField = document.getElementById('exportSubDashboardField');
    const categoryField = document.getElementById('exportCategoryField');
    const kpiField = document.getElementById('exportKpiField');
    const includeChk = document.getElementById('exportIncludeDetails');
    const includeVal = document.getElementById('exportIncludeDetailsValue');
    const form = document.getElementById('exportForm');

    function open() { overlay.hidden = false; }
    function close() { overlay.hidden = true; }

    function updateScopeFields() {
        const scope = scopeSel.value;
        if (subDashboardField) subDashboardField.hidden = scope !== 'SubDashboard';
        categoryField.hidden = scope !== 'Category';
        kpiField.hidden = scope !== 'Kpi';
    }

    openBtn.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (cancelBtn) cancelBtn.addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !overlay.hidden) close(); });

    scopeSel.addEventListener('change', updateScopeFields);
    updateScopeFields();

    if (includeChk && includeVal) {
        includeChk.addEventListener('change', () => {
            includeVal.value = includeChk.checked ? 'true' : 'false';
        });
    }

    // Native form POST returns the file as an attachment; the browser handles the
    // download and the page does not navigate. There is no JS completion event for a file
    // download, so we show an "Exporting..." overlay on submit and hide it as soon as the
    // export finishes. Completion is detected primarily via a cookie the server sets on the
    // file response (echoing a unique token we send), which fires even when the browser
    // downloads directly without a Save dialog. Window focus and a timeout are fallbacks.
    if (form) {
        const tokenField = document.getElementById('exportDownloadToken');

        function getCookie(name) {
            const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
            return match ? decodeURIComponent(match[1]) : null;
        }
        function clearCookie(name) {
            document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
        }

        form.addEventListener('submit', () => {
            window.__isExporting = true;

            const overlay = document.getElementById('loadingOverlay');
            const message = overlay ? overlay.querySelector('p') : null;
            const originalMessage = message ? message.textContent : null;

            // Unique token for this download; the server echoes it back in the
            // "exportDownload" cookie once the file response is sent.
            const token = 'exp-' + Date.now() + '-' + Math.random().toString(36).slice(2);
            if (tokenField) tokenField.value = token;
            clearCookie('exportDownload');

            if (overlay) {
                if (message) message.textContent = form.getAttribute('data-exporting-text') || 'Exporting data...';
                overlay.classList.add('active');
            }

            close();

            let done = false;
            let pollId = null;
            const finish = () => {
                if (done) return;
                done = true;
                if (pollId) clearInterval(pollId);
                window.removeEventListener('focus', finish);
                clearCookie('exportDownload');
                if (overlay) {
                    overlay.classList.remove('active');
                    if (message && originalMessage !== null) message.textContent = originalMessage;
                }
                window.__isExporting = false;
            };

            // Primary: poll for the completion cookie set on the file response.
            pollId = setInterval(() => {
                if (getCookie('exportDownload') === token) finish();
            }, 250);

            // Fallback: the browser download often returns focus to the window.
            window.addEventListener('focus', () => { setTimeout(finish, 500); }, { once: true });

            // Last-resort fallback so the overlay never gets stuck.
            setTimeout(finish, 60000);
        });
    }
})();

// Segment filter (domain/tenant multi-select).
// - Two independent dropdowns (Domains, Tenants); each is a self-contained form.
// - No minimum selection: an empty selection means "none" and hides that source.
// - "Select all" / "Clear" set every checkbox; the selection is submitted when the
//   menu closes (outside click / toggle), so multiple toggles collapse into a single
//   postback. The server persists the selection and redirects back (?cached=true).
(function initSegmentFilters() {
    const forms = Array.from(document.querySelectorAll('[data-segment-form]'));
    if (forms.length === 0) return;

    forms.forEach(form => {
        const root = form.closest('[data-segment-filter]') || form;
        const toggle = form.querySelector('[data-segment-toggle]');
        const menu = form.querySelector('[data-segment-menu]');
        const selectAll = form.querySelector('[data-segment-all]');
        const selectNone = form.querySelector('[data-segment-none]');
        const checkboxes = Array.from(form.querySelectorAll('[data-segment-checkbox]'));
        if (!toggle || !menu) return;

        let dirty = false;

        function isOpen() {
            return !menu.hasAttribute('hidden');
        }

        function openMenu() {
            menu.removeAttribute('hidden');
            toggle.setAttribute('aria-expanded', 'true');
        }

        function closeMenu() {
            if (!isOpen()) return;
            menu.setAttribute('hidden', '');
            toggle.setAttribute('aria-expanded', 'false');
            if (dirty) {
                dirty = false;
                form.submit();
            }
        }

        toggle.addEventListener('click', e => {
            e.stopPropagation();
            if (isOpen()) { closeMenu(); } else { openMenu(); }
        });

        checkboxes.forEach(cb => {
            cb.addEventListener('change', () => { dirty = true; });
        });

        if (selectAll) {
            selectAll.addEventListener('click', () => {
                checkboxes.forEach(cb => {
                    if (!cb.checked) { cb.checked = true; dirty = true; }
                });
            });
        }

        if (selectNone) {
            selectNone.addEventListener('click', () => {
                checkboxes.forEach(cb => {
                    if (cb.checked) { cb.checked = false; dirty = true; }
                });
            });
        }

        document.addEventListener('click', e => {
            if (isOpen() && !form.contains(e.target)) closeMenu();
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && isOpen()) closeMenu();
        });
    });
})();

// --- Lazy, parallel Entra group membership loading ---
// The three membership-dependent Entra Groups KPI panels (Empty Groups, No Group Owner,
// Guest-Containing Groups) render a loading state on initial page load. This module fetches
// the membership data from the page's EntraMembership handler after render, populates each
// panel's table body, updates the matching KPI tile count, and shows a single completion toast.
(function initEntraMembershipLazyLoad() {
    var config = document.getElementById('entra-membership-config');
    if (!config) return;
    // Already loaded server-side (e.g. back-navigation with cached enriched data): nothing to do.
    if (config.getAttribute('data-loaded') === 'true') return;

    // A cache rebuild takes precedence over membership loading. Because a rebuild is a form POST
    // that redirects back here with a full page reload, the live in-memory flag is lost; the
    // sessionStorage marker (set on the Rebuild Cache click) survives that reload. If a rebuild is
    // active, don't start loading at all: the rebuild republishes the whole superset (including
    // membership) and owns the final refresh and toasts.
    var rebuildActive = window.cacheRebuildInFlight === true;
    try { rebuildActive = rebuildActive || sessionStorage.getItem('cacheRebuildInFlight') === '1'; } catch (e) { }
    if (rebuildActive) {
        window.cacheRebuildInFlight = true;
        if (window.membershipBadge) window.membershipBadge.hide();
        return;
    }

    var endpoint = config.getAttribute('data-endpoint');
    var batchEndpoint = config.getAttribute('data-batch-endpoint');
    if (!endpoint && !batchEndpoint) return;
    var webUrl = (config.getAttribute('data-web-url') || '').replace(/\/+$/, '');
    // Localized strings emitted by _EntraMembershipConfig.cshtml. English literals are kept as
    // fallbacks so the loader still works if a page renders the config element without them.
    function loc(attr, fallback) {
        var v = config.getAttribute(attr);
        return (v !== null && v !== '') ? v : fallback;
    }
    var strings = {
        emptyEmptyGroups: loc('data-i18n-empty-emptygroups', 'No empty groups found'),
        emptyNoGroupOwner: loc('data-i18n-empty-nogroupowner', 'No groups without an owner found'),
        emptyGuestContaining: loc('data-i18n-empty-guestcontaining', 'No guest-containing groups found'),
        emptySingleOwner: loc('data-i18n-empty-singleowner', 'No single-owner groups found'),
        emptyLargeGroups: loc('data-i18n-empty-largegroups', 'No large groups found'),
        failedMembership: loc('data-i18n-failed-membership', 'Failed to load group membership.'),
        toastLoaded: loc('data-i18n-toast-loaded', 'Group membership loaded'),
        toastFailed: loc('data-i18n-toast-failed', 'Failed to load group membership'),
        toastLoading: loc('data-i18n-toast-loading', 'Loading group memberships. This may take a while depending on the environment. Group based KPIs may not be accurate and details will not be available until loading is complete.'),
        tipOpenWeb: loc('data-i18n-tip-openweb', 'Open in Web Interface'),
        tipConfigureWeb: loc('data-i18n-tip-configureweb', 'Configure Web Interface URL in Settings')
    };

    // Batched loading configuration (server-provided, admin-configurable).
    var totalGroups = parseInt(config.getAttribute('data-total-groups'), 10) || 0;
    var alreadyLoaded = parseInt(config.getAttribute('data-loaded-count'), 10) || 0;
    if (alreadyLoaded < 0) alreadyLoaded = 0;
    if (alreadyLoaded > totalGroups) alreadyLoaded = totalGroups;
    var remainingAtStart = Math.max(0, totalGroups - alreadyLoaded);
    var batchSize = parseInt(config.getAttribute('data-batch-size'), 10) || 40;
    if (batchSize < 1) batchSize = 1;
    var toastDelayMs = parseInt(config.getAttribute('data-toast-delay'), 10);
    if (isNaN(toastDelayMs) || toastDelayMs < 0) toastDelayMs = 500;

    // Maps the JSON payload keys to the panel/KPI section id suffix and an empty-state message.
    var kpiMap = {
        emptyGroups: { section: 'entraemptygroups', empty: strings.emptyEmptyGroups },
        noGroupOwner: { section: 'entranogroupowner', empty: strings.emptyNoGroupOwner },
        guestContaining: { section: 'entraguestcontaininggroups', empty: strings.emptyGuestContaining },
        singleOwner: { section: 'entrasingleownergroups', empty: strings.emptySingleOwner },
        largeGroups: { section: 'entralargegroups', empty: strings.emptyLargeGroups }
    };

    var linkSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function webLinkCell(dn) {
        if (!dn) return '<td></td>';
        var safeDn = escapeHtml(dn);
        if (webUrl) {
            var href = webUrl + '/redirect.ashx?dn=' + encodeURIComponent(dn);
            return '<td><a href="javascript:void(0)" onclick="openWebInterface(\'' + href.replace(/'/g, "\\'") +
                '\')" title="' + strings.tipOpenWeb + '" class="btn-manage">' + linkSvg + '</a></td>';
        }
        return '<td><span class="btn-manage disabled" title="' + strings.tipConfigureWeb + '">' + linkSvg + '</span></td>';
    }

    function renderRows(kpiKey, payload) {
        var meta = kpiMap[kpiKey];
        var body = document.querySelector('[data-membership-body="' + kpiKey + '"]');
        var table = document.querySelector('[data-membership-table="' + kpiKey + '"]');
        var spinner = document.querySelector('[data-membership-spinner="' + kpiKey + '"]');
        var container = document.querySelector('[data-lazy-membership="' + kpiKey + '"]');
        if (spinner) spinner.style.display = 'none';

        if (payload && payload.error) {
            if (container) container.innerHTML = '<p class="muted">' + escapeHtml(payload.error) + '</p>';
        } else if (body) {
            var items = (payload && payload.items) || [];
            if (items.length === 0) {
                body.innerHTML = '<tr><td colspan="4" class="empty-row">' + escapeHtml(meta.empty) + '</td></tr>';
            } else {
                body.innerHTML = items.map(function (g) {
                    return '<tr><td>' + escapeHtml(g.name) + '</td><td>' + escapeHtml(g.tenant) +
                        '</td><td class="dn-cell">' + escapeHtml(g.dn) + '</td>' + webLinkCell(g.dn) + '</tr>';
                }).join('');
            }
            if (table) table.style.display = '';
        }

        // Update the matching KPI tile count. The same KPI can appear in multiple categories
        // (e.g. both "Groups" and "Governance and Risk"), each rendering a tile with the same
        // data-section, so update every occurrence - not just the first.
        if (payload && !payload.error) {
            document.querySelectorAll('.kpi[data-section="' + meta.section + '"] .val')
                .forEach(function (el) { el.textContent = payload.totalCount; });
        }
    }

    function showFailure() {
        Object.keys(kpiMap).forEach(function (kpiKey) {
            var spinner = document.querySelector('[data-membership-spinner="' + kpiKey + '"]');
            var container = document.querySelector('[data-lazy-membership="' + kpiKey + '"]');
            if (spinner) spinner.style.display = 'none';
            if (container) container.innerHTML = '<p class="muted">' + escapeHtml(strings.failedMembership) + '</p>';
        });
    }

    // --- Server-side collection in progress (user logged in mid-collection) ---------------
    // The shared superset collector is actively loading Entra group membership. The client must
    // NOT batch-load (the server owns loading); instead poll the progress endpoint, decrement the
    // badge to reflect the server's real progress, and reload once the server finishes so the
    // freshly-published superset (with membership) renders fully.
    var serverLoading = config.getAttribute('data-server-loading') === 'true';
    var progressEndpoint = config.getAttribute('data-progress-endpoint');
    if (serverLoading && progressEndpoint) {
        if (window.membershipBadge && remainingAtStart > 0) window.membershipBadge.set(remainingAtStart);
        if (window.showToast) window.showToast(strings.toastLoading, 'info');

        var pollProgress = function () {
            // If a cache rebuild was triggered (e.g. the user clicked Rebuild Cache while
            // membership was still loading), yield: the rebuild republishes the whole superset
            // (including membership) and owns the final page refresh. Stop polling and don't
            // reload, so the two flows don't compete or double-fire toasts.
            if (window.cacheRebuildInFlight) {
                if (window.membershipBadge) window.membershipBadge.hide();
                return;
            }
            fetch(progressEndpoint, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
                .then(function (resp) {
                    if (!resp.ok) throw new Error('HTTP ' + resp.status);
                    return resp.json();
                })
                .then(function (data) {
                    if (window.cacheRebuildInFlight) {
                        if (window.membershipBadge) window.membershipBadge.hide();
                        return;
                    }
                    var remaining = (typeof data.remaining === 'number') ? data.remaining : 0;
                    if (window.membershipBadge) window.membershipBadge.set(remaining);

                    // Server finished loading: reload to render the published superset membership.
                    if (data.done || !data.serverLoading) {
                        if (window.membershipBadge) window.membershipBadge.hide();
                        if (window.showToast) window.showToast(strings.toastLoaded, 'success');
                        window.location.reload();
                        return;
                    }
                    setTimeout(pollProgress, 2000);
                })
                .catch(function (err) {
                    // Stop polling on error; leave whatever is rendered in place.
                    console.error('Entra membership progress poll failed:', err);
                });
        };
        pollProgress();
        return;
    }

    // If the (single) batch endpoint isn't available, fall back to the original one-shot load.
    if (!batchEndpoint) {
        fetch(endpoint, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then(function (resp) {
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                return resp.json();
            })
            .then(function (data) {
                if (window.cacheRebuildInFlight) {
                    if (window.membershipBadge) window.membershipBadge.hide();
                    return;
                }
                renderRows('emptyGroups', data.emptyGroups);
                renderRows('noGroupOwner', data.noGroupOwner);
                renderRows('guestContaining', data.guestContaining);
                renderRows('singleOwner', data.singleOwner);
                renderRows('largeGroups', data.largeGroups);
                if (window.showToast) window.showToast(strings.toastLoaded, 'success');
            })
            .catch(function (err) {
                showFailure();
                if (window.showToast) window.showToast(strings.toastFailed, 'error');
                console.error('Entra membership lazy load failed:', err);
            });
        return;
    }

    // --- Batched loading: request groups in windows so the header badge can decrement. ---
    // A start toast is shown only if loading is still running after the configured delay, so
    // fast loads don't flash a transient message. The header badge (window.membershipBadge) is
    // initialized to the REMAINING group count and decremented after each completed batch. When
    // membership was already partly loaded in a previous page's session, loading resumes from
    // that offset instead of restarting from the full total.
    if (window.membershipBadge && remainingAtStart > 0) window.membershipBadge.set(remainingAtStart);

    // Nothing left to load (already fully loaded in session): keep the badge hidden and stop.
    if (totalGroups === 0 || remainingAtStart === 0) {
        if (window.membershipBadge) window.membershipBadge.hide();
        return;
    }

    var startToastShown = false;
    var startToastTimer = null;
    if (window.showToast && remainingAtStart > 0) {
        startToastTimer = setTimeout(function () {
            startToastShown = true;
            window.showToast(strings.toastLoading, 'info');
        }, toastDelayMs);
    }

    function cancelStartToast() {
        if (startToastTimer) { clearTimeout(startToastTimer); startToastTimer = null; }
    }

    function batchUrl(skip, take) {
        return batchEndpoint + (batchEndpoint.indexOf('?') >= 0 ? '&' : '?') +
            'skip=' + skip + '&take=' + take;
    }

    function loadBatch(skip) {
        // A cache rebuild takes precedence: it republishes the whole superset (including
        // membership) and owns the final refresh/toast. Stop the batch chain and yield.
        if (window.cacheRebuildInFlight) {
            cancelStartToast();
            if (window.membershipBadge) window.membershipBadge.hide();
            return;
        }
        fetch(batchUrl(skip, batchSize), { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then(function (resp) {
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                return resp.json();
            })
            .then(function (data) {
                if (window.cacheRebuildInFlight) {
                    cancelStartToast();
                    if (window.membershipBadge) window.membershipBadge.hide();
                    return;
                }
                // Payloads are cumulative (recomputed from all groups loaded so far).
                renderRows('emptyGroups', data.emptyGroups);
                renderRows('noGroupOwner', data.noGroupOwner);
                renderRows('guestContaining', data.guestContaining);
                renderRows('singleOwner', data.singleOwner);
                renderRows('largeGroups', data.largeGroups);

                var total = (typeof data.totalGroups === 'number') ? data.totalGroups : totalGroups;
                var loaded = (typeof data.loadedCount === 'number') ? data.loadedCount : Math.min(total, skip + batchSize);
                var remaining = (typeof data.remaining === 'number') ? data.remaining : Math.max(0, total - loaded);
                if (window.membershipBadge) window.membershipBadge.set(remaining);

                if (data.done || remaining <= 0) {
                    cancelStartToast();
                    if (window.membershipBadge) window.membershipBadge.hide();
                    if (window.showToast) window.showToast(strings.toastLoaded, 'success');
                    return;
                }
                loadBatch(loaded);
            })
            .catch(function (err) {
                cancelStartToast();
                showFailure();
                if (window.membershipBadge) window.membershipBadge.hide();
                if (window.showToast) window.showToast(strings.toastFailed, 'error');
                console.error('Entra membership batch load failed:', err);
            });
    }

    loadBatch(alreadyLoaded);
})();

// ---------------------------------------------------------------------------
// Performance / connectivity diagnostics (Phase 3).
// On-demand probes against api/diagnostics. Results are live and never cached.
// ---------------------------------------------------------------------------
(function () {
    const panel = document.getElementById('panel-performancetests');
    if (!panel) return;

    const dashboard = panel.getAttribute('data-perf-dashboard') || 'ActiveRoles';
    const runBtn = document.getElementById('perf-run');
    const runLabel = document.getElementById('perf-run-label');
    const spinner = document.getElementById('perf-spinner');
    const statusEl = document.getElementById('perf-status');
    const targetList = document.getElementById('perf-target-list');
    const targetAll = document.getElementById('perf-target-all');
    const resultsTable = document.getElementById('perf-results');
    const resultsBody = document.getElementById('perf-results-body');
    const emptyMsg = document.getElementById('perf-empty');
    const chartWrap = document.getElementById('perf-chart-wrap');
    const chartCanvas = document.getElementById('perf-chart');
    const runText = panel.getAttribute('data-perf-run') || 'Run tests';
    const runningText = panel.getAttribute('data-perf-running') || 'Running tests\u2026';
    const latencyAxisText = panel.getAttribute('data-perf-chart-latency') || 'Latency';
    let perfChart = null;

    // Which test types are checked (client-side filter over the applicable set).
    function selectedTestTypes() {
        return [...document.querySelectorAll('.perf-testtype-cb:checked')].map(cb => cb.value);
    }

    function statusClass(status) {
        switch (status) {
            case 'Ok': return 'perf-ok';
            case 'Warn': return 'perf-warn';
            case 'Fail': return 'perf-fail';
            default: return 'perf-skipped';
        }
    }

    // Load discoverable targets so the user can pick server types / individual targets.
    function loadTargets() {
        fetch('/api/diagnostics/targets?dashboard=' + encodeURIComponent(dashboard), { credentials: 'same-origin' })
            .then(r => r.json())
            .then(data => {
                if (!Array.isArray(data)) { targetList.textContent = (data && data.error) || ''; return; }
                targetList.innerHTML = '';
                data.forEach(t => {
                    const label = document.createElement('label');
                    label.className = 'perf-target-item';
                    const cb = document.createElement('input');
                    cb.type = 'checkbox';
                    cb.className = 'perf-target-cb';
                    cb.checked = true;
                    cb.value = t.id;
                    cb.setAttribute('data-servertype', t.serverType);
                    label.appendChild(cb);
                    label.appendChild(document.createTextNode(' ' + t.name + ' (' + t.serverType + ')'));
                    targetList.appendChild(label);
                });
                syncTargetAll();
            })
            .catch(() => { /* leave the list empty; run still works with filters */ });
    }

    function selectedTargetIds() {
        return [...targetList.querySelectorAll('.perf-target-cb:checked')].map(cb => cb.value);
    }

    // Keep the "All" targets toggle in sync with the individual checkboxes.
    function syncTargetAll() {
        if (!targetAll) return;
        const all = [...targetList.querySelectorAll('.perf-target-cb')];
        const checked = all.filter(cb => cb.checked);
        targetAll.checked = all.length > 0 && checked.length === all.length;
        targetAll.indeterminate = checked.length > 0 && checked.length < all.length;
        updateSummaries();
    }

    // Summarise the dropdown selections (e.g. "All", "3 selected") like the domain/tenant widgets.
    function summariseChecks(checkboxes) {
        const all = [...checkboxes];
        const checked = all.filter(cb => cb.checked);
        if (all.length === 0) return '';
        if (checked.length === all.length) return 'All';
        if (checked.length === 0) return 'None';
        return checked.length + ' selected';
    }

    function updateSummaries() {
        const ttSummary = document.getElementById('perf-testtypes-summary');
        if (ttSummary) ttSummary.textContent = summariseChecks(document.querySelectorAll('.perf-testtype-cb'));
        const tgtSummary = document.getElementById('perf-targets-summary');
        if (tgtSummary) tgtSummary.textContent = summariseChecks(targetList.querySelectorAll('.perf-target-cb'));
    }

    function renderResults(result) {
        resultsBody.innerHTML = '';
        const wanted = selectedTestTypes();
        let probes = (result && result.probes) || [];
        // Client-side filter: only show the test types the user selected.
        if (wanted.length > 0) {
            probes = probes.filter(p => wanted.indexOf(p.testType) !== -1);
        }
        if (probes.length === 0) {
            resultsTable.classList.add('hidden');
            emptyMsg.classList.remove('hidden');
            renderChart([]);
            return;
        }
        emptyMsg.classList.add('hidden');
        resultsTable.classList.remove('hidden');
        let ok = 0, warn = 0, fail = 0;
        probes.forEach(p => {
            if (p.status === 'Ok') ok++; else if (p.status === 'Warn') warn++; else if (p.status === 'Fail') fail++;
            const tr = document.createElement('tr');
            const latency = (p.latencyMs === null || p.latencyMs === undefined) ? '' : (p.latencyMs + ' ms');
            tr.innerHTML =
                '<td>' + escapeHtml(p.targetName) + '</td>' +
                '<td>' + escapeHtml(p.serverType) + '</td>' +
                '<td>' + escapeHtml(p.testType) + '</td>' +
                '<td><span class="perf-badge ' + statusClass(p.status) + '">' + escapeHtml(p.status) + '</span></td>' +
                '<td>' + escapeHtml(latency) + '</td>' +
                '<td>' + escapeHtml(p.message || '') + '</td>';
            resultsBody.appendChild(tr);
        });
        if (statusEl) {
            statusEl.textContent = 'OK ' + ok + ' / Warn ' + warn + ' / Fail ' + fail;
        }
        renderChart(probes);
    }

    // Clustered ("grouped") column chart of latency: targets on the x-axis, one
    // dataset (column series) per test type. Chart.js is 2-D only, so this is a
    // clustered column chart rather than a true 3-D chart.
    function renderChart(probes) {
        if (!chartCanvas || typeof Chart === 'undefined') { return; }
        const withLatency = probes.filter(p => typeof p.latencyMs === 'number');
        if (withLatency.length === 0) {
            if (perfChart) { perfChart.destroy(); perfChart = null; }
            chartWrap.classList.add('hidden');
            return;
        }
        const targets = [];
        const tests = [];
        withLatency.forEach(p => {
            if (targets.indexOf(p.targetName) === -1) targets.push(p.targetName);
            if (tests.indexOf(p.testType) === -1) tests.push(p.testType);
        });
        const colors = ['blue', 'green', 'amber', 'red', 'purple', 'teal', 'pink', 'slate'].map(getIrisChartColor);
        // Group by TEST TYPE on the x-axis with one column series per target/server, so
        // latency is compared like-for-like across servers (a Ping is only comparable to
        // another Ping). A logarithmic y-axis keeps fast probes readable next to slow ones.
        // Log scales cannot plot 0, so sub-1ms values are floored to 0.5 for display while
        // the tooltip reports the true measured latency.
        const datasets = targets.map((tName, idx) => {
            const actuals = tests.map(test => {
                const found = withLatency.find(p => p.targetName === tName && p.testType === test);
                return found ? found.latencyMs : null;
            });
            return {
                label: tName,
                // Numeric data with nulls for missing (target,test) pairs. Log scales cannot
                // plot 0, so floor sub-1ms values to 0.5 for display; actualLatency keeps the
                // real value for the tooltip.
                data: actuals.map(v => v === null ? null : Math.max(v, 0.5)),
                actualLatency: actuals,
                backgroundColor: colors[idx % colors.length],
                borderColor: getIrisTokenColor('--oi-content-color-primary'),
                borderWidth: 1,
                borderSkipped: false
            };
        });
        chartWrap.classList.remove('hidden');
        if (perfChart) { perfChart.destroy(); }
        perfChart = new Chart(chartCanvas, {
            type: 'bar',
            data: { labels: tests, datasets: datasets },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
                    tooltip: {
                        callbacks: {
                            label: function (ctx) {
                                const actual = ctx.dataset.actualLatency ? ctx.dataset.actualLatency[ctx.dataIndex] : ctx.parsed.y;
                                return ctx.dataset.label + ': ' + actual + ' ms';
                            }
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                    y: {
                        type: 'logarithmic',
                        title: { display: true, text: latencyAxisText + ' (ms, log scale)' },
                        ticks: { callback: function (v) { return Number(v.toString()); } }
                    }
                }
            }
        });
    }

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function setRunning(isRunning) {
        runBtn.disabled = isRunning;
        if (spinner) spinner.classList.toggle('hidden', !isRunning);
        if (runLabel) runLabel.textContent = isRunning ? runningText : runText;
    }

    function run(targetIds) {
        const body = {
            dashboard: dashboard,
            serverType: null,
            testType: null,
            targetIds: targetIds || []
        };
        setRunning(true);
        if (statusEl) statusEl.textContent = '';
        fetch('/api/diagnostics/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(body)
        })
            .then(r => r.json())
            .then(result => {
                if (result && result.error) {
                    if (statusEl) statusEl.textContent = result.error;
                    resultsTable.classList.add('hidden');
                    emptyMsg.classList.remove('hidden');
                    return;
                }
                renderResults(result);
            })
            .catch(err => {
                if (statusEl) statusEl.textContent = 'Error: ' + err.message;
            })
            .finally(() => {
                setRunning(false);
            });
    }

    // "All" targets toggle drives every individual checkbox.
    if (targetAll) {
        targetAll.addEventListener('change', () => {
            targetList.querySelectorAll('.perf-target-cb').forEach(cb => { cb.checked = targetAll.checked; });
            targetAll.indeterminate = false;
        });
    }
    targetList.addEventListener('change', syncTargetAll);

    // Dropdown open/close behaviour matching the domains/tenants multi-select widgets.
    document.querySelectorAll('#panel-performancetests .perf-multi').forEach(multi => {
        const toggle = multi.querySelector('.perf-multi-toggle');
        if (!toggle) return;
        toggle.addEventListener('click', e => {
            e.stopPropagation();
            const isOpen = multi.classList.toggle('snap-multi-open');
            document.querySelectorAll('#panel-performancetests .perf-multi.snap-multi-open').forEach(m => {
                if (m !== multi) m.classList.remove('snap-multi-open');
            });
            // Keep panel open state consistent even if toggle returned false above.
            multi.classList.toggle('snap-multi-open', isOpen);
        });
    });
    document.addEventListener('click', e => {
        if (!e.target.closest('#panel-performancetests .perf-multi')) {
            document.querySelectorAll('#panel-performancetests .perf-multi.snap-multi-open')
                .forEach(m => m.classList.remove('snap-multi-open'));
        }
    });
    // Update the test-type summary as selections change.
    document.querySelectorAll('.perf-testtype-cb').forEach(cb => cb.addEventListener('change', updateSummaries));
    updateSummaries();

    // Single Run button: probe the checked targets when any are selected, otherwise run
    // the full (filter-scoped) set. Test-type selection is applied client-side.
    runBtn.addEventListener('click', () => run(selectedTargetIds()));

    loadTargets();
})();

