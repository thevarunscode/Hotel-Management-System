// ===== GUESTS PAGE =====
let guestSearch = '';

async function renderGuests() {
  const guests = await Guests.all(guestSearch);
  const html = `
    <div class="page-header">
      <div class="page-title-group">
        <h1 class="page-title">Guests</h1>
        <span class="page-subtitle">${guests.length} guest records</span>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="openAddGuest()">+ Add Guest</button>
      </div>
    </div>
    <div class="page-body">
      <div class="table-wrapper">
        <div class="table-toolbar">
          <span class="table-title">All Guests</span>
          <div style="display:flex;gap:10px;align-items:center">
            <div class="search-box">
              <span>🔍</span>
              <input id="guestSearchInput" placeholder="Search by name, email, phone..." value="${guestSearch}"
                oninput="guestSearchFilter(this.value)" />
            </div>
          </div>
        </div>
        <table>
          <thead><tr>
            <th>Guest</th><th>Email</th><th>Phone</th><th>ID Type</th><th>Nationality</th><th>Since</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${guests.length === 0 ? `<tr><td colspan="7"><div class="empty-state"><div class="empty-state-icon">👤</div><div class="empty-state-text">No guests found</div></div></td></tr>` :
              guests.map(g => `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px">
                      <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--navy-600),var(--navy-500));display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;color:var(--gold-400);flex-shrink:0;border:1px solid rgba(212,160,23,0.2)">${initials(g.first_name, g.last_name)}</div>
                      <div>
                        <div style="font-weight:600">${g.first_name} ${g.last_name}</div>
                        <div style="font-size:11px;color:var(--text-muted)">${g.address || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td>${g.email}</td>
                  <td>${g.phone}</td>
                  <td><span style="text-transform:capitalize">${g.id_type}</span>: <code style="font-size:11px;color:var(--text-secondary)">${g.id_number}</code></td>
                  <td>${g.nationality || '—'}</td>
                  <td>${formatDate(g.created_at)}</td>
                  <td class="td-actions">
                    <button class="btn btn-secondary btn-sm" onclick="openViewGuest(${g.id})">View</button>
                    <button class="btn btn-secondary btn-sm" onclick="openEditGuest(${g.id})">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteGuest(${g.id})">Delete</button>
                  </td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
  document.getElementById('pageContainer').innerHTML = html;
}

async function guestSearchFilter(val) {
  guestSearch = val;
  await renderGuests();
}

function guestFormHTML(guest = null) {
  const g = guest || {};
  const idTypes = ['passport', 'national_id', 'drivers_license', 'aadhaar'].map(t =>
    `<option value="${t}" ${(g.id_type||'passport')===t?'selected':''}>${t.replace('_',' ').replace(/\b\w/g, c=>c.toUpperCase())}</option>`
  ).join('');
  return `
    <form id="guestForm" onsubmit="return false">
      <div class="form-grid form-grid-2">
        <div class="form-group">
          <label for="gf_first">First Name</label>
          <input id="gf_first" placeholder="John" value="${g.first_name||''}" />
          <span class="error-msg" id="gf_first_err"></span>
        </div>
        <div class="form-group">
          <label for="gf_last">Last Name</label>
          <input id="gf_last" placeholder="Doe" value="${g.last_name||''}" />
          <span class="error-msg" id="gf_last_err"></span>
        </div>
        <div class="form-group">
          <label for="gf_email">Email</label>
          <input id="gf_email" type="email" placeholder="john@email.com" value="${g.email||''}" />
          <span class="error-msg" id="gf_email_err"></span>
        </div>
        <div class="form-group">
          <label for="gf_phone">Phone</label>
          <input id="gf_phone" placeholder="+1-555-0100" value="${g.phone||''}" />
          <span class="error-msg" id="gf_phone_err"></span>
        </div>
        <div class="form-group">
          <label for="gf_idtype">ID Type</label>
          <select id="gf_idtype">${idTypes}</select>
        </div>
        <div class="form-group">
          <label for="gf_idnum">ID Number</label>
          <input id="gf_idnum" placeholder="ID Number" value="${g.id_number||''}" />
          <span class="error-msg" id="gf_idnum_err"></span>
        </div>
        <div class="form-group">
          <label for="gf_nationality">Nationality</label>
          <input id="gf_nationality" placeholder="e.g. American" value="${g.nationality||''}" />
        </div>
        <div class="form-group">
          <label for="gf_address">Address</label>
          <input id="gf_address" placeholder="Street, City, Country" value="${g.address||''}" />
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" type="button" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" type="button" onclick="${guest ? `saveEditGuest(${guest.id})` : 'saveNewGuest()'}">
          ${guest ? 'Save Changes' : 'Add Guest'}
        </button>
      </div>
    </form>
  `;
}

function getGuestFormData() {
  return {
    first_name: document.getElementById('gf_first').value.trim(),
    last_name: document.getElementById('gf_last').value.trim(),
    email: document.getElementById('gf_email').value.trim(),
    phone: document.getElementById('gf_phone').value.trim(),
    id_type: document.getElementById('gf_idtype').value,
    id_number: document.getElementById('gf_idnum').value.trim(),
    nationality: document.getElementById('gf_nationality').value.trim(),
    address: document.getElementById('gf_address').value.trim()
  };
}

function validateGuestForm() {
  return validate([
    { id: 'gf_first', msg: 'First name required' },
    { id: 'gf_last', msg: 'Last name required' },
    { id: 'gf_email', msg: 'Email required' },
    { id: 'gf_phone', msg: 'Phone required' },
    { id: 'gf_idnum', msg: 'ID number required' }
  ]);
}

async function openAddGuest() { openModal('Add New Guest', guestFormHTML()); }
async function openEditGuest(id) { openModal('Edit Guest', guestFormHTML(await Guests.get(id))); }

async function openViewGuest(id) {
  const g = await Guests.get(id);
  const reservations = (await Reservations.all()).filter(r => r.guest_id == id);
  const resRows = reservations.map(r => `
    <tr>
      <td>Room ${r.room_number}</td>
      <td>${formatDate(r.check_in_date)}</td>
      <td>${formatDate(r.check_out_date)}</td>
      <td>${statusBadge(r.status)}</td>
    </tr>
  `).join('');

  openModal(`${g.first_name} ${g.last_name}`, `
    <div style="display:flex;flex-direction:column;gap:20px">
      <div style="display:flex;align-items:center;gap:16px">
        <div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,var(--navy-600),var(--navy-500));display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:var(--gold-400);border:2px solid rgba(212,160,23,0.3)">${initials(g.first_name, g.last_name)}</div>
        <div>
          <div style="font-size:20px;font-weight:700">${g.first_name} ${g.last_name}</div>
          <div style="font-size:12px;color:var(--text-secondary)">${g.nationality || ''}</div>
        </div>
      </div>
      <div class="invoice-meta">
        <div class="invoice-meta-item"><label>Email</label><span>${g.email}</span></div>
        <div class="invoice-meta-item"><label>Phone</label><span>${g.phone}</span></div>
        <div class="invoice-meta-item"><label>ID Type</label><span style="text-transform:capitalize">${g.id_type}</span></div>
        <div class="invoice-meta-item"><label>ID Number</label><span>${g.id_number}</span></div>
        <div class="invoice-meta-item"><label>Address</label><span>${g.address || '—'}</span></div>
        <div class="invoice-meta-item"><label>Guest Since</label><span>${formatDate(g.created_at)}</span></div>
      </div>
      ${reservations.length > 0 ? `
        <div>
          <div class="card-title" style="margin-bottom:12px">Reservation History</div>
          <table>
            <thead><tr><th>Room</th><th>Check In</th><th>Check Out</th><th>Status</th></tr></thead>
            <tbody>${resRows}</tbody>
          </table>
        </div>
      ` : ''}
    </div>
  `, 'modal-lg');
}

async function saveNewGuest() {
  if (!validateGuestForm()) return;
  await Guests.create(getGuestFormData());
  closeModal();
  toast('Guest added successfully');
  await renderGuests();
}

async function saveEditGuest(id) {
  if (!validateGuestForm()) return;
  await Guests.update(id, getGuestFormData());
  closeModal();
  toast('Guest updated');
  await renderGuests();
}

async function deleteGuest(id) {
  confirmDialog('Delete this guest record? Related reservations will remain.', async () => {
    await Guests.delete(id);
    toast('Guest deleted', 'info');
    await renderGuests();
  });
}
