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

async function readFromGithubApi(owner, repo, path, token) {
    if (!token) return null;
    const r = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'asasbrasil-editor/2.1'
            }
        }
    );

    if (!r.ok) return null;
    const data = await r.json();
    if (!data.content) return null;
    return Buffer.from(data.content, 'base64').toString('utf-8');
}

async function readFromRawGithub(owner, repo, branch, path) {
    const r = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}?_=${Date.now()}`,
        { headers: { 'User-Agent': 'asasbrasil-editor/2.1' } }
    );
    if (!r.ok) return null;
    return await r.text();
}

/**
 * GET /api/content
 * Retorna o content.json sempre atualizado.
 */
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER || 'lucasferraripro';
    const repo  = process.env.GITHUB_REPO  || 'asasbrasilviagens-site';
    const branch = process.env.GITHUB_BRANCH || 'master';
    const path  = 'content.json';

    try {
        const text =
            await readFromGithubApi(owner, repo, path, token) ||
            await readFromRawGithub(owner, repo, branch, path);

        if (!text) return res.status(200).json({});

        let content;
        try {
            content = JSON.parse(text);
        } catch (_) {
            return res.status(200).json({});
        }

        if (JSON.stringify(content).length > 500000) {
            return res.status(200).json({});
        }

        return res.status(200).json(cleanContent(content));

    } catch (_) {
        return res.status(200).json({});
    }
}
