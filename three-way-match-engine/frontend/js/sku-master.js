import { checkAuth } from './auth.js';
import { skuAPI } from './api.js';
import { renderSidebar, renderEmptyState, renderLoadingState, renderErrorState } from './components.js';
import { formatCurrency, debounce, showToast } from './utils.js';

checkAuth();

document.getElementById('sidebar-container').innerHTML = renderSidebar('sku-master');

const container = document.getElementById('sku-table-container');

async function loadSkus(search = '') {
  container.innerHTML = renderLoadingState();
  try {
    const skus = await skuAPI.list(search);
    if (skus.length === 0) {
      container.innerHTML = renderEmptyState('No SKUs found');
      return;
    }
    
    let html = `
      <table class="data-table">
        <thead>
          <tr>
            <th>ERP Code</th>
            <th>SKU Name</th>
            <th>EAN</th>
            <th>HSN</th>
            <th>UOM</th>
            <th>Agreed Rate</th>
            <th>MRP</th>
            <th>Tolerance</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    skus.forEach(s => {
      html += `
        <tr>
          <td>${s.erpCode}</td>
          <td>${s.skuName}</td>
          <td>${s.ean || '-'}</td>
          <td>${s.hsn || '-'}</td>
          <td>${s.uom || '-'}</td>
          <td>${formatCurrency(s.agreedRate)}</td>
          <td>${formatCurrency(s.mrp)}</td>
          <td>${s.priceTolerance ? (s.priceTolerance * 100) + '%' : '0%'}</td>
          <td>
            <button class="btn btn-sm btn-secondary edit-sku-btn" data-id="${s.id}">Edit</button>
            <button class="btn btn-sm btn-danger del-sku-btn" data-id="${s.id}">Delete</button>
          </td>
        </tr>
      `;
    });
    
    html += `</tbody></table>`;
    container.innerHTML = html;
    
    // Bind events
    document.querySelectorAll('.del-sku-btn').forEach(b => {
      b.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        if (confirm('Delete SKU?')) {
          await skuAPI.delete(id);
          showToast('SKU deleted');
          loadSkus();
        }
      });
    });
    
    document.querySelectorAll('.edit-sku-btn').forEach(b => {
      b.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const sku = skus.find(s => s._id === id || s.id === id);
        if (sku) openSkuModal(sku);
      });
    });
  } catch (err) {
    container.innerHTML = renderErrorState(err.message);
  }
}

document.getElementById('sku-search').addEventListener('input', debounce((e) => {
  loadSkus(e.target.value);
}, 300));

document.getElementById('add-sku-btn').addEventListener('click', () => {
  openSkuModal();
});

// Modal Logic
function openSkuModal(sku = null) {
  const isEdit = !!sku;
  const modalContainer = document.getElementById('sku-modal-container');
  
  modalContainer.innerHTML = `
    <div class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h2 style="font-size:16px;">${isEdit ? 'Edit' : 'Add'} SKU</h2>
          <button class="close-btn" type="button" onclick="document.getElementById('sku-modal-container').innerHTML=''">×</button>
        </div>
        <div class="modal-body">
          <form id="sku-form">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div class="form-group">
                <label class="form-label">ERP Code *</label>
                <input class="form-input" type="text" id="sku-erp" required value="${sku ? sku.erpCode : ''}" ${isEdit ? 'disabled' : ''}>
              </div>
              <div class="form-group">
                <label class="form-label">SKU Name *</label>
                <input class="form-input" type="text" id="sku-name" required value="${sku ? sku.skuName : ''}">
              </div>
              <div class="form-group">
                <label class="form-label">EAN Code</label>
                <input class="form-input" type="text" id="sku-ean" value="${sku && sku.eanCode ? sku.eanCode : ''}">
              </div>
              <div class="form-group">
                <label class="form-label">UOM</label>
                <input class="form-input" type="text" id="sku-uom" value="${sku && sku.uom ? sku.uom : 'PCS'}">
              </div>
              <div class="form-group">
                <label class="form-label">Agreed Rate</label>
                <input class="form-input" type="number" step="0.01" id="sku-rate" value="${sku ? sku.agreedRate : '0'}">
              </div>
              <div class="form-group">
                <label class="form-label">MRP</label>
                <input class="form-input" type="number" step="0.01" id="sku-mrp" value="${sku ? sku.mrp : '0'}">
              </div>
              <div class="form-group">
                <label class="form-label">Price Tolerance (e.g. 0.05 for 5%)</label>
                <input class="form-input" type="number" step="0.01" id="sku-tol" value="${sku ? sku.priceTolerance : '0.05'}">
              </div>
            </div>
            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:20px;">
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('sku-modal-container').innerHTML=''">Cancel</button>
              <button type="submit" class="btn btn-primary" id="sku-submit-btn">Save</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('sku-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('sku-submit-btn');
    btn.disabled = true;
    
    const payload = {
      erpCode: document.getElementById('sku-erp').value.trim(),
      skuName: document.getElementById('sku-name').value.trim(),
      eanCode: document.getElementById('sku-ean').value.trim(),
      uom: document.getElementById('sku-uom').value.trim(),
      agreedRate: parseFloat(document.getElementById('sku-rate').value) || 0,
      mrp: parseFloat(document.getElementById('sku-mrp').value) || 0,
      priceTolerance: parseFloat(document.getElementById('sku-tol').value) || 0,
    };
    
    try {
      if (isEdit) {
        await skuAPI.update(sku._id || sku.id, payload);
        showToast('SKU updated successfully');
      } else {
        await skuAPI.create(payload);
        showToast('SKU created successfully');
      }
      modalContainer.innerHTML = '';
      loadSkus(document.getElementById('sku-search').value);
    } catch (error) {
      showToast(error.message, 'error');
      btn.disabled = false;
    }
  });
}

loadSkus();
