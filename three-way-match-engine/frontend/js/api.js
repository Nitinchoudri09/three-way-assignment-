const API_BASE = 'http://localhost:5000/api';

function getToken() { return localStorage.getItem('token'); }

export async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  try {
    const response = await fetch(API_BASE + endpoint, {
      ...options,
      headers
    });
    
    if (response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login.html';
      return;
    }
    
    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      data = await response.json();
    }
    
    if (!response.ok) {
      throw new APIError(data?.message || 'Request failed', response.status, data?.code);
    }
    
    // Unwrap the { success: true, data: ... } envelope
    return data?.data !== undefined ? data.data : data;
  } catch (err) {
    if (err instanceof APIError) throw err;
    throw new APIError(err.message || 'Network error. Please check your connection.', 0, 'NETWORK_ERROR');
  }
}

class APIError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const authAPI = {
  login(username, password) {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  }
};

export const documentsAPI = {
  upload(formData) {
    // The backend route is POST /api/documents/upload with field 'file' and body 'documentType'
    return apiRequest('/documents/upload', {
      method: 'POST',
      body: formData
    });
  },
  getById(id) {
    return apiRequest(`/documents/${id}`);
  },
  getFileUrl(id) {
    const token = getToken();
    return `${API_BASE}/documents/${id}/file?token=${token}`;
  },
  list(type, poNumber) {
    let url = '/documents';
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (poNumber) params.append('poNumber', poNumber);
    if (params.toString()) url += `?${params.toString()}`;
    return apiRequest(url);
  },
};

export const matchAPI = {
  getMatch(poNumber) {
    return apiRequest(`/match/${encodeURIComponent(poNumber)}`);
  }
};

export const summaryAPI = {
  getSummary(poNumber) {
    return apiRequest(`/summary/${encodeURIComponent(poNumber)}`);
  }
};

export const skuAPI = {
  list(search) {
    let url = '/masters/sku';
    if (search) url += `?search=${encodeURIComponent(search)}`;
    return apiRequest(url);
  },
  create(data) {
    return apiRequest('/masters/sku', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  update(id, data) {
    return apiRequest(`/masters/sku/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },
  delete(id) {
    return apiRequest(`/masters/sku/${id}`, {
      method: 'DELETE'
    });
  },
};
