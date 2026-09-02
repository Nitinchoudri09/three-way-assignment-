import { getStatusClass, getStatusLabel, formatCurrency } from './utils.js';

/* ============================================================
   ICON SIDEBAR
   ============================================================ */
export function renderSidebar(activePage) {
  const items = [
    {
      id: 'dashboard',
      href: '/dashboard.html',
      label: 'Dashboard',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    },
    {
      id: 'purchase-order',
      href: '/dashboard.html',
      label: 'Purchase Orders',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    },
    {
      id: 'fulfillment',
      href: '/dashboard.html',
      label: 'Fulfillment / Invoice',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
    },
    {
      id: 'delivery',
      href: '/dashboard.html',
      label: 'Delivery / GRN',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>`,
    },
    {
      id: 'sku-master',
      href: '/sku-master.html',
      label: 'SKU Master',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
    },
  ];

  const navItems = items.map(item => `
    <a href="${item.href}" class="sidebar-item${activePage === item.id ? ' active' : ''}" title="${item.label}">
      ${item.icon}
      <span class="sidebar-tooltip">${item.label}</span>
    </a>
  `).join('');

  return `
    <div class="sidebar">
      <div class="sidebar-logo">
        <div class="sidebar-logo-mark">3W</div>
      </div>
      <nav class="sidebar-nav">
        ${navItems}
      </nav>
      <div class="sidebar-divider"></div>
      <div class="sidebar-footer">
        <button class="sidebar-item" id="logout-btn" title="Logout">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span class="sidebar-tooltip">Logout</span>
        </button>
      </div>
    </div>
  `;
}

export function initSidebar() {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      import('./auth.js').then(m => m.logout());
    });
  }

  // Set user info in header if present
  const userEl = document.getElementById('header-user');
  if (userEl) {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const name = user.username || user.name || 'Admin';
      const initial = name.charAt(0).toUpperCase();
      userEl.querySelector('.header-user-avatar').textContent = initial;
      userEl.querySelector('.header-user-name').textContent = name;
    } catch (_) {}
  }
}

/* ============================================================
   STATUS BADGE
   ============================================================ */
export function renderStatusBadge(status) {
  if (!status) return '';
  const classMap = {
    matched:               'badge badge-matched',
    partially_matched:     'badge badge-partial',
    mismatch:              'badge badge-mismatch',
    insufficient_documents:'badge badge-insufficient',
    insufficient_docs:     'badge badge-insufficient',
  };
  const iconMap = {
    matched:               '✓',
    partially_matched:     '◑',
    mismatch:              '⚠',
    insufficient_documents:'○',
    insufficient_docs:     '○',
  };
  const cls  = classMap[status]  || 'badge badge-insufficient';
  const icon = iconMap[status]   || '○';
  const label = getStatusLabel(status);
  return `<span class="${cls}">${icon} ${label}</span>`;
}

/* ============================================================
   MISMATCH BANNERS
   ============================================================ */
export function renderMismatchBanner(reasons) {
  if (!reasons || reasons.length === 0) return '';

  return reasons.map(r => {
    const isHard = r.severity === 'hard';
    const bannerClass = isHard ? 'banner banner-error' : 'banner banner-warning';
    const icon = isHard ? '⚠' : '⚑';
    const title = deriveBannerTitle(r.message);

    return `
      <div class="${bannerClass}">
        <span class="banner-icon">${icon}</span>
        <div class="banner-body">
          <div class="banner-title">${title}</div>
          <div class="banner-desc">${r.message}</div>
        </div>
      </div>
    `;
  }).join('');
}

function deriveBannerTitle(msg = '') {
  const m = msg.toLowerCase();
  if (m.includes('price'))     return 'Price Mismatch';
  if (m.includes('mrp'))       return 'MRP Mismatch';
  if (m.includes('quantity') || m.includes('qty')) return 'Quantity Mismatch';
  if (m.includes('duplicate')) return 'Duplicate Document';
  if (m.includes('unmapped') || m.includes('sku')) return 'Unmapped SKU';
  if (m.includes('missing'))   return 'Missing PO Item';
  if (m.includes('mismatch'))  return 'Mismatch Detected';
  return 'Reconciliation Warning';
}

/* ============================================================
   DOCUMENT PREVIEW
   ============================================================ */
export function renderDocumentPreview(fileUrl, mimeType, docTitle = 'Original Document') {
  let previewContent;

  if (mimeType === 'application/pdf') {
    previewContent = `<iframe src="${fileUrl}" style="width:100%;height:100%;border:none;"></iframe>`;
  } else if (mimeType && mimeType.startsWith('image/')) {
    previewContent = `<img src="${fileUrl}" style="max-width:100%;height:auto;display:block;" alt="Document preview">`;
  } else {
    previewContent = `
      <div class="preview-unavailable">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <span>Document preview unavailable</span>
        <a href="${fileUrl}" target="_blank" class="btn btn-sm btn-secondary" style="margin-top:4px;">Open Document</a>
      </div>
    `;
  }

  return `
    <div class="doc-preview-col">
      <div class="preview-header">
        <span class="preview-title">${docTitle}</span>
        <div class="preview-controls">
          <button class="preview-zoom-btn" id="zoom-out" title="Zoom out">−</button>
          <span class="preview-zoom-pct" id="zoom-pct">100%</span>
          <button class="preview-zoom-btn" id="zoom-in" title="Zoom in">+</button>
          <a href="${fileUrl}" target="_blank" class="btn btn-xs btn-secondary" style="margin-left:4px;">↗ Open</a>
        </div>
      </div>
      <div class="doc-preview-frame" id="doc-preview-frame">
        ${previewContent}
      </div>
    </div>
  `;
}

export function initZoomControls() {
  let zoom = 100;
  const pctEl = document.getElementById('zoom-pct');
  const frameEl = document.getElementById('doc-preview-frame');
  if (!pctEl || !frameEl) return;

  const img = frameEl.querySelector('img');
  const iframe = frameEl.querySelector('iframe');

  document.getElementById('zoom-in')?.addEventListener('click', () => {
    zoom = Math.min(zoom + 20, 200);
    pctEl.textContent = zoom + '%';
    if (img) img.style.transform = `scale(${zoom / 100})`;
    if (iframe) iframe.style.transform = `scale(${zoom / 100})`;
  });

  document.getElementById('zoom-out')?.addEventListener('click', () => {
    zoom = Math.max(zoom - 20, 40);
    pctEl.textContent = zoom + '%';
    if (img) img.style.transform = `scale(${zoom / 100})`;
    if (iframe) iframe.style.transform = `scale(${zoom / 100})`;
  });
}

/* ============================================================
   DOCUMENT INFO SECTION PANEL
   ============================================================ */
export function renderDocInfoPanel(title, fields, accentColor = null) {
  const accentStyle = accentColor ? `background:${accentColor}` : '';
  const rows = fields.map(([label, value]) => `
    <div class="field-row">
      <span class="field-label">${label}</span>
      <span class="field-value">${value || '—'}</span>
    </div>
  `).join('');

  return `
    <div class="section-panel">
      <div class="section-panel-header">
        <span class="section-accent" style="${accentStyle}"></span>
        <span class="section-panel-title">${title}</span>
      </div>
      <div class="section-panel-body">
        ${rows}
      </div>
    </div>
  `;
}

/* ============================================================
   ITEM GRID (dense enterprise table)
   ============================================================ */
export function renderItemGrid(items, matchData = null, docType = 'po') {
  if (!items || items.length === 0) {
    return `<div class="empty-state"><div class="icon">📋</div><p>No items found</p></div>`;
  }

  // Determine which mismatch flags exist per SKU (from matchData)
  const mismatchMap = buildMismatchMap(matchData);

  const rows = items.map(item => {
    const sku = item.skuMaster || {};
    const erpCode = sku.erpCode || item.erpCode || '-';
    const isUnmapped = !item.skuMasterId;

    const skuNameCell = renderSkuNameCell(item, isUnmapped);
    const skuIdCell  = isUnmapped
      ? `<td class="cell-warning"><span class="unmapped-badge">⚠ Unmapped</span></td>`
      : `<td>${sku.erpCode || '-'}</td>`;

    const flags = mismatchMap[erpCode] || mismatchMap[item.skuName] || {};

    const unitPriceCell = flags.price
      ? `<td class="cell-mismatch" data-tooltip="${flags.price}">${formatCurrency(item.unitPrice)}<span class="mismatch-hint">⚠ see tooltip</span></td>`
      : `<td>${formatCurrency(item.unitPrice)}</td>`;

    const mrpCell = flags.mrp
      ? `<td class="cell-mismatch" data-tooltip="${flags.mrp}">${formatCurrency(item.unitMrp ?? sku.mrp)}<span class="mismatch-hint">⚠ see tooltip</span></td>`
      : `<td>${formatCurrency(item.unitMrp ?? sku.mrp)}</td>`;

    const receivedQtyCell = flags.qty
      ? `<td class="cell-warning" data-tooltip="${flags.qty}">${item.receivedQty ?? '-'}</td>`
      : `<td>${item.receivedQty ?? '-'}</td>`;

    return `
      <tr>
        ${skuNameCell}
        ${skuIdCell}
        <td>${sku.skuName || '-'}</td>
        <td>${erpCode}</td>
        <td>${sku.ean || item.ean || '-'}</td>
        <td>${sku.hsn || item.hsn || '-'}</td>
        <td>${item.uom || sku.uom || '-'}</td>
        <td>${item.poQty ?? '-'}</td>
        ${receivedQtyCell}
        <td>${item.invoicedQty ?? '-'}</td>
        ${unitPriceCell}
        ${mrpCell}
        <td>${formatCurrency(item.grossAmount)}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="table-responsive">
      <table class="data-table item-grid-table">
        <thead>
          <tr>
            <th>SKU Name</th>
            <th>SKU ID</th>
            <th>Mapped SKU Name</th>
            <th>ERP Code</th>
            <th>EAN</th>
            <th>HSN</th>
            <th>UOM</th>
            <th>PO Qty</th>
            <th>Received Qty</th>
            <th>Invoiced Qty</th>
            <th>Unit Price</th>
            <th>Unit MRP</th>
            <th>Gross Amount</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderSkuNameCell(item, isUnmapped) {
  let content = item.skuName || '-';
  if (isUnmapped) {
    content += ` <span class="unmapped-badge">⚠ Unmapped</span>`;
    return `<td class="cell-warning">${content}</td>`;
  }
  return `<td>${content}</td>`;
}

function buildMismatchMap(matchData) {
  const map = {};
  if (!matchData || !matchData.reasons) return map;
  matchData.reasons.forEach(r => {
    const msg = r.message || '';
    const mLower = msg.toLowerCase();

    // Try to extract SKU/ERP reference from message
    const skuMatch = msg.match(/SKU[:\s]+([A-Z0-9-]+)/i) || msg.match(/([A-Z]{2,}-[0-9]+[A-Z]*)/);
    const key = skuMatch ? skuMatch[1] : '__global__';

    if (!map[key]) map[key] = {};

    if (mLower.includes('price') && !mLower.includes('mrp')) {
      map[key].price = msg;
    } else if (mLower.includes('mrp')) {
      map[key].mrp = msg;
    } else if (mLower.includes('qty') || mLower.includes('quantity')) {
      map[key].qty = msg;
    }
  });
  return map;
}

/* ============================================================
   STAT CARD
   ============================================================ */
export function renderStatCard(label, value, accentClass = '') {
  return `
    <div class="stat-card ${accentClass}">
      <div class="stat-card-label">${label}</div>
      <div class="stat-card-value">${value}</div>
    </div>
  `;
}

/* ============================================================
   EMPTY / LOADING / ERROR STATES
   ============================================================ */
export function renderEmptyState(message = 'No data found', icon = '📭') {
  return `
    <div class="empty-state">
      <div class="icon">${icon}</div>
      <p>${message}</p>
    </div>
  `;
}

export function renderLoadingState(message = 'Loading...') {
  return `
    <div class="loading-state">
      <div class="spinner"></div>
      <span>${message}</span>
    </div>
  `;
}

export function renderErrorState(message) {
  return `
    <div class="error-state">
      <strong>Error:</strong> ${message}
    </div>
  `;
}

/* ============================================================
   UPLOAD MODAL
   ============================================================ */
export function renderUploadModal() {
  return `
    <div class="modal-overlay" id="upload-overlay" style="display:none;">
      <div class="modal" style="width:420px;">
        <div class="modal-header">
          <span class="modal-title">Upload Document</span>
          <button class="modal-close" id="close-upload-btn">×</button>
        </div>
        <div class="modal-body">
          <form id="upload-form">
            <div class="form-group">
              <label class="form-label">Document Type</label>
              <select class="form-input" id="upload-type" required>
                <option value="purchase_order">Purchase Order</option>
                <option value="invoice">Invoice (Fulfillment)</option>
                <option value="grn">GRN (Delivery)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">File <span style="font-weight:400;text-transform:none;letter-spacing:0;">(PDF, PNG, JPG — max 10MB)</span></label>
              <input type="file" class="form-input" id="upload-file" accept=".pdf,.png,.jpg,.jpeg,.webp" required>
              <div id="file-chosen" class="file-chosen" style="display:none;"></div>
            </div>
          </form>

          <div id="upload-progress-container" style="display:none;">
            <div class="upload-steps" id="upload-steps"></div>
          </div>

          <div id="upload-result" style="display:none; margin-top:12px;"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="cancel-upload-btn">Cancel</button>
          <button type="submit" form="upload-form" class="btn btn-primary" id="submit-upload-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Upload
          </button>
        </div>
      </div>
    </div>
  `;
}

export function renderUploadProgress(currentStepIndex) {
  const steps = [
    { label: 'Uploading file', icon: '↑' },
    { label: 'Parsing document', icon: '⚙' },
    { label: 'Validating data', icon: '✓' },
    { label: 'Resolving SKU', icon: '⊕' },
    { label: 'Checking duplicates', icon: '⊗' },
    { label: 'Calculating match', icon: '≡' },
    { label: 'Complete', icon: '★' },
  ];

  return steps.map((step, index) => {
    let cls = '';
    let dotContent = '';
    if (index < currentStepIndex) {
      cls = 'step-done';
      dotContent = '✓';
    } else if (index === currentStepIndex) {
      cls = 'step-active';
      dotContent = `<span class="step-spinner"></span>`;
    }
    return `
      <div class="upload-step ${cls}">
        <div class="step-dot">${cls === 'step-done' ? '✓' : (cls === 'step-active' ? '' : step.icon)}</div>
        ${step.label}
        ${cls === 'step-active' ? `<span style="margin-left:auto;"><span class="step-spinner"></span></span>` : ''}
      </div>
    `;
  }).join('');
}
