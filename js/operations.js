// =====================================================
// OPERACIONES / TAREAS - VERSIÓN FUSIÓN
// Zuquix PMS: Supabase + Funcionalidades HTML Nuevas
// =====================================================

// =====================================================
// RENDER PRINCIPAL DE TAREAS (adaptado del HTML nuevo)
// =====================================================

let tareasFilter = 'todas';

async function renderTareas() {
    const c = document.getElementById('page-content');
    if (!c) return;
    
    // Mostrar skeleton mientras carga
    c.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <div class="skeleton" style="width:300px;height:40px;border-radius:20px;"></div>
            <div class="skeleton" style="width:100px;height:36px;border-radius:8px;"></div>
        </div>
        <div class="skeleton" style="height:120px;border-radius:14px;margin-bottom:12px;"></div>
        <div class="skeleton" style="height:120px;border-radius:14px;margin-bottom:12px;"></div>
        <div class="skeleton" style="height:120px;border-radius:14px;"></div>
    `;
    
    const isAdmin = currentProfile?.role === 'admin';
    
    try {
        // Consulta base
        let query = db
            .from('tasks')
            .select('*, room:room_id(number, name), assigned:assigned_to(full_name)')
            .order('priority', { ascending: false })
            .order('due_date');
            
        // Filtros según selección
        if (tareasFilter === 'pendientes') {
            query = query.eq('status', 'pending');
        } else if (tareasFilter === 'completadas') {
            query = query.eq('status', 'completed');
        } else if (tareasFilter === 'laundry') {
            query = query.eq('type', 'laundry').eq('status', 'pending');
        } else {
            // 'todas' - mostrar solo pendientes por defecto
            query = query.eq('status', 'pending');
        }
            
        const { data: tasksData, error } = await query;
        if (error) throw error;
        
        const pending = tasksData?.filter(t => t.status === 'pending').length || 0;
        const done = tasksData?.filter(t => t.status === 'completed').length || 0;
        const laundryCount = tasksData?.filter(t => t.type === 'laundry' && t.status === 'pending').length || 0;
        
        // Renderizar filtros y lista
        c.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
                <div class="filter-tabs" style="margin:0">
                    <div class="filter-tab ${tareasFilter==='todas'?'active':''}" onclick="setTareasFilter('todas')">Todas</div>
                    <div class="filter-tab ${tareasFilter==='pendientes'?'active':''}" onclick="setTareasFilter('pendientes')">Pendientes <span style="background:var(--amber);color:#1a1a1a;border-radius:999px;padding:0 5px;font-size:0.65rem;font-weight:700">${pending}</span></div>
                    <div class="filter-tab ${tareasFilter==='laundry'?'active':''}" onclick="setTareasFilter('laundry')">Lavandería ${laundryCount > 0 ? `<span style="background:var(--purple);color:#fff;border-radius:999px;padding:0 5px;font-size:0.65rem;font-weight:700">${laundryCount}</span>` : ''}</div>
                    <div class="filter-tab ${tareasFilter==='completadas'?'active':''}" onclick="setTareasFilter('completadas')">Completadas <span style="opacity:0.6">${done}</span></div>
                </div>
                ${isAdmin ? `<button class="btn btn-accent btn-sm" onclick="openNewTaskModal()">+ Nueva tarea</button>` : ''}
            </div>
            <div id="tasks-list">
                ${tasksData?.length ? tasksData.map((t, index) => renderTaskItem(t, index)).join('') : renderEmptyState()}
            </div>
        `;
        
        // Cargar historial solo para admin
        if (isAdmin) {
            loadCleaningHistory();
            loadReports();
        }
        
    } catch (err) {
        console.error('Error tareas:', err);
        c.innerHTML = '<p class="text-muted">Error al cargar tareas</p>';
    }
}

function renderTaskItem(t, index) {
    const isLaundry = t.type === 'laundry';
    const isDone = t.status === 'completed';
    
    // Mapear prioridades del sistema antiguo al nuevo
    const priorityMap = {
        'high': 'urgente',
        'medium': 'medio', 
        'low': 'bajo',
        'urgente': 'urgente',
        'medio': 'medio',
        'bajo': 'bajo'
    };
    const priority = priorityMap[t.priority] || 'medio';
    
    // Estilos según tipo
    const cardStyle = isLaundry && !isDone 
        ? 'border-left: 3px solid var(--purple);' 
        : '';
    
    return `
        <div class="task-card priority-${t.priority} ${isDone ? 'done' : ''}" 
             style="animation-delay: ${index * 0.05}s; ${cardStyle}">
            <div class="task-header">
                <span class="task-title">
                    ${isLaundry ? '🧺' : '🛏️'} ${esc(t.title)}
                </span>
                <span class="task-room">${esc(t.room?.name || t.room || '')}</span>
            </div>
            ${t.description ? `<p class="task-description">${esc(t.description)}</p>` : ''}
            ${isLaundry && t.amount ? `<p style="color:var(--purple);font-weight:600;">💵 $${t.amount}</p>` : ''}
            <div class="task-meta">
                <span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 4px;">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    ${esc(t.assigned_to_name || t.assigned?.full_name || 'Sin asignar')}
                </span>
                <span>${priorityBadge(priority)}</span>
            </div>
            <div class="task-actions">
                ${!isDone ? `
                    <button onclick="showCompleteTaskModal('${t.id}')" class="btn btn-success btn-small">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;">
                            <path d="M20 6L9 17l-5-5"/>
                        </svg>
                        Completar
                    </button>
                ` : ''}
                ${currentProfile?.role === 'admin' ? `
                    <button onclick="openEditTaskModal('${t.id}')" class="btn btn-ghost btn-small">✏ Editar</button>
                    <button onclick="deleteTask('${t.id}')" class="btn btn-danger btn-small">🗑 Eliminar</button>
                ` : ''}
            </div>
        </div>
    `;
}

function priorityBadge(p) {
    if (p === 'urgente') return '<span class="badge badge-red">Urgente</span>';
    if (p === 'medio') return '<span class="badge badge-amber">Medio</span>';
    if (p === 'bajo') return '<span class="badge badge-gray">Bajo</span>';
    if (p === 'hecho') return '<span class="badge badge-accent">Hecho</span>';
    return `<span class="badge badge-gray">${p}</span>`;
}

function renderEmptyState() {
    return `
        <div style="text-align: center; padding: var(--space-10) var(--space-4); color: var(--gray-400);">
            <div style="font-size: 3rem; margin-bottom: var(--space-3);">🎉</div>
            <div style="font-weight: 600;">Sin tareas pendientes</div>
            <div style="font-size: 0.875rem; margin-top: var(--space-2);">¡Todo está al día!</div>
        </div>
    `;
}

function setTareasFilter(f) { 
    tareasFilter = f; 
    renderTareas(); 
}

// =====================================================
// NUEVA TAREA CON SISTEMA DE TIPOS (HTML nuevo)
// =====================================================

function openNewTaskModal(prefill = null) {
    const isEdit = !!prefill;
    const modal = document.getElementById('add-task-modal');
    
    // Actualizar título y campos del modal existente
    const titleEl = document.getElementById('add-task-title');
    if (titleEl) titleEl.textContent = isEdit ? 'Editar tarea' : 'Nueva tarea';
    
    // Llenar campos si es edición
    if (isEdit) {
        document.getElementById('new-task-title').value = prefill.title || '';
        document.getElementById('new-task-description').value = prefill.description || '';
        document.getElementById('new-task-assigned').value = prefill.assigned_to_name || '';
        document.getElementById('new-task-priority').value = prefill.priority || 'medium';
        document.getElementById('new-task-type').value = prefill.type || 'housekeeping';
        
        // Mostrar/ocultar campos de laundry
        toggleTaskTypeFields(prefill.type === 'laundry');
        
        if (prefill.type === 'laundry') {
            document.getElementById('laundry-guest-name').value = prefill.guest_name || '';
            document.getElementById('laundry-amount').value = prefill.amount || '';
            document.getElementById('laundry-room').value = prefill.room || '';
        }
        
        // Guardar ID para edición
        modal.dataset.editId = prefill.id;
    } else {
        document.getElementById('add-task-form')?.reset();
        toggleTaskTypeFields(false);
        delete modal.dataset.editId;
    }
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function toggleTaskTypeFields(showLaundry) {
    const laundryFields = document.getElementById('laundry-fields-container');
    if (laundryFields) {
        laundryFields.style.display = showLaundry ? 'block' : 'none';
    }
}

// Listener para cambio de tipo
document.addEventListener('DOMContentLoaded', () => {
    const typeSelect = document.getElementById('new-task-type');
    if (typeSelect) {
        typeSelect.addEventListener('change', (e) => {
            toggleTaskTypeFields(e.target.value === 'laundry');
        });
    }
});

async function saveNewTask() {
    const isEdit = document.getElementById('add-task-modal')?.dataset.editId;
    const title = document.getElementById('new-task-title')?.value?.trim();
    const description = document.getElementById('new-task-description')?.value?.trim() || null;
    const assignedTo = document.getElementById('new-task-assigned')?.value?.trim();
    const priorityRaw = document.getElementById('new-task-priority')?.value || 'medium';
    const taskType = document.getElementById('new-task-type')?.value || 'housekeeping';

    if (!title || !assignedTo) {
        showToast('Título y "Asignado a" son obligatorios', 'error');
        return;
    }

    // Mapear prioridad
    const priorityMap = {
        'low': 'low', 'medium': 'medium', 'high': 'high',
        'baja': 'low', 'media': 'medium', 'alta': 'high',
        'bajo': 'low', 'medio': 'medium', 'alto': 'high'
    };
    const priority = priorityMap[priorityRaw.toLowerCase()] || 'medium';

    try {
        const taskData = {
            title,
            description,
            room_id: null,
            assigned_to_name: assignedTo,
            priority,
            status: 'pending',
            type: taskType,
            due_date: new Date().toISOString(),
            created_by: currentUser.id
        };

        // Campos específicos para laundry
        if (taskType === 'laundry') {
            taskData.guest_name = document.getElementById('laundry-guest-name')?.value?.trim();
            taskData.amount = parseFloat(document.getElementById('laundry-amount')?.value) || 0;
            taskData.room = document.getElementById('laundry-room')?.value?.trim();
        }

        let error;
        if (isEdit) {
            // Actualizar
            ({ error } = await db.from('tasks').update(taskData).eq('id', isEdit));
        } else {
            // Crear nuevo
            taskData.created_at = new Date().toISOString();
            ({ error } = await db.from('tasks').insert([taskData]));
        }

        if (error) throw error;
        
        showToast(isEdit ? '✅ Tarea actualizada' : '✅ Tarea creada exitosamente', 'success');
        closeAddTaskModal();
        renderTareas();
    } catch (err) {
        console.error('Error guardando tarea:', err);
        showToast('Error: ' + err.message, 'error');
    }
}

// =====================================================
// EDITAR TAREA (nueva función del HTML)
// =====================================================

async function openEditTaskModal(id) {
    try {
        const { data: task, error } = await db
            .from('tasks')
            .select('*')
            .eq('id', id)
            .single();
            
        if (error) throw error;
        if (!task) {
            showToast('Tarea no encontrada', 'error');
            return;
        }
        
        openNewTaskModal(task);
    } catch (err) {
        console.error('Error cargando tarea:', err);
        showToast('Error al cargar tarea', 'error');
    }
}

// =====================================================
// COMPLETAR TAREA (adaptado del original)
// =====================================================

let pendingCompleteTaskId = null;

function showCompleteTaskModal(taskId) {
    pendingCompleteTaskId = taskId;
    const modal = document.getElementById('complete-task-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
    const input = document.getElementById('completed-by-name');
    if (input) { 
        input.value = ''; 
        setTimeout(() => input.focus(), 100);
    }
}

function closeCompleteTaskModal() {
    const modal = document.getElementById('complete-task-modal');
    if (modal) {
        modal.style.animation = 'slideDownModal 0.3s ease forwards';
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.style.animation = '';
            document.body.style.overflow = '';
        }, 300);
    }
    const input = document.getElementById('completed-by-name');
    if (input) input.value = '';
    pendingCompleteTaskId = null;
}

async function confirmCompleteTask() {
    const completedByName = document.getElementById('completed-by-name')?.value?.trim();
    if (!completedByName) {
        showToast('Ingresa el nombre de quien realizó la tarea', 'error');
        return;
    }

    try {
        // Obtener la tarea para ver si es laundry con monto
        const { data: task } = await db
            .from('tasks')
            .select('*')
            .eq('id', pendingCompleteTaskId)
            .single();

        const { error } = await db.from('tasks').update({
            status: 'completed',
            completed_by_name: completedByName,
            completed_at: new Date().toISOString(),
            completed_by: currentUser.id
        }).eq('id', pendingCompleteTaskId);

        if (error) throw error;
        
        // Si es laundry completada, registrar ingreso automático
        if (task?.type === 'laundry' && task?.amount > 0) {
            await registerLaundryIncome(task, completedByName);
        }
        
        showToast('✅ Tarea completada', 'success');
        closeCompleteTaskModal();
        renderTareas();
    } catch (err) {
        console.error('Error completando tarea:', err);
        showToast('Error: ' + err.message, 'error');
    }
}

// =====================================================
// REGISTRO AUTOMÁTICO DE INGRESO POR LAVANDERÍA
// =====================================================

async function registerLaundryIncome(task, completedBy) {
    try {
        const { error } = await db.from('movements').insert([{
            date: new Date().toLocaleDateString('es-PA') + ' ' + new Date().toLocaleTimeString('es-PA', {hour:'2-digit',minute:'2-digit'}),
            desc: `Lavandería completada - ${task.guest_name || 'Huésped'} (${completedBy})`,
            type: 'ingreso',
            method: 'Efectivo',
            amount: task.amount,
            category: 'laundry',
            created_by: currentUser.id,
            created_at: new Date().toISOString()
        }]);
        
        if (error) console.error('Error registrando ingreso laundry:', error);
    } catch (err) {
        console.error('Error en registerLaundryIncome:', err);
    }
}

// =====================================================
// HISTORIAL DE LIMPIEZA (adaptado del original)
// =====================================================

async function loadCleaningHistory() {
    const section = document.getElementById('cleaning-history-section');
    if (!section) return;

    const isAdmin = currentProfile?.role === 'admin';
    if (!isAdmin) { section.classList.add('hidden'); return; }

    section.classList.remove('hidden');
    const list = document.getElementById('cleaning-history-list');
    if (!list) return;
    
    list.innerHTML = `
        <div class="skeleton" style="height: 70px; border-radius: var(--radius-lg); margin-bottom: var(--space-3);"></div>
        <div class="skeleton" style="height: 70px; border-radius: var(--radius-lg);"></div>
    `;

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
            const icon = t.type === 'laundry' ? '🧺' : '🛏️';
            const amountBadge = t.amount ? `<span style="color:var(--purple);font-weight:600;">💵 $${t.amount}</span>` : '';
            
            return `
                <div class="cleaning-history-card" style="animation-delay: ${index * 0.03}s;">
                    <div class="cleaning-history-title">
                        <span>${icon}</span>
                        ${esc(t.title)}
                    </div>
                    <div class="cleaning-history-meta">
                        <span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 4px;">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            ${esc(t.completed_by_name || 'Desconocido')}
                        </span>
                        <span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 4px;">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            ${esc(completedAt)}
                        </span>
                        ${amountBadge}
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
// ELIMINAR TAREA (adaptado)
// =====================================================

async function deleteTask(id) {
    if (!confirm('⚠️ ¿Eliminar esta tarea permanentemente?')) return;
    try {
        const { error } = await db.from('tasks').delete().eq('id', id);
        if (error) throw error;
        showToast('Tarea eliminada', 'success');
        renderTareas();
    } catch (err) {
        console.error('Error deleting task:', err);
        showToast('Error al eliminar: ' + err.message, 'error');
    }
}

// =====================================================
// REPORTES (mantenido del original)
// =====================================================

async function loadReports() {
    const container = document.getElementById('reports-list');
    if (!container) return;
    
    container.innerHTML = `
        <div class="skeleton" style="height: 150px; border-radius: var(--radius-lg); margin-bottom: var(--space-3);"></div>
        <div class="skeleton" style="height: 150px; border-radius: var(--radius-lg);"></div>
    `;

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
                    <div style="font-size: 0.875rem; margin-top: var(--space-2);">Todo está funcionando correctamente</div>
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
                        <span style="color:${color}; font-weight:700; font-size:0.875rem; display: flex; align-items: center; gap: var(--space-2);">
                            ${label}
                        </span>
                        <span style="font-size:0.75rem; color:var(--gray-400); font-weight: 500;">${esc(fecha)}</span>
                    </div>
                    <div style="font-weight:700; margin: var(--space-2) 0; font-size: 1rem; color: var(--gray-900);">${esc(r.title)}</div>
                    <div style="font-size:0.875rem; color:var(--gray-600); margin-bottom:var(--space-4); line-height: 1.5;">${esc(r.description)}</div>
                    ${r.photo_url ? `<img src="${esc(r.photo_url)}" alt="Foto del reporte" style="width: 100%; max-height: 200px; object-fit: cover; border-radius: var(--radius-lg); margin-bottom: var(--space-4); box-shadow: var(--shadow-sm);">` : ''}
                    ${isAdmin ? `
                        <button onclick="markReportDone('${r.id}')" class="btn btn-success btn-small">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;">
                                <path d="M20 6L9 17l-5-5"/>
                            </svg>
                            Completado
                        </button>
                    ` : ''}
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('Error reportes:', err);
        container.innerHTML = '<p class="text-muted">Error al cargar reportes</p>';
    }
}

// ... (mantener el resto de funciones de reportes igual que tu original)

// =====================================================
// FUNCIÓN GLOBAL: Crear tarea de lavandería desde Caja
// =====================================================

async function createLaundryTaskFromCaja(guestName, room, amount) {
    try {
        const { data, error } = await db.from('tasks').insert([{
            title: `Lavandería - ${guestName}`,
            assigned_to_name: "Sin asignar",
            time: new Date().toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' }),
            room: room,
            priority: 'medium',
            status: 'pending',
            type: 'laundry',
            guest_name: guestName,
            amount: amount,
            due_date: new Date().toISOString(),
            created_by: currentUser.id,
            created_at: new Date().toISOString()
        }]).select();
        
        if (error) throw error;
        
        // Recargar si estamos en tareas
        if (document.getElementById('page-content') && currentPage === 'tareas') {
            renderTareas();
        }
        
        // Actualizar badge
        updateTaskBadge?.();
        
        return data?.[0];
    } catch (err) {
        console.error('Error creando tarea laundry:', err);
        showToast('Error al crear tarea de lavandería', 'error');
        return null;
    }
}

// Exponer globalmente para uso en caja.js
window.createLaundryTaskFromCaja = createLaundryTaskFromCaja;
window.renderTareas = renderTareas;
window.setTareasFilter = setTareasFilter;
window.openNewTaskModal = openNewTaskModal;
window.openEditTaskModal = openEditTaskModal;
window.saveNewTask = saveNewTask;
window.toggleTaskTypeFields = toggleTaskTypeFields;
window.deleteTask = deleteTask;
window.showCompleteTaskModal = showCompleteTaskModal;
window.closeCompleteTaskModal = closeCompleteTaskModal;
window.confirmCompleteTask = confirmCompleteTask;
window.loadCleaningHistory = loadCleaningHistory;
window.loadReports = loadReports;
