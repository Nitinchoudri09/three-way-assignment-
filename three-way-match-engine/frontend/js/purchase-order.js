import { checkAuth } from './auth.js';
import { documentsAPI, matchAPI, summaryAPI } from './api.js';
import { renderSidebar, renderStatusBadge, renderMismatchBanner, renderDocumentPreview, renderItemGrid, renderEmptyState, renderLoadingState, renderErrorState, renderStatCard } from './components.js';
import { formatDate, formatCurrency, getQueryParam, showToast } from './utils.js';

checkAuth();

const poNumber = getQueryParam('poNumber');
if (!poNumber) window.location.href = '/dashboard.html';

document.getElementById('sidebar-container').innerHTML = renderSidebar('dashboard');
const tabContent = document.getElementById('tab-content');

let matchData = null;
let allDocs = { purchase_order: [], invoice: [], grn: [] };

async function init() {
  document.getElementById('po-header').innerHTML = renderLoadingState();
  
  try {
    const docs = await documentsAPI.list(null, poNumber);
    docs.forEach(d => {
      const dtype = d.documentType || d.type;
      if (allDocs[dtype]) allDocs[dtype].push(d);
    });
    
    matchData = await matchAPI.getMatch(poNumber).catch(() => null);
    
    renderHeader();
    updateTabCounts();
    
    // Bind tabs
    document.querySelectorAll('.tab').forEach(t => {
      t.addEventListener('click', (e) => {
        if(e.target.closest('.sub-tab-bar')) return; // ignore subtabs
        document.querySelectorAll('#tab-bar .tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        switchTab(t.dataset.tab);
      });
    });
    
    switchTab('purchase-order');
    
  } catch (err) {
    document.getElementById('po-header').innerHTML = renderErrorState('Failed to load data');
  }
}

function updateTabCounts() {
  document.querySelector('[data-tab="purchase-order"]').textContent = `Purchase Order (${allDocs.purchase_order.length})`;
  document.querySelector('[data-tab="fulfillment"]').textContent = `Fulfillment (${allDocs.invoice.length})`;
  document.querySelector('[data-tab="delivery"]').textContent = `Delivery (${allDocs.grn.length})`;
}

function renderHeader() {
  const po = allDocs.purchase_order[0] || {};
  const matchStatus = matchData?.status;
  document.getElementById('po-header').innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; padding: 16px 24px; background: white; border-bottom: 1px solid var(--border-color);">
      <div>
        <h2 style="margin:0; font-size:20px;">PO: ${poNumber}</h2>
        <div style="color:var(--text-muted); font-size:14px; margin-top:4px;">
          Vendor: ${po.vendorName || '-'} &nbsp;|&nbsp; Date: ${formatDate(po.poDate || po.documentDate)}
        </div>
      </div>
      <div>
        ${renderStatusBadge(matchStatus)}
      </div>
    </div>
  `;
}

function switchTab(tab) {
  tabContent.innerHTML = '';
  
  if (tab === 'purchase-order') {
    const po = allDocs.purchase_order[0];
    if (!po) tabContent.innerHTML = renderEmptyState('No Purchase Order found');
    else renderDocLayout(po);
  } else if (tab === 'fulfillment') {
    renderMultiDocLayout(allDocs.invoice, 'Invoice');
  } else if (tab === 'delivery') {
    renderMultiDocLayout(allDocs.grn, 'GRN');
  } else if (tab === 'summary') {
    loadSummary();
  }
}

function renderDocLayout(doc) {
  const url = documentsAPI.getFileUrl(doc.id);
  tabContent.innerHTML = `
    <div class="doc-layout">
      <div class="doc-info-col">
        ${matchData ? renderMismatchBanner(matchData.reasons) : ''}
        <div class="card" style="margin-bottom:0; flex-grow:1; display:flex; flex-direction:column;">
          <div class="card-header">Document Items</div>
          <div class="card-body" style="flex-grow:1; overflow:hidden; display:flex; flex-direction:column;">
            ${renderItemGrid(doc.items, matchData)}
          </div>
        </div>
      </div>
      <div class="doc-preview-col">
        <div class="preview-controls">
          <a href="${url}" target="_blank" class="btn btn-sm btn-secondary">Open Fullscreen</a>
        </div>
        <div class="doc-preview">
          ${renderDocumentPreview(url, doc.mimeType)}
        </div>
      </div>
    </div>
  `;
}

function renderMultiDocLayout(docs, label) {
  if (docs.length === 0) {
    tabContent.innerHTML = renderEmptyState(`No ${label}s found for this PO`);
    return;
  }
  
  let html = `<div class="sub-tab-bar" id="sub-tab-bar">`;
  docs.forEach((d, i) => {
    html += `<button class="tab ${i===0?'active':''}" data-id="${d.id}">${label}: ${d.documentNumber || d.id.substring(0,8)}</button>`;
  });
  html += `</div><div id="sub-tab-content"></div>`;
  tabContent.innerHTML = html;
  
  const subTabContent = document.getElementById('sub-tab-content');
  
  const showDoc = (id) => {
    const d = docs.find(x => x.id === id);
    const url = documentsAPI.getFileUrl(d.id);
    subTabContent.innerHTML = `
      <div class="doc-layout" style="height:calc(100vh - 210px); padding-top:0;">
        <div class="doc-info-col">
          ${matchData ? renderMismatchBanner(matchData.reasons.filter(r => r.message.includes(d.documentNumber))) : ''}
          <div class="card" style="margin-bottom:0; flex-grow:1;">
            <div class="card-header">Items</div>
            <div class="card-body">${renderItemGrid(d.items, matchData)}</div>
          </div>
        </div>
        <div class="doc-preview-col">
          <div class="doc-preview">${renderDocumentPreview(url, d.mimeType)}</div>
        </div>
      </div>
    `;
  };
  
  document.querySelectorAll('#sub-tab-bar .tab').forEach(t => {
    t.addEventListener('click', (e) => {
      document.querySelectorAll('#sub-tab-bar .tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      showDoc(t.dataset.id);
    });
  });
  
  showDoc(docs[0].id);
}

async function loadSummary() {
  tabContent.innerHTML = renderLoadingState();
  try {
    const summary = await summaryAPI.getSummary(poNumber);
    // Backend returns: { poNumber, documents, currentStatus, summary: { poAmount, totalInvoiced, totalReceived } }
    const totals = summary.summary || {};
    tabContent.innerHTML = `
      <div style="padding:24px;">
        <div class="stat-cards">
          ${renderStatCard('PO Amount', formatCurrency(totals.poAmount || 0))}
          ${renderStatCard('Total Invoiced', formatCurrency(totals.totalInvoiced || 0))}
          ${renderStatCard('Total Received (Est.)', formatCurrency(totals.totalReceived || 0))}
        </div>
        
        <div class="card">
          <div class="card-header">Overall Status: ${renderStatusBadge(summary.currentStatus || matchData?.status)}</div>
          <div class="card-body">
            <h3 style="margin-bottom:12px; font-size:14px;">Associated Documents</h3>
            <table class="data-table">
              <thead><tr>
                <th>Type</th><th>Number</th><th>Date</th><th>Status</th>
              </tr></thead>
              <tbody>
                ${(summary.documents?.purchaseOrders || []).map(d => `<tr>
                  <td>Purchase Order</td>
                  <td>${d.poNumber || '-'}</td>
                  <td>${formatDate(d.poDate)}</td>
                  <td>${renderStatusBadge(summary.currentStatus)}</td>
                </tr>`).join('')}
                ${(summary.documents?.grns || []).map(d => `<tr>
                  <td>GRN</td>
                  <td>${d.grnNumber || '-'}</td>
                  <td>${formatDate(d.grnDate)}</td>
                  <td><span class="status-badge status-matched">Received</span></td>
                </tr>`).join('')}
                ${(summary.documents?.invoices || []).map(d => `<tr>
                  <td>Invoice</td>
                  <td>${d.invoiceNumber || '-'}</td>
                  <td>${formatDate(d.invoiceDate)}</td>
                  <td><span class="status-badge status-partial">Invoiced</span></td>
                </tr>`).join('')}
              </tbody>
            </table>
            <div style="margin-top:20px;">
              <h3 style="margin-bottom:12px; font-size:14px;">Discrepancies</h3>
              ${matchData && matchData.reasons && matchData.reasons.length > 0 
                ? renderMismatchBanner(matchData.reasons) 
                : '<p style="color:var(--text-muted)">No discrepancies found.</p>'}
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    tabContent.innerHTML = renderErrorState('Could not load summary');
  }
}

init();
