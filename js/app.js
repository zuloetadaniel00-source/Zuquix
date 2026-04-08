// =====================================================
// APP PRINCIPAL - OPTIMIZADO CON ZONA HORARIA PANAMÁ
// UX Premium Edition
// =====================================================

let currentUser = null;
let currentProfile = null;

const esc = (str) => {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    // Add icon based on type
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    toast.insertAdjacentText('afterbegin', `${icons[type] || '•'} `);
    
    container.appendChild(toast);

    // Play haptic feedback if available
    if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(type === 'error' ? [50, 100, 50] : 50);
    }

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px) scale(0.9)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function showPage(pageId) {
    // Add exit animation to current page
    const currentPage = document.querySelector('.page:not(.hidden)');
    if (currentPage) {
        currentPage.style.opacity = '0';
        currentPage.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            currentPage.classList.add('hidden');
            currentPage.style.opacity = '';
            currentPage.style.transform = '';
        }, 150);
    }

    setTimeout(() => {
        document.querySelectorAll('.page').forEach(p => {
            p.classList.add('hidden');
            p.style.opacity = '';
            p.style.transform = '';
        });

        const page = document.getElementById(pageId);
        if (page) {
            page.classList.remove('hidden');
            // Trigger reflow for animation
            void page.offsetWidth;
            page.style.animation = 'pageEnter 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
            
            const main = document.getElementById('main-content');
            if (main) main.scrollTop = 0;
        }

        const pageName = pageId.replace('-page', '');
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.page === pageName) {
                btn.classList.add('active');
            }
        });
    }, currentPage ? 150 : 0);
}

function showDashboard() {
    document.getElementById('page-title').textContent = 'Dashboard';
    showPage('dashboard-page');
    setTimeout(() => loadDashboard(), 100);
}

function showReservations() {
    document.getElementById('page-title').textContent = 'Reservas';
    showPage('reservations-page');
    setTimeout(() => loadReservationsByDate(), 100);
}

function showNewReservation() {
    document.getElementById('page-title').textContent = 'Nueva Reserva';
    resetReservationForm();
    showPage('new-reservation-page');
}

function showOperations() {
    document.getElementById('page-title').textContent = 'Tareas';
    showPage('operations-page');
    setTimeout(() => loadTasks(), 100);
}

function showCashRegister() {
    document.getElementById('page-title').textContent = 'Caja';
    showPage('cash-page');
    setTimeout(() => loadCashBalance(), 100);
}

function showFinances() {
    if (currentProfile?.role !== 'admin') {
        showToast('No tienes permiso para acceder a Finanzas', 'error');
        return;
    }

    document.getElementById('page-title').textContent = 'Finanzas';

    const today = getTodayInPanama();
    const firstDay = new Date().toISOString().slice(0, 8) + '01';

    const dateFromEl = document.getElementById('finance-date-from');
    const dateToEl = document.getElementById('finance-date-to');

    if (dateFromEl) dateFromEl.value = firstDay;
    if (dateToEl) dateToEl.value = today;

    showPage('finances-page');
    setTimeout(() => loadFinances(), 100);
}

function goBack() {
    showReservations();
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize dates with Panama timezone
    const today = getTodayInPanama();
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value;
    };

    setValue('check-in-date', today);
    setValue('check-out-date', tomorrowStr);
    setValue('reservations-date', today);

    // Add smooth transitions to all interactive elements
    document.querySelectorAll('button, .btn, input, select, textarea').forEach(el => {
        el.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
    });
});

function showLogin() {
    const loginScreen = document.getElementById('login-screen');
    const appScreen = document.getElementById('app-screen');
    
    if (loginScreen) {
        loginScreen.classList.remove('hidden');
        loginScreen.style.animation = 'fadeIn 0.5s ease';
    }
    if (appScreen) appScreen.classList.add('hidden');
}

function showApp() {
    const loginScreen = document.getElementById('login-screen');
    const appScreen = document.getElementById('app-screen');
    
    if (loginScreen) {
        loginScreen.style.opacity = '0';
        setTimeout(() => loginScreen.classList.add('hidden'), 300);
    }
    if (appScreen) {
        appScreen.classList.remove('hidden');
        appScreen.style.animation = 'fadeIn 0.5s ease';
    }
}

function showModal(modalId) {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById(modalId);
    
    if (overlay) {
        overlay.classList.remove('hidden');
        overlay.style.animation = 'fadeIn 0.2s ease';
    }
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.animation = 'slideUpModal 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
    }
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    const modals = document.querySelectorAll('.modal');
    
    modals.forEach(modal => {
        modal.style.animation = 'slideDownModal 0.3s ease forwards';
    });
    
    setTimeout(() => {
        if (overlay) overlay.classList.add('hidden');
        modals.forEach(m => {
            m.classList.add('hidden');
            m.style.animation = '';
        });
        document.body.style.overflow = '';
    }, 300);
}

// Add slideDownModal animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDownModal {
        from { transform: translateY(0); opacity: 1; }
        to { transform: translateY(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

function closeEditModal() {
    const modal = document.getElementById('edit-reservation-modal');
    const overlay = document.getElementById('modal-overlay');
    
    if (modal) {
        modal.style.animation = 'slideDownModal 0.3s ease forwards';
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.style.animation = '';
        }, 300);
    }
    if (overlay) {
        setTimeout(() => overlay.classList.add('hidden'), 300);
    }
    document.body.style.overflow = '';
}

function formatDate(dateStr) {
    if (!dateStr) return '--';
    
    const date = dateStr.includes('T') ? dateFromUTC(dateStr) : new Date(dateStr);
    
    return new Intl.DateTimeFormat('es-PA', {
        timeZone: 'America/Panama',
        weekday: 'short',
        day: 'numeric',
        month: 'short'
    }).format(date);
}

function formatCurrency(amount) {
    const num = parseFloat(amount || 0);
    return new Intl.NumberFormat('es-PA', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
}

function formatDateTime(isoString) {
    if (!isoString) return '--';
    
    const date = dateFromUTC(isoString);
    
    return new Intl.DateTimeFormat('es-PA', {
        timeZone: 'America/Panama',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }).format(date);
}

function showUsers() {
    if (currentProfile?.role !== 'admin') {
        showToast('No tienes permiso para gestionar usuarios', 'error');
        return;
    }
    document.getElementById('page-title').textContent = 'Equipo';
    showPage('users-page');
    setTimeout(() => loadUsers(), 100);
}

async function loadUsers() {
    const container = document.getElementById('users-list');
    if (!container) return;

    const hostelId = await window.getCurrentHostelId();
    if (!hostelId) {
        container.innerHTML = '<p style="color:var(--gray-400);font-size:0.85rem;text-align:center;padding:var(--space-6) 0;">Sin hostel asignado.</p>';
        return;
    }

    const { data: users, error } = await db
        .from('profiles')
        .select('id, email, full_name, role, is_active')
        .eq('hostel_id', hostelId)
        .order('full_name');

    if (error) {
        container.innerHTML = '<p style="color:var(--gray-400);font-size:0.85rem;text-align:center;padding:var(--space-6) 0;">Error cargando usuarios.</p>';
        return;
    }

    if (!users || users.length === 0) {
        container.innerHTML = '<p style="color:var(--gray-400);font-size:0.85rem;text-align:center;padding:var(--space-6) 0;">No hay usuarios en este hostel.</p>';
        return;
    }

    container.innerHTML = users.map(u => {
        const isCurrentUser = u.id === currentUser?.id;
        const isActive = u.is_active !== false;
        return `
        <div style="background:var(--surface);border-radius:var(--radius-lg);box-shadow:var(--shadow);padding:var(--space-4);display:flex;flex-direction:column;gap:var(--space-3);">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);">
                <div style="min-width:0;">
                    <p style="margin:0;font-weight:600;font-size:0.95rem;color:var(--gray-800);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(u.full_name || u.email)}</p>
                    <p style="margin:0;font-size:0.78rem;color:var(--gray-500);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(u.email)}</p>
                </div>
                <span style="flex-shrink:0;padding:2px 10px;border-radius:999px;font-size:0.75rem;font-weight:600;background:${u.role === 'admin' ? 'var(--primary,#6366f1)' : 'var(--gray-200)'};color:${u.role === 'admin' ? '#fff' : 'var(--gray-600)'};">
                    ${u.role === 'admin' ? 'Admin' : 'Voluntario'}
                </span>
            </div>
            ${!isCurrentUser ? `
            <div style="display:flex;gap:var(--space-2);">
                <button onclick="changeUserRole('${u.id}', '${u.role === 'admin' ? 'volunteer' : 'admin'}')" class="btn btn-secondary btn-small" style="flex:1;font-size:0.78rem;">
                    ${u.role === 'admin' ? 'Hacer voluntario' : 'Hacer admin'}
                </button>
                <button onclick="toggleUserActive('${u.id}', ${isActive})" class="btn btn-small" style="flex:1;font-size:0.78rem;background:${isActive ? 'var(--danger-light,#fee2e2)' : 'var(--success-light,#dcfce7)'};color:${isActive ? 'var(--danger,#ef4444)' : 'var(--success,#22c55e)'};">
                    ${isActive ? 'Desactivar' : 'Activar'}
                </button>
            </div>` : '<p style="font-size:0.75rem;color:var(--gray-400);margin:0;">(tú)</p>'}
        </div>`;
    }).join('');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function changeUserRole(userId, newRole) {
    const { error } = await db.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) { showToast('Error al cambiar rol', 'error'); return; }
    showToast(`Rol actualizado a ${newRole === 'admin' ? 'Admin' : 'Voluntario'}`, 'success');
    loadUsers();
}

async function toggleUserActive(userId, currentlyActive) {
    const { error } = await db.from('profiles').update({ is_active: !currentlyActive }).eq('id', userId);
    if (error) { showToast('Error al actualizar usuario', 'error'); return; }
    showToast(currentlyActive ? 'Usuario desactivado' : 'Usuario activado', 'success');
    loadUsers();
}

async function handleInviteUser(e) {
    e.preventDefault();
    const name = document.getElementById('invite-name').value.trim();
    const email = document.getElementById('invite-email').value.trim();
    const errorDiv = document.getElementById('invite-error');
    const btn = document.getElementById('invite-submit-btn');

    errorDiv.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
        await inviteUserByEmail(email, name);
        closeModal();
        document.getElementById('invite-user-form').reset();
        showToast(`Invitación enviada a ${email}`, 'success');
        loadUsers();
    } catch (err) {
        errorDiv.textContent = err.message || 'Error al enviar la invitación';
        errorDiv.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Enviar invitación';
    }
}

// Expose functions globally
window.showDashboard = showDashboard;
window.showReservations = showReservations;
window.showNewReservation = showNewReservation;
window.showOperations = showOperations;
window.showCashRegister = showCashRegister;
window.showFinances = showFinances;
window.showUsers = showUsers;
window.goBack = goBack;
window.showModal = showModal;
window.closeModal = closeModal;
window.closeEditModal = closeEditModal;
window.showToast = showToast;
window.esc = esc;
window.formatDate = formatDate;
window.formatCurrency = formatCurrency;
window.formatDateTime = formatDateTime;
window.changeUserRole = changeUserRole;
window.toggleUserActive = toggleUserActive;
window.handleInviteUser = handleInviteUser;
