function isValidImageSrc(src) {
    if (typeof src !== 'string') return false;
    const v = src.trim();
    if (!v || v.length > 500000) return false;
    const lower = v.toLowerCase();
    if (lower.startsWith('data:')) return false;
    if (lower.includes('instagram.com/p/') || lower.includes('instagram.com/reel/')) return false;
    if (lower.includes('instagram.') && lower.includes('.fbcdn.net')) return false;
    if (lower.startsWith('http://') || lower.startsWith('https://')) return true;
    if (/^imagens\/[a-z0-9_./-]+\.(jpe?g|png|webp|gif|svg)(\?.*)?$/i.test(v)) return true;
    if (/^logo\.png(\?.*)?$/i.test(v)) return true;
    return false;
}

function cleanContent(content) {
    if (!content || typeof content !== 'object') return {};
    const out = {};
    Object.entries(content).forEach(([key, value]) => {
        if (key === '__new_packages' && value && typeof value === 'object' && !Array.isArray(value)) {
            out[key] = {};
            Object.entries(value).forEach(([pkgId, pkg]) => {
                if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) return;
                out[key][pkgId] = {
                    ...pkg,
                    images: Array.isArray(pkg.images) ? pkg.images.filter(isValidImageSrc) : []
                };
            });
            return;
        }
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            const item = { ...value };
            if (item.src != null && item.src !== '' && !isValidImageSrc(item.src)) delete item.src;
            if (Object.keys(item).length) out[key] = item;
            return;
        }
        out[key] = value;
    });
    return out;
}

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
    if (!token) {
        return res.status(500).json({ error: 'GITHUB_TOKEN nÃ£o configurado no Vercel.' });
    }
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
        // 1. Pega o SHA atual do arquivo
        const getRes = await fetch(apiBase, { headers });
        const getJson = await getRes.json();
        const sha = getJson.sha || null;

        // 2. Codifica o conteúdo em base64 — SEM merge, sobrescreve direto
        const contentStr = JSON.stringify(cleanContent(content), null, 2);
        if (contentStr.length > 500000) {
            return res.status(400).json({ error: 'Conteudo muito grande. Envie imagens pelo upload, nao como base64.' });
        }
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
