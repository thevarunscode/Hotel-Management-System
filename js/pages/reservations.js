// ===== RESERVATIONS PAGE =====
let resFilter = 'all';

async function renderReservations() {
  const filter = resFilter === 'all' ? {} : { status: resFilter };
  const reservations = await Reservations.all(filter);

  const countAll = (await Reservations.all()).length;
  const countConfirmed = (await Reservations.all({ status: 'confirmed' })).length;
  const countCheckedIn = (await Reservations.all({ status: 'checked_in' })).length;
  const countCheckedOut = (await Reservations.all({ status: 'checked_out' })).length;
  const countCancelled = (await Reservations.all({ status: 'cancelled' })).length;

  const html = `
    <div class="page-header">
      <div class="page-title-group">
        <h1 class="page-title">Reservations</h1>
        <span class="page-subtitle">${reservations.length} records</span>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="openNewReservation()">+ New Reservation</button>
      </div>
    </div>
    <div class="page-body">
      <div class="filter-bar">
        <button class="filter-btn ${resFilter==='all'?'active':''}" onclick="setResFilter('all')">All (${countAll})</button>
        <button class="filter-btn ${resFilter==='confirmed'?'active':''}" onclick="setResFilter('confirmed')">Confirmed (${countConfirmed})</button>
        <button class="filter-btn ${resFilter==='checked_in'?'active':''}" onclick="setResFilter('checked_in')">Checked In (${countCheckedIn})</button>
        <button class="filter-btn ${resFilter==='checked_out'?'active':''}" onclick="setResFilter('checked_out')">Checked Out (${countCheckedOut})</button>
        <button class="filter-btn ${resFilter==='cancelled'?'active':''}" onclick="setResFilter('cancelled')">Cancelled (${countCancelled})</button>
      </div>
      <div class="table-wrapper">
        <div class="table-toolbar">
          <span class="table-title">Reservation List</span>
        </div>
        <table>
          <thead><tr>
            <th>#</th><th>Guest</th><th>Room</th><th>Check In</th><th>Check Out</th><th>Nights</th><th>Total</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${reservations.length === 0 ? `<tr><td colspan="9"><div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-text">No reservations found</div></div></td></tr>` :
              reservations.map(r => {
                const nights = dateDiffDays(r.check_in_date, r.check_out_date);
                const total = nights * r.price_per_night;
                return `
                  <tr>
                    <td style="color:var(--text-muted);font-size:12px">#${r.id}</td>
                    <td>
                      <div style="font-weight:600">${r.first_name} ${r.last_name}</div>
                      <div style="font-size:11px;color:var(--text-muted)">${r.email}</div>
                    </td>
                    <td>Room ${r.room_number} <small style="color:var(--text-muted)">(${r.type_name})</small></td>
                    <td>${formatDate(r.check_in_date)}</td>
                    <td>${formatDate(r.check_out_date)}</td>
                    <td>${nights}</td>
                    <td style="color:var(--gold-400);font-weight:600">${formatCurrency(total)}</td>
                    <td>${statusBadge(r.status)}</td>
                    <td class="td-actions">
                      <button class="btn btn-secondary btn-sm" onclick="openViewReservation(${r.id})">View</button>
                      ${r.status === 'confirmed' ? `<button class="btn btn-success btn-sm" onclick="checkInRes(${r.id})">Check In</button>` : ''}
                      ${r.status === 'checked_in' ? `<button class="btn btn-warning btn-sm" onclick="checkOutRes(${r.id})">Check Out</button>` : ''}
                      ${r.status === 'confirmed' ? `<button class="btn btn-danger btn-sm" onclick="cancelReservation(${r.id})">Cancel</button>` : ''}
                    </td>
                  </tr>
                `;
              }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
  document.getElementById('pageContainer').innerHTML = html;
}

async function setResFilter(f) {
  resFilter = f;
  await renderReservations();
}

async function openNewReservation() {
  const guests = await Guests.all();
  const guestOpts = guests.map(g =>
    `<option value="${g.id}">${g.first_name} ${g.last_name} (${g.email})</option>`
  ).join('');

  openModal('New Reservation', `
    <form id="resForm" onsubmit="return false">
      <div class="form-grid form-grid-2">
        <div class="form-group full">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <label for="rf_guest" style="margin-bottom:0">Guest</label>
            <button class="btn btn-secondary btn-sm" style="padding:2px 8px; font-size:11px;" type="button" onclick="closeModal(); setTimeout(() => { navigateTo('guests'); setTimeout(openAddGuest, 100); }, 100);">+ New Guest</button>
          </div>
          <select id="rf_guest">
            <option value="">-- Select Guest --</option>
            ${guestOpts}
          </select>
          <span class="error-msg" id="rf_guest_err"></span>
        </div>
        <div class="form-group">
          <label for="rf_checkin">Check-in Date</label>
          <input id="rf_checkin" type="date" value="${todayStr()}" onchange="updateAvailableRooms()" />
          <span class="error-msg" id="rf_checkin_err"></span>
        </div>
        <div class="form-group">
          <label for="rf_checkout">Check-out Date</label>
          <input id="rf_checkout" type="date" value="${tomorrowStr()}" onchange="updateAvailableRooms()" />
          <span class="error-msg" id="rf_checkout_err"></span>
        </div>
        <div class="form-group full">
          <label for="rf_room">Available Room</label>
          <select id="rf_room">
            <option value="">-- Select dates first --</option>
          </select>
          <span class="error-msg" id="rf_room_err"></span>
        </div>
        <div class="form-group">
          <label for="rf_adults">Adults</label>
          <input id="rf_adults" type="number" min="1" value="1" />
        </div>
        <div class="form-group">
          <label for="rf_children">Children</label>
          <input id="rf_children" type="number" min="0" value="0" />
        </div>
        <div class="form-group full">
          <label for="rf_requests">Special Requests</label>
          <textarea id="rf_requests" rows="2" placeholder="Any special requests..."></textarea>
        </div>
        <div class="form-group full" id="res_price_preview" style="display:none">
          <div style="background:rgba(212,160,23,0.08);border:1px solid rgba(212,160,23,0.2);border-radius:10px;padding:14px;">
            <div id="res_price_detail" style="font-size:13px;color:var(--text-secondary)"></div>
          </div>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" type="button" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" type="button" onclick="saveNewReservation()">Create Reservation</button>
      </div>
    </form>
  `, 'modal-lg');

  updateAvailableRooms();
}

async function updateAvailableRooms() {
  const ci = document.getElementById('rf_checkin');
  const co = document.getElementById('rf_checkout');
  const roomSel = document.getElementById('rf_room');
  const preview = document.getElementById('res_price_preview');
  const detail = document.getElementById('res_price_detail');

  if (!ci || !co) return;
  const checkIn = ci.value;
  const checkOut = co.value;

  if (!checkIn || !checkOut || checkIn >= checkOut) {
    if (roomSel) {
      roomSel.innerHTML = '<option value="">-- Invalid dates --</option>';
    }
    return;
  }

  const rooms = await Rooms.getAvailable(checkIn, checkOut);
  if (roomSel) {
    roomSel.innerHTML = rooms.length === 0
      ? '<option value="">-- No rooms available --</option>'
      : rooms.map(r => `<option value="${r.id}" data-price="${r.price_per_night}">${r.room_number} - ${r.type_name} (${formatCurrency(r.price_per_night)}/night)</option>`).join('');
  }

  updatePricePreview();
  if (roomSel) roomSel.onchange = updatePricePreview;
}

async function updatePricePreview() {
  const ci = document.getElementById('rf_checkin');
  const co = document.getElementById('rf_checkout');
  const roomSel = document.getElementById('rf_room');
  const preview = document.getElementById('res_price_preview');
  const detail = document.getElementById('res_price_detail');
  if (!ci || !co || !roomSel || !preview || !detail) return;

  const selOpt = roomSel.options[roomSel.selectedIndex];
  const price = selOpt ? parseFloat(selOpt.dataset.price) : 0;
  const nights = dateDiffDays(ci.value, co.value);

  if (price > 0 && nights > 0) {
    const sub = price * nights;
    const tax = sub * 0.12;
    const total = sub + tax;
    preview.style.display = 'block';
    detail.innerHTML = `
      <strong>Price Breakdown</strong><br>
      ${formatCurrency(price)} × ${nights} night${nights>1?'s':''} = ${formatCurrency(sub)}<br>
      Tax (12%) = ${formatCurrency(tax)}<br>
      <strong style="color:var(--gold-400)">Total: ${formatCurrency(total)}</strong>
    `;
  } else {
    preview.style.display = 'none';
  }
}

async function saveNewReservation() {
  if (!validate([
    { id: 'rf_guest', msg: 'Select a guest' },
    { id: 'rf_checkin', msg: 'Check-in date required' },
    { id: 'rf_checkout', msg: 'Check-out date required' },
    { id: 'rf_room', msg: 'Select a room' }
  ])) return;

  const checkIn = document.getElementById('rf_checkin').value;
  const checkOut = document.getElementById('rf_checkout').value;
  if (checkIn >= checkOut) {
    toast('Check-out must be after check-in', 'error');
    return;
  }

  await Reservations.create({
    guest_id: document.getElementById('rf_guest').value,
    room_id: document.getElementById('rf_room').value,
    check_in_date: checkIn,
    check_out_date: checkOut,
    adults: document.getElementById('rf_adults').value || 1,
    children: document.getElementById('rf_children').value || 0,
    special_requests: document.getElementById('rf_requests').value.trim()
  });

  closeModal();
  toast('Reservation created successfully');
  await renderReservations();
}

async function openViewReservation(id) {
  const r = await Reservations.get(id);
  if (!r) return;
  const nights = dateDiffDays(r.check_in_date, r.check_out_date);
  const inv = await Invoices.getByReservation(id);

  openModal(`Reservation #${r.id}`, `
    <div style="display:flex;flex-direction:column;gap:18px">
      <div class="invoice-meta">
        <div class="invoice-meta-item"><label>Guest</label><span>${r.first_name} ${r.last_name}</span></div>
        <div class="invoice-meta-item"><label>Room</label><span>Room ${r.room_number} (${r.type_name})</span></div>
        <div class="invoice-meta-item"><label>Check In</label><span>${formatDate(r.check_in_date)}</span></div>
        <div class="invoice-meta-item"><label>Check Out</label><span>${formatDate(r.check_out_date)}</span></div>
        <div class="invoice-meta-item"><label>Nights</label><span>${nights}</span></div>
        <div class="invoice-meta-item"><label>Guests</label><span>${r.adults} adult${r.adults>1?'s':''} + ${r.children} children</span></div>
        <div class="invoice-meta-item"><label>Rate/Night</label><span>${formatCurrency(r.price_per_night)}</span></div>
        <div class="invoice-meta-item"><label>Status</label><span>${statusBadge(r.status)}</span></div>
      </div>
      ${r.special_requests ? `<div style="padding:12px;background:rgba(255,255,255,0.04);border-radius:8px;font-size:13px;color:var(--text-secondary)"><strong>Special Requests:</strong> ${r.special_requests}</div>` : ''}
      ${inv ? `<div style="background:rgba(212,160,23,0.06);border:1px solid rgba(212,160,23,0.15);border-radius:10px;padding:14px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:13px">Invoice Total</span>
        <span style="font-family:'Playfair Display',serif;font-size:22px;color:var(--gold-400);font-weight:700">${formatCurrency(inv.total)}</span>
      </div>` : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${r.status==='confirmed'?`<button class="btn btn-success btn-sm" onclick="checkInRes(${r.id});closeModal()">Check In</button>`:''}
        ${r.status==='checked_in'?`<button class="btn btn-warning btn-sm" onclick="checkOutRes(${r.id});closeModal()">Check Out</button>`:''}
        ${inv?`<button class="btn btn-secondary btn-sm" onclick="closeModal();navigateTo('invoices')">View Invoice</button>`:''}
        ${r.status==='confirmed'?`<button class="btn btn-danger btn-sm" onclick="cancelReservation(${r.id});closeModal()">Cancel</button>`:''}
      </div>
    </div>
  `, 'modal-lg');
}

async function checkInRes(id) {
  const r = await Reservations.get(id);
  await Reservations.updateStatus(id, 'checked_in');
  await Rooms.updateStatus(r.room_id, 'occupied');
  toast(`${r.first_name} ${r.last_name} checked in to Room ${r.room_number}`);
  await renderReservations();
}

async function checkOutRes(id) {
  const r = await Reservations.get(id);
  await Reservations.updateStatus(id, 'checked_out');
  await Rooms.updateStatus(r.room_id, 'available');
  toast(`${r.first_name} ${r.last_name} checked out`, 'info');
  await renderReservations();
}

async function cancelReservation(id) {
  confirmDialog('Cancel this reservation?', async () => {
    const r = await Reservations.get(id);
    await Reservations.updateStatus(id, 'cancelled');
    if (r.status !== 'checked_in') await Rooms.updateStatus(r.room_id, 'available');
    toast('Reservation cancelled', 'warning');
    await renderReservations();
  });
}
