/**
 * GET /api/content
 * Retorna o content.json sempre atualizado (via GitHub API, sem cache CDN)
 */
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER || 'lucasferraripro';
    const repo  = process.env.GITHUB_REPO  || 'asasbrasilviagens-site';
    const path  = 'content.json';

    if (!token) {
        return res.status(200).json({});
    }

    try {
        const r = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
            {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'asasbrasil-editor/1.0',
                    'Cache-Control': 'no-cache'
                }
            }
        );

        if (!r.ok) return res.status(200).json({});

        const data = await r.json();
        if (!data.content) return res.status(200).json({});

        let content;
        try {
            content = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
        } catch (_) {
            return res.status(200).json({});
        }

        // Rejeita conteúdo corrompido (base64 gigante salvo por engano)
        if (JSON.stringify(content).length > 500000) {
            return res.status(200).json({});
        }

        return res.status(200).json(content);

    } catch (_) {
        return res.status(200).json({});
    }
}
