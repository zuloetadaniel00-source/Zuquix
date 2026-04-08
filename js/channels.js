// =====================================================
// CHANNELS — Integración con canales de reserva
// Booking.com · Expedia · Hostelworld · Airbnb
// =====================================================

const CHANNEL_META = {
    booking: {
        label: 'Booking.com',
        color: '#003580',
        colorLight: '#e8f0fb',
        emoji: '🏨',
        description: 'El canal de reservas más grande del mundo'
    },
    expedia: {
        label: 'Expedia',
        color: '#f5a623',
        colorLight: '#fff8e8',
        emoji: '✈️',
        description: 'Reservas de viajeros internacionales'
    },
    hostelworld: {
        label: 'Hostelworld',
        color: '#00a651',
        colorLight: '#e6f7ed',
        emoji: '🌍',
        description: 'Especializado en hostels y viajeros jóvenes'
    },
    airbnb: {
        label: 'Airbnb',
        color: '#ff5a5f',
        colorLight: '#ffe8e9',
        emoji: '🏠',
        description: 'Comunidad global de alojamientos únicos'
    }
};

// ─────────────────────────────────────────────────────
// Cargar y renderizar la página de canales
// ─────────────────────────────────────────────────────

async function loadChannels() {
    const container = document.getElementById('channels-grid');
    if (!container) return;

    container.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding: var(--space-8); color:var(--gray-400)">
            <div style="font-size:2rem; margin-bottom:var(--space-3);">⟳</div>
            Cargando canales...
        </div>`;

    try {
        const hostelId = await window.getCurrentHostelId();
        if (!hostelId) {
            container.innerHTML = `<div style="grid-column:1/-1; padding:var(--space-6); text-align:center; color:var(--gray-400)">No se pudo obtener el hostel. Inicia sesión nuevamente.</div>`;
            return;
        }

        const { data: integrations, error } = await window.db
            .from('channel_integrations')
            .select('*')
            .eq('hostel_id', hostelId);

        if (error) throw error;

        // Construir mapa para acceso rápido
        const integMap = {};
        (integrations || []).forEach(i => { integMap[i.channel] = i; });

        container.innerHTML = Object.keys(CHANNEL_META)
            .map(ch => renderChannelCard(ch, integMap[ch] || null))
            .join('');

    } catch (err) {
        console.error('loadChannels error:', err);
        container.innerHTML = `<div style="grid-column:1/-1; padding:var(--space-6); text-align:center; color:var(--danger)">Error cargando canales. Intenta nuevamente.</div>`;
    }
}

function renderChannelCard(channelKey, integration) {
    const meta = CHANNEL_META[channelKey];
    const isActive = integration?.is_active || false;
    const status = integration?.sync_status || 'pending';
    const lastSync = integration?.last_sync_at
        ? new Date(integration.last_sync_at).toLocaleString('es-PA', { timeZone: 'America/Panama', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
        : 'Nunca';
    const monthly = integration?.reservations_this_month || 0;

    const statusBadge = isActive
        ? `<span class="channel-status connected">Conectado</span>`
        : `<span class="channel-status disconnected">Desconectado</span>`;

    return `
    <div class="channel-card" id="card-${channelKey}">
        <div class="channel-card-header" style="background:${meta.colorLight}; border-bottom: 1px solid ${meta.color}22;">
            <span class="channel-emoji">${meta.emoji}</span>
            <div>
                <h3 class="channel-name" style="color:${meta.color}">${meta.label}</h3>
                <p class="channel-desc">${meta.description}</p>
            </div>
        </div>
        <div class="channel-card-body">
            <div class="channel-stat-row">
                ${statusBadge}
                <span class="channel-stat">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0M12 8v4l3 3"/></svg>
                    ${lastSync}
                </span>
            </div>
            <div class="channel-monthly">
                <span class="channel-monthly-number">${monthly}</span>
                <span class="channel-monthly-label">reservas este mes</span>
            </div>
            ${isActive && status === 'error' ? `<div class="channel-error-msg">${integration.sync_error || 'Error de sincronización'}</div>` : ''}
        </div>
        <div class="channel-card-footer">
            ${isActive
                ? `<button class="btn btn-secondary btn-small" onclick="configureChannel('${channelKey}')">
                       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                       Configurar
                   </button>
                   <button class="btn btn-primary btn-small" onclick="simulateSync('${channelKey}')">
                       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.68"/></svg>
                       Sincronizar
                   </button>`
                : `<button class="btn btn-primary" style="width:100%" onclick="connectChannel('${channelKey}')">
                       Conectar ${meta.label}
                   </button>`
            }
        </div>
    </div>`;
}

// ─────────────────────────────────────────────────────
// Conectar canal (abrir modal)
// ─────────────────────────────────────────────────────

window.connectChannel = function(channelKey) {
    const meta = CHANNEL_META[channelKey];
    const modal = document.getElementById('channel-connect-modal');
    const title = document.getElementById('channel-modal-title');
    const body = document.getElementById('channel-modal-body');

    if (!modal) return;

    title.textContent = `Conectar ${meta.label}`;
    title.style.color = meta.color;

    body.innerHTML = `
        <p style="color:var(--gray-500); font-size:0.875rem; margin-bottom:var(--space-4);">
            Ingresa tus credenciales de API de <strong>${meta.label}</strong>.
            Las claves se guardan de forma segura en tu cuenta.
        </p>
        <div class="form-group">
            <label>API Key / Property ID <span style="color:var(--danger)">*</span></label>
            <input type="text" id="ch-api-key" placeholder="Ej: bk_live_xxxxxxxx" autocomplete="off">
        </div>
        <div class="form-group">
            <label>API Secret</label>
            <input type="password" id="ch-api-secret" placeholder="Tu secreto de API" autocomplete="off">
        </div>
        <div class="form-group">
            <label>ID del hostel en ${meta.label}</label>
            <input type="text" id="ch-hotel-id" placeholder="ID externo de tu propiedad">
        </div>
        <div style="background:var(--info-light); border-radius:var(--radius); padding:var(--space-3) var(--space-4); margin-bottom:var(--space-4);">
            <p style="color:var(--info); font-size:0.8rem; margin:0; font-weight:500;">
                ℹ️ Puedes usar el modo <strong>demo</strong> sin credenciales reales. Solo haz clic en "Conectar en demo".
            </p>
        </div>
        <div style="display:flex; gap:var(--space-3);">
            <button class="btn btn-secondary" style="flex:1" onclick="closeChannelModal()">Cancelar</button>
            <button class="btn btn-secondary" style="flex:1" onclick="connectChannelDemo('${channelKey}')">Demo</button>
            <button class="btn btn-primary" style="flex:1" onclick="saveChannelCredentials('${channelKey}')">Conectar</button>
        </div>
    `;

    showChannelModal();
};

window.configureChannel = function(channelKey) {
    window.connectChannel(channelKey);
};

// ─────────────────────────────────────────────────────
// Guardar credenciales reales
// ─────────────────────────────────────────────────────

window.saveChannelCredentials = async function(channelKey) {
    const apiKey = document.getElementById('ch-api-key')?.value.trim();
    const apiSecret = document.getElementById('ch-api-secret')?.value.trim();
    const hotelId = document.getElementById('ch-hotel-id')?.value.trim();

    if (!apiKey) {
        showToast('La API Key es obligatoria', 'error');
        return;
    }

    try {
        const hostelId = await window.getCurrentHostelId();
        const { error } = await window.db
            .from('channel_integrations')
            .upsert({
                hostel_id: hostelId,
                channel: channelKey,
                api_key: apiKey,
                api_secret: apiSecret || null,
                hotel_id_external: hotelId || null,
                is_active: true,
                sync_status: 'pending'
            }, { onConflict: 'hostel_id,channel' });

        if (error) throw error;

        closeChannelModal();
        showToast(`${CHANNEL_META[channelKey].label} conectado correctamente`, 'success');
        await loadChannels();

    } catch (err) {
        console.error('saveChannelCredentials error:', err);
        showToast('Error al guardar las credenciales', 'error');
    }
};

// ─────────────────────────────────────────────────────
// Conectar en modo demo (sin credenciales reales)
// ─────────────────────────────────────────────────────

window.connectChannelDemo = async function(channelKey) {
    try {
        const hostelId = await window.getCurrentHostelId();
        const { error } = await window.db
            .from('channel_integrations')
            .upsert({
                hostel_id: hostelId,
                channel: channelKey,
                api_key: 'DEMO_MODE',
                is_active: true,
                sync_status: 'pending',
                settings: { demo: true }
            }, { onConflict: 'hostel_id,channel' });

        if (error) throw error;

        closeChannelModal();
        showToast(`${CHANNEL_META[channelKey].label} conectado en modo demo`, 'success');
        await loadChannels();

    } catch (err) {
        console.error('connectChannelDemo error:', err);
        showToast('Error al conectar en demo', 'error');
    }
};

// ─────────────────────────────────────────────────────
// Simular sincronización (genera reservas de prueba)
// ─────────────────────────────────────────────────────

window.simulateSync = async function(channelKey) {
    const card = document.getElementById(`card-${channelKey}`);
    const syncBtn = card?.querySelector('.btn-primary');
    if (syncBtn) {
        syncBtn.disabled = true;
        syncBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.68"/></svg> Sincronizando...`;
    }

    try {
        const hostelId = await window.getCurrentHostelId();
        const meta = CHANNEL_META[channelKey];

        // Actualizar estado a "syncing"
        await window.db
            .from('channel_integrations')
            .update({ sync_status: 'syncing' })
            .eq('hostel_id', hostelId)
            .eq('channel', channelKey);

        // Simular delay de API externa
        await new Promise(r => setTimeout(r, 1500));

        // Generar reservas de prueba
        const demoReservations = generateDemoReservations(channelKey, hostelId);
        if (demoReservations.length > 0) {
            const { error: insertError } = await window.db
                .from('channel_reservations')
                .upsert(demoReservations, { onConflict: 'channel,external_reservation_id', ignoreDuplicates: true });

            if (insertError) console.warn('Upsert channel_reservations:', insertError);
        }

        // Actualizar last_sync_at y estado
        await window.db
            .from('channel_integrations')
            .update({
                sync_status: 'success',
                last_sync_at: new Date().toISOString(),
                sync_error: null
            })
            .eq('hostel_id', hostelId)
            .eq('channel', channelKey);

        showToast(`${meta.label}: ${demoReservations.length} reservas importadas (demo)`, 'success');
        await loadChannels();

        // Mostrar reservas importadas si hay
        if (demoReservations.length > 0) {
            showImportedReservations(channelKey, demoReservations);
        }

    } catch (err) {
        console.error('simulateSync error:', err);

        const hostelId = await window.getCurrentHostelId().catch(() => null);
        if (hostelId) {
            await window.db
                .from('channel_integrations')
                .update({ sync_status: 'error', sync_error: err.message })
                .eq('hostel_id', hostelId)
                .eq('channel', channelKey);
        }

        showToast('Error durante la sincronización', 'error');
        await loadChannels();
    }
};

function generateDemoReservations(channelKey, hostelId) {
    const guestNames = ['Ana García', 'John Smith', 'Marie Dupont', 'Carlos Ruiz', 'Emma Wilson', 'Liam Johnson', 'Sofia Martinez'];
    const count = Math.floor(Math.random() * 3) + 1;
    const reservations = [];

    for (let i = 0; i < count; i++) {
        const today = new Date();
        const checkIn = new Date(today);
        checkIn.setDate(checkIn.getDate() + Math.floor(Math.random() * 14) + 1);
        const nights = Math.floor(Math.random() * 5) + 1;
        const checkOut = new Date(checkIn);
        checkOut.setDate(checkOut.getDate() + nights);
        const amount = (Math.random() * 80 + 20).toFixed(2);
        const commission = (amount * 0.15).toFixed(2);

        reservations.push({
            hostel_id: hostelId,
            channel: channelKey,
            external_reservation_id: `${channelKey.toUpperCase()}-DEMO-${Date.now()}-${i}`,
            external_guest_name: guestNames[Math.floor(Math.random() * guestNames.length)],
            external_guest_email: `guest${i}@demo.com`,
            check_in_date: checkIn.toISOString().split('T')[0],
            check_out_date: checkOut.toISOString().split('T')[0],
            total_amount: parseFloat(amount),
            commission: parseFloat(commission),
            net_amount: parseFloat((amount - commission).toFixed(2)),
            status: 'pending',
            raw_data: { source: 'demo', generated_at: new Date().toISOString() }
        });
    }
    return reservations;
}

function showImportedReservations(channelKey, reservations) {
    const meta = CHANNEL_META[channelKey];
    const modal = document.getElementById('channel-connect-modal');
    const title = document.getElementById('channel-modal-title');
    const body = document.getElementById('channel-modal-body');
    if (!modal) return;

    title.textContent = `${meta.label} — Reservas importadas`;
    body.innerHTML = `
        <p style="color:var(--gray-500); font-size:0.875rem; margin-bottom:var(--space-4);">
            Se importaron <strong>${reservations.length}</strong> reservas en modo demo:
        </p>
        ${reservations.map(r => `
            <div style="background:var(--gray-50); border-radius:var(--radius); padding:var(--space-3) var(--space-4); margin-bottom:var(--space-3); border-left:3px solid ${meta.color}">
                <div style="font-weight:600; color:var(--gray-800)">${r.external_guest_name}</div>
                <div style="font-size:0.8rem; color:var(--gray-500)">
                    ${r.check_in_date} → ${r.check_out_date} ·
                    <span style="color:var(--success); font-weight:600">$${r.net_amount} neto</span>
                </div>
            </div>
        `).join('')}
        <button class="btn btn-primary" style="width:100%; margin-top:var(--space-3)" onclick="closeChannelModal()">Cerrar</button>
    `;
    showChannelModal();
}

// ─────────────────────────────────────────────────────
// Modal helpers
// ─────────────────────────────────────────────────────

function showChannelModal() {
    const overlay = document.getElementById('channel-modal-overlay');
    const modal = document.getElementById('channel-connect-modal');
    if (overlay) { overlay.classList.remove('hidden'); }
    if (modal) { modal.classList.remove('hidden'); }
    document.body.style.overflow = 'hidden';
}

window.closeChannelModal = function() {
    const overlay = document.getElementById('channel-modal-overlay');
    const modal = document.getElementById('channel-connect-modal');
    if (overlay) overlay.classList.add('hidden');
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = '';
};

// ─────────────────────────────────────────────────────
// Mostrar página de canales
// ─────────────────────────────────────────────────────

window.showChannels = function() {
    if (typeof currentProfile !== 'undefined' && currentProfile?.role !== 'admin') {
        showToast('Solo los administradores pueden gestionar canales', 'error');
        return;
    }
    document.getElementById('page-title').textContent = 'Canales';
    showPage('channels-page');
    setTimeout(() => loadChannels(), 100);
};

window.loadChannels = loadChannels;
