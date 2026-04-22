/**
 * POST /api/upload
 * Faz upload de imagem para o repositório GitHub e retorna a URL pública.
 * Body JSON: { filename, base64, secret }
 */
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method !== 'POST') return res.status(405).end();

    const token  = process.env.GITHUB_TOKEN;
    const owner  = process.env.GITHUB_OWNER || 'lucasferraripro';
    const repo   = process.env.GITHUB_REPO  || 'asasbrasilviagens-site';
    const adminSecret = process.env.ADMIN_SECRET || 'AsasBrasil@2025';

    let body = '';
    try {
        for await (const chunk of req) body += chunk;
    } catch (_) {
        return res.status(400).json({ error: 'Erro ao ler body' });
    }

    let filename, base64, secret;
    try {
        ({ filename, base64, secret } = JSON.parse(body));
    } catch (_) {
        return res.status(400).json({ error: 'JSON inválido' });
    }

    if (secret !== adminSecret) return res.status(401).json({ error: 'Não autorizado' });
    if (!filename || !base64)   return res.status(400).json({ error: 'filename e base64 obrigatórios' });

    // Sanitiza nome do arquivo
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
                    content: base64
                })
            }
        );

        if (!r.ok) {
            const e = await r.json();
            return res.status(500).json({ error: e.message || 'Erro no GitHub' });
        }

        const url = `https://raw.githubusercontent.com/${owner}/${repo}/master/${path}`;
        return res.status(200).json({ url });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
