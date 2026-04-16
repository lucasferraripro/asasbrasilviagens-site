/**
 * Asas Brasil Viagens — API de Publicação
 * Recebe o content.json do editor, commita no GitHub,
 * e o Vercel faz deploy automático em ~30 segundos.
 */
export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Parse body (Vercel pode não parsear automaticamente)
    let body;
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        if (!body) {
            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            body = JSON.parse(Buffer.concat(chunks).toString());
        }
    } catch {
        return res.status(400).json({ error: 'Body inválido' });
    }

    const { content, secret } = body;

    // Verifica senha admin
    const adminSecret = process.env.ADMIN_SECRET || 'AsasBrasil@2025';
    if (secret !== adminSecret) {
        return res.status(401).json({ error: 'Não autorizado' });
    }

    const token = process.env.GITHUB_TOKEN;
    const owner = 'SEU_USUARIO_GITHUB';
    const repo  = 'asasbrasilviagens-site';
    const path  = 'content.json';
    const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const headers = {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'asasbrasil-editor/1.0'
    };

    try {
        // 1. Pega o SHA atual do arquivo
        const getRes = await fetch(apiBase, { headers });
        const getJson = await getRes.json();
        const sha = getJson.sha || null;

        // 2. Codifica o conteúdo em base64
        const contentStr = JSON.stringify(content, null, 2);
        const contentB64 = Buffer.from(contentStr).toString('base64');

        // 3. Commita no GitHub
        const body = {
            message: `Editor: atualiza conteúdo do site (${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })})`,
            content: contentB64,
            ...(sha ? { sha } : {})
        };

        const putRes = await fetch(apiBase, {
            method: 'PUT',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (putRes.ok) {
            return res.status(200).json({
                success: true,
                message: 'Publicado! O site será atualizado em ~30 segundos.'
            });
        } else {
            const err = await putRes.json();
            return res.status(500).json({ error: err.message || 'Erro ao commitar no GitHub' });
        }

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
