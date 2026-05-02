// ╔══════════════════════════════════════════════════════════════╗
// ║  WEBYAZ RESTAURANT — Setup Wizard JS                        ║
// ╚══════════════════════════════════════════════════════════════╝

let currentStep = 1;
const totalSteps = 5;
let selectedColor = '#f97316';
let logoFile = null;

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderStepIndicator();
  updateProgress();
  loadExistingSettings();
});

// ── Step Navigation ──────────────────────────────────────────
function nextStep() {
  if (currentStep === 2) {
    const name = document.getElementById('inp-name').value.trim();
    const phone = document.getElementById('inp-phone').value.trim();
    if (!name) { shakeInput('inp-name'); return; }
    if (!phone) { shakeInput('inp-phone'); return; }
  }
  
  if (currentStep < totalSteps) {
    document.getElementById(`step-${currentStep}`).classList.remove('active');
    currentStep++;
    document.getElementById(`step-${currentStep}`).classList.add('active');
    updateProgress();
    renderStepIndicator();
    if (currentStep === 4) loadServerURL();
  }
}

function prevStep() {
  if (currentStep > 1) {
    document.getElementById(`step-${currentStep}`).classList.remove('active');
    currentStep--;
    document.getElementById(`step-${currentStep}`).classList.add('active');
    updateProgress();
    renderStepIndicator();
  }
}

function updateProgress() {
  const pct = (currentStep / totalSteps) * 100;
  document.getElementById('progress-bar').style.width = pct + '%';
}

function renderStepIndicator() {
  const container = document.getElementById('steps-indicator');
  container.innerHTML = '';
  for (let i = 1; i <= totalSteps; i++) {
    const dot = document.createElement('div');
    dot.className = 'step-dot';
    if (i === currentStep) dot.classList.add('active');
    if (i < currentStep) dot.classList.add('done');
    container.appendChild(dot);
  }
}

function shakeInput(id) {
  const el = document.getElementById(id);
  el.style.borderColor = '#ef4444';
  el.style.animation = 'shake 0.4s ease';
  el.focus();
  setTimeout(() => { el.style.animation = ''; }, 400);
}

// ── Logo ─────────────────────────────────────────────────────
function previewLogo(input) {
  if (input.files && input.files[0]) {
    logoFile = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById('logo-preview').innerHTML = `
        <img src="${e.target.result}" alt="Logo">
        <span style="color:var(--success);font-weight:600">✓ Logo yüklendi</span>
        <span class="logo-hint">Değiştirmek için tıklayın</span>
      `;
    };
    reader.readAsDataURL(input.files[0]);
  }
}

// ── Color ────────────────────────────────────────────────────
function selectColor(el) {
  document.querySelectorAll('.color-option').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  selectedColor = el.dataset.color;
}

// ── Load Existing Settings ───────────────────────────────────
async function loadExistingSettings() {
  try {
    const settings = await fetch('/api/settings').then(r => r.json());
    if (settings.restaurant_name && settings.restaurant_name !== 'Webyaz Restaurant') {
      document.getElementById('inp-name').value = settings.restaurant_name;
    }
    if (settings.restaurant_phone && settings.restaurant_phone !== '0212 555 00 00') {
      document.getElementById('inp-phone').value = settings.restaurant_phone;
    }
    if (settings.restaurant_address && settings.restaurant_address !== 'İstanbul, Türkiye') {
      document.getElementById('inp-address').value = settings.restaurant_address;
    }
    if (settings.tax_no) document.getElementById('inp-taxno').value = settings.tax_no;
    if (settings.footer_text) document.getElementById('inp-footer').value = settings.footer_text;
    if (settings.primary_color) {
      selectedColor = settings.primary_color;
      document.querySelectorAll('.color-option').forEach(c => {
        c.classList.toggle('active', c.dataset.color === selectedColor);
      });
    }
  } catch (e) {}
}

// ── Complete Setup ───────────────────────────────────────────
async function completeSetup() {
  // Show loading
  const loading = document.createElement('div');
  loading.className = 'setup-loading';
  loading.innerHTML = '<div class="setup-spinner"></div><div style="color:#fff;font-weight:600">Kurulum tamamlanıyor...</div>';
  document.body.appendChild(loading);

  try {
    // Upload logo if selected
    let logoUrl = '';
    if (logoFile) {
      const formData = new FormData();
      formData.append('image', logoFile);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (uploadData.path) logoUrl = uploadData.path;
    }

    // Save settings
    const settings = {
      restaurant_name: document.getElementById('inp-name').value.trim() || 'Webyaz Restaurant',
      restaurant_phone: document.getElementById('inp-phone').value.trim() || '',
      restaurant_address: document.getElementById('inp-address').value.trim() || '',
      tax_no: document.getElementById('inp-taxno').value.trim() || '',
      footer_text: document.getElementById('inp-footer').value.trim() || 'Afiyet olsun! Teşekkür ederiz.',
      primary_color: selectedColor,
      is_setup_complete: 'true',
    };
    if (logoUrl) settings.restaurant_logo = logoUrl;

    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });

    // Remove loading, show success
    loading.remove();
    document.getElementById(`step-${currentStep}`).classList.remove('active');
    currentStep = 5;
    document.getElementById(`step-${currentStep}`).classList.add('active');
    updateProgress();
    renderStepIndicator();
    loadServerURL();

  } catch (err) {
    loading.remove();
    alert('Kurulum sırasında bir hata oluştu: ' + err.message);
  }
}

// Shake animation
const style = document.createElement('style');
style.textContent = `@keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }`;
document.head.appendChild(style);

// ── Server URL ───────────────────────────────────────────────
async function loadServerURL() {
  try {
    const info = await fetch('/api/server-info').then(r => r.json());
    const url = `http://${info.ip}:${info.port}`;
    const el1 = document.getElementById('setup-server-url');
    const el2 = document.getElementById('complete-server-url');
    if (el1) el1.textContent = url;
    if (el2) el2.textContent = url;
  } catch(e) {
    const el1 = document.getElementById('setup-server-url');
    if (el1) el1.textContent = 'http://localhost:3000';
  }
}

// ── Staff User ───────────────────────────────────────────────
const addedStaff = [];

async function addStaffUser() {
  const username = document.getElementById('staff-username').value.trim();
  const password = document.getElementById('staff-password').value.trim();
  const name = document.getElementById('staff-name').value.trim();
  const role = document.getElementById('staff-role').value;
  const msg = document.getElementById('staff-msg');

  if (!username || !password || !name) {
    msg.innerHTML = '<span style="color:#ef4444">Tüm alanları doldurun</span>';
    return;
  }

  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, display_name: name, role })
    });
    const data = await res.json();
    if (data.error) {
      msg.innerHTML = `<span style="color:#ef4444">${data.error}</span>`;
      return;
    }

    addedStaff.push({ username, name, role });
    renderStaffList();

    document.getElementById('staff-username').value = '';
    document.getElementById('staff-password').value = '';
    document.getElementById('staff-name').value = '';
    msg.innerHTML = `<span style="color:#22c55e">✅ ${name} eklendi!</span>`;
  } catch(e) {
    msg.innerHTML = '<span style="color:#ef4444">Hata oluştu</span>';
  }
}

function renderStaffList() {
  const roleLabels = { waiter:'👤 Garson', kitchen:'👨‍🍳 Mutfak', cashier:'💰 Kasacı', delivery:'📦 Kurye' };
  document.getElementById('staff-list').innerHTML = addedStaff.map(s => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--bg-primary);border-radius:8px;border:1px solid var(--border-primary)">
      <div>
        <span style="font-weight:700;font-size:0.85rem">${s.name}</span>
        <span style="color:var(--text-muted);font-size:0.75rem;margin-left:8px">${s.username}</span>
      </div>
      <span style="font-size:0.75rem;padding:3px 8px;border-radius:6px;background:var(--bg-hover)">${roleLabels[s.role] || s.role}</span>
    </div>
  `).join('');
}
