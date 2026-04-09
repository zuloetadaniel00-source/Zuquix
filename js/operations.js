// =====================================================
// OPERACIONES / TAREAS - CON TIPO "LAUNDRY"
// Zuquix PMS - Adaptado del HTML de referencia
// =====================================================

let tareasFilter = 'todas';
let openTaskMenu = null;

// =====================================================
// RENDER PRINCIPAL DE TAREAS
// =====================================================

function renderTareas() {
    const c = document.getElementById('page-content');
    const pending = typeof tasks !== 'undefined' ? tasks.filter(t=>!t.done).length : 0;
    const done = typeof tasks !== 'undefined' ? tasks.filter(t=>t.done).length : 0;
    
    let list = typeof tasks !== 'undefined' ? tasks : [];
    if(tareasFilter==='pendientes') list=list.filter(t=>!t.done);
    else if(tareasFilter==='completadas') list=list.filter(t=>t.done);
    else if(tareasFilter==='laundry') list=list.filter(t=>t.type==='laundry' && !t.done);
    
    c.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div class="filter-tabs" style="margin:0">
        <div class="filter-tab ${tareasFilter==='todas'?'active':''}" onclick="setTareasFilter('todas')">Todas</div>
        <div class="filter-tab ${tareasFilter==='pendientes'?'active':''}" onclick="setTareasFilter('pendientes')">Pendientes <span style="background:var(--amber);color:#1a1a1a;border-radius:999px;padding:0 5px;font-size:0.65rem;font-weight:700">${pending}</span></div>
        <div class="filter-tab ${tareasFilter==='laundry'?'active':''}" onclick="setTareasFilter('laundry')">Lavandería</div>
        <div class="filter-tab ${tareasFilter==='completadas'?'active':''}" onclick="setTareasFilter('completadas')">Completadas <span style="opacity:0.6">${done}</span></div>
      </div>
      <button class="btn btn-accent btn-sm" onclick="openNewTaskModal()">+ Nueva tarea</button>
    </div>
    <div id="tasks-list">
      ${list.map(t=>renderTaskItem(t)).join('')}
    </div>`;
}

function renderTaskItem(t) {
    const isLaundry = t.type === 'laundry';
    return `<div class="task-item ${t.done?'done':''} ${isLaundry?'task-laundry':''}" id="task-${t.id}">
    <div class="task-checkbox ${t.done?'checked':''}" onclick="toggleTask(${t.id})">
      ${t.done?'✓':''}
    </div>
    <div class="task-info">
      <div class="task-title">${t.title}</div>
      <div class="task-sub">👤 ${t.assigned} · 🕐 ${t.time} · 📍 ${t.location}${isLaundry && t.amount ? ' · 💵 $'+t.amount : ''}</div>
    </div>
    ${priorityBadge(t.done?'hecho':t.priority)}
    <button class="task-menu-btn" onclick="toggleTaskMenu(event,${t.id})">···</button>
    <div class="task-menu-dropdown" id="tmenu-${t.id}" style="display:none">
      <div class="task-menu-opt" onclick="openEditTaskModal(${t.id})">✏ Editar</div>
      <div class="task-menu-opt del" onclick="deleteTask(${t.id})">🗑 Eliminar</div>
    </div>
  </div>`;
}

function priorityBadge(p) {
    if(p==='urgente') return '<span class="badge badge-red">Urgente</span>';
    if(p==='medio') return '<span class="badge badge-amber">Medio</span>';
    if(p==='hecho') return '<span class="badge badge-accent">Hecho</span>';
    return `<span class="badge badge-gray">${p}</span>`;
}

function toggleTask(id) {
    const t = typeof tasks !== 'undefined' ? tasks.find(x=>x.id===id) : null;
    if(t){ 
        t.done=!t.done; 
        t.priority=t.done?'hecho':t._prevPriority||'medio'; 
        if(!t.done&&t._prevPriority) t.priority=t._prevPriority; 
        if(!t.done) t._prevPriority=t.priority; 
    }
    updateTaskBadge(); 
    renderTareas();
}

function toggleTaskMenu(e, id) {
    e.stopPropagation();
    const el=document.getElementById('tmenu-'+id);
    if(!el) return;
    const wasOpen=el.style.display!=='none';
    document.querySelectorAll('.task-menu-dropdown').forEach(d=>d.style.display='none');
    el.style.display=wasOpen?'none':'block';
}

// Cerrar menús al hacer clic fuera
document.addEventListener('click',()=>{
    document.querySelectorAll('.task-menu-dropdown').forEach(d=>d.style.display='none');
});

function deleteTask(id) {
    if(confirm('¿Eliminar esta tarea?')){
        if (typeof tasks !== 'undefined') {
            tasks=tasks.filter(t=>t.id!==id);
        }
        updateTaskBadge(); 
        renderTareas(); 
    }
}

function setTareasFilter(f){ 
    tareasFilter=f; 
    renderTareas(); 
}

function updateTaskBadge() {
    const n = typeof tasks !== 'undefined' ? tasks.filter(t=>!t.done).length : 0;
    const badge=document.getElementById('tareas-badge');
    if(badge) badge.textContent=n;
}

// =====================================================
// NUEVA TAREA CON TIPO
// =====================================================

function openNewTaskModal(prefill) {
    openModal(prefill?'Editar tarea':'Nueva tarea',
        `<div class="form-group"><label class="form-label">Título *</label><input class="form-input" id="tk-title" value="${prefill?.title||''}"></div>
     <div class="form-row">
       <div class="form-group"><label class="form-label">Asignar a</label><select class="form-select" id="tk-assign">
         <option ${prefill?.assigned==='Sin asignar'?'selected':''}>Sin asignar</option>
         ${typeof team !== 'undefined' ? team.map(m=>`<option ${prefill?.assigned===m.name?'selected':''}>${m.name}</option>`).join('') : ''}
       </select></div>
       <div class="form-group"><label class="form-label">Hora</label><input class="form-input" id="tk-time" type="time" value="${prefill?.time?.replace(' AM','').replace(' PM','')||''}"></div>
     </div>
     <div class="form-group"><label class="form-label">Ubicación</label><input class="form-input" id="tk-loc" value="${prefill?.location||''}"></div>
     
     <!-- NUEVO: Selector de tipo -->
     <div class="form-group"><label class="form-label">Tipo</label><select class="form-select" id="tk-type" onchange="toggleTaskType()">
       <option value="housekeeping" ${prefill?.type==='housekeeping'||!prefill?'selected':''}>Housekeeping</option>
       <option value="maintenance" ${prefill?.type==='maintenance'?'selected':''}>Mantenimiento</option>
       <option value="laundry" ${prefill?.type==='laundry'?'selected':''}>Lavandería</option>
       <option value="otros" ${prefill?.type==='otros'?'selected':''}>Otros</option>
     </select></div>
     
     <!-- Campos específicos para laundry -->
     <div id="laundry-fields" style="display:${prefill?.type==='laundry'?'block':'none'};">
       <div class="form-row">
         <div class="form-group"><label class="form-label">Nombre huésped</label><input class="form-input" id="tk-guest" value="${prefill?.guestName||''}"></div>
         <div class="form-group"><label class="form-label">Monto ($)</label><input class="form-input" id="tk-amount" type="number" value="${prefill?.amount||''}"></div>
       </div>
       <div class="form-group"><label class="form-label">Habitación</label><input class="form-input" id="tk-room" value="${prefill?.room||''}"></div>
     </div>
     
     <div class="form-group"><label class="form-label">Prioridad</label><select class="form-select" id="tk-priority">
       <option value="urgente" ${prefill?.priority==='urgente'?'selected':''}>Urgente</option>
       <option value="medio" ${prefill?.priority==='medio'||!prefill?'selected':''}>Medio</option>
       <option value="bajo" ${prefill?.priority==='bajo'?'selected':''}>Bajo</option>
     </select></div>`,
        `<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-accent" onclick="saveTask(${prefill?.id||'null'})">Guardar</button>`
    );
}

function toggleTaskType() {
    const type = document.getElementById('tk-type').value;
    document.getElementById('laundry-fields').style.display = type === 'laundry' ? 'block' : 'none';
}

function openEditTaskModal(id){ 
    const t = typeof tasks !== 'undefined' ? tasks.find(t=>t.id===id) : null;
    openNewTaskModal(t); 
}

function saveTask(id) {
    const title=document.getElementById('tk-title').value;
    if(!title){ showToast('El título es requerido','error'); return; }
    
    const type = document.getElementById('tk-type').value;
    const newTask = {
        id: id&&id!=='null' ? id : Date.now(),
        title,
        assigned:document.getElementById('tk-assign').value,
        time:document.getElementById('tk-time').value,
        location:document.getElementById('tk-loc').value,
        type: type,
        priority:document.getElementById('tk-priority').value,
        done: id&&id!=='null' ? (typeof tasks !== 'undefined' ? tasks.find(t=>t.id===id)?.done : false) : false
    };
    
    // Campos específicos para laundry
    if(type === 'laundry') {
        newTask.guestName = document.getElementById('tk-guest').value;
        newTask.amount = parseFloat(document.getElementById('tk-amount').value) || 0;
        newTask.room = document.getElementById('tk-room').value;
    }
    
    if(id&&id!=='null') {
        const idx = typeof tasks !== 'undefined' ? tasks.findIndex(t=>t.id===id) : -1;
        if(idx >= 0 && typeof tasks !== 'undefined') tasks[idx] = {...tasks[idx], ...newTask};
    } else {
        if (typeof tasks !== 'undefined') tasks.push(newTask);
    }
    
    closeModal(); 
    updateTaskBadge(); 
    renderTareas(); 
    showToast('✓ Tarea guardada');
}

// =====================================================
// HISTORIAL DE LIMPIEZA (ADMIN)
// =====================================================

async function loadCleaningHistory() {
    const section = document.getElementById('cleaning-history-section');
    if (!section) return;

    const isAdmin = currentProfile?.role === 'admin';
    if (!isAdmin) { section.classList.add('hidden'); return; }

    section.classList.remove('hidden');
    const list = document.getElementById('cleaning-history-list');
    if (!list) return;
    
    // Cargar desde Supabase o datos locales
    try {
        const { data: completed, error } = await db
            .from('tasks')
            .select('*')
            .eq('status', 'completed')
            .order('completed_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        if (!completed?.length) {
            list.innerHTML = '<p class="text-muted">No hay tareas completadas aún.</p>';
            return;
        }

        list.innerHTML = completed.map((t, index) => {
            const completedAt = t.completed_at
                ? formatDateTime(t.completed_at)
                : '--';
            return `
                <div class="cleaning-history-card" style="animation-delay: ${index * 0.03}s;">
                    <div class="cleaning-history-title">
                        <span>${t.type === 'laundry' ? '🧺' : '🛏️'}</span>
                        ${esc(t.title)}
                    </div>
                    <div class="cleaning-history-meta">
                        <span>👤 ${esc(t.completed_by_name || 'Desconocido')}</span>
                        <span>🕐 ${esc(completedAt)}</span>
                        ${t.amount ? `<span>💵 $${t.amount}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('Error historial:', err);
        list.innerHTML = '<p class="text-muted">Error al cargar historial</p>';
    }
}

// =====================================================
// REPORTES
// =====================================================

async function loadReports() {
    const container = document.getElementById('reports-list');
    if (!container) return;
    
    const isAdmin = currentProfile?.role === 'admin';

    try {
        const { data: reports, error } = await db
            .from('reports')
            .select('*')
            .eq('status', 'open')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!reports?.length) {
            container.innerHTML = `
                <div style="text-align: center; padding: var(--space-10) var(--space-4); color: var(--gray-400);">
                    <div style="font-size: 3rem; margin-bottom: var(--space-3);">📋</div>
                    <div style="font-weight: 600;">No hay reportes abiertos</div>
                </div>
            `;
            return;
        }

        const urgencyColor = { watch: '#d97706', important: '#059669', urgent: '#dc2626' };
        const urgencyLabel = { watch: '🟡 Tener en cuenta', important: '🟢 Importante', urgent: '🔴 Urgente' };
        const urgencyBg = { watch: '#fffbeb', important: '#f0fdf4', urgent: '#fef2f2' };

        container.innerHTML = reports.map((r, index) => {
            const fecha = r.created_at ? formatDateTime(r.created_at) : '--';
            const color = urgencyColor[r.urgency] || '#6b7280';
            const label = urgencyLabel[r.urgency] || r.urgency;
            const bg = urgencyBg[r.urgency] || '#f9fafb';
            
            return `
                <div class="report-card" style="border-left-color: ${color}; background: linear-gradient(135deg, ${bg} 0%, var(--surface) 100%); animation-delay: ${index * 0.05}s;">
                    <div class="report-header">
                        <span style="color:${color}; font-weight:700; font-size:0.875rem;">${label}</span>
                        
