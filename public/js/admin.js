// ╔══════════════════════════════════════════════════════════════╗
// ║  WEBYAZ RESTAURANT — Admin Panel JS                         ║
// ╚══════════════════════════════════════════════════════════════╝

let categories = [];
let products = [];
let tables = [];

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  updateClock();
  setInterval(updateClock, 1000);
});

function updateClock() {
  const now = new Date();
  document.getElementById('current-time').textContent = now.toLocaleString('tr-TR');
}

// ── Toast ────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('toast-exit'); setTimeout(() => toast.remove(), 300); }, 3000);
}

// ── Tab Navigation ───────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('panel-' + tab).classList.add('active');
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  
  const titles = { dashboard: 'Gösterge Paneli', categories: 'Kategoriler', products: 'Ürünler', tables: 'Masalar', orders: 'Siparişler', settings: 'Ayarlar' };
  document.getElementById('topbar-title').textContent = titles[tab] || tab;
  
  if (tab === 'dashboard') loadDashboard();
  else if (tab === 'categories') loadCategories();
  else if (tab === 'products') loadProducts();
  else if (tab === 'tables') loadTables();
  else if (tab === 'orders') loadOrders();
  else if (tab === 'settings') loadSettings();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ── API Helper ───────────────────────────────────────────────
async function api(url, options = {}) {
  try {
    if (options.body && !(options.body instanceof FormData)) {
      options.headers = { 'Content-Type': 'application/json', ...options.headers };
      options.body = JSON.stringify(options.body);
    }
    const res = await fetch('/api' + url, options);
    return await res.json();
  } catch (err) {
    showToast('Bağlantı hatası: ' + err.message, 'error');
    return null;
  }
}

// ── Dashboard ────────────────────────────────────────────────
async function loadDashboard() {
  const summary = await api('/reports/summary');
  if (!summary) return;
  
  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon orange">📦</div>
      <div><div class="stat-value">${summary.today_orders}</div><div class="stat-label">Bugünkü Sipariş</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon green">💰</div>
      <div><div class="stat-value">₺${(summary.today_revenue || 0).toLocaleString('tr-TR')}</div><div class="stat-label">Günlük Ciro</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon blue">🔄</div>
      <div><div class="stat-value">${summary.active_orders}</div><div class="stat-label">Aktif Sipariş</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon gold">🪑</div>
      <div><div class="stat-value">${summary.active_tables}/${summary.total_tables}</div><div class="stat-label">Dolu Masa</div></div>
    </div>
  `;

  const orders = await api('/orders?today=1');
  const tbody = document.getElementById('recent-orders-body');
  if (!orders || orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding:32px">Bugün henüz sipariş yok</td></tr>';
    return;
  }
  tbody.innerHTML = orders.slice(0, 10).map(o => `
    <tr>
      <td><strong>#${o.id}</strong></td>
      <td>${o.table_name || '-'}</td>
      <td>${o.customer_name}</td>
      <td><strong>₺${o.total_amount.toLocaleString('tr-TR')}</strong></td>
      <td><span class="badge badge-${o.status}">${statusText(o.status)}</span></td>
      <td class="text-sm text-muted">${new Date(o.created_at).toLocaleTimeString('tr-TR')}</td>
    </tr>
  `).join('');
}

function statusText(s) {
  const map = { pending: 'Beklemede', preparing: 'Hazırlanıyor', ready: 'Hazır', delivered: 'Teslim', paid: 'Ödendi', cancelled: 'İptal' };
  return map[s] || s;
}

// ── Categories ───────────────────────────────────────────────
async function loadCategories() {
  categories = await api('/categories') || [];
  const tbody = document.getElementById('categories-body');
  tbody.innerHTML = categories.map(c => `
    <tr>
      <td style="font-size:1.5rem">${c.icon}</td>
      <td><strong>${c.name}</strong></td>
      <td>${c.sort_order}</td>
      <td><span class="badge ${c.is_active ? 'badge-ready' : 'badge-cancelled'}">${c.is_active ? 'Aktif' : 'Pasif'}</span></td>
      <td>
        <div class="flex gap-sm">
          <button class="btn btn-sm btn-secondary" onclick="editCategory(${c.id})">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="deleteCategory(${c.id})">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openCategoryModal(cat = null) {
  document.getElementById('category-modal-title').textContent = cat ? 'Kategori Düzenle' : 'Yeni Kategori';
  document.getElementById('category-id').value = cat ? cat.id : '';
  document.getElementById('category-name').value = cat ? cat.name : '';
  document.getElementById('category-icon').value = cat ? cat.icon : '🍽️';
  document.getElementById('category-sort').value = cat ? cat.sort_order : 0;
  document.getElementById('category-modal').classList.add('active');
}

function closeCategoryModal() { document.getElementById('category-modal').classList.remove('active'); }

function editCategory(id) {
  const cat = categories.find(c => c.id === id);
  if (cat) openCategoryModal(cat);
}

async function saveCategory() {
  const id = document.getElementById('category-id').value;
  const data = {
    name: document.getElementById('category-name').value,
    icon: document.getElementById('category-icon').value,
    sort_order: parseInt(document.getElementById('category-sort').value) || 0,
    is_active: 1,
  };
  if (!data.name) return showToast('Kategori adı gerekli', 'error');
  
  if (id) await api('/categories/' + id, { method: 'PUT', body: data });
  else await api('/categories', { method: 'POST', body: data });
  
  closeCategoryModal();
  loadCategories();
  showToast('Kategori kaydedildi', 'success');
}

async function deleteCategory(id) {
  if (!confirm('Bu kategoriyi silmek istediğinize emin misiniz?')) return;
  await api('/categories/' + id, { method: 'DELETE' });
  loadCategories();
  showToast('Kategori silindi', 'success');
}

// ── Products ─────────────────────────────────────────────────
let productFilterCategory = null;

async function loadProducts() {
  if (categories.length === 0) categories = await api('/categories') || [];
  products = await api('/products') || [];
  
  // Filter chips
  const chips = document.getElementById('product-filter-chips');
  chips.innerHTML = `<button class="category-chip ${!productFilterCategory ? 'active' : ''}" onclick="filterProducts(null)">Tümü</button>` +
    categories.map(c => `<button class="category-chip ${productFilterCategory === c.id ? 'active' : ''}" onclick="filterProducts(${c.id})">${c.icon} ${c.name}</button>`).join('');
  
  renderProducts();
}

function filterProducts(catId) {
  productFilterCategory = catId;
  loadProducts();
}

function renderProducts() {
  const grid = document.getElementById('products-grid');
  let filtered = products;
  if (productFilterCategory) filtered = products.filter(p => p.category_id === productFilterCategory);
  
  grid.innerHTML = filtered.map(p => `
    <div class="product-card-admin">
      <div class="product-card-image">${p.image_path ? `<img src="${p.image_path}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover">` : '🍽️'}</div>
      <div class="product-card-body">
        <div class="product-card-name">${p.name}</div>
        <div class="product-card-desc">${p.description || ''}</div>
        <div class="product-card-footer">
          <div class="product-card-price">₺${p.price.toLocaleString('tr-TR')}</div>
          <div class="product-card-actions">
            <button class="btn btn-sm btn-secondary" onclick="editProduct(${p.id})">✏️</button>
            <button class="btn btn-sm btn-danger" onclick="deleteProduct(${p.id})">🗑️</button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function openProductModal(prod = null) {
  document.getElementById('product-modal-title').textContent = prod ? 'Ürün Düzenle' : 'Yeni Ürün';
  document.getElementById('product-id').value = prod ? prod.id : '';
  document.getElementById('product-name').value = prod ? prod.name : '';
  document.getElementById('product-desc').value = prod ? prod.description : '';
  document.getElementById('product-price').value = prod ? prod.price : '';
  document.getElementById('product-preptime').value = prod ? prod.preparation_time : 15;
  document.getElementById('product-sort').value = prod ? prod.sort_order : 0;
  
  const catSelect = document.getElementById('product-category');
  catSelect.innerHTML = '<option value="">Kategori Seçin</option>' + categories.map(c => 
    `<option value="${c.id}" ${prod && prod.category_id === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>`
  ).join('');
  
  document.getElementById('product-modal').classList.add('active');
}

function closeProductModal() { document.getElementById('product-modal').classList.remove('active'); }

function editProduct(id) {
  const prod = products.find(p => p.id === id);
  if (prod) openProductModal(prod);
}

async function saveProduct() {
  const id = document.getElementById('product-id').value;
  const imageFile = document.getElementById('product-image').files[0];
  let image_path = '';
  
  if (imageFile) {
    const formData = new FormData();
    formData.append('image', imageFile);
    const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
    const uploadData = await uploadRes.json();
    image_path = uploadData.path || '';
  }
  
  const data = {
    name: document.getElementById('product-name').value,
    description: document.getElementById('product-desc').value,
    price: parseFloat(document.getElementById('product-price').value) || 0,
    category_id: parseInt(document.getElementById('product-category').value) || null,
    image_path: image_path || (id ? products.find(p => p.id == id)?.image_path || '' : ''),
    is_active: 1,
    preparation_time: parseInt(document.getElementById('product-preptime').value) || 15,
    sort_order: parseInt(document.getElementById('product-sort').value) || 0,
  };
  if (!data.name) return showToast('Ürün adı gerekli', 'error');
  if (!data.price) return showToast('Fiyat gerekli', 'error');
  
  if (id) await api('/products/' + id, { method: 'PUT', body: data });
  else await api('/products', { method: 'POST', body: data });
  
  closeProductModal();
  loadProducts();
  showToast('Ürün kaydedildi', 'success');
}

async function deleteProduct(id) {
  if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
  await api('/products/' + id, { method: 'DELETE' });
  loadProducts();
  showToast('Ürün silindi', 'success');
}

// ── Tables ───────────────────────────────────────────────────
async function loadTables() {
  tables = await api('/tables') || [];
  const grid = document.getElementById('tables-grid');
  grid.innerHTML = tables.map(t => `
    <div class="table-card ${t.status}" onclick="editTable(${t.id})">
      <div class="table-card-name">${t.name}</div>
      <div class="table-card-info">${t.capacity} kişilik • ${t.floor}</div>
      <div class="table-card-status">
        <span class="badge badge-${t.status === 'available' ? 'ready' : 'cancelled'}">${t.status === 'available' ? 'Boş' : 'Dolu'}</span>
      </div>
      ${t.active_orders > 0 ? `<div style="margin-top:8px;font-size:0.85rem;font-weight:700;color:var(--primary)">₺${t.active_total.toLocaleString('tr-TR')}</div>` : ''}
    </div>
  `).join('');
}

function openTableModal(t = null) {
  document.getElementById('table-modal-title').textContent = t ? 'Masa Düzenle' : 'Yeni Masa';
  document.getElementById('table-id').value = t ? t.id : '';
  document.getElementById('table-name').value = t ? t.name : '';
  document.getElementById('table-capacity').value = t ? t.capacity : 4;
  document.getElementById('table-floor').value = t ? t.floor : 'Zemin Kat';
  document.getElementById('table-modal').classList.add('active');
}

function closeTableModal() { document.getElementById('table-modal').classList.remove('active'); }

function editTable(id) {
  const t = tables.find(x => x.id === id);
  if (t) openTableModal(t);
}

async function saveTable() {
  const id = document.getElementById('table-id').value;
  const data = {
    name: document.getElementById('table-name').value,
    capacity: parseInt(document.getElementById('table-capacity').value) || 4,
    status: 'available',
    floor: document.getElementById('table-floor').value || 'Zemin Kat',
  };
  if (!data.name) return showToast('Masa adı gerekli', 'error');
  
  if (id) {
    const existing = tables.find(t => t.id == id);
    data.status = existing ? existing.status : 'available';
    await api('/tables/' + id, { method: 'PUT', body: data });
  } else {
    await api('/tables', { method: 'POST', body: data });
  }
  
  closeTableModal();
  loadTables();
  showToast('Masa kaydedildi', 'success');
}

// ── Orders ───────────────────────────────────────────────────
async function loadOrders() {
  const status = document.getElementById('order-status-filter').value;
  const url = '/orders?today=1' + (status ? '&status=' + status : '');
  const orders = await api(url) || [];
  
  const tbody = document.getElementById('orders-body');
  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted" style="padding:32px">Sipariş bulunamadı</td></tr>';
    return;
  }
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td><strong>#${o.id}</strong></td>
      <td>${o.table_name || '-'}</td>
      <td>${o.customer_name}</td>
      <td>${o.customer_phone}</td>
      <td><strong>₺${o.total_amount.toLocaleString('tr-TR')}</strong></td>
      <td><span class="badge badge-${o.status}">${statusText(o.status)}</span></td>
      <td class="text-sm text-muted">${new Date(o.created_at).toLocaleTimeString('tr-TR')}</td>
      <td>
        <select class="form-select" style="width:auto;padding:4px 8px;font-size:0.78rem" onchange="updateOrderStatus(${o.id}, this.value)">
          <option value="pending" ${o.status==='pending'?'selected':''}>Beklemede</option>
          <option value="preparing" ${o.status==='preparing'?'selected':''}>Hazırlanıyor</option>
          <option value="ready" ${o.status==='ready'?'selected':''}>Hazır</option>
          <option value="delivered" ${o.status==='delivered'?'selected':''}>Teslim</option>
          <option value="paid" ${o.status==='paid'?'selected':''}>Ödendi</option>
          <option value="cancelled" ${o.status==='cancelled'?'selected':''}>İptal</option>
        </select>
      </td>
    </tr>
  `).join('');
}

async function updateOrderStatus(id, status) {
  await api('/orders/' + id + '/status', { method: 'PUT', body: { status } });
  showToast(`Sipariş #${id} durumu güncellendi`, 'success');
}

// ── Settings ─────────────────────────────────────────────────
let currentSettings = {};
let settingsColor = '#f97316';

async function loadSettings() {
  currentSettings = await api('/settings') || {};
  document.getElementById('set-name').value = currentSettings.restaurant_name || '';
  document.getElementById('set-phone').value = currentSettings.restaurant_phone || '';
  document.getElementById('set-address').value = currentSettings.restaurant_address || '';
  document.getElementById('set-taxno').value = currentSettings.tax_no || '';
  document.getElementById('set-footer').value = currentSettings.footer_text || '';
  settingsColor = currentSettings.primary_color || '#f97316';
  
  // Update color dots
  document.querySelectorAll('#set-colors .color-dot').forEach(d => {
    d.classList.toggle('active', d.dataset.color === settingsColor);
    d.style.borderColor = d.dataset.color === settingsColor ? '#fff' : 'transparent';
  });
  
  // Update logo preview
  const preview = document.getElementById('set-logo-preview');
  if (currentSettings.restaurant_logo) {
    preview.innerHTML = `<img src="${currentSettings.restaurant_logo}" style="width:100%;height:100%;object-fit:contain">`;
  }
}

function selectSettingsColor(el) {
  document.querySelectorAll('#set-colors .color-dot').forEach(d => {
    d.classList.remove('active');
    d.style.borderColor = 'transparent';
  });
  el.classList.add('active');
  el.style.borderColor = '#fff';
  settingsColor = el.dataset.color;
}

async function uploadSettingsLogo(input) {
  if (!input.files || !input.files[0]) return;
  const formData = new FormData();
  formData.append('image', input.files[0]);
  const res = await fetch('/api/upload', { method: 'POST', body: formData });
  const data = await res.json();
  if (data.path) {
    currentSettings.restaurant_logo = data.path;
    document.getElementById('set-logo-preview').innerHTML = `<img src="${data.path}" style="width:100%;height:100%;object-fit:contain">`;
    showToast('Logo yüklendi', 'success');
  }
}

async function saveSettings() {
  const data = {
    restaurant_name: document.getElementById('set-name').value.trim(),
    restaurant_phone: document.getElementById('set-phone').value.trim(),
    restaurant_address: document.getElementById('set-address').value.trim(),
    tax_no: document.getElementById('set-taxno').value.trim(),
    footer_text: document.getElementById('set-footer').value.trim(),
    primary_color: settingsColor,
    is_setup_complete: 'true',
  };
  if (currentSettings.restaurant_logo) data.restaurant_logo = currentSettings.restaurant_logo;
  if (!data.restaurant_name) return showToast('Restoran adı gerekli', 'error');
  
  await api('/settings', { method: 'PUT', body: data });
  showToast('Ayarlar kaydedildi!', 'success');
  
  // Update sidebar logo text
  const logoText = document.querySelector('.sidebar-logo-text');
  if (logoText) {
    const parts = data.restaurant_name.split(' ');
    logoText.innerHTML = parts[0] + (parts.length > 1 ? ' <span>' + parts.slice(1).join(' ') + '</span>' : '');
  }
}
