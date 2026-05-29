// ===== UTILITY FUNCTIONS =====

function toast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  el.innerHTML = `<span style="font-size:16px">${icons[type] || '✓'}</span><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

function openModal(title, bodyHTML, cls = '') {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  const modal = document.getElementById('modal');
  modal.className = 'modal ' + cls;
  document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
}

function confirmDialog(message, onConfirm) {
  openModal('Confirm Action', `
    <div class="confirm-body">
      <div class="confirm-icon">⚠️</div>
      <p class="confirm-msg">${message}</p>
      <div class="confirm-actions">
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-danger" id="confirmBtn">Confirm</button>
      </div>
    </div>
  `);
  document.getElementById('confirmBtn').onclick = () => {
    closeModal();
    onConfirm();
  };
}

function formatCurrency(amount) {
  return '$' + Number(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateInput(dateStr) {
  if (!dateStr) return '';
  return dateStr.split('T')[0];
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function tomorrowStr() {
  return new Date(Date.now() + 86400000).toISOString().split('T')[0];
}

function initials(first, last) {
  return ((first || '')[0] || '') + ((last || '')[0] || '');
}

function statusBadge(status) {
  const map = {
    available: 'badge-available',
    occupied: 'badge-occupied',
    reserved: 'badge-reserved',
    maintenance: 'badge-maintenance',
    confirmed: 'badge-confirmed',
    checked_in: 'badge-checkedin',
    checked_out: 'badge-checkedout',
    cancelled: 'badge-cancelled',
    pending: 'badge-pending',
    paid: 'badge-paid',
    unpaid: 'badge-unpaid',
  };
  const labels = {
    available: 'Available', occupied: 'Occupied', reserved: 'Reserved',
    maintenance: 'Maintenance', confirmed: 'Confirmed',
    checked_in: 'Checked In', checked_out: 'Checked Out',
    cancelled: 'Cancelled', pending: 'Pending', paid: 'Paid', unpaid: 'Unpaid'
  };
  return `<span class="badge ${map[status] || ''}">${labels[status] || status}</span>`;
}

function typeBadge(typeName) {
  const map = {
    'Standard': 'badge-standard',
    'Deluxe': 'badge-deluxe',
    'Suite': 'badge-suite',
    'Presidential': 'badge-presidential'
  };
  return `<span class="badge ${map[typeName] || 'badge-standard'}">${typeName}</span>`;
}

function validate(fields) {
  let valid = true;
  fields.forEach(({ id, msg }) => {
    const el = document.getElementById(id);
    const errEl = document.getElementById(id + '_err');
    if (!el) return;
    const val = el.value.trim();
    let err = '';
    if (!val) err = msg || 'This field is required';
    if (errEl) errEl.textContent = err;
    if (err) { el.style.borderColor = '#ef4444'; valid = false; }
    else el.style.borderColor = '';
  });
  return valid;
}

function clearValidation(formEl) {
  formEl.querySelectorAll('input,select,textarea').forEach(el => el.style.borderColor = '');
  formEl.querySelectorAll('.error-msg').forEach(el => el.textContent = '');
}

// Init modal close
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });
});
