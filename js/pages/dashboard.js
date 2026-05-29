// ===== DASHBOARD PAGE =====
async function renderDashboard() {
  const stats = await Dashboard.stats();
  const { rooms, invoices } = stats;
  const occupancyRate = rooms.total ? Math.round((rooms.occupied / rooms.total) * 100) : 0;
  const recentReservations = (await Reservations.all()).slice(0, 5);
  const todayArrivals = await Reservations.todayArrivals();
  const todayDepartures = await Reservations.todayDepartures();
  const checkedIn = await Reservations.currentlyCheckedIn();

  const html = `
    <div class="page-header">
      <div class="page-title-group">
        <h1 class="page-title">Dashboard</h1>
        <span class="page-subtitle">Welcome back — here's what's happening today</span>
      </div>
      <div class="page-actions">
        <span style="font-size:12px;color:var(--text-secondary)">${new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</span>
      </div>
    </div>
    <div class="page-body">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon gold">🏨</div>
          <div class="stat-info">
            <div class="stat-value">${rooms.total || 0}</div>
            <div class="stat-label">Total Rooms</div>
            <div class="stat-change up">↑ ${rooms.available || 0} available now</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon red">🛏</div>
          <div class="stat-info">
            <div class="stat-value">${occupancyRate}%</div>
            <div class="stat-label">Occupancy Rate</div>
            <div class="stat-change">${rooms.occupied || 0} occupied · ${rooms.reserved || 0} reserved</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">💰</div>
          <div class="stat-info">
            <div class="stat-value">${formatCurrency(invoices.paid_revenue || 0)}</div>
            <div class="stat-label">Revenue Collected</div>
            <div class="stat-change up">↑ ${invoices.paid_count || 0} paid invoices</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue">📋</div>
          <div class="stat-info">
            <div class="stat-value">${stats.arrivals}</div>
            <div class="stat-label">Today's Arrivals</div>
            <div class="stat-change">${stats.departures} departures today</div>
          </div>
        </div>
      </div>

      <div class="dashboard-grid">
        <!-- Occupancy Breakdown -->
        <div class="card">
          <div class="card-title">Room Occupancy</div>
          <div class="occupancy-bar-wrapper">
            ${buildOccBar('Occupied', rooms.occupied || 0, rooms.total || 1, '')}
            ${buildOccBar('Available', rooms.available || 0, rooms.total || 1, 'green')}
            ${buildOccBar('Reserved', rooms.reserved || 0, rooms.total || 1, 'blue')}
            ${buildOccBar('Maintenance', rooms.maintenance || 0, rooms.total || 1, '')}
          </div>
          <div style="margin-top:16px;display:flex;gap:12px;flex-wrap:wrap">
            ${statusBadge('available')} <span style="font-size:12px;color:var(--text-secondary)">${rooms.available || 0}</span>
            &nbsp;${statusBadge('occupied')} <span style="font-size:12px;color:var(--text-secondary)">${rooms.occupied || 0}</span>
            &nbsp;${statusBadge('reserved')} <span style="font-size:12px;color:var(--text-secondary)">${rooms.reserved || 0}</span>
            &nbsp;${statusBadge('maintenance')} <span style="font-size:12px;color:var(--text-secondary)">${rooms.maintenance || 0}</span>
          </div>
        </div>

        <!-- Revenue Summary -->
        <div class="card">
          <div class="card-title">Revenue Overview</div>
          <div class="info-pair">
            <span class="lbl">Total Billed</span>
            <span class="val">${formatCurrency(invoices.total_revenue || 0)}</span>
          </div>
          <div class="info-pair">
            <span class="lbl">Collected</span>
            <span class="val" style="color:var(--success)">${formatCurrency(invoices.paid_revenue || 0)}</span>
          </div>
          <div class="info-pair">
            <span class="lbl">Pending</span>
            <span class="val" style="color:var(--warning)">${formatCurrency(invoices.pending_revenue || 0)}</span>
          </div>
          <div class="info-pair">
            <span class="lbl">Total Invoices</span>
            <span class="val">${invoices.total_invoices || 0}</span>
          </div>
          <div class="info-pair">
            <span class="lbl">Today's Arrivals</span>
            <span class="val" style="color:var(--info)">${stats.arrivals}</span>
          </div>
          <div class="info-pair">
            <span class="lbl">Today's Departures</span>
            <span class="val" style="color:var(--warning)">${stats.departures}</span>
          </div>
        </div>

        <!-- Today's Activity -->
        <div class="card">
          <div class="card-title">Today's Arrivals</div>
          ${todayArrivals.length === 0 ? `<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">No arrivals today</div></div>` :
            `<div class="activity-list">${todayArrivals.map(r => `
              <div class="activity-item">
                <div class="activity-avatar">${initials(r.first_name, r.last_name)}</div>
                <div class="activity-info">
                  <div class="activity-name">${r.first_name} ${r.last_name}</div>
                  <div class="activity-detail">Room ${r.room_number}</div>
                </div>
                <button class="btn btn-success btn-sm" onclick="performCheckin(${r.id})">Check In</button>
              </div>`).join('')}
            </div>`}
        </div>

        <!-- Today's Departures -->
        <div class="card">
          <div class="card-title">Today's Departures</div>
          ${todayDepartures.length === 0 ? `<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">No departures today</div></div>` :
            `<div class="activity-list">${todayDepartures.map(r => `
              <div class="activity-item">
                <div class="activity-avatar">${initials(r.first_name, r.last_name)}</div>
                <div class="activity-info">
                  <div class="activity-name">${r.first_name} ${r.last_name}</div>
                  <div class="activity-detail">Room ${r.room_number}</div>
                </div>
                <button class="btn btn-warning btn-sm" onclick="performCheckout(${r.id})">Check Out</button>
              </div>`).join('')}
            </div>`}
        </div>

        <!-- Recent Reservations -->
        <div class="card full">
          <div class="card-title">Recent Reservations</div>
          <table>
            <thead><tr>
              <th>Guest</th><th>Room</th><th>Check In</th><th>Check Out</th><th>Status</th>
            </tr></thead>
            <tbody>
              ${recentReservations.length === 0 ?
                `<tr><td colspan="5"><div class="empty-state"><span class="empty-state-text">No reservations yet</span></div></td></tr>` :
                recentReservations.map(r => `<tr>
                  <td><strong>${r.first_name} ${r.last_name}</strong></td>
                  <td>Room ${r.room_number} <small style="color:var(--text-muted)">(${r.type_name})</small></td>
                  <td>${formatDate(r.check_in_date)}</td>
                  <td>${formatDate(r.check_out_date)}</td>
                  <td>${statusBadge(r.status)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.getElementById('pageContainer').innerHTML = html;
}

function buildOccBar(label, val, total, cls) {
  const pct = total ? Math.round((val / total) * 100) : 0;
  return `<div class="occ-row">
    <span class="occ-label">${label}</span>
    <div class="occ-bar-bg"><div class="occ-bar-fill ${cls}" style="width:${pct}%"></div></div>
    <span class="occ-val">${pct}%</span>
  </div>`;
}

// Quick actions from dashboard
async function performCheckin(resId) {
  await Reservations.updateStatus(resId, 'checked_in');
  const res = await Reservations.get(resId);
  await Rooms.updateStatus(res.room_id, 'occupied');
  toast(`${res.first_name} ${res.last_name} checked in to Room ${res.room_number}`);
  await renderDashboard();
}

async function performCheckout(resId) {
  await Reservations.updateStatus(resId, 'checked_out');
  const res = await Reservations.get(resId);
  await Rooms.updateStatus(res.room_id, 'available');
  toast(`${res.first_name} ${res.last_name} checked out from Room ${res.room_number}`, 'info');
  await renderDashboard();
}
