/**
 * POST /api/upload
 * Faz upload de imagem para o repositorio GitHub e retorna a URL publica.
 * Body JSON: { filename, base64, secret }
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
    } catch (_) {
        return res.status(400).json({ error: 'Body invalido' });
    }

    const { filename, base64, secret } = body;
    const adminSecret = process.env.ADMIN_SECRET || 'AsasBrasil@2025';
    if (secret !== adminSecret) return res.status(401).json({ error: 'Nao autorizado' });
    if (!filename || !base64) return res.status(400).json({ error: 'filename e base64 obrigatorios' });
    if (base64.length > 5 * 1024 * 1024) {
        return res.status(400).json({ error: 'Arquivo muito grande. Use imagem menor que 3MB.' });
    }

    const ext = (filename.split('.').pop() || '').toLowerCase();
    const allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    if (!allowed.includes(ext)) {
        return res.status(400).json({ error: 'Formato nao permitido. Use JPG, PNG, WEBP ou GIF.' });
    }

    const token = process.env.GITHUB_TOKEN;
    if (!token) return res.status(500).json({ error: 'GITHUB_TOKEN nao configurado no Vercel' });

    const owner = process.env.GITHUB_OWNER || 'lucasferraripro';
    const repo = process.env.GITHUB_REPO || 'asasbrasilviagens-site';
    const branch = process.env.GITHUB_BRANCH || 'master';
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
    const path = `imagens/uploads/${Date.now()}_${safe}`;

    try {
        const r = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'asasbrasil-editor/1.0',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `upload imagem: ${safe}`,
                    content: base64,
                    branch
                })
            }
        );

        if (!r.ok) {
            const e = await r.json();
            return res.status(500).json({ error: e.message || 'Erro no GitHub' });
        }

        const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
        return res.status(200).json({ url });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
