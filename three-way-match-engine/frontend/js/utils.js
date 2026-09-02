export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch (_) { return '—'; }
}

export function formatCurrency(amount) {
  if (amount == null || amount === '' || isNaN(amount)) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
}

export function formatNumber(num, decimals = 2) {
  if (num == null) return '—';
  return Number(num).toFixed(decimals);
}

export function getStatusLabel(status) {
  const map = {
    matched:               'Matched',
    partially_matched:     'Partially Matched',
    mismatch:              'Mismatch',
    insufficient_documents:'Insufficient Docs',
    insufficient_docs:     'Insufficient Docs',
  };
  return map[status] || (status ? status.replace(/_/g, ' ') : 'Unknown');
}

export function getStatusClass(status) {
  const map = {
    matched:               'badge-matched',
    partially_matched:     'badge-partial',
    mismatch:              'badge-mismatch',
    insufficient_documents:'badge-insufficient',
    insufficient_docs:     'badge-insufficient',
  };
  return map[status] || 'badge-insufficient';
}

export function debounce(fn, delay) {
  let id;
  return function(...args) {
    clearTimeout(id);
    id = setTimeout(() => fn.apply(this, args), delay);
  };
}

export function getQueryParam(param) {
  return new URLSearchParams(window.location.search).get(param);
}

export function truncate(str, len = 30) {
  if (!str) return '';
  return str.length <= len ? str : str.substring(0, len) + '…';
}

export function showToast(message, type = 'info') {
  // Use the designated toast container if available
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconMap = { success: '✓', error: '✕', info: 'ℹ' };
  toast.innerHTML = `<span>${iconMap[type] || 'ℹ'}</span> ${message}`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}
