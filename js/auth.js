// =====================================================
// AUTENTICACION — Multi-tenant Edition
// =====================================================

let authInitialized = false;

document.addEventListener('DOMContentLoaded', () => {
    if (authInitialized) return;
    authInitialized = true;

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    checkSession();
});

async function checkSession() {
    try {
        const { data: { session }, error } = await db.auth.getSession();

        if (session?.user) {
            showApp();
            loadUserProfile(session.user).catch(console.error);
        } else {
            showLogin();
        }
    } catch (error) {
        console.error('Session check error:', error);
        showLogin();
    }
}

async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');
    const btn = e.target.querySelector('button[type="submit"]');

    errorDiv.classList.remove('show');
    btn.disabled = true;
    btn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px; animation: spin 1s linear infinite;">
            <circle cx="12" cy="12" r="10" stroke-dasharray="60" stroke-dashoffset="20"></circle>
        </svg>
        Ingresando...
    `;

    try {
        const { data, error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;

        showApp();
        loadUserProfile(data.user).catch(console.error);

    } catch (error) {
        errorDiv.textContent = 'Email o contraseña incorrectos';
        errorDiv.classList.add('show');
        btn.disabled = false;
        btn.innerHTML = `
            <span>Ingresar</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 8px;">
                <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
        `;
    }
}

async function loadUserProfile(user) {
    currentUser = user;

    try {
        const { data: existing } = await db
            .from('profiles')
            .select('*, hostels(*)')
            .eq('id', user.id)
            .single();

        if (existing) {
            currentProfile = existing;
            window.currentHostel = existing.hostels || null;
            updateUIForRole();
            showDashboard();
            return;
        }

        // Crear perfil mínimo si no existe (volunteer sin hostel)
        const { data: profile, error: insertError } = await db
            .from('profiles')
            .insert([{
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || user.email,
                role: 'volunteer'
            }])
            .select()
            .single();

        if (!insertError) {
            currentProfile = profile;
            window.currentHostel = null;
            updateUIForRole();
            showDashboard();
        }

    } catch (error) {
        console.error('Profile error:', error);
        currentProfile = { role: 'volunteer', full_name: user.email };
        window.currentHostel = null;
        updateUIForRole();
        showDashboard();
    }
}

function updateUIForRole() {
    const roleBadge = document.getElementById('user-role');
    if (roleBadge) {
        roleBadge.textContent = currentProfile?.role === 'admin' ? 'Admin' : 'Voluntario';
        roleBadge.className = 'badge badge-' + currentProfile?.role;
    }

    // Mostrar nombre del hostel en el header
    const hostelNameEl = document.getElementById('hostel-name');
    if (hostelNameEl && window.currentHostel) {
        hostelNameEl.textContent = window.currentHostel.name;
        hostelNameEl.classList.remove('hidden');
    }

    if (currentProfile?.role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
        const adminCash = document.getElementById('admin-cash-actions');
        const volCash = document.getElementById('volunteer-cash-actions');
        if (adminCash) adminCash.classList.remove('hidden');
        if (volCash) volCash.classList.add('hidden');
    } else {
        document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
        const adminCash = document.getElementById('admin-cash-actions');
        const volCash = document.getElementById('volunteer-cash-actions');
        if (adminCash) adminCash.classList.add('hidden');
        if (volCash) volCash.classList.remove('hidden');
    }
}

async function logout() {
    await db.auth.signOut();
    currentUser = null;
    currentProfile = null;
    window.currentHostel = null;
    showLogin();
}

db.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
        showLogin();
    }
});

// =====================================================
// REGISTRO DE NUEVO HOSTEL (usado desde register.html)
// =====================================================

window.registerHostel = async function(hostelData, adminData) {
    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await db.auth.signUp({
        email: adminData.email,
        password: adminData.password,
        options: {
            data: { full_name: adminData.fullName }
        }
    });

    if (authError) throw authError;

    const userId = authData.user.id;

    // 2. Crear el hostel
    const slug = hostelData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        + '-' + Math.random().toString(36).slice(2, 6);

    const { data: hostel, error: hostelError } = await db
        .from('hostels')
        .insert({
            name: hostelData.name,
            slug: slug,
            email: adminData.email,
            phone: hostelData.phone || null,
            address: hostelData.address || null,
            city: hostelData.city || null,
            country: hostelData.country || 'PA',
            timezone: hostelData.timezone || 'America/Panama',
        })
        .select()
        .single();

    if (hostelError) throw hostelError;

    // 3. Crear perfil con role admin y hostel_id
    const { error: profileError } = await db
        .from('profiles')
        .insert({
            id: userId,
            email: adminData.email,
            full_name: adminData.fullName,
            role: 'admin',
            hostel_id: hostel.id
        });

    if (profileError) throw profileError;

    return { hostel, userId };
};

// =====================================================
// CREAR USUARIO EN EL HOSTEL
// =====================================================

window.createTeamUser = async function({ name, email, password, role }) {
    const hostelId = await window.getCurrentHostelId();
    if (!hostelId) throw new Error('No se encontró el hostel del administrador');

    // 1. Crear usuario en Supabase Auth
    const { data, error: signUpError } = await db.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } }
    });

    if (signUpError) throw new Error(signUpError.message);

    const userId = data?.user?.id;
    if (!userId) throw new Error('No se pudo obtener el ID del nuevo usuario');

    // 2. Vincular perfil al hostel con el rol indicado
    const { error: profileError } = await db
        .from('profiles')
        .update({ full_name: name, role, hostel_id: hostelId })
        .eq('id', userId);

    if (profileError) {
        // Si el trigger aún no creó el perfil, intentar upsert
        const { error: upsertError } = await db
            .from('profiles')
            .upsert({ id: userId, email, full_name: name, role, hostel_id: hostelId }, { onConflict: 'id' });
        if (upsertError) throw new Error(upsertError.message);
    }
};

window.logout = logout;
