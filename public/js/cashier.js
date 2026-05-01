// ╔══════════════════════════════════════════════════════════════╗
// ║  WEBYAZ RESTAURANT — Cashier Screen JS                      ║
// ╚══════════════════════════════════════════════════════════════╝

const socket = io();
let tables = [];
let selectedTableId = null;
let selectedTableOrders = [];
let deliveryOrders = [];
let selectedDeliveryOrder = null;

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  socket.emit('join_room', 'cashier');
  loadSummary();
  loadTables();
  loadDeliveryOrders();
  setInterval(loadSummary, 30000);
  setInterval(loadDeliveryOrders, 15000);
});

// ── Summary ──────────────────────────────────────────────────
async function loadSummary() {
  try {
    const data = await fetch('/api/reports/summary').then(r => r.json());
    document.getElementById('summary-revenue').textContent = '₺' + (data.today_revenue || 0).toLocaleString('tr-TR');
    document.getElementById('summary-orders').textContent = data.today_orders || 0;
    document.getElementById('summary-active').textContent = data.active_orders || 0;
    document.getElementById('summary-tables').textContent = `${data.active_tables || 0}/${data.total_tables || 0}`;
  } catch (e) {}
}

// ── Tables ───────────────────────────────────────────────────
async function loadTables() {
  try {
    tables = await fetch('/api/tables').then(r => r.json());
    renderTables();
  } catch (e) {
    showToast('Masalar yüklenemedi', 'error');
  }
}

function renderTables() {
  const container = document.getElementById('cashier-tables');
  
  // Group by floor
  const floors = {};
  tables.forEach(t => {
    if (!floors[t.floor]) floors[t.floor] = [];
    floors[t.floor].push(t);
  });
  
  container.innerHTML = Object.entries(floors).map(([floor, floorTables]) => `
    <div class="floor-section">
      <div class="floor-title">${floor}</div>
      <div class="tables-grid">
        ${floorTables.map(t => `
          <div class="cashier-table-card ${t.status} ${selectedTableId === t.id ? 'active' : ''}" onclick="selectTable(${t.id})">
            <div class="cashier-table-name">${t.name}</div>
            ${t.active_orders > 0 ? `
              <div class="cashier-table-amount">₺${(t.active_total || 0).toLocaleString('tr-TR')}</div>
              <div class="cashier-table-info">${t.active_orders} sipariş</div>
            ` : `
              <div class="cashier-table-info" style="margin-top:4px">${t.capacity} kişilik</div>
            `}
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
  
  // Render delivery orders section
  renderDeliverySection(container);
}

// ── Delivery Orders ──────────────────────────────────────────
async function loadDeliveryOrders() {
  try {
    const allOrders = await fetch('/api/orders?today=1').then(r => r.json());
    deliveryOrders = allOrders.filter(o => 
      (o.order_type === 'delivery' || o.order_type === 'takeaway') && 
      !['paid', 'cancelled'].includes(o.status)
    );
    renderTables();
  } catch (e) {}
}

function renderDeliverySection(container) {
  if (deliveryOrders.length === 0) return;
  
  const html = `
    <div class="floor-section delivery-section">
      <div class="floor-title">📦 PAKET SERVİS / GEL-AL</div>
      <div class="tables-grid">
        ${deliveryOrders.map(o => {
          const isDelivery = o.order_type === 'delivery';
          return `
            <div class="cashier-table-card occupied delivery-card ${selectedDeliveryOrder === o.id ? 'active' : ''}" onclick="selectDeliveryOrder(${o.id})">
              <div class="cashier-table-name">${isDelivery ? '📦' : '🥡'} #${o.id}</div>
              <div class="cashier-table-amount">₺${o.total_amount.toLocaleString('tr-TR')}</div>
              <div class="cashier-table-info">${isDelivery ? 'Adrese Teslim' : 'Gel-Al'}</div>
              <div class="cashier-table-info" style="font-size:0.7rem;margin-top:2px">${o.customer_name}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', html);
}

async function selectDeliveryOrder(orderId) {
  selectedTableId = null;
  selectedDeliveryOrder = orderId;
  renderTables();
  
  try {
    const order = await fetch(`/api/orders/${orderId}`).then(r => r.json());
    selectedTableOrders = [order];
    renderDeliveryDetail(order);
  } catch (e) {
    showToast('Sipariş bilgileri yüklenemedi', 'error');
  }
}

function renderDeliveryDetail(order) {
  const emptyEl = document.getElementById('detail-empty');
  const contentEl = document.getElementById('detail-content');
  const footerEl = document.getElementById('detail-footer');
  
  emptyEl.style.display = 'none';
  contentEl.style.display = 'flex';
  footerEl.style.display = 'block';
  
  const isDelivery = order.order_type === 'delivery';
  document.getElementById('detail-table-name').textContent = isDelivery ? '📦 Paket Servis #' + order.id : '🥡 Gel-Al #' + order.id;
  
  document.getElementById('detail-customer').innerHTML = `
    👤 ${order.customer_name} &nbsp;|&nbsp; 📱 ${order.customer_phone}
    ${isDelivery && order.delivery_address ? `<br>📍 ${order.delivery_address}` : ''}
  `;
  
  const ordersContainer = document.getElementById('detail-orders');
  ordersContainer.innerHTML = `
    <div class="detail-order-group">
      <div class="detail-order-header">
        <div>
          <span class="detail-order-id">Sipariş #${order.id}</span>
          <span class="badge badge-${order.status}" style="margin-left:8px">${statusText(order.status)}</span>
          <span class="badge" style="margin-left:4px;background:${isDelivery ? '#f97316' : '#22c55e'};color:#fff">${isDelivery ? 'Paket' : 'Gel-Al'}</span>
        </div>
        <span class="detail-order-time">${new Date(order.created_at).toLocaleTimeString('tr-TR')}</span>
      </div>
      ${(order.items || []).map(item => `
        <div class="detail-item">
          <div class="detail-item-left">
            <span class="detail-item-qty">${item.quantity}×</span>
            <span>${item.product_name}</span>
          </div>
          <span class="detail-item-price">₺${item.total_price.toLocaleString('tr-TR')}</span>
        </div>
      `).join('')}
    </div>
  `;
  
  document.getElementById('detail-total').textContent = '₺' + order.total_amount.toLocaleString('tr-TR');
}

// ── Select Table ─────────────────────────────────────────────
async function selectTable(tableId) {
  selectedTableId = tableId;
  renderTables();
  
  try {
    selectedTableOrders = await fetch(`/api/tables/${tableId}/orders`).then(r => r.json());
    renderDetail();
  } catch (e) {
    showToast('Sipariş bilgileri yüklenemedi', 'error');
  }
}

function renderDetail() {
  const table = tables.find(t => t.id === selectedTableId);
  if (!table) return;
  
  const emptyEl = document.getElementById('detail-empty');
  const contentEl = document.getElementById('detail-content');
  const footerEl = document.getElementById('detail-footer');
  
  if (selectedTableOrders.length === 0) {
    emptyEl.style.display = 'flex';
    contentEl.style.display = 'none';
    document.getElementById('detail-table-name').textContent = table.name;
    // Actually show content but with empty message
    emptyEl.innerHTML = `
      <div class="detail-empty-icon">🪑</div>
      <div><strong>${table.name}</strong></div>
      <div style="margin-top:8px;color:var(--text-tertiary)">Bu masada aktif sipariş yok</div>
    `;
    return;
  }
  
  emptyEl.style.display = 'none';
  contentEl.style.display = 'flex';
  footerEl.style.display = 'block';
  
  document.getElementById('detail-table-name').textContent = table.name;
  
  // Get customer info from latest order
  const latestOrder = selectedTableOrders[0];
  document.getElementById('detail-customer').innerHTML = `
    👤 ${latestOrder.customer_name} &nbsp;|&nbsp; 📱 ${latestOrder.customer_phone}
  `;
  
  // Render orders
  const ordersContainer = document.getElementById('detail-orders');
  ordersContainer.innerHTML = selectedTableOrders.map(order => `
    <div class="detail-order-group">
      <div class="detail-order-header">
        <div>
          <span class="detail-order-id">Sipariş #${order.id}</span>
          <span class="badge badge-${order.status}" style="margin-left:8px">${statusText(order.status)}</span>
        </div>
        <span class="detail-order-time">${new Date(order.created_at).toLocaleTimeString('tr-TR')}</span>
      </div>
      ${order.items.map(item => `
        <div class="detail-item">
          <div class="detail-item-left">
            <span class="detail-item-qty">${item.quantity}×</span>
            <span>${item.product_name}</span>
          </div>
          <span class="detail-item-price">₺${item.total_price.toLocaleString('tr-TR')}</span>
        </div>
      `).join('')}
    </div>
  `).join('');
  
  // Total
  const total = selectedTableOrders.reduce((sum, o) => sum + o.total_amount, 0);
  document.getElementById('detail-total').textContent = '₺' + total.toLocaleString('tr-TR');
}

function statusText(s) {
  const map = { pending: 'Beklemede', preparing: 'Hazırlanıyor', ready: 'Hazır', delivered: 'Teslim', paid: 'Ödendi', cancelled: 'İptal' };
  return map[s] || s;
}

// ── Payment ──────────────────────────────────────────────────
async function payOrder(method) {
  if (selectedTableOrders.length === 0) return;
  
  const methodName = method === 'cash' ? 'Nakit' : 'Kredi Kartı';
  if (!confirm(`${methodName} ile ödeme almak istediğinize emin misiniz?`)) return;
  
  try {
    for (const order of selectedTableOrders) {
      if (order.status === 'paid') continue;
      
      await fetch(`/api/orders/${order.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method: method }),
      });
      
      socket.emit('order_paid', { order_id: order.id, payment_method: method });
    }
    
    showToast('Ödeme alındı! Masa kapatıldı.', 'success');
    selectedTableOrders = [];
    await loadTables();
    await loadSummary();
    renderDetail();
    
    // Reset detail
    document.getElementById('detail-content').style.display = 'none';
    document.getElementById('detail-empty').style.display = 'flex';
    document.getElementById('detail-empty').innerHTML = `
      <div class="detail-empty-icon">✅</div>
      <div>Ödeme başarıyla alındı</div>
    `;
    
  } catch (e) {
    showToast('Ödeme işlemi başarısız', 'error');
  }
}

// ── Print Receipt ────────────────────────────────────────────
function printReceipt() {
  if (selectedTableOrders.length === 0) return;
  
  const table = tables.find(t => t.id === selectedTableId);
  const total = selectedTableOrders.reduce((sum, o) => sum + o.total_amount, 0);
  const now = new Date().toLocaleString('tr-TR');
  
  const allItems = [];
  selectedTableOrders.forEach(o => {
    o.items.forEach(item => {
      allItems.push(item);
    });
  });
  
  const receiptHTML = `
    <div style="font-family:monospace;font-size:12px;color:#000;background:#fff;padding:20px;width:80mm">
      <div style="text-align:center;margin-bottom:16px">
        <strong style="font-size:16px">WEBYAZ RESTAURANT</strong><br>
        <span>━━━━━━━━━━━━━━━━━━━━</span>
      </div>
      <div style="margin-bottom:8px">
        <strong>${table ? table.name : ''}</strong> | ${now}
      </div>
      <div style="border-top:1px dashed #000;border-bottom:1px dashed #000;padding:8px 0;margin-bottom:8px">
        ${allItems.map(item => `
          <div style="display:flex;justify-content:space-between;margin:4px 0">
            <span>${item.quantity}× ${item.product_name}</span>
            <span>₺${item.total_price.toLocaleString('tr-TR')}</span>
          </div>
        `).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:bold">
        <span>TOPLAM</span>
        <span>₺${total.toLocaleString('tr-TR')}</span>
      </div>
      <div style="text-align:center;margin-top:16px;font-size:10px;color:#666">
        Teşekkür ederiz, afiyet olsun!<br>
        www.webyaz.com
      </div>
    </div>
  `;
  
  const printWin = window.open('', '_blank', 'width=350,height=600');
  printWin.document.write(receiptHTML);
  printWin.document.close();
  printWin.focus();
  setTimeout(() => { printWin.print(); printWin.close(); }, 300);
}

// ── Socket Events ────────────────────────────────────────────
socket.on('new_order', (order) => {
  const isDelivery = order.order_type === 'delivery' || order.order_type === 'takeaway';
  const label = isDelivery ? (order.order_type === 'delivery' ? '📦 Paket' : '🥡 Gel-Al') : (order.table_name || 'Masa ' + order.table_id);
  showToast(`Yeni sipariş! #${order.id} — ${label}`, 'info');
  loadTables();
  loadDeliveryOrders();
  loadSummary();
  if (selectedTableId === order.table_id) {
    selectTable(selectedTableId);
  }
});

socket.on('order_status_update', (data) => {
  loadTables();
  if (selectedTableId && data.order && data.order.table_id === selectedTableId) {
    selectTable(selectedTableId);
  }
});

socket.on('order_paid', (data) => {
  loadTables();
  loadSummary();
});

// ── Toast ────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('toast-exit'); setTimeout(() => toast.remove(), 300); }, 3000);
}
