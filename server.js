const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const session = require('express-session');
const { initDatabase, saveDatabase } = require('./database/init');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const PORT = process.env.PORT || 3000;
const VIEWS = path.join(__dirname, 'views');

// ── Middleware ──────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'webyaz-restaurant-secret-2024',
  resave: false, saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

async function boot() {
  const db = await initDatabase();
  const save = () => saveDatabase(db);

  // Helper: get current session user
  const getUser = (req) => req.session ? req.session.user : null;

  // ── Auth API Endpoints (/api/auth/*) ─────────────────────
  // These must be defined BEFORE the CRUD apiRoutes so they
  // are accessible without any auth middleware interference.

  app.post('/api/auth/login', (req, res) => {
    try {
      const { username, password } = req.body;
      const stmt = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1');
      stmt.bind([username]);
      if (!stmt.step()) { stmt.free(); return res.status(401).json({ error: 'Kullanıcı bulunamadı' }); }
      const user = stmt.getAsObject(); stmt.free();
      if (user.password !== password) return res.status(401).json({ error: 'Şifre hatalı' });
      req.session.user = { id: user.id, username: user.username, display_name: user.display_name, role: user.role };
      res.json({ success: true, user: req.session.user });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
  });

  app.get('/api/auth/me', (req, res) => {
    const u = getUser(req);
    if (u) return res.json(u);
    res.status(401).json({ error: 'Oturum bulunamadı' });
  });

  // ── CRUD API Routes (/api/*) ─────────────────────────────
  const apiRoutes = require('./routes/api')(db, save);
  const uploadRoutes = require('./routes/upload');
  app.use('/api', apiRoutes);
  app.use('/api', uploadRoutes);

  // ── Page Routes ──────────────────────────────────────────
  // Login page — public (served from public/ by express.static)
  // All other pages — served from views/ with role-based access

  // Access denied page
  const denyHTML = `<html><body style="background:#0D1117;color:#F0F6FC;font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column"><h1 style="font-size:4rem;margin-bottom:16px">🚫</h1><h2>Erişim Reddedildi</h2><p style="color:#8B949E;margin:8px 0 24px">Bu sayfaya erişim yetkiniz bulunmamaktadır.</p><a href="/" style="color:#f97316;text-decoration:none;font-weight:600">← Ana Sayfaya Dön</a></body></html>`;

  // Helper: serve a views/ page only for specific roles
  function page(roles, file) {
    return (req, res) => {
      const u = getUser(req);
      if (!u) return res.redirect('/login.html');
      if (!roles.includes(u.role)) return res.status(403).send(denyHTML);
      res.sendFile(path.join(VIEWS, file));
    };
  }

  // Root — redirect based on role
  app.get('/', (req, res) => {
    const u = getUser(req);
    if (!u) return res.redirect('/login.html');
    // Check setup complete
    try {
      const r = db.exec("SELECT value FROM settings WHERE key='is_setup_complete'");
      const isSetup = r.length > 0 && r[0].values[0][0] === 'true';
      if (!isSetup) return res.redirect('/setup');
    } catch(e) { /* ignore */ }
    // Role-based redirect
    if (u.role === 'cashier') return res.redirect('/cashier');
    if (u.role === 'kitchen') return res.redirect('/kitchen');
    if (u.role === 'waiter') return res.redirect('/order/1');
    if (u.role === 'delivery') return res.redirect('/delivery');
    res.sendFile(path.join(VIEWS, 'admin.html'));
  });

  app.get('/admin', page(['admin'], 'admin.html'));
  app.get('/order/:tableId?', page(['admin', 'waiter', 'cashier'], 'order.html'));
  app.get('/kitchen', page(['admin', 'kitchen'], 'kitchen.html'));
  app.get('/cashier', page(['admin', 'cashier'], 'cashier.html'));
  app.get('/delivery', page(['admin', 'delivery'], 'delivery.html'));
  app.get('/setup', page(['admin'], 'setup.html'));

  // ── Socket.IO ──────────────────────────────────────────────
  io.on('connection', (socket) => {
    socket.on('join_room', (room) => socket.join(room));
    socket.on('new_order', (o) => {
      io.to('kitchen').emit('new_order', o);
      io.to('cashier').emit('new_order', o);
      socket.emit('order_confirmed', o);
    });
    socket.on('order_status_update', (d) => io.emit('order_status_update', d));
    socket.on('item_status_update', (d) => io.emit('item_status_update', d));
    socket.on('table_status_update', (d) => io.to('cashier').emit('table_status_update', d));
    socket.on('order_paid', (d) => io.emit('order_paid', d));
  });

  // ── Start Server ─────────────────────────────────────────
  const HOST = process.env.HOST || '0.0.0.0';
  server.listen(PORT, HOST, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║     🍽️  Webyaz Restaurant Otomasyon Sistemi          ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log(`║  🌐 http://localhost:${PORT}                            ║`);
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log(`║  🔐 Giriş        →  /login.html                     ║`);
    console.log(`║  👨‍💼 Admin Panel  →  /admin                          ║`);
    console.log(`║  📱 Sipariş      →  /order/1                        ║`);
    console.log(`║  📦 Paket Servis →  /delivery                       ║`);
    console.log(`║  👨‍🍳 Mutfak      →  /kitchen                        ║`);
    console.log(`║  💰 Kasa         →  /cashier                        ║`);
    console.log(`║  ⚙️  Kurulum     →  /setup                          ║`);
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log('');
  });
}

boot().catch(e => { console.error('❌ Başlatma hatası:', e); process.exit(1); });
