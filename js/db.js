// ===== API CLIENT LAYER =====
const API_URL = 'http://localhost:3000/api';

async function apiFetch(endpoint, options = {}) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
  return res.json();
}

async function initDB() {
  // Backend handles initialization
  return true;
}

// ===== ROOM TYPES =====
const RoomTypes = {
  all: () => apiFetch('/room-types'),
  get: (id) => apiFetch(`/room-types/${id}`),
  create: (data) => apiFetch('/room-types', { method: 'POST', body: JSON.stringify(data) }).then(r => r.id),
  update: (id, data) => apiFetch(`/room-types/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/room-types/${id}`, { method: 'DELETE' })
};

// ===== ROOMS =====
const Rooms = {
  all: (filter = {}) => {
    const q = new URLSearchParams(filter).toString();
    return apiFetch(`/rooms${q ? '?'+q : ''}`);
  },
  getAvailable: (checkIn, checkOut) => apiFetch(`/rooms/available?check_in=${checkIn}&check_out=${checkOut}`),
  get: (id) => apiFetch(`/rooms/${id}`),
  create: (data) => apiFetch('/rooms', { method: 'POST', body: JSON.stringify(data) }).then(r => r.id),
  update: (id, data) => apiFetch(`/rooms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/rooms/${id}`, { method: 'DELETE' }),
  stats: async () => (await Dashboard.stats()).rooms
};

// ===== GUESTS =====
const Guests = {
  all: (search = '') => apiFetch(`/guests${search ? '?search='+encodeURIComponent(search) : ''}`),
  get: (id) => apiFetch(`/guests/${id}`),
  create: (data) => apiFetch('/guests', { method: 'POST', body: JSON.stringify(data) }).then(r => r.id),
  update: (id, data) => apiFetch(`/guests/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/guests/${id}`, { method: 'DELETE' })
};

// ===== RESERVATIONS =====
const Reservations = {
  all: (filter = {}) => {
    const q = new URLSearchParams(filter).toString();
    return apiFetch(`/reservations${q ? '?'+q : ''}`);
  },
  get: (id) => apiFetch(`/reservations/${id}`),
  create: (data) => apiFetch('/reservations', { method: 'POST', body: JSON.stringify(data) }).then(r => r.id),
  updateStatus: (id, status) => apiFetch(`/reservations/${id}/status`, { method: 'PUT', body: JSON.stringify({status}) }),
  delete: (id) => apiFetch(`/reservations/${id}`, { method: 'DELETE' }),
  todayArrivals: () => apiFetch('/reservations?type=arrivals'),
  todayDepartures: () => apiFetch('/reservations?type=departures'),
  currentlyCheckedIn: () => apiFetch('/reservations?type=checked_in')
};

// ===== INVOICES =====
const Invoices = {
  all: (filter = {}) => {
    const q = new URLSearchParams(filter).toString();
    return apiFetch(`/invoices${q ? '?'+q : ''}`);
  },
  get: (id) => apiFetch(`/invoices/${id}`),
  getByReservation: (resId) => apiFetch(`/invoices/reservation/${resId}`),
  addItem: (invId, item) => apiFetch(`/invoices/${invId}/items`, { method: 'POST', body: JSON.stringify(item) }),
  removeItem: (itemId, invId) => apiFetch(`/invoices/${invId}/items/${itemId}`, { method: 'DELETE' }),
  markPaid: (id) => apiFetch(`/invoices/${id}/pay`, { method: 'PUT' }),
  stats: async () => (await Dashboard.stats()).invoices
};

// ===== DASHBOARD =====
const Dashboard = {
  stats: () => apiFetch('/dashboard/stats')
};

// ===== UTILS =====
function dateDiffDays(from, to) {
  const a = new Date(from);
  const b = new Date(to);
  return Math.max(1, Math.round((b - a) / 86400000));
}
