// ===== ROOMS PAGE =====
let roomFilter = 'all';

async function renderRooms() {
  const types = await RoomTypes.all();
  const filter = roomFilter === 'all' ? {} : { status: roomFilter };
  const rooms = await Rooms.all(filter);
  const stats = await Rooms.stats();

  const html = `
    <div class="page-header">
      <div class="page-title-group">
        <h1 class="page-title">Rooms</h1>
        <span class="page-subtitle">${stats.total} rooms · ${stats.available} available</span>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary" onclick="openRoomTypeManager()">Manage Types</button>
        <button class="btn btn-primary" onclick="openAddRoom()">+ Add Room</button>
      </div>
    </div>
    <div class="page-body">
      <div class="filter-bar">
        <button class="filter-btn ${roomFilter==='all'?'active':''}" onclick="setRoomFilter('all')">All (${stats.total})</button>
        <button class="filter-btn ${roomFilter==='available'?'active':''}" onclick="setRoomFilter('available')">Available (${stats.available})</button>
        <button class="filter-btn ${roomFilter==='occupied'?'active':''}" onclick="setRoomFilter('occupied')">Occupied (${stats.occupied})</button>
        <button class="filter-btn ${roomFilter==='reserved'?'active':''}" onclick="setRoomFilter('reserved')">Reserved (${stats.reserved})</button>
        <button class="filter-btn ${roomFilter==='maintenance'?'active':''}" onclick="setRoomFilter('maintenance')">Maintenance (${stats.maintenance})</button>
      </div>
      <div class="rooms-grid">
        ${rooms.map(r => roomCard(r)).join('')}
        ${rooms.length === 0 ? `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">🚪</div><div class="empty-state-text">No rooms found</div></div>` : ''}
      </div>
    </div>
  `;
  document.getElementById('pageContainer').innerHTML = html;
}

function roomCard(r) {
  const typeClass = { 'Standard': 'standard', 'Deluxe': 'deluxe', 'Suite': 'suite', 'Presidential': 'presidential' };
  return `
    <div class="room-card ${r.status}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div class="room-number">${r.room_number}</div>
        ${statusBadge(r.status)}
      </div>
      <div class="room-type-label">${r.type_name} · Floor ${r.floor}</div>
      <div class="room-price">${formatCurrency(r.price_per_night)}<span style="font-size:11px;color:var(--text-muted)">/night</span></div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">${r.amenities || '—'}</div>
      <div class="room-card-actions">
        <button class="btn btn-secondary btn-sm" onclick="openEditRoom(${r.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteRoom(${r.id})">Delete</button>
      </div>
    </div>
  `;
}

async function setRoomFilter(f) {
  roomFilter = f;
  await renderRooms();
}

function roomFormHTML(room = null, types = []) {
  const t = room || {};
  const typeOpts = types.map(tp =>
    `<option value="${tp.id}" ${t.type_id == tp.id ? 'selected' : ''}>${tp.name}</option>`
  ).join('');
  const statusOpts = ['available','occupied','reserved','maintenance'].map(s =>
    `<option value="${s}" ${(t.status||'available') === s ? 'selected' : ''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`
  ).join('');
  return `
    <form id="roomForm" onsubmit="return false">
      <div class="form-grid form-grid-2">
        <div class="form-group">
          <label for="rn_room_number">Room Number</label>
          <input id="rn_room_number" placeholder="e.g. 201" value="${t.room_number||''}" />
          <span class="error-msg" id="rn_room_number_err"></span>
        </div>
        <div class="form-group">
          <label for="rn_floor">Floor</label>
          <input id="rn_floor" type="number" min="1" placeholder="1" value="${t.floor||1}" />
          <span class="error-msg" id="rn_floor_err"></span>
        </div>
        <div class="form-group">
          <label for="rn_type_id">Room Type</label>
          <select id="rn_type_id">${typeOpts}</select>
          <span class="error-msg" id="rn_type_id_err"></span>
        </div>
        <div class="form-group">
          <label for="rn_status">Status</label>
          <select id="rn_status">${statusOpts}</select>
        </div>
        <div class="form-group">
          <label for="rn_price">Price per Night ($)</label>
          <input id="rn_price" type="number" step="0.01" min="0" placeholder="120.00" value="${t.price_per_night||''}" />
          <span class="error-msg" id="rn_price_err"></span>
        </div>
        <div class="form-group">
          <label for="rn_amenities">Amenities</label>
          <input id="rn_amenities" placeholder="WiFi, TV, AC..." value="${t.amenities||''}" />
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" type="button" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" type="button" onclick="${room ? `saveEditRoom(${room.id})` : 'saveNewRoom()'}">
          ${room ? 'Save Changes' : 'Add Room'}
        </button>
      </div>
    </form>
  `;
}

async function openAddRoom() {
  const types = await RoomTypes.all();
  openModal('Add New Room', roomFormHTML(null, types));
}

async function openEditRoom(id) {
  const room = await Rooms.get(id);
  const types = await RoomTypes.all();
  openModal('Edit Room', roomFormHTML(room, types));
}

function getRoomFormData() {
  return {
    room_number: document.getElementById('rn_room_number').value.trim(),
    floor: document.getElementById('rn_floor').value,
    type_id: document.getElementById('rn_type_id').value,
    status: document.getElementById('rn_status').value,
    price_per_night: document.getElementById('rn_price').value,
    amenities: document.getElementById('rn_amenities').value.trim()
  };
}

async function saveNewRoom() {
  if (!validate([
    { id: 'rn_room_number', msg: 'Room number required' },
    { id: 'rn_price', msg: 'Price required' }
  ])) return;
  const data = getRoomFormData();
  await Rooms.create(data);
  closeModal();
  toast('Room added successfully');
  await renderRooms();
}

async function saveEditRoom(id) {
  if (!validate([
    { id: 'rn_room_number', msg: 'Room number required' },
    { id: 'rn_price', msg: 'Price required' }
  ])) return;
  const data = getRoomFormData();
  await Rooms.update(id, data);
  closeModal();
  toast('Room updated');
  await renderRooms();
}

async function deleteRoom(id) {
  confirmDialog('Are you sure you want to delete this room? This action cannot be undone.', async () => {
    await Rooms.delete(id);
    toast('Room deleted', 'info');
    await renderRooms();
  });
}

// ===== ROOM TYPES MANAGER =====
async function openRoomTypeManager() {
  const types = await RoomTypes.all();
  const rows = types.map(t => `
    <tr>
      <td><strong>${t.name}</strong></td>
      <td>${t.description || '—'}</td>
      <td>${formatCurrency(t.base_price)}</td>
      <td>${t.capacity}</td>
      <td class="td-actions">
        <button class="btn btn-secondary btn-sm" onclick="openEditRoomType(${t.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteRoomType(${t.id})">Delete</button>
      </td>
    </tr>
  `).join('');

  openModal('Room Types', `
    <div style="margin-bottom:16px;display:flex;justify-content:flex-end">
      <button class="btn btn-primary btn-sm" onclick="openAddRoomType()">+ Add Type</button>
    </div>
    <table>
      <thead><tr><th>Name</th><th>Description</th><th>Base Price</th><th>Capacity</th><th>Actions</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `, 'modal-lg');
}

function roomTypeFormHTML(type = null) {
  const t = type || {};
  return `
    <form id="rtForm" onsubmit="return false">
      <div class="form-grid form-grid-2">
        <div class="form-group">
          <label for="rt_name">Type Name</label>
          <input id="rt_name" placeholder="e.g. Deluxe" value="${t.name||''}" />
          <span class="error-msg" id="rt_name_err"></span>
        </div>
        <div class="form-group">
          <label for="rt_capacity">Capacity (persons)</label>
          <input id="rt_capacity" type="number" min="1" placeholder="2" value="${t.capacity||2}" />
        </div>
        <div class="form-group">
          <label for="rt_price">Base Price ($)</label>
          <input id="rt_price" type="number" step="0.01" min="0" placeholder="120.00" value="${t.base_price||''}" />
          <span class="error-msg" id="rt_price_err"></span>
        </div>
        <div class="form-group">
          <label for="rt_desc">Description</label>
          <input id="rt_desc" placeholder="Short description" value="${t.description||''}" />
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" type="button" onclick="openRoomTypeManager()">Back</button>
        <button class="btn btn-primary" type="button" onclick="${type ? `saveEditRoomType(${type.id})` : 'saveNewRoomType()'}">
          ${type ? 'Save' : 'Add Type'}
        </button>
      </div>
    </form>
  `;
}

async function openAddRoomType() {
  openModal('Add Room Type', roomTypeFormHTML());
}

async function openEditRoomType(id) {
  openModal('Edit Room Type', roomTypeFormHTML(await RoomTypes.get(id)));
}

async function saveNewRoomType() {
  if (!validate([{ id: 'rt_name', msg: 'Name required' }, { id: 'rt_price', msg: 'Price required' }])) return;
  await RoomTypes.create({
    name: document.getElementById('rt_name').value.trim(),
    description: document.getElementById('rt_desc').value.trim(),
    base_price: document.getElementById('rt_price').value,
    capacity: document.getElementById('rt_capacity').value || 2
  });
  toast('Room type added');
  openRoomTypeManager();
}

async function saveEditRoomType(id) {
  if (!validate([{ id: 'rt_name', msg: 'Name required' }, { id: 'rt_price', msg: 'Price required' }])) return;
  await RoomTypes.update(id, {
    name: document.getElementById('rt_name').value.trim(),
    description: document.getElementById('rt_desc').value.trim(),
    base_price: document.getElementById('rt_price').value,
    capacity: document.getElementById('rt_capacity').value || 2
  });
  toast('Room type updated');
  openRoomTypeManager();
}

async function deleteRoomType(id) {
  confirmDialog('Delete this room type?', async () => {
    await RoomTypes.delete(id);
    toast('Room type deleted', 'info');
    openRoomTypeManager();
  });
}
