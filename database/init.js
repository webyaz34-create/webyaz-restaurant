const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'restaurant.db');
const BACKUP_DIR = path.join(__dirname, 'backups');
const DB_VERSION = 7; // Increment this when adding new migrations

async function initDatabase() {
  const SQL = await initSqlJs();
  let db;
  let isExisting = false;

  // Load existing DB or create new
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    isExisting = true;

    // Auto-backup on startup (keep last 10)
    autoBackup(buffer);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // ── Migration System ──────────────────────────────────────
  db.run(`CREATE TABLE IF NOT EXISTS db_meta (key TEXT PRIMARY KEY, value TEXT)`);
  const verRow = getOne(db, "SELECT value FROM db_meta WHERE key = 'db_version'");
  const currentVersion = verRow ? parseInt(verRow.value) : 0;

  if (isExisting && currentVersion < DB_VERSION) {
    console.log(`🔄 Veritabanı güncelleniyor: v${currentVersion} → v${DB_VERSION}`);
    runMigrations(db, currentVersion);
  }
  db.run("INSERT OR REPLACE INTO db_meta (key, value) VALUES ('db_version', ?)", [String(DB_VERSION)]);

  // ── Create Tables ────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '🍽️',
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      price REAL NOT NULL DEFAULT 0,
      cost_price REAL DEFAULT 0,
      category_id INTEGER,
      image_path TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      preparation_time INTEGER DEFAULT 15,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tables_info (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      capacity INTEGER DEFAULT 4,
      status TEXT DEFAULT 'available',
      floor TEXT DEFAULT 'Zemin Kat',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_id INTEGER,
      order_type TEXT DEFAULT 'dine_in',
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      delivery_address TEXT DEFAULT '',
      delivery_lat REAL DEFAULT 0,
      delivery_lng REAL DEFAULT 0,
      courier_id INTEGER DEFAULT NULL,
      courier_name TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      notes TEXT DEFAULT '',
      total_amount REAL DEFAULT 0,
      payment_method TEXT DEFAULT '',
      receipt_no TEXT DEFAULT '',
      delivered_by TEXT DEFAULT '',
      paid_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (table_id) REFERENCES tables_info(id) ON DELETE SET NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      unit_price REAL NOT NULL,
      cost_price REAL DEFAULT 0,
      total_price REAL NOT NULL,
      notes TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS product_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      table_id INTEGER,
      rating INTEGER NOT NULL DEFAULT 5,
      comment TEXT DEFAULT '',
      customer_name TEXT DEFAULT 'Misafir',
      customer_phone TEXT NOT NULL DEFAULT '',
      is_approved INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'waiter',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── Staff / Personel ──────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      position TEXT DEFAULT '',
      salary REAL DEFAULT 0,
      start_date TEXT DEFAULT '',
      tc_no TEXT DEFAULT '',
      address TEXT DEFAULT '',
      emergency_contact TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      notes TEXT DEFAULT '',
      photo TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS staff_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      description TEXT DEFAULT '',
      date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
    )
  `);

  // ── Cash Register / Kasa Açılış-Kapanış ───────────────────

  // ── Cari Hesaplar ─────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'customer',
      phone TEXT DEFAULT '',
      address TEXT DEFAULT '',
      tax_no TEXT DEFAULT '',
      balance REAL DEFAULT 0,
      notes TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS account_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      description TEXT DEFAULT '',
      date TEXT NOT NULL,
      order_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS cash_register (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      opened_by TEXT DEFAULT '',
      closed_by TEXT DEFAULT '',
      opening_amount REAL DEFAULT 0,
      closing_amount REAL DEFAULT 0,
      expected_amount REAL DEFAULT 0,
      cash_sales REAL DEFAULT 0,
      card_sales REAL DEFAULT 0,
      total_sales REAL DEFAULT 0,
      total_orders INTEGER DEFAULT 0,
      difference REAL DEFAULT 0,
      notes TEXT DEFAULT '',
      status TEXT DEFAULT 'open',
      opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME
    )
  `);

  // ── Stok / Inventory ──────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      unit TEXT DEFAULT 'kg',
      current_stock REAL DEFAULT 0,
      min_stock REAL DEFAULT 0,
      cost_per_unit REAL DEFAULT 0,
      category TEXT DEFAULT 'Genel',
      supplier_id INTEGER,
      notes TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES accounts(id) ON DELETE SET NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'in',
      quantity REAL NOT NULL DEFAULT 0,
      unit_cost REAL DEFAULT 0,
      total_cost REAL DEFAULT 0,
      description TEXT DEFAULT '',
      supplier_id INTEGER,
      date TEXT NOT NULL,
      created_by TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE,
      FOREIGN KEY (supplier_id) REFERENCES accounts(id) ON DELETE SET NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS product_recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      unit TEXT DEFAULT 'kg',
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
    )
  `);

  // ── Rezervasyonlar ─────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_id INTEGER,
      customer_name TEXT NOT NULL,
      customer_phone TEXT DEFAULT '',
      guest_count INTEGER DEFAULT 2,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      duration INTEGER DEFAULT 120,
      status TEXT DEFAULT 'pending',
      notes TEXT DEFAULT '',
      created_by TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (table_id) REFERENCES tables_info(id) ON DELETE SET NULL
    )
  `);

  // ── Giderler ──────────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL DEFAULT 'Genel',
      description TEXT DEFAULT '',
      amount REAL NOT NULL DEFAULT 0,
      payment_method TEXT DEFAULT 'cash',
      date TEXT NOT NULL,
      supplier_id INTEGER,
      receipt_no TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      is_recurring INTEGER DEFAULT 0,
      created_by TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES accounts(id) ON DELETE SET NULL
    )
  `);

  // ── Seed Data ────────────────────────────────────────────
  const countResult = db.exec('SELECT COUNT(*) as cnt FROM categories');
  const categoryCount = countResult.length > 0 ? countResult[0].values[0][0] : 0;

  if (categoryCount === 0) {
    console.log('📦 Seeding database with sample data...');

    // Default users
    const users = [
      ['admin', 'admin123', 'Yönetici', 'admin'],
      ['kasa', 'kasa123', 'Kasacı', 'cashier'],
      ['mutfak', 'mutfak123', 'Şef', 'kitchen'],
      ['garson', 'garson123', 'Garson', 'waiter'],
      ['paket', 'paket123', 'Paket Servis', 'delivery'],
    ];
    for (const [username, password, display_name, role] of users) {
      db.run('INSERT OR IGNORE INTO users (username, password, display_name, role) VALUES (?, ?, ?, ?)', [username, password, display_name, role]);
    }

    const categories = [
      ['Başlangıçlar', '🥗', 1], ['Ana Yemekler', '🥩', 2], ['Pizzalar', '🍕', 3],
      ['Burgerler', '🍔', 4], ['Makarnalar', '🍝', 5], ['Tatlılar', '🍰', 6],
      ['İçecekler', '🥤', 7], ['Kahvaltı', '🍳', 8],
    ];
    for (const [name, icon, sort] of categories) {
      db.run('INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)', [name, icon, sort]);
    }

    const products = [
      ['Mercimek Çorbası', 'Geleneksel Türk mercimek çorbası', 85, 1, 10, 1],
      ['Humus', 'Nohut ezmesi, zeytinyağı ve baharatlarla', 95, 1, 5, 2],
      ['Sigara Böreği', 'Çıtır yufka içinde peynirli börek (6 adet)', 110, 1, 12, 3],
      ['Atom Salata', 'Domates, biber, soğan, maydanoz ile acılı salata', 75, 1, 5, 4],
      ['Patlıcan Salatası', 'Közlenmiş patlıcan, domates, sarımsak', 90, 1, 8, 5],
      ['Kuzu Pirzola', 'Izgara kuzu pirzola, pilav ve ızgara sebze ile', 450, 2, 25, 1],
      ['Tavuk Şiş', 'Marine edilmiş tavuk şiş, lavaş ve sos ile', 280, 2, 20, 2],
      ['Adana Kebap', 'Acılı el yapımı Adana kebabı, lavaş ve közlenmiş domates', 320, 2, 20, 3],
      ['Iskender Kebap', 'Döner, tereyağlı domates sosu, yoğurt ve pide üzerinde', 350, 2, 18, 4],
      ['Karışık Izgara', 'Kuzu pirzola, köfte, tavuk şiş ve Adana', 520, 2, 30, 5],
      ['Margarita Pizza', 'Domates sosu, mozzarella, fesleğen', 180, 3, 15, 1],
      ['Karışık Pizza', 'Sucuk, mantar, biber, zeytin, mozzarella', 240, 3, 18, 2],
      ['Pepperoni Pizza', 'Pepperoni, mozzarella, domates sosu', 220, 3, 15, 3],
      ['Döner Pizza', 'Döner, domates, biber, mozzarella', 250, 3, 18, 4],
      ['Klasik Burger', '180gr dana köfte, marul, domates, soğan, turşu', 220, 4, 15, 1],
      ['Cheese Burger', '180gr dana köfte, cheddar peyniri, özel sos', 250, 4, 15, 2],
      ['Tavuk Burger', 'Çıtır tavuk, marul, mayo sos', 200, 4, 15, 3],
      ['Double Burger', '2x180gr dana köfte, çift cheddar, özel sos', 340, 4, 18, 4],
      ['Fettuccine Alfredo', 'Kremalı parmesan sos ile fettuccine', 190, 5, 15, 1],
      ['Bolonez Makarna', 'Kıymalı domates soslu spagetti', 200, 5, 15, 2],
      ['Penne Arrabbiata', 'Acılı domates soslu penne', 175, 5, 12, 3],
      ['Mantarlı Makarna', 'Kremalı mantar soslu tagliatelle', 195, 5, 15, 4],
      ['Künefe', 'Sıcak künefe, antep fıstığı ile', 160, 6, 12, 1],
      ['Sütlaç', 'Fırın sütlaç, tarçın ile', 90, 6, 5, 2],
      ['Cheesecake', 'New York usulü cheesecake, meyveli sos', 130, 6, 3, 3],
      ['Brownie', 'Sıcak çikolatalı brownie, dondurma ile', 140, 6, 8, 4],
      ['Baklava', 'Antep fıstıklı baklava (4 dilim)', 150, 6, 3, 5],
      ['Kola', 'Coca-Cola 330ml', 45, 7, 1, 1],
      ['Ayran', 'Ev yapımı ayran', 35, 7, 1, 2],
      ['Limonata', 'Taze sıkılmış limonata', 55, 7, 3, 3],
      ['Türk Çayı', 'Geleneksel demlik çay', 25, 7, 5, 4],
      ['Türk Kahvesi', 'Geleneksel Türk kahvesi', 50, 7, 5, 5],
      ['Espresso', 'Tek shot espresso', 55, 7, 3, 6],
      ['Latte', 'Sütlü espresso', 70, 7, 5, 7],
      ['Taze Portakal Suyu', 'Taze sıkılmış portakal suyu', 65, 7, 3, 8],
      ['Serpme Kahvaltı', 'Zengin serpme kahvaltı tabağı (2 kişilik)', 550, 8, 15, 1],
      ['Sahanda Yumurta', 'Tereyağında sahanda yumurta, sucuklu', 120, 8, 10, 2],
      ['Menemen', 'Geleneksel menemen, ekmek ile', 110, 8, 12, 3],
      ['Kaşarlı Tost', 'Kaşar peynirli ızgara tost', 85, 8, 8, 4],
    ];
    for (const [name, desc, price, cat, prep, sort] of products) {
      db.run('INSERT INTO products (name, description, price, category_id, preparation_time, sort_order) VALUES (?, ?, ?, ?, ?, ?)', [name, desc, price, cat, prep, sort]);
    }

    const tables = [
      ['Masa 1', 4, 'Zemin Kat'], ['Masa 2', 4, 'Zemin Kat'], ['Masa 3', 2, 'Zemin Kat'],
      ['Masa 4', 6, 'Zemin Kat'], ['Masa 5', 4, 'Zemin Kat'], ['Masa 6', 8, 'Zemin Kat'],
      ['Masa 7', 2, '1. Kat'], ['Masa 8', 4, '1. Kat'], ['Masa 9', 6, '1. Kat'], ['Masa 10', 4, '1. Kat'],
      ['Bahçe 1', 4, 'Bahçe'], ['Bahçe 2', 6, 'Bahçe'], ['Bahçe 3', 8, 'Bahçe'],
      ['VIP 1', 10, 'VIP'], ['VIP 2', 8, 'VIP'],
    ];
    for (const [name, cap, floor] of tables) {
      db.run('INSERT INTO tables_info (name, capacity, floor) VALUES (?, ?, ?)', [name, cap, floor]);
    }

    const settings = [
      ['restaurant_name', 'Webyaz Restaurant'], 
      ['restaurant_phone', '0212 555 00 00'],
      ['restaurant_address', 'İstanbul, Türkiye'], 
      ['restaurant_logo', ''],
      ['tax_no', ''],
      ['footer_text', 'Afiyet olsun! Teşekkür ederiz.'],
      ['primary_color', '#f97316'],
      ['currency', '₺'], 
      ['tax_rate', '10'],
      ['is_setup_complete', 'true'],
    ];
    for (const [key, val] of settings) {
      db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, val]);
    }

    console.log('✅ Database seeded successfully!');
  }

  // Save to file
  saveDatabase(db);

  return db;
}

function saveDatabase(db) {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// ── Helper: query one row ────────────────────────────────────
function getOne(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  if (stmt.step()) {
    const cols = stmt.getColumnNames();
    const vals = stmt.get();
    stmt.free();
    const row = {};
    cols.forEach((c, i) => { row[c] = vals[i]; });
    return row;
  }
  stmt.free();
  return null;
}

// ── Auto Backup ──────────────────────────────────────────────
function autoBackup(buffer) {
  try {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupFile = path.join(BACKUP_DIR, `restaurant_${ts}.db`);
    fs.writeFileSync(backupFile, buffer);

    // Keep only last 10 backups
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('restaurant_') && f.endsWith('.db'))
      .sort().reverse();
    files.slice(10).forEach(f => {
      try { fs.unlinkSync(path.join(BACKUP_DIR, f)); } catch (e) {}
    });

    console.log(`💾 Otomatik yedek alındı: ${path.basename(backupFile)}`);
  } catch (e) {
    console.error('⚠️ Yedekleme hatası:', e.message);
  }
}

// ── Manual Backup (called from API) ──────────────────────────
function createManualBackup() {
  if (!fs.existsSync(DB_PATH)) return null;
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const name = `manual_${ts}.db`;
  fs.copyFileSync(DB_PATH, path.join(BACKUP_DIR, name));
  return name;
}

function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.db'))
    .map(f => {
      const stats = fs.statSync(path.join(BACKUP_DIR, f));
      return { name: f, size: stats.size, date: stats.mtime };
    })
    .sort((a, b) => b.date - a.date);
}

function restoreBackup(filename) {
  const src = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(src)) throw new Error('Yedek dosyası bulunamadı');
  // Backup current before restoring
  const current = fs.readFileSync(DB_PATH);
  autoBackup(current);
  fs.copyFileSync(src, DB_PATH);
  return true;
}

// ── Migrations ───────────────────────────────────────────────
// Add new migrations here. Each migration runs only once.
// The `fromVersion` is checked so only new migrations run.
function runMigrations(db, fromVersion) {
  const safeAddColumn = (table, column, type, def) => {
    try { db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type} DEFAULT ${def}`); }
    catch (e) { /* column already exists, skip */ }
  };

  // v0 → v1: Initial schema (handled by CREATE TABLE IF NOT EXISTS)

  // v1 → v2: cost_price, staff, cash_register
  if (fromVersion < 2) {
    safeAddColumn('products', 'cost_price', 'REAL', '0');
    safeAddColumn('order_items', 'cost_price', 'REAL', '0');
    safeAddColumn('orders', 'courier_id', 'INTEGER', 'NULL');
    safeAddColumn('orders', 'courier_name', 'TEXT', "''");
    safeAddColumn('orders', 'delivered_by', 'TEXT', "''");
    console.log('  ✅ v2: cost_price, staff, cash_register tabloları eklendi');
  }

  // v2 → v3: staff photo
  if (fromVersion < 3) {
    safeAddColumn('staff', 'photo', 'TEXT', "''");
    console.log('  ✅ v3: personel fotoğraf sütunu eklendi');
  }

  // v3 → v4: cari hesaplar
  if (fromVersion < 4) {
    // Tables are created via CREATE TABLE IF NOT EXISTS
    console.log('  ✅ v4: cari hesap tabloları eklendi');
  }

  // v4 → v5: stok yönetimi
  if (fromVersion < 5) {
    // Tables are created via CREATE TABLE IF NOT EXISTS
    console.log('  ✅ v5: stok yönetimi tabloları eklendi (inventory_items, inventory_transactions, product_recipes)');
  }

  // v5 → v6: rezervasyonlar
  if (fromVersion < 6) {
    // Tables are created via CREATE TABLE IF NOT EXISTS
    console.log('  ✅ v6: rezervasyon tablosu eklendi');
  }

  // v6 → v7: gider yönetimi
  if (fromVersion < 7) {
    // Tables are created via CREATE TABLE IF NOT EXISTS
    console.log('  ✅ v7: gider tablosu eklendi');
  }

  // ────────────────────────────────────────────────────────────
  // Yeni migration eklerken: DB_VERSION artır + yeni blok ekle
  // ────────────────────────────────────────────────────────────

  console.log('✅ Veritabanı güncelleme tamamlandı!');
}

module.exports = { initDatabase, saveDatabase, DB_PATH, BACKUP_DIR, createManualBackup, listBackups, restoreBackup };
