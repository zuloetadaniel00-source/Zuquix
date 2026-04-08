const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_KEY;
    const supabaseUrl = process.env.SUPABASE_URL;

    if (!serviceKey || !supabaseUrl) {
        return res.status(500).json({ error: 'Variables de entorno no configuradas' });
    }

    const { email, password, fullName, role, hostelId } = req.body;

    if (!email || !password || !fullName || !role || !hostelId) {
        return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const adminDb = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    // 1. Crear usuario con email ya confirmado
    const { data, error: createError } = await adminDb.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
    });

    if (createError) {
        return res.status(400).json({ error: createError.message });
    }

    const userId = data?.user?.id;
    if (!userId) {
        return res.status(500).json({ error: 'No se pudo obtener el ID del nuevo usuario' });
    }

    // 2. Upsert del perfil con hostel_id y rol
    const { error: profileError } = await adminDb
        .from('profiles')
        .upsert({ id: userId, email, full_name: fullName, role, hostel_id: hostelId }, { onConflict: 'id' });

    if (profileError) {
        return res.status(500).json({ error: profileError.message });
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ userId });
};
