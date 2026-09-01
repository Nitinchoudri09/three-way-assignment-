export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatCurrency(amount) {
  if (amount == null) return '-';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}

export function formatNumber(num, decimals = 2) {
  if (num == null) return '-';
  return Number(num).toFixed(decimals);
}

export function getStatusLabel(status) {
  const map = {
    'matched': 'Matched',
    'partially_matched': 'Partially Matched',
    'mismatch': 'Mismatch',
    'insufficient_documents': 'Insufficient Docs'
  };
  return map[status] || status || 'Unknown';
}

export function getStatusClass(status) {
  const map = {
    'matched': 'status-matched',
    'partially_matched': 'status-partial',
    'mismatch': 'status-mismatch',
    'insufficient_documents': 'status-insufficient'
  };
  return map[status] || 'status-insufficient';
}

export function debounce(fn, delay) {
  let timeoutId;
  return function(...args) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

export function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

export function truncate(str, len = 30) {
  if (!str) return '';
  if (str.length <= len) return str;
  return str.substring(0, len) + '...';
}

export function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.right = '20px';
  toast.style.padding = '12px 24px';
  toast.style.backgroundColor = type === 'error' ? '#DC2626' : '#10B981';
  toast.style.color = 'white';
  toast.style.borderRadius = '4px';
  toast.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
  toast.style.zIndex = '1000';
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3000);
}
