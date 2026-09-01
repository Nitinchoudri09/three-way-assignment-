import { checkAuth } from './auth.js';
import { documentsAPI, matchAPI } from './api.js';
import { renderSidebar, renderStatusBadge, renderStatCard, renderEmptyState, renderLoadingState, renderUploadModal, renderUploadProgress } from './components.js';
import { formatDate, debounce, showToast } from './utils.js';
import { openUploadModal } from './upload.js';

checkAuth();

document.getElementById('sidebar-container').innerHTML = renderSidebar('dashboard');
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
  try {
    const pos = await documentsAPI.list('purchase_order');
    let total = pos.length;
    let matched = 0, partial = 0, mismatch = 0, insufficient = 0;
    
    for (const po of pos) {
      if (!po.poNumber) continue;
      const match = await matchAPI.getMatch(po.poNumber).catch(() => null);
      if (match) {
        if (match.status === 'matched') matched++;
        else if (match.status === 'partially_matched') partial++;
        else if (match.status === 'mismatch') mismatch++;
        else if (match.status === 'insufficient_documents') insufficient++;
      } else {
        insufficient++;
      }
    }
    
    const statsHtml = `
      ${renderStatCard('Total POs', total)}
      ${renderStatCard('Matched', matched, 'status-matched-text')}
      ${renderStatCard('Partially Matched', partial, 'status-partial-text')}
      ${renderStatCard('Mismatch', mismatch, 'status-mismatch-text')}
      ${renderStatCard('Insufficient Docs', insufficient, 'status-insufficient-text')}
    `;
    document.getElementById('stat-cards').innerHTML = statsHtml;
  } catch (err) {
    document.getElementById('stat-cards').innerHTML = renderEmptyState('Failed to load stats');
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
      container.innerHTML = renderEmptyState('No purchase orders found');
      return;
    }
    
    let html = `
      <table class="data-table" id="po-table">
        <thead>
          <tr>
            <th>PO Number</th>
            <th>Vendor</th>
            <th>PO Date</th>
            <th>Status</th>
            <th>Last Updated</th>
          </tr>
        </thead>
        <tbody id="po-table-body">
    `;
    
    for (const po of pos) {
      let status = 'insufficient_docs';
      if (po.poNumber) {
        const match = await matchAPI.getMatch(po.poNumber).catch(() => null);
        if (match) status = match.status;
      }
      
      html += `
        <tr onclick="window.location.href='/purchase-order.html?poNumber=${encodeURIComponent(po.poNumber)}'">
          <td>${po.poNumber || '-'}</td>
          <td>${po.vendorName || '-'}</td>
          <td>${formatDate(po.documentDate)}</td>
          <td>${renderStatusBadge(status)}</td>
          <td>${formatDate(po.updatedAt)}</td>
        </tr>
      `;
    }
    
    html += `</tbody></table>`;
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = renderEmptyState('Failed to load purchase orders');
  }
}

// Upload modal initialization is handled by upload.js
// Expose reload function for upload.js
window.reloadDashboard = loadDashboard;

loadDashboard();
