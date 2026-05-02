// ╔══════════════════════════════════════════════════════════════╗
// ║  WEBYAZ RESTAURANT — Admin Panel JS                         ║
// ╚══════════════════════════════════════════════════════════════╝

let categories = [];
let products = [];
let tables = [];

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadCurrentUser();
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
  // Close sidebar on mobile after tab switch
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
  
  const titles = { dashboard: 'Gösterge Paneli', categories: 'Kategoriler', products: 'Ürünler', tables: 'Masalar', qrcodes: 'QR Kod Menüleri', reviews: 'Yorum Yönetimi', orders: 'Siparişler', reports: 'Raporlar', staff: 'Personel Yönetimi', accounts: 'Cari Hesaplar', inventory: 'Stok Yönetimi', reservations: 'Rezervasyonlar', expenses: 'Gider Yönetimi', users: 'Kullanıcılar', settings: 'Ayarlar' };
  document.getElementById('topbar-title').textContent = titles[tab] || tab;
  
  if (tab === 'dashboard') loadDashboard();
  else if (tab === 'categories') loadCategories();
  else if (tab === 'products') loadProducts();
  else if (tab === 'tables') loadTables();
  else if (tab === 'qrcodes') loadQRCodes();
  else if (tab === 'reviews') loadReviews();
  else if (tab === 'orders') loadOrders();
  else if (tab === 'reports') loadReports();
  else if (tab === 'staff') loadStaff();
  else if (tab === 'accounts') loadAccounts();
  else if (tab === 'inventory') loadInventory();
  else if (tab === 'reservations') loadReservations();
  else if (tab === 'expenses') loadExpenses();
  else if (tab === 'users') loadUsers();
  else if (tab === 'settings') loadSettings();
}

function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('open');
  const overlay = document.querySelector('.sidebar-overlay');
  if (overlay) overlay.classList.toggle('active');
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
          <div>
            <div class="product-card-price">₺${p.price.toLocaleString('tr-TR')}</div>
            ${p.cost_price ? `<div style="font-size:0.65rem;color:var(--text-muted)">Alış: ₺${p.cost_price.toLocaleString('tr-TR')} | Kâr: ₺${(p.price - p.cost_price).toLocaleString('tr-TR')}</div>` : ''}
          </div>
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
  document.getElementById('product-cost').value = prod ? (prod.cost_price || '') : '';
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
    cost_price: parseFloat(document.getElementById('product-cost').value) || 0,
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
  tables.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr', { numeric: true }));
  const grid = document.getElementById('tables-grid');
  grid.innerHTML = tables.map(t => {
    const isPaket = (t.name || '').toLowerCase().includes('paket') || (t.floor || '').toLowerCase().includes('paket');
    return `
    <div class="table-card ${t.status}" onclick="editTable(${t.id})" style="${isPaket ? 'border:2px solid #a855f7;background:rgba(168,85,247,0.08)' : ''}">
      <div class="table-card-name">${isPaket ? '📦 ' : ''}${t.name}</div>
      <div class="table-card-info">${isPaket ? 'Paket Servis' : t.capacity + ' kişilik • ' + t.floor}</div>
      <div class="table-card-status">
        <span class="badge badge-${t.status === 'available' ? 'ready' : 'cancelled'}">${t.status === 'available' ? 'Boş' : 'Dolu'}</span>
      </div>
      ${t.active_orders > 0 ? `<div style="margin-top:8px;font-size:0.85rem;font-weight:700;color:var(--primary)">₺${t.active_total.toLocaleString('tr-TR')}</div>` : ''}
    </div>`;
  }).join('');
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

async function addPaketTable() {
  const paketCount = tables.filter(t => (t.name || '').toLowerCase().includes('paket')).length;
  const nextNum = paketCount + 1;
  await api('/tables', { method: 'POST', body: {
    name: 'Paket ' + nextNum,
    capacity: 1,
    floor: 'Paket Servis'
  }});
  loadTables();
  showToast('📦 Paket ' + nextNum + ' eklendi', 'success');
}

// ── Table Transfer / Merge ──────────────────────────────────

let mergeSelectedSources = new Set();

function populateTableDropdown(selectEl, excludeId = null, onlyActive = false) {
  const list = onlyActive ? tables.filter(t => t.active_orders > 0) : tables;
  selectEl.innerHTML = '<option value="">Masa seçin...</option>' +
    list.filter(t => !excludeId || t.id !== excludeId).map(t => {
      const info = t.active_orders > 0 ? ` (${t.active_orders} sipariş - ₺${t.active_total.toLocaleString('tr-TR')})` : ' (Boş)';
      return `<option value="${t.id}">${t.name}${info}</option>`;
    }).join('');
}

function openTransferModal() {
  populateTableDropdown(document.getElementById('transfer-from'), null, true);
  populateTableDropdown(document.getElementById('transfer-to'));
  document.getElementById('transfer-modal').classList.add('active');
}
function closeTransferModal() { document.getElementById('transfer-modal').classList.remove('active'); }

async function executeTransfer() {
  const from = document.getElementById('transfer-from').value;
  const to = document.getElementById('transfer-to').value;
  if (!from || !to) return showToast('Kaynak ve hedef masa seçin', 'error');
  if (from === to) return showToast('Aynı masaya taşınamaz', 'error');

  const fromName = tables.find(t => t.id == from)?.name || from;
  const toName = tables.find(t => t.id == to)?.name || to;
  if (!confirm(`${fromName} masasındaki tüm siparişler ${toName} masasına taşınsın mı?`)) return;

  const res = await fetch('/api/tables/transfer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from_table_id: +from, to_table_id: +to }) });
  const result = await res.json();
  if (!res.ok) { showToast(result.error || 'Hata oluştu', 'error'); return; }

  closeTransferModal();
  loadTables();
  showToast(`🔄 ${result.message}`, 'success');
}

function openMergeModal() {
  mergeSelectedSources = new Set();
  populateTableDropdown(document.getElementById('merge-target'));

  // Source table grid with checkboxes
  const grid = document.getElementById('merge-sources');
  const activeTables = tables.filter(t => t.active_orders > 0);
  if (activeTables.length === 0) {
    grid.innerHTML = '<div style="color:var(--text-muted);padding:16px">Aktif siparişi olan masa yok</div>';
  } else {
    grid.innerHTML = activeTables.map(t => `
      <label style="display:flex;align-items:center;gap:6px;padding:10px;border-radius:8px;cursor:pointer;
        background:var(--bg-tertiary);border:2px solid transparent;transition:all 0.2s" 
        id="merge-src-${t.id}" onclick="toggleMergeSource(${t.id})">
        <input type="checkbox" id="merge-cb-${t.id}" style="pointer-events:none">
        <div>
          <div style="font-weight:700;font-size:0.85rem">${t.name}</div>
          <div style="font-size:0.7rem;color:var(--text-muted)">${t.active_orders} sipariş</div>
          <div style="font-size:0.7rem;color:var(--primary);font-weight:600">₺${t.active_total.toLocaleString('tr-TR')}</div>
        </div>
      </label>
    `).join('');
  }
  document.getElementById('merge-modal').classList.add('active');
}
function closeMergeModal() { document.getElementById('merge-modal').classList.remove('active'); }

function toggleMergeSource(id) {
  if (mergeSelectedSources.has(id)) {
    mergeSelectedSources.delete(id);
    document.getElementById('merge-src-' + id).style.borderColor = 'transparent';
    document.getElementById('merge-cb-' + id).checked = false;
  } else {
    mergeSelectedSources.add(id);
    document.getElementById('merge-src-' + id).style.borderColor = '#a855f7';
    document.getElementById('merge-cb-' + id).checked = true;
  }
}

async function executeMerge() {
  const target = document.getElementById('merge-target').value;
  if (!target) return showToast('Hedef masa seçin', 'error');
  if (mergeSelectedSources.size === 0) return showToast('En az bir kaynak masa seçin', 'error');

  const sourceIds = Array.from(mergeSelectedSources);
  const targetName = tables.find(t => t.id == target)?.name || target;
  const sourceNames = sourceIds.map(id => tables.find(t => t.id == id)?.name || id).join(', ');
  
  if (!confirm(`${sourceNames} masalarındaki siparişler ${targetName} masasına birleştirilsin mi?`)) return;

  const res = await fetch('/api/tables/merge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source_table_ids: sourceIds, target_table_id: +target }) });
  const result = await res.json();
  if (!res.ok) { showToast(result.error || 'Hata oluştu', 'error'); return; }

  closeMergeModal();
  loadTables();
  showToast(`🔗 ${result.message}`, 'success');
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
  
  // Social media
  document.getElementById('set-instagram').value = currentSettings.social_instagram || '';
  document.getElementById('set-facebook').value = currentSettings.social_facebook || '';
  document.getElementById('set-twitter').value = currentSettings.social_twitter || '';
  document.getElementById('set-whatsapp').value = currentSettings.social_whatsapp || '';
  document.getElementById('set-website').value = currentSettings.social_website || '';
  document.getElementById('set-youtube').value = currentSettings.social_youtube || '';
  
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
    social_instagram: document.getElementById('set-instagram').value.trim(),
    social_facebook: document.getElementById('set-facebook').value.trim(),
    social_twitter: document.getElementById('set-twitter').value.trim(),
    social_whatsapp: document.getElementById('set-whatsapp').value.trim(),
    social_website: document.getElementById('set-website').value.trim(),
    social_youtube: document.getElementById('set-youtube').value.trim(),
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

// ── Auth / Current User ──────────────────────────────────────
async function loadCurrentUser() {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return;
    const user = await res.json();
    const el = document.getElementById('user-display');
    if (el) {
      const roleIcons = { admin: '👨‍💼', cashier: '💰', kitchen: '👨‍🍳', waiter: '🧑‍🍳', delivery: '📦' };
      el.textContent = `${roleIcons[user.role] || ''} ${user.display_name}`;
    }
  } catch (e) {}
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/login.html';
}

// ── Users ─────────────────────────────────────────────────
let allUsers = [];

const ROLE_LABELS = {
  admin: '👨‍💼 Yönetici',
  cashier: '💰 Kasacı',
  kitchen: '👨‍🍳 Mutfak',
  waiter: '🧑‍🍳 Garson',
  delivery: '📦 Paket Servis',
};

async function loadUsers() {
  allUsers = await api('/users') || [];
  const tbody = document.getElementById('users-body');
  if (allUsers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted" style="padding:32px">Kullanıcı bulunamadı</td></tr>';
    return;
  }
  tbody.innerHTML = allUsers.map(u => `
    <tr>
      <td><strong>${u.username}</strong></td>
      <td>${u.display_name}</td>
      <td>${ROLE_LABELS[u.role] || u.role}</td>
      <td><span class="badge ${u.is_active ? 'badge-ready' : 'badge-cancelled'}">${u.is_active ? 'Aktif' : 'Pasif'}</span></td>
      <td>
        <div class="flex gap-sm">
          <button class="btn btn-sm btn-secondary" onclick="editUser(${u.id})">✏️</button>
          ${u.id !== 1 ? `<button class="btn btn-sm btn-danger" onclick="deleteUser(${u.id})">🗑️</button>` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

function openUserModal(user = null) {
  document.getElementById('user-modal-title').textContent = user ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı';
  document.getElementById('user-id').value = user ? user.id : '';
  document.getElementById('user-username').value = user ? user.username : '';
  document.getElementById('user-password').value = '';
  document.getElementById('user-password').placeholder = user ? 'İstersen değiştir (boş bırakırsan değişmez)' : 'Şifre belirleyin';
  document.getElementById('user-displayname').value = user ? user.display_name : '';
  document.getElementById('user-role').value = user ? user.role : 'waiter';
  document.getElementById('user-modal').classList.add('active');
}

function closeUserModal() { document.getElementById('user-modal').classList.remove('active'); }

function editUser(id) {
  const user = allUsers.find(u => u.id === id);
  if (user) openUserModal(user);
}

async function saveUser() {
  const id = document.getElementById('user-id').value;
  const data = {
    username: document.getElementById('user-username').value.trim(),
    display_name: document.getElementById('user-displayname').value.trim(),
    role: document.getElementById('user-role').value,
  };
  const password = document.getElementById('user-password').value;
  if (password) data.password = password;
  
  if (!data.username) return showToast('Kullanıcı adı gerekli', 'error');
  if (!data.display_name) return showToast('Görünen ad gerekli', 'error');
  if (!id && !password) return showToast('Şifre gerekli', 'error');
  
  const result = id 
    ? await api('/users/' + id, { method: 'PUT', body: data })
    : await api('/users', { method: 'POST', body: data });
  
  if (result && result.error) return showToast(result.error, 'error');
  
  closeUserModal();
  loadUsers();
  showToast('Kullanıcı kaydedildi', 'success');
}

async function deleteUser(id) {
  if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;
  const result = await api('/users/' + id, { method: 'DELETE' });
  if (result && result.error) return showToast(result.error, 'error');
  loadUsers();
  showToast('Kullanıcı silindi', 'success');
}

// ══════════════════════════════════════════════════════════════
//  REVIEWS MANAGEMENT
// ══════════════════════════════════════════════════════════════

async function loadReviews() {
  const filter = document.getElementById('review-status-filter').value;
  const reviews = await api('/reviews?status=' + filter);
  if (!reviews) return;

  const body = document.getElementById('reviews-body');
  if (reviews.length === 0) {
    body.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted)">Yorum bulunamadı</td></tr>';
    return;
  }

  body.innerHTML = reviews.map(r => `
    <tr style="${!r.is_approved ? 'background:rgba(250,204,21,0.05)' : ''}">
      <td><strong>${r.product_name || 'Silinmiş Ürün'}</strong></td>
      <td style="color:#facc15;letter-spacing:1px">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.comment || '<span style="color:var(--text-muted)">Yorum yok</span>'}</td>
      <td>${r.customer_name}</td>
      <td>${r.customer_phone || '-'}</td>
      <td>${new Date(r.created_at).toLocaleDateString('tr-TR')}</td>
      <td>${r.is_approved ? '<span class="badge" style="background:rgba(34,197,94,0.15);color:#22c55e">Onaylı</span>' : '<span class="badge" style="background:rgba(250,204,21,0.15);color:#facc15">Bekliyor</span>'}</td>
      <td>
        <div style="display:flex;gap:6px">
          ${!r.is_approved ? `<button class="btn btn-sm btn-primary" onclick="approveReview(${r.id})" style="font-size:0.7rem">✅ Onayla</button>` : ''}
          <button class="btn btn-sm btn-danger" onclick="deleteReview(${r.id})" style="font-size:0.7rem;background:#ef4444;color:#fff">🗑️ Sil</button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function approveReview(id) {
  await api('/reviews/' + id + '/approve', { method: 'PUT' });
  showToast('Yorum onaylandı ✅', 'success');
  loadReviews();
}

async function deleteReview(id) {
  if (!confirm('Bu yorumu silmek istediğinize emin misiniz?')) return;
  await api('/reviews/' + id, { method: 'DELETE' });
  showToast('Yorum silindi', 'success');
  loadReviews();
}

// ══════════════════════════════════════════════════════════════
//  STAFF / PERSONEL
// ══════════════════════════════════════════════════════════════

let staffList = [];
let selectedStaffId = null;

async function loadStaff() {
  staffList = await api('/staff') || [];
  const container = document.getElementById('staff-list');
  const fmt = (n) => Number(n || 0).toLocaleString('tr-TR');
  
  if (staffList.length === 0) {
    container.innerHTML = '<div class="card" style="padding:40px;text-align:center;color:var(--text-muted)"><div style="font-size:2rem;margin-bottom:8px">👥</div>Henüz personel eklenmedi</div>';
    document.getElementById('staff-detail').style.display = 'none';
    return;
  }

  container.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
    ${staffList.map(s => {
      const netPaid = (s.total_salary_paid || 0) + (s.total_advance || 0) + (s.total_bonus || 0) - (s.total_deduction || 0);
      return `
      <div class="card" style="padding:16px;cursor:pointer;border:2px solid ${selectedStaffId === s.id ? 'var(--primary)' : 'transparent'};transition:0.2s" onclick="selectStaff(${s.id})">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div style="display:flex;gap:12px;align-items:center">
            <div style="width:48px;height:48px;border-radius:50%;overflow:hidden;background:var(--bg-tertiary);display:flex;align-items:center;justify-content:center;flex-shrink:0;border:2px solid var(--border-primary)">
              ${s.photo ? `<img src="${s.photo}" style="width:100%;height:100%;object-fit:cover">` : `<span style="font-size:1.4rem">👤</span>`}
            </div>
            <div>
              <div style="font-weight:700;font-size:0.95rem">${s.full_name}</div>
              <div style="font-size:0.75rem;color:var(--text-muted)">${s.position || 'Belirtilmemiş'}</div>
            </div>
          </div>
          <div style="display:flex;gap:4px">
            <span class="badge ${s.is_active ? 'badge-ready' : 'badge-cancelled'}" style="font-size:0.6rem">${s.is_active ? 'Aktif' : 'Pasif'}</span>
          </div>
        </div>
        <div style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.72rem">
          <div>📱 ${s.phone || '-'}</div>
          <div style="text-align:right;font-weight:700;color:var(--primary)">Maaş: ₺${fmt(s.salary)}</div>
        </div>
        <div style="margin-top:8px;display:flex;justify-content:space-between;font-size:0.7rem;color:var(--text-muted)">
          <span>Toplam Ödenen: ₺${fmt(netPaid)}</span>
          <div style="display:flex;gap:4px">
            <button class="btn btn-sm" onclick="event.stopPropagation();selectStaff(${s.id})" style="font-size:0.6rem;padding:2px 8px;background:var(--primary);color:#fff;border:none;border-radius:4px">📋 Hareketler</button>
            <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();editStaff(${s.id})" style="font-size:0.6rem;padding:2px 6px">✏️</button>
            <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();deleteStaff(${s.id})" style="font-size:0.6rem;padding:2px 6px">🗑️</button>
          </div>
        </div>
      </div>`;
    }).join('')}
  </div>`;

  if (selectedStaffId) loadStaffTransactions(selectedStaffId);
}

function openStaffModal(s = null) {
  document.getElementById('staff-modal-title').textContent = s ? 'Personel Düzenle' : 'Yeni Personel';
  document.getElementById('staff-id').value = s ? s.id : '';
  document.getElementById('staff-name').value = s ? s.full_name : '';
  document.getElementById('staff-phone').value = s ? s.phone : '';
  document.getElementById('staff-position').value = s ? s.position : 'Garson';
  document.getElementById('staff-salary').value = s ? s.salary : '';
  document.getElementById('staff-start').value = s ? s.start_date : new Date().toISOString().split('T')[0];
  document.getElementById('staff-tc').value = s ? s.tc_no : '';
  document.getElementById('staff-address').value = s ? s.address : '';
  document.getElementById('staff-emergency').value = s ? s.emergency_contact : '';
  document.getElementById('staff-notes').value = s ? s.notes : '';
  document.getElementById('staff-photo-preview').innerHTML = s && s.photo
    ? `<img src="${s.photo}" style="width:80px;height:80px;border-radius:50%;object-fit:cover">`
    : '<span style="font-size:2rem">👤</span>';
  document.getElementById('staff-photo-path').value = s ? (s.photo || '') : '';
  document.getElementById('staff-modal').classList.add('active');
}

function closeStaffModal() { document.getElementById('staff-modal').classList.remove('active'); }

async function uploadStaffPhoto(input) {
  if (!input.files || !input.files[0]) return;
  const formData = new FormData();
  formData.append('image', input.files[0]);
  try {
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.path) {
      document.getElementById('staff-photo-path').value = data.path;
      document.getElementById('staff-photo-preview').innerHTML = `<img src="${data.path}" style="width:100%;height:100%;object-fit:cover">`;
      showToast('Fotoğraf yüklendi', 'success');
    }
  } catch(e) { showToast('Fotoğraf yüklenemedi', 'error'); }
}

function editStaff(id) {
  const s = staffList.find(x => x.id === id);
  if (s) openStaffModal(s);
}

async function saveStaff() {
  const id = document.getElementById('staff-id').value;
  const data = {
    full_name: document.getElementById('staff-name').value,
    phone: document.getElementById('staff-phone').value,
    position: document.getElementById('staff-position').value,
    salary: parseFloat(document.getElementById('staff-salary').value) || 0,
    start_date: document.getElementById('staff-start').value,
    tc_no: document.getElementById('staff-tc').value,
    address: document.getElementById('staff-address').value,
    emergency_contact: document.getElementById('staff-emergency').value,
    notes: document.getElementById('staff-notes').value,
    photo: document.getElementById('staff-photo-path').value,
    is_active: 1,
  };
  if (!data.full_name) return showToast('Ad Soyad gerekli', 'error');

  if (id) await api('/staff/' + id, { method: 'PUT', body: data });
  else await api('/staff', { method: 'POST', body: data });

  closeStaffModal();
  loadStaff();
  showToast('Personel kaydedildi', 'success');
}

async function deleteStaff(id) {
  if (!confirm('Bu personeli silmek istediğinize emin misiniz? Tüm işlem geçmişi de silinecek.')) return;
  await api('/staff/' + id, { method: 'DELETE' });
  if (selectedStaffId === id) { selectedStaffId = null; document.getElementById('staff-detail').style.display = 'none'; }
  loadStaff();
  showToast('Personel silindi', 'success');
}

async function selectStaff(id) {
  selectedStaffId = id;
  loadStaff();
}

async function loadStaffTransactions(staffId) {
  const s = staffList.find(x => x.id === staffId);
  if (!s) return;
  const fmt = (n) => Number(n || 0).toLocaleString('tr-TR');

  document.getElementById('staff-detail').style.display = 'block';
  document.getElementById('staff-detail-name').textContent = `👤 ${s.full_name} — ${s.position} | Maaş: ₺${fmt(s.salary)}`;
  document.getElementById('txn-date').value = new Date().toISOString().split('T')[0];

  // Summary cards
  const remainingSalary = (s.salary || 0) - (s.total_advance || 0) - (s.total_deduction || 0);
  document.getElementById('staff-summary-cards').innerHTML = [
    { icon: '💰', label: 'Aylık Maaş', value: '₺' + fmt(s.salary), color: '#8b5cf6' },
    { icon: '💵', label: 'Avans Verilen', value: '₺' + fmt(s.total_advance), color: '#f97316' },
    { icon: '➖', label: 'Kesinti', value: '₺' + fmt(s.total_deduction), color: '#ef4444' },
    { icon: '✅', label: 'Maaş Ödenen', value: '₺' + fmt(s.total_salary_paid), color: '#22c55e' },
    { icon: '🎁', label: 'Prim/Bonus', value: '₺' + fmt(s.total_bonus), color: '#3b82f6' },
    { icon: '💸', label: 'Kalan Maaş', value: '₺' + fmt(remainingSalary), color: remainingSalary > 0 ? '#22c55e' : '#ef4444' },
  ].map(c => `
    <div class="card" style="padding:12px;text-align:center">
      <div style="font-size:1.2rem">${c.icon}</div>
      <div style="font-size:0.65rem;color:var(--text-muted);margin:4px 0">${c.label}</div>
      <div style="font-size:1rem;font-weight:800;color:${c.color}">${c.value}</div>
    </div>
  `).join('');

  // Transactions
  const txns = await api(`/staff/${staffId}/transactions`) || [];
  const typeLabels = { salary: '💰 Maaş', advance: '💵 Avans', bonus: '🎁 Prim', deduction: '➖ Kesinti' };
  const typeColors = { salary: '#22c55e', advance: '#f97316', bonus: '#3b82f6', deduction: '#ef4444' };

  document.getElementById('staff-txn-body').innerHTML = txns.length === 0
    ? '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">Henüz işlem yok</td></tr>'
    : txns.map(t => `
      <tr>
        <td style="font-size:0.8rem">${t.date}</td>
        <td><span style="color:${typeColors[t.type] || '#888'};font-weight:700">${typeLabels[t.type] || t.type}</span></td>
        <td style="font-size:0.8rem;color:var(--text-muted)">${t.description || '-'}</td>
        <td style="text-align:right;font-weight:700;color:${typeColors[t.type]}">₺${fmt(t.amount)}</td>
        <td><button class="btn btn-sm btn-danger" onclick="deleteTransaction(${t.id})" style="font-size:0.6rem;padding:2px 6px">🗑️</button></td>
      </tr>
    `).join('');
}

async function addTransaction() {
  if (!selectedStaffId) return;
  const type = document.getElementById('txn-type').value;
  const amount = parseFloat(document.getElementById('txn-amount').value);
  const description = document.getElementById('txn-desc').value;
  const date = document.getElementById('txn-date').value;

  if (!amount || amount <= 0) return showToast('Tutar giriniz', 'error');
  if (!date) return showToast('Tarih seçiniz', 'error');

  await api(`/staff/${selectedStaffId}/transactions`, { method: 'POST', body: { type, amount, description, date } });
  document.getElementById('txn-amount').value = '';
  document.getElementById('txn-desc').value = '';
  showToast('İşlem eklendi', 'success');
  
  // Refresh staff data to get updated totals
  staffList = await api('/staff') || [];
  loadStaffTransactions(selectedStaffId);
  loadStaff();

  // Show print option for advance/salary
  if (['advance', 'salary', 'bonus'].includes(type)) {
    const s = staffList.find(x => x.id === selectedStaffId);
    const typeLabels = { advance: 'Avans', salary: 'Maaş Ödemesi', bonus: 'Prim/Bonus' };
    if (confirm(`${typeLabels[type]} makbuzu yazdırılsın mı?`)) {
      printStaffReceipt(s, type, amount, description, date);
    }
  }
}

function printStaffReceipt(staff, type, amount, description, date) {
  const typeLabels = { advance: 'AVANS MAKBUZU', salary: 'MAAŞ ÖDEMESİ', bonus: 'PRİM MAKBUZU', deduction: 'KESİNTİ BİLGİSİ' };
  const fmt = (n) => Number(n || 0).toLocaleString('tr-TR');
  
  // Get restaurant settings
  fetch('/api/settings').then(r => r.json()).then(settings => {
    const w = window.open('', '_blank', 'width=400,height=600');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>${typeLabels[type]}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Courier New', monospace; width:80mm; margin:0 auto; padding:8mm; font-size:12px; }
        .center { text-align:center; }
        .bold { font-weight:bold; }
        .line { border-top:1px dashed #000; margin:8px 0; }
        .row { display:flex; justify-content:space-between; margin:4px 0; }
        .sig-area { margin-top:40px; display:flex; justify-content:space-between; }
        .sig-box { width:45%; text-align:center; }
        .sig-line { border-top:1px solid #000; margin-top:50px; padding-top:4px; font-size:10px; }
        .title { font-size:16px; font-weight:bold; margin:8px 0; letter-spacing:2px; }
        @media print { body { width:80mm; } }
      </style></head><body>
      <div class="center">
        <div class="bold" style="font-size:14px">${settings.restaurant_name || 'Webyaz Restaurant'}</div>
        <div style="font-size:10px;margin-top:2px">${settings.restaurant_phone || ''}</div>
        <div style="font-size:9px;margin-top:2px">${settings.restaurant_address || ''}</div>
      </div>
      <div class="line"></div>
      <div class="center title">${typeLabels[type]}</div>
      <div class="line"></div>
      <div class="row"><span>Tarih:</span><span class="bold">${date}</span></div>
      <div class="row"><span>Saat:</span><span>${new Date().toLocaleTimeString('tr-TR')}</span></div>
      <div class="line"></div>
      <div class="row"><span>Personel:</span><span class="bold">${staff.full_name}</span></div>
      <div class="row"><span>Pozisyon:</span><span>${staff.position || '-'}</span></div>
      <div class="row"><span>TC No:</span><span>${staff.tc_no || '-'}</span></div>
      <div class="line"></div>
      <div class="row" style="font-size:16px;margin:12px 0">
        <span class="bold">TUTAR:</span>
        <span class="bold">₺${fmt(amount)}</span>
      </div>
      ${description ? `<div class="row"><span>Açıklama:</span><span>${description}</span></div>` : ''}
      <div class="line"></div>
      <div class="sig-area">
        <div class="sig-box">
          <div class="sig-line">Teslim Eden</div>
        </div>
        <div class="sig-box">
          <div class="sig-line">Teslim Alan<br>${staff.full_name}</div>
        </div>
      </div>
      <div class="line" style="margin-top:24px"></div>
      <div class="center" style="font-size:9px;margin-top:4px">Bu belge 2 nüsha düzenlenmiştir.</div>
      <script>window.onload=()=>{window.print();}<\/script>
    </body></html>`);
    w.document.close();
  });
}

async function deleteTransaction(txnId) {
  if (!confirm('Bu işlemi silmek istediğinize emin misiniz?')) return;
  await api('/staff/transactions/' + txnId, { method: 'DELETE' });
  showToast('İşlem silindi', 'success');
  staffList = await api('/staff') || [];
  loadStaffTransactions(selectedStaffId);
  loadStaff();
}

// ══════════════════════════════════════════════════════════════
//  REPORTS
// ══════════════════════════════════════════════════════════════

async function loadReports() {
  const dateInput = document.getElementById('report-date');
  if (!dateInput.value) dateInput.value = new Date().toISOString().split('T')[0];
  const date = dateInput.value;

  const data = await api(`/reports/daily?date=${date}`);
  if (!data || data.error) return;

  const s = data.summary || {};
  const fmt = (n) => Number(n || 0).toLocaleString('tr-TR');

  // Özet Kartları
  document.getElementById('report-summary').innerHTML = [
    { icon: '💰', label: 'Toplam Gelir', value: '₺' + fmt(s.total_revenue), color: '#22c55e' },
    { icon: '💵', label: 'Nakit', value: '₺' + fmt(s.cash_total), color: '#22c55e' },
    { icon: '💳', label: 'Kredi Kartı', value: '₺' + fmt(s.card_total), color: '#3b82f6' },
    { icon: '📦', label: 'Sipariş', value: s.total_orders, color: '#f97316' },
    { icon: '✅', label: 'Ödenen', value: s.paid_orders, color: '#22c55e' },
    { icon: '❌', label: 'İptal', value: s.cancelled_orders, color: '#ef4444' },
    { icon: '🍽️', label: 'Masa (İç)', value: fmt(s.dinein_count) + ' / ₺' + fmt(s.dinein_total), color: '#8b5cf6' },
    { icon: '📦', label: 'Paket', value: fmt(s.delivery_count) + ' / ₺' + fmt(s.delivery_total), color: '#a855f7' },
  ].map(c => `
    <div class="card" style="padding:16px;text-align:center">
      <div style="font-size:1.4rem;margin-bottom:4px">${c.icon}</div>
      <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:4px">${c.label}</div>
      <div style="font-size:1.1rem;font-weight:800;color:${c.color}">${c.value}</div>
    </div>
  `).join('');

  // Ürün Satışları + Kâr
  const products = data.topProducts || [];
  const totalQty = products.reduce((s, p) => s + (p.total_qty || 0), 0);
  const totalRev = products.reduce((s, p) => s + (p.total_revenue || 0), 0);
  const totalCost = products.reduce((s, p) => s + (p.total_cost || 0), 0);
  const totalProfit = totalRev - totalCost;
  document.getElementById('report-products').innerHTML = products.length === 0
    ? '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">Veri yok</td></tr>'
    : products.map((p, i) => {
      const cost = p.total_cost || 0;
      const profit = p.profit || 0;
      return `
      <tr>
        <td>${p.product_name}</td>
        <td style="text-align:right;font-weight:600">${p.total_qty}</td>
        <td style="text-align:right;font-weight:700;color:var(--green)">₺${fmt(p.total_revenue)}</td>
        <td style="text-align:right;color:${cost > 0 ? '#ef4444' : 'var(--text-muted)'}">₺${fmt(cost)}</td>
        <td style="text-align:right;font-weight:800;color:${profit > 0 ? '#22c55e' : '#ef4444'}">₺${fmt(profit)}</td>
      </tr>`;
    }).join('');
  document.getElementById('report-products-total').innerHTML = products.length > 0
    ? `<tr style="border-top:2px solid var(--border-primary)"><td style="font-weight:800">TOPLAM</td><td style="text-align:right;font-weight:800">${totalQty}</td><td style="text-align:right;font-weight:800;color:var(--green)">₺${fmt(totalRev)}</td><td style="text-align:right;font-weight:800;color:#ef4444">₺${fmt(totalCost)}</td><td style="text-align:right;font-weight:800;color:#22c55e">₺${fmt(totalProfit)}</td></tr>` : '';

  // Kurye Raporu
  const couriers = data.couriers || [];
  document.getElementById('report-couriers').innerHTML = couriers.length === 0
    ? '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">Teslimat yok</td></tr>'
    : couriers.map(c => `
      <tr>
        <td style="font-weight:600">🏃 ${c.name}</td>
        <td style="text-align:center;font-weight:700">${c.delivery_count}</td>
        <td style="text-align:right;font-weight:700;color:var(--green)">₺${fmt(c.total_amount)}</td>
        <td style="font-size:0.72rem;color:var(--text-muted)">${(c.receipts || '').split(',').filter(Boolean).join(', ') || '-'}</td>
      </tr>
    `).join('');

  // Saatlik Dağılım
  const hourly = data.hourly || [];
  const maxOrders = Math.max(...hourly.map(h => h.order_count), 1);
  const hourlyContainer = document.getElementById('report-hourly');
  if (hourly.length === 0) {
    hourlyContainer.innerHTML = '<div style="color:var(--text-muted);width:100%;text-align:center;align-self:center">Veri yok</div>';
  } else {
    hourlyContainer.innerHTML = hourly.map(h => {
      const pct = (h.order_count / maxOrders) * 100;
      return `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:32px">
          <span style="font-size:0.65rem;font-weight:700;color:var(--primary)">${h.order_count}</span>
          <div style="width:100%;background:linear-gradient(180deg,#f97316,#ea580c);border-radius:4px 4px 0 0;height:${Math.max(pct, 5)}%;min-height:4px;transition:0.3s"></div>
          <span style="font-size:0.6rem;color:var(--text-muted)">${h.hour}:00</span>
        </div>
      `;
    }).join('');
  }

  // Paket Sipariş Detayları
  const deliveries = data.deliveryOrders || [];
  const statusMap = { pending: '⏳ Beklemede', preparing: '👨‍🍳 Hazırlanıyor', ready: '✅ Hazır', delivered: '🚚 Teslim', out_for_delivery: '🏃 Yolda', paid: '💰 Ödendi', cancelled: '❌ İptal' };
  document.getElementById('report-deliveries').innerHTML = deliveries.length === 0
    ? '<tr><td colspan="8" style="text-align:center;color:var(--text-muted)">Paket sipariş yok</td></tr>'
    : deliveries.map(d => `
      <tr>
        <td>#${d.id}</td>
        <td style="font-weight:600">${d.customer_name}</td>
        <td>${d.customer_phone}</td>
        <td style="font-size:0.75rem;max-width:180px;overflow:hidden;text-overflow:ellipsis">${d.delivery_address || '-'}</td>
        <td>${d.delivered_by || '-'}</td>
        <td style="font-weight:700;color:var(--primary)">${d.receipt_no || '-'}</td>
        <td style="text-align:right;font-weight:700">₺${fmt(d.total_amount)}</td>
        <td><span class="status-badge status-${d.status}">${statusMap[d.status] || d.status}</span></td>
      </tr>
    `).join('');

  // Cari Hesap Özeti
  const accounts = await api('/accounts') || [];
  const accBody = document.getElementById('report-accounts');
  const accFoot = document.getElementById('report-accounts-total');
  if (accounts.length === 0) {
    accBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">Cari hesap yok</td></tr>';
    accFoot.innerHTML = '';
  } else {
    const typeLabels = { supplier: '🏭 Tedarikçi', customer: '👤 Müşteri' };
    accBody.innerHTML = accounts.map(a => {
      const balColor = a.balance > 0 ? '#ef4444' : a.balance < 0 ? '#22c55e' : 'inherit';
      return `
        <tr>
          <td style="font-weight:600">${a.name}</td>
          <td>${typeLabels[a.type] || a.type}</td>
          <td style="text-align:right;color:#ef4444;font-weight:700">₺${fmt(a.total_debit)}</td>
          <td style="text-align:right;color:#22c55e;font-weight:700">₺${fmt(a.total_credit)}</td>
          <td style="text-align:right;font-weight:800;color:${balColor}">₺${fmt(Math.abs(a.balance))} ${a.balance > 0 ? '(Borç)' : a.balance < 0 ? '(Alacak)' : ''}</td>
        </tr>`;
    }).join('');
    const totDebit = accounts.reduce((s, a) => s + (a.total_debit || 0), 0);
    const totCredit = accounts.reduce((s, a) => s + (a.total_credit || 0), 0);
    const totBal = totDebit - totCredit;
    accFoot.innerHTML = `<tr style="font-weight:800;background:var(--bg-tertiary)">
      <td colspan="2">TOPLAM</td>
      <td style="text-align:right;color:#ef4444">₺${fmt(totDebit)}</td>
      <td style="text-align:right;color:#22c55e">₺${fmt(totCredit)}</td>
      <td style="text-align:right;color:${totBal > 0 ? '#ef4444' : '#22c55e'}">₺${fmt(Math.abs(totBal))}</td>
    </tr>`;
  }
}

let currentReportTab = 'daily';

function switchReportTab(tab) {
  currentReportTab = tab;
  document.querySelectorAll('.report-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('rpt-tab-' + tab).classList.add('active');
  document.getElementById('rpt-daily-section').style.display = tab === 'daily' ? '' : 'none';
  document.getElementById('rpt-advanced-section').style.display = tab === 'advanced' ? '' : 'none';
  if (tab === 'advanced') loadAdvancedReport();
  else loadReports();
}

async function loadAdvancedReport() {
  const data = await api('/reports/advanced');
  if (!data) return;
  const fmt = n => Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const pct = (a, b) => b > 0 ? ((a - b) / b * 100).toFixed(0) : (a > 0 ? '+100' : '0');
  const arrow = (a, b) => a > b ? '📈' : a < b ? '📉' : '➖';

  // Period Comparisons
  const c = data.comparisons;
  document.getElementById('adv-comparisons').innerHTML = [
    { title: 'Bugün vs Dün', curr: c.today, prev: c.yesterday, labels: ['Bugün', 'Dün'] },
    { title: 'Bu Hafta vs Geçen Hafta', curr: c.this_week, prev: c.last_week, labels: ['Bu Hafta', 'Geçen Hafta'] },
    { title: 'Bu Ay vs Geçen Ay', curr: c.this_month, prev: c.last_month, labels: ['Bu Ay', 'Geçen Ay'] },
  ].map(p => {
    const diff = p.curr.rev - p.prev.rev;
    const diffP = pct(p.curr.rev, p.prev.rev);
    const isUp = diff >= 0;
    return `<div class="card" style="padding:16px">
      <h4 style="font-size:0.8rem;font-weight:600;margin-bottom:12px;color:var(--text-muted)">${p.title}</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
        <div style="text-align:center;padding:8px;border-radius:8px;background:rgba(34,197,94,0.08)">
          <div style="font-size:0.65rem;color:var(--text-muted)">${p.labels[0]}</div>
          <div style="font-size:1.1rem;font-weight:800;color:#22c55e">₺${fmt(p.curr.rev)}</div>
          <div style="font-size:0.65rem;color:var(--text-muted)">${p.curr.cnt} sipariş</div>
        </div>
        <div style="text-align:center;padding:8px;border-radius:8px;background:rgba(107,114,128,0.08)">
          <div style="font-size:0.65rem;color:var(--text-muted)">${p.labels[1]}</div>
          <div style="font-size:1.1rem;font-weight:800;color:#6b7280">₺${fmt(p.prev.rev)}</div>
          <div style="font-size:0.65rem;color:var(--text-muted)">${p.prev.cnt} sipariş</div>
        </div>
      </div>
      <div style="text-align:center;font-size:0.85rem;font-weight:700;color:${isUp ? '#22c55e' : '#ef4444'}">
        ${arrow(p.curr.rev, p.prev.rev)} ${isUp ? '+' : ''}₺${fmt(diff)} (%${diffP})
      </div>
    </div>`;
  }).join('');

  // Profit Cards
  const pr = data.profit;
  document.getElementById('adv-profit').innerHTML = [
    { icon: '💰', label: 'Gelir (Bu Ay)', value: '₺' + fmt(pr.revenue), color: '#22c55e' },
    { icon: '📦', label: 'Ürün Maliyeti', value: '₺' + fmt(pr.cogs), color: '#f59e0b' },
    { icon: '💸', label: 'Giderler', value: '₺' + fmt(pr.expenses), color: '#ef4444' },
    { icon: pr.net >= 0 ? '✅' : '❌', label: 'Net Kâr/Zarar', value: '₺' + fmt(pr.net), color: pr.net >= 0 ? '#22c55e' : '#ef4444' },
    { icon: '🧾', label: 'Ort. Sipariş', value: '₺' + fmt(data.avg_order), color: '#3b82f6' },
    { icon: '📦', label: 'Stok Değeri', value: '₺' + fmt(data.stock.value), color: '#8b5cf6' },
  ].map(c => `<div class="card" style="padding:14px;text-align:center">
    <div style="font-size:1.2rem">${c.icon}</div>
    <div style="font-size:0.7rem;color:var(--text-muted);margin:4px 0">${c.label}</div>
    <div style="font-size:1rem;font-weight:800;color:${c.color}">${c.value}</div>
  </div>`).join('');

  // Revenue Chart (14 days)
  const days = data.daily_revenue || [];
  const maxRev = Math.max(...days.map(d => d.revenue), 1);
  const chartEl = document.getElementById('adv-revenue-chart');
  if (days.length === 0) {
    chartEl.innerHTML = '<div style="color:var(--text-muted);width:100%;text-align:center;align-self:center">Veri yok</div>';
  } else {
    chartEl.innerHTML = days.map(d => {
      const pctH = (d.revenue / maxRev * 100).toFixed(0);
      const dayLabel = d.day.slice(5); // MM-DD
      return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:24px">
        <span style="font-size:0.55rem;font-weight:700;color:var(--primary)">₺${fmt(d.revenue)}</span>
        <div style="width:100%;background:linear-gradient(180deg,#22c55e,#16a34a);border-radius:4px 4px 0 0;height:${Math.max(pctH, 5)}%;min-height:4px;transition:0.3s" title="${d.day}: ₺${fmt(d.revenue)} (${d.orders} sipariş)"></div>
        <span style="font-size:0.5rem;color:var(--text-muted)">${dayLabel}</span>
      </div>`;
    }).join('');
  }

  // Payment Distribution
  const payments = data.payment_dist || [];
  const payLabels = { cash: '💵 Nakit', card: '💳 Kart', transfer: '🏦 Havale', online: '🌐 Online', '': '📋 Belirtilmemiş' };
  const payColors = { cash: '#22c55e', card: '#3b82f6', transfer: '#8b5cf6', online: '#f59e0b', '': '#6b7280' };
  const totalPay = payments.reduce((s, p) => s + (p.total || 0), 0);
  document.getElementById('adv-payment-dist').innerHTML = payments.length === 0
    ? '<div style="color:var(--text-muted);text-align:center;padding:20px">Veri yok</div>'
    : payments.map(p => {
      const payPct = totalPay > 0 ? (p.total / totalPay * 100).toFixed(0) : 0;
      const color = payColors[p.payment_method] || '#6b7280';
      return `<div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:3px">
          <span>${payLabels[p.payment_method] || p.payment_method} <span style="color:var(--text-muted)">(${p.cnt})</span></span>
          <span style="font-weight:700;color:${color}">₺${fmt(p.total)} (%${payPct})</span>
        </div>
        <div style="height:8px;background:var(--bg-tertiary);border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${payPct}%;background:${color};border-radius:4px;transition:width 0.4s"></div>
        </div>
      </div>`;
    }).join('');

  // Top Products
  const topP = data.top_products || [];
  const maxProd = topP.length > 0 ? topP[0].revenue : 1;
  const prodColors = ['#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#6b7280'];
  document.getElementById('adv-top-products').innerHTML = topP.length === 0
    ? '<div style="color:var(--text-muted);text-align:center;padding:20px">Veri yok</div>'
    : topP.map((p, i) => `<div style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:3px">
        <span><span style="font-weight:800;color:${prodColors[i]}">#${i+1}</span> ${p.product_name} <span style="color:var(--text-muted)">(${p.qty} adet)</span></span>
        <span style="font-weight:700;color:${prodColors[i]}">₺${fmt(p.revenue)}</span>
      </div>
      <div style="height:6px;background:var(--bg-tertiary);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${(p.revenue/maxProd*100).toFixed(0)}%;background:${prodColors[i]};border-radius:3px;transition:width 0.4s"></div>
      </div>
    </div>`).join('');

  // Category Sales
  const cats = data.category_sales || [];
  const maxCat = cats.length > 0 ? cats[0].revenue : 1;
  const catColors = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#6b7280'];
  document.getElementById('adv-category-sales').innerHTML = cats.length === 0
    ? '<div style="color:var(--text-muted);text-align:center;padding:20px">Veri yok</div>'
    : cats.map((c, i) => `<div style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:3px">
        <span>${c.icon || '📂'} ${c.category} <span style="color:var(--text-muted)">(${c.qty} adet)</span></span>
        <span style="font-weight:700;color:${catColors[i % catColors.length]}">₺${fmt(c.revenue)}</span>
      </div>
      <div style="height:6px;background:var(--bg-tertiary);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${(c.revenue/maxCat*100).toFixed(0)}%;background:${catColors[i % catColors.length]};border-radius:3px;transition:width 0.4s"></div>
      </div>
    </div>`).join('');

  // Expense Distribution
  const expCats = data.exp_by_category || [];
  const expIcons = { 'Kira': '🏠', 'Fatura': '📄', 'Market': '🛒', 'Personel': '👥', 'Bakım': '🔧', 'Ulaşım': '🚗', 'Vergi': '🏛️', 'Genel': '🔹' };
  const expColors = { 'Kira': '#ef4444', 'Fatura': '#f59e0b', 'Market': '#22c55e', 'Personel': '#3b82f6', 'Bakım': '#8b5cf6', 'Ulaşım': '#ec4899', 'Vergi': '#6366f1', 'Genel': '#6b7280' };
  const maxExp = expCats.length > 0 ? expCats[0].total : 1;
  document.getElementById('adv-expense-dist').innerHTML = expCats.length === 0
    ? '<div style="color:var(--text-muted);text-align:center;padding:20px">Bu ay gider kaydı yok</div>'
    : expCats.map(c => `<div style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:3px">
        <span>${expIcons[c.category] || '🔹'} ${c.category} <span style="color:var(--text-muted)">(${c.count})</span></span>
        <span style="font-weight:700;color:${expColors[c.category] || '#6b7280'}">₺${fmt(c.total)}</span>
      </div>
      <div style="height:6px;background:var(--bg-tertiary);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${(c.total/maxExp*100).toFixed(0)}%;background:${expColors[c.category] || '#6b7280'};border-radius:3px;transition:width 0.4s"></div>
      </div>
    </div>`).join('');

  // Stock Summary
  const st = data.stock;
  document.getElementById('adv-stock-summary').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px">
      <div style="text-align:center;padding:12px;border-radius:8px;background:rgba(59,130,246,0.08)">
        <div style="font-size:0.65rem;color:var(--text-muted)">Stok Kalemi</div>
        <div style="font-size:1.2rem;font-weight:800;color:#3b82f6">${st.total}</div>
      </div>
      <div style="text-align:center;padding:12px;border-radius:8px;background:rgba(139,92,246,0.08)">
        <div style="font-size:0.65rem;color:var(--text-muted)">Stok Değeri</div>
        <div style="font-size:1rem;font-weight:800;color:#8b5cf6">₺${fmt(st.value)}</div>
      </div>
      <div style="text-align:center;padding:12px;border-radius:8px;background:${st.low > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)'}">
        <div style="font-size:0.65rem;color:var(--text-muted)">Düşük Stok</div>
        <div style="font-size:1.2rem;font-weight:800;color:${st.low > 0 ? '#ef4444' : '#22c55e'}">${st.low > 0 ? '⚠️ ' + st.low : '✅ 0'}</div>
      </div>
    </div>
    <div style="padding:12px;border-radius:8px;background:var(--bg-tertiary);text-align:center">
      <div style="font-size:0.75rem;color:var(--text-muted)">Geçen Ay Gider</div>
      <div style="font-size:1rem;font-weight:700;color:#6b7280">₺${fmt(data.last_month_expenses)}</div>
    </div>
  `;
}

function printReport() {
  const content = document.getElementById('panel-reports');
  const win = window.open('', '_blank');
  win.document.write(`
    <html><head><title>Günlük Rapor</title>
    <style>
      body { font-family:Arial,sans-serif; padding:20px; color:#333; }
      table { width:100%; border-collapse:collapse; margin:12px 0; font-size:13px; }
      th, td { border:1px solid #ddd; padding:8px; text-align:left; }
      th { background:#f5f5f5; font-weight:700; }
      h1 { font-size:20px; text-align:center; }
      .summary { display:flex; gap:12px; flex-wrap:wrap; margin:16px 0; }
      .scard { flex:1; min-width:120px; border:1px solid #ddd; border-radius:8px; padding:12px; text-align:center; }
      .scard-val { font-size:18px; font-weight:800; }
      .scard-lbl { font-size:11px; color:#888; }
    </style></head><body>
    ${content.innerHTML}
    </body></html>
  `);
  win.document.close();
  setTimeout(() => { win.print(); }, 500);
}

async function printAccountStatement() {
  if (!selectedAccountId) return;
  const a = accountsList.find(x => x.id === selectedAccountId);
  if (!a) return;
  const fmt = (n) => Number(n || 0).toLocaleString('tr-TR');
  const txns = await api(`/accounts/${selectedAccountId}/transactions`) || [];
  const settings = await fetch('/api/settings').then(r => r.json());

  const w = window.open('', '_blank', 'width=700,height=800');
  let runBal = 0;
  const rows = txns.reverse().map(t => {
    if (t.type === 'debit') runBal += t.amount;
    else runBal -= t.amount;
    return `<tr>
      <td>${t.date}</td>
      <td>${t.type === 'debit' ? 'Borç' : 'Ödeme'}</td>
      <td>${t.description || '-'}</td>
      <td style="text-align:right;color:${t.type === 'debit' ? '#c00' : '#080'}">₺${fmt(t.amount)}</td>
      <td style="text-align:right;font-weight:700;color:${runBal > 0 ? '#c00' : '#080'}">₺${fmt(Math.abs(runBal))}</td>
    </tr>`;
  }).join('');

  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Cari Ekstre - ${a.name}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family:Arial,sans-serif; padding:24px; font-size:12px; }
      .header { text-align:center; margin-bottom:16px; }
      .header h1 { font-size:16px; }
      .header p { font-size:11px; color:#666; }
      .info { display:flex; justify-content:space-between; margin:16px 0; padding:12px; background:#f5f5f5; border-radius:4px; }
      .info div { font-size:11px; }
      .info strong { display:block; font-size:13px; }
      table { width:100%; border-collapse:collapse; margin:12px 0; }
      th { background:#333; color:#fff; padding:8px; text-align:left; font-size:11px; }
      td { padding:6px 8px; border-bottom:1px solid #ddd; font-size:11px; }
      .total { background:#f0f0f0; font-weight:800; font-size:14px; }
      @media print { body { padding:8mm; } }
    </style></head><body>
    <div class="header">
      <h1>${settings.restaurant_name || 'Webyaz Restaurant'}</h1>
      <p>${settings.restaurant_phone || ''} ${settings.restaurant_address ? ' • ' + settings.restaurant_address : ''}</p>
      <p style="margin-top:8px;font-size:14px;font-weight:700;letter-spacing:2px">CARİ EKSTRE</p>
    </div>
    <div class="info">
      <div><strong>${a.name}</strong>${a.type === 'supplier' ? 'Tedarikçi' : 'Müşteri'}${a.phone ? ' • ' + a.phone : ''}${a.tax_no ? ' • VN: ' + a.tax_no : ''}</div>
      <div style="text-align:right"><strong>Tarih: ${new Date().toLocaleDateString('tr-TR')}</strong>Bakiye: ₺${fmt(Math.abs(a.balance))} ${a.balance > 0 ? '(Borçlu)' : '(Alacaklı)'}</div>
    </div>
    <table>
      <thead><tr><th>Tarih</th><th>İşlem</th><th>Açıklama</th><th style="text-align:right">Tutar</th><th style="text-align:right">Bakiye</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5" style="text-align:center">Hareket yok</td></tr>'}</tbody>
      <tfoot><tr class="total">
        <td colspan="3">NET BAKİYE</td>
        <td></td>
        <td style="text-align:right;color:${a.balance > 0 ? '#c00' : '#080'}">₺${fmt(Math.abs(a.balance))} ${a.balance > 0 ? '(Borç)' : '(Ödenmiş)'}</td>
      </tr></tfoot>
    </table>
    <script>window.onload=()=>{window.print();}<\/script>
  </body></html>`);
  w.document.close();
}

// ══════════════════════════════════════════════════════════════
//  QR CODES
// ══════════════════════════════════════════════════════════════

async function loadQRCodes() {
  const grid = document.getElementById('qr-grid');
  if (!grid) return;

  const allTables = await api('/tables');
  if (!allTables || allTables.error) return;

  const baseUrl = window.location.origin;

  grid.innerHTML = allTables.map(t => `
    <div class="card" style="text-align:center;padding:24px" id="qr-card-${t.id}">
      <div style="font-weight:700;font-size:1rem;margin-bottom:12px">${t.name}</div>
      <canvas id="qr-${t.id}" style="margin:0 auto 12px;display:block"></canvas>
      <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:12px;word-break:break-all">${baseUrl}/menu/${t.id}</div>
      <div style="display:flex;gap:8px;justify-content:center">
        <button class="btn btn-sm btn-primary" onclick="printQR(${t.id}, '${t.name}')">🖨️ Yazdır</button>
        <button class="btn btn-sm btn-secondary" onclick="downloadQR(${t.id}, '${t.name}')">💾 İndir</button>
      </div>
    </div>
  `).join('');

  // Generate QR codes
  for (const t of allTables) {
    const url = `${baseUrl}/menu/${t.id}`;
    const canvas = document.getElementById('qr-' + t.id);
    if (canvas && typeof QRCode !== 'undefined') {
      QRCode.toCanvas(canvas, url, {
        width: 180,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      });
    }
  }
}

function printQR(tableId, tableName) {
  const canvas = document.getElementById('qr-' + tableId);
  if (!canvas) return;

  const imgData = canvas.toDataURL('image/png');
  const url = window.location.origin + '/menu/' + tableId;

  const win = window.open('', '_blank', 'width=400,height=550');
  win.document.write(`
    <html><head><title>QR - ${tableName}</title>
    <style>
      body { font-family:Arial,sans-serif; text-align:center; padding:40px; }
      .qr-title { font-size:24px; font-weight:bold; margin-bottom:8px; }
      .qr-sub { font-size:14px; color:#666; margin-bottom:20px; }
      img { width:250px; height:250px; }
      .qr-url { font-size:10px; color:#999; margin-top:12px; word-break:break-all; }
      .qr-scan { font-size:16px; font-weight:600; margin-top:16px; color:#333; }
    </style></head><body>
      <div class="qr-title">🍽️ Webyaz Restaurant</div>
      <div class="qr-sub">${tableName}</div>
      <img src="${imgData}">
      <div class="qr-scan">📱 Menü için QR kodu okutun</div>
      <div class="qr-url">${url}</div>
    </body></html>
  `);
  win.document.close();
  setTimeout(() => { win.print(); }, 500);
}

function downloadQR(tableId, tableName) {
  const canvas = document.getElementById('qr-' + tableId);
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = `qr-${tableName.replace(/\s+/g, '-').toLowerCase()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function printAllQR() {
  const canvases = document.querySelectorAll('[id^="qr-"]');
  const allTables = [];

  canvases.forEach(c => {
    if (c.tagName !== 'CANVAS') return;
    const id = c.id.replace('qr-', '');
    const card = document.getElementById('qr-card-' + id);
    const name = card ? card.querySelector('div').textContent : 'Masa ' + id;
    allTables.push({ name, imgData: c.toDataURL('image/png'), url: window.location.origin + '/menu/' + id });
  });

  if (allTables.length === 0) return showToast('QR kod bulunamadı', 'error');

  const win = window.open('', '_blank');
  win.document.write(`
    <html><head><title>Tüm QR Kodlar</title>
    <style>
      body { font-family:Arial,sans-serif; }
      .grid { display:grid; grid-template-columns:repeat(3, 1fr); gap:24px; padding:20px; }
      .qr-item { text-align:center; border:2px solid #ddd; border-radius:12px; padding:20px; page-break-inside:avoid; }
      .qr-name { font-size:18px; font-weight:bold; margin-bottom:8px; }
      img { width:160px; height:160px; }
      .qr-hint { font-size:12px; color:#666; margin-top:8px; }
      @media print { .grid { grid-template-columns:repeat(3, 1fr); } }
    </style></head><body>
      <div style="text-align:center;padding:20px 0"><h1>🍽️ Webyaz Restaurant — QR Menü Kodları</h1></div>
      <div class="grid">
        ${allTables.map(t => `
          <div class="qr-item">
            <div class="qr-name">${t.name}</div>
            <img src="${t.imgData}">
            <div class="qr-hint">📱 Menü için okutun</div>
          </div>
        `).join('')}
      </div>
    </body></html>
  `);
  win.document.close();
  setTimeout(() => { win.print(); }, 500);
}

// ══════════════════════════════════════════════════════════════
//  ACCOUNTS / CARİ HESAPLAR
// ══════════════════════════════════════════════════════════════

let accountsList = [];
let selectedAccountId = null;
let accountFilterType = 'all';

async function loadAccounts() {
  accountsList = await api('/accounts') || [];
  const filtered = accountFilterType === 'all' ? accountsList : accountsList.filter(a => a.type === accountFilterType);
  const container = document.getElementById('accounts-list');
  const fmt = (n) => Number(n || 0).toLocaleString('tr-TR');

  if (filtered.length === 0) {
    container.innerHTML = '<div class="card" style="padding:40px;text-align:center;color:var(--text-muted)"><div style="font-size:2rem;margin-bottom:8px">💳</div>Henüz cari hesap eklenmedi</div>';
    document.getElementById('account-detail').style.display = 'none';
    return;
  }

  container.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px">
    ${filtered.map(a => {
      const typeIcon = a.type === 'supplier' ? '🏭' : '👤';
      const typeLabel = a.type === 'supplier' ? 'Tedarikçi' : 'Müşteri';
      const balColor = a.balance > 0 ? '#ef4444' : a.balance < 0 ? '#22c55e' : 'var(--text-muted)';
      const balLabel = a.balance > 0 ? 'Borçlu' : a.balance < 0 ? 'Alacaklı' : 'Bakiye: ₺0';
      return `
      <div class="card" style="padding:16px;cursor:pointer;border:2px solid ${selectedAccountId === a.id ? 'var(--primary)' : 'transparent'};transition:0.2s" onclick="selectAccount(${a.id})">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div style="font-weight:700;font-size:0.95rem">${typeIcon} ${a.name}</div>
            <div style="font-size:0.72rem;color:var(--text-muted)">${typeLabel} ${a.phone ? '• ' + a.phone : ''}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:1.1rem;font-weight:800;color:${balColor}">₺${fmt(Math.abs(a.balance))}</div>
            <div style="font-size:0.65rem;color:${balColor}">${balLabel}</div>
          </div>
        </div>
        <div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center;font-size:0.7rem;color:var(--text-muted)">
          <span>Borç: ₺${fmt(a.total_debit)} • Ödeme: ₺${fmt(a.total_credit)}</span>
          <div style="display:flex;gap:4px">
            <button class="btn btn-sm" onclick="event.stopPropagation();selectAccount(${a.id})" style="font-size:0.6rem;padding:2px 8px;background:var(--primary);color:#fff;border:none;border-radius:4px">📋 Hesap</button>
            <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();editAccount(${a.id})" style="font-size:0.6rem;padding:2px 6px">✏️</button>
            <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();deleteAccount(${a.id})" style="font-size:0.6rem;padding:2px 6px">🗑️</button>
          </div>
        </div>
      </div>`;
    }).join('')}
  </div>`;

  if (selectedAccountId) loadAccountTransactions(selectedAccountId);
}

function filterAccounts(type, btn) {
  accountFilterType = type;
  document.querySelectorAll('.account-filter').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  loadAccounts();
}

function openAccountModal(a = null) {
  document.getElementById('account-modal-title').textContent = a ? 'Cari Düzenle' : 'Yeni Cari Hesap';
  document.getElementById('account-id').value = a ? a.id : '';
  document.getElementById('account-name').value = a ? a.name : '';
  document.getElementById('account-type').value = a ? a.type : 'customer';
  document.getElementById('account-phone').value = a ? a.phone : '';
  document.getElementById('account-taxno').value = a ? a.tax_no : '';
  document.getElementById('account-address').value = a ? a.address : '';
  document.getElementById('account-notes').value = a ? a.notes : '';
  document.getElementById('account-modal').classList.add('active');
}

function closeAccountModal() { document.getElementById('account-modal').classList.remove('active'); }

function editAccount(id) {
  const a = accountsList.find(x => x.id === id);
  if (a) openAccountModal(a);
}

async function saveAccount() {
  const id = document.getElementById('account-id').value;
  const data = {
    name: document.getElementById('account-name').value,
    type: document.getElementById('account-type').value,
    phone: document.getElementById('account-phone').value,
    address: document.getElementById('account-address').value,
    tax_no: document.getElementById('account-taxno').value,
    notes: document.getElementById('account-notes').value,
    is_active: 1,
  };
  if (!data.name) return showToast('Cari adı gerekli', 'error');

  if (id) await api('/accounts/' + id, { method: 'PUT', body: data });
  else await api('/accounts', { method: 'POST', body: data });

  closeAccountModal();
  loadAccounts();
  showToast('Cari kaydedildi', 'success');
}

async function deleteAccount(id) {
  if (!confirm('Bu cari hesabı ve tüm hareketlerini silmek istediğinize emin misiniz?')) return;
  await api('/accounts/' + id, { method: 'DELETE' });
  if (selectedAccountId === id) { selectedAccountId = null; document.getElementById('account-detail').style.display = 'none'; }
  loadAccounts();
  showToast('Cari silindi', 'success');
}

async function selectAccount(id) {
  selectedAccountId = id;
  loadAccounts();
}

async function loadAccountTransactions(accountId) {
  const a = accountsList.find(x => x.id === accountId);
  if (!a) return;
  const fmt = (n) => Number(n || 0).toLocaleString('tr-TR');
  const typeIcon = a.type === 'supplier' ? '🏭' : '👤';

  document.getElementById('account-detail').style.display = 'block';
  document.getElementById('account-detail-name').textContent = `${typeIcon} ${a.name} — Bakiye: ₺${fmt(Math.abs(a.balance))} ${a.balance > 0 ? '(Borçlu)' : a.balance < 0 ? '(Alacaklı)' : ''}`;
  document.getElementById('acc-txn-date').value = new Date().toISOString().split('T')[0];

  const balColor = a.balance > 0 ? '#ef4444' : '#22c55e';
  document.getElementById('account-summary-cards').innerHTML = [
    { icon: '🔴', label: 'Toplam Borç', value: '₺' + fmt(a.total_debit), color: '#ef4444' },
    { icon: '🟢', label: 'Toplam Ödeme', value: '₺' + fmt(a.total_credit), color: '#22c55e' },
    { icon: '💰', label: 'Net Bakiye', value: '₺' + fmt(Math.abs(a.balance)), color: balColor },
  ].map(c => `
    <div class="card" style="padding:12px;text-align:center">
      <div style="font-size:1.2rem">${c.icon}</div>
      <div style="font-size:0.65rem;color:var(--text-muted);margin:4px 0">${c.label}</div>
      <div style="font-size:1rem;font-weight:800;color:${c.color}">${c.value}</div>
    </div>
  `).join('');

  const txns = await api(`/accounts/${accountId}/transactions`) || [];
  document.getElementById('acc-txn-body').innerHTML = txns.length === 0
    ? '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">Henüz hareket yok</td></tr>'
    : txns.map(t => `
      <tr>
        <td style="font-size:0.8rem">${t.date}</td>
        <td><span style="color:${t.type === 'debit' ? '#ef4444' : '#22c55e'};font-weight:700">${t.type === 'debit' ? '🔴 Borç' : '🟢 Ödeme'}</span></td>
        <td style="font-size:0.8rem;color:var(--text-muted)">${t.description || '-'}</td>
        <td style="text-align:right;font-weight:700;color:${t.type === 'debit' ? '#ef4444' : '#22c55e'}">₺${fmt(t.amount)}</td>
        <td><button class="btn btn-sm btn-danger" onclick="deleteAccountTxn(${t.id})" style="font-size:0.6rem;padding:2px 6px">🗑️</button></td>
      </tr>
    `).join('');
}

async function addAccountTxn() {
  if (!selectedAccountId) return;
  const type = document.getElementById('acc-txn-type').value;
  const amount = parseFloat(document.getElementById('acc-txn-amount').value);
  const description = document.getElementById('acc-txn-desc').value;
  const date = document.getElementById('acc-txn-date').value;

  if (!amount || amount <= 0) return showToast('Tutar giriniz', 'error');
  if (!date) return showToast('Tarih seçiniz', 'error');

  await api(`/accounts/${selectedAccountId}/transactions`, { method: 'POST', body: { type, amount, description, date } });
  document.getElementById('acc-txn-amount').value = '';
  document.getElementById('acc-txn-desc').value = '';
  showToast('Hareket eklendi', 'success');

  accountsList = await api('/accounts') || [];
  loadAccountTransactions(selectedAccountId);
  loadAccounts();
}

async function deleteAccountTxn(txnId) {
  if (!confirm('Bu hareketi silmek istediğinize emin misiniz?')) return;
  await api('/accounts/transactions/' + txnId, { method: 'DELETE' });
  showToast('Hareket silindi', 'success');
  accountsList = await api('/accounts') || [];
  loadAccountTransactions(selectedAccountId);
  loadAccounts();
}

// ══════════════════════════════════════════════════════════════
//  INVENTORY / STOK YÖNETİMİ
// ══════════════════════════════════════════════════════════════

let inventoryList = [];
let selectedInventoryId = null;
let inventoryFilterCategory = 'all';
let suppliersList = [];

const CATEGORY_ICONS = {
  'Et': '🥩', 'Sebze': '🥬', 'Meyve': '🍎', 'Süt Ürünü': '🧀',
  'Baharat': '🌶️', 'İçecek': '🥤', 'Kuru Gıda': '🌾', 'Ambalaj': '📦',
  'Temizlik': '🧹', 'Genel': '🔹'
};

const TXN_LABELS = {
  'in': { text: '📥 Giriş', color: '#22c55e' },
  'out': { text: '📤 Çıkış', color: '#f97316' },
  'waste': { text: '🗑️ Fire', color: '#ef4444' },
  'adjustment': { text: '🔧 Düzeltme', color: '#8b5cf6' }
};

async function loadInventory() {
  // Load suppliers for dropdown
  suppliersList = (await api('/accounts') || []).filter(a => a.type === 'supplier');
  
  // Load report for summary cards
  const report = await api('/inventory/report');
  if (report) {
    const fmt = n => Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    document.getElementById('inventory-summary').innerHTML = [
      { icon: '📦', label: 'Toplam Malzeme', value: report.total_items, color: '#3b82f6' },
      { icon: '⚠️', label: 'Düşük Stok', value: report.low_stock_count, color: report.low_stock_count > 0 ? '#ef4444' : '#22c55e' },
      { icon: '💰', label: 'Stok Değeri', value: '₺' + fmt(report.total_value), color: '#8b5cf6' },
      { icon: '📥', label: 'Bu Ay Giriş', value: '₺' + fmt(report.month_inbound), color: '#f97316' },
    ].map(c => `
      <div class="card" style="padding:16px;text-align:center">
        <div style="font-size:1.5rem">${c.icon}</div>
        <div style="font-size:0.7rem;color:var(--text-muted);margin:4px 0">${c.label}</div>
        <div style="font-size:1.1rem;font-weight:800;color:${c.color}">${c.value}</div>
      </div>
    `).join('');
  }

  // Load inventory items
  let url = '/inventory?active_only=1';
  if (inventoryFilterCategory !== 'all' && inventoryFilterCategory !== 'low') {
    url += '&category=' + encodeURIComponent(inventoryFilterCategory);
  }
  if (inventoryFilterCategory === 'low') url = '/inventory?low_stock=1';
  inventoryList = await api(url) || [];
  renderInventoryTable();

  if (selectedInventoryId) loadInventoryTransactions(selectedInventoryId);
}

function filterInventory(cat, el) {
  inventoryFilterCategory = cat;
  document.querySelectorAll('.inv-filter').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  loadInventory();
}

function renderInventoryTable() {
  const search = (document.getElementById('inventory-search')?.value || '').toLowerCase();
  let filtered = inventoryList;
  if (search) filtered = filtered.filter(i => i.name.toLowerCase().includes(search));

  const fmt = n => Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const tbody = document.getElementById('inventory-body');

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted" style="padding:40px"><div style="font-size:2rem;margin-bottom:8px">📦</div>Malzeme bulunamadı</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(i => {
    const isLow = i.is_low_stock;
    const catIcon = CATEGORY_ICONS[i.category] || '🔹';
    return `
    <tr style="${isLow ? 'background:rgba(239,68,68,0.06)' : ''};cursor:pointer" onclick="selectInventoryItem(${i.id})">
      <td><strong>${i.name}</strong>${isLow ? ' <span style="color:#ef4444;font-size:0.7rem">⚠️</span>' : ''}</td>
      <td><span style="font-size:0.75rem">${catIcon} ${i.category}</span></td>
      <td>${i.unit}</td>
      <td style="text-align:right;font-weight:700;color:${isLow ? '#ef4444' : 'var(--text-primary)'}">${fmt(i.current_stock)}</td>
      <td style="text-align:right;color:var(--text-muted)">${fmt(i.min_stock)}</td>
      <td style="text-align:right">₺${fmt(i.cost_per_unit)}</td>
      <td style="text-align:right;font-weight:600;color:#8b5cf6">₺${fmt(i.stock_value)}</td>
      <td style="font-size:0.75rem">${i.supplier_name || '<span style="color:var(--text-muted)">-</span>'}</td>
      <td>
        <div class="flex gap-sm">
          <button class="btn btn-sm" onclick="event.stopPropagation();selectInventoryItem(${i.id})" style="font-size:0.6rem;padding:2px 8px;background:var(--primary);color:#fff;border:none;border-radius:4px">📋</button>
          <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();editInventoryItem(${i.id})" style="font-size:0.6rem;padding:2px 6px">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();deleteInventoryItem(${i.id})" style="font-size:0.6rem;padding:2px 6px">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function selectInventoryItem(id) {
  selectedInventoryId = id;
  // Highlight selected row visually
  document.querySelectorAll('#inventory-body tr').forEach(tr => tr.style.outline = 'none');
  loadInventoryTransactions(id);
}

async function loadInventoryTransactions(itemId) {
  const item = inventoryList.find(x => x.id === itemId);
  if (!item) return;
  const fmt = n => Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  document.getElementById('inventory-detail').style.display = 'block';
  document.getElementById('inventory-detail-name').textContent =
    `${CATEGORY_ICONS[item.category] || '📦'} ${item.name} — ${item.current_stock} ${item.unit}`;
  document.getElementById('inv-txn-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('inv-txn-cost').value = item.cost_per_unit || '';

  // Populate supplier dropdown
  const supSel = document.getElementById('inv-txn-supplier');
  supSel.innerHTML = '<option value="">Tedarikçi (opsiyonel)</option>' +
    suppliersList.map(s => `<option value="${s.id}" ${item.supplier_id === s.id ? 'selected' : ''}>${s.name}</option>`).join('');

  // Summary cards
  const stockVal = (item.current_stock || 0) * (item.cost_per_unit || 0);
  const txns = await api('/inventory/' + itemId + '/transactions') || [];
  const totalIn = txns.filter(t => t.type === 'in').reduce((s, t) => s + t.quantity, 0);
  const totalOut = txns.filter(t => t.type === 'out').reduce((s, t) => s + t.quantity, 0);
  const totalWaste = txns.filter(t => t.type === 'waste').reduce((s, t) => s + t.quantity, 0);

  document.getElementById('inventory-detail-summary').innerHTML = [
    { icon: '📦', label: 'Mevcut Stok', value: fmt(item.current_stock) + ' ' + item.unit, color: item.is_low_stock ? '#ef4444' : '#22c55e' },
    { icon: '📥', label: 'Toplam Giriş', value: fmt(totalIn) + ' ' + item.unit, color: '#22c55e' },
    { icon: '📤', label: 'Toplam Çıkış', value: fmt(totalOut) + ' ' + item.unit, color: '#f97316' },
    { icon: '💰', label: 'Stok Değeri', value: '₺' + fmt(stockVal), color: '#8b5cf6' },
  ].map(c => `
    <div class="card" style="padding:12px;text-align:center">
      <div style="font-size:1.2rem">${c.icon}</div>
      <div style="font-size:0.65rem;color:var(--text-muted);margin:4px 0">${c.label}</div>
      <div style="font-size:1rem;font-weight:800;color:${c.color}">${c.value}</div>
    </div>
  `).join('');

  // Transaction table
  const tbody = document.getElementById('inv-txn-body');
  if (txns.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted)">Henüz hareket yok</td></tr>';
    return;
  }
  tbody.innerHTML = txns.map(t => {
    const lbl = TXN_LABELS[t.type] || { text: t.type, color: '#888' };
    return `<tr>
      <td>${t.date}</td>
      <td><span style="color:${lbl.color};font-weight:600;font-size:0.8rem">${lbl.text}</span></td>
      <td style="font-size:0.8rem">${t.description || '-'}</td>
      <td style="font-size:0.8rem">${t.supplier_name || '-'}</td>
      <td style="text-align:right;font-weight:700">${fmt(t.quantity)}</td>
      <td style="text-align:right">₺${fmt(t.unit_cost)}</td>
      <td style="text-align:right;font-weight:600">₺${fmt(t.total_cost)}</td>
      <td><button class="btn btn-sm btn-danger" onclick="deleteStockTxn(${t.id})" style="font-size:0.6rem;padding:2px 6px">🗑️</button></td>
    </tr>`;
  }).join('');
}

async function addStockTransaction() {
  if (!selectedInventoryId) return showToast('Önce bir malzeme seçin', 'error');
  const type = document.getElementById('inv-txn-type').value;
  const quantity = parseFloat(document.getElementById('inv-txn-qty').value);
  const unit_cost = parseFloat(document.getElementById('inv-txn-cost').value) || 0;
  const supplier_id = document.getElementById('inv-txn-supplier').value || null;
  const description = document.getElementById('inv-txn-desc').value;
  const date = document.getElementById('inv-txn-date').value;

  if (!quantity || quantity <= 0) return showToast('Miktar giriniz', 'error');
  if (!date) return showToast('Tarih seçiniz', 'error');

  await api(`/inventory/${selectedInventoryId}/transactions`, {
    method: 'POST', body: { type, quantity, unit_cost, supplier_id, description, date }
  });
  document.getElementById('inv-txn-qty').value = '';
  document.getElementById('inv-txn-desc').value = '';
  showToast(TXN_LABELS[type]?.text + ' eklendi', 'success');
  loadInventory();
}

async function deleteStockTxn(txnId) {
  if (!confirm('Bu hareketi silmek istediğinize emin misiniz? Stok geri düzeltilecek.')) return;
  await api('/inventory/transactions/' + txnId, { method: 'DELETE' });
  showToast('Hareket silindi, stok güncellendi', 'success');
  loadInventory();
}

// ── Inventory Item CRUD ──────────────────────────────────────

async function openInventoryModal(item = null) {
  document.getElementById('inventory-modal-title').textContent = item ? 'Malzeme Düzenle' : 'Yeni Malzeme';
  document.getElementById('inv-id').value = item ? item.id : '';
  document.getElementById('inv-name').value = item ? item.name : '';
  document.getElementById('inv-category').value = item ? item.category : 'Genel';
  document.getElementById('inv-unit').value = item ? item.unit : 'kg';
  document.getElementById('inv-stock').value = item ? item.current_stock : '';
  document.getElementById('inv-min').value = item ? item.min_stock : '';
  document.getElementById('inv-cost').value = item ? item.cost_per_unit : '';
  document.getElementById('inv-notes').value = item ? item.notes : '';

  // Suppliers dropdown
  if (suppliersList.length === 0) {
    suppliersList = ((await api('/accounts')) || []).filter(a => a.type === 'supplier');
  }
  const supSel = document.getElementById('inv-supplier');
  supSel.innerHTML = '<option value="">Seçiniz</option>' +
    suppliersList.map(s => `<option value="${s.id}" ${item && item.supplier_id === s.id ? 'selected' : ''}>${s.name}</option>`).join('');

  document.getElementById('inventory-modal').classList.add('active');
}

function closeInventoryModal() { document.getElementById('inventory-modal').classList.remove('active'); }

function editInventoryItem(id) {
  const item = inventoryList.find(x => x.id === id);
  if (item) openInventoryModal(item);
}

async function saveInventoryItem() {
  const id = document.getElementById('inv-id').value;
  const data = {
    name: document.getElementById('inv-name').value.trim(),
    category: document.getElementById('inv-category').value,
    unit: document.getElementById('inv-unit').value,
    current_stock: parseFloat(document.getElementById('inv-stock').value) || 0,
    min_stock: parseFloat(document.getElementById('inv-min').value) || 0,
    cost_per_unit: parseFloat(document.getElementById('inv-cost').value) || 0,
    supplier_id: document.getElementById('inv-supplier').value || null,
    notes: document.getElementById('inv-notes').value,
  };
  if (!data.name) return showToast('Malzeme adı gerekli', 'error');

  if (id) await api('/inventory/' + id, { method: 'PUT', body: data });
  else await api('/inventory', { method: 'POST', body: data });

  closeInventoryModal();
  loadInventory();
  showToast('Malzeme kaydedildi', 'success');
}

async function deleteInventoryItem(id) {
  if (!confirm('Bu malzemeyi ve tüm hareketlerini silmek istediğinize emin misiniz?')) return;
  await api('/inventory/' + id, { method: 'DELETE' });
  if (selectedInventoryId === id) { selectedInventoryId = null; document.getElementById('inventory-detail').style.display = 'none'; }
  loadInventory();
  showToast('Malzeme silindi', 'success');
}

// ── Product Recipes ──────────────────────────────────────────

async function openRecipeModal() {
  if (products.length === 0) products = await api('/products') || [];
  if (inventoryList.length === 0) inventoryList = await api('/inventory?active_only=1') || [];

  const sel = document.getElementById('recipe-product');
  sel.innerHTML = '<option value="">Ürün seçin...</option>' +
    products.map(p => `<option value="${p.id}">${p.name} (₺${p.price})</option>`).join('');
  document.getElementById('recipe-rows').innerHTML = '';
  document.getElementById('recipe-cost-preview').innerHTML = '';
  document.getElementById('recipe-modal').classList.add('active');
}

function closeRecipeModal() { document.getElementById('recipe-modal').classList.remove('active'); }

async function loadRecipeForProduct() {
  const prodId = document.getElementById('recipe-product').value;
  if (!prodId) { document.getElementById('recipe-rows').innerHTML = ''; return; }
  const recipe = await api(`/products/${prodId}/recipe`) || [];
  document.getElementById('recipe-rows').innerHTML = '';
  if (recipe.length > 0) {
    recipe.forEach(r => addRecipeRow(r.item_id, r.quantity, r.unit));
  } else {
    addRecipeRow();
  }
  updateRecipeCost();
}

function addRecipeRow(itemId = '', qty = '', unit = '') {
  const container = document.getElementById('recipe-rows');
  const row = document.createElement('div');
  row.style.cssText = 'display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:8px;margin-bottom:8px;align-items:center';
  row.innerHTML = `
    <select class="form-select recipe-item" onchange="updateRecipeCost()">
      <option value="">Malzeme seçin...</option>
      ${inventoryList.map(i => `<option value="${i.id}" data-cost="${i.cost_per_unit}" data-unit="${i.unit}" ${i.id == itemId ? 'selected' : ''}>${CATEGORY_ICONS[i.category]||'📦'} ${i.name}</option>`).join('')}
    </select>
    <input type="number" class="form-input recipe-qty" placeholder="Miktar" step="0.01" value="${qty}" oninput="updateRecipeCost()">
    <input type="text" class="form-input recipe-unit" placeholder="Birim" value="${unit || ''}" readonly style="background:var(--bg-tertiary)">
    <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove();updateRecipeCost()" style="padding:6px 10px">✕</button>
  `;
  container.appendChild(row);
  // Auto-fill unit on select
  const sel = row.querySelector('.recipe-item');
  sel.addEventListener('change', () => {
    const opt = sel.options[sel.selectedIndex];
    row.querySelector('.recipe-unit').value = opt?.dataset?.unit || '';
  });
  if (itemId) {
    const opt = sel.options[sel.selectedIndex];
    row.querySelector('.recipe-unit').value = unit || opt?.dataset?.unit || '';
  }
}

function updateRecipeCost() {
  const rows = document.querySelectorAll('#recipe-rows > div');
  let totalCost = 0;
  let details = [];
  rows.forEach(row => {
    const sel = row.querySelector('.recipe-item');
    const qty = parseFloat(row.querySelector('.recipe-qty').value) || 0;
    if (sel.value && qty > 0) {
      const opt = sel.options[sel.selectedIndex];
      const cost = parseFloat(opt?.dataset?.cost || 0);
      const itemCost = cost * qty;
      totalCost += itemCost;
      details.push(`${opt.text.split(' ').slice(1).join(' ')}: ${qty} × ₺${cost.toFixed(2)} = ₺${itemCost.toFixed(2)}`);
    }
  });

  const prodId = document.getElementById('recipe-product').value;
  const prod = products.find(p => p.id == prodId);
  const sellPrice = prod ? prod.price : 0;
  const profit = sellPrice - totalCost;

  document.getElementById('recipe-cost-preview').innerHTML = details.length > 0 ? `
    <div style="margin-bottom:8px">${details.map(d => `<div style="color:var(--text-muted);font-size:0.8rem">• ${d}</div>`).join('')}</div>
    <div style="display:flex;justify-content:space-between;border-top:1px solid var(--border-primary);padding-top:8px">
      <span><strong>Reçete Maliyeti:</strong> <span style="color:#ef4444;font-weight:700">₺${totalCost.toFixed(2)}</span></span>
      <span><strong>Satış:</strong> ₺${sellPrice.toFixed(2)}</span>
      <span><strong>Kâr:</strong> <span style="color:${profit >= 0 ? '#22c55e' : '#ef4444'};font-weight:700">₺${profit.toFixed(2)}</span></span>
    </div>
  ` : '<span style="color:var(--text-muted)">Malzeme ekleyerek maliyet hesabını görün</span>';
}

async function saveRecipe() {
  const prodId = document.getElementById('recipe-product').value;
  if (!prodId) return showToast('Ürün seçin', 'error');
  const rows = document.querySelectorAll('#recipe-rows > div');
  const items = [];
  rows.forEach(row => {
    const item_id = row.querySelector('.recipe-item').value;
    const quantity = parseFloat(row.querySelector('.recipe-qty').value) || 0;
    const unit = row.querySelector('.recipe-unit').value;
    if (item_id && quantity > 0) items.push({ item_id: +item_id, quantity, unit });
  });
  if (items.length === 0) return showToast('En az bir malzeme ekleyin', 'error');
  await api(`/products/${prodId}/recipe`, { method: 'POST', body: { items } });
  showToast('Reçete kaydedildi ✅', 'success');
  closeRecipeModal();
}

// ══════════════════════════════════════════════════════════════
//  RESERVATIONS / REZERVASYONLAR
// ══════════════════════════════════════════════════════════════

let reservationsList = [];
let resFilterStatus = 'all';
let resTables = [];

const RES_STATUS = {
  pending:   { text: '⏳ Bekleyen',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  confirmed: { text: '✅ Onaylı',    color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  seated:    { text: '🦫 Oturdu',   color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  completed: { text: '✅ Tamamlandı', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  cancelled: { text: '❌ İptal',     color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  no_show:   { text: '🚫 Gelmedi',  color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
};

async function loadReservations() {
  // Set default date
  const dateEl = document.getElementById('res-date');
  if (!dateEl.value) dateEl.value = new Date().toISOString().split('T')[0];
  const date = dateEl.value;

  // Load reservations for the date
  let url = '/reservations?date=' + date;
  if (resFilterStatus !== 'all') url += '&status=' + resFilterStatus;
  reservationsList = await api(url) || [];

  // Load table availability
  const availability = await api('/reservations/availability?date=' + date) || [];
  resTables = availability;

  // Summary cards
  const allForDate = await api('/reservations?date=' + date) || [];
  const pending = allForDate.filter(r => r.status === 'pending').length;
  const confirmed = allForDate.filter(r => r.status === 'confirmed').length;
  const seated = allForDate.filter(r => r.status === 'seated').length;
  const totalGuests = allForDate.filter(r => ['pending','confirmed','seated'].includes(r.status)).reduce((s,r) => s + (r.guest_count||0), 0);

  document.getElementById('res-summary').innerHTML = [
    { icon: '📋', label: 'Toplam Rez.', value: allForDate.length, color: '#3b82f6' },
    { icon: '⏳', label: 'Bekleyen', value: pending, color: '#f59e0b' },
    { icon: '✅', label: 'Onaylı', value: confirmed, color: '#22c55e' },
    { icon: '👥', label: 'Beklenen Kişi', value: totalGuests, color: '#8b5cf6' },
  ].map(c => `
    <div class="card" style="padding:14px;text-align:center">
      <div style="font-size:1.3rem">${c.icon}</div>
      <div style="font-size:0.7rem;color:var(--text-muted);margin:4px 0">${c.label}</div>
      <div style="font-size:1.1rem;font-weight:800;color:${c.color}">${c.value}</div>
    </div>
  `).join('');

  // Table availability grid
  renderResTableGrid(availability);

  // Reservation list
  renderResList();
}

function renderResTableGrid(tables) {
  const grid = document.getElementById('res-table-grid');
  if (!tables || tables.length === 0) {
    grid.innerHTML = '<div style="color:var(--text-muted);padding:16px">Masa bulunamadı</div>';
    return;
  }
  grid.innerHTML = tables.map(t => {
    const hasRes = t.is_reserved;
    const resCount = t.reservations ? t.reservations.length : 0;
    const resInfo = t.reservations && t.reservations.length > 0
      ? t.reservations.map(r => `${r.time} - ${r.customer_name}`).join('\n')
      : 'Müsait';
    return `
      <div style="padding:12px;border-radius:10px;text-align:center;cursor:pointer;
        background:${hasRes ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)'};
        border:2px solid ${hasRes ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)'};"
        title="${resInfo}" onclick="openReservationModal(null, ${t.id})">
        <div style="font-size:1.2rem">${hasRes ? '🟥' : '🟩'}</div>
        <div style="font-weight:700;font-size:0.85rem;margin:4px 0">${t.name}</div>
        <div style="font-size:0.7rem;color:var(--text-muted)">${t.capacity} kişi</div>
        ${hasRes ? `<div style="font-size:0.65rem;color:#ef4444;margin-top:4px">${resCount} rez.</div>` : '<div style="font-size:0.65rem;color:#22c55e;margin-top:4px">Müsait</div>'}
      </div>`;
  }).join('');
}

function renderResList() {
  const tbody = document.getElementById('res-body');
  if (reservationsList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-muted)"><div style="font-size:2rem;margin-bottom:8px">📅</div>Bu tarihte rezervasyon yok</td></tr>';
    return;
  }
  tbody.innerHTML = reservationsList.map(r => {
    const st = RES_STATUS[r.status] || RES_STATUS.pending;
    const endTime = minutesToTimeStr(timeStrToMinutes(r.time) + (r.duration || 120));
    return `<tr>
      <td><strong>${r.time}</strong><span style="color:var(--text-muted);font-size:0.75rem"> - ${endTime}</span></td>
      <td><strong>${r.customer_name}</strong></td>
      <td style="font-size:0.8rem">${r.customer_phone || '-'}</td>
      <td><span style="background:var(--bg-tertiary);padding:2px 8px;border-radius:6px;font-size:0.8rem;font-weight:600">${r.table_name || 'Masa ' + r.table_id}</span></td>
      <td style="text-align:center">${r.guest_count}</td>
      <td style="font-size:0.8rem">${r.duration || 120} dk</td>
      <td><span style="background:${st.bg};color:${st.color};padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:600">${st.text}</span></td>
      <td style="font-size:0.75rem;max-width:120px;overflow:hidden;text-overflow:ellipsis">${r.notes || '-'}</td>
      <td>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          ${r.status === 'pending' ? `<button class="btn btn-sm" onclick="updateResStatus(${r.id},'confirmed')" style="font-size:0.6rem;padding:2px 6px;background:#22c55e;color:#fff;border:none;border-radius:4px">✅</button>` : ''}
          ${r.status === 'confirmed' ? `<button class="btn btn-sm" onclick="updateResStatus(${r.id},'seated')" style="font-size:0.6rem;padding:2px 6px;background:#3b82f6;color:#fff;border:none;border-radius:4px">🦫</button>` : ''}
          ${r.status === 'seated' ? `<button class="btn btn-sm" onclick="updateResStatus(${r.id},'completed')" style="font-size:0.6rem;padding:2px 6px;background:#6b7280;color:#fff;border:none;border-radius:4px">✅</button>` : ''}
          ${['pending','confirmed'].includes(r.status) ? `<button class="btn btn-sm" onclick="updateResStatus(${r.id},'cancelled')" style="font-size:0.6rem;padding:2px 6px;background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3);border-radius:4px">❌</button>` : ''}
          <button class="btn btn-sm btn-secondary" onclick="editReservation(${r.id})" style="font-size:0.6rem;padding:2px 6px">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="deleteReservation(${r.id})" style="font-size:0.6rem;padding:2px 6px">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function timeStrToMinutes(t) { const [h, m] = (t || '12:00').split(':').map(Number); return h * 60 + (m || 0); }
function minutesToTimeStr(m) { return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }

function shiftResDate(delta) {
  const el = document.getElementById('res-date');
  const d = new Date(el.value);
  d.setDate(d.getDate() + delta);
  el.value = d.toISOString().split('T')[0];
  loadReservations();
}

function setResToday() {
  document.getElementById('res-date').value = new Date().toISOString().split('T')[0];
  loadReservations();
}

function filterResStatus(status, el) {
  resFilterStatus = status;
  document.querySelectorAll('.res-status-filter').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  loadReservations();
}

async function updateResStatus(id, status) {
  await api(`/reservations/${id}/status`, { method: 'PUT', body: { status } });
  const st = RES_STATUS[status] || {};
  showToast(st.text + ' olarak güncellendi', 'success');
  loadReservations();
}

async function openReservationModal(reservation = null, preselectedTable = null) {
  document.getElementById('res-modal-title').textContent = reservation ? 'Rezervasyon Düzenle' : 'Yeni Rezervasyon';
  document.getElementById('res-id').value = reservation ? reservation.id : '';
  document.getElementById('res-customer').value = reservation ? reservation.customer_name : '';
  document.getElementById('res-phone').value = reservation ? reservation.customer_phone : '';
  document.getElementById('res-modal-date').value = reservation ? reservation.date : (document.getElementById('res-date')?.value || new Date().toISOString().split('T')[0]);
  document.getElementById('res-time').value = reservation ? reservation.time : '19:00';
  document.getElementById('res-guests').value = reservation ? reservation.guest_count : 2;
  document.getElementById('res-duration').value = reservation ? reservation.duration : 120;
  document.getElementById('res-notes').value = reservation ? reservation.notes : '';

  // Load tables for dropdown
  if (resTables.length === 0) {
    const tables = await api('/tables') || [];
    resTables = tables;
  }
  const tableSel = document.getElementById('res-table');
  const tableSource = resTables.length > 0 ? resTables : [];
  tableSel.innerHTML = '<option value="">Masa seçin...</option>' +
    tableSource.map(t => {
      const name = t.name || ('Masa ' + t.id);
      const cap = t.capacity || '';
      const selected = (reservation && reservation.table_id === t.id) || (preselectedTable === t.id) ? 'selected' : '';
      return `<option value="${t.id}" ${selected}>${name} (${cap} kişi)</option>`;
    }).join('');

  document.getElementById('reservation-modal').classList.add('active');
}

function closeReservationModal() { document.getElementById('reservation-modal').classList.remove('active'); }

function editReservation(id) {
  const r = reservationsList.find(x => x.id === id);
  if (r) openReservationModal(r);
}

async function saveReservation() {
  const id = document.getElementById('res-id').value;
  const data = {
    table_id: +document.getElementById('res-table').value,
    customer_name: document.getElementById('res-customer').value.trim(),
    customer_phone: document.getElementById('res-phone').value.trim(),
    date: document.getElementById('res-modal-date').value,
    time: document.getElementById('res-time').value,
    guest_count: parseInt(document.getElementById('res-guests').value) || 2,
    duration: parseInt(document.getElementById('res-duration').value) || 120,
    notes: document.getElementById('res-notes').value,
  };
  if (!data.customer_name) return showToast('Müşteri adı gerekli', 'error');
  if (!data.date || !data.time) return showToast('Tarih ve saat gerekli', 'error');
  if (!data.table_id) return showToast('Masa seçimi gerekli', 'error');

  try {
    if (id) {
      data.status = reservationsList.find(r => r.id == id)?.status || 'pending';
      await api('/reservations/' + id, { method: 'PUT', body: data });
    } else {
      const res = await fetch('/api/reservations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const result = await res.json();
      if (!res.ok) { showToast(result.error || 'Hata oluştu', 'error'); return; }
    }
    closeReservationModal();
    loadReservations();
    showToast('Rezervasyon kaydedildi ✅', 'success');
  } catch (err) { showToast('Hata: ' + err.message, 'error'); }
}

async function deleteReservation(id) {
  if (!confirm('Bu rezervasyonu silmek istediğinize emin misiniz?')) return;
  await api('/reservations/' + id, { method: 'DELETE' });
  showToast('Rezervasyon silindi', 'success');
  loadReservations();
}

// ══════════════════════════════════════════════════════════════
//  EXPENSES / GİDER YÖNETİMİ
// ══════════════════════════════════════════════════════════════

let expensesList = [];
let expFilterCategory = 'all';

const EXP_ICONS = {
  'Kira': '🏠', 'Fatura': '📄', 'Market': '🛒', 'Personel': '👥',
  'Bakım': '🔧', 'Ulaşım': '🚗', 'Vergi': '🏛️', 'Genel': '🔹'
};
const EXP_COLORS = {
  'Kira': '#ef4444', 'Fatura': '#f59e0b', 'Market': '#22c55e', 'Personel': '#3b82f6',
  'Bakım': '#8b5cf6', 'Ulaşım': '#ec4899', 'Vergi': '#6366f1', 'Genel': '#6b7280'
};
const PAYMENT_LABELS = {
  'cash': '💵 Nakit', 'card': '💳 Kart', 'transfer': '🏦 Havale', 'check': '📝 Çek'
};

async function loadExpenses() {
  const monthEl = document.getElementById('exp-month');
  if (!monthEl.value) monthEl.value = new Date().toISOString().slice(0, 7);
  const month = monthEl.value;

  // Load report
  const report = await api('/expenses/report?month=' + month);
  const fmt = n => Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  if (report) {
    const diff = report.this_month - report.last_month;
    const diffPct = report.last_month > 0 ? ((diff / report.last_month) * 100).toFixed(0) : 0;
    document.getElementById('exp-summary').innerHTML = [
      { icon: '💸', label: 'Toplam Gider', value: '₺' + fmt(report.total), color: '#ef4444' },
      { icon: '📅', label: 'Bu Ay', value: '₺' + fmt(report.this_month), color: '#f59e0b' },
      { icon: '📆', label: 'Geçen Ay', value: '₺' + fmt(report.last_month), color: '#6b7280' },
      { icon: diff > 0 ? '📈' : '📉', label: 'Değişim', value: (diff >= 0 ? '+' : '') + fmt(diff) + ' (%' + diffPct + ')', color: diff > 0 ? '#ef4444' : '#22c55e' },
      { icon: '📋', label: 'Kayıt Sayısı', value: report.by_category.reduce((s,c) => s + c.count, 0), color: '#3b82f6' },
    ].map(c => `
      <div class="card" style="padding:14px;text-align:center">
        <div style="font-size:1.3rem">${c.icon}</div>
        <div style="font-size:0.7rem;color:var(--text-muted);margin:4px 0">${c.label}</div>
        <div style="font-size:1rem;font-weight:800;color:${c.color}">${c.value}</div>
      </div>
    `).join('');

    // Category breakdown bar chart
    const maxCat = Math.max(...report.by_category.map(c => c.total), 1);
    document.getElementById('exp-category-chart').innerHTML = report.by_category.length > 0 ? `
      <h3 style="font-size:0.85rem;font-weight:700;margin-bottom:12px">📊 Kategori Dağılımı</h3>
      ${report.by_category.map(c => {
        const pct = (c.total / maxCat * 100).toFixed(0);
        const color = EXP_COLORS[c.category] || '#6b7280';
        return `<div style="margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:3px">
            <span>${EXP_ICONS[c.category] || '🔹'} ${c.category} <span style="color:var(--text-muted)">(${c.count})</span></span>
            <span style="font-weight:700;color:${color}">₺${fmt(c.total)}</span>
          </div>
          <div style="height:8px;background:var(--bg-tertiary);border-radius:4px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${color};border-radius:4px;transition:width 0.4s"></div>
          </div>
        </div>`;
      }).join('')}
    ` : '<div style="color:var(--text-muted);text-align:center;padding:20px">Bu ay henüz gider kaydı yok</div>';
  }

  // Load expense list
  let url = '/expenses?month=' + month;
  if (expFilterCategory !== 'all') url += '&category=' + encodeURIComponent(expFilterCategory);
  expensesList = await api(url) || [];
  renderExpensesTable();
}

function filterExpCategory(cat, el) {
  expFilterCategory = cat;
  document.querySelectorAll('.exp-cat-filter').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  loadExpenses();
}

function renderExpensesTable() {
  const fmt = n => Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const tbody = document.getElementById('exp-body');
  if (expensesList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted)"><div style="font-size:2rem;margin-bottom:8px">💸</div>Gider kaydı bulunamadı</td></tr>';
    return;
  }
  tbody.innerHTML = expensesList.map(e => {
    const icon = EXP_ICONS[e.category] || '🔹';
    const color = EXP_COLORS[e.category] || '#6b7280';
    const pay = PAYMENT_LABELS[e.payment_method] || e.payment_method;
    return `<tr>
      <td>${e.date}</td>
      <td><span style="color:${color};font-weight:600;font-size:0.85rem">${icon} ${e.category}</span></td>
      <td>${e.description || '-'}${e.is_recurring ? ' <span style="font-size:0.65rem;color:#8b5cf6">🔁</span>' : ''}</td>
      <td style="text-align:right;font-weight:700;color:#ef4444">₺${fmt(e.amount)}</td>
      <td style="font-size:0.8rem">${pay}</td>
      <td style="font-size:0.8rem">${e.supplier_name || '-'}</td>
      <td style="font-size:0.75rem;color:var(--text-muted)">${e.receipt_no || '-'}</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btn-sm btn-secondary" onclick="editExpense(${e.id})" style="font-size:0.6rem;padding:2px 6px">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="deleteExpense(${e.id})" style="font-size:0.6rem;padding:2px 6px">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

async function openExpenseModal(expense = null) {
  document.getElementById('exp-modal-title').textContent = expense ? 'Gider Düzenle' : 'Yeni Gider';
  document.getElementById('exp-id').value = expense ? expense.id : '';
  document.getElementById('exp-category').value = expense ? expense.category : 'Genel';
  document.getElementById('exp-amount').value = expense ? expense.amount : '';
  document.getElementById('exp-desc').value = expense ? expense.description : '';
  document.getElementById('exp-date').value = expense ? expense.date : new Date().toISOString().split('T')[0];
  document.getElementById('exp-payment').value = expense ? expense.payment_method : 'cash';
  document.getElementById('exp-receipt').value = expense ? expense.receipt_no : '';
  document.getElementById('exp-recurring').checked = expense ? expense.is_recurring : false;
  document.getElementById('exp-notes').value = expense ? expense.notes : '';

  // Supplier dropdown
  if (suppliersList.length === 0) {
    suppliersList = ((await api('/accounts')) || []).filter(a => a.type === 'supplier');
  }
  const supSel = document.getElementById('exp-supplier');
  supSel.innerHTML = '<option value="">Seçiniz</option>' +
    suppliersList.map(s => `<option value="${s.id}" ${expense && expense.supplier_id === s.id ? 'selected' : ''}>${s.name}</option>`).join('');

  document.getElementById('expense-modal').classList.add('active');
}

function closeExpenseModal() { document.getElementById('expense-modal').classList.remove('active'); }

function editExpense(id) {
  const e = expensesList.find(x => x.id === id);
  if (e) openExpenseModal(e);
}

async function saveExpense() {
  const id = document.getElementById('exp-id').value;
  const data = {
    category: document.getElementById('exp-category').value,
    amount: parseFloat(document.getElementById('exp-amount').value) || 0,
    description: document.getElementById('exp-desc').value.trim(),
    date: document.getElementById('exp-date').value,
    payment_method: document.getElementById('exp-payment').value,
    receipt_no: document.getElementById('exp-receipt').value,
    supplier_id: document.getElementById('exp-supplier').value || null,
    is_recurring: document.getElementById('exp-recurring').checked ? 1 : 0,
    notes: document.getElementById('exp-notes').value,
  };
  if (!data.amount || data.amount <= 0) return showToast('Tutar giriniz', 'error');
  if (!data.date) return showToast('Tarih seçiniz', 'error');

  if (id) await api('/expenses/' + id, { method: 'PUT', body: data });
  else await api('/expenses', { method: 'POST', body: data });

  closeExpenseModal();
  loadExpenses();
  showToast('Gider kaydedildi ✅', 'success');
}

async function deleteExpense(id) {
  if (!confirm('Bu gideri silmek istediğinize emin misiniz?')) return;
  await api('/expenses/' + id, { method: 'DELETE' });
  showToast('Gider silindi', 'success');
  loadExpenses();
}
