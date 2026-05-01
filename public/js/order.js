// ╔══════════════════════════════════════════════════════════════╗
// ║  WEBYAZ RESTAURANT — Order Screen JS                        ║
// ╚══════════════════════════════════════════════════════════════╝

const socket = io();
let cart = [];
let allProducts = [];
let allCategories = [];
let currentCategory = null;
let tableId = null;
let tableInfo = null;

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Extract table ID from URL
  const pathParts = window.location.pathname.split('/');
  tableId = parseInt(pathParts[pathParts.length - 1]) || 1;
  
  loadTableInfo();
  loadMenu();
});

async function loadTableInfo() {
  try {
    const tables = await fetch('/api/tables').then(r => r.json());
    tableInfo = tables.find(t => t.id === tableId);
    if (tableInfo) {
      document.getElementById('table-badge').textContent = tableInfo.name;
      document.getElementById('customer-table').value = tableInfo.name;
    } else {
      document.getElementById('table-badge').textContent = 'Masa ' + tableId;
      document.getElementById('customer-table').value = 'Masa ' + tableId;
    }
  } catch (e) {
    document.getElementById('table-badge').textContent = 'Masa ' + tableId;
  }
}

async function loadMenu() {
  try {
    allCategories = await fetch('/api/categories').then(r => r.json());
    allProducts = await fetch('/api/products?active_only=1').then(r => r.json());
    renderCategories();
    renderProducts();
  } catch (e) {
    showToast('Menü yüklenemedi', 'error');
  }
}

// ── Categories ───────────────────────────────────────────────
function renderCategories() {
  const container = document.getElementById('category-tabs');
  const activeCategories = allCategories.filter(c => c.is_active);
  container.innerHTML = `
    <button class="category-tab ${!currentCategory ? 'active' : ''}" onclick="selectCategory(null)">🍽️ Tümü</button>
    ${activeCategories.map(c => `
      <button class="category-tab ${currentCategory === c.id ? 'active' : ''}" onclick="selectCategory(${c.id})">${c.icon} ${c.name}</button>
    `).join('')}
  `;
}

function selectCategory(catId) {
  currentCategory = catId;
  renderCategories();
  renderProducts();
}

// ── Products ─────────────────────────────────────────────────
function renderProducts() {
  const grid = document.getElementById('product-grid');
  const empty = document.getElementById('products-empty');
  
  let filtered = allProducts.filter(p => p.is_active);
  if (currentCategory) filtered = filtered.filter(p => p.category_id === currentCategory);
  
  if (filtered.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  
  empty.classList.add('hidden');
  grid.innerHTML = filtered.map(p => `
    <div class="product-card" onclick="addToCart(${p.id})">
      <div class="product-img">${p.image_path ? `<img src="${p.image_path}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover">` : getCategoryIcon(p.category_id)}</div>
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        <div class="product-price">₺${p.price.toLocaleString('tr-TR')}</div>
      </div>
    </div>
  `).join('');
}

function getCategoryIcon(catId) {
  const cat = allCategories.find(c => c.id === catId);
  return cat ? cat.icon : '🍽️';
}

// ── Cart ─────────────────────────────────────────────────────
function addToCart(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;
  
  const existing = cart.find(item => item.product_id === productId);
  if (existing) {
    existing.quantity++;
    existing.total_price = existing.quantity * existing.unit_price;
  } else {
    cart.push({
      product_id: product.id,
      product_name: product.name,
      unit_price: product.price,
      quantity: 1,
      total_price: product.price,
      notes: '',
    });
  }
  
  updateCartUI();
  showToast(`${product.name} sepete eklendi`, 'success');
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCartUI();
}

function changeQty(index, delta) {
  cart[index].quantity += delta;
  if (cart[index].quantity <= 0) {
    cart.splice(index, 1);
  } else {
    cart[index].total_price = cart[index].quantity * cart[index].unit_price;
  }
  updateCartUI();
}

function updateCartUI() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.total_price, 0);
  
  document.getElementById('cart-count').textContent = count;
  document.getElementById('cart-total').textContent = '₺' + total.toLocaleString('tr-TR');
  
  const itemsContainer = document.getElementById('cart-items');
  const footer = document.getElementById('cart-footer');
  
  if (cart.length === 0) {
    if (footer) footer.style.display = 'none';
    itemsContainer.innerHTML = `
      <div class="empty-state" id="cart-empty">
        <div class="empty-state-icon">🛒</div>
        <div class="empty-state-text">Sepetiniz boş</div>
        <div class="empty-state-subtext">Menüden ürün ekleyin</div>
      </div>
    `;
    return;
  }
  
  if (footer) footer.style.display = 'block';
  
  itemsContainer.innerHTML = cart.map((item, i) => `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.product_name}</div>
        <div class="cart-item-price">₺${item.unit_price.toLocaleString('tr-TR')} × ${item.quantity} = <strong>₺${item.total_price.toLocaleString('tr-TR')}</strong></div>
      </div>
      <div class="cart-item-qty">
        <button onclick="changeQty(${i}, -1)">−</button>
        <span>${item.quantity}</span>
        <button onclick="changeQty(${i}, 1)">+</button>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart(${i})">✕</button>
    </div>
  `).join('');
}

function toggleCart() {
  document.getElementById('cart-overlay').classList.toggle('active');
  document.getElementById('cart-sidebar').classList.toggle('active');
}

// ── Checkout ─────────────────────────────────────────────────
function showCheckout() {
  if (cart.length === 0) return showToast('Sepetiniz boş', 'warning');
  
  // Close cart sidebar
  document.getElementById('cart-overlay').classList.remove('active');
  document.getElementById('cart-sidebar').classList.remove('active');
  
  // Fill checkout summary
  const total = cart.reduce((sum, item) => sum + item.total_price, 0);
  document.getElementById('checkout-total').textContent = '₺' + total.toLocaleString('tr-TR');
  document.getElementById('checkout-items').innerHTML = cart.map(item => `
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-primary);font-size:0.88rem">
      <span>${item.quantity}× ${item.product_name}</span>
      <strong>₺${item.total_price.toLocaleString('tr-TR')}</strong>
    </div>
  `).join('');
  
  document.getElementById('checkout-modal').classList.add('active');
}

function closeCheckout() {
  document.getElementById('checkout-modal').classList.remove('active');
}

async function submitOrder() {
  const name = document.getElementById('customer-name').value.trim();
  const phone = document.getElementById('customer-phone').value.trim();
  const notes = document.getElementById('customer-notes').value.trim();
  
  if (!name) return showToast('Ad Soyad alanı zorunludur', 'error');
  if (!phone) return showToast('Telefon alanı zorunludur', 'error');
  if (cart.length === 0) return showToast('Sepetiniz boş', 'error');
  
  const btn = document.getElementById('submit-order-btn');
  btn.disabled = true;
  btn.textContent = 'Gönderiliyor...';
  
  try {
    const orderData = {
      table_id: tableId,
      customer_name: name,
      customer_phone: phone,
      notes: notes,
      items: cart.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        notes: item.notes,
      })),
    };
    
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    
    const order = await res.json();
    
    if (order.error) {
      showToast(order.error, 'error');
      btn.disabled = false;
      btn.textContent = '✓ Siparişi Onayla';
      return;
    }
    
    // Emit to kitchen & cashier
    socket.emit('new_order', order);
    
    // Show success
    closeCheckout();
    document.getElementById('order-number').textContent = '#' + order.id;
    document.getElementById('success-overlay').classList.add('active');
    
    // Clear cart
    cart = [];
    updateCartUI();
    
  } catch (err) {
    showToast('Sipariş gönderilemedi: ' + err.message, 'error');
    btn.disabled = false;
    btn.textContent = '✓ Siparişi Onayla';
  }
}

function newOrder() {
  document.getElementById('success-overlay').classList.remove('active');
  document.getElementById('customer-name').value = '';
  document.getElementById('customer-phone').value = '';
  document.getElementById('customer-notes').value = '';
  const btn = document.getElementById('submit-order-btn');
  btn.disabled = false;
  btn.textContent = '✓ Siparişi Onayla';
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

// ── Socket Events ────────────────────────────────────────────
socket.on('order_status_update', (data) => {
  // Could update order tracking here
});
