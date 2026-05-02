// ╔══════════════════════════════════════════════════════════════╗
// ║  WEBYAZ RESTAURANT — Kitchen Display JS                     ║
// ╚══════════════════════════════════════════════════════════════╝

const socket = io();
let orders = [];
let soundEnabled = true;

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  socket.emit('join_room', 'kitchen');
  loadOrders();
  updateClock();
  setInterval(updateClock, 1000);
  setInterval(updateElapsedTimes, 30000);
});

function updateClock() {
  const now = new Date();
  document.getElementById('kitchen-clock').textContent = now.toLocaleTimeString('tr-TR');
}

// ── Load Orders ──────────────────────────────────────────────
async function loadOrders() {
  try {
    const allOrders = await fetch('/api/orders?today=1').then(r => r.json());
    orders = allOrders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status));
    renderOrders();
    updateStats();
  } catch (e) {
    console.error('Failed to load orders:', e);
  }
}

// ── Render ───────────────────────────────────────────────────
function renderOrders() {
  const grid = document.getElementById('kitchen-grid');
  const empty = document.getElementById('kitchen-empty');
  
  if (orders.length === 0) {
    grid.innerHTML = '';
    grid.appendChild(empty);
    empty.style.display = 'flex';
    return;
  }
  
  empty.style.display = 'none';
  
  // Sort: pending first, then preparing, then ready; within each, oldest first
  const statusOrder = { pending: 0, preparing: 1, ready: 2 };
  const sorted = [...orders].sort((a, b) => {
    const s = statusOrder[a.status] - statusOrder[b.status];
    if (s !== 0) return s;
    return new Date(a.created_at) - new Date(b.created_at);
  });
  
  grid.innerHTML = sorted.map(order => {
    const elapsed = getElapsedMinutes(order.created_at);
    const urgency = elapsed > 30 ? 'urgent' : elapsed > 15 ? 'warning' : 'ok';
    const isDelivery = order.order_type === 'delivery';
    const isTakeaway = order.order_type === 'takeaway';
    const isPaket = isDelivery || isTakeaway;
    
    // Determine table/type display
    let typeDisplay = '🪑 ' + (order.table_name || 'Masa ?');
    if (isDelivery) typeDisplay = '📦 PAKET SERVİS';
    else if (isTakeaway) typeDisplay = '🥡 GEL-AL';
    
    return `
      <div class="kitchen-order status-${order.status} ${isPaket ? 'delivery-order' : ''}" id="order-${order.id}">
        <div class="kitchen-order-header">
          <div>
            <div class="kitchen-order-id">#${order.id}</div>
            <div class="kitchen-order-time">
              <span class="kitchen-order-elapsed ${urgency}">${elapsed} dk</span>
            </div>
          </div>
          <div class="kitchen-order-table ${isPaket ? 'delivery-badge' : ''}">${typeDisplay}</div>
        </div>
        
        <div class="kitchen-order-customer">
          👤 ${order.customer_name} &nbsp;|&nbsp; 📱 ${order.customer_phone}
        </div>
        
        ${isDelivery && order.delivery_address ? `
          <div class="kitchen-order-address">
            📍 ${order.delivery_address}
          </div>
        ` : ''}
        
        <div class="kitchen-order-items">
          ${(order.items || []).map(item => `
            <div class="kitchen-item">
              <span class="kitchen-item-qty">${item.quantity}×</span>
              <span class="kitchen-item-name">${item.product_name}</span>
              ${item.notes ? `<span class="kitchen-item-note">📝 ${item.notes}</span>` : ''}
            </div>
          `).join('')}
        </div>
        
        ${order.notes ? `
          <div class="kitchen-order-notes">
            📝 ${order.notes}
          </div>
        ` : ''}
        
        <div class="kitchen-order-actions">
          ${order.status === 'pending' ? `
            <button class="btn btn-primary" onclick="updateStatus(${order.id}, 'preparing')">👨‍🍳 Hazırlamaya Başla</button>
          ` : order.status === 'preparing' ? `
            <button class="btn btn-success" onclick="updateStatus(${order.id}, 'ready')">✅ Hazır</button>
            <button class="btn btn-secondary" onclick="updateStatus(${order.id}, 'pending')">⏪ Geri</button>
          ` : order.status === 'ready' ? `
            <button class="btn btn-warning" onclick="updateStatus(${order.id}, 'delivered')">🚀 Teslim Edildi</button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function getElapsedMinutes(dateStr) {
  const created = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - created) / 60000);
}

function updateElapsedTimes() {
  renderOrders();
}

function updateStats() {
  document.getElementById('stat-pending').textContent = orders.filter(o => o.status === 'pending').length;
  document.getElementById('stat-preparing').textContent = orders.filter(o => o.status === 'preparing').length;
  document.getElementById('stat-ready').textContent = orders.filter(o => o.status === 'ready').length;
}

// ── Status Update ────────────────────────────────────────────
async function updateStatus(orderId, newStatus) {
  try {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Status update failed:', res.status, err);
      showToast('Durum güncellenemedi: ' + (res.status === 401 ? 'Oturum süresi dolmuş, sayfayı yenileyin' : err), 'error');
      return;
    }

    const order = await res.json();
    socket.emit('order_status_update', { order_id: orderId, status: newStatus, order });

    showToast(`Sipariş #${orderId}: ${statusText(newStatus)}`, 'success');

    // Reload all orders to get fresh data
    await loadOrders();
  } catch (e) {
    console.error('Status update error:', e);
    showToast('Bağlantı hatası, sayfa yenileniyor...', 'error');
    setTimeout(() => loadOrders(), 1000);
  }
}

function statusText(s) {
  const map = { pending: 'Beklemede', preparing: 'Hazırlanıyor', ready: 'Hazır', delivered: 'Teslim Edildi' };
  return map[s] || s;
}

// ── Sound ────────────────────────────────────────────────────
function toggleSound() {
  soundEnabled = !soundEnabled;
  const btn = document.getElementById('sound-toggle');
  btn.textContent = soundEnabled ? '🔔 Ses Açık' : '🔇 Ses Kapalı';
  btn.classList.toggle('active', soundEnabled);
}

function playNotification() {
  if (!soundEnabled) return;
  try {
    const audio = document.getElementById('notification-sound');
    audio.currentTime = 0;
    audio.play().catch(() => {});
    // Also try Web Audio API beep
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 1100;
      gain2.gain.value = 0.3;
      osc2.start();
      osc2.stop(ctx.currentTime + 0.3);
    }, 350);
  } catch (e) {}
}

// ── Socket Events ────────────────────────────────────────────
socket.on('new_order', (order) => {
  console.log('🆕 New order received:', order.id);
  orders.unshift(order);
  renderOrders();
  updateStats();
  playNotification();
  showToast(`Yeni sipariş! #${order.id} — ${order.table_name}`, 'warning');
  
  // Highlight new order
  setTimeout(() => {
    const el = document.getElementById('order-' + order.id);
    if (el) el.classList.add('new-order');
  }, 100);
});

socket.on('order_status_update', async (data) => {
  console.log('📡 Status update:', data.order_id, data.status);
  if (data.status === 'delivered') {
    showToast(`✅ Sipariş #${data.order_id} teslim alındı`, 'success');
  }
  // Always reload from API for accurate data
  await loadOrders();
});

// ── Toast ────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('toast-exit'); setTimeout(() => toast.remove(), 300); }, 4000);
}
