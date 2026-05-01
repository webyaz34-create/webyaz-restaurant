const express = require('express');
const router = express.Router();

module.exports = function (db, save) {
  // Helper: run query and return all rows as objects
  function queryAll(sql, params = []) {
    const stmt = db.prepare(sql);
    if (params.length > 0) stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }

  // Helper: run query and return first row as object
  function queryOne(sql, params = []) {
    const rows = queryAll(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  // Helper: run a write statement, return lastInsertRowid
  function runSql(sql, params = []) {
    db.run(sql, params);
    const result = db.exec('SELECT last_insert_rowid() as id');
    return result.length > 0 ? result[0].values[0][0] : 0;
  }

  // ══════════════════════════════════════════════════
  //  CATEGORIES
  // ══════════════════════════════════════════════════

  router.get('/categories', (req, res) => {
    try { res.json(queryAll('SELECT * FROM categories ORDER BY sort_order ASC')); }
    catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/categories', (req, res) => {
    try {
      const { name, icon, sort_order } = req.body;
      const id = runSql('INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)', [name, icon || '🍽️', sort_order || 0]);
      save();
      res.status(201).json(queryOne('SELECT * FROM categories WHERE id = ?', [id]));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.put('/categories/:id', (req, res) => {
    try {
      const { name, icon, sort_order, is_active } = req.body;
      db.run('UPDATE categories SET name = ?, icon = ?, sort_order = ?, is_active = ? WHERE id = ?', [name, icon, sort_order, is_active, +req.params.id]);
      save();
      res.json(queryOne('SELECT * FROM categories WHERE id = ?', [+req.params.id]));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.delete('/categories/:id', (req, res) => {
    try { db.run('DELETE FROM categories WHERE id = ?', [+req.params.id]); save(); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ══════════════════════════════════════════════════
  //  PRODUCTS
  // ══════════════════════════════════════════════════

  router.get('/products', (req, res) => {
    try {
      const { category_id, active_only } = req.query;
      let sql = 'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id';
      const conditions = []; const params = [];
      if (category_id) { conditions.push('p.category_id = ?'); params.push(+category_id); }
      if (active_only === '1') conditions.push('p.is_active = 1');
      if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
      sql += ' ORDER BY p.sort_order ASC';
      res.json(queryAll(sql, params));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/products/:id', (req, res) => {
    try {
      const p = queryOne('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?', [+req.params.id]);
      if (!p) return res.status(404).json({ error: 'Ürün bulunamadı' });
      res.json(p);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/products', (req, res) => {
    try {
      const { name, description, price, category_id, image_path, preparation_time, sort_order } = req.body;
      const id = runSql('INSERT INTO products (name, description, price, category_id, image_path, preparation_time, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, description || '', price, category_id, image_path || '', preparation_time || 15, sort_order || 0]);
      save();
      res.status(201).json(queryOne('SELECT * FROM products WHERE id = ?', [id]));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.put('/products/:id', (req, res) => {
    try {
      const { name, description, price, category_id, image_path, is_active, preparation_time, sort_order } = req.body;
      db.run('UPDATE products SET name=?, description=?, price=?, category_id=?, image_path=?, is_active=?, preparation_time=?, sort_order=? WHERE id=?',
        [name, description, price, category_id, image_path, is_active, preparation_time, sort_order, +req.params.id]);
      save();
      res.json(queryOne('SELECT * FROM products WHERE id = ?', [+req.params.id]));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.delete('/products/:id', (req, res) => {
    try { db.run('DELETE FROM products WHERE id = ?', [+req.params.id]); save(); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ══════════════════════════════════════════════════
  //  TABLES
  // ══════════════════════════════════════════════════

  router.get('/tables', (req, res) => {
    try {
      const tables = queryAll('SELECT * FROM tables_info ORDER BY floor, name ASC');
      const enriched = tables.map(table => {
        const info = queryOne("SELECT COUNT(*) as count, COALESCE(SUM(total_amount),0) as total FROM orders WHERE table_id = ? AND status NOT IN ('paid', 'cancelled')", [table.id]);
        return { ...table, active_orders: info ? info.count : 0, active_total: info ? info.total : 0 };
      });
      res.json(enriched);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/tables', (req, res) => {
    try {
      const { name, capacity, floor } = req.body;
      const id = runSql('INSERT INTO tables_info (name, capacity, floor) VALUES (?, ?, ?)', [name, capacity || 4, floor || 'Zemin Kat']);
      save();
      res.status(201).json(queryOne('SELECT * FROM tables_info WHERE id = ?', [id]));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.put('/tables/:id', (req, res) => {
    try {
      const { name, capacity, status, floor } = req.body;
      db.run('UPDATE tables_info SET name=?, capacity=?, status=?, floor=? WHERE id=?', [name, capacity, status, floor, +req.params.id]);
      save();
      res.json(queryOne('SELECT * FROM tables_info WHERE id = ?', [+req.params.id]));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.delete('/tables/:id', (req, res) => {
    try { db.run('DELETE FROM tables_info WHERE id = ?', [+req.params.id]); save(); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ══════════════════════════════════════════════════
  //  ORDERS
  // ══════════════════════════════════════════════════

  router.get('/orders', (req, res) => {
    try {
      const { status, table_id, today } = req.query;
      let sql = 'SELECT o.*, t.name as table_name FROM orders o LEFT JOIN tables_info t ON o.table_id = t.id';
      const conditions = []; const params = [];
      if (status) { conditions.push('o.status = ?'); params.push(status); }
      if (table_id) { conditions.push('o.table_id = ?'); params.push(+table_id); }
      if (today === '1') conditions.push("date(o.created_at) = date('now', 'localtime')");
      if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
      sql += ' ORDER BY o.created_at DESC';
      const orders = queryAll(sql, params);
      orders.forEach(o => { o.items = queryAll('SELECT * FROM order_items WHERE order_id = ?', [o.id]); });
      res.json(orders);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/orders/:id', (req, res) => {
    try {
      const order = queryOne('SELECT o.*, t.name as table_name FROM orders o LEFT JOIN tables_info t ON o.table_id = t.id WHERE o.id = ?', [+req.params.id]);
      if (!order) return res.status(404).json({ error: 'Sipariş bulunamadı' });
      order.items = queryAll('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      res.json(order);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/orders', (req, res) => {
    try {
      const { table_id, order_type, customer_name, customer_phone, delivery_address, notes, items } = req.body;
      if (!items || items.length === 0) return res.status(400).json({ error: 'Sipariş kalemleri boş olamaz' });
      const total_amount = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
      const type = order_type || 'dine_in';
      
      // Insert order first, get its ID
      db.run("INSERT INTO orders (table_id, order_type, customer_name, customer_phone, delivery_address, notes, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')",
        [type === 'dine_in' ? table_id : null, type, customer_name, customer_phone, delivery_address || '', notes || '', total_amount]);
      const orderIdResult = db.exec('SELECT last_insert_rowid() as id');
      const orderId = orderIdResult.length > 0 ? orderIdResult[0].values[0][0] : 0;
      
      // Insert order items
      for (const item of items) {
        db.run('INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [orderId, item.product_id, item.product_name, item.quantity, item.unit_price, item.unit_price * item.quantity, item.notes || '']);
      }
      // Only update table status for dine-in orders
      if (type === 'dine_in' && table_id) {
        db.run("UPDATE tables_info SET status = 'occupied' WHERE id = ?", [table_id]);
      }
      save();
      
      // Fetch complete order with items
      const order = queryOne('SELECT o.*, t.name as table_name FROM orders o LEFT JOIN tables_info t ON o.table_id = t.id WHERE o.id = ?', [orderId]);
      if (order) {
        order.items = queryAll('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
        res.status(201).json(order);
      } else {
        // Fallback: build order object manually
        const orderItems = queryAll('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
        const typeName = type === 'delivery' ? '📦 Paket' : type === 'takeaway' ? '🥡 Gel-Al' : 'Masa ' + table_id;
        res.status(201).json({
          id: orderId, table_id: type === 'dine_in' ? table_id : null, order_type: type,
          customer_name, customer_phone, delivery_address: delivery_address || '', notes: notes || '',
          total_amount, status: 'pending', table_name: typeName,
          items: orderItems, created_at: new Date().toISOString()
        });
      }
    } catch (err) { console.error('Order creation error:', err); res.status(500).json({ error: err.message }); }
  });

  router.put('/orders/:id/status', (req, res) => {
    try {
      const { status } = req.body;
      const valid = ['pending', 'preparing', 'ready', 'delivered', 'paid', 'cancelled'];
      if (!valid.includes(status)) return res.status(400).json({ error: 'Geçersiz durum' });
      db.run("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?", [status, +req.params.id]);
      if (status === 'preparing' || status === 'cancelled') {
        db.run("UPDATE order_items SET status = ? WHERE order_id = ? AND status != 'delivered'", [status, +req.params.id]);
      }
      save();
      const order = queryOne('SELECT o.*, t.name as table_name FROM orders o LEFT JOIN tables_info t ON o.table_id = t.id WHERE o.id = ?', [+req.params.id]);
      if (order) {
        order.items = queryAll('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      }
      res.json(order || { error: 'Order not found' });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.put('/order-items/:id/status', (req, res) => {
    try {
      const { status } = req.body;
      db.run('UPDATE order_items SET status = ? WHERE id = ?', [status, +req.params.id]);
      save();
      res.json(queryOne('SELECT * FROM order_items WHERE id = ?', [+req.params.id]));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/orders/:id/pay', (req, res) => {
    try {
      const { payment_method } = req.body;
      db.run("UPDATE orders SET status = 'paid', payment_method = ?, paid_at = datetime('now'), updated_at = datetime('now') WHERE id = ?", [payment_method || 'cash', +req.params.id]);
      const order = queryOne('SELECT * FROM orders WHERE id = ?', [+req.params.id]);
      const active = queryOne("SELECT COUNT(*) as cnt FROM orders WHERE table_id = ? AND status NOT IN ('paid', 'cancelled')", [order.table_id]);
      if (active && active.cnt === 0) db.run("UPDATE tables_info SET status = 'available' WHERE id = ?", [order.table_id]);
      save();
      order.items = queryAll('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      res.json(order);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/tables/:id/orders', (req, res) => {
    try {
      const orders = queryAll("SELECT o.*, t.name as table_name FROM orders o LEFT JOIN tables_info t ON o.table_id = t.id WHERE o.table_id = ? AND o.status NOT IN ('paid', 'cancelled') ORDER BY o.created_at DESC", [+req.params.id]);
      orders.forEach(o => { o.items = queryAll('SELECT * FROM order_items WHERE order_id = ?', [o.id]); });
      res.json(orders);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ══════════════════════════════════════════════════
  //  REPORTS
  // ══════════════════════════════════════════════════

  router.get('/reports/daily', (req, res) => {
    try {
      const date = req.query.date || new Date().toISOString().split('T')[0];
      const summary = queryOne(`SELECT COUNT(*) as total_orders, COALESCE(SUM(CASE WHEN status='paid' THEN total_amount ELSE 0 END),0) as total_revenue, SUM(CASE WHEN status='paid' THEN 1 ELSE 0 END) as paid_orders, SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) as cancelled_orders, COALESCE(SUM(CASE WHEN payment_method='cash' AND status='paid' THEN total_amount ELSE 0 END),0) as cash_total, COALESCE(SUM(CASE WHEN payment_method='card' AND status='paid' THEN total_amount ELSE 0 END),0) as card_total FROM orders WHERE date(created_at) = date(?)`, [date]);
      const topProducts = queryAll(`SELECT oi.product_name, SUM(oi.quantity) as total_qty, SUM(oi.total_price) as total_revenue FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE date(o.created_at) = date(?) AND o.status = 'paid' GROUP BY oi.product_name ORDER BY total_qty DESC LIMIT 10`, [date]);
      res.json({ date, summary, topProducts });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/reports/summary', (req, res) => {
    try {
      const today = queryOne("SELECT COUNT(*) as orders, COALESCE(SUM(CASE WHEN status='paid' THEN total_amount ELSE 0 END),0) as revenue FROM orders WHERE date(created_at) = date('now', 'localtime')");
      const active = queryOne("SELECT COUNT(*) as count FROM orders WHERE status NOT IN ('paid', 'cancelled')");
      const activeTables = queryOne("SELECT COUNT(*) as count FROM tables_info WHERE status = 'occupied'");
      const totalTables = queryOne('SELECT COUNT(*) as count FROM tables_info');
      res.json({
        today_orders: today ? today.orders : 0,
        today_revenue: today ? today.revenue : 0,
        active_orders: active ? active.count : 0,
        active_tables: activeTables ? activeTables.count : 0,
        total_tables: totalTables ? totalTables.count : 0,
      });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ══════════════════════════════════════════════════
  //  SETTINGS
  // ══════════════════════════════════════════════════

  router.get('/settings', (req, res) => {
    try {
      const settings = queryAll('SELECT * FROM settings');
      const obj = {};
      settings.forEach(s => { obj[s.key] = s.value; });
      res.json(obj);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.put('/settings', (req, res) => {
    try {
      for (const [key, value] of Object.entries(req.body)) {
        db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, String(value)]);
      }
      save();
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ══════════════════════════════════════════════════
  //  USERS
  // ══════════════════════════════════════════════════
  router.get('/users', (req, res) => {
    try {
      const users = queryAll('SELECT id, username, display_name, role, is_active, created_at FROM users ORDER BY id');
      res.json(users);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/users', (req, res) => {
    try {
      const { username, password, display_name, role } = req.body;
      if (!username || !password || !display_name) return res.status(400).json({ error: 'Tüm alanlar gerekli' });
      const id = runSql('INSERT INTO users (username, password, display_name, role) VALUES (?, ?, ?, ?)', [username, password, display_name, role || 'waiter']);
      save();
      res.json({ id, username, display_name, role });
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Bu kullanıcı adı zaten mevcut' });
      res.status(500).json({ error: err.message });
    }
  });

  router.put('/users/:id', (req, res) => {
    try {
      const { username, password, display_name, role, is_active } = req.body;
      if (password) {
        db.run('UPDATE users SET username=?, password=?, display_name=?, role=?, is_active=? WHERE id=?',
          [username, password, display_name, role, is_active !== undefined ? is_active : 1, req.params.id]);
      } else {
        db.run('UPDATE users SET username=?, display_name=?, role=?, is_active=? WHERE id=?',
          [username, display_name, role, is_active !== undefined ? is_active : 1, req.params.id]);
      }
      save();
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.delete('/users/:id', (req, res) => {
    try {
      if (req.params.id == 1) return res.status(400).json({ error: 'Ana yönetici hesabı silinemez' });
      db.run('DELETE FROM users WHERE id = ?', [req.params.id]);
      save();
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  return router;
};
