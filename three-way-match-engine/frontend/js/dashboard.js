import { checkAuth } from './auth.js';
import { documentsAPI, matchAPI } from './api.js';
import {
  renderSidebar, initSidebar,
  renderStatusBadge, renderStatCard,
  renderEmptyState, renderLoadingState,
  renderUploadModal, renderUploadProgress
} from './components.js';
import { formatDate, formatCurrency, debounce, showToast } from './utils.js';
import { openUploadModal } from './upload.js';

checkAuth();

document.getElementById('sidebar-container').innerHTML = renderSidebar('dashboard');
initSidebar();

document.getElementById('upload-modal-container').innerHTML = renderUploadModal();
document.getElementById('upload-btn').addEventListener('click', openUploadModal);

const searchInput = document.getElementById('po-search');
searchInput.addEventListener('input', debounce((e) => {
  loadPurchaseOrders(e.target.value);
}, 300));

async function loadDashboard() {
  await Promise.all([loadStatistics(), loadPurchaseOrders()]);
}

async function loadStatistics() {
  const container = document.getElementById('stat-cards');
  try {
    const pos = await documentsAPI.list('purchase_order');
    let total = pos.length;
    let matched = 0, partial = 0, mismatch = 0, insufficient = 0;

    for (const po of pos) {
      if (!po.poNumber) { insufficient++; continue; }
      const match = await matchAPI.getMatch(po.poNumber).catch(() => null);
      if (!match) { insufficient++; continue; }
      if (match.status === 'matched')                matched++;
      else if (match.status === 'partially_matched') partial++;
      else if (match.status === 'mismatch')          mismatch++;
      else                                           insufficient++;
    }

    container.innerHTML = `
      ${renderStatCard('Total POs', total)}
      ${renderStatCard('Matched', matched, 'accent-matched')}
      ${renderStatCard('Partially Matched', partial, 'accent-partial')}
      ${renderStatCard('Mismatch', mismatch, 'accent-mismatch')}
      ${renderStatCard('Insufficient Docs', insufficient, 'accent-insufficient')}
    `;
  } catch (err) {
    container.innerHTML = `<div class="error-state">Failed to load statistics</div>`;
  }
}

async function loadPurchaseOrders(search = '') {
  const container = document.getElementById('po-table-container');
  container.innerHTML = renderLoadingState();

  try {
    let pos = await documentsAPI.list('purchase_order');
    if (search) {
      pos = pos.filter(p => p.poNumber && p.poNumber.toLowerCase().includes(search.toLowerCase()));
    }

    if (pos.length === 0) {
      container.innerHTML = renderEmptyState('No purchase orders found. Upload a PO to get started.', '📄');
      return;
    }

    // Pre-fetch match + document counts concurrently
    const [matches, allDocs] = await Promise.all([
      Promise.all(pos.map(po => po.poNumber ? matchAPI.getMatch(po.poNumber).catch(() => null) : Promise.resolve(null))),
      documentsAPI.list(null).catch(() => [])
    ]);

    // Build count maps
    const invCount = {};
    const grnCount = {};
    allDocs.forEach(d => {
      const pn = d.poNumber;
      if (!pn) return;
      if (d.documentType === 'invoice') invCount[pn] = (invCount[pn] || 0) + 1;
      if (d.documentType === 'grn')     grnCount[pn] = (grnCount[pn] || 0) + 1;
    });

    let html = `
      <table class="data-table" style="min-width:680px;">
        <thead>
          <tr>
            <th>PO Number</th>
            <th>Vendor</th>
            <th>PO Date</th>
            <th>GRNs</th>
            <th>Invoices</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
    `;

    pos.forEach((po, i) => {
      const match  = matches[i];
      const status = match ? match.status : 'insufficient_documents';
      const grns   = grnCount[po.poNumber] || 0;
      const invs   = invCount[po.poNumber] || 0;
      const href   = `/purchase-order.html?poNumber=${encodeURIComponent(po.poNumber)}`;

      html += `
        <tr class="clickable" onclick="window.location.href='${href}'">
          <td><strong>${po.poNumber || '—'}</strong></td>
          <td>${po.vendorName || '—'}</td>
          <td>${formatDate(po.documentDate || po.poDate)}</td>
          <td><span class="doc-count${grns > 0 ? ' has-docs' : ''}">${grns}</span></td>
          <td><span class="doc-count${invs > 0 ? ' has-docs' : ''}">${invs}</span></td>
          <td>${renderStatusBadge(status)}</td>
          <td>
            <a href="${href}" class="po-action-btn" onclick="event.stopPropagation()">
              View →
            </a>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = renderEmptyState('Failed to load purchase orders: ' + err.message);
  }
}

window.reloadDashboard = loadDashboard;
loadDashboard();
