// ===== CHECK IN / CHECK OUT PAGE =====
async function renderCheckinOut() {
  const arrivals = await Reservations.todayArrivals();
  const departures = await Reservations.todayDepartures();
  const checkedIn = await Reservations.currentlyCheckedIn();
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const html = `
    <div class="page-header">
      <div class="page-title-group">
        <h1 class="page-title">Check In / Check Out</h1>
        <span class="page-subtitle">${today}</span>
      </div>
      <div class="page-actions">
        <div style="display:flex;gap:12px">
          <div style="text-align:center">
            <div style="font-family:'Playfair Display',serif;font-size:24px;color:var(--success)">${arrivals.length}</div>
            <div style="font-size:11px;color:var(--text-secondary)">Arrivals</div>
          </div>
          <div style="width:1px;background:rgba(255,255,255,0.1)"></div>
          <div style="text-align:center">
            <div style="font-family:'Playfair Display',serif;font-size:24px;color:var(--warning)">${departures.length}</div>
            <div style="font-size:11px;color:var(--text-secondary)">Departures</div>
          </div>
          <div style="width:1px;background:rgba(255,255,255,0.1)"></div>
          <div style="text-align:center">
            <div style="font-family:'Playfair Display',serif;font-size:24px;color:var(--info)">${checkedIn.length}</div>
            <div style="font-size:11px;color:var(--text-secondary)">In-House</div>
          </div>
        </div>
      </div>
    </div>
    <div class="page-body">
      <div class="checkin-grid">
        <!-- Today's Check-Ins -->
        <div class="checkin-panel">
          <div class="checkin-panel-header">
            <span class="checkin-panel-icon">🛬</span>
            <span class="checkin-panel-title">Today's Arrivals</span>
            <span class="checkin-panel-count">${arrivals.length}</span>
          </div>
          <div class="checkin-list">
            ${arrivals.length === 0 ?
              `<div class="empty-state"><div class="empty-state-icon">✅</div><div class="empty-state-text">All arrivals processed</div></div>` :
              arrivals.map(r => `
                <div class="checkin-item">
                  <div class="checkin-item-info">
                    <div class="checkin-item-name">${r.first_name} ${r.last_name}</div>
                    <div class="checkin-item-detail">
                      Room ${r.room_number} &nbsp;·&nbsp; Until ${formatDate(r.check_out_date)}
                    </div>
                    ${r.special_requests ? `<div style="font-size:11px;color:var(--warning);margin-top:3px">📝 ${r.special_requests}</div>` : ''}
                  </div>
                  <button class="btn btn-success btn-sm" onclick="doCheckin(${r.id})">Check In</button>
                </div>
              `).join('')}
          </div>
        </div>

        <!-- Today's Check-Outs -->
        <div class="checkin-panel">
          <div class="checkin-panel-header">
            <span class="checkin-panel-icon">🛫</span>
            <span class="checkin-panel-title">Today's Departures</span>
            <span class="checkin-panel-count">${departures.length}</span>
          </div>
          <div class="checkin-list">
            ${departures.length === 0 ?
              `<div class="empty-state"><div class="empty-state-icon">✅</div><div class="empty-state-text">All departures processed</div></div>` :
              departures.map(r => `
                <div class="checkin-item">
                  <div class="checkin-item-info">
                    <div class="checkin-item-name">${r.first_name} ${r.last_name}</div>
                    <div class="checkin-item-detail">
                      Room ${r.room_number} &nbsp;·&nbsp; Since ${formatDate(r.check_in_date)}
                    </div>
                  </div>
                  <button class="btn btn-warning btn-sm" onclick="doCheckout(${r.id})">Check Out</button>
                </div>
              `).join('')}
          </div>
        </div>
      </div>

      <!-- Currently In-House -->
      <div style="margin-top:24px">
        <div class="table-wrapper">
          <div class="table-toolbar">
            <span class="table-title">Currently In-House (${checkedIn.length})</span>
          </div>
          <table>
            <thead><tr>
              <th>Guest</th><th>Room</th><th>Type</th><th>Check In</th><th>Check Out</th><th>Duration</th><th>Action</th>
            </tr></thead>
            <tbody>
              ${checkedIn.length === 0 ?
                `<tr><td colspan="7"><div class="empty-state"><div class="empty-state-icon">🏨</div><div class="empty-state-text">No guests currently checked in</div></div></td></tr>` :
                checkedIn.map(r => {
                  const nights = dateDiffDays(r.check_in_date, new Date().toISOString().split('T')[0]);
                  return `<tr>
                    <td>
                      <div style="display:flex;align-items:center;gap:10px">
                        <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--navy-600),var(--navy-500));display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--gold-400);flex-shrink:0">${initials(r.first_name, r.last_name)}</div>
                        <strong>${r.first_name} ${r.last_name}</strong>
                      </div>
                    </td>
                    <td>Room ${r.room_number}</td>
                    <td>${typeBadge(r.type_name)}</td>
                    <td>${formatDate(r.check_in_date)}</td>
                    <td>${formatDate(r.check_out_date)}</td>
                    <td>${nights} night${nights !== 1 ? 's' : ''} so far</td>
                    <td>
                      <button class="btn btn-warning btn-sm" onclick="doCheckout(${r.id})">Check Out</button>
                    </td>
                  </tr>`;
                }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.getElementById('pageContainer').innerHTML = html;
}

async function doCheckin(resId) {
  const r = await Reservations.get(resId);
  if (!r) return;
  await Reservations.updateStatus(resId, 'checked_in');
  await Rooms.updateStatus(r.room_id, 'occupied');
  toast(`✓ ${r.first_name} ${r.last_name} checked in — Room ${r.room_number}`);
  await renderCheckinOut();
}

async function doCheckout(resId) {
  const r = await Reservations.get(resId);
  if (!r) return;
  const inv = await Invoices.getByReservation(resId);

  const unpaidMsg = inv && inv.status === 'unpaid'
    ? `<div style="background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:12px;margin-bottom:16px;font-size:13px;color:#f87171">⚠️ Outstanding invoice of <strong>${formatCurrency(inv.total)}</strong> — please collect payment.</div>`
    : '';

  openModal('Confirm Check Out', `
    <div>
      ${unpaidMsg}
      <div class="invoice-meta" style="margin-bottom:20px">
        <div class="invoice-meta-item"><label>Guest</label><span>${r.first_name} ${r.last_name}</span></div>
        <div class="invoice-meta-item"><label>Room</label><span>Room ${r.room_number}</span></div>
        <div class="invoice-meta-item"><label>Checked In</label><span>${formatDate(r.check_in_date)}</span></div>
        <div class="invoice-meta-item"><label>Checking Out</label><span>${formatDate(r.check_out_date)}</span></div>
      </div>
      <div class="form-actions" style="margin-top:0">
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        ${inv && inv.status==='unpaid' ? `<button class="btn btn-success" onclick="markInvPaidAndCheckout(${resId},${inv.id})">Collect & Check Out</button>` : ''}
        <button class="btn btn-warning" onclick="confirmCheckout(${resId})">Check Out</button>
      </div>
    </div>
  `);
}

async function confirmCheckout(resId) {
  const r = await Reservations.get(resId);
  await Reservations.updateStatus(resId, 'checked_out');
  await Rooms.updateStatus(r.room_id, 'available');
  closeModal();
  toast(`${r.first_name} ${r.last_name} checked out from Room ${r.room_number}`, 'info');
  await renderCheckinOut();
}

async function markInvPaidAndCheckout(resId, invId) {
  await Invoices.markPaid(invId);
  confirmCheckout(resId);
  toast('Invoice marked as paid', 'success');
}
