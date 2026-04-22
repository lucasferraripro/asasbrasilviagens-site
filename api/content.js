/**
 * GET /api/content
 * Retorna o content.json sempre atualizado (via GitHub API, sem cache CDN)
 */
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER || 'lucasferraripro';
    const repo  = process.env.GITHUB_REPO  || 'asasbrasilviagens-site';
    const path  = 'content.json';

    try {
        const r = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
            {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'asasbrasil-editor/1.0'
                }
            }
        );

        if (!r.ok) {
            return res.status(200).json({});
        }

        const data = await r.json();
        const content = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
        return res.status(200).json(content);

    } catch (_) {
        return res.status(200).json({});
    }
}
