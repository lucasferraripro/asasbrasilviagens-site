/**
 * Asas Brasil Viagens — API de Publicação
 * Recebe o content.json do editor, commita no GitHub,
 * e o Vercel faz deploy automático em ~30 segundos.
 */
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

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

    const adminSecret = process.env.ADMIN_SECRET || 'AsasBrasil@2025';
    if (secret !== adminSecret) {
        return res.status(401).json({ error: 'Não autorizado' });
    }

    // Rejeita conteúdo corrompido antes de salvar
    const contentStr = JSON.stringify(content);
    if (contentStr.length > 500000) {
        return res.status(400).json({ error: 'Conteúdo muito grande. Possível dado corrompido.' });
    }

    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER || 'lucasferraripro';
    const repo  = process.env.GITHUB_REPO  || 'asasbrasilviagens-site';
    const path  = 'content.json';
    const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const headers = {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'asasbrasil-editor/1.0'
    };

    try {
        const getRes  = await fetch(apiBase, { headers });
        const getJson = await getRes.json();
        const sha     = getJson.sha || null;

        let existing = {};
        if (getJson.content) {
            try {
                const decoded = Buffer.from(getJson.content, 'base64').toString('utf-8');
                const parsed = JSON.parse(decoded);
                // Só faz merge se o existente for válido e não corrompido
                if (JSON.stringify(parsed).length < 500000) {
                    existing = parsed;
                }
            } catch (_) {}
        }

        const merged = Object.assign({}, existing, content);

        // Validação final antes de salvar
        const mergedStr = JSON.stringify(merged, null, 2);
        if (mergedStr.length > 500000) {
            return res.status(400).json({ error: 'Conteúdo merged muito grande. Verifique se há dados corrompidos.' });
        }

        const contentB64 = Buffer.from(mergedStr).toString('base64');

        const putBody = {
            message: `Editor: atualiza conteúdo do site (${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })})`,
            content: contentB64,
            ...(sha ? { sha } : {})
        };

        const putRes = await fetch(apiBase, {
            method: 'PUT',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(putBody)
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
