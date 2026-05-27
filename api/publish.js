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
        if (value === null) {
            out[key] = null;
            return;
        }
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

function cleanPersistedContent(content) {
    const cleaned = cleanContent(content);
    Object.keys(cleaned).forEach(key => {
        if (cleaned[key] === null) delete cleaned[key];
    });
    return cleaned;
}

function mergeContent(existing, incoming) {
    const base = cleanPersistedContent(existing || {});
    const next = cleanContent(incoming || {});
    const merged = { ...base };
    Object.entries(next).forEach(([key, value]) => {
        if (value === null) {
            delete merged[key];
            return;
        }
        if (
            value && typeof value === 'object' && !Array.isArray(value) &&
            merged[key] && typeof merged[key] === 'object' && !Array.isArray(merged[key])
        ) {
            merged[key] = { ...merged[key], ...value };
        } else {
            merged[key] = value;
        }
    });
    return cleanPersistedContent(merged);
}

function sameJson(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

async function readGithubContent(apiBase, headers) {
    const r = await fetch(apiBase + '?_=' + Date.now(), { headers });
    if (!r.ok) throw new Error('Falha ao ler content.json no GitHub: HTTP ' + r.status);
    const data = await r.json();
    if (!data.content) return {};
    return JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
}

async function waitForGithubContent(apiBase, headers, expected) {
    const expectedClean = cleanPersistedContent(expected || {});
    let lastContent = {};
    for (let i = 0; i < 6; i++) {
        lastContent = cleanPersistedContent(await readGithubContent(apiBase, headers));
        if (sameJson(lastContent, expectedClean)) return lastContent;
        await new Promise(resolve => setTimeout(resolve, 700));
    }
    throw new Error('O GitHub recebeu o commit, mas o content.json publicado nao bate com o conteudo enviado. Rascunho preservado.');
}

async function triggerDeployHook() {
    const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
    if (!hook) return { skipped: true };
    const r = await fetch(hook, { method: 'POST' });
    return { skipped: false, ok: r.ok, status: r.status };
}

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
        return res.status(400).json({ error: 'Body invalido' });
    }

    const { content, secret } = body;

    const adminSecret = process.env.ADMIN_SECRET || 'AsasBrasil@2025';
    if (secret !== adminSecret) {
        return res.status(401).json({ error: 'Nao autorizado' });
    }

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        return res.status(500).json({ error: 'GITHUB_TOKEN nao configurado no Vercel.' });
    }

    const owner = process.env.GITHUB_OWNER || 'lucasferraripro';
    const repo = process.env.GITHUB_REPO || 'asasbrasilviagens-site';
    const path = 'content.json';
    const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const headers = {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'asasbrasil-editor/2.0'
    };

    try {
        const getRes = await fetch(apiBase, { headers });
        const getJson = await getRes.json();
        const sha = getJson.sha || null;
        let existingContent = {};
        if (getJson.content) {
            try {
                existingContent = JSON.parse(Buffer.from(getJson.content, 'base64').toString('utf-8'));
            } catch {
                existingContent = {};
            }
        }

        const mergedContent = mergeContent(existingContent, content);
        const contentStr = JSON.stringify(mergedContent, null, 2);
        if (contentStr.length > 500000) {
            return res.status(400).json({ error: 'Conteudo muito grande. Envie imagens pelo upload, nao como base64.' });
        }

        const putRes = await fetch(apiBase, {
            method: 'PUT',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: `Editor: atualiza conteudo do site (${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })})`,
                content: Buffer.from(contentStr).toString('base64'),
                ...(sha ? { sha } : {})
            })
        });

        if (!putRes.ok) {
            const err = await putRes.json().catch(() => ({}));
            return res.status(500).json({ error: err.message || 'Erro ao commitar no GitHub' });
        }

        const putJson = await putRes.json();
        const verifiedContent = await waitForGithubContent(apiBase, headers, mergedContent);
        const deploy = await triggerDeployHook();

        return res.status(200).json({
            success: true,
            message: 'Publicado e verificado no GitHub.',
            commit: putJson.commit && putJson.commit.sha,
            contentKeys: Object.keys(verifiedContent).length,
            deploy
        });
    } catch (err) {
        return res.status(500).json({ error: err.message || 'Erro ao publicar' });
    }
}
