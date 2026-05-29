const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDB, initDB } = require('./server/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// ===== API ROUTES =====

async function getAvailableRooms(checkIn, checkOut) {
  const db = await getDB();
  return db.all(`
    SELECT r.*, rt.name as type_name FROM rooms r
    JOIN room_types rt ON r.type_id = rt.id
    WHERE r.status NOT IN ('maintenance','occupied')
      AND r.id NOT IN (
        SELECT room_id FROM reservations
        WHERE status IN ('confirmed','checked_in')
          AND check_in_date < ? AND check_out_date > ?
      )
    ORDER BY r.price_per_night
  `, [checkOut, checkIn]);
}

app.get('/api/dashboard/stats', async (req, res) => {
  const db = await getDB();
  const roomStats = await db.get(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status='available' THEN 1 ELSE 0 END) as available,
      SUM(CASE WHEN status='occupied' THEN 1 ELSE 0 END) as occupied,
      SUM(CASE WHEN status='reserved' THEN 1 ELSE 0 END) as reserved,
      SUM(CASE WHEN status='maintenance' THEN 1 ELSE 0 END) as maintenance
    FROM rooms
  `);

  const invoiceStats = await db.get(`
    SELECT
      SUM(total) as total_revenue,
      SUM(CASE WHEN status='paid' THEN total ELSE 0 END) as paid_revenue,
      SUM(CASE WHEN status='unpaid' THEN total ELSE 0 END) as pending_revenue,
      COUNT(*) as total_invoices,
      SUM(CASE WHEN status='paid' THEN 1 ELSE 0 END) as paid_count,
      SUM(CASE WHEN status='unpaid' THEN 1 ELSE 0 END) as unpaid_count
    FROM invoices
  `);

  const today = new Date().toISOString().split('T')[0];
  const arrivals = (await db.get(`SELECT COUNT(*) as c FROM reservations WHERE check_in_date=? AND status='confirmed'`, [today])).c;
  const departures = (await db.get(`SELECT COUNT(*) as c FROM reservations WHERE check_out_date=? AND status='checked_in'`, [today])).c;

  res.json({
    rooms: roomStats,
    invoices: invoiceStats,
    arrivals,
    departures
  });
});

app.get('/api/rooms', async (req, res) => {
  const db = await getDB();
  const { status, type_id } = req.query;
  let sql = `SELECT r.*, rt.name as type_name FROM rooms r JOIN room_types rt ON r.type_id = rt.id`;
  const params = [];
  const where = [];
  if (status) { where.push('r.status = ?'); params.push(status); }
  if (type_id) { where.push('r.type_id = ?'); params.push(type_id); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY r.room_number';
  res.json(await db.all(sql, params));
});

app.get('/api/rooms/available', async (req, res) => {
  const { check_in, check_out } = req.query;
  res.json(await getAvailableRooms(check_in, check_out));
});


app.get('/api/rooms/:id', async (req, res) => {
  const db = await getDB();
  res.json(await db.get('SELECT * FROM rooms WHERE id = ?', [req.params.id]));
});

app.post('/api/rooms', async (req, res) => {
  const db = await getDB();
  const data = req.body;
  const result = await db.run('INSERT INTO rooms (room_number, type_id, floor, status, price_per_night, amenities) VALUES (?,?,?,?,?,?)',
    [data.room_number, data.type_id, data.floor, data.status || 'available', data.price_per_night, data.amenities]);
  res.json({ id: result.lastID });
});

app.put('/api/rooms/:id', async (req, res) => {
  const db = await getDB();
  const data = req.body;
  await db.run('UPDATE rooms SET room_number=?, type_id=?, floor=?, status=?, price_per_night=?, amenities=? WHERE id=?',
    [data.room_number, data.type_id, data.floor, data.status, data.price_per_night, data.amenities, req.params.id]);
  res.json({ success: true });
});

app.delete('/api/rooms/:id', async (req, res) => {
  const db = await getDB();
  await db.run('DELETE FROM rooms WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

app.get('/api/room-types', async (req, res) => {
  const db = await getDB();
  res.json(await db.all('SELECT * FROM room_types ORDER BY base_price'));
});


app.get('/api/room-types/:id', async (req, res) => {
  const db = await getDB();
  res.json(await db.get('SELECT * FROM room_types WHERE id = ?', [req.params.id]));
});

app.post('/api/room-types', async (req, res) => {
  const db = await getDB();
  const data = req.body;
  const result = await db.run('INSERT INTO room_types (name, description, base_price, capacity) VALUES (?,?,?,?)',
    [data.name, data.description, data.base_price, data.capacity]);
  res.json({ id: result.lastID });
});

app.put('/api/room-types/:id', async (req, res) => {
  const db = await getDB();
  const data = req.body;
  await db.run('UPDATE room_types SET name=?, description=?, base_price=?, capacity=? WHERE id=?',
    [data.name, data.description, data.base_price, data.capacity, req.params.id]);
  res.json({ success: true });
});

app.delete('/api/room-types/:id', async (req, res) => {
  const db = await getDB();
  await db.run('DELETE FROM room_types WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

app.get('/api/guests', async (req, res) => {
  const db = await getDB();
  const { search } = req.query;
  if (search) {
    const term = `%${search}%`;
    res.json(await db.all(`SELECT * FROM guests WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ? ORDER BY created_at DESC`, [term, term, term, term]));
  } else {
    res.json(await db.all('SELECT * FROM guests ORDER BY created_at DESC'));
  }
});


app.get('/api/guests/:id', async (req, res) => {
  const db = await getDB();
  res.json(await db.get('SELECT * FROM guests WHERE id = ?', [req.params.id]));
});

app.post('/api/guests', async (req, res) => {
  const db = await getDB();
  const data = req.body;
  const result = await db.run('INSERT INTO guests (first_name, last_name, email, phone, id_type, id_number, nationality, address) VALUES (?,?,?,?,?,?,?,?)',
    [data.first_name, data.last_name, data.email, data.phone, data.id_type, data.id_number, data.nationality, data.address]);
  res.json({ id: result.lastID });
});

app.put('/api/guests/:id', async (req, res) => {
  const db = await getDB();
  const data = req.body;
  await db.run('UPDATE guests SET first_name=?, last_name=?, email=?, phone=?, id_type=?, id_number=?, nationality=?, address=? WHERE id=?',
    [data.first_name, data.last_name, data.email, data.phone, data.id_type, data.id_number, data.nationality, data.address, req.params.id]);
  res.json({ success: true });
});

app.delete('/api/guests/:id', async (req, res) => {
  const db = await getDB();
  await db.run('DELETE FROM guests WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

app.get('/api/reservations', async (req, res) => {
  const db = await getDB();
  const { status, type } = req.query;
  const today = new Date().toISOString().split('T')[0];
  
  if (type === 'arrivals') {
    return res.json(await db.all(`
      SELECT res.*, g.first_name, g.last_name, r.room_number
      FROM reservations res
      JOIN guests g ON res.guest_id = g.id
      JOIN rooms r ON res.room_id = r.id
      WHERE res.check_in_date = ? AND res.status = 'confirmed'
    `, [today]));
  }
  
  if (type === 'departures') {
    return res.json(await db.all(`
      SELECT res.*, g.first_name, g.last_name, r.room_number
      FROM reservations res
      JOIN guests g ON res.guest_id = g.id
      JOIN rooms r ON res.room_id = r.id
      WHERE res.check_out_date = ? AND res.status = 'checked_in'
    `, [today]));
  }
  
  if (type === 'checked_in') {
    return res.json(await db.all(`
      SELECT res.*, g.first_name, g.last_name, r.room_number, rt.name as type_name
      FROM reservations res
      JOIN guests g ON res.guest_id = g.id
      JOIN rooms r ON res.room_id = r.id
      JOIN room_types rt ON r.type_id = rt.id
      WHERE res.status = 'checked_in'
      ORDER BY res.check_in_date
    `));
  }

  let sql = `
    SELECT res.*, g.first_name, g.last_name, g.email, g.phone,
    r.room_number, rt.name as type_name, r.price_per_night
    FROM reservations res
    JOIN guests g ON res.guest_id = g.id
    JOIN rooms r ON res.room_id = r.id
    JOIN room_types rt ON r.type_id = rt.id
  `;
  const params = [];
  if (status) {
    sql += ' WHERE res.status = ?';
    params.push(status);
  }
  sql += ' ORDER BY res.created_at DESC';
  res.json(await db.all(sql, params));
});


app.get('/api/reservations/:id', async (req, res) => {
  const db = await getDB();
  res.json(await db.get(`
    SELECT res.*, g.first_name, g.last_name, g.email, g.phone,
    r.room_number, rt.name as type_name, r.price_per_night
    FROM reservations res
    JOIN guests g ON res.guest_id = g.id
    JOIN rooms r ON res.room_id = r.id
    JOIN room_types rt ON r.type_id = rt.id
    WHERE res.id = ?
  `, [req.params.id]));
});

app.post('/api/reservations', async (req, res) => {
  const db = await getDB();
  const data = req.body;
  
  await db.run('BEGIN TRANSACTION');
  try {
    const result = await db.run('INSERT INTO reservations (guest_id, room_id, check_in_date, check_out_date, status, adults, children, special_requests) VALUES (?,?,?,?,?,?,?,?)',
      [data.guest_id, data.room_id, data.check_in_date, data.check_out_date, data.status || 'confirmed', data.adults || 1, data.children || 0, data.special_requests || '']);
    const resId = result.lastID;
    
    await db.run('UPDATE rooms SET status=? WHERE id=?', ['reserved', data.room_id]);
    
    const a = new Date(data.check_in_date);
    const b = new Date(data.check_out_date);
    const nights = Math.max(1, Math.round((b - a) / 86400000));
    
    const room = await db.get('SELECT r.*, rt.name as type_name FROM rooms r JOIN room_types rt ON r.type_id=rt.id WHERE r.id=?', [data.room_id]);
    const subtotal = nights * room.price_per_night;
    const tax = subtotal * 0.12;
    const total = subtotal + tax;
    
    const invResult = await db.run('INSERT INTO invoices (reservation_id, subtotal, tax_rate, tax_amount, total) VALUES (?,?,?,?,?)',
      [resId, subtotal, 0.12, tax, total]);
    
    await db.run('INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total) VALUES (?,?,?,?,?)',
      [invResult.lastID, `Room ${room.room_number} - ${room.type_name} (${nights} night${nights>1?'s':''})`, nights, room.price_per_night, subtotal]);
      
    await db.run('COMMIT');
    res.json({ id: resId });
  } catch (err) {
    await db.run('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/reservations/:id/status', async (req, res) => {
  const db = await getDB();
  const { status } = req.body;
  await db.run('UPDATE reservations SET status=? WHERE id=?', [status, req.params.id]);
  res.json({ success: true });
});

app.delete('/api/reservations/:id', async (req, res) => {
  const db = await getDB();
  await db.run('DELETE FROM reservations WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

app.get('/api/invoices', async (req, res) => {
  const db = await getDB();
  const { status } = req.query;
  let sql = `
    SELECT inv.*, res.check_in_date, res.check_out_date,
    g.first_name, g.last_name, r.room_number
    FROM invoices inv
    JOIN reservations res ON inv.reservation_id = res.id
    JOIN guests g ON res.guest_id = g.id
    JOIN rooms r ON res.room_id = r.id
  `;
  const params = [];
  if (status) { sql += ' WHERE inv.status = ?'; params.push(status); }
  sql += ' ORDER BY inv.created_at DESC';
  res.json(await db.all(sql, params));
});

app.get('/api/invoices/:id', async (req, res) => {
  const db = await getDB();
  const inv = await db.get(`
    SELECT inv.*, res.check_in_date, res.check_out_date,
    g.first_name, g.last_name, g.email, g.phone, r.room_number, rt.name as type_name
    FROM invoices inv
    JOIN reservations res ON inv.reservation_id = res.id
    JOIN guests g ON res.guest_id = g.id
    JOIN rooms r ON res.room_id = r.id
    JOIN room_types rt ON r.type_id = rt.id
    WHERE inv.id = ?
  `, [req.params.id]);
  
  if (inv) {
    inv.items = await db.all('SELECT * FROM invoice_items WHERE invoice_id = ?', [inv.id]);
  }
  res.json(inv);
});

app.get('/api/invoices/reservation/:resId', async (req, res) => {
  const db = await getDB();
  res.json(await db.get('SELECT * FROM invoices WHERE reservation_id = ?', [req.params.resId]) || null);
});

app.post('/api/invoices/:id/items', async (req, res) => {
  const db = await getDB();
  const invId = req.params.id;
  const { description, quantity, unit_price } = req.body;
  
  await db.run('BEGIN TRANSACTION');
  try {
    await db.run('INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total) VALUES (?,?,?,?,?)',
      [invId, description, quantity, unit_price, quantity * unit_price]);
      
    const sub = (await db.get('SELECT SUM(total) as sub FROM invoice_items WHERE invoice_id = ?', [invId])).sub || 0;
    const tax = sub * 0.12;
    await db.run('UPDATE invoices SET subtotal=?, tax_amount=?, total=? WHERE id=?', [sub, tax, sub + tax, invId]);
    await db.run('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await db.run('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/invoices/:id/items/:itemId', async (req, res) => {
  const db = await getDB();
  const { id: invId, itemId } = req.params;
  await db.run('BEGIN TRANSACTION');
  try {
    await db.run('DELETE FROM invoice_items WHERE id = ?', [itemId]);
    const sub = (await db.get('SELECT SUM(total) as sub FROM invoice_items WHERE invoice_id = ?', [invId])).sub || 0;
    const tax = sub * 0.12;
    await db.run('UPDATE invoices SET subtotal=?, tax_amount=?, total=? WHERE id=?', [sub, tax, sub + tax, invId]);
    await db.run('COMMIT');
    res.json({ success: true });
  } catch(err) {
    await db.run('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/invoices/:id/pay', async (req, res) => {
  const db = await getDB();
  await db.run("UPDATE invoices SET status='paid', paid_at=datetime('now') WHERE id=?", [req.params.id]);
  res.json({ success: true });
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Run server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error("Failed to initialize database", err);
});
