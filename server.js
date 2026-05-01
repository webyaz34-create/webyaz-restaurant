const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { initDatabase, saveDatabase } = require('./database/init');

// ── Initialize ──────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Start ───────────────────────────────────────────────────
(async () => {
  const db = await initDatabase();
  const save = () => saveDatabase(db);

  // ── API Routes ──────────────────────────────────────────
  const apiRoutes = require('./routes/api')(db, save);
  const uploadRoutes = require('./routes/upload');

  app.use('/api', apiRoutes);
  app.use('/api/upload', uploadRoutes);

  // ── Helper: check if setup is complete ─────────────────
  function isSetupComplete() {
    try {
      const rows = db.exec("SELECT value FROM settings WHERE key='is_setup_complete'");
      return rows.length > 0 && rows[0].values[0][0] === 'true';
    } catch (e) { return false; }
  }

  // ── Page Routes ─────────────────────────────────────────
  app.get('/setup', (req, res) => res.sendFile(path.join(__dirname, 'public', 'setup.html')));
  
  app.get('/', (req, res) => {
    if (!isSetupComplete()) return res.redirect('/setup');
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  });
  app.get('/admin', (req, res) => {
    if (!isSetupComplete()) return res.redirect('/setup');
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  });
  app.get('/order/:tableId?', (req, res) => res.sendFile(path.join(__dirname, 'public', 'order.html')));
  app.get('/kitchen', (req, res) => res.sendFile(path.join(__dirname, 'public', 'kitchen.html')));
  app.get('/cashier', (req, res) => res.sendFile(path.join(__dirname, 'public', 'cashier.html')));
  app.get('/delivery', (req, res) => res.sendFile(path.join(__dirname, 'public', 'delivery.html')));

  // ── Socket.IO ───────────────────────────────────────────
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.on('join_room', (room) => {
      socket.join(room);
      console.log(`📡 ${socket.id} joined room: ${room}`);
    });

    socket.on('new_order', (order) => {
      console.log(`🆕 New order #${order.id} for ${order.table_name}`);
      io.to('kitchen').emit('new_order', order);
      io.to('cashier').emit('new_order', order);
      socket.emit('order_confirmed', order);
    });

    socket.on('order_status_update', (data) => {
      console.log(`📋 Order #${data.order_id} status → ${data.status}`);
      io.emit('order_status_update', data);
    });

    socket.on('item_status_update', (data) => {
      console.log(`📦 Item #${data.item_id} status → ${data.status}`);
      io.emit('item_status_update', data);
    });

    socket.on('table_status_update', (data) => {
      console.log(`🪑 Table #${data.table_id} status → ${data.status}`);
      io.to('cashier').emit('table_status_update', data);
    });

    socket.on('order_paid', (data) => {
      console.log(`💰 Order #${data.order_id} paid via ${data.payment_method}`);
      io.emit('order_paid', data);
    });

    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });

  // ── Start Server ────────────────────────────────────────
  const HOST = process.env.HOST || '0.0.0.0';
  server.listen(PORT, HOST, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║     🍽️  Webyaz Restaurant Otomasyon Sistemi          ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log(`║  🌐 Sunucu:      http://localhost:${PORT}               ║`);
    console.log(`║  👨‍💼 Admin:       http://localhost:${PORT}/admin         ║`);
    console.log(`║  📱 Sipariş:     http://localhost:${PORT}/order/1       ║`);
    console.log(`║  📦 Paket Servis: http://localhost:${PORT}/delivery     ║`);
    console.log(`║  👨‍🍳 Mutfak:      http://localhost:${PORT}/kitchen       ║`);
    console.log(`║  💰 Kasa:        http://localhost:${PORT}/cashier       ║`);
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log('');
  });
})();
