import { checkAuth } from './auth.js';
import { documentsAPI, matchAPI, summaryAPI } from './api.js';
import {
  renderSidebar, initSidebar,
  renderStatusBadge, renderMismatchBanner,
  renderDocumentPreview, initZoomControls,
  renderDocInfoPanel,
  renderItemGrid,
  renderEmptyState, renderLoadingState, renderErrorState, renderStatCard,
  renderUploadModal, renderUploadProgress
} from './components.js';
import { formatDate, formatCurrency, getQueryParam, showToast } from './utils.js';
import { openUploadModal } from './upload.js';

checkAuth();

const poNumber = getQueryParam('poNumber');
if (!poNumber) window.location.href = '/dashboard.html';

// Inject sidebar
document.getElementById('sidebar-container').innerHTML = renderSidebar('purchase-order');
initSidebar();

// Inject upload modal
document.getElementById('upload-modal-container').innerHTML = renderUploadModal();

const tabContent = document.getElementById('tab-content');

let matchData = null;
let allDocs = { purchase_order: [], invoice: [], grn: [] };

// ---- Expose reload for upload.js ----
window.reloadPurchaseOrder = init;

async function init() {
  tabContent.innerHTML = renderLoadingState('Loading purchase order data...');

  try {
    const docs = await documentsAPI.list(null, poNumber);
    allDocs = { purchase_order: [], invoice: [], grn: [] };
    docs.forEach(d => {
      const dtype = d.documentType || d.type;
      if (allDocs[dtype] !== undefined) allDocs[dtype].push(d);
    });

    matchData = await matchAPI.getMatch(poNumber).catch(() => null);

    renderPageHeader();
    updateTabCounts();
    bindTabs();
    switchTab('purchase-order');
  } catch (err) {
    tabContent.innerHTML = renderErrorState('Failed to load document data: ' + err.message);
  }
}

function renderPageHeader() {
  const po = allDocs.purchase_order[0] || {};
  const sub = `PO ${poNumber} · ${po.vendorName || 'Unknown Vendor'} · ${formatDate(po.documentDate || po.poDate)}`;
  document.getElementById('po-header-sub').textContent = sub;

  const statusEl = document.getElementById('po-header-status');
  if (statusEl && matchData?.status) {
    statusEl.innerHTML = renderStatusBadge(matchData.status);
  }
}

function updateTabCounts() {
  const tcPo  = document.getElementById('tc-po');
  const tcInv = document.getElementById('tc-inv');
  const tcGrn = document.getElementById('tc-grn');
  if (tcPo)  tcPo.textContent  = allDocs.purchase_order.length;
  if (tcInv) tcInv.textContent = allDocs.invoice.length;
  if (tcGrn) tcGrn.textContent = allDocs.grn.length;
}

function bindTabs() {
  document.querySelectorAll('#tab-bar .tab').forEach(t => {
    t.addEventListener('click', () => {
      document.querySelectorAll('#tab-bar .tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      switchTab(t.dataset.tab);
    });
  });

  // Upload trigger
  const uploadTrigger = document.getElementById('upload-trigger-btn');
  if (uploadTrigger) uploadTrigger.addEventListener('click', openUploadModal);
}

function switchTab(tab) {
  tabContent.innerHTML = '';
  tabContent.className = 'doc-layout-wrapper';

  if (tab === 'purchase-order') {
    const po = allDocs.purchase_order[0];
    if (!po) {
      tabContent.innerHTML = renderEmptyState('No Purchase Order found for this PO number', '📄');
    } else {
      renderPOTab(po);
    }
  } else if (tab === 'fulfillment') {
    renderMultiDocTab(allDocs.invoice, 'Invoice', 'Fulfillment');
  } else if (tab === 'delivery') {
    renderMultiDocTab(allDocs.grn, 'GRN', 'Delivery');
  } else if (tab === 'summary') {
    loadSummaryTab();
  }
}

/* ----------------------------------------------------------------
   Purchase Order Tab: two-column info+preview + full-width grid
   ---------------------------------------------------------------- */
function renderPOTab(doc) {
  const fileUrl = documentsAPI.getFileUrl(doc.id);
  const po = doc;

  const banners = matchData && matchData.reasons && matchData.reasons.length > 0
    ? `<div class="doc-banners">${renderMismatchBanner(matchData.reasons)}</div>`
    : '';

  const infoPanel = renderDocInfoPanel('Purchase Order Details', [
    ['PO Number',   po.poNumber || poNumber],
    ['PO Date',     formatDate(po.documentDate || po.poDate)],
    ['Vendor',      po.vendorName || '—'],
    ['Currency',    po.currency || 'INR'],
    ['Total Amount',formatCurrency(po.totalAmount)],
    ['Document ID', po.id || po._id || '—'],
  ]);

  const vendorPanel = po.vendorAddress || po.vendorGst ? renderDocInfoPanel('Vendor Details', [
    ['Address',   po.vendorAddress || '—'],
    ['GST / TIN', po.vendorGst || '—'],
  ]) : '';

  tabContent.innerHTML = `
    ${banners}
    <div class="doc-top-row">
      <div class="doc-info-col">
        <div class="doc-info-inner">
          ${infoPanel}
          ${vendorPanel}
        </div>
      </div>
      ${renderDocumentPreview(fileUrl, doc.mimeType, 'Original Document')}
    </div>
    <div class="doc-grid-section">
      <div class="doc-grid-header">
        <span class="doc-grid-title">Line Items</span>
        <span style="font-size:11px;color:var(--text-muted);">${(doc.items || []).length} item(s)</span>
      </div>
      <div class="doc-grid-body">
        ${renderItemGrid(doc.items, matchData, 'po')}
      </div>
    </div>
  `;

  initZoomControls();
}

/* ----------------------------------------------------------------
   Fulfillment / Delivery Tab: secondary sub-tabs + doc layout
   ---------------------------------------------------------------- */
function renderMultiDocTab(docs, docLabel, tabLabel) {
  if (docs.length === 0) {
    tabContent.innerHTML = renderEmptyState(`No ${tabLabel} documents found for this PO`, '📋');
    return;
  }

  const subTabs = docs.map((d, i) => {
    const num = d.invoiceNumber || d.grnNumber || d.documentNumber || d.id.substring(0, 8);
    const status = d.status || 'Raised';
    return `
      <button class="tab${i === 0 ? ' active' : ''}" data-id="${d.id}">
        ${docLabel}: ${num}
        <span class="doc-status-pill">${status}</span>
      </button>
    `;
  }).join('');

  tabContent.innerHTML = `
    <div class="sub-tab-bar" id="sub-tab-bar">${subTabs}</div>
    <div id="sub-tab-content" class="doc-layout-wrapper" style="flex:1;"></div>
  `;

  const subContent = document.getElementById('sub-tab-content');

  const showDoc = (id) => {
    const d = docs.find(x => x.id === id);
    if (!d) return;
    const fileUrl = documentsAPI.getFileUrl(d.id);

    const banners = matchData && matchData.reasons && matchData.reasons.length > 0
      ? `<div class="doc-banners">${renderMismatchBanner(matchData.reasons)}</div>`
      : '';

    let infoFields;
    if (docLabel === 'Invoice') {
      infoFields = [
        ['Invoice Number', d.invoiceNumber || d.documentNumber || '—'],
        ['Invoice Date',   formatDate(d.documentDate || d.invoiceDate)],
        ['PO Number',      d.poNumber || poNumber],
        ['Vendor',         d.vendorName || '—'],
        ['Total Amount',   formatCurrency(d.totalAmount)],
        ['Currency',       d.currency || 'INR'],
      ];
    } else {
      infoFields = [
        ['GRN Number',      d.grnNumber || d.documentNumber || '—'],
        ['GRN Date',        formatDate(d.documentDate || d.grnDate)],
        ['PO Number',       d.poNumber || poNumber],
        ['Vendor',          d.vendorName || '—'],
        ['Received Qty',    d.totalReceivedQty ?? (d.items || []).reduce((s, i) => s + (i.receivedQty || 0), 0)],
      ];
    }

    const docTitle = docLabel === 'Invoice' ? 'Invoice Document' : 'GRN Document';

    subContent.innerHTML = `
      ${banners}
      <div class="doc-top-row">
        <div class="doc-info-col">
          <div class="doc-info-inner">
            ${renderDocInfoPanel(`${docLabel} Details`, infoFields)}
          </div>
        </div>
        ${renderDocumentPreview(fileUrl, d.mimeType, docTitle)}
      </div>
      <div class="doc-grid-section">
        <div class="doc-grid-header">
          <span class="doc-grid-title">Line Items — ${docLabel} ${d.invoiceNumber || d.grnNumber || d.documentNumber || ''}</span>
          <span style="font-size:11px;color:var(--text-muted);">${(d.items || []).length} item(s)</span>
        </div>
        <div class="doc-grid-body">
          ${renderItemGrid(d.items, matchData, docLabel.toLowerCase())}
        </div>
      </div>
    `;
    initZoomControls();
  };

  document.querySelectorAll('#sub-tab-bar .tab').forEach(t => {
    t.addEventListener('click', () => {
      document.querySelectorAll('#sub-tab-bar .tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      showDoc(t.dataset.id);
    });
  });

  showDoc(docs[0].id);
}

/* ----------------------------------------------------------------
   Summary Tab
   ---------------------------------------------------------------- */
async function loadSummaryTab() {
  tabContent.innerHTML = renderLoadingState('Loading summary...');

  try {
    const summary = await summaryAPI.getSummary(poNumber);
    const totals = summary.summary || {};
    const currentStatus = summary.currentStatus || matchData?.status;

    const poAmount    = totals.poAmount    || 0;
    const invoiced    = totals.totalInvoiced || 0;
    const received    = totals.totalReceived || 0;

    // Build document rows
    const poRows = (summary.documents?.purchaseOrders || []).map(d => `
      <tr>
        <td>Purchase Order</td>
        <td><strong>${d.poNumber || '—'}</strong></td>
        <td>${formatDate(d.poDate || d.documentDate)}</td>
        <td>—</td>
        <td>${formatCurrency(d.totalAmount)}</td>
        <td>—</td>
        <td>${renderStatusBadge(currentStatus)}</td>
      </tr>
    `).join('');

    const invRows = (summary.documents?.invoices || []).map(d => `
      <tr>
        <td>Invoice (Fulfillment)</td>
        <td><strong>${d.invoiceNumber || d.documentNumber || '—'}</strong></td>
        <td>${formatDate(d.invoiceDate || d.documentDate)}</td>
        <td>${(d.items || []).reduce((s, i) => s + (i.invoicedQty || 0), 0) || '—'}</td>
        <td>${formatCurrency(d.totalAmount)}</td>
        <td>—</td>
        <td><span class="badge badge-invoiced">Invoiced</span></td>
      </tr>
    `).join('');

    const grnRows = (summary.documents?.grns || []).map(d => `
      <tr>
        <td>Delivery (GRN)</td>
        <td><strong>${d.grnNumber || d.documentNumber || '—'}</strong></td>
        <td>${formatDate(d.grnDate || d.documentDate)}</td>
        <td>${(d.items || []).reduce((s, i) => s + (i.receivedQty || 0), 0) || '—'}</td>
        <td>—</td>
        <td>—</td>
        <td><span class="badge badge-raised">Raised</span></td>
      </tr>
    `).join('');

    tabContent.innerHTML = `
      <div class="summary-layout">
        <!-- Summary Stats -->
        <div class="summary-stats">
          ${renderStatCard('PO Amount', formatCurrency(poAmount), '')}
          ${renderStatCard('Total Invoiced', formatCurrency(invoiced), invoiced > poAmount ? 'accent-mismatch' : 'accent-matched')}
          ${renderStatCard('Total Received (Est.)', formatCurrency(received), '')}
        </div>

        <!-- Overall Status -->
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">Overall Match Status</span>
            ${renderStatusBadge(currentStatus)}
          </div>
          ${matchData?.reasons?.length > 0 ? `
            <div style="padding:10px 14px;border-bottom:1px solid var(--border);">
              ${renderMismatchBanner(matchData.reasons)}
            </div>
          ` : ''}
        </div>

        <!-- Associated Documents -->
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">Associated Invoice &amp; Delivery Documents</span>
          </div>
          <div class="table-responsive">
            <table class="data-table" style="min-width:700px;">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Document Number</th>
                  <th>Date</th>
                  <th>Quantity</th>
                  <th>Amount</th>
                  <th>Pending Delivery</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${poRows}
                ${grnRows}
                ${invRows}
                ${!poRows && !invRows && !grnRows ? `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">No associated documents</td></tr>` : ''}
                <tr style="background:var(--bg-table-head);">
                  <td colspan="6" style="font-weight:700;font-size:12px;">Current Status</td>
                  <td>${renderStatusBadge(currentStatus)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    tabContent.innerHTML = renderErrorState('Could not load summary: ' + err.message);
  }
}

init();
