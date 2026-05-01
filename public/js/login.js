// ╔══════════════════════════════════════════════════════════════╗
// ║  WEBYAZ RESTAURANT — Login JS                               ║
// ╚══════════════════════════════════════════════════════════════╝

document.addEventListener('DOMContentLoaded', () => {
  loadBranding();
});

// ── Load restaurant branding ─────────────────────────────────
async function loadBranding() {
  try {
    const settings = await fetch('/api/settings').then(r => r.json());
    if (settings.restaurant_name) {
      document.getElementById('login-title').textContent = settings.restaurant_name;
      document.title = `Giriş — ${settings.restaurant_name}`;
    }
    if (settings.restaurant_logo) {
      document.getElementById('login-logo').innerHTML = `<img src="${settings.restaurant_logo}" alt="Logo">`;
    }
  } catch (e) { /* settings may not be accessible without auth, that's ok */ }
}

// ── Handle Login ─────────────────────────────────────────────
async function handleLogin(event) {
  event.preventDefault();
  
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const btn = document.getElementById('login-btn');
  const error = document.getElementById('login-error');
  
  if (!username || !password) {
    showError('Kullanıcı adı ve şifre gerekli');
    return;
  }
  
  btn.classList.add('loading');
  error.classList.remove('active');
  
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    
    if (!res.ok) {
      showError(data.error || 'Giriş başarısız');
      btn.classList.remove('loading');
      return;
    }
    
    // Success — redirect to home (server will route based on role)
    window.location.href = '/';
    
  } catch (err) {
    showError('Bağlantı hatası');
    btn.classList.remove('loading');
  }
}

// ── Quick Login ──────────────────────────────────────────────
function quickLogin(username, password) {
  document.getElementById('username').value = username;
  document.getElementById('password').value = password;
  document.getElementById('login-form').dispatchEvent(new Event('submit'));
}

// ── Error Display ────────────────────────────────────────────
function showError(message) {
  const error = document.getElementById('login-error');
  error.textContent = '⚠️ ' + message;
  error.classList.add('active');
}
