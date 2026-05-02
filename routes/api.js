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
      const { name, description, price, cost_price, category_id, image_path, preparation_time, sort_order } = req.body;
      const id = runSql('INSERT INTO products (name, description, price, cost_price, category_id, image_path, preparation_time, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [name, description || '', price, cost_price || 0, category_id, image_path || '', preparation_time || 15, sort_order || 0]);
      save();
      res.status(201).json(queryOne('SELECT * FROM products WHERE id = ?', [id]));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.put('/products/:id', (req, res) => {
    try {
      const { name, description, price, cost_price, category_id, image_path, is_active, preparation_time, sort_order } = req.body;
      db.run('UPDATE products SET name=?, description=?, price=?, cost_price=?, category_id=?, image_path=?, is_active=?, preparation_time=?, sort_order=? WHERE id=?',
        [name, description, price, cost_price || 0, category_id, image_path, is_active, preparation_time, sort_order, +req.params.id]);
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

  // Transfer: move all active orders from one table to another
  router.post('/tables/transfer', (req, res) => {
    try {
      const { from_table_id, to_table_id } = req.body;
      if (!from_table_id || !to_table_id) return res.status(400).json({ error: 'Kaynak ve hedef masa gerekli' });
      if (from_table_id === to_table_id) return res.status(400).json({ error: 'Aynı masaya taşınamaz' });

      const fromTable = queryOne('SELECT * FROM tables_info WHERE id = ?', [+from_table_id]);
      const toTable = queryOne('SELECT * FROM tables_info WHERE id = ?', [+to_table_id]);
      if (!fromTable || !toTable) return res.status(404).json({ error: 'Masa bulunamadı' });

      // Move active orders
      const result = db.run("UPDATE orders SET table_id = ? WHERE table_id = ? AND status NOT IN ('paid', 'cancelled')", [+to_table_id, +from_table_id]);
      
      // Update table statuses
      const fromActive = queryOne("SELECT COUNT(*) as cnt FROM orders WHERE table_id = ? AND status NOT IN ('paid', 'cancelled')", [+from_table_id]);
      const toActive = queryOne("SELECT COUNT(*) as cnt FROM orders WHERE table_id = ? AND status NOT IN ('paid', 'cancelled')", [+to_table_id]);
      db.run('UPDATE tables_info SET status = ? WHERE id = ?', [fromActive?.cnt > 0 ? 'occupied' : 'available', +from_table_id]);
      db.run('UPDATE tables_info SET status = ? WHERE id = ?', [toActive?.cnt > 0 ? 'occupied' : 'available', +to_table_id]);
      
      save();
      res.json({ success: true, message: `${fromTable.name} → ${toTable.name} taşındı` });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Merge: combine orders from multiple tables into one target table
  router.post('/tables/merge', (req, res) => {
    try {
      const { source_table_ids, target_table_id } = req.body;
      if (!source_table_ids || !source_table_ids.length || !target_table_id) 
        return res.status(400).json({ error: 'Kaynak masalar ve hedef masa gerekli' });

      const targetTable = queryOne('SELECT * FROM tables_info WHERE id = ?', [+target_table_id]);
      if (!targetTable) return res.status(404).json({ error: 'Hedef masa bulunamadı' });

      let movedCount = 0;
      for (const srcId of source_table_ids) {
        if (+srcId === +target_table_id) continue;
        const active = queryAll("SELECT id FROM orders WHERE table_id = ? AND status NOT IN ('paid', 'cancelled')", [+srcId]);
        if (active.length > 0) {
          db.run("UPDATE orders SET table_id = ? WHERE table_id = ? AND status NOT IN ('paid', 'cancelled')", [+target_table_id, +srcId]);
          movedCount += active.length;
        }
        // Free the source table
        db.run("UPDATE tables_info SET status = 'available' WHERE id = ?", [+srcId]);
      }
      // Mark target as occupied
      db.run("UPDATE tables_info SET status = 'occupied' WHERE id = ?", [+target_table_id]);

      save();
      res.json({ success: true, message: `${movedCount} sipariş ${targetTable.name} masasına birleştirildi`, moved: movedCount });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ══════════════════════════════════════════════════
  //  REVIEWS
  // ══════════════════════════════════════════════════

  // Get APPROVED reviews for a product (public)
  router.get('/products/:id/reviews', (req, res) => {
    try {
      const reviews = queryAll('SELECT * FROM product_reviews WHERE product_id = ? AND is_approved = 1 ORDER BY created_at DESC LIMIT 20', [+req.params.id]);
      const stats = queryOne('SELECT COUNT(*) as count, AVG(rating) as avg_rating FROM product_reviews WHERE product_id = ? AND is_approved = 1', [+req.params.id]);
      res.json({ reviews, stats: { count: stats.count || 0, avg_rating: stats.avg_rating ? Math.round(stats.avg_rating * 10) / 10 : 0 } });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Submit a review (pending approval)
  router.post('/reviews', (req, res) => {
    try {
      const { product_id, rating, comment, customer_name, customer_phone, table_id } = req.body;
      if (!product_id || !rating) return res.status(400).json({ error: 'Ürün ve puan gerekli' });
      if (!customer_phone || customer_phone.trim().length < 7) return res.status(400).json({ error: 'Geçerli bir telefon numarası gerekli' });
      if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Puan 1-5 arası olmalı' });
      const id = runSql('INSERT INTO product_reviews (product_id, table_id, rating, comment, customer_name, customer_phone, is_approved) VALUES (?, ?, ?, ?, ?, ?, 0)',
        [product_id, table_id || null, rating, (comment || '').substring(0, 500), customer_name || 'Misafir', customer_phone.trim()]);
      save();
      res.status(201).json({ success: true, id, message: 'Değerlendirmeniz onay bekliyor' });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Get all product ratings - only approved (for menu display)
  router.get('/reviews/summary', (req, res) => {
    try {
      const summaries = queryAll('SELECT product_id, COUNT(*) as count, AVG(rating) as avg_rating FROM product_reviews WHERE is_approved = 1 GROUP BY product_id');
      const map = {};
      summaries.forEach(s => { map[s.product_id] = { count: s.count, avg: Math.round(s.avg_rating * 10) / 10 }; });
      res.json(map);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Admin: get ALL reviews (including pending)
  router.get('/reviews', (req, res) => {
    try {
      const { status } = req.query; // 'pending', 'approved', 'all'
      let sql = 'SELECT r.*, p.name as product_name FROM product_reviews r LEFT JOIN products p ON r.product_id = p.id';
      if (status === 'pending') sql += ' WHERE r.is_approved = 0';
      else if (status === 'approved') sql += ' WHERE r.is_approved = 1';
      sql += ' ORDER BY r.created_at DESC';
      res.json(queryAll(sql));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Admin: approve a review
  router.put('/reviews/:id/approve', (req, res) => {
    try {
      db.run('UPDATE product_reviews SET is_approved = 1 WHERE id = ?', [+req.params.id]);
      save();
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Admin: delete a review
  router.delete('/reviews/:id', (req, res) => {
    try {
      db.run('DELETE FROM product_reviews WHERE id = ?', [+req.params.id]);
      save();
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ══════════════════════════════════════════════════
  //  ORDERS
  // ══════════════════════════════════════════════════


  router.get('/orders', (req, res) => {
    try {
      const { status, table_id, today } = req.query;
      let sql = 'SELECT o.*, t.name as table_name FROM orders o LEFT JOIN tables_info t ON o.table_id = t.id';
      const conditions = []; const params = [];
      if (status) {
        const statuses = status.split(',').map(s => s.trim());
        conditions.push('o.status IN (' + statuses.map(() => '?').join(',') + ')');
        params.push(...statuses);
      }
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
      db.run("INSERT INTO orders (table_id, order_type, customer_name, customer_phone, delivery_address, delivery_lat, delivery_lng, notes, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')",
        [table_id || null, type, customer_name, customer_phone, delivery_address || '', req.body.delivery_lat || 0, req.body.delivery_lng || 0, notes || '', total_amount]);
      const orderIdResult = db.exec('SELECT last_insert_rowid() as id');
      const orderId = orderIdResult.length > 0 ? orderIdResult[0].values[0][0] : 0;
      
      // Insert order items
      for (const item of items) {
        const product = item.product_id ? queryOne('SELECT cost_price FROM products WHERE id = ?', [item.product_id]) : null;
        const costPrice = product ? (product.cost_price || 0) : 0;
        db.run('INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, cost_price, total_price, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [orderId, item.product_id, item.product_name, item.quantity, item.unit_price, costPrice, item.unit_price * item.quantity, item.notes || '']);
      }
      // Update table status to occupied for all orders with a table
      if (table_id) {
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
      const { status, delivered_by } = req.body;
      const valid = ['pending', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'paid', 'cancelled'];
      if (!valid.includes(status)) return res.status(400).json({ error: 'Geçersiz durum' });
      db.run("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?", [status, +req.params.id]);
      if (status === 'preparing' || status === 'cancelled') {
        db.run("UPDATE order_items SET status = ? WHERE order_id = ? AND status != 'delivered'", [status, +req.params.id]);
      }
      // Record who delivered the order
      if (status === 'delivered' && delivered_by) {
        db.run("UPDATE orders SET delivered_by = ? WHERE id = ?", [delivered_by, +req.params.id]);
      }
      save();
      const order = queryOne('SELECT o.*, t.name as table_name FROM orders o LEFT JOIN tables_info t ON o.table_id = t.id WHERE o.id = ?', [+req.params.id]);
      if (order) {
        order.items = queryAll('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      }
      res.json(order || { error: 'Order not found' });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Assign courier to delivery order
  router.put('/orders/:id/assign-courier', (req, res) => {
    try {
      const { courier_id, courier_name } = req.body;
      db.run("UPDATE orders SET courier_id = ?, courier_name = ?, status = 'out_for_delivery', updated_at = datetime('now') WHERE id = ?",
        [courier_id || null, courier_name || '', +req.params.id]);
      save();
      const order = queryOne('SELECT o.*, t.name as table_name FROM orders o LEFT JOIN tables_info t ON o.table_id = t.id WHERE o.id = ?', [+req.params.id]);
      if (order) order.items = queryAll('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
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
      const { payment_method, receipt_no } = req.body;
      db.run("UPDATE orders SET status = 'paid', payment_method = ?, receipt_no = ?, paid_at = datetime('now'), updated_at = datetime('now') WHERE id = ?", 
        [payment_method || 'cash', receipt_no || '', +req.params.id]);
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

      // Genel Özet
      const summary = queryOne(`SELECT 
        COUNT(*) as total_orders, 
        COALESCE(SUM(CASE WHEN status='paid' THEN 1 ELSE 0 END),0) as paid_orders,
        COALESCE(SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END),0) as cancelled_orders,
        COALESCE(SUM(CASE WHEN status NOT IN ('paid','cancelled') THEN 1 ELSE 0 END),0) as active_orders,
        COALESCE(SUM(CASE WHEN status='paid' THEN total_amount ELSE 0 END),0) as total_revenue,
        COALESCE(SUM(CASE WHEN payment_method='cash' AND status='paid' THEN total_amount ELSE 0 END),0) as cash_total,
        COALESCE(SUM(CASE WHEN payment_method='card' AND status='paid' THEN total_amount ELSE 0 END),0) as card_total,
        COALESCE(SUM(CASE WHEN order_type='delivery' AND status='paid' THEN total_amount ELSE 0 END),0) as delivery_total,
        COALESCE(SUM(CASE WHEN order_type='dine_in' AND status='paid' THEN total_amount ELSE 0 END),0) as dinein_total,
        COALESCE(SUM(CASE WHEN order_type='delivery' AND status='paid' THEN 1 ELSE 0 END),0) as delivery_count,
        COALESCE(SUM(CASE WHEN order_type='dine_in' AND status='paid' THEN 1 ELSE 0 END),0) as dinein_count
      FROM orders WHERE date(created_at) = date(?)`, [date]);

      // Ürün Satışları + Kâr Analizi
      const topProducts = queryAll(`SELECT oi.product_name, SUM(oi.quantity) as total_qty, 
        SUM(oi.total_price) as total_revenue,
        SUM(oi.cost_price * oi.quantity) as total_cost,
        SUM(oi.total_price) - SUM(oi.cost_price * oi.quantity) as profit
        FROM order_items oi JOIN orders o ON oi.order_id = o.id 
        WHERE date(o.created_at) = date(?) AND o.status = 'paid' 
        GROUP BY oi.product_name ORDER BY total_revenue DESC`, [date]);

      // Kurye Raporu
      const couriers = queryAll(`SELECT delivered_by as name, COUNT(*) as delivery_count, 
        SUM(total_amount) as total_amount, 
        GROUP_CONCAT(receipt_no) as receipts
        FROM orders WHERE date(created_at) = date(?) AND status='paid' AND delivered_by != '' AND delivered_by IS NOT NULL
        GROUP BY delivered_by ORDER BY delivery_count DESC`, [date]);

      // Saatlik Dağılım
      const hourly = queryAll(`SELECT strftime('%H', created_at) as hour, 
        COUNT(*) as order_count, 
        COALESCE(SUM(CASE WHEN status='paid' THEN total_amount ELSE 0 END),0) as revenue
        FROM orders WHERE date(created_at) = date(?) 
        GROUP BY strftime('%H', created_at) ORDER BY hour`, [date]);

      // Paket Siparişler Detay
      const deliveryOrders = queryAll(`SELECT id, customer_name, customer_phone, delivery_address, 
        delivered_by, receipt_no, total_amount, status, payment_method,
        created_at, paid_at
        FROM orders WHERE date(created_at) = date(?) AND order_type='delivery'
        ORDER BY created_at DESC`, [date]);

      res.json({ date, summary, topProducts, couriers, hourly, deliveryOrders });
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

  // Advanced / Gelişmiş Rapor
  router.get('/reports/advanced', (req, res) => {
    try {
      const { period } = req.query; // 'week' or 'month'
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const thisMonth = today.slice(0, 7);
      
      // Calculate date ranges
      const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
      const twoWeeksAgo = new Date(now); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const monthStart = thisMonth + '-01';
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
      const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);

      // Today vs Yesterday
      const todayRev = queryOne("SELECT COALESCE(SUM(CASE WHEN status='paid' THEN total_amount ELSE 0 END),0) as rev, COUNT(CASE WHEN status='paid' THEN 1 END) as cnt FROM orders WHERE date(created_at) = date(?)", [today]);
      const yesterdayRev = queryOne("SELECT COALESCE(SUM(CASE WHEN status='paid' THEN total_amount ELSE 0 END),0) as rev, COUNT(CASE WHEN status='paid' THEN 1 END) as cnt FROM orders WHERE date(created_at) = date(?)", [yesterday.toISOString().split('T')[0]]);

      // This week vs last week
      const thisWeekRev = queryOne("SELECT COALESCE(SUM(CASE WHEN status='paid' THEN total_amount ELSE 0 END),0) as rev, COUNT(CASE WHEN status='paid' THEN 1 END) as cnt FROM orders WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)", [weekAgo.toISOString().split('T')[0], today]);
      const lastWeekRev = queryOne("SELECT COALESCE(SUM(CASE WHEN status='paid' THEN total_amount ELSE 0 END),0) as rev, COUNT(CASE WHEN status='paid' THEN 1 END) as cnt FROM orders WHERE date(created_at) >= date(?) AND date(created_at) < date(?)", [twoWeeksAgo.toISOString().split('T')[0], weekAgo.toISOString().split('T')[0]]);

      // This month vs last month
      const thisMonthRev = queryOne(`SELECT COALESCE(SUM(CASE WHEN status='paid' THEN total_amount ELSE 0 END),0) as rev, COUNT(CASE WHEN status='paid' THEN 1 END) as cnt FROM orders WHERE date(created_at) LIKE '${thisMonth}%'`);
      const lastMonthRev = queryOne(`SELECT COALESCE(SUM(CASE WHEN status='paid' THEN total_amount ELSE 0 END),0) as rev, COUNT(CASE WHEN status='paid' THEN 1 END) as cnt FROM orders WHERE date(created_at) LIKE '${lastMonth}%'`);

      // Daily revenue for last 14 days (for chart)
      const dailyRevenue = queryAll(`SELECT date(created_at) as day, 
        COALESCE(SUM(CASE WHEN status='paid' THEN total_amount ELSE 0 END),0) as revenue,
        COUNT(CASE WHEN status='paid' THEN 1 END) as orders
        FROM orders WHERE date(created_at) >= date(?, '-14 days')
        GROUP BY date(created_at) ORDER BY day ASC`, [today]);

      // Monthly expenses
      const thisMonthExp = queryOne(`SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE date LIKE '${thisMonth}%'`);
      const lastMonthExp = queryOne(`SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE date LIKE '${lastMonth}%'`);

      // Expense by category this month
      const expByCategory = queryAll(`SELECT category, COALESCE(SUM(amount),0) as total, COUNT(*) as count FROM expenses WHERE date LIKE '${thisMonth}%' GROUP BY category ORDER BY total DESC`);

      // Profit = Revenue - Cost of Goods - Expenses
      const thisMonthCOGS = queryOne(`SELECT COALESCE(SUM(oi.cost_price * oi.quantity),0) as total FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE o.status='paid' AND date(o.created_at) LIKE '${thisMonth}%'`);

      // Top 10 products this month
      const topProducts = queryAll(`SELECT oi.product_name, SUM(oi.quantity) as qty, SUM(oi.total_price) as revenue
        FROM order_items oi JOIN orders o ON oi.order_id = o.id 
        WHERE o.status='paid' AND date(o.created_at) LIKE '${thisMonth}%'
        GROUP BY oi.product_name ORDER BY revenue DESC LIMIT 10`);

      // Category sales this month
      const categorySales = queryAll(`SELECT c.name as category, c.icon, SUM(oi.total_price) as revenue, SUM(oi.quantity) as qty
        FROM order_items oi 
        JOIN orders o ON oi.order_id = o.id 
        JOIN products p ON oi.product_id = p.id
        JOIN categories c ON p.category_id = c.id
        WHERE o.status='paid' AND date(o.created_at) LIKE '${thisMonth}%'
        GROUP BY c.name ORDER BY revenue DESC`);

      // Stock summary
      const stockSummary = queryOne('SELECT COUNT(*) as total_items, COALESCE(SUM(current_stock * cost_per_unit),0) as total_value FROM inventory_items');
      const lowStock = queryOne('SELECT COUNT(*) as count FROM inventory_items WHERE current_stock <= min_stock');

      // Average order value
      const avgOrder = queryOne(`SELECT COALESCE(AVG(total_amount),0) as avg_val FROM orders WHERE status='paid' AND date(created_at) LIKE '${thisMonth}%'`);

      // Payment method distribution this month
      const paymentDist = queryAll(`SELECT payment_method, COUNT(*) as cnt, COALESCE(SUM(total_amount),0) as total FROM orders WHERE status='paid' AND date(created_at) LIKE '${thisMonth}%' GROUP BY payment_method`);

      res.json({
        comparisons: {
          today: { rev: todayRev?.rev || 0, cnt: todayRev?.cnt || 0 },
          yesterday: { rev: yesterdayRev?.rev || 0, cnt: yesterdayRev?.cnt || 0 },
          this_week: { rev: thisWeekRev?.rev || 0, cnt: thisWeekRev?.cnt || 0 },
          last_week: { rev: lastWeekRev?.rev || 0, cnt: lastWeekRev?.cnt || 0 },
          this_month: { rev: thisMonthRev?.rev || 0, cnt: thisMonthRev?.cnt || 0 },
          last_month: { rev: lastMonthRev?.rev || 0, cnt: lastMonthRev?.cnt || 0 },
        },
        daily_revenue: dailyRevenue,
        profit: {
          revenue: thisMonthRev?.rev || 0,
          cogs: thisMonthCOGS?.total || 0,
          expenses: thisMonthExp?.total || 0,
          net: (thisMonthRev?.rev || 0) - (thisMonthCOGS?.total || 0) - (thisMonthExp?.total || 0),
        },
        exp_by_category: expByCategory,
        top_products: topProducts,
        category_sales: categorySales,
        stock: { total: stockSummary?.total_items || 0, value: stockSummary?.total_value || 0, low: lowStock?.count || 0 },
        avg_order: avgOrder?.avg_val || 0,
        payment_dist: paymentDist,
        last_month_expenses: lastMonthExp?.total || 0,
      });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ══════════════════════════════════════════════════
  //  CASH REGISTER / KASA AÇILIŞ-KAPANIŞ
  // ══════════════════════════════════════════════════

  router.get('/cash-register/current', (req, res) => {
    try {
      const current = queryOne("SELECT * FROM cash_register WHERE status = 'open' ORDER BY id DESC LIMIT 1");
      if (current) {
        const sales = queryOne(`SELECT 
          COUNT(*) as total_orders,
          COALESCE(SUM(CASE WHEN status='paid' THEN total_amount ELSE 0 END),0) as total_sales,
          COALESCE(SUM(CASE WHEN status='paid' AND payment_method='cash' THEN total_amount ELSE 0 END),0) as cash_sales,
          COALESCE(SUM(CASE WHEN status='paid' AND payment_method='card' THEN total_amount ELSE 0 END),0) as card_sales
          FROM orders WHERE date(created_at) >= date(?) AND created_at >= ?`, [current.date, current.opened_at]);
        current.cash_sales = sales?.cash_sales || 0;
        current.card_sales = sales?.card_sales || 0;
        current.total_sales = sales?.total_sales || 0;
        current.total_orders = sales?.total_orders || 0;
        current.expected_amount = current.opening_amount + (sales?.cash_sales || 0);
      }
      res.json({ open: !!current, register: current });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/cash-register/open', (req, res) => {
    try {
      const existing = queryOne("SELECT * FROM cash_register WHERE status = 'open'");
      if (existing) return res.status(400).json({ error: 'Kasa zaten açık' });
      const { opening_amount, opened_by, notes } = req.body;
      const date = new Date().toISOString().split('T')[0];
      const id = runSql('INSERT INTO cash_register (date, opening_amount, opened_by, notes) VALUES (?, ?, ?, ?)',
        [date, opening_amount || 0, opened_by || '', notes || '']);
      save();
      res.status(201).json(queryOne('SELECT * FROM cash_register WHERE id = ?', [id]));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/cash-register/close', (req, res) => {
    try {
      const current = queryOne("SELECT * FROM cash_register WHERE status = 'open' ORDER BY id DESC LIMIT 1");
      if (!current) return res.status(400).json({ error: 'Açık kasa bulunamadı' });
      const { closing_amount, closed_by, notes } = req.body;
      const sales = queryOne(`SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(CASE WHEN status='paid' THEN total_amount ELSE 0 END),0) as total_sales,
        COALESCE(SUM(CASE WHEN status='paid' AND payment_method='cash' THEN total_amount ELSE 0 END),0) as cash_sales,
        COALESCE(SUM(CASE WHEN status='paid' AND payment_method='card' THEN total_amount ELSE 0 END),0) as card_sales
        FROM orders WHERE date(created_at) >= date(?) AND created_at >= ?`, [current.date, current.opened_at]);
      const expected = current.opening_amount + (sales?.cash_sales || 0);
      const difference = (closing_amount || 0) - expected;
      db.run(`UPDATE cash_register SET status='closed', closing_amount=?, expected_amount=?, 
        cash_sales=?, card_sales=?, total_sales=?, total_orders=?, difference=?, 
        closed_by=?, notes=CASE WHEN notes='' THEN ? ELSE notes || ' | ' || ? END,
        closed_at=datetime('now','localtime') WHERE id=?`,
        [closing_amount || 0, expected, sales?.cash_sales || 0, sales?.card_sales || 0,
         sales?.total_sales || 0, sales?.total_orders || 0, difference,
         closed_by || '', notes || '', notes || '', current.id]);
      save();
      res.json(queryOne('SELECT * FROM cash_register WHERE id = ?', [current.id]));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/cash-register/history', (req, res) => {
    try {
      const history = queryAll('SELECT * FROM cash_register ORDER BY id DESC LIMIT ?', [parseInt(req.query.limit) || 30]);
      res.json(history);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ══════════════════════════════════════════════════
  //  STAFF / PERSONEL
  // ══════════════════════════════════════════════════

  router.get('/staff', (req, res) => {
    try {
      const staff = queryAll('SELECT * FROM staff ORDER BY full_name');
      staff.forEach(s => {
        const txns = queryAll('SELECT type, SUM(amount) as total FROM staff_transactions WHERE staff_id = ? GROUP BY type', [s.id]);
        s.total_salary_paid = 0; s.total_advance = 0; s.total_bonus = 0; s.total_deduction = 0;
        txns.forEach(t => {
          if (t.type === 'salary') s.total_salary_paid = t.total;
          if (t.type === 'advance') s.total_advance = t.total;
          if (t.type === 'bonus') s.total_bonus = t.total;
          if (t.type === 'deduction') s.total_deduction = t.total;
        });
      });
      res.json(staff);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/staff', (req, res) => {
    try {
      const { full_name, phone, position, salary, start_date, tc_no, address, emergency_contact, notes, photo } = req.body;
      const id = runSql('INSERT INTO staff (full_name, phone, position, salary, start_date, tc_no, address, emergency_contact, notes, photo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [full_name, phone || '', position || '', salary || 0, start_date || '', tc_no || '', address || '', emergency_contact || '', notes || '', photo || '']);
      save();
      res.status(201).json(queryOne('SELECT * FROM staff WHERE id = ?', [id]));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.put('/staff/:id', (req, res) => {
    try {
      const { full_name, phone, position, salary, start_date, tc_no, address, emergency_contact, is_active, notes, photo } = req.body;
      db.run('UPDATE staff SET full_name=?, phone=?, position=?, salary=?, start_date=?, tc_no=?, address=?, emergency_contact=?, is_active=?, notes=?, photo=? WHERE id=?',
        [full_name, phone, position, salary, start_date, tc_no, address, emergency_contact, is_active ?? 1, notes, photo || '', +req.params.id]);
      save();
      res.json(queryOne('SELECT * FROM staff WHERE id = ?', [+req.params.id]));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.delete('/staff/:id', (req, res) => {
    try { db.run('DELETE FROM staff WHERE id = ?', [+req.params.id]); save(); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Staff Transactions
  router.get('/staff/:id/transactions', (req, res) => {
    try {
      const txns = queryAll('SELECT * FROM staff_transactions WHERE staff_id = ? ORDER BY date DESC, id DESC', [+req.params.id]);
      res.json(txns);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/staff/:id/transactions', (req, res) => {
    try {
      const { type, amount, description, date } = req.body;
      const id = runSql('INSERT INTO staff_transactions (staff_id, type, amount, description, date) VALUES (?, ?, ?, ?, ?)',
        [+req.params.id, type, amount, description || '', date || new Date().toISOString().split('T')[0]]);
      save();
      res.status(201).json(queryOne('SELECT * FROM staff_transactions WHERE id = ?', [id]));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.delete('/staff/transactions/:id', (req, res) => {
    try { db.run('DELETE FROM staff_transactions WHERE id = ?', [+req.params.id]); save(); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ══════════════════════════════════════════════════
  //  ACCOUNTS / CARİ HESAPLAR
  // ══════════════════════════════════════════════════

  router.get('/accounts', (req, res) => {
    try {
      const accounts = queryAll(`
        SELECT a.*,
          COALESCE(SUM(CASE WHEN t.type='debit' THEN t.amount ELSE 0 END), 0) as total_debit,
          COALESCE(SUM(CASE WHEN t.type='credit' THEN t.amount ELSE 0 END), 0) as total_credit
        FROM accounts a
        LEFT JOIN account_transactions t ON t.account_id = a.id
        GROUP BY a.id
        ORDER BY a.name ASC
      `);
      accounts.forEach(a => { a.balance = (a.total_debit || 0) - (a.total_credit || 0); });
      res.json(accounts);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/accounts', (req, res) => {
    try {
      const { name, type, phone, address, tax_no, notes } = req.body;
      if (!name) return res.status(400).json({ error: 'İsim gerekli' });
      const id = runSql('INSERT INTO accounts (name, type, phone, address, tax_no, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [name, type || 'customer', phone || '', address || '', tax_no || '', notes || '']);
      save();
      res.status(201).json(queryOne('SELECT * FROM accounts WHERE id = ?', [id]));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.put('/accounts/:id', (req, res) => {
    try {
      const { name, type, phone, address, tax_no, notes, is_active } = req.body;
      db.run('UPDATE accounts SET name=?, type=?, phone=?, address=?, tax_no=?, notes=?, is_active=? WHERE id=?',
        [name, type, phone, address, tax_no, notes, is_active ?? 1, +req.params.id]);
      save();
      res.json(queryOne('SELECT * FROM accounts WHERE id = ?', [+req.params.id]));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.delete('/accounts/:id', (req, res) => {
    try { db.run('DELETE FROM accounts WHERE id = ?', [+req.params.id]); save(); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/accounts/:id/transactions', (req, res) => {
    try {
      res.json(queryAll('SELECT * FROM account_transactions WHERE account_id = ? ORDER BY date DESC, id DESC', [+req.params.id]));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/accounts/:id/transactions', (req, res) => {
    try {
      const { type, amount, description, date, order_id } = req.body;
      const id = runSql('INSERT INTO account_transactions (account_id, type, amount, description, date, order_id) VALUES (?, ?, ?, ?, ?, ?)',
        [+req.params.id, type, amount, description || '', date, order_id || null]);
      save();
      res.status(201).json(queryOne('SELECT * FROM account_transactions WHERE id = ?', [id]));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.delete('/accounts/transactions/:id', (req, res) => {
    try { db.run('DELETE FROM account_transactions WHERE id = ?', [+req.params.id]); save(); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ══════════════════════════════════════════════════
  //  INVENTORY / STOK YÖNETİMİ
  // ══════════════════════════════════════════════════

  // ── Inventory Items ────────────────────────────────
  router.get('/inventory', (req, res) => {
    try {
      const { category, active_only, low_stock } = req.query;
      let sql = `SELECT i.*, a.name as supplier_name
        FROM inventory_items i
        LEFT JOIN accounts a ON i.supplier_id = a.id`;
      const conditions = []; const params = [];
      if (category) { conditions.push('i.category = ?'); params.push(category); }
      if (active_only === '1') conditions.push('i.is_active = 1');
      if (low_stock === '1') conditions.push('i.current_stock <= i.min_stock AND i.min_stock > 0');
      if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
      sql += ' ORDER BY i.category, i.name ASC';
      const items = queryAll(sql, params);
      items.forEach(it => {
        it.stock_value = (it.current_stock || 0) * (it.cost_per_unit || 0);
        it.is_low_stock = it.min_stock > 0 && it.current_stock <= it.min_stock ? 1 : 0;
      });
      res.json(items);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/inventory/alerts', (req, res) => {
    try {
      const alerts = queryAll(`SELECT i.*, a.name as supplier_name
        FROM inventory_items i
        LEFT JOIN accounts a ON i.supplier_id = a.id
        WHERE i.current_stock <= i.min_stock AND i.min_stock > 0 AND i.is_active = 1
        ORDER BY (i.current_stock / CASE WHEN i.min_stock > 0 THEN i.min_stock ELSE 1 END) ASC`);
      res.json(alerts);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/inventory/report', (req, res) => {
    try {
      const totalItems = queryOne('SELECT COUNT(*) as count FROM inventory_items WHERE is_active = 1');
      const lowStock = queryOne('SELECT COUNT(*) as count FROM inventory_items WHERE current_stock <= min_stock AND min_stock > 0 AND is_active = 1');
      const totalValue = queryOne('SELECT COALESCE(SUM(current_stock * cost_per_unit), 0) as total FROM inventory_items WHERE is_active = 1');
      
      // This month's inbound total
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthStr = monthStart.toISOString().split('T')[0];
      const monthInbound = queryOne(`SELECT COALESCE(SUM(total_cost), 0) as total
        FROM inventory_transactions WHERE type = 'in' AND date >= ?`, [monthStr]);
      
      // Category breakdown
      const byCategory = queryAll(`SELECT category, COUNT(*) as count,
        COALESCE(SUM(current_stock * cost_per_unit), 0) as value
        FROM inventory_items WHERE is_active = 1 GROUP BY category ORDER BY value DESC`);
      
      res.json({
        total_items: totalItems?.count || 0,
        low_stock_count: lowStock?.count || 0,
        total_value: totalValue?.total || 0,
        month_inbound: monthInbound?.total || 0,
        by_category: byCategory
      });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/inventory/categories', (req, res) => {
    try {
      const cats = queryAll('SELECT DISTINCT category FROM inventory_items WHERE is_active = 1 ORDER BY category');
      res.json(cats.map(c => c.category));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/inventory/:id', (req, res) => {
    try {
      const item = queryOne(`SELECT i.*, a.name as supplier_name
        FROM inventory_items i LEFT JOIN accounts a ON i.supplier_id = a.id
        WHERE i.id = ?`, [+req.params.id]);
      if (!item) return res.status(404).json({ error: 'Malzeme bulunamadı' });
      res.json(item);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/inventory', (req, res) => {
    try {
      const { name, unit, current_stock, min_stock, cost_per_unit, category, supplier_id, notes } = req.body;
      if (!name) return res.status(400).json({ error: 'Malzeme adı gerekli' });
      const id = runSql(`INSERT INTO inventory_items (name, unit, current_stock, min_stock, cost_per_unit, category, supplier_id, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, unit || 'kg', current_stock || 0, min_stock || 0, cost_per_unit || 0, category || 'Genel', supplier_id || null, notes || '']);
      save();
      res.status(201).json(queryOne('SELECT * FROM inventory_items WHERE id = ?', [id]));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.put('/inventory/:id', (req, res) => {
    try {
      const { name, unit, current_stock, min_stock, cost_per_unit, category, supplier_id, notes, is_active } = req.body;
      db.run(`UPDATE inventory_items SET name=?, unit=?, current_stock=?, min_stock=?, cost_per_unit=?,
        category=?, supplier_id=?, notes=?, is_active=? WHERE id=?`,
        [name, unit, current_stock, min_stock, cost_per_unit, category || 'Genel', supplier_id || null, notes, is_active ?? 1, +req.params.id]);
      save();
      res.json(queryOne('SELECT * FROM inventory_items WHERE id = ?', [+req.params.id]));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.delete('/inventory/:id', (req, res) => {
    try { db.run('DELETE FROM inventory_items WHERE id = ?', [+req.params.id]); save(); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── Inventory Transactions ─────────────────────────
  router.get('/inventory/:id/transactions', (req, res) => {
    try {
      const txns = queryAll(`SELECT t.*, a.name as supplier_name
        FROM inventory_transactions t
        LEFT JOIN accounts a ON t.supplier_id = a.id
        WHERE t.item_id = ? ORDER BY t.date DESC, t.id DESC`, [+req.params.id]);
      res.json(txns);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/inventory/:id/transactions', (req, res) => {
    try {
      const { type, quantity, unit_cost, description, supplier_id, date, created_by } = req.body;
      if (!type || !quantity) return res.status(400).json({ error: 'Tür ve miktar gerekli' });
      const validTypes = ['in', 'out', 'waste', 'adjustment'];
      if (!validTypes.includes(type)) return res.status(400).json({ error: 'Geçersiz işlem türü' });
      
      const total_cost = (quantity || 0) * (unit_cost || 0);
      const txnDate = date || new Date().toISOString().split('T')[0];
      
      const id = runSql(`INSERT INTO inventory_transactions (item_id, type, quantity, unit_cost, total_cost, description, supplier_id, date, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [+req.params.id, type, quantity, unit_cost || 0, total_cost, description || '', supplier_id || null, txnDate, created_by || '']);
      
      // Update current_stock
      if (type === 'in') {
        db.run('UPDATE inventory_items SET current_stock = current_stock + ? WHERE id = ?', [quantity, +req.params.id]);
      } else if (type === 'out' || type === 'waste') {
        db.run('UPDATE inventory_items SET current_stock = current_stock - ? WHERE id = ?', [quantity, +req.params.id]);
      } else if (type === 'adjustment') {
        // adjustment: quantity is the new absolute value
        db.run('UPDATE inventory_items SET current_stock = ? WHERE id = ?', [quantity, +req.params.id]);
      }
      
      // Update cost_per_unit on inbound
      if (type === 'in' && unit_cost > 0) {
        db.run('UPDATE inventory_items SET cost_per_unit = ? WHERE id = ?', [unit_cost, +req.params.id]);
      }
      
      save();
      res.status(201).json(queryOne('SELECT * FROM inventory_transactions WHERE id = ?', [id]));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.delete('/inventory/transactions/:id', (req, res) => {
    try {
      // Reverse the stock change before deleting
      const txn = queryOne('SELECT * FROM inventory_transactions WHERE id = ?', [+req.params.id]);
      if (txn) {
        if (txn.type === 'in') {
          db.run('UPDATE inventory_items SET current_stock = current_stock - ? WHERE id = ?', [txn.quantity, txn.item_id]);
        } else if (txn.type === 'out' || txn.type === 'waste') {
          db.run('UPDATE inventory_items SET current_stock = current_stock + ? WHERE id = ?', [txn.quantity, txn.item_id]);
        }
      }
      db.run('DELETE FROM inventory_transactions WHERE id = ?', [+req.params.id]);
      save();
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── Product Recipes ────────────────────────────────
  router.get('/products/:id/recipe', (req, res) => {
    try {
      const recipe = queryAll(`SELECT r.*, i.name as item_name, i.unit as item_unit, i.current_stock, i.cost_per_unit
        FROM product_recipes r
        LEFT JOIN inventory_items i ON r.item_id = i.id
        WHERE r.product_id = ?`, [+req.params.id]);
      res.json(recipe);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/products/:id/recipe', (req, res) => {
    try {
      const { items } = req.body; // [{item_id, quantity, unit}]
      if (!items || !Array.isArray(items)) return res.status(400).json({ error: 'Malzeme listesi gerekli' });
      // Clear existing recipe
      db.run('DELETE FROM product_recipes WHERE product_id = ?', [+req.params.id]);
      // Insert new recipe items
      for (const item of items) {
        if (item.item_id && item.quantity > 0) {
          db.run('INSERT INTO product_recipes (product_id, item_id, quantity, unit) VALUES (?, ?, ?, ?)',
            [+req.params.id, item.item_id, item.quantity, item.unit || 'kg']);
        }
      }
      save();
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.delete('/products/:id/recipe', (req, res) => {
    try { db.run('DELETE FROM product_recipes WHERE product_id = ?', [+req.params.id]); save(); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ══════════════════════════════════════════════════
  //  RESERVATIONS / REZERVASYONLAR
  // ══════════════════════════════════════════════════

  router.get('/reservations', (req, res) => {
    try {
      const { date, status, table_id } = req.query;
      let sql = `SELECT r.*, t.name as table_name, t.capacity as table_capacity, t.floor as table_floor
        FROM reservations r
        LEFT JOIN tables_info t ON r.table_id = t.id`;
      const conditions = []; const params = [];
      if (date) { conditions.push('r.date = ?'); params.push(date); }
      if (status) {
        const statuses = status.split(',').map(s => s.trim());
        conditions.push('r.status IN (' + statuses.map(() => '?').join(',') + ')');
        params.push(...statuses);
      }
      if (table_id) { conditions.push('r.table_id = ?'); params.push(+table_id); }
      if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
      sql += ' ORDER BY r.date ASC, r.time ASC';
      res.json(queryAll(sql, params));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Upcoming reservations (today + future, not cancelled/completed)
  router.get('/reservations/upcoming', (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const reservations = queryAll(`SELECT r.*, t.name as table_name, t.capacity as table_capacity
        FROM reservations r
        LEFT JOIN tables_info t ON r.table_id = t.id
        WHERE r.date >= ? AND r.status IN ('pending','confirmed')
        ORDER BY r.date ASC, r.time ASC`, [today]);
      res.json(reservations);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Check table availability for a given date
  router.get('/reservations/availability', (req, res) => {
    try {
      const { date } = req.query;
      if (!date) return res.status(400).json({ error: 'Tarih gerekli' });
      const tables = queryAll('SELECT * FROM tables_info ORDER BY floor, name');
      const dayReservations = queryAll(`SELECT * FROM reservations WHERE date = ? AND status IN ('pending','confirmed','seated') ORDER BY time ASC`, [date]);
      const result = tables.map(t => {
        const tableRes = dayReservations.filter(r => r.table_id === t.id);
        return { ...t, reservations: tableRes, is_reserved: tableRes.length > 0 };
      });
      res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/reservations', (req, res) => {
    try {
      const { table_id, customer_name, customer_phone, guest_count, date, time, duration, notes, created_by } = req.body;
      if (!customer_name) return res.status(400).json({ error: 'Müşteri adı gerekli' });
      if (!date || !time) return res.status(400).json({ error: 'Tarih ve saat gerekli' });
      if (!table_id) return res.status(400).json({ error: 'Masa seçimi gerekli' });

      // Check for conflicts
      const dur = duration || 120;
      const conflicts = queryAll(`SELECT * FROM reservations 
        WHERE table_id = ? AND date = ? AND status IN ('pending','confirmed','seated')
        AND id != 0`, [+table_id, date]);
      
      // Simple time overlap check
      const newStart = timeToMinutes(time);
      const newEnd = newStart + dur;
      for (const c of conflicts) {
        const cStart = timeToMinutes(c.time);
        const cEnd = cStart + (c.duration || 120);
        if (newStart < cEnd && newEnd > cStart) {
          return res.status(409).json({ error: `Bu masa ${c.time} - ${minutesToTime(cEnd)} arasında zaten rezerveli (${c.customer_name})` });
        }
      }

      const id = runSql(`INSERT INTO reservations (table_id, customer_name, customer_phone, guest_count, date, time, duration, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [+table_id, customer_name, customer_phone || '', guest_count || 2, date, time, dur, notes || '', created_by || '']);
      save();
      const created = queryOne(`SELECT r.*, t.name as table_name FROM reservations r LEFT JOIN tables_info t ON r.table_id = t.id WHERE r.id = ?`, [id]);
      res.status(201).json(created);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.put('/reservations/:id', (req, res) => {
    try {
      const { table_id, customer_name, customer_phone, guest_count, date, time, duration, notes, status } = req.body;
      db.run(`UPDATE reservations SET table_id=?, customer_name=?, customer_phone=?, guest_count=?, date=?, time=?, duration=?, notes=?, status=? WHERE id=?`,
        [table_id, customer_name, customer_phone, guest_count, date, time, duration || 120, notes, status || 'pending', +req.params.id]);
      save();
      res.json(queryOne(`SELECT r.*, t.name as table_name FROM reservations r LEFT JOIN tables_info t ON r.table_id = t.id WHERE r.id = ?`, [+req.params.id]));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.put('/reservations/:id/status', (req, res) => {
    try {
      const { status } = req.body;
      const valid = ['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'];
      if (!valid.includes(status)) return res.status(400).json({ error: 'Geçersiz durum' });
      db.run('UPDATE reservations SET status = ? WHERE id = ?', [status, +req.params.id]);
      save();
      res.json(queryOne(`SELECT r.*, t.name as table_name FROM reservations r LEFT JOIN tables_info t ON r.table_id = t.id WHERE r.id = ?`, [+req.params.id]));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.delete('/reservations/:id', (req, res) => {
    try { db.run('DELETE FROM reservations WHERE id = ?', [+req.params.id]); save(); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Helper: time string to minutes
  function timeToMinutes(t) { const [h, m] = (t || '12:00').split(':').map(Number); return h * 60 + (m || 0); }
  function minutesToTime(m) { return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }

  // ══════════════════════════════════════════════════
  //  EXPENSES / GİDER YÖNETİMİ
  // ══════════════════════════════════════════════════

  router.get('/expenses', (req, res) => {
    try {
      const { month, category, payment_method } = req.query;
      let sql = `SELECT e.*, a.name as supplier_name FROM expenses e LEFT JOIN accounts a ON e.supplier_id = a.id`;
      const conds = []; const params = [];
      if (month) { conds.push("e.date LIKE ?"); params.push(month + '%'); }
      if (category) { conds.push('e.category = ?'); params.push(category); }
      if (payment_method) { conds.push('e.payment_method = ?'); params.push(payment_method); }
      if (conds.length > 0) sql += ' WHERE ' + conds.join(' AND ');
      sql += ' ORDER BY e.date DESC, e.id DESC';
      res.json(queryAll(sql, params));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/expenses/report', (req, res) => {
    try {
      const { month } = req.query;
      const dateFilter = month ? `WHERE date LIKE '${month}%'` : '';
      const total = queryOne(`SELECT COALESCE(SUM(amount),0) as total FROM expenses ${dateFilter}`);
      const byCategory = queryAll(`SELECT category, COALESCE(SUM(amount),0) as total, COUNT(*) as count FROM expenses ${dateFilter} GROUP BY category ORDER BY total DESC`);
      const byPayment = queryAll(`SELECT payment_method, COALESCE(SUM(amount),0) as total FROM expenses ${dateFilter} GROUP BY payment_method`);
      const byDay = queryAll(`SELECT date, COALESCE(SUM(amount),0) as total FROM expenses ${dateFilter} GROUP BY date ORDER BY date DESC LIMIT 31`);
      
      // This month vs last month comparison
      const now = new Date();
      const thisMonth = now.toISOString().slice(0, 7);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
      const thisMonthTotal = queryOne(`SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE date LIKE '${thisMonth}%'`);
      const lastMonthTotal = queryOne(`SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE date LIKE '${lastMonth}%'`);
      
      res.json({
        total: total?.total || 0,
        by_category: byCategory,
        by_payment: byPayment,
        by_day: byDay,
        this_month: thisMonthTotal?.total || 0,
        last_month: lastMonthTotal?.total || 0,
      });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/expenses', (req, res) => {
    try {
      const { category, description, amount, payment_method, date, supplier_id, receipt_no, notes, is_recurring, created_by } = req.body;
      if (!amount || amount <= 0) return res.status(400).json({ error: 'Tutar gerekli' });
      if (!date) return res.status(400).json({ error: 'Tarih gerekli' });
      const id = runSql(`INSERT INTO expenses (category, description, amount, payment_method, date, supplier_id, receipt_no, notes, is_recurring, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [category || 'Genel', description || '', amount, payment_method || 'cash', date, supplier_id || null, receipt_no || '', notes || '', is_recurring || 0, created_by || '']);
      save();
      res.status(201).json(queryOne('SELECT * FROM expenses WHERE id = ?', [id]));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.put('/expenses/:id', (req, res) => {
    try {
      const { category, description, amount, payment_method, date, supplier_id, receipt_no, notes, is_recurring } = req.body;
      db.run(`UPDATE expenses SET category=?, description=?, amount=?, payment_method=?, date=?, supplier_id=?, receipt_no=?, notes=?, is_recurring=? WHERE id=?`,
        [category, description, amount, payment_method, date, supplier_id || null, receipt_no, notes, is_recurring || 0, +req.params.id]);
      save();
      res.json(queryOne('SELECT * FROM expenses WHERE id = ?', [+req.params.id]));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.delete('/expenses/:id', (req, res) => {
    try { db.run('DELETE FROM expenses WHERE id = ?', [+req.params.id]); save(); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
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

  // ══════════════════════════════════════════════════
  //  BACKUP / YEDEKLEME
  // ══════════════════════════════════════════════════

  const { createManualBackup, listBackups, restoreBackup, BACKUP_DIR } = require('../database/init');
  const pathLib = require('path');

  router.get('/backups', (req, res) => {
    try { res.json(listBackups()); }
    catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/backups', (req, res) => {
    try {
      const name = createManualBackup();
      if (!name) return res.status(500).json({ error: 'Yedek oluşturulamadı' });
      res.status(201).json({ success: true, name, message: 'Yedek başarıyla oluşturuldu' });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/backups/restore', (req, res) => {
    try {
      const { filename } = req.body;
      if (!filename) return res.status(400).json({ error: 'Dosya adı gerekli' });
      restoreBackup(filename);
      res.json({ success: true, message: 'Yedek geri yüklendi. Sunucu yeniden başlatılmalı.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/backups/download/:name', (req, res) => {
    try {
      const filePath = pathLib.join(BACKUP_DIR, req.params.name);
      if (!require('fs').existsSync(filePath)) return res.status(404).json({ error: 'Dosya bulunamadı' });
      res.download(filePath);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  return router;
};
