import { checkAuth } from './auth.js';
import { skuAPI } from './api.js';
import { renderSidebar, initSidebar, renderEmptyState, renderLoadingState, renderErrorState } from './components.js';
import { formatCurrency, debounce, showToast } from './utils.js';

checkAuth();

document.getElementById('sidebar-container').innerHTML = renderSidebar('sku-master');
initSidebar();

const container = document.getElementById('sku-table-container');

async function loadSkus(search = '') {
  container.innerHTML = renderLoadingState();
  try {
    const skus = await skuAPI.list(search);

    const countEl = document.getElementById('sku-count');
    if (countEl) countEl.textContent = `${skus.length} record${skus.length !== 1 ? 's' : ''}`;

    if (skus.length === 0) {
      container.innerHTML = renderEmptyState('No SKU records found. Add your first SKU to get started.', '🗄');
      return;
    }

    let html = `
      <table class="data-table" style="min-width:760px;">
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
            <th style="width:100px;">Actions</th>
          </tr>
        </thead>
        <tbody>
    `;

    skus.forEach(s => {
      html += `
        <tr>
          <td><code style="font-size:11px;background:var(--bg-page);padding:1px 5px;border-radius:3px;border:1px solid var(--border);">${s.erpCode}</code></td>
          <td>${s.skuName}</td>
          <td style="color:var(--text-muted);font-size:11px;">${s.ean || s.eanCode || '—'}</td>
          <td style="color:var(--text-muted);font-size:11px;">${s.hsn || '—'}</td>
          <td><span class="badge badge-insufficient" style="font-size:10px;">${s.uom || '—'}</span></td>
          <td style="font-weight:600;">${formatCurrency(s.agreedRate)}</td>
          <td>${formatCurrency(s.mrp)}</td>
          <td><span style="font-size:11px;color:var(--text-muted);">${s.priceTolerance != null ? (s.priceTolerance * 100).toFixed(1) + '%' : '0%'}</span></td>
          <td>
            <div style="display:flex;gap:4px;">
              <button class="btn btn-sm btn-secondary edit-sku-btn" data-id="${s.id || s._id}">Edit</button>
              <button class="btn btn-sm btn-danger del-sku-btn" data-id="${s.id || s._id}">Del</button>
            </div>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;

    // Bind delete
    document.querySelectorAll('.del-sku-btn').forEach(b => {
      b.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = b.getAttribute('data-id');
        if (!confirm('Delete this SKU? This cannot be undone.')) return;
        try {
          await skuAPI.delete(id);
          showToast('SKU deleted successfully', 'success');
          loadSkus(document.getElementById('sku-search').value);
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    // Bind edit
    document.querySelectorAll('.edit-sku-btn').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = b.getAttribute('data-id');
        const sku = skus.find(s => (s._id || s.id) === id);
        if (sku) openSkuModal(sku);
      });
    });

  } catch (err) {
    container.innerHTML = renderErrorState(err.message);
  }
}

// Search
document.getElementById('sku-search').addEventListener('input', debounce((e) => {
  loadSkus(e.target.value);
}, 300));

// Add button
document.getElementById('add-sku-btn').addEventListener('click', () => {
  openSkuModal();
});

/* ============================================================
   SKU Modal
   ============================================================ */
function openSkuModal(sku = null) {
  const isEdit = !!sku;
  const mc = document.getElementById('sku-modal-container');

  mc.innerHTML = `
    <div class="modal-overlay">
      <div class="modal" style="width:480px;">
        <div class="modal-header">
          <span class="modal-title">${isEdit ? 'Edit' : 'Add'} SKU</span>
          <button class="modal-close" type="button" id="sku-modal-close">×</button>
        </div>
        <div class="modal-body">
          <form id="sku-form">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div class="form-group">
                <label class="form-label">ERP Code *</label>
                <input class="form-input" type="text" id="sku-erp" required value="${sku ? sku.erpCode : ''}" ${isEdit ? 'readonly style="background:var(--bg-page);color:var(--text-muted);"' : ''} placeholder="e.g. BIK-200G">
              </div>
              <div class="form-group">
                <label class="form-label">SKU Name *</label>
                <input class="form-input" type="text" id="sku-name" required value="${sku ? sku.skuName : ''}" placeholder="Product full name">
              </div>
              <div class="form-group">
                <label class="form-label">EAN Code</label>
                <input class="form-input" type="text" id="sku-ean" value="${sku ? (sku.ean || sku.eanCode || '') : ''}" placeholder="Barcode / EAN-13">
              </div>
              <div class="form-group">
                <label class="form-label">HSN Code</label>
                <input class="form-input" type="text" id="sku-hsn" value="${sku ? (sku.hsn || '') : ''}" placeholder="HSN for GST">
              </div>
              <div class="form-group">
                <label class="form-label">UOM</label>
                <input class="form-input" type="text" id="sku-uom" value="${sku ? (sku.uom || 'PCS') : 'PCS'}" placeholder="PCS / KG / BOX">
              </div>
              <div class="form-group">
                <label class="form-label">Agreed Rate (₹)</label>
                <input class="form-input" type="number" step="0.01" min="0" id="sku-rate" value="${sku ? sku.agreedRate : '0'}" placeholder="0.00">
              </div>
              <div class="form-group">
                <label class="form-label">MRP (₹)</label>
                <input class="form-input" type="number" step="0.01" min="0" id="sku-mrp" value="${sku ? sku.mrp : '0'}" placeholder="0.00">
              </div>
              <div class="form-group">
                <label class="form-label">Price Tolerance</label>
                <input class="form-input" type="number" step="0.01" min="0" max="1" id="sku-tol" value="${sku ? sku.priceTolerance : '0.05'}" placeholder="0.05 = 5%">
              </div>
            </div>
            <div id="sku-form-error" class="error-state" style="display:none;margin-top:8px;"></div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="sku-cancel-btn">Cancel</button>
          <button type="submit" form="sku-form" class="btn btn-primary" id="sku-submit-btn">
            ${isEdit ? 'Save Changes' : 'Add SKU'}
          </button>
        </div>
      </div>
    </div>
  `;

  const close = () => { mc.innerHTML = ''; };
  document.getElementById('sku-modal-close').addEventListener('click', close);
  document.getElementById('sku-cancel-btn').addEventListener('click', close);
  mc.querySelector('.modal-overlay').addEventListener('click', (e) => {
    if (e.target === mc.querySelector('.modal-overlay')) close();
  });

  document.getElementById('sku-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('sku-submit-btn');
    const errEl = document.getElementById('sku-form-error');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    errEl.style.display = 'none';

    const payload = {
      erpCode:        document.getElementById('sku-erp').value.trim(),
      skuName:        document.getElementById('sku-name').value.trim(),
      ean:            document.getElementById('sku-ean').value.trim() || undefined,
      hsn:            document.getElementById('sku-hsn').value.trim() || undefined,
      uom:            document.getElementById('sku-uom').value.trim() || 'PCS',
      agreedRate:     parseFloat(document.getElementById('sku-rate').value) || 0,
      mrp:            parseFloat(document.getElementById('sku-mrp').value) || 0,
      priceTolerance: parseFloat(document.getElementById('sku-tol').value) || 0,
    };

    try {
      if (isEdit) {
        await skuAPI.update(sku._id || sku.id, payload);
        showToast('SKU updated successfully', 'success');
      } else {
        await skuAPI.create(payload);
        showToast('SKU created successfully', 'success');
      }
      close();
      loadSkus(document.getElementById('sku-search').value);
    } catch (error) {
      errEl.textContent = error.message || 'Failed to save SKU';
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = isEdit ? 'Save Changes' : 'Add SKU';
    }
  });
}

loadSkus();
