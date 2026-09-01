import { documentsAPI } from './api.js';
import { renderUploadProgress } from './components.js';
import { showToast } from './utils.js';

export function openUploadModal() {
  document.getElementById('upload-overlay').style.display = 'flex';
  document.getElementById('upload-form').reset();
  document.getElementById('upload-progress-container').style.display = 'none';
  document.getElementById('submit-upload-btn').disabled = false;
}

export function closeUploadModal() {
  document.getElementById('upload-overlay').style.display = 'none';
}

function validateFile(file) {
  const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
  if (!allowed.includes(file.type)) return { valid: false, error: 'Invalid file type' };
  if (file.size > 10 * 1024 * 1024) return { valid: false, error: 'File too large (max 10MB)' };
  return { valid: true };
}

document.addEventListener('DOMContentLoaded', () => {
  // Bind close events
  const closeBtn = document.getElementById('close-upload-btn');
  const cancelBtn = document.getElementById('cancel-upload-btn');
  if(closeBtn) closeBtn.addEventListener('click', closeUploadModal);
  if(cancelBtn) cancelBtn.addEventListener('click', closeUploadModal);
  
  // Form submit
  const form = document.getElementById('upload-form');
  if(form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const type = document.getElementById('upload-type').value;
      const fileInput = document.getElementById('upload-file');
      const file = fileInput.files[0];
      
      if (!file) return showToast('Please select a file', 'error');
      
      const valid = validateFile(file);
      if (!valid.valid) return showToast(valid.error, 'error');
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', type);
      
      const btn = document.getElementById('submit-upload-btn');
      btn.disabled = true;
      
      const progressContainer = document.getElementById('upload-progress-container');
      progressContainer.style.display = 'block';
      
      // Simulate progress UI
      const updateProgress = (step) => {
        progressContainer.innerHTML = renderUploadProgress(step);
      };
      
      updateProgress(0); // Uploading
      
      try {
        const res = await documentsAPI.upload(formData);
        
        // Advance UI steps artificially
        for (let i = 1; i <= 6; i++) {
          await new Promise(r => setTimeout(r, 400));
          updateProgress(i);
        }
        
        showToast('Document uploaded successfully');
        setTimeout(() => {
          closeUploadModal();
          if (window.reloadDashboard) window.reloadDashboard();
          if (window.reloadPurchaseOrder) window.reloadPurchaseOrder();
        }, 1000);
      } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
        progressContainer.style.display = 'none';
      }
    });
  }
});
