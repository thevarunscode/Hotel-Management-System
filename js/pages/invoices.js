// ===== INVOICES PAGE =====
let invFilter = 'all';

async function renderInvoices() {
  const filter = invFilter === 'all' ? {} : { status: invFilter };
  const invoices = await Invoices.all(filter);
  const stats = await Invoices.stats();

  const html = `
    <div class="page-header">
      <div class="page-title-group">
        <h1 class="page-title">Invoices</h1>
        <span class="page-subtitle">${invoices.length} invoices</span>
      </div>
    </div>
    <div class="page-body">
      <div class="stats-grid" style="margin-bottom:24px">
        <div class="stat-card">
          <div class="stat-icon gold">💵</div>
          <div class="stat-info">
            <div class="stat-value">${formatCurrency(stats.total_revenue || 0)}</div>
            <div class="stat-label">Total Billed</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">✅</div>
          <div class="stat-info">
            <div class="stat-value">${formatCurrency(stats.paid_revenue || 0)}</div>
            <div class="stat-label">Collected</div>
            <div class="stat-change up">${stats.paid_count || 0} paid</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon red">⏳</div>
          <div class="stat-info">
            <div class="stat-value">${formatCurrency(stats.pending_revenue || 0)}</div>
            <div class="stat-label">Outstanding</div>
            <div class="stat-change down">${stats.unpaid_count || 0} unpaid</div>
          </div>
        </div>
      </div>

      <div class="filter-bar" style="margin-bottom:16px">
        <button class="filter-btn ${invFilter==='all'?'active':''}" onclick="setInvFilter('all')">All (${stats.total_invoices || 0})</button>
        <button class="filter-btn ${invFilter==='unpaid'?'active':''}" onclick="setInvFilter('unpaid')">Unpaid (${stats.unpaid_count || 0})</button>
        <button class="filter-btn ${invFilter==='paid'?'active':''}" onclick="setInvFilter('paid')">Paid (${stats.paid_count || 0})</button>
      </div>

      <div class="table-wrapper">
        <table>
          <thead><tr>
            <th>Invoice #</th><th>Guest</th><th>Room</th><th>Stay Period</th><th>Subtotal</th><th>Tax</th><th>Total</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${invoices.length === 0 ? `<tr><td colspan="9"><div class="empty-state"><div class="empty-state-icon">🧾</div><div class="empty-state-text">No invoices found</div></div></td></tr>` :
              invoices.map(inv => `
                <tr>
                  <td style="color:var(--text-muted);font-size:12px">INV-${String(inv.id).padStart(4,'0')}</td>
                  <td><strong>${inv.first_name} ${inv.last_name}</strong></td>
                  <td>Room ${inv.room_number}</td>
                  <td style="font-size:12px">${formatDate(inv.check_in_date)} → ${formatDate(inv.check_out_date)}</td>
                  <td>${formatCurrency(inv.subtotal)}</td>
                  <td style="color:var(--text-muted)">${formatCurrency(inv.tax_amount)}</td>
                  <td style="color:var(--gold-400);font-weight:700">${formatCurrency(inv.total)}</td>
                  <td>${statusBadge(inv.status)}</td>
                  <td class="td-actions">
                    <button class="btn btn-secondary btn-sm" onclick="openViewInvoice(${inv.id})">View</button>
                    ${inv.status === 'unpaid' ? `<button class="btn btn-success btn-sm" onclick="markPaid(${inv.id})">Mark Paid</button>` : ''}
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

async function setInvFilter(f) {
  invFilter = f;
  await renderInvoices();
}

async function openViewInvoice(id) {
  const inv = await Invoices.get(id);
  if (!inv) return;
  const items = inv.items || [];
  const nights = dateDiffDays(inv.check_in_date, inv.check_out_date);

  const itemRows = items.map(item => `
    <tr>
      <td>${item.description}</td>
      <td style="text-align:center">${item.quantity}</td>
      <td>${formatCurrency(item.unit_price)}</td>
      <td style="text-align:right;font-weight:600">${formatCurrency(item.total)}</td>
      <td style="text-align:right">
        <button class="btn btn-danger btn-sm" onclick="removeInvItem(${item.id},${id})">✕</button>
      </td>
    </tr>
  `).join('');

  openModal(`Invoice INV-${String(id).padStart(4,'0')}`, `
    <div class="invoice-detail">
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-family:'Playfair Display',serif;font-size:22px;color:var(--gold-400)">LuxeStay</div>
          <div style="font-size:11px;color:var(--text-secondary)">Grand LuxeStay Hotel</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:14px;font-weight:600">INV-${String(id).padStart(4,'0')}</div>
          <div style="font-size:11px;color:var(--text-secondary)">${formatDate(inv.created_at)}</div>
          <div style="margin-top:6px">${statusBadge(inv.status)}</div>
        </div>
      </div>

      <!-- Guest + Room Info -->
      <div class="invoice-meta">
        <div class="invoice-meta-item"><label>Guest</label><span>${inv.first_name} ${inv.last_name}</span></div>
        <div class="invoice-meta-item"><label>Room</label><span>Room ${inv.room_number} (${inv.type_name})</span></div>
        <div class="invoice-meta-item"><label>Email</label><span>${inv.email}</span></div>
        <div class="invoice-meta-item"><label>Phone</label><span>${inv.phone}</span></div>
        <div class="invoice-meta-item"><label>Check In</label><span>${formatDate(inv.check_in_date)}</span></div>
        <div class="invoice-meta-item"><label>Check Out</label><span>${formatDate(inv.check_out_date)}</span></div>
      </div>

      <!-- Line Items -->
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div class="card-title" style="margin-bottom:0">Items</div>
          <button class="btn btn-secondary btn-sm" onclick="openAddInvItem(${id})">+ Add Item</button>
        </div>
        <table class="invoice-items-table">
          <thead><tr><th>Description</th><th style="text-align:center">Qty</th><th>Unit Price</th><th style="text-align:right">Total</th><th></th></tr></thead>
          <tbody id="invItemsBody_${id}">
            ${itemRows}
          </tbody>
        </table>
      </div>

      <!-- Totals -->
      <div>
        <div class="info-pair"><span class="lbl">Subtotal</span><span class="val">${formatCurrency(inv.subtotal)}</span></div>
        <div class="info-pair"><span class="lbl">Tax (12%)</span><span class="val">${formatCurrency(inv.tax_amount)}</span></div>
      </div>
      <div class="invoice-total">
        <span class="invoice-total-label">Total Due</span>
        <span class="invoice-total-value">${formatCurrency(inv.total)}</span>
      </div>

      ${inv.status === 'paid' && inv.paid_at ? `<div style="text-align:center;font-size:12px;color:var(--success)">✓ Paid on ${formatDate(inv.paid_at)}</div>` : ''}

      <!-- Actions -->
      <div class="form-actions" style="margin-top:0;padding-top:0;border-top:none">
        <button class="btn btn-secondary" onclick="closeModal()">Close</button>
        ${inv.status==='unpaid' ? `<button class="btn btn-success" onclick="markPaid(${id})">Mark as Paid</button>` : ''}
      </div>
    </div>
  `, 'modal-lg');
}

async function openAddInvItem(invId) {
  openModal('Add Invoice Item', `
    <form onsubmit="return false">
      <div class="form-grid">
        <div class="form-group">
          <label for="ii_desc">Description</label>
          <input id="ii_desc" placeholder="e.g. Room Service" />
          <span class="error-msg" id="ii_desc_err"></span>
        </div>
        <div class="form-grid form-grid-2">
          <div class="form-group">
            <label for="ii_qty">Quantity</label>
            <input id="ii_qty" type="number" min="1" value="1" />
          </div>
          <div class="form-group">
            <label for="ii_price">Unit Price ($)</label>
            <input id="ii_price" type="number" step="0.01" min="0" placeholder="0.00" />
            <span class="error-msg" id="ii_price_err"></span>
          </div>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" type="button" onclick="openViewInvoice(${invId})">Back</button>
        <button class="btn btn-primary" type="button" onclick="saveInvItem(${invId})">Add Item</button>
      </div>
    </form>
  `);
}

async function saveInvItem(invId) {
  if (!validate([
    { id: 'ii_desc', msg: 'Description required' },
    { id: 'ii_price', msg: 'Price required' }
  ])) return;
  await Invoices.addItem(invId, {
    description: document.getElementById('ii_desc').value.trim(),
    quantity: parseInt(document.getElementById('ii_qty').value) || 1,
    unit_price: parseFloat(document.getElementById('ii_price').value)
  });
  toast('Item added to invoice');
  openViewInvoice(invId);
}

async function removeInvItem(itemId, invId) {
  await Invoices.removeItem(itemId, invId);
  toast('Item removed', 'info');
  openViewInvoice(invId);
}

async function markPaid(id) {
  await Invoices.markPaid(id);
  toast('Invoice marked as paid ✓');
  closeModal();
  await renderInvoices();
}
