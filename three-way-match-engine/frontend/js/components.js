import { getStatusClass, getStatusLabel, formatCurrency } from './utils.js';

export function renderSidebar(activePage) {
  return `
    <div class="sidebar">
      <div class="sidebar-header">TWME</div>
      <ul class="sidebar-nav">
        <li>
          <a href="dashboard.html" class="sidebar-item ${activePage === 'dashboard' ? 'active' : ''}">
            <span>Dashboard</span>
          </a>
        </li>
        <li>
          <a href="sku-master.html" class="sidebar-item ${activePage === 'sku-master' ? 'active' : ''}">
            <span>SKU Master</span>
          </a>
        </li>
      </ul>
      <div class="sidebar-footer">
        <a href="#" id="logout-btn" class="sidebar-item" onclick="import('./auth.js').then(m => m.logout()); return false;">
          <span>Logout</span>
        </a>
      </div>
    </div>
  `;
}

export function renderTopHeader(title, options = {}) {
  return `
    <header class="top-header">
      <h1>${title}</h1>
      <div class="header-actions">
        ${options.search ? `<input type="search" placeholder="${options.searchPlaceholder || 'Search...'}" id="${options.searchId || 'search-input'}">` : ''}
        ${options.actionBtn ? `<button class="btn btn-primary" id="${options.actionBtnId}">${options.actionBtnText}</button>` : ''}
      </div>
    </header>
  `;
}

export function renderStatusBadge(status) {
  if (!status) return '';
  return `<span class="status-badge ${getStatusClass(status)}">${getStatusLabel(status)}</span>`;
}

export function renderMismatchBanner(reasons) {
  if (!reasons || reasons.length === 0) return '';
  return reasons.map(r => {
    const bannerClass = r.severity === 'hard' ? 'mismatch-banner' : 'warning-banner';
    return `<div class="${bannerClass}">
      <strong>${r.severity === 'hard' ? 'Mismatch:' : 'Warning:'}</strong> ${r.message}
    </div>`;
  }).join('');
}

export function renderDocumentPreview(fileUrl, mimeType) {
  if (mimeType === 'application/pdf') {
    return `<iframe src="${fileUrl}" style="width: 100%; height: 100%; border: none;"></iframe>`;
  } else if (mimeType && mimeType.startsWith('image/')) {
    return `<img src="${fileUrl}" style="max-width: 100%; height: auto; object-fit: contain;">`;
  } else {
    return `<div class="empty-state">No preview available</div>`;
  }
}

export function renderItemGrid(items, matchData = null) {
  if (!items || items.length === 0) return renderEmptyState('No items found');
  
  let html = `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>SKU Name</th>
            <th>Mapped SKU</th>
            <th>ERP Code</th>
            <th>EAN</th>
            <th>HSN</th>
            <th>UOM</th>
            <th>PO Qty</th>
            <th>Received</th>
            <th>Invoiced</th>
            <th>Unit Price</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  items.forEach(item => {
    const isUnmapped = !item.skuMasterId;
    let nameHtml = item.skuName || '-';
    if (isUnmapped) {
      nameHtml += ` <span class="status-badge status-partial">⚠ Unmapped</span>`;
    }
    
    html += `
      <tr>
        <td class="${isUnmapped ? 'cell-warning' : ''}">${nameHtml}</td>
        <td>${item.skuMaster?.skuName || '-'}</td>
        <td>${item.skuMaster?.erpCode || '-'}</td>
        <td>${item.skuMaster?.ean || '-'}</td>
        <td>${item.skuMaster?.hsn || '-'}</td>
        <td>${item.uom || item.skuMaster?.uom || '-'}</td>
        <td>${item.poQty ?? '-'}</td>
        <td>${item.receivedQty ?? '-'}</td>
        <td>${item.invoicedQty ?? '-'}</td>
        <td>${formatCurrency(item.unitPrice)}</td>
        <td>${formatCurrency(item.grossAmount)}</td>
      </tr>
    `;
  });
  
  html += `</tbody></table></div>`;
  return html;
}

export function renderStatCard(label, value, colorClass = '') {
  return `
    <div class="stat-card">
      <div class="stat-card-label">${label}</div>
      <div class="stat-card-value ${colorClass}">${value}</div>
    </div>
  `;
}

export function renderEmptyState(message, icon = '📭') {
  return `
    <div class="empty-state">
      <div class="icon">${icon}</div>
      <p>${message}</p>
    </div>
  `;
}

export function renderLoadingState(message = 'Loading...') {
  return `
    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 40px;">
      <div class="spinner"></div>
      <div style="margin-top: 16px; color: var(--text-muted);">${message}</div>
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

export function renderUploadModal() {
  return `
    <div class="modal-overlay" id="upload-overlay">
      <div class="modal">
        <div class="modal-header">
          <h2>Upload Document</h2>
          <button class="close-btn" id="close-upload-btn">&times;</button>
        </div>
        <div class="modal-body">
          <form id="upload-form">
            <div class="form-group">
              <label class="form-label">Document Type</label>
              <select class="form-input" id="upload-type" required>
                <option value="purchase_order">Purchase Order</option>
                <option value="grn">GRN (Delivery)</option>
                <option value="invoice">Invoice (Fulfillment)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">File (.pdf, .png, .jpg)</label>
              <input type="file" class="form-input" id="upload-file" accept=".pdf,.png,.jpg,.jpeg,.webp" required>
            </div>
          </form>
          <div id="upload-progress-container" class="upload-progress" style="display:none;"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="cancel-upload-btn">Cancel</button>
          <button class="btn btn-primary" id="submit-upload-btn" form="upload-form">Upload</button>
        </div>
      </div>
    </div>
  `;
}

export function renderUploadProgress(currentStepIndex) {
  const steps = [
    'Uploading',
    'Parsing document',
    'Validating data',
    'Resolving SKU',
    'Checking duplicates',
    'Calculating match',
    'Complete'
  ];
  
  let html = '';
  steps.forEach((step, index) => {
    let statusClass = '';
    if (index < currentStepIndex) statusClass = 'done';
    else if (index === currentStepIndex) statusClass = 'active';
    
    html += `<div class="progress-step ${statusClass}">${step}</div>`;
  });
  return html;
}
