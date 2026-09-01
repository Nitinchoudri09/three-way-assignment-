export function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login.html';
}

export function getUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}
