// ===== MAIN APP =====
const pages = {
  dashboard: renderDashboard,
  rooms: renderRooms,
  guests: renderGuests,
  reservations: renderReservations,
  checkinout: renderCheckinOut,
  invoices: renderInvoices
};

let currentPage = 'dashboard';

async function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  if (pages[page]) {
    try {
      await pages[page]();
    } catch(err) {
      console.error(err);
      document.getElementById('pageContainer').innerHTML = `<div style="padding:40px;color:var(--danger);text-align:center">Error loading page: ${err.message}</div>`;
    }
  }
}

function updateCurrentDate() {
  const el = document.getElementById('currentDate');
  if (el) {
    el.textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric'
    });
  }
}

async function init() {
  // Show loading overlay
  const loading = document.createElement('div');
  loading.className = 'loading-overlay';
  loading.id = 'loadingOverlay';
  loading.innerHTML = `
    <div class="loading-logo">✦ LuxeStay</div>
    <div class="loading-spinner"></div>
    <div style="font-size:13px;color:var(--text-secondary)">Loading hotel management system...</div>
  `;
  document.body.appendChild(loading);

  try {
    await initDB();

    // Wire up nav
    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(el.dataset.page);
      });
    });

    updateCurrentDate();
    setInterval(updateCurrentDate, 60000);

    // Sidebar toggle for mobile
    const toggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    if (toggle) {
      toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    }

    // Render initial page
    navigateTo('dashboard');
  } catch (err) {
    console.error('Init error:', err);
    document.getElementById('pageContainer').innerHTML = `
      <div style="padding:60px;text-align:center">
        <div style="font-size:40px;margin-bottom:16px">⚠️</div>
        <div style="font-size:18px;color:var(--danger)">Failed to initialize database</div>
        <div style="font-size:13px;color:var(--text-secondary);margin-top:8px">${err.message}</div>
      </div>
    `;
  } finally {
    setTimeout(() => {
      const overlay = document.getElementById('loadingOverlay');
      if (overlay) {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.4s ease';
        setTimeout(() => overlay.remove(), 400);
      }
    }, 600);
  }
}

document.addEventListener('DOMContentLoaded', init);
