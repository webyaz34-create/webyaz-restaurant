// ╔══════════════════════════════════════════════════════════════╗
// ║  WEBYAZ RESTAURANT — Delivery Tracking Panel JS              ║
// ╚══════════════════════════════════════════════════════════════╝

const socket = io();
let deliveryOrders = [];

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  socket.emit('join_room', 'delivery');
  loadDeliveryOrders();
  setInterval(loadDeliveryOrders, 10000);
});

socket.on('order_update', () => loadDeliveryOrders());
socket.on('new_order', () => loadDeliveryOrders());

// ── Load Orders ──────────────────────────────────────────────
async function loadDeliveryOrders() {
  try {
    const allOrders = await fetch('/api/orders?include_items=1').then(r => r.json());
    // Filter only delivery/takeaway orders
    deliveryOrders = allOrders.filter(o =>
      o.order_type === 'delivery' || o.order_type === 'takeaway'
    );
    renderBoard();
    updateStats();
  } catch (e) {
    console.error('Paket siparişler yüklenemedi:', e);
  }
}

// ── Render Board ─────────────────────────────────────────────
function renderBoard() {
  const preparing = deliveryOrders.filter(o => ['pending', 'preparing'].includes(o.status));
  const ready = deliveryOrders.filter(o => o.status === 'ready');
  const outForDelivery = deliveryOrders.filter(o => o.status === 'out_for_delivery');
  const delivered = deliveryOrders.filter(o => ['delivered', 'paid'].includes(o.status));

  renderColumn('col-preparing', preparing, 'count-preparing');
  renderColumn('col-ready', ready, 'count-ready');
  renderColumn('col-out', outForDelivery, 'count-out');
  renderColumn('col-delivered', delivered.slice(0, 20), 'count-delivered');
}

function renderColumn(containerId, orders, countId) {
  const container = document.getElementById(containerId);
  document.getElementById(countId).textContent = orders.length;

  if (orders.length === 0) {
    container.innerHTML = `
      <div class="delivery-empty">
        <div class="delivery-empty-icon">${getEmptyIcon(containerId)}</div>
        <div>Sipariş yok</div>
      </div>`;
    return;
  }

  container.innerHTML = orders.map(o => renderCard(o, containerId)).join('');
}

function getEmptyIcon(colId) {
  const icons = { 'col-preparing': '🍳', 'col-ready': '✅', 'col-out': '🏃', 'col-delivered': '📋' };
  return icons[colId] || '📦';
}

function renderCard(order, colId) {
  const isDelivery = order.order_type === 'delivery';
  const typeClass = isDelivery ? 'type-delivery' : 'type-takeaway';
  const typeLabel = isDelivery ? '🚀 Teslim' : '🥡 Gel-Al';

  const timeDiff = getTimeDiff(order.created_at);
  const itemsList = (order.items || []).map(i => `${i.quantity}× ${i.product_name}`).join(', ');

  let actions = '';
  if (colId === 'col-preparing') {
    actions = `<div class="delivery-card-actions">
      <button class="btn btn-success btn-sm" onclick="updateStatus(${order.id}, 'ready')">✅ Hazır</button>
      <button class="btn btn-danger btn-sm" onclick="updateStatus(${order.id}, 'cancelled')">✕ İptal</button>
    </div>`;
  } else if (colId === 'col-ready') {
    if (isDelivery) {
      actions = `<div class="delivery-card-actions">
        <button class="btn btn-warning btn-sm" onclick="updateStatus(${order.id}, 'out_for_delivery')">🏃 Kuryeye Ver</button>
      </div>`;
    } else {
      actions = `<div class="delivery-card-actions">
        <button class="btn btn-success btn-sm" onclick="updateStatus(${order.id}, 'delivered')">📦 Teslim Edildi</button>
      </div>`;
    }
  } else if (colId === 'col-out') {
    actions = `<div class="delivery-card-actions">
      <button class="btn btn-success btn-sm" onclick="updateStatus(${order.id}, 'delivered')">📦 Teslim Edildi</button>
    </div>`;
  }

  return `
    <div class="delivery-card">
      <div class="delivery-card-header">
        <span class="delivery-card-id">#${order.id}</span>
        <span class="delivery-card-type ${typeClass}">${typeLabel}</span>
      </div>
      <div class="delivery-card-customer">
        👤 ${order.customer_name || 'Belirtilmedi'} ${order.customer_phone ? '• 📱 ' + order.customer_phone : ''}
      </div>
      ${isDelivery && order.delivery_address ? `<div style="font-size:0.7rem;color:var(--text-tertiary);margin-bottom:4px">📍 ${order.delivery_address}</div>` : ''}
      <div class="delivery-card-items">
        ${itemsList || 'Ürün bilgisi yok'}
      </div>
      <div class="delivery-card-footer">
        <span class="delivery-card-amount">₺${(order.total_amount || 0).toLocaleString('tr-TR')}</span>
        <span class="delivery-card-time">⏱ ${timeDiff}</span>
      </div>
      ${actions}
    </div>`;
}

// ── Update Stats ─────────────────────────────────────────────
function updateStats() {
  const active = deliveryOrders.filter(o => !['delivered', 'paid', 'cancelled'].includes(o.status));
  const completed = deliveryOrders.filter(o => ['delivered', 'paid'].includes(o.status));
  const revenue = completed.reduce((sum, o) => sum + (o.total_amount || 0), 0);

  document.getElementById('stat-active').textContent = active.length;
  document.getElementById('stat-today').textContent = completed.length;
  document.getElementById('stat-revenue').textContent = '₺' + revenue.toLocaleString('tr-TR');
}

// ── Update Order Status ──────────────────────────────────────
async function updateStatus(orderId, status) {
  try {
    await fetch(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    socket.emit('order_update', { orderId, status });
    showToast(getStatusMessage(status), 'success');
    loadDeliveryOrders();
  } catch (e) {
    showToast('Durum güncellenemedi', 'error');
  }
}

function getStatusMessage(status) {
  const msgs = {
    ready: '✅ Sipariş hazır!',
    out_for_delivery: '🏃 Kurye yola çıktı!',
    delivered: '📦 Sipariş teslim edildi!',
    cancelled: '✕ Sipariş iptal edildi',
  };
  return msgs[status] || 'Durum güncellendi';
}

// ── Helpers ──────────────────────────────────────────────────
function getTimeDiff(dateStr) {
  if (!dateStr) return '—';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1) return 'Şimdi';
  if (diff < 60) return `${diff} dk`;
  return `${Math.floor(diff / 60)} sa ${diff % 60} dk`;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('toast-exit'); setTimeout(() => toast.remove(), 300); }, 3000);
}
