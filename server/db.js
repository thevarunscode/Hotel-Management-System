const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

const dbPath = path.resolve(__dirname, '../luxestay.sqlite');

let dbInstance = null;

async function getDB() {
  if (!dbInstance) {
    dbInstance = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    await dbInstance.exec('PRAGMA foreign_keys = ON');
  }
  return dbInstance;
}

async function initDB() {
  const db = await getDB();
  const tableCheck = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='rooms'");

  if (!tableCheck) {
    console.log('Initializing database schema...');
    await createSchema(db);
    console.log('Seeding initial data...');
    await seedData(db);
  } else {
    console.log('Database already initialized.');
  }
}

async function createSchema(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS room_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      base_price REAL NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 2
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_number TEXT NOT NULL UNIQUE,
      type_id INTEGER NOT NULL,
      floor INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available','occupied','reserved','maintenance')),
      price_per_night REAL NOT NULL,
      amenities TEXT,
      FOREIGN KEY (type_id) REFERENCES room_types(id)
    );

    CREATE TABLE IF NOT EXISTS guests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      id_type TEXT NOT NULL DEFAULT 'passport',
      id_number TEXT NOT NULL,
      nationality TEXT,
      address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guest_id INTEGER NOT NULL,
      room_id INTEGER NOT NULL,
      check_in_date TEXT NOT NULL,
      check_out_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','checked_in','checked_out','cancelled')),
      adults INTEGER NOT NULL DEFAULT 1,
      children INTEGER NOT NULL DEFAULT 0,
      special_requests TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (guest_id) REFERENCES guests(id),
      FOREIGN KEY (room_id) REFERENCES rooms(id)
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reservation_id INTEGER NOT NULL UNIQUE,
      subtotal REAL NOT NULL DEFAULT 0,
      tax_rate REAL NOT NULL DEFAULT 0.12,
      tax_amount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'unpaid' CHECK(status IN ('unpaid','paid')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      paid_at TEXT,
      FOREIGN KEY (reservation_id) REFERENCES reservations(id)
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      total REAL NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    );
  `);
}

async function seedData(db) {
  // Using explicit await for simplicity in seeding
  await db.run('INSERT INTO room_types (name, description, base_price, capacity) VALUES (?, ?, ?, ?)', ['Standard', 'Cozy room with essential amenities', 120, 2]);
  await db.run('INSERT INTO room_types (name, description, base_price, capacity) VALUES (?, ?, ?, ?)', ['Deluxe', 'Spacious room with premium furnishings', 220, 2]);
  await db.run('INSERT INTO room_types (name, description, base_price, capacity) VALUES (?, ?, ?, ?)', ['Suite', 'Luxury suite with separate living area', 420, 4]);
  await db.run('INSERT INTO room_types (name, description, base_price, capacity) VALUES (?, ?, ?, ?)', ['Presidential', 'Exclusive suite with panoramic views', 850, 6]);

  await db.run('INSERT INTO rooms (room_number, type_id, floor, status, price_per_night, amenities) VALUES (?, ?, ?, ?, ?, ?)', ['101', 1, 1, 'available', 120, 'WiFi, TV, AC']);
  await db.run('INSERT INTO rooms (room_number, type_id, floor, status, price_per_night, amenities) VALUES (?, ?, ?, ?, ?, ?)', ['102', 1, 1, 'available', 120, 'WiFi, TV, AC']);
  await db.run('INSERT INTO rooms (room_number, type_id, floor, status, price_per_night, amenities) VALUES (?, ?, ?, ?, ?, ?)', ['103', 1, 1, 'occupied', 120, 'WiFi, TV, AC']);
  await db.run('INSERT INTO rooms (room_number, type_id, floor, status, price_per_night, amenities) VALUES (?, ?, ?, ?, ?, ?)', ['104', 2, 1, 'available', 220, 'WiFi, TV, AC, Minibar']);
  await db.run('INSERT INTO rooms (room_number, type_id, floor, status, price_per_night, amenities) VALUES (?, ?, ?, ?, ?, ?)', ['201', 2, 2, 'available', 220, 'WiFi, TV, AC, Minibar']);
  await db.run('INSERT INTO rooms (room_number, type_id, floor, status, price_per_night, amenities) VALUES (?, ?, ?, ?, ?, ?)', ['202', 2, 2, 'reserved', 220, 'WiFi, TV, AC, Minibar']);
  await db.run('INSERT INTO rooms (room_number, type_id, floor, status, price_per_night, amenities) VALUES (?, ?, ?, ?, ?, ?)', ['203', 3, 2, 'available', 420, 'WiFi, TV, AC, Minibar, Jacuzzi']);
  await db.run('INSERT INTO rooms (room_number, type_id, floor, status, price_per_night, amenities) VALUES (?, ?, ?, ?, ?, ?)', ['301', 3, 3, 'occupied', 420, 'WiFi, TV, AC, Minibar, Jacuzzi, Balcony']);
  await db.run('INSERT INTO rooms (room_number, type_id, floor, status, price_per_night, amenities) VALUES (?, ?, ?, ?, ?, ?)', ['302', 3, 3, 'maintenance', 420, 'WiFi, TV, AC, Minibar, Jacuzzi, Balcony']);
  await db.run('INSERT INTO rooms (room_number, type_id, floor, status, price_per_night, amenities) VALUES (?, ?, ?, ?, ?, ?)', ['401', 4, 4, 'available', 850, 'All amenities, Private Pool, Butler Service']);

  await db.run('INSERT INTO guests (first_name, last_name, email, phone, id_type, id_number, nationality, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['James', 'Thornton', 'james.thornton@email.com', '+1-555-0101', 'passport', 'US1234567', 'American', '123 Oak St, New York']);
  await db.run('INSERT INTO guests (first_name, last_name, email, phone, id_type, id_number, nationality, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['Sofia', 'Marchetti', 'sofia.marchetti@email.com', '+39-02-5550102', 'passport', 'IT9876543', 'Italian', 'Via Roma 45, Milan']);
  await db.run('INSERT INTO guests (first_name, last_name, email, phone, id_type, id_number, nationality, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['Rahul', 'Sharma', 'rahul.sharma@email.com', '+91-98765-43210', 'aadhaar', 'AADHAAR1234', 'Indian', '12 MG Road, Mumbai']);
  await db.run('INSERT INTO guests (first_name, last_name, email, phone, id_type, id_number, nationality, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['Emily', 'Chen', 'emily.chen@email.com', '+86-10-5550104', 'passport', 'CN5566778', 'Chinese', '88 Wangfujing St, Beijing']);
  await db.run('INSERT INTO guests (first_name, last_name, email, phone, id_type, id_number, nationality, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['Oliver', 'Bennett', 'oliver.bennett@email.com', '+44-20-5550105', 'passport', 'GB3344556', 'British', '10 Baker St, London']);

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];

  await db.run('INSERT INTO reservations (guest_id, room_id, check_in_date, check_out_date, status, adults, children) VALUES (?, ?, ?, ?, ?, ?, ?)', [1, 3, yesterday, tomorrow, 'checked_in', 2, 0]);
  await db.run('INSERT INTO reservations (guest_id, room_id, check_in_date, check_out_date, status, adults, children) VALUES (?, ?, ?, ?, ?, ?, ?)', [2, 8, twoDaysAgo, today, 'checked_in', 1, 0]);
  await db.run('INSERT INTO reservations (guest_id, room_id, check_in_date, check_out_date, status, adults, children) VALUES (?, ?, ?, ?, ?, ?, ?)', [3, 6, tomorrow, nextWeek, 'confirmed', 2, 1]);
  await db.run('INSERT INTO reservations (guest_id, room_id, check_in_date, check_out_date, status, adults, children) VALUES (?, ?, ?, ?, ?, ?, ?)', [4, 4, today, nextWeek, 'confirmed', 2, 0]);
  await db.run('INSERT INTO reservations (guest_id, room_id, check_in_date, check_out_date, status, adults, children) VALUES (?, ?, ?, ?, ?, ?, ?)', [5, 7, threeDaysAgo, yesterday, 'checked_out', 2, 0]);

  await db.run('INSERT INTO invoices (reservation_id, subtotal, tax_rate, tax_amount, total, status) VALUES (?, ?, ?, ?, ?, ?)', [1, 240, 0.12, 28.80, 268.80, 'unpaid']);
  await db.run('INSERT INTO invoices (reservation_id, subtotal, tax_rate, tax_amount, total, status) VALUES (?, ?, ?, ?, ?, ?)', [2, 840, 0.12, 100.80, 940.80, 'paid']);
  await db.run('INSERT INTO invoices (reservation_id, subtotal, tax_rate, tax_amount, total, status) VALUES (?, ?, ?, ?, ?, ?)', [5, 840, 0.12, 100.80, 940.80, 'paid']);

  await db.run('INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?)', [1, 'Room 103 - Standard (2 nights)', 2, 120, 240]);
  await db.run('INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?)', [2, 'Room 301 - Suite (2 nights)', 2, 420, 840]);
  await db.run('INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?)', [3, 'Room 203 - Suite (2 nights)', 2, 420, 840]);
}

module.exports = {
  getDB,
  initDB
};
