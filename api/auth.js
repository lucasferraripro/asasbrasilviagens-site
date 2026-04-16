/**
 * POST /api/auth
 * Valida a senha do admin contra ADMIN_SECRET do Vercel.
 * Usado pelo login.html para autenticação server-side (sem hardcode no frontend).
 */
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).end();

    let body;
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        if (!body) {
            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            body = JSON.parse(Buffer.concat(chunks).toString());
        }
    } catch {
        return res.status(400).json({ ok: false });
    }

    const { secret } = body;
    const adminSecret = process.env.ADMIN_SECRET || 'AsasBrasil@2025';
    const ok = secret === adminSecret;
    return res.status(ok ? 200 : 401).json({ ok });
}
