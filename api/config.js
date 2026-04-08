module.exports = function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!serviceKey) {
        return res.status(500).json({ error: 'SUPABASE_SERVICE_KEY no configurada en variables de entorno de Vercel' });
    }

    // No cachear — la key no debe quedar en caches intermedios
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.status(200).json({ serviceKey });
};
