// ╔══════════════════════════════════════════════════════════════╗
// ║  WEBYAZ RESTAURANT — Order Management JS                    ║
// ╚══════════════════════════════════════════════════════════════╝

const socket = io();
let allTables = [];
let allCategories = [];
let allProducts = [];
let cart = [];
let currentTableId = null;
let currentCategory = null;
let tableOrders = {}; // { tableId: [orders] }
let currentUser = null; // logged-in user info

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Get current user info
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) currentUser = await res.json();
  } catch(e) {}
  loadData();
  socket.emit('join_room', 'cashier');

  // Auto-refresh every 5 seconds as fallback
  setInterval(async () => {
    await loadAllTableOrders();
    renderTables();
  }, 5000);
});

async function loadData() {
  try {
    allTables = await fetch('/api/tables').then(r => r.json());
    allCategories = await fetch('/api/categories').then(r => r.json());
    allProducts = await fetch('/api/products?active_only=1').then(r => r.json());
    await loadAllTableOrders();
    renderTables();
    renderCategories();
    renderProducts();
  } catch (e) {
    showToast('Veri yüklenemedi', 'error');
  }
}

// ── Load orders for all tables ───────────────────────────────
async function loadAllTableOrders() {
  try {
    const orders = await fetch('/api/orders?status=pending,preparing,ready,out_for_delivery,delivered').then(r => r.json());
    tableOrders = {};
    orders.forEach(o => {
      const tid = o.table_id;
      if (!tid) return;
      if (!tableOrders[tid]) tableOrders[tid] = [];
      tableOrders[tid].push(o);
    });
  } catch (e) { /* ignore */ }
}

// ══════════════════════════════════════════════════════════════
//  TABLES VIEW
// ══════════════════════════════════════════════════════════════

function isPaketTable(table) {
  const name = (table.name || '').toLowerCase();
  const floor = (table.floor || '').toLowerCase();
  return name.includes('paket') || floor.includes('paket');
}

function renderTables() {
  const grid = document.getElementById('tables-grid');
  // Alfabetik sırala (Paket masalar en sona)
  const sorted = [...allTables].sort((a, b) => {
    const ap = isPaketTable(a) ? 1 : 0;
    const bp = isPaketTable(b) ? 1 : 0;
    if (ap !== bp) return ap - bp;
    return (a.name || '').localeCompare(b.name || '', 'tr', { numeric: true });
  });
  grid.innerHTML = sorted.map(t => {
    const orders = tableOrders[t.id] || [];
    const isOccupied = orders.length > 0;
    const total = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const orderCount = orders.length;
    const readyCount = orders.filter(o => o.status === 'ready').length;
    const preparingCount = orders.filter(o => o.status === 'preparing').length;
    const paket = isPaketTable(t);
    const outCount = orders.filter(o => o.status === 'out_for_delivery').length;

    return `
      <div class="tcard ${isOccupied ? 'occupied' : ''} ${readyCount > 0 ? 'ready' : ''} ${paket ? 'paket-table' : ''}" style="position:relative">
        ${paket ? `<div class="paket-badge">📦 ${isOccupied ? 'AKTİF' : 'BOŞ'}</div>` : ''}
        <div class="tcard-top">
          <div>
            <div class="tcard-name">${t.name}</div>
            <div class="tcard-cap">${paket ? '📦 Paket Servis' : t.capacity + ' Kişilik'}</div>
          </div>
          ${!paket ? `<div class="tcard-status ${isOccupied ? 'occupied' : 'empty'}">${isOccupied ? 'DOLU' : 'BOŞ'}</div>` : ''}
        </div>
        ${readyCount > 0 ? `
          <div style="background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.4);border-radius:8px;padding:8px 12px;margin:8px 0;text-align:center;animation:readyPulse 1.5s infinite">
            <span style="color:#22c55e;font-weight:700;font-size:0.82rem">${paket ? '✅ Paket Hazır!' : '✅ Siparişler Hazır!'}</span>
          </div>
        ` : outCount > 0 ? `
          <div style="background:rgba(168,85,247,0.1);border-radius:8px;padding:6px 10px;margin:8px 0;text-align:center">
            <span style="color:#a855f7;font-weight:600;font-size:0.75rem">🏃 Kurye Yolda</span>
          </div>
        ` : preparingCount > 0 ? `
          <div style="background:rgba(249,115,22,0.1);border-radius:8px;padding:6px 10px;margin:8px 0;text-align:center">
            <span style="color:var(--primary);font-weight:600;font-size:0.75rem">👨‍🍳 Hazırlanıyor...</span>
          </div>
        ` : ''}
        ${isOccupied ? `
          <div class="tcard-total">₺${total.toLocaleString('tr-TR')}</div>
          <div class="tcard-orders">${orderCount} sipariş${paket && orders[0]?.customer_name ? ' — ' + orders[0].customer_name : ''}</div>
        ` : `
          <div class="tcard-info">${paket ? 'Telefon siparişi alın' : 'Müşteri bekleniyor'}</div>
        `}
        <div class="tcard-btns">
          <button class="tcard-btn ${paket ? '' : 'btn-order'}" ${paket ? 'style="background:linear-gradient(135deg,#8b5cf6,#a855f7);color:#fff"' : ''} onclick="openOrderPanel(${t.id})">${paket ? '📦 Paket Sipariş' : '🍽️ Sipariş Al'}</button>
          ${readyCount > 0 ? `<button class="tcard-btn" style="background:var(--green);color:#fff" onclick="deliverOrder(${t.id})">✅ Teslim Al</button>` : ''}
          ${isOccupied ? `<button class="tcard-btn btn-close-table" onclick="openCloseModal(${t.id})">💰 ${paket ? 'Kapat' : 'Masa Kapat'}</button>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ══════════════════════════════════════════════════════════════
//  ORDER PANEL
// ══════════════════════════════════════════════════════════════

function openOrderPanel(tableId) {
  currentTableId = tableId;
  const table = allTables.find(t => t.id === tableId);
  const paket = table && isPaketTable(table);

  document.getElementById('op-table-name').textContent = table ? table.name : 'Masa ' + tableId;

  // Show/hide delivery info form
  const delInfo = document.getElementById('del-info');
  if (paket) {
    delInfo.classList.add('visible');
    document.getElementById('del-name').value = '';
    document.getElementById('del-phone').value = '';
    document.getElementById('del-address').value = '';
    document.getElementById('del-notes').value = '';
    document.getElementById('del-addr-result').textContent = '';
  } else {
    delInfo.classList.remove('visible');
  }

  // Show/hide close panel button for paket orders
  const closeBtn = document.getElementById('op-close-panel-btn');
  if (closeBtn) closeBtn.style.display = paket ? 'block' : 'none';

  cart = [];
  currentCategory = null;
  updateCartUI();
  renderCategories();
  renderProducts();

  document.getElementById('order-panel').classList.add('active');
}

function forceClosePanel() {
  document.getElementById('order-panel').classList.remove('active');
  cart = [];
  currentTableId = null;
}

function closeOrderPanel() {
  if (cart.length > 0 && !confirm('Sepette ürün var. Çıkmak istediğinize emin misiniz?')) return;
  forceClosePanel();
}

// ── Categories ───────────────────────────────────────────────
function renderCategories() {
  const container = document.getElementById('op-cats');
  const active = allCategories.filter(c => c.is_active);
  container.innerHTML = `
    <button class="op-cat ${!currentCategory ? 'active' : ''}" onclick="selectCategory(null)">🍽️ Tümü</button>
    ${active.map(c => `
      <button class="op-cat ${currentCategory === c.id ? 'active' : ''}" onclick="selectCategory(${c.id})">${c.icon} ${c.name}</button>
    `).join('')}
  `;
}

function selectCategory(id) {
  currentCategory = id;
  renderCategories();
  renderProducts();
}

// ── Products ─────────────────────────────────────────────────
function renderProducts() {
  const container = document.getElementById('op-products');
  let filtered = allProducts.filter(p => p.is_active);
  if (currentCategory) filtered = filtered.filter(p => p.category_id === currentCategory);

  if (filtered.length === 0) {
    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:40px">Bu kategoride ürün yok</div>';
    return;
  }

  container.innerHTML = filtered.map(p => {
    const cat = allCategories.find(c => c.id === p.category_id);
    const icon = cat ? cat.icon : '🍽️';
    return `
      <div class="op-prod" onclick="addToCart(${p.id})">
        <div class="op-prod-icon">${p.image_path ? `<img src="${p.image_path}" style="width:40px;height:40px;object-fit:cover;border-radius:8px">` : icon}</div>
        <div class="op-prod-name">${p.name}</div>
        <div class="op-prod-price">₺${p.price.toLocaleString('tr-TR')}</div>
      </div>
    `;
  }).join('');
}

// ── Cart ─────────────────────────────────────────────────────
function addToCart(productId) {
  const p = allProducts.find(x => x.id === productId);
  if (!p) return;

  const existing = cart.find(item => item.product_id === productId);
  if (existing) {
    existing.quantity++;
    existing.total_price = existing.quantity * existing.unit_price;
  } else {
    cart.push({ product_id: p.id, product_name: p.name, unit_price: p.price, quantity: 1, total_price: p.price });
  }
  updateCartUI();
  showToast(`${p.name} eklendi`, 'success');
}

function cartQty(index, delta) {
  cart[index].quantity += delta;
  if (cart[index].quantity <= 0) cart.splice(index, 1);
  else cart[index].total_price = cart[index].quantity * cart[index].unit_price;
  updateCartUI();
}

function cartRemove(index) {
  cart.splice(index, 1);
  updateCartUI();
}

function updateCartUI() {
  const items = document.getElementById('op-cart-items');
  const total = cart.reduce((s, i) => s + i.total_price, 0);
  document.getElementById('op-total').textContent = '₺' + total.toLocaleString('tr-TR');
  document.getElementById('op-save-btn').disabled = cart.length === 0;

  if (cart.length === 0) {
    items.innerHTML = '<div class="op-cart-empty">🛒 Ürün seçin</div>';
    return;
  }

  items.innerHTML = cart.map((item, i) => `
    <div class="ci">
      <div class="ci-info">
        <div class="ci-name">${item.product_name}</div>
        <div class="ci-price">₺${item.unit_price.toLocaleString('tr-TR')} × ${item.quantity} = ₺${item.total_price.toLocaleString('tr-TR')}</div>
      </div>
      <div class="ci-qty">
        <button onclick="cartQty(${i},-1)">−</button>
        <span>${item.quantity}</span>
        <button onclick="cartQty(${i},1)">+</button>
      </div>
      <button class="ci-del" onclick="cartRemove(${i})">✕</button>
    </div>
  `).join('');
}

function toggleMobileCart() {
  document.getElementById('op-cart').classList.toggle('mobile-open');
}

// ── Save Order ───────────────────────────────────────────────
async function saveOrder() {
  if (cart.length === 0) return;
  const btn = document.getElementById('op-save-btn');
  btn.disabled = true;
  btn.textContent = 'Kaydediliyor...';

  const table = allTables.find(t => t.id === currentTableId);
  const paket = table && isPaketTable(table);

  // Validate delivery fields
  if (paket) {
    const name = document.getElementById('del-name').value.trim();
    const phone = document.getElementById('del-phone').value.trim();
    const addr = document.getElementById('del-address').value.trim();
    if (!name) { showToast('Müşteri adı zorunlu', 'error'); btn.disabled = false; btn.textContent = '✓ Siparişi Kaydet'; return; }
    if (!phone) { showToast('Telefon zorunlu', 'error'); btn.disabled = false; btn.textContent = '✓ Siparişi Kaydet'; return; }
    if (!addr) { showToast('Adres zorunlu', 'error'); btn.disabled = false; btn.textContent = '✓ Siparişi Kaydet'; return; }
  }

  try {
    const orderData = {
      table_id: currentTableId,
      customer_name: paket ? document.getElementById('del-name').value.trim() : (table ? table.name + ' Müşterisi' : 'Müşteri'),
      customer_phone: paket ? document.getElementById('del-phone').value.trim() : '',
      delivery_address: paket ? document.getElementById('del-address').value.trim() : '',
      notes: paket ? document.getElementById('del-notes').value.trim() : '',
      order_type: paket ? 'delivery' : 'dine_in',
      items: cart.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        notes: ''
      }))
    };

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    const order = await res.json();

    if (order.error) {
      showToast(order.error, 'error');
      btn.disabled = false;
      btn.textContent = '✓ Siparişi Kaydet';
      return;
    }

    // Emit to kitchen & cashier
    socket.emit('new_order', order);

    await loadAllTableOrders();
    renderTables();

    if (paket) {
      // Keep panel open for additional orders
      cart = [];
      updateCartUI();
      showToast('📦 Paket sipariş mutfağa gönderildi! Ek sipariş ekleyebilirsiniz.', 'success');
    } else {
      showToast('✅ Sipariş kaydedildi ve mutfağa gönderildi!', 'success');
      document.getElementById('order-panel').classList.remove('active');
      cart = [];
      currentTableId = null;
    }

  } catch (err) {
    showToast('Hata: ' + err.message, 'error');
  }

  btn.disabled = false;
  btn.textContent = '✓ Siparişi Kaydet';
}

// ══════════════════════════════════════════════════════════════
//  CLOSE TABLE / PAYMENT
// ══════════════════════════════════════════════════════════════

let closingTableId = null;

function openCloseModal(tableId) {
  closingTableId = tableId;
  const table = allTables.find(t => t.id === tableId);
  const orders = tableOrders[tableId] || [];
  const paket = table && isPaketTable(table);

  document.getElementById('close-modal-title').textContent = (table ? table.name : 'Masa') + ' — Hesap';

  // Collect all items from all orders
  const allItems = [];
  orders.forEach(o => {
    if (o.items) {
      let items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
      items.forEach(item => {
        const existing = allItems.find(x => x.product_name === item.product_name && x.unit_price === item.unit_price);
        if (existing) { existing.quantity += item.quantity; existing.total = existing.quantity * existing.unit_price; }
        else allItems.push({ product_name: item.product_name, unit_price: item.unit_price, quantity: item.quantity, total: item.quantity * item.unit_price });
      });
    }
  });

  const grandTotal = allItems.reduce((s, i) => s + i.total, 0);

  // Customer info for paket orders
  let customerHtml = '';
  if (paket && orders.length > 0) {
    const o = orders[0];
    customerHtml = `
      <div style="background:rgba(168,85,247,0.08);border:1px solid rgba(168,85,247,0.2);border-radius:10px;padding:12px;margin-bottom:14px">
        <div style="font-size:0.78rem;font-weight:700;color:#a855f7;margin-bottom:6px">📦 Paket Bilgileri</div>
        <div style="font-size:0.82rem">👤 ${o.customer_name} &nbsp;|&nbsp; 📱 ${o.customer_phone}</div>
        <div style="font-size:0.78rem;color:var(--text-muted);margin-top:3px">📍 ${o.delivery_address || '-'}</div>
        ${o.delivered_by ? `<div style="font-size:0.78rem;color:var(--green);margin-top:3px">🏍️ Teslim Eden: ${o.delivered_by}</div>` : ''}
      </div>`;
  }

  // Receipt field for paket orders
  let receiptHtml = '';
  if (paket) {
    receiptHtml = `
      <div style="margin-top:14px;padding:12px;background:rgba(250,204,21,0.08);border:1px solid rgba(250,204,21,0.2);border-radius:10px">
        <label style="font-size:0.78rem;font-weight:700;color:#facc15;display:block;margin-bottom:6px">🧾 POS Fiş Numarası *</label>
        <input type="text" id="receipt-no-input" placeholder="Fiş numarasını girin..." style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border-primary);background:var(--bg-primary);color:var(--text-primary);font-size:0.88rem;font-weight:700;outline:none">
      </div>`;
  }

  document.getElementById('bill-items').innerHTML = customerHtml + allItems.map(i => `
    <div class="bill-item">
      <span>${i.quantity}× ${i.product_name}</span>
      <strong>₺${i.total.toLocaleString('tr-TR')}</strong>
    </div>
  `).join('') + receiptHtml || '<div style="color:var(--text-muted);text-align:center;padding:16px">Sipariş bulunamadı</div>';

  document.getElementById('bill-total').textContent = '₺' + grandTotal.toLocaleString('tr-TR');
  document.getElementById('close-modal').classList.add('active');
}

function closeCloseModal() {
  document.getElementById('close-modal').classList.remove('active');
  closingTableId = null;
}

async function payTable(method) {
  if (!closingTableId) return;
  const table = allTables.find(t => t.id === closingTableId);
  const paket = table && isPaketTable(table);
  const orders = tableOrders[closingTableId] || [];

  // Paket masalarda fiş no zorunlu
  let receiptNo = '';
  if (paket) {
    const input = document.getElementById('receipt-no-input');
    receiptNo = input ? input.value.trim() : '';
    if (!receiptNo) { showToast('POS fiş numarası zorunlu!', 'error'); return; }
  }

  try {
    for (const o of orders) {
      await fetch(`/api/orders/${o.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method: method, receipt_no: receiptNo })
      });
      socket.emit('order_paid', { order_id: o.id, table_id: closingTableId, method });
    }

    showToast(`✅ ${method === 'cash' ? 'Nakit' : 'Kart'} ödeme alındı${paket ? ' — Fiş: ' + receiptNo : ''}`, 'success');
    closeCloseModal();

    await loadAllTableOrders();
    renderTables();

  } catch (err) {
    showToast('Hata: ' + err.message, 'error');
  }
}

function printBill() {
  window.print();
}

// ── Deliver Order (Teslim Al) ────────────────────────────────
async function deliverOrder(tableId) {
  const orders = (tableOrders[tableId] || []).filter(o => o.status === 'ready');
  if (orders.length === 0) return showToast('Hazır sipariş yok', 'error');

  const userName = currentUser ? currentUser.display_name : 'Bilinmeyen';

  try {
    for (const o of orders) {
      const res = await fetch(`/api/orders/${o.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'delivered', delivered_by: userName })
      });
      if (!res.ok) {
        const err = await res.text();
        console.error('Deliver failed:', res.status, err);
        showToast('Teslim hatası: ' + (res.status === 401 ? 'Oturum dolmuş, F5 yapın' : err), 'error');
        return;
      }
      const order = await res.json();
      socket.emit('order_status_update', { order_id: o.id, status: 'delivered', order });
    }
    showToast(`✅ ${orders.length} sipariş teslim alındı — ${userName}`, 'success');
    await loadAllTableOrders();
    renderTables();
  } catch (e) {
    console.error('Deliver error:', e);
    showToast('Teslim işlemi başarısız: ' + e.message, 'error');
  }
}

// ── Toast ────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('toast-exit'); setTimeout(() => toast.remove(), 300); }, 2500);
}

// ── Socket: real-time updates ────────────────────────────────
socket.on('new_order', async () => {
  await loadAllTableOrders();
  renderTables();
});
socket.on('order_status_update', async () => {
  await loadAllTableOrders();
  renderTables();
});
socket.on('order_paid', async () => {
  await loadAllTableOrders();
  renderTables();
});
