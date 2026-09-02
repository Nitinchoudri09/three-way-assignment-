import { documentsAPI } from './api.js';
import { renderUploadProgress } from './components.js';
import { showToast } from './utils.js';

/* ============================================================
   OPEN / CLOSE
   ============================================================ */
export function openUploadModal() {
  const overlay = document.getElementById('upload-overlay');
  if (!overlay) return;

  document.getElementById('upload-form')?.reset();

  const pc = document.getElementById('upload-progress-container');
  if (pc) { pc.style.display = 'none'; pc.innerHTML = ''; }

  const result = document.getElementById('upload-result');
  if (result) { result.style.display = 'none'; result.innerHTML = ''; }

  const fc = document.getElementById('file-chosen');
  if (fc) fc.style.display = 'none';

  resetSubmitBtn();
  overlay.style.display = 'flex';
}

export function closeUploadModal() {
  const overlay = document.getElementById('upload-overlay');
  if (overlay) overlay.style.display = 'none';
}

function resetSubmitBtn() {
  const btn = document.getElementById('submit-upload-btn');
  if (!btn) return;
  btn.disabled = false;
  btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Upload`;
}

function validateFile(file) {
  const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
  if (!allowed.includes(file.type)) return { valid: false, error: 'Invalid file type. Use PDF, PNG, or JPG.' };
  if (file.size > 10 * 1024 * 1024) return { valid: false, error: 'File too large. Maximum 10MB.' };
  return { valid: true };
}

/* ============================================================
   SIMULATED PROGRESS
   Steps advance automatically to keep the user informed during
   the long Gemini AI parsing phase (can take 1–5 minutes).
   ============================================================ */
const STEP_DELAYS_MS = [
  0,      // 0: Uploading        — show immediately
  3000,   // 1: Parsing          — after 3s
  12000,  // 2: Validating       — after 12s
  20000,  // 3: Resolving SKU    — after 20s
  30000,  // 4: Checking dupes   — after 30s
  45000,  // 5: Calculating match— after 45s
];

let progressTimers = [];

function clearProgressTimers() {
  progressTimers.forEach(t => clearTimeout(t));
  progressTimers = [];
}

function startSimulatedProgress(stepsContainer) {
  clearProgressTimers();

  STEP_DELAYS_MS.forEach((delay, step) => {
    const t = setTimeout(() => {
      if (stepsContainer.parentNode) {           // still in DOM?
        stepsContainer.innerHTML = renderUploadProgress(step);
      }
    }, delay);
    progressTimers.push(t);
  });
}

/* ============================================================
   CORE UPLOAD HANDLER
   ============================================================ */
async function handleUploadSubmit(e) {
  e.preventDefault();

  const typeEl    = document.getElementById('upload-type');
  const fileInput = document.getElementById('upload-file');
  const file      = fileInput?.files[0];

  if (!file)  { showToast('Please select a file to upload', 'error'); return; }
  const valid = validateFile(file);
  if (!valid.valid) { showToast(valid.error, 'error'); return; }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('documentType', typeEl?.value || 'purchase_order');

  // ---- UI: lock button, show progress ----
  const btn = document.getElementById('submit-upload-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Processing…'; }

  const resultEl = document.getElementById('upload-result');
  if (resultEl) { resultEl.style.display = 'none'; resultEl.innerHTML = ''; }

  const progressContainer = document.getElementById('upload-progress-container');
  if (progressContainer) {
    progressContainer.style.display = 'block';
    progressContainer.innerHTML = `
      <p style="font-size:11px;color:var(--text-muted);margin-bottom:8px;">
        ⏳ AI is parsing the document — this may take 1–3 minutes. Please wait…
      </p>
      <div id="upload-steps">${renderUploadProgress(0)}</div>
    `;

    // Kick off auto-advancing steps
    const stepsEl = progressContainer.querySelector('#upload-steps');
    startSimulatedProgress(stepsEl);
  }

  // ---- API call (Gemini is slow — up to 5 min) ----
  try {
    await documentsAPI.upload(formData);

    // Stop timers and show "Complete" immediately
    clearProgressTimers();
    const stepsEl = document.getElementById('upload-steps');
    if (stepsEl) stepsEl.innerHTML = renderUploadProgress(6); // all done

    if (resultEl) {
      resultEl.style.display = 'block';
      resultEl.innerHTML = `
        <div class="banner banner-info" style="margin-top:10px;">
          <span class="banner-icon">✓</span>
          <div class="banner-body">
            <div class="banner-title">Document uploaded successfully</div>
            <div class="banner-desc">Parsed, matched and saved. Refreshing…</div>
          </div>
        </div>
      `;
    }

    showToast('Document uploaded and processed', 'success');

    setTimeout(() => {
      closeUploadModal();
      if (window.reloadDashboard)     window.reloadDashboard();
      if (window.reloadPurchaseOrder) window.reloadPurchaseOrder();
    }, 1500);

  } catch (err) {
    clearProgressTimers();
    if (progressContainer) progressContainer.style.display = 'none';

    if (resultEl) {
      resultEl.style.display = 'block';
      resultEl.innerHTML = `
        <div class="banner banner-error" style="margin-top:10px;">
          <span class="banner-icon">⚠</span>
          <div class="banner-body">
            <div class="banner-title">Upload failed</div>
            <div class="banner-desc">${err.message || 'Please try again.'}</div>
          </div>
        </div>
      `;
    }

    resetSubmitBtn();
  }
}

/* ============================================================
   EVENT DELEGATION  (works regardless of when modal is injected)
   ============================================================ */

// Clicks: close/cancel buttons + backdrop
document.addEventListener('click', (e) => {
  if (e.target.closest('#close-upload-btn') || e.target.closest('#cancel-upload-btn')) {
    clearProgressTimers();
    closeUploadModal();
    return;
  }
  if (e.target.id === 'upload-overlay') {
    clearProgressTimers();
    closeUploadModal();
  }
});

// File chosen → show filename
document.addEventListener('change', (e) => {
  if (e.target.id !== 'upload-file') return;
  const f  = e.target.files[0];
  const fc = document.getElementById('file-chosen');
  if (!fc) return;
  if (f) {
    fc.textContent = `📄 ${f.name} (${(f.size / 1024).toFixed(1)} KB)`;
    fc.style.display = 'inline-block';
  } else {
    fc.style.display = 'none';
  }
});

// Form submit (triggered by type="submit" form="upload-form" button)
document.addEventListener('submit', (e) => {
  if (e.target.id === 'upload-form') {
    handleUploadSubmit(e);
  }
});
