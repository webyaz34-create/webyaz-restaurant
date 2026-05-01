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
const LICENSE_SERVER = process.env.LICENSE_SERVER_URL || 'http://localhost:4000';

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

  // ── License Verification ──────────────────────────────────
  let licenseCache = { valid: false, status: 'unknown', lastCheck: 0, data: null };
  const GRACE_DAYS = 7; // offline tolerance

  function getLicenseKey() {
    try {
      const r = db.exec("SELECT value FROM settings WHERE key='license_key'");
      return r.length > 0 ? r[0].values[0][0] : null;
    } catch(e) { return null; }
  }

  async function verifyLicense(key) {
    if (!key) return { valid: false, status: 'no_key' };
    try {
      const res = await fetch(LICENSE_SERVER + '/api/license/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_key: key })
      });
      const data = await res.json();
      licenseCache = { valid: data.valid, status: data.status || 'unknown', lastCheck: Date.now(), data };
      // Save last check timestamp
      db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('license_last_check', ?)", [new Date().toISOString()]);
      db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('license_status', ?)", [data.valid ? 'active' : (data.status || 'invalid')]);
      save();
      return data;
    } catch (err) {
      // Offline — use grace period
      console.log('⚠️ Lisans sunucusuna ulaşılamadı, offline mod...');
      try {
        const r = db.exec("SELECT value FROM settings WHERE key='license_last_check'");
        if (r.length > 0) {
          const lastCheck = new Date(r[0].values[0][0]);
          const daysSince = (Date.now() - lastCheck.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSince <= GRACE_DAYS) {
            licenseCache = { valid: true, status: 'offline_grace', lastCheck: lastCheck.getTime(), data: { valid: true, status: 'offline_grace' } };
            return { valid: true, status: 'offline_grace' };
          }
        }
      } catch(e) {}
      licenseCache = { valid: false, status: 'offline_expired', lastCheck: 0, data: null };
      return { valid: false, status: 'offline_expired', error: 'Lisans doğrulanamadı ve offline süre doldu' };
    }
  }

  // Verify on boot
  const bootKey = getLicenseKey();
  if (bootKey) {
    const result = await verifyLicense(bootKey);
    console.log(result.valid ? '✅ Lisans geçerli' : '⚠️ Lisans: ' + (result.status || 'invalid'));
  } else {
    console.log('🔑 Lisans anahtarı girilmemiş');
  }

  // Periodic check every 24 hours
  setInterval(async () => {
    const key = getLicenseKey();
    if (key) await verifyLicense(key);
  }, 24 * 60 * 60 * 1000);

  // License middleware for page routes
  function requireLicense(req, res, next) {
    const key = getLicenseKey();
    if (!key) return res.redirect('/license.html');
    if (!licenseCache.valid && licenseCache.status !== 'offline_grace') {
      return res.redirect('/license-expired.html');
    }
    next();
  }

  // ── License API endpoints ──────────────────────────────
  app.post('/api/license/activate', async (req, res) => {
    try {
      const { license_key } = req.body;
      if (!license_key) return res.status(400).json({ valid: false, error: 'Lisans anahtarı gerekli' });
      const result = await verifyLicense(license_key.toUpperCase().trim());
      if (result.valid) {
        db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('license_key', ?)", [license_key.toUpperCase().trim()]);
        save();
      }
      res.json(result);
    } catch (err) { res.status(500).json({ valid: false, error: err.message }); }
  });

  app.get('/api/license/status', (req, res) => {
    const key = getLicenseKey();
    res.json({
      license_key: key || '',
      ...licenseCache.data,
      status: licenseCache.status
    });
  });

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

  // Helper: serve a views/ page only for specific roles (with license check)
  function page(roles, file) {
    return [requireLicense, (req, res) => {
      const u = getUser(req);
      if (!u) return res.redirect('/login.html');
      if (!roles.includes(u.role)) return res.status(403).send(denyHTML);
      res.sendFile(path.join(VIEWS, file));
    }];
  }

  // Root — redirect based on role
  app.get('/', requireLicense, (req, res) => {
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
