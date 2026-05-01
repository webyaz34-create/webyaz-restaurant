const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'restaurant.db');

async function initDatabase() {
  const SQL = await initSqlJs();
  let db;

  // Load existing DB or create new
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

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
      status TEXT DEFAULT 'pending',
      notes TEXT DEFAULT '',
      total_amount REAL DEFAULT 0,
      payment_method TEXT DEFAULT '',
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
      total_price REAL NOT NULL,
      notes TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // ── Seed Data ────────────────────────────────────────────
  const countResult = db.exec('SELECT COUNT(*) as cnt FROM categories');
  const categoryCount = countResult.length > 0 ? countResult[0].values[0][0] : 0;

  if (categoryCount === 0) {
    console.log('📦 Seeding database with sample data...');

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
      ['is_setup_complete', 'false'],
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

module.exports = { initDatabase, saveDatabase, DB_PATH };
