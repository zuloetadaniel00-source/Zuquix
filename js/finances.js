// =====================================================
// FINANZAS / CAJA - SISTEMA DUAL ADMIN/VOLUNTEER
// Zuquix PMS - Adaptado del HTML de referencia
// =====================================================

let paymentChart = null;
let cajaBaseAmount = 0;
let cajaCurrentAmount = 0;
let cajaManager = "";
let cajaIsOpen = false;

// =====================================================
// RENDER PRINCIPAL DE CAJA
// =====================================================

function renderCaja() {
    const c = document.getElementById('page-content');
    
    if(currentUser?.role === 'volunteer') {
        renderCajaVolunteer(c);
    } else {
        renderCajaAdmin(c);
    }
}

// =====================================================
// VISTA VOLUNTEER - SIMPLIFICADA
// =====================================================

function renderCajaVolunteer(c) {
    if(!cajaIsOpen) {
        c.innerHTML = `
      <div class="caja-volunteer">
        <div class="caja-opening-form">
          <div class="card-title" style="margin-bottom:16px;">Abrir Caja - Voluntario</div>
          <div class="form-group">
            <label class="form-label">Nombre del encargado *</label>
            <input class="form-input" id="caja-manager" placeholder="Tu nombre">
          </div>
          <div class="form-group">
            <label class="form-label">Monto inicial en caja ($)</label>
            <input class="form-input" id="caja-initial" type="number" value="0" placeholder="0.00">
          </div>
          <button class="btn btn-accent btn-lg" onclick="openCajaVolunteer()">Abrir caja</button>
        </div>
      </div>`;
        return;
    }
    
    // Calcular solo ingresos en efectivo de reservas
    const efectivoIngresos = typeof movements !== 'undefined' 
        ? movements.filter(m => m.type === 'ingreso' && m.method === 'Efectivo' && m.category === 'reserva')
            .reduce((s,m) => s + m.amount, 0)
        : 0;
    
    c.innerHTML = `
    <div class="caja-volunteer">
      <div class="caja-volunteer-simple">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <div>
            <div style="font-size:0.7rem;color:var(--text2);text-transform:uppercase;letter-spacing:0.1em;">Encargado</div>
            <div style="font-weight:700;">${cajaManager}</div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="closeCajaVolunteer()">Cerrar caja</button>
        </div>
        
        <div class="caja-current-amount">
          $${cajaBaseAmount + efectivoIngresos}
        </div>
        
        <div style="background:var(--card2);border-radius:var(--radius);padding:16px;margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span style="color:var(--text2);">Monto inicial</span>
            <span>$${cajaBaseAmount}</span>
          </div>
          <div style="display:flex;justify-content:space-between;color:var(--accent);">
            <span>Ingresos efectivo (reservas)</span>
            <span>+$${efectivoIngresos}</span>
          </div>
        </div>
        
        <button class="btn btn-accent btn-lg" onclick="openAddLaundryModal()">+ Registrar Lavandería</button>
      </div>
    </div>`;
}

function openCajaVolunteer() {
    const manager = document.getElementById('caja-manager').value;
    const initial = parseFloat(document.getElementById('caja-initial').value) || 0;
    
    if(!manager) {
        showToast('Ingresa tu nombre', 'error');
        return;
    }
    
    cajaManager = manager;
    cajaBaseAmount = initial;
    cajaIsOpen = true;
    
    // Registrar apertura en movimientos
    if(initial > 0 && typeof movements !== 'undefined') {
        movements.unshift({
            date: new Date().toLocaleDateString('es-PA') + ' ' + new Date().toLocaleTimeString('es-PA',{hour:'2-digit',minute:'2-digit'}),
            desc: `Apertura de caja - ${manager}`,
            type: 'ingreso',
            method: 'Efectivo',
            amount: initial,
            category: 'apertura'
        });
    }
    
    showToast('✓ Caja abierta correctamente');
    renderCaja();
}

function closeCajaVolunteer() {
    cajaIsOpen = false;
    cajaManager = "";
    showToast('Caja cerrada');
    renderCaja();
}

function openAddLaundryModal() {
    openModal('Registrar Lavandería',
        `<div class="form-group">
      <label class="form-label">Nombre de persona *</label>
      <input class="form-input" id="laundry-name" placeholder="Nombre del huésped">
    </div>
    <div class="form-group">
      <label class="form-label">Habitación *</label>
      <input class="form-input" id="laundry-room" placeholder="Ej: Dorm A">
    </div>
    <div class="form-group">
      <label class="form-label">Monto ($) *</label>
      <input class="form-input" id="laundry-amount" type="number" placeholder="5.00">
    </div>`,
        `<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-accent" onclick="saveLaundry()">Guardar</button>`
    );
}

function saveLaundry() {
    const name = document.getElementById('laundry-name').value;
    const room = document.getElementById('laundry-room').value;
    const amount = parseFloat(document.getElementById('laundry-amount').value) || 0;
    
    if(!name || !room || !amount) {
        showToast('Completa todos los campos', 'error');
        return;
    }
    
    // Agregar a tareas
    if (typeof tasks !== 'undefined') {
        tasks.push({
            id: Date.now(),
            title: `Lavandería - ${name}`,
            assigned: "Sin asignar",
            time: new Date().toLocaleTimeString('es-PA',{hour:'2-digit',minute:'2-digit'}),
            location: room,
            priority: "medio",
            done: false,
            type: "laundry",
            guestName: name,
            amount: amount,
            room: room
        });
    }
    
    // Registrar ingreso en movimientos
    if (typeof movements !== 'undefined') {
        movements.unshift({
            date: new Date().toLocaleDateString('es-PA') + ' ' + new Date().toLocaleTimeString('es-PA',{hour:'2-digit',minute:'2-digit'}),
            desc: `Lavandería - ${name} (${room})`,
            type: 'ingreso',
            method: 'Efectivo',
            amount: amount,
            category: 'laundry'
        });
    }
    
    closeModal();
    showToast('✓ Lavandería registrada');
    
    if (typeof updateTaskBadge === 'function') updateTaskBadge();
    renderCaja();
}

// =====================================================
// VISTA ADMIN - COMPLETA
// =====================================================

let showAllMovements = false;

function renderCajaAdmin(c) {
    const inc = typeof movements !== 'undefined' 
        ? movements.filter(m=>m.type==='ingreso').reduce((s,m)=>s+m.amount,0)
        : 0;
    const exp = typeof movements !== 'undefined'
        ? movements.filter(m=>m.type==='egreso').reduce((s,m)=>s+m.amount,0)
        : 0;
    const allMovements = typeof movements !== 'undefined' ? movements : [];
    const shownMovs = showAllMovements ? allMovements : allMovements.slice(0,6);
    
    c.innerHTML = `
    <div style="margin-bottom: 16px;">
      <div class="role-selector">
        <button class="role-btn ${currentUser?.role === 'admin' ? 'active' : ''}" onclick="switchUserRole('admin')">Vista Admin</button>
        <button class="role-btn ${currentUser?.role === 'volunteer' ? 'active' : ''}" onclick="switchUserRole('volunteer')">Vista Voluntario</button>
      </div>
    </div>
    <div class="caja-banner">
      <div class="caja-banner-left">
        <div class="caja-shift-tag">Turno mañana · Bocas del Toro</div>
        <h2>Caja en vivo</h2>
        <p>Abierta desde las 06:00 AM · Recepcionista: ${currentUser?.name || 'Rodrigo Castro'}</p>
      </div>
      <div class="caja-banner-right">
        <div class="caja-total-big">$${inc-exp}</div>
        <div class="caja-breakdown">$480 ef · $280 tarj · $80 transf</div>
        <button class="btn btn-ghost btn-sm" style="margin-top:10px" onclick="confirmCloseCaja()">Cerrar caja →</button>
      </div>
    </div>
    <div class="caja-panels">
      <div class="card">
        <div class="card-title">Resumen por método</div>
        ${[['💵 Efectivo',480,'ingreso'],['💳 Tarjeta',280,'ingreso'],['🏦 Transferencia',80,'ingreso'],['↩ Devoluciones',0,'egreso']].map(([l,a,t])=>`
          <div class="caja-method-row" style="padding:8px 0;border-bottom:1px solid var(--border)">
            <span class="caja-method-label">${l}</span>
            <span style="font-weight:700;color:${t==='ingreso'?'var(--accent)':'var(--red)'}">${t==='ingreso'?'+':'-'}$${a}</span>
          </div>`).join('')}
        <div class="caja-total-row" style="margin-top:8px">
          <span class="caja-total-label">Total del turno</span>
          <span class="caja-total-val">$840</span>
        </div>
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border);">
          <div class="form-group">
            <label class="form-label">Actualizar monto en caja</label>
            <div style="display:flex;gap:8px;">
              <input class="form-input" id="caja-update-amount" type="number" placeholder="Nuevo monto">
              <button class="btn btn-accent" onclick="updateCajaAmount()">Actualizar</button>
            </div>
          </div>
        </div>
      </div>
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <div class="card-title" style="margin:0">Movimientos</div>
          <button class="btn btn-accent btn-sm" onclick="openAddMovModal()">+ Registrar</button>
        </div>
        ${shownMovs.map(m=>`
          <div class="mov-item">
            <div class="mov-icon ${m.type}">${m.type==='ingreso'?'⬆':'⬇'}</div>
            <div class="mov-info">
              <div class="mov-desc">${m.desc}</div>
              <div class="mov-meta">${m.date} · <span class="badge badge-gray" style="padding:1px 6px;font-size:0.65rem">${m.method}</span> · <span class="badge badge-gray" style="padding:1px 6px;font-size:0.65rem">${m.category||'otros'}</span></div>
            </div>
            <div class="mov-amount ${m.type}">${m.type==='ingreso'?'+':'-'}$${m.amount}</div>
          </div>`).join('')}
        ${!showAllMovements && allMovements.length>6 ? `<div style="text-align:center;padding:12px 0"><span class="panel-link" onclick="showAllMovements=true;renderCaja()">Ver todos los movimientos →</span></div>` : ''}
      </div>
    </div>`;
}

function updateCajaAmount() {
    const newAmount = parseFloat(document.getElementById('caja-update-amount').value);
    if(isNaN(newAmount)) {
        showToast('Ingresa un monto válido', 'error');
        return;
    }
    
    const currentEfectivo = typeof movements !== 'undefined'
        ? movements.filter(m => m.method === 'Efectivo')
            .reduce((s, m) => s + (m.type === 'ingreso' ? m.amount : -m.amount), 0)
        : 0;
    
    const difference = newAmount - currentEfectivo;
    
    if(difference !== 0 && typeof movements !== 'undefined') {
        const type = difference > 0 ? 'ingreso' : 'egreso';
        movements.unshift({
            date: new Date().toLocaleDateString('es-PA') + ' ' + new Date().toLocaleTimeString('es-PA',{hour:'2-digit',minute:'2-digit'}),
            desc: `Actualización de caja - Ajuste ${type === 'ingreso' ? 'positivo' : 'negativo'}`,
            type: type,
            method: 'Efectivo',
            amount: Math.abs(difference),
            category: 'ajuste'
        });
        
        showToast(`✓ Caja actualizada. ${type === 'ingreso' ? 'Ingreso' : 'Egreso'} registrado: $${Math.abs(difference)}`);
    } else {
        showToast('No hay diferencia para ajustar');
    }
    
    document.getElementById('caja-update-amount').value = '';
    renderCaja();
}

function openAddMovModal() {
    openModal('Registrar movimiento',
        `<div class="form-group"><label class="form-label">Descripción</label><input class="form-input" id="mov-desc" placeholder="Descripción…"></div>
     <div class="form-row">
       <div class="form-group"><label class="form-label">Tipo</label><select class="form-select" id="mov-type"><option value="ingreso">Ingreso</option><option value="egreso">Egreso</option></select></div>
       <div class="form-group"><label class="form-label">Monto ($)</label><input class="form-input" id="mov-amount" type="number" placeholder="0.00"></div>
     </div>
     <div class="form-group"><label class="form-label">Método de pago</label><select class="form-select" id="mov-method"><option>Efectivo</option><option>Tarjeta</option><option>Transferencia</option></select></div>
     <div class="form-group"><label class="form-label">Categoría</label><select class="form-select" id="mov-category">
       <option value="reserva">Reserva</option>
       <option value="operativo">Operativo</option>
       <option value="laundry">Lavandería</option>
       <option value="ajuste">Ajuste</option>
       <option value="apertura">Apertura</option>
       <option value="otros">Otros</option>
     </select></div>
     <div class="form-group"><label class="form-label">Notas</label><textarea class="form-textarea" id="mov-notes" rows="2"></textarea></div>`,
        `<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-accent" onclick="saveMovimiento()">Guardar</button>`
    );
}

function saveMovimiento() {
    const desc=document.getElementById('mov-desc').value;
    const amount=parseFloat(document.getElementById('mov-amount').value)||0;
    if(!desc||!amount){ showToast('Completa todos los campos','error'); return; }
    
    const now=new Date();
    if (typeof movements !== 'undefined') {
        movements.unshift({
            date:`${now.getDate()} abr ${now.toLocaleTimeString('es-PA',{hour:'2-digit',minute:'2-digit'})}`,
            desc,
            type:document.getElementById('mov-type').value,
            method:document.getElementById('mov-method').value,
            amount,
            category:document.getElementById('mov-category').value||'otros'
        });
    }
    
    closeModal(); 
    showToast('✓ Movimiento registrado'); 
    renderCaja();
}

function confirmCloseCaja() {
    openModal('Cerrar caja del turno',
        `<p style="font-size:0.88rem;color:var(--text2)">¿Cerrar la caja del turno mañana?</p><p style="font-size:1.2rem;font-weight:700;color:var(--amber);margin-top:12px">Total: $840</p>`,
        `<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button class="btn btn-accent" onclick="closeModal();showToast('Caja del turno cerrada')">Confirmar</button>`
    );
}

// =====================================================
// FINANZAS AVANZADAS (ADMIN)
// =====================================================

async function loadFinances() {
    try {
        await loadCashBalance();
        await loadCashHistory();
        await loadFinanceSummary();
        await loadTransactions();
    } catch (error) {
        console.error('Error loading finances:', error);
    }
}

async function loadCashBalance() {
    // Implementación con Supabase
    try {
        const { data, error } = await db
            .from('cash_register')
            .select('new_balance')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error) throw error;
        const balance = data?.new_balance || 0;
        const el = document.getElementById('current-cash-balance');
        if (el) {
            el.textContent = formatCurrency(balance);
        }
    } catch (error) {
        console.error('Error loading cash:', error);
    }
}

async function loadCashHistory() {
    // Implementación con Supabase
    try {
        const { data, error } = await db
            .from('cash_register')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
        if (error) throw error;
        // Renderizar en UI...
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

async function loadFinanceSummary() {
    // Implementación con filtros de fecha
    const dateFrom = document.getElementById('finance-date-from')?.value;
    const dateTo = document.getElementById('finance-date-to')?.value;
    
    try {
        let query = db.from('transactions').select('*');
        if (dateFrom) query = query.gte('shift_date', dateFrom);
        if (dateTo) query = query.lte('shift_date', dateTo);
        
        const { data, error } = await query;
        if (error) throw error;
        
        // Procesar y renderizar...
        processTransactions(data || []);
    } catch (error) {
        console.error('Error loading summary:', error);
    }
}

function processTransactions(transactions) {
    let totalIncome = 0;
    let totalExpense = 0;
    const methodTotals = { cash: 0, yappy: 0, card: 0 };

    transactions.forEach(t => {
        const amount = parseFloat(t.amount || 0);
        if (t.type === 'income') {
            totalIncome += amount;
            const method = (t.payment_method || t.method || 'cash').toLowerCase();
            if (methodTotals[method] !== undefined) {
                methodTotals[method] += amount;
            }
        } else if (t.type === 'expense') {
            totalExpense += amount;
        }
    });

    // Actualizar UI...
    const setEl = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = formatCurrency(val);
    };
    
    setEl('total-income', totalIncome);
    setEl('total-expense', totalExpense);
    setEl('total-balance', totalIncome - totalExpense);
}

async function loadTransactions() {
    // Cargar lista de transacciones
}

// =====================================================
// EXPORTAR EXCEL
// =====================================================

async function exportFinancesToExcel() {
    const dateFrom = document.getElementById('finance-date-from')?.value;
    const dateTo = document.getElementById('finance-date-to')?.value;

    if (!dateFrom || !dateTo) {
        showToast('Selecciona un rango de fechas', 'error');
        return;
    }

    try {
        if (typeof XLSX === 'undefined') {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        let query = db.from('transactions').select('*').order('created_at', { ascending: true });
        if (dateFrom) query = query.gte('shift_date', dateFrom);
        if (dateTo) query = query.lte('shift_date', dateTo);

        const { data, error } = await query;
        if (error) throw error;

        const categoryMap = {
            'reservation': 'Reserva',
            'supplies': 'Suministros',
            'food': 'Comida',
            'maintenance': 'Mantenimiento',
            'salary': 'Sueldos',
            'laundry': 'Lavandería',
            'ajuste': 'Ajuste',
            'apertura': 'Apertura',
            'otros': 'Otros'
        };

        const rows = (data || []).map(t => ({
            'Fecha': t.created_at ? formatDateTime(t.created_at) : '--',
            'Descripción': t.description || t.category || '',
            'Tipo': t.type === 'income' ? 'Ingreso' : 'Egreso',
            'Categoría': categoryMap[t.category] || t.category || '',
            'Método de pago': t.payment_method || t.method || '',
            'Monto': parseFloat(t.amount || 0)
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Transacciones');

        const fileName = `finanzas_${dateFrom}_a_${dateTo}.xlsx`;
        XLSX.writeFile(wb, fileName);
        showToast('✅ Archivo Excel descargado', 'success');

    } catch (err) {
        console.error('Error exportando Excel:', err);
        showToast('Error al exportar: ' + err.message, 'error');
    }
}

// =====================================================
// HELPERS
// =====================================================

function formatCurrency(amount) {
    const num = parseFloat(amount || 0);
    return new Intl.NumberFormat('es-PA', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(num);
}

function formatDateTime(isoString) {
    if (!isoString) return '--';
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('es-PA', {
        timeZone: 'America/Panama',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }).format(date);
}

// Exponer funciones globalmente
window.renderCaja = renderCaja;
window.renderCajaVolunteer = renderCajaVolunteer;
window.renderCajaAdmin = renderCajaAdmin;
window.openCajaVolunteer = openCajaVolunteer;
window.closeCajaVolunteer = closeCajaVolunteer;
window.openAddLaundryModal = openAddLaundryModal;
window.saveLaundry = saveLaundry;
window.updateCajaAmount = updateCajaAmount;
window.openAddMovModal = openAddMovModal;
window.saveMovimiento = saveMovimiento;
window.confirmCloseCaja = confirmCloseCaja;
window.loadFinances = loadFinances;
window.exportFinancesToExcel = exportFinancesToExcel;
window.cajaBaseAmount = cajaBaseAmount;
window.cajaIsOpen = cajaIsOpen;
window.cajaManager = cajaManager;
