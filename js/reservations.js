// =====================================================
// RESERVAS - CON NUEVOS CAMPOS DE PAGO Y EDICIÓN
// Zuquix PMS - Adaptado del HTML de referencia
// =====================================================

let reservationData = {
    roomId: null,
    bedId: null,
    checkIn: null,
    checkOut: null,
    guestId: null,
    tax: 0,
    paidAmount: 0,
    paymentType: 'completo',
    paymentMethod: 'Efectivo',
    boleta: null
};

let boletaFile = null;

// =====================================================
// FUNCIONES DE UTILIDAD
// =====================================================

function resetReservationForm() {
    reservationData = { 
        roomId: null, 
        bedId: null, 
        checkIn: null, 
        checkOut: null, 
        guestId: null,
        tax: 0,
        paidAmount: 0,
        paymentType: 'completo',
        paymentMethod: 'Efectivo',
        boleta: null
    };
    boletaFile = null;
    
    document.getElementById('step1-form')?.reset();
    document.getElementById('step2-form')?.reset();
    document.getElementById('step3-form')?.reset();
    
    // Resetear previews
    const boletaPreview = document.getElementById('boleta-preview');
    const boletaText = document.getElementById('boleta-text');
    if (boletaPreview) {
        boletaPreview.style.display = 'none';
        boletaPreview.src = '';
    }
    if (boletaText) boletaText.textContent = '📷 Haga clic para subir foto de boleta';
    
    // Resetear fechas
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    
    const checkInEl = document.getElementById('ci-checkin');
    const checkOutEl = document.getElementById('ci-checkout');
    if (checkInEl) checkInEl.value = today;
    if (checkOutEl) checkOutEl.value = tomorrow;
    
    // Resetear selecciones
    document.querySelectorAll('.room-option').forEach(el => el.classList.remove('selected'));
    document.querySelectorAll('.bed-option').forEach(el => el.classList.remove('selected'));
    
    // Ocultar campos de adelanto
    const adelantoInput = document.getElementById('adelanto-input');
    const pendingDisplay = document.getElementById('pending-display');
    if (adelantoInput) adelantoInput.style.display = 'none';
    if (pendingDisplay) pendingDisplay.style.display = 'none';
    
    calcNights();
}

// =====================================================
// CHECK-IN FORM - NUEVOS CAMPOS
// =====================================================

function renderCheckin() {
    const c = document.getElementById('page-content');
    const today = new Date().toISOString().split('T')[0];
    boletaFile = null;
    
    c.innerHTML = `
    <div class="checkin-form card">
      <div class="card-title">Registrar nuevo huésped</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Nombre completo *</label>
          <input class="form-input" id="ci-name" type="text" placeholder="Nombre del huésped">
          <div class="form-error" id="err-name">Campo requerido</div>
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="form-input" id="ci-email" type="email" placeholder="correo@ejemplo.com">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Nacionalidad</label>
        <input class="form-input" id="ci-nationality" type="text" placeholder="Ej: Colombiana">
      </div>
      <div class="form-group">
        <label class="form-label">Tipo de habitación *</label>
        <select class="form-select" id="ci-type" onchange="updateRoomOptions()">
          <option value="">Seleccionar…</option>
          <option value="privada">Privada</option>
          <option value="compartida">Compartida</option>
        </select>
        <div class="form-error" id="err-type">Campo requerido</div>
      </div>
      <div class="form-group" id="ci-room-group">
        <label class="form-label">Habitación *</label>
        <select class="form-select" id="ci-room">
          <option value="">Selecciona tipo primero</option>
        </select>
        <div class="form-error" id="err-room">Campo requerido</div>
      </div>
      <div class="form-group" id="ci-bed-group" style="display:none">
        <label class="form-label">Cama *</label>
        <select class="form-select" id="ci-bed">
          ${[1,2,3,4,5,6].map(n=>`<option value="cama ${n}">Cama ${n}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Fecha check-in *</label>
          <input class="form-input" id="ci-checkin" type="date" value="${today}" onchange="calcNights()">
          <div class="form-error" id="err-checkin">Campo requerido</div>
        </div>
        <div class="form-group">
          <label class="form-label">Fecha check-out *</label>
          <input class="form-input" id="ci-checkout" type="date" onchange="calcNights()">
          <div class="form-error" id="err-checkout">Campo requerido</div>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Noches</label>
          <input class="form-input" id="ci-nights" type="text" readonly placeholder="Auto" style="background:var(--card2)">
        </div>
        <div class="form-group">
          <label class="form-label">Tarifa por noche ($)</label>
          <input class="form-input" id="ci-rate" type="number" value="15" oninput="calcNights()">
        </div>
      </div>
      
      <!-- NUEVO: Campo de impuesto -->
      <div class="form-group">
        <label class="form-label">Impuesto (opcional)</label>
        <input class="form-input" id="ci-tax" type="number" placeholder="0.00" value="0" oninput="calcNights()">
      </div>
      
      <div class="form-group">
        <label class="form-label">Total</label>
        <input class="form-input" id="ci-total" type="text" readonly placeholder="Auto" style="background:var(--card2);font-weight:700">
      </div>
      
      <!-- SECCIÓN DE PAGOS MEJORADA -->
      <div class="payment-section">
        <div class="form-label" style="margin-bottom:10px;">Tipo de pago</div>
        <div class="payment-option">
          <input type="radio" name="ci-payment-type" id="pay-completo" value="completo" checked onchange="togglePaymentType()">
          <label for="pay-completo" style="font-size:0.84rem;cursor:pointer;">Pago Completo</label>
        </div>
        <div class="payment-option">
          <input type="radio" name="ci-payment-type" id="pay-adelanto" value="adelanto" onchange="togglePaymentType()">
          <label for="pay-adelanto" style="font-size:0.84rem;cursor:pointer;">Adelanto</label>
        </div>
        <div id="adelanto-input" style="display:none;margin-top:10px;">
          <label class="form-label">Monto del adelanto *</label>
          <input class="form-input" id="ci-adelanto-amount" type="number" placeholder="0.00" oninput="calcPending()">
        </div>
        <div id="pending-display" style="display:none;margin-top:10px;" class="pending-amount">
          Pago pendiente: $0
        </div>
      </div>
      
      <div class="form-group" style="margin-top:14px;">
        <label class="form-label">Método de pago</label>
        <div class="radio-group">
          <label class="radio-label"><input type="radio" name="ci-payment" value="Efectivo" checked> Efectivo</label>
          <label class="radio-label"><input type="radio" name="ci-payment" value="Tarjeta"> Tarjeta</label>
          <label class="radio-label"><input type="radio" name="ci-payment" value="Transferencia"> Transferencia</label>
          <label class="radio-label"><input type="radio" name="ci-payment" value="OTA"> OTA</label>
        </div>
      </div>
      
      <!-- NUEVO: Subida de boleta -->
      <div class="form-group">
        <label class="form-label">Boleta / Comprobante</label>
        <div class="boleta-upload" onclick="document.getElementById('boleta-input').click()">
          <div id="boleta-text">📷 Haga clic para subir foto de boleta</div>
          <input type="file" id="boleta-input" accept="image/*" style="display:none" onchange="handleBoletaUpload(this)">
          <img id="boleta-preview" class="boleta-preview" style="display:none;">
        </div>
      </div>
      
      <div class="form-group">
        <label class="form-label">Notas</label>
        <textarea class="form-textarea" id="ci-notes" placeholder="Notas adicionales…"></textarea>
      </div>
      <div style="display:flex;gap:12px;margin-top:6px">
        <button class="btn btn-accent" style="flex:1;justify-content:center" onclick="submitCheckin()">Registrar check-in</button>
        <button class="btn btn-ghost" onclick="navigate('dashboard')">Cancelar</button>
      </div>
    </div>`;
}

function updateRoomOptions() {
    const type = document.getElementById('ci-type').value;
    const roomSel = document.getElementById('ci-room');
    const bedGroup = document.getElementById('ci-bed-group');
    const rate = document.getElementById('ci-rate');
    
    if(type==='privada') {
        roomSel.innerHTML = [1,2,3,4,5,6,7,8].map(n=>`<option>Habitación ${n}</option>`).join('');
        bedGroup.style.display='none';
        rate.value=45;
    } else if(type==='compartida') {
        roomSel.innerHTML = ['Dormitorio A','Dormitorio B','Dormitorio C'].map(r=>`<option>${r}</option>`).join('');
        bedGroup.style.display='';
        rate.value=15;
    } else {
        roomSel.innerHTML='<option>Selecciona tipo primero</option>';
        bedGroup.style.display='none';
    }
    calcNights();
}

function calcNights() {
    const ci=document.getElementById('ci-checkin').value;
    const co=document.getElementById('ci-checkout').value;
    const rate=parseFloat(document.getElementById('ci-rate').value)||0;
    const tax=parseFloat(document.getElementById('ci-tax').value)||0;
    
    if(ci&&co){
        const d=(new Date(co)-new Date(ci))/(86400000);
        if(d>0){
            document.getElementById('ci-nights').value=d+' noche'+(d>1?'s':'');
            const subtotal = d*rate;
            document.getElementById('ci-total').value='$'+(subtotal+tax).toFixed(2);
            calcPending();
        } else {
            document.getElementById('ci-nights').value='';
            document.getElementById('ci-total').value='';
        }
    }
}

function togglePaymentType() {
    const isAdelanto = document.getElementById('pay-adelanto').checked;
    document.getElementById('adelanto-input').style.display = isAdelanto ? 'block' : 'none';
    document.getElementById('pending-display').style.display = isAdelanto ? 'block' : 'none';
    calcPending();
}

function calcPending() {
    const totalText = document.getElementById('ci-total').value || '$0';
    const total = parseFloat(totalText.replace('$','')) || 0;
    const adelanto = parseFloat(document.getElementById('ci-adelanto-amount').value) || 0;
    const pending = total - adelanto;
    
    if(pending >= 0) {
        document.getElementById('pending-display').innerHTML = 
            `Pago pendiente: <span style="color:var(--red);font-weight:700;">$${pending.toFixed(2)}</span>`;
    }
}

function handleBoletaUpload(input) {
    if(input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            boletaFile = e.target.result;
            document.getElementById('boleta-preview').src = boletaFile;
            document.getElementById('boleta-preview').style.display = 'block';
            document.getElementById('boleta-text').textContent = '✓ Boleta cargada';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function submitCheckin() {
    let valid=true;
    
    function req(id,errId){ 
        const v=document.getElementById(id).value; 
        if(!v){ 
            document.getElementById(errId).classList.add('show'); 
            valid=false; 
        } else { 
            document.getElementById(errId).classList.remove('show'); 
        } 
        return v; 
    }
    
    const name=req('ci-name','err-name');
    const type=req('ci-type','err-type');
    const room=req('ci-room','err-room');
    const ci=req('ci-checkin','err-checkin');
    const co=req('ci-checkout','err-checkout');
    
    if(!valid) return;
    
    const nights=parseInt((document.getElementById('ci-nights').value||'1'));
    const rate=parseFloat(document.getElementById('ci-rate').value)||0;
    const tax=parseFloat(document.getElementById('ci-tax').value)||0;
    const total=(nights*rate)+tax;
    const bed=document.getElementById('ci-bed')?.value||'';
    const paymentMethod=document.querySelector('input[name="ci-payment"]:checked')?.value||'Efectivo';
    const paymentType = document.querySelector('input[name="ci-payment-type"]:checked')?.value || 'completo';
    
    let paidAmount = total;
    let pendingAmount = 0;
    
    if(paymentType === 'adelanto') {
        paidAmount = parseFloat(document.getElementById('ci-adelanto-amount').value) || 0;
        pendingAmount = total - paidAmount;
    }
    
    const newGuest={
        id:Date.now(),
        name,
        email:document.getElementById('ci-email').value,
        room,
        bed,
        checkin:ci,
        checkout:co,
        nights:nights||1,
        total,
        tax,
        status:'checkin-hoy',
        avatar:name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(),
        color:'#1ABDA0',
        paidAmount,
        pendingAmount,
        paymentType,
        paymentMethod,
        boleta:boletaFile
    };
    
    // Agregar a guests (usando variable global)
    if (typeof guests !== 'undefined') {
        guests.push(newGuest);
    }
    
    // Registrar movimiento
    if (typeof movements !== 'undefined') {
        movements.unshift({
            date:new Date().toLocaleDateString('es-PA')+ ' ' + new Date().toLocaleTimeString('es-PA',{hour:'2-digit',minute:'2-digit'}),
            desc:`Check-in ${name} — ${room}`,
            type:'ingreso',
            method:paymentMethod,
            amount:paidAmount,
            category:'reserva'
        });
    }
    
    // Si hay pago pendiente, agregar tarea de lavandería si aplica
    if(pendingAmount > 0 && room.includes('Dorm') && typeof tasks !== 'undefined') {
        tasks.push({
            id: Date.now(),
            title: `Lavandería - ${name}`,
            assigned: "Sin asignar",
            time: "09:00 AM",
            location: room,
            priority: "medio",
            done: false,
            type: "laundry",
            guestName: name,
            amount: 5,
            room: room
        });
    }
    
    showToast('✓ Check-in registrado correctamente');
    boletaFile = null;
    navigate('dashboard');
}

// =====================================================
// EDICIÓN DE RESERVAS
// =====================================================

function openGuestModal(id) {
    // Buscar en guests global o en base de datos
    const g = typeof guests !== 'undefined' ? guests.find(x=>x.id===id) : null;
    if(!g) return;
    
    openModal('Detalle del huésped',
        `<div class="guest-modal-top">
      <div class="guest-modal-avatar" style="background:${g.color}">${g.avatar}</div>
      <div><div style="font-size:1rem;font-weight:700">${g.name}</div><div style="font-size:0.78rem;color:var(--text2)">${g.email}</div></div>
    </div>
    <div>
      ${[['Habitación',g.room+(g.bed?' · '+g.bed:'')],['Check-in',g.checkin],['Check-out',g.checkout],['Noches',g.nights],['Total','$'+g.total],['Impuesto','$'+(g.tax||0)],['Pagado','$'+g.paidAmount],['Pendiente','<span style="color:'+(g.pendingAmount>0?'var(--red)':'var(--accent)')+'">$'+g.pendingAmount+'</span>'],['Método',g.paymentMethod||'-'],['Tipo pago',g.paymentType==='completo'?'Completo':g.paymentType==='adelanto'?'Adelanto':'Pendiente'],['Estado',statusBadge(g.status)]].map(([l,v])=>`
        <div class="guest-detail-row"><span class="guest-detail-label">${l}</span><span class="guest-detail-val">${v}</span></div>`).join('')}
      ${g.boleta ? `<div style="margin-top:12px"><img src="${g.boleta}" style="max-width:100%;border-radius:8px;"></div>` : ''}
    </div>`,
        `<button class="btn btn-ghost" onclick="closeModal()">Cerrar</button>
     <button class="btn btn-ghost" onclick="closeModal();openEditReservationModal(${g.id})">✏ Editar reserva</button>
     ${g.pendingAmount > 0 ? `<button class="btn btn-accent" onclick="closeModal();openPaymentModal(${g.id})">💵 Registrar pago</button>` : ''}`
    );
}

function openEditReservationModal(id) {
    const g = typeof guests !== 'undefined' ? guests.find(x=>x.id===id) : null;
    if(!g) return;
    
    openModal('Editar reserva - ' + g.name,
        `<div class="form-group">
      <label class="form-label">Nombre</label>
      <input class="form-input" id="edit-name" value="${g.name}">
    </div>
    <div class="form-group">
      <label class="form-label">Email</label>
      <input class="form-input" id="edit-email" value="${g.email}">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Check-in</label>
        <input class="form-input" id="edit-checkin" value="${g.checkin}">
      </div>
      <div class="form-group">
        <label class="form-label">Check-out</label>
        <input class="form-input" id="edit-checkout" value="${g.checkout}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Total</label>
      <input class="form-input" id="edit-total" type="number" value="${g.total}" onchange="updateEditPending(${g.id})">
    </div>
    <div class="form-group">
      <label class="form-label">Impuesto</label>
      <input class="form-input" id="edit-tax" type="number" value="${g.tax||0}" onchange="updateEditPending(${g.id})">
    </div>
    <div class="edit-payment-section">
      <div class="form-group">
        <label class="form-label">Monto pagado</label>
        <input class="form-input" id="edit-paid" type="number" value="${g.paidAmount}" onchange="updateEditPending(${g.id})">
      </div>
      <div style="display:flex;gap:12px;margin-top:10px;">
        <label class="radio-label"><input type="radio" name="edit-payment-type" value="completo" ${g.paymentType==='completo'?'checked':''} onchange="toggleEditPaymentType()"> Pago Completo</label>
        <label class="radio-label"><input type="radio" name="edit-payment-type" value="adelanto" ${g.paymentType==='adelanto'?'checked':''} onchange="toggleEditPaymentType()"> Adelanto</label>
      </div>
      <div id="edit-pending-display" style="margin-top:10px;font-size:1rem;" class="pending-edit">
        Pendiente: $${g.pendingAmount}
      </div>
    </div>`,
        `<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-accent" onclick="saveEditReservation(${g.id})">Guardar cambios</button>`
    );
}

function updateEditPending(id) {
    const g = typeof guests !== 'undefined' ? guests.find(x=>x.id===id) : null;
    if(!g) return;
    
    const total = parseFloat(document.getElementById('edit-total').value) || 0;
    const tax = parseFloat(document.getElementById('edit-tax').value) || 0;
    const paid = parseFloat(document.getElementById('edit-paid').value) || 0;
    const pending = total + tax - paid;
    
    document.getElementById('edit-pending-display').innerHTML = 
        `Pendiente: <span style="color:var(--red)">$${pending}</span>`;
}

function toggleEditPaymentType() {
    // Lógica manejada en save
}

function saveEditReservation(id) {
    const g = typeof guests !== 'undefined' ? guests.find(x=>x.id===id) : null;
    if(!g) return;
    
    g.name = document.getElementById('edit-name').value;
    g.email = document.getElementById('edit-email').value;
    g.checkin = document.getElementById('edit-checkin').value;
    g.checkout = document.getElementById('edit-checkout').value;
    g.total = parseFloat(document.getElementById('edit-total').value) || 0;
    g.tax = parseFloat(document.getElementById('edit-tax').value) || 0;
    g.paidAmount = parseFloat(document.getElementById('edit-paid').value) || 0;
    g.paymentType = document.querySelector('input[name="edit-payment-type"]:checked')?.value || 'pendiente';
    g.pendingAmount = g.total + g.tax - g.paidAmount;
    
    closeModal();
    showToast('✓ Reserva actualizada correctamente');
    
    if (typeof renderReservas === 'function') renderReservas();
}

function openPaymentModal(id) {
    const g = typeof guests !== 'undefined' ? guests.find(x=>x.id===id) : null;
    if(!g) return;
    
    openModal('Registrar pago - ' + g.name,
        `<div style="text-align:center;margin-bottom:16px;">
      <div style="font-size:0.8rem;color:var(--text2);margin-bottom:4px;">Monto pendiente</div>
      <div style="font-size:1.8rem;font-weight:700;color:var(--red);">$${g.pendingAmount}</div>
    </div>
    <div class="form-group">
      <label class="form-label">Monto a pagar *</label>
      <input class="form-input" id="payment-amount" type="number" max="${g.pendingAmount}" value="${g.pendingAmount}">
    </div>
    <div class="form-group">
      <label class="form-label">Método de pago</label>
      <select class="form-select" id="payment-method">
        <option value="Efectivo">Efectivo</option>
        <option value="Tarjeta">Tarjeta</option>
        <option value="Transferencia">Transferencia</option>
      </select>
    </div>`,
        `<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-accent" onclick="processPayment(${g.id})">Registrar pago</button>`
    );
}

function processPayment(id) {
    const g = typeof guests !== 'undefined' ? guests.find(x=>x.id===id) : null;
    if(!g) return;
    
    const amount = parseFloat(document.getElementById('payment-amount').value) || 0;
    const method = document.getElementById('payment-method').value;
    
    if(amount <= 0 || amount > g.pendingAmount) {
        showToast('Monto inválido', 'error');
        return;
    }
    
    g.paidAmount += amount;
    g.pendingAmount = g.total + g.tax - g.paidAmount;
    g.paymentMethod = method;
    
    if(g.pendingAmount <= 0) {
        g.paymentType = 'completo';
    } else {
        g.paymentType = 'adelanto';
    }
    
    // Registrar en movimientos
    if (typeof movements !== 'undefined') {
        movements.unshift({
            date: new Date().toLocaleDateString('es-PA') + ' ' + new Date().toLocaleTimeString('es-PA',{hour:'2-digit',minute:'2-digit'}),
            desc: `Pago ${g.name} - ${g.room}`,
            type: 'ingreso',
            method: method,
            amount: amount,
            category: 'reserva'
        });
    }
    
    closeModal();
    showToast(`✓ Pago de $${amount} registrado`);
    
    if (typeof renderReservas === 'function') renderReservas();
}

// =====================================================
// HELPERS DE UI
// =====================================================

function statusBadge(s) {
    const m = {
        'checkin-hoy':'<span class="badge badge-blue">Check-in hoy</span>',
        'sale-hoy':'<span class="badge badge-amber">Sale hoy</span>',
        'in-house':'<span class="badge badge-accent">In-house</span>',
        'confirmada':'<span class="badge badge-accent-outline">Confirmada</span>',
        'booking':'<span class="badge badge-blue-outline">Booking.com</span>',
        'pago-pendiente':'<span class="badge badge-red">Pago pendiente</span>',
        'checked-out':'<span class="badge badge-gray">Checked-out</span>'
    };
    return m[s]||`<span class="badge badge-gray">${s}</span>`;
}

// Exponer funciones globalmente
window.renderCheckin = renderCheckin;
window.updateRoomOptions = updateRoomOptions;
window.calcNights = calcNights;
window.togglePaymentType = togglePaymentType;
window.calcPending = calcPending;
window.handleBoletaUpload = handleBoletaUpload;
window.submitCheckin = submitCheckin;
window.openGuestModal = openGuestModal;
window.openEditReservationModal = openEditReservationModal;
window.updateEditPending = updateEditPending;
window.toggleEditPaymentType = toggleEditPaymentType;
window.saveEditReservation = saveEditReservation;
window.openPaymentModal = openPaymentModal;
window.processPayment = processPayment;
window.resetReservationForm = resetReservationForm;
