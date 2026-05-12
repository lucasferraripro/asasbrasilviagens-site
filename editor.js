/**
 * 321 GO! — EDITOR VISUAL CMS v2
 *
 * SINCRONIZAÇÃO TOTAL: campos de preço/título/parcelas editados em qualquer
 * página são salvos em __db_overrides[pkgId] e aplicados ao DB antes de
 * renderizar — home e página do pacote sempre mostram os mesmos valores.
 */
(function () {
    'use strict';

    /* ─── CHAVES (mesmo valor usado no login.html) ───────────── */
    const CMS_KEY     = 'asasbrasil_cms_v3';
    const AUTH_KEY    = 'asasbrasil_auth';
    const SECRET_KEY  = 'asasbrasil_secret';
    const CONTENT_URL = '/api/content';

    /* ─── AUTH ─────────────────────────────────────────────────
       Usa localStorage (não sessionStorage) para que o token persista
       entre páginas quando testando via file:// no Chrome — cada arquivo
       tem origem diferente e sessionStorage não atravessa origens. */
    const auth     = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
    const isAdmin  = auth && auth.expires > Date.now();
    const params   = new URLSearchParams(location.search);
    const editMode = isAdmin && (params.get('editor') === '1' || sessionStorage.getItem('editor_active') === '1');

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

    function cleanContent(cms) {
        if (!cms || typeof cms !== 'object') return {};
        const out = {};
        Object.entries(cms).forEach(([key, value]) => {
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
                if (item.src != null && !isValidImageSrc(item.src)) delete item.src;
                if (Object.keys(item).length) out[key] = item;
                return;
            }
            out[key] = value;
        });
        return out;
    }

    /* ─── APLICAR CONTEÚDO ──────────────────────────────────── */
    function applyContent(cms) {
        cms = cleanContent(cms);
        if (!cms || typeof cms !== 'object' || !Object.keys(cms).length) return;

        if (cms.colors && typeof cms.colors === 'object') {
            Object.entries(cms.colors).forEach(([k, v]) => {
                document.documentElement.style.setProperty(k, v);
            });
        }
        if (cms.whatsapp) {
            document.querySelectorAll('a[href*="wa.me/"]').forEach(a => {
                a.href = a.href.replace(/wa\.me\/\d+/, 'wa.me/' + cms.whatsapp);
            });
        }

        // ── SINCRONIZAÇÃO: aplica __db_overrides ao DB antes de qualquer render ──
        // Isso garante que home e pacote.html sempre mostrem os mesmos valores.
        if (cms.__db_overrides && typeof cms.__db_overrides === 'object' && typeof DB !== 'undefined') {
            Object.entries(cms.__db_overrides).forEach(([pkgId, overrides]) => {
                if (DB[pkgId] && typeof overrides === 'object') {
                    Object.assign(DB[pkgId], overrides);
                }
            });
        }

        document.querySelectorAll('[data-eid]').forEach(el => {
            const d = cms[el.dataset.eid];
            if (!d) return;
            if (d.html  != null) el.innerHTML = d.html;
            if (d.text  != null) el.textContent = d.text;
            if (d.src   != null && el.tagName === 'IMG' && isValidImageSrc(d.src)) el.src = d.src;
            if (d.href  != null) el.setAttribute('href', d.href);
            if (d.target!= null) el.setAttribute('target', d.target);
            if (d.style && typeof d.style === 'object') Object.assign(el.style, d.style);
        });

        // Mesclar pacotes novos publicados no DB (para visitantes sem rascunho)
        if (cms.__new_packages && typeof cms.__new_packages === 'object' && typeof DB !== 'undefined') {
            Object.assign(DB, cms.__new_packages);
        }

        // Remover cards marcados para remoção
        if (Array.isArray(cms.__removed_cards)) {
            cms.__removed_cards.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.remove();
            });
        }

        // Injetar cards de novos pacotes na home (index.html)
        if (cms.__new_packages && typeof cms.__new_packages === 'object') {
            const grid = document.querySelector('.cards-grid');
            if (grid) {
                const removed = Array.isArray(cms.__removed_cards) ? cms.__removed_cards : [];
                Object.entries(cms.__new_packages).forEach(([pkgId, pkg]) => {
                    const cardId = 'card-new-' + pkgId;
                    if (removed.includes(cardId)) return;
                    if (document.getElementById(cardId)) return;
                    const article = document.createElement('article');
                    article.className = 'card';
                    article.id = cardId;
                    article.setAttribute('onclick', "location.href='pacote.html?id=" + pkgId + "'");
                    article.style.cursor = 'pointer';
                    const img = pkg.images && pkg.images[0] ? pkg.images[0] : 'imagens/destinos/balneario_camboriu.png';
                    const badgeClass = (pkg.badge||'').includes('Popular') ? 'card-badge--popular' : (pkg.badge||'').includes('Premium') ? 'card-badge--premium' : 'card-badge--hot';
                    article.innerHTML = `
                        <div class="card-img-wrap">
                            <img src="${img}" alt="${pkg.title}" class="card-img" loading="lazy">
                            <div class="card-badge ${badgeClass}">${pkg.badge || '🆕 Novo'}</div>
                        </div>
                        <div class="card-body">
                            <div class="card-dest">${pkg.location || ''}</div>
                            <h3 class="card-title">${pkg.title}</h3>
                            <div class="card-dates">${pkg.duration || ''}</div>
                            <div class="card-price-block">
                                <div class="card-pix">Pix: <strong>R$ ${pkg.price || '—'}</strong></div>
                                <div class="card-parcel">${pkg.parcelas || ''}</div>
                            </div>
                            <a href="pacote.html?id=${pkgId}" class="btn btn-card">Ver detalhes completos →</a>
                        </div>`;
                    grid.appendChild(article);
                });
            }
        }
    }

    /* ─── FETCH CONTENT ─────────────────────────────────────── */
    async function fetchContent() {
        // file:// não tem servidor — retorna {} sem tentar fetch
        if (location.protocol === 'file:') return {};
        try {
            const r = await fetch(CONTENT_URL + '?_=' + Date.now());
            if (!r.ok) return {};
            const data = await r.json();
            return (data && typeof data === 'object') ? cleanContent(data) : {};
        } catch (_) { return {}; }
    }

    async function loadAndApply(srv) {
        // Visitantes normais: aplica só o servidor (sem rascunho local)
        // Admin em editMode: servidor + rascunho local (rascunho tem prioridade)
        let merged = (srv && typeof srv === 'object') ? cleanContent({ ...srv }) : {};
        if (editMode) {
            try {
                const draft = JSON.parse(localStorage.getItem(CMS_KEY) || '{}');
                merged = cleanContent({ ...merged, ...draft });
            } catch (_) {}
        }
        applyContent(merged);
        return merged;
    }

    /* ─── CSS DO EDITOR ─────────────────────────────────────── */
    function injectCSS() {
        if (document.getElementById('go-cms-css')) return;
        const s = document.createElement('style');
        s.id = 'go-cms-css';
        s.textContent = `
        #go-bar{position:fixed;top:0;left:0;right:0;z-index:99999;height:54px;background:#0f1623;display:flex;align-items:center;gap:6px;padding:0 14px;box-shadow:0 2px 20px rgba(0,0,0,.6);font-family:'Poppins',-apple-system,sans-serif;font-size:13px;border-bottom:1px solid rgba(255,255,255,.08);}
        #go-bar *{box-sizing:border-box;}
        .go-brand{color:#fff;font-weight:800;display:flex;align-items:center;gap:8px;padding-right:14px;border-right:1px solid rgba(255,255,255,.12);white-space:nowrap;margin-right:4px;font-size:14px;letter-spacing:-.01em;}
        .go-brand .go-logo-text{color:#E05220;}
        .go-dot{width:8px;height:8px;border-radius:50%;background:#22C55E;flex-shrink:0;animation:gopulse 1.5s infinite;}
        @keyframes gopulse{0%,100%{opacity:1}50%{opacity:.3}}
        .go-hint{color:rgba(255,255,255,.5);font-size:12px;white-space:nowrap;}
        .go-btn{padding:7px 13px;border:none;border-radius:8px;background:transparent;color:rgba(255,255,255,.75);cursor:pointer;font-size:12px;font-weight:600;display:inline-flex;align-items:center;gap:5px;transition:all .15s;white-space:nowrap;outline:none;font-family:inherit;}
        .go-btn:hover{background:rgba(255,255,255,.1);color:#fff;}
        .go-btn.orange{background:#E05220;color:#fff;}
        .go-btn.orange:hover{background:#c04418;}
        .go-btn.green{background:#16A34A;color:#fff;}
        .go-btn.green:hover{background:#15803D;}
        .go-btn.red{color:rgba(255,255,255,.4);font-size:12px;}
        .go-btn.red:hover{color:#F87171;background:rgba(248,113,113,.1);}
        .go-sep{width:1px;height:28px;background:rgba(255,255,255,.1);margin:0 3px;flex-shrink:0;}
        .go-spacer{flex:1;}
        .go-last-pub{color:rgba(255,255,255,.3);font-size:11px;white-space:nowrap;}

        body.go-on{padding-top:54px!important;}
        body.go-on #header{top:54px!important;}
        body.go-on [data-eid]{cursor:pointer!important;position:relative;transition:outline .1s;}
        body.go-on [data-eid]:hover{outline:2px dashed #E05220!important;outline-offset:3px;}
        body.go-on [data-eid]:hover::after{content:attr(data-elabel);position:absolute;top:-26px;left:0;background:#E05220;color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;white-space:nowrap;z-index:99997;pointer-events:none;font-family:-apple-system,sans-serif;}
        body.go-on [data-eid].go-sel{outline:2px solid #22A8C9!important;outline-offset:3px;}

        .go-panel{position:fixed;top:64px;right:18px;width:320px;border-radius:16px;z-index:99998;box-shadow:0 20px 60px rgba(0,0,0,.5);font-family:'Poppins',-apple-system,sans-serif;overflow:hidden;background:#1a2436 !important;color:#e8edf5 !important;}
        .go-ph{background:#0f1623;color:#fff;padding:13px 16px;display:flex;align-items:center;justify-content:space-between;cursor:move;user-select:none;border-bottom:2px solid #E05220;}
        .go-ph h3{font-size:13px;font-weight:700;margin:0;color:#fff !important;}
        .go-px{background:none;border:none;color:rgba(255,255,255,.55);font-size:18px;cursor:pointer;padding:0 2px;line-height:1;}
        .go-px:hover{color:#fff;}
        .go-pb{padding:16px;max-height:calc(100vh - 130px);overflow-y:auto;background:#1a2436 !important;color:#e8edf5 !important;}
        .go-f{margin-bottom:13px;}
        .go-f label{display:block;font-size:11px;font-weight:700;color:rgba(255,255,255,.55) !important;margin-bottom:5px;text-transform:uppercase;letter-spacing:.06em;}
        .go-f input[type=text],.go-f input[type=url],.go-f input[type=password],.go-f textarea,.go-f select{width:100%;padding:8px 11px;border:1.5px solid rgba(255,255,255,.15);border-radius:8px;font-size:13px;outline:none;font-family:inherit;resize:vertical;transition:border .15s;background:#0f1623 !important;color:#e8edf5 !important;}
        .go-f input:focus,.go-f textarea:focus,.go-f select:focus{border-color:#E05220;}
        .go-rich{min-height:70px;padding:9px 11px;border:1.5px solid rgba(255,255,255,.15);border-radius:8px;font-size:13px;outline:none;transition:border .15s;line-height:1.5;background:#0f1623 !important;color:#e8edf5 !important;}
        .go-rich:focus{border-color:#E05220;}
        #gor,#gor *{background:#e2e2e2 !important;color:#1a1a1a !important;}
        .go-fmts{display:flex;gap:5px;margin-top:6px;}
        .go-fmts button{padding:4px 11px;border:1.5px solid rgba(255,255,255,.15);border-radius:6px;background:#243048 !important;color:#e8edf5 !important;cursor:pointer;font-size:13px;font-weight:700;transition:background .1s;}
        .go-fmts button:hover{background:#3a4a65 !important;}
        .go-cr{display:flex;align-items:center;gap:10px;margin-bottom:9px;}
        .go-cr label{flex:1;font-size:12.5px;color:rgba(255,255,255,.7) !important;}
        .go-cr input[type=color]{width:40px;height:32px;padding:2px;border:1.5px solid rgba(255,255,255,.2);border-radius:6px;cursor:pointer;}
        .go-prev{width:100%;height:110px;object-fit:cover;border-radius:9px;margin-bottom:10px;background:#243048;display:block;}
        .go-acts{display:flex;gap:8px;margin-top:14px;}
        .go-ok{flex:1;padding:9px;background:#E05220;color:#fff !important;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;transition:background .15s;font-family:inherit;}
        .go-ok:hover{background:#c04418;}
        .go-ko{padding:9px 14px;background:#243048 !important;color:rgba(255,255,255,.8) !important;border:none;border-radius:8px;font-size:13px;cursor:pointer;font-family:inherit;}
        .go-ko:hover{background:#3a4a65 !important;}
        .go-hint-txt{font-size:11px;color:rgba(255,255,255,.4) !important;margin-top:4px;line-height:1.5;}
        .go-hr{border:none;border-top:1px solid rgba(255,255,255,.08);margin:12px 0;}
        .go-g2{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
        .go-info{font-size:12px;color:rgba(255,255,255,.6) !important;background:rgba(255,255,255,.06) !important;border-radius:8px;padding:10px;margin-bottom:12px;line-height:1.5;}

        .go-toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(16px);background:#0f1623;color:#fff;padding:11px 22px;border-radius:50px;font-size:13px;font-weight:600;z-index:999999;opacity:0;transition:all .28s;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,.3);font-family:inherit;}
        .go-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}
        .go-toast.ok{background:#16A34A;}
        .go-toast.err{background:#DC2626;}

        .go-pub-box{background:rgba(22,163,74,.15);border:1px solid rgba(22,163,74,.4);border-radius:10px;padding:14px;font-size:13px;color:#4ade80 !important;line-height:1.6;}
        .go-pub-err{background:rgba(220,38,38,.15);border:1px solid rgba(220,38,38,.4);border-radius:10px;padding:14px;font-size:13px;color:#f87171 !important;line-height:1.6;}
        .go-spin{font-size:26px;animation:gospin 1s linear infinite;display:block;margin-bottom:8px;}
        @keyframes gospin{to{transform:rotate(360deg)}}
        .go-loading{text-align:center;padding:24px 16px;color:rgba(255,255,255,.5) !important;font-size:13px;}
        .go-dirty-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#FCD34D;margin-right:4px;flex-shrink:0;}

        .go-local-warn{background:rgba(224,82,32,.15);border:1px solid rgba(224,82,32,.3);border-radius:8px;padding:10px 12px;font-size:11px;color:#f07040 !important;margin-bottom:12px;line-height:1.5;}

        body.go-on .go-incluso{cursor:pointer!important;border-radius:6px;padding:3px 6px!important;transition:background .15s;}
        body.go-on .go-incluso:hover{background:rgba(224,82,32,.12)!important;outline:2px dashed #E05220!important;outline-offset:2px;}
        body.go-on .go-incluso.go-sel{outline:2px solid #22A8C9!important;outline-offset:2px;}

        @media(max-width:600px){
            #go-bar{padding:0 8px;gap:2px;}
            .go-hint,.go-sep,.go-last-pub{display:none;}
            .go-brand{padding-right:8px;font-size:12px;}
            .go-btn{padding:7px 9px;font-size:13px;}
            .go-btn-lbl{display:none;}
            .go-panel{left:6px;right:6px;width:auto;top:60px;}
            .go-pb{max-height:none;padding:14px;}
            .go-ph{cursor:default;}
        }
        `;
        document.head.appendChild(s);
    }

    /* ─── EDITOR ─────────────────────────────────────────────── */
    const isLocal = location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';

    const ED = {
        cms: {},
        panel: null,

        async start(srv) {
            injectCSS();
            let draft = {};
            try { draft = JSON.parse(localStorage.getItem(CMS_KEY) || '{}'); } catch (_) {}
            this.cms = cleanContent({ ...(srv || {}), ...draft });

            document.body.classList.add('go-on');
            sessionStorage.setItem('editor_active', '1');
            this.buildBar();
            this.bindAll();
            this.injectRemoveButtons();
            if (Object.keys(draft).length > 0) this.markDirty();
        },

        buildBar() {
            if (document.getElementById('go-bar')) return;
            const bar = document.createElement('div');
            bar.id = 'go-bar';
            const lastPub = localStorage.getItem('asasbrasil_last_pub') || '';
            bar.innerHTML = `
            <div class="go-brand"><span class="go-logo-text">Asas Brasil</span><span class="go-dot"></span></div>
            <span class="go-hint">👆 Clique em qualquer elemento para editar</span>
            <div class="go-spacer"></div>
            ${lastPub ? `<span class="go-last-pub">Pub: ${lastPub}</span><div class="go-sep"></div>` : ''}
            <button class="go-btn" id="go-pages">📄 <span class="go-btn-lbl">Páginas</span></button>
            <div class="go-sep"></div>
            <button class="go-btn" id="go-footer">🧩 <span class="go-btn-lbl">Rodapé</span></button>
            <div class="go-sep"></div>
            <button class="go-btn" id="go-add-pkg">➕ <span class="go-btn-lbl">Pacote</span></button>
            <div class="go-sep"></div>
            <button class="go-btn" id="go-insta">📸 <span class="go-btn-lbl">Instagram</span></button>
            <div class="go-sep"></div>
            <button class="go-btn orange" id="go-colors">🎨 <span class="go-btn-lbl">Cores</span></button>
            <div class="go-sep"></div>
            <button class="go-btn green" id="go-pub">🚀 <span class="go-btn-lbl">Publicar</span></button>
            <div class="go-sep"></div>
            <button class="go-btn" id="go-revert" title="Descartar rascunho">↩ <span class="go-btn-lbl">Reverter</span></button>
            <button class="go-btn red" id="go-exit">✕ <span class="go-btn-lbl">Sair</span></button>`;
            document.body.prepend(bar);
            document.getElementById('go-pages').onclick   = () => this.pPages();
            document.getElementById('go-footer').onclick  = () => this.pFooter();
            document.getElementById('go-add-pkg').onclick = () => this.pAddPacote();
            document.getElementById('go-insta').onclick   = () => this.pInstagram();
            document.getElementById('go-colors').onclick  = () => this.pColors();
            document.getElementById('go-pub').onclick     = () => this.publish();
            document.getElementById('go-revert').onclick  = () => this.revert();
            document.getElementById('go-exit').onclick    = () => this.exit();
        },

        bindAll() {
            if (this._goDelegated) return;
            this._goDelegated = true;
            document.addEventListener('click', e => {
                const el = e.target.closest('[data-eid]');
                if (el && document.body.classList.contains('go-on')) {
                    // Ignora se estiver clicando dentro do painel do editor
                    if (e.target.closest('.go-panel') || e.target.closest('#go-bar')) return;

                    e.preventDefault();
                    e.stopPropagation();
                    document.querySelectorAll('.go-sel').forEach(x => x.classList.remove('go-sel'));
                    el.classList.add('go-sel');
                    this.dispatch(el);
                }
            }, true); // Usa capture para interceptar antes de qualquer onclick nativo
        },

        dispatch(el) {
            if (el.tagName === 'IMG')                      this.pImage(el);
            else if (el.tagName === 'A')                   this.pLink(el);
            else if (el.classList.contains('go-incluso'))  this.pInclusoItem(el);
            else                                           this.pText(el);
            this.addNavLink(el);
        },

        /* ── Botão de navegação para cards com onclick ── */
        addNavLink(el) {
            const article = el.closest('article[onclick]');
            if (!article) return;
            const match = article.getAttribute('onclick').match(/href='([^']+)'/);
            if (!match) return;
            const url = match[1];
            const pb = this.panel && this.panel.querySelector('.go-pb');
            if (!pb) return;
            const nav = document.createElement('div');
            nav.style.cssText = 'margin-bottom:12px;padding:10px 14px;background:#f0f4fa;border-radius:8px;display:flex;align-items:center;justify-content:space-between;gap:8px;';
            nav.innerHTML = `<span style="font-size:12px;color:#374151;">Quer ir para a página?</span>
                <a href="${url}" style="font-size:12px;font-weight:700;color:#E05220;white-space:nowrap;">Abrir pacote →</a>`;
            pb.prepend(nav);
        },

        /* ── PÁGINAS DO SITE ── */
        pPages() {
            const pages = [
                { label: '🏠 Home',          url: 'index.html' },
                { label: '🧭 Quem Somos',    url: 'sobre.html' },
                { label: '⭐ Clientes',       url: 'clientes.html' },
                { label: '🏖 Balneário',      url: 'pacote.html?id=balneario' },
                { label: '⚽ Copa do Mundo',  url: 'pacote.html?id=copa-canada' },
                { label: '🇲🇽 México',        url: 'pacote.html?id=copa-mexico' },
                { label: '🇺🇸 EUA',           url: 'pacote.html?id=copa-eua' },
                { label: '🌎 América do Sul', url: 'pacote.html?id=copa-amsul' },
            ];
            const p = this.panel_('📄 Navegação — Páginas do Site');
            const links = pages.map(pg => {
                const isActive = location.pathname.endsWith(pg.url.split('?')[0]) &&
                                 location.search === (pg.url.includes('?') ? '?' + pg.url.split('?')[1] : '');
                return `<a href="${pg.url}" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:${isActive?'#FFF7ED':'#F9FAFB'};border:1px solid ${isActive?'#FED7AA':'#E5E7EB'};border-radius:8px;margin-bottom:8px;font-size:13px;font-weight:600;color:${isActive?'#C2410C':'#1F2937'};text-decoration:none;">
                    <span>${pg.label}</span>
                    <span style="font-size:11px;color:#9CA3AF;">${isActive ? '← atual' : 'abrir →'}</span>
                </a>`;
            }).join('');
            p.innerHTML += `<div class="go-pb">
                <div style="font-size:11px;color:#6B7280;margin-bottom:12px;">O modo editor continua ativo ao navegar entre páginas.</div>
                ${links}
            </div>`;
        },

        pFooter() {
            const footerItems = Array.from(document.querySelectorAll('footer [data-eid]'))
                .filter(el => {
                    const txt = (el.textContent || el.alt || el.getAttribute('aria-label') || '').trim();
                    return txt || el.tagName === 'IMG' || el.tagName === 'A';
                });
            const p = this.panel_('🧩 Editar Rodapé');
            if (!footerItems.length) {
                p.innerHTML += `<div class="go-pb"><div class="go-info">Nenhum campo editável encontrado no rodapé desta página.</div></div>`;
                return;
            }
            const rows = footerItems.map((el, i) => {
                const label = el.dataset.elabel || el.dataset.eid || `Campo ${i + 1}`;
                const value = (el.tagName === 'IMG')
                    ? (el.getAttribute('src') || '')
                    : (el.textContent || el.getAttribute('aria-label') || '').trim();
                return `<button type="button" class="go-footer-item" data-eid="${el.dataset.eid}" style="width:100%;text-align:left;display:block;padding:10px 12px;background:#0f1623;border:1px solid rgba(255,255,255,.12);border-radius:8px;color:#e8edf5;margin-bottom:8px;cursor:pointer;font-family:inherit;">
                    <strong style="display:block;font-size:12px;color:#fff;margin-bottom:3px;">${label}</strong>
                    <span style="display:block;font-size:11px;color:rgba(255,255,255,.55);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${value || 'Imagem/link'}</span>
                </button>`;
            }).join('');
            p.innerHTML += `<div class="go-pb">
                <div class="go-info">Clique no item abaixo para editar texto, link ou imagem do rodapé.</div>
                ${rows}
            </div>`;
            p.querySelectorAll('.go-footer-item').forEach(btn => {
                btn.onclick = () => {
                    const el = document.querySelector(`footer [data-eid="${btn.dataset.eid}"]`);
                    if (!el) return;
                    document.querySelectorAll('.go-sel').forEach(x => x.classList.remove('go-sel'));
                    el.classList.add('go-sel');
                    this.dispatch(el);
                };
            });
        },

        /* ── TEXTO ── */
        pText(el) {
            const origHTML  = el.innerHTML;
            const origStyle = el.getAttribute('style') || '';
            const cs = getComputedStyle(el);
            let colorChanged = false, sizeChanged = false;
            const p = this.panel_('✏️ Editar Texto — ' + (el.dataset.elabel || ''));
            /* strip inline color/background from content so editor shows dark text on white */
            const _tmp = document.createElement('div');
            _tmp.innerHTML = el.innerHTML;
            _tmp.querySelectorAll('*').forEach(n => { n.style.color = ''; n.style.background = ''; n.style.backgroundColor = ''; });
            const _clean = _tmp.innerHTML;
            p.innerHTML += `<div class="go-pb">
                <div class="go-f"><label>Conteúdo</label>
                    <div class="go-rich" contenteditable="true" id="gor" style="background:#e2e2e2;color:#1a1a1a;border:2px solid #718096;min-height:70px;padding:9px 11px;border-radius:8px;font-size:13px;line-height:1.5;">${_clean}</div>
                    <div class="go-fmts">
                        <button onmousedown="event.preventDefault();document.execCommand('bold')"><b>N</b></button>
                        <button onmousedown="event.preventDefault();document.execCommand('italic')"><i>I</i></button>
                        <button onmousedown="event.preventDefault();document.execCommand('underline')"><u>S</u></button>
                    </div>
                </div>
                <div class="go-g2">
                    <div class="go-f"><label>Cor do texto</label><input type="color" id="gotc" value="${this.hex(cs.color)}"></div>
                    <div class="go-f"><label>Tamanho (px)</label><input type="text" id="gofs" value="${parseInt(cs.fontSize)||16}"></div>
                </div>
                <div class="go-acts">
                    <button class="go-ok" id="goa">✓ Aplicar</button>
                    <button class="go-ko" id="goc">Cancelar</button>
                </div>
            </div>`;
            const rich = p.querySelector('#gor');
            const tc   = p.querySelector('#gotc');
            const fs   = p.querySelector('#gofs');
            rich.oninput = () => el.innerHTML = rich.innerHTML;
            tc.oninput   = () => { colorChanged = true; el.style.color = tc.value; };
            fs.oninput   = () => { sizeChanged  = true; el.style.fontSize = fs.value + 'px'; };
            p.querySelector('#goa').onclick = () => {
                const styleOverride = {};
                if (colorChanged) styleOverride.color = tc.value;
                if (sizeChanged)  styleOverride.fontSize = fs.value + 'px';
                const entry = { html: el.innerHTML };
                if (Object.keys(styleOverride).length) entry.style = styleOverride;
                this.store(el.dataset.eid, entry);
                this.closePanel();
                this.toast('✓ Texto salvo no rascunho', 'ok');
            };
            p.querySelector('#goc').onclick = () => {
                el.innerHTML = origHTML;
                el.setAttribute('style', origStyle);
                this.closePanel();
            };
        },

        /* ── IMAGEM ── */
        pImage(el) {
            const origSrc  = el.src;
            const origAttr = el.getAttribute('src') || el.src;
            const p = this.panel_('🖼️ Trocar Imagem — ' + (el.dataset.elabel || ''));
            const localWarn = isLocal ? `<div class="go-local-warn">⚠️ <strong>Modo local:</strong> Upload de arquivos só funciona no site publicado (Vercel). Use uma URL de imagem abaixo.</div>` : '';
            p.innerHTML += `<div class="go-pb">
                ${localWarn}
                <img class="go-prev" id="goprev" src="${origSrc}" style="background:#F3F4F6;">
                <div class="go-f">
                    <label>Enviar do computador</label>
                    <button id="gobtn" style="width:100%;padding:10px;border:2px dashed #E5E7EB;border-radius:8px;background:#F9FAFB;cursor:pointer;font-size:13px;color:#374151;transition:border .15s;"${isLocal?' disabled title="Disponível apenas no site publicado"':''}>
                        📂 Escolher arquivo (JPG, PNG, WEBP)
                    </button>
                    <input type="file" id="gofile" accept="image/jpeg,image/png,image/webp,image/gif" style="display:none">
                    <div id="goupstatus" class="go-hint-txt" style="margin-top:6px;"></div>
                </div>
                <div class="go-f">
                    <label>Ou cole uma URL de imagem</label>
                    <input type="url" id="goiu" value="${origAttr}" placeholder="https://site.com/foto.jpg">
                    <p class="go-hint-txt">Cole qualquer URL de imagem da internet (JPG, PNG, WEBP)</p>
                </div>
                <div class="go-acts">
                    <button class="go-ok" id="goa">✓ Aplicar</button>
                    <button class="go-ko" id="goc">Cancelar</button>
                </div>
            </div>`;
            const ui     = p.querySelector('#goiu');
            const pv     = p.querySelector('#goprev');
            const btn    = p.querySelector('#gobtn');
            const file   = p.querySelector('#gofile');
            const status = p.querySelector('#goupstatus');
            let debounce;

            const saveImageDraft = (src) => {
                if (!isValidImageSrc(src)) return false;
                pv.src = src;
                ui.value = src;
                document.querySelectorAll(`[data-eid="${el.dataset.eid}"]`).forEach(e => {
                    if (e.tagName === 'IMG') e.src = src;
                });
                this.store(el.dataset.eid, { src });
                return true;
            };

            if (!isLocal) {
                btn.onclick = () => file.click();
                btn.onmouseenter = () => btn.style.borderColor = '#E05220';
                btn.onmouseleave = () => btn.style.borderColor = '#E5E7EB';

                file.onchange = async () => {
                    const f = file.files[0];
                    if (!f) return;
                    if (f.size > 3 * 1024 * 1024) {
                        status.textContent = '❌ Arquivo muito grande (máx 3MB). Comprima antes.';
                        status.style.color = '#DC2626';
                        return;
                    }
                    const reader = new FileReader();
                    reader.onload = async ev => {
                        const dataUrl = ev.target.result;
                        el.src = dataUrl;
                        pv.src = dataUrl;
                        btn.textContent = '⏳ Enviando…';
                        btn.disabled = true;
                        status.textContent = 'Enviando para o servidor…';
                        status.style.color = '#6B7280';
                        try {
                            const b64 = dataUrl.split(',')[1];
                            const secret = localStorage.getItem(SECRET_KEY) || '';
                            const res = await fetch('/api/upload', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ filename: f.name, base64: b64, secret })
                            });
                            const data = await res.json();
                            if (res.ok && data.url && isValidImageSrc(data.url)) {
                                saveImageDraft(data.url);
                                btn.textContent = '✅ Imagem enviada!';
                                status.textContent = 'Imagem salva no rascunho. Agora clique em Publicar.';
                                status.style.color = '#16A34A';
                            } else {
                                throw new Error(data.error || 'Erro no upload');
                            }
                        } catch (err) {
                            el.src = origSrc;
                            pv.src = origSrc;
                            btn.textContent = '📂 Escolher arquivo';
                            btn.disabled = false;
                            status.textContent = '❌ ' + err.message;
                            status.style.color = '#DC2626';
                        }
                    };
                    reader.readAsDataURL(f);
                };
            }

            ui.oninput = () => {
                clearTimeout(debounce);
                debounce = setTimeout(() => {
                    const v = ui.value.trim();
                    if (v && isValidImageSrc(v)) {
                        saveImageDraft(v);
                        status.textContent = 'Imagem salva no rascunho. Agora clique em Publicar.';
                        status.style.color = '#16A34A';
                    }
                }, 500);
            };
            p.querySelector('#goa').onclick = () => {
                clearTimeout(debounce);
                const src = ui.value.trim();
                // Só salva se o usuário realmente digitou uma URL nova
                // Nunca salva a URL original (evita sobrescrever com valor padrão)
                if (!src) {
                    this.closePanel();
                    return;
                }
                if (!isValidImageSrc(src)) {
                    ui.focus();
                    ui.style.borderColor = '#DC2626';
                    this.toast('Use uma URL direta de imagem ou uma imagem enviada pelo editor', 'err');
                    return;
                }
                saveImageDraft(src);
                this.closePanel();
                this.toast('✓ Imagem salva no rascunho', 'ok');
            };
            p.querySelector('#goc').onclick = () => {
                el.src = origSrc;
                this.closePanel();
            };
        },

        /* ── LINK ── */
        pLink(el) {
            const origHTML   = el.innerHTML;
            const origStyle  = el.getAttribute('style') || '';
            const origHref   = el.getAttribute('href') || '';
            const origTarget = el.getAttribute('target') || '_self';
            const cs = getComputedStyle(el);
            const p = this.panel_('🔗 Editar Botão/Link — ' + (el.dataset.elabel || ''));
            p.innerHTML += `<div class="go-pb">
                <div class="go-f"><label>Texto</label><input type="text" id="gobt" value="${el.textContent.trim()}"></div>
                <div class="go-f"><label>Link (URL)</label><input type="url" id="gobh" value="${origHref}" placeholder="https://wa.me/..."></div>
                <div class="go-f"><label>Abrir em</label>
                    <select id="gotgt">
                        <option value="_self" ${origTarget!=='_blank'?'selected':''}>Mesma aba</option>
                        <option value="_blank" ${origTarget==='_blank'?'selected':''}>Nova aba</option>
                    </select>
                </div>
                <div class="go-g2">
                    <div class="go-f"><label>Cor de fundo</label><input type="color" id="gobbg" value="${this.hex(cs.backgroundColor)}"></div>
                    <div class="go-f"><label>Cor do texto</label><input type="color" id="gobfg" value="${this.hex(cs.color)}"></div>
                </div>
                <div class="go-acts">
                    <button class="go-ok" id="goa">✓ Aplicar</button>
                    <button class="go-ko" id="goc">Cancelar</button>
                </div>
            </div>`;
            const bt  = p.querySelector('#gobt');
            const bh  = p.querySelector('#gobh');
            const tgt = p.querySelector('#gotgt');
            const bbg = p.querySelector('#gobbg');
            const bfg = p.querySelector('#gobfg');
            let bgChanged = false, fgChanged = false;
            bt.oninput  = () => { const ic = el.querySelector('i'); el.textContent = bt.value; if(ic) el.prepend(ic.cloneNode(true)); };
            bbg.oninput = () => { bgChanged = true; el.style.backgroundColor = bbg.value; };
            bfg.oninput = () => { fgChanged = true; el.style.color = bfg.value; };
            p.querySelector('#goa').onclick = () => {
                el.setAttribute('href', bh.value);
                el.setAttribute('target', tgt.value);
                const styleOverride = {};
                if (bgChanged) styleOverride.backgroundColor = bbg.value;
                if (fgChanged) styleOverride.color = bfg.value;
                const entry = { html: el.innerHTML, href: bh.value, target: tgt.value };
                if (Object.keys(styleOverride).length) entry.style = styleOverride;
                this.store(el.dataset.eid, entry);
                this.closePanel();
                this.toast('✓ Botão salvo no rascunho', 'ok');
            };
            p.querySelector('#goc').onclick = () => {
                el.innerHTML = origHTML;
                el.setAttribute('style', origStyle);
                el.setAttribute('href', origHref);
                this.closePanel();
            };
        },

        /* ── ITEM INCLUSO (emoji + texto) ── */
        pInclusoItem(el) {
            const origHTML = el.innerHTML;
            const eid = el.dataset.eid;
            // Separar emoji do texto: o emoji é o primeiro "token" antes do espaço
            const full = el.textContent.trim();
            const spaceIdx = full.indexOf(' ');
            const origEmoji = spaceIdx > -1 ? full.slice(0, spaceIdx) : '';
            const origText  = spaceIdx > -1 ? full.slice(spaceIdx + 1) : full;

            const p = this.panel_('✏️ Editar Item — ' + (el.dataset.elabel || ''));
            p.innerHTML += `<div class="go-pb">
                <div class="go-f">
                    <label>Emoji / Ícone</label>
                    <input type="text" id="go-emoji" value="${origEmoji}" placeholder="✈ 🏨 🎟 🚐 🔒" style="font-size:20px;text-align:center;">
                    <p class="go-hint-txt">Cole ou digite qualquer emoji. Ex: ✈ 🏨 🎡 🚐 🔒 🎟 🏖 🏔 🌿</p>
                </div>
                <div class="go-f">
                    <label>Texto do item</label>
                    <input type="text" id="go-itext" value="${origText.replace(/"/g,'&quot;')}">
                </div>
                <div class="go-acts">
                    <button class="go-ok" id="goa">✓ Aplicar</button>
                    <button class="go-ko" id="goc">Cancelar</button>
                </div>
            </div>`;
            const emojiInp = p.querySelector('#go-emoji');
            const textInp  = p.querySelector('#go-itext');

            const preview = () => {
                const e = emojiInp.value.trim();
                const t = textInp.value.trim();
                el.textContent = e ? e + ' ' + t : t;
            };
            emojiInp.oninput = preview;
            textInp.oninput  = preview;

            p.querySelector('#goa').onclick = () => {
                const e = emojiInp.value.trim();
                const t = textInp.value.trim();
                const newText = e ? e + ' ' + t : t;
                el.textContent = newText;
                this.store(eid, { text: newText });
                this.closePanel();
                this.toast('✓ Item salvo no rascunho', 'ok');
            };
            p.querySelector('#goc').onclick = () => {
                el.innerHTML = origHTML;
                this.closePanel();
            };
        },

        /* ── BOTÕES DE REMOÇÃO NOS CARDS DA HOME ── */
        injectRemoveButtons() {
            // Cards de pacotes nacionais
            document.querySelectorAll('article.card[id]').forEach(article => {
                if (article.querySelector('.go-remove-btn')) return;
                const btn = document.createElement('button');
                btn.className = 'go-remove-btn';
                btn.title = 'Remover este pacote';
                btn.innerHTML = '✕';
                btn.style.cssText = 'position:absolute;top:10px;right:10px;z-index:99990;width:28px;height:28px;border-radius:50%;background:#DC2626;color:#fff;border:none;cursor:pointer;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.4);transition:all .15s;';
                btn.onmouseenter = () => btn.style.transform = 'scale(1.15)';
                btn.onmouseleave = () => btn.style.transform = '';
                btn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.confirmRemoveCard(article);
                };
                article.style.position = 'relative';
                article.appendChild(btn);
            });
            // Cards Copa 2026
            document.querySelectorAll('article.copa-card[id]').forEach(article => {
                if (article.querySelector('.go-remove-btn')) return;
                const btn = document.createElement('button');
                btn.className = 'go-remove-btn';
                btn.title = 'Remover este pacote';
                btn.innerHTML = '✕';
                btn.style.cssText = 'position:absolute;top:10px;right:10px;z-index:99990;width:28px;height:28px;border-radius:50%;background:#DC2626;color:#fff;border:none;cursor:pointer;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.4);transition:all .15s;';
                btn.onmouseenter = () => btn.style.transform = 'scale(1.15)';
                btn.onmouseleave = () => btn.style.transform = '';
                btn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.confirmRemoveCard(article);
                };
                article.style.position = 'relative';
                article.appendChild(btn);
            });
        },

        confirmRemoveCard(article) {
            const title = article.querySelector('[data-elabel]')?.dataset.elabel || article.id || 'este pacote';
            const p = this.panel_('🗑️ Remover Pacote');
            p.innerHTML += `<div class="go-pb">
                <div class="go-pub-err" style="margin-bottom:14px;">
                    ⚠️ Tem certeza que deseja <strong>remover</strong> o card <em>"${title}"</em> da página inicial?<br><br>
                    <span style="font-size:11px;opacity:.8;">Esta ação pode ser desfeita clicando em "Reverter" antes de publicar.</span>
                </div>
                <div class="go-acts">
                    <button class="go-ok" id="goa" style="background:#DC2626;">🗑️ Sim, remover</button>
                    <button class="go-ko" id="goc">Cancelar</button>
                </div>
            </div>`;
            p.querySelector('#goc').onclick = () => this.closePanel();
            p.querySelector('#goa').onclick = () => {
                article.style.transition = 'all .3s';
                article.style.opacity = '0';
                article.style.transform = 'scale(.95)';
                setTimeout(() => article.remove(), 320);

                // Salvar lista de removidos no CMS
                const removed = this.cms.__removed_cards || [];
                if (!removed.includes(article.id)) removed.push(article.id);
                this.store('__removed_cards', removed);

                // Se for card de pacote novo, remove também de __new_packages
                if (article.id.startsWith('card-new-')) {
                    const pkgId = article.id.replace('card-new-', '');
                    const newPkgs = this.cms.__new_packages || {};
                    if (newPkgs[pkgId]) {
                        delete newPkgs[pkgId];
                        this.store('__new_packages', newPkgs);
                    }
                }

                this.closePanel();
                this.toast('✓ Card removido do rascunho', 'ok');
            };
        },

        /* ── ADICIONAR NOVO PACOTE ── */
        pAddPacote() {
            const p = this.panel_('➕ Adicionar Novo Pacote');
            p.innerHTML += `<div class="go-pb">
                <div class="go-info">Preencha os dados básicos. O pacote será adicionado à lista e ficará disponível via <code>pacote.html?id=SEU_ID</code>.</div>
                <div class="go-f"><label>ID do pacote (sem espaços)</label>
                    <input type="text" id="gp-id" placeholder="ex: cancun, dubai, paris2026">
                    <p class="go-hint-txt">Use letras minúsculas, números e _ (underline). Ex: cancun, copa_dubai</p>
                </div>
                <div class="go-f"><label>Título</label><input type="text" id="gp-title" placeholder="Ex: Cancún – Caribe Mexicano"></div>
                <div class="go-f"><label>Subtítulo</label><input type="text" id="gp-sub" placeholder="Ex: Praias paradisíacas e resorts all inclusive"></div>
                <div class="go-f"><label>Localização</label><input type="text" id="gp-loc" placeholder="Ex: Cancún, México"></div>
                <div class="go-f"><label>Duração</label><input type="text" id="gp-dur" placeholder="Ex: 7 dias / 6 noites"></div>
                <div class="go-f"><label>Preço PIX (R$)</label><input type="text" id="gp-price" placeholder="Ex: 8.900,00"></div>
                <div class="go-f"><label>Preço Cartão (R$)</label><input type="text" id="gp-cartao" placeholder="Ex: 9.350,00"></div>
                <div class="go-f"><label>Parcelas</label><input type="text" id="gp-parc" placeholder="Ex: 10x de R$ 935,00 sem juros"></div>
                <div class="go-f"><label>Flag / País</label><input type="text" id="gp-flag" placeholder="Ex: México 🌮"></div>
                <div class="go-f"><label>Badge</label><input type="text" id="gp-badge" placeholder="Ex: 🔥 Oferta  ou  ⭐ Popular"></div>
                <div class="go-f"><label>Categoria</label>
                    <select id="gp-cat" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-family:inherit;font-size:.9rem;" >
                        <option value="nacional">🇧🇷 Nacional (aparece na aba Nacional)</option>
                        <option value="internacional">🌍 Internacional (aparece na aba Internacional)</option>
                        <option value="copa">🏆 Copa 2026 (seção Copa)</option>
                    </select>
                </div>
                <div class="go-f"><label>Imagem 1 — Principal (URL)</label>
                    <input type="url" id="gp-img" placeholder="https://site.com/foto1.jpg">
                </div>
                <div class="go-f"><label>Imagem 2 (URL) — opcional</label>
                    <input type="url" id="gp-img2" placeholder="https://site.com/foto2.jpg">
                </div>
                <div class="go-f"><label>Imagem 3 (URL) — opcional</label>
                    <input type="url" id="gp-img3" placeholder="https://site.com/foto3.jpg">
                    <p class="go-hint-txt">As 3 imagens aparecem no carrossel da página do pacote.</p>
                </div>
                <div class="go-f"><label>Descrição do destino</label>
                    <textarea id="gp-desc" rows="4" placeholder="Descreva o destino e os destaques do pacote…"></textarea>
                </div>
                <div class="go-f"><label>O que está incluso</label>
                    <textarea id="gp-incluso" rows="5" placeholder="Um item por linha. Ex:&#10;✈ Passagem aérea ida e volta&#10;🏨 Hotel 4★ com café da manhã&#10;🚐 Transfer In/Out"></textarea>
                    <p class="go-hint-txt">Um item por linha. Comece com o emoji desejado.</p>
                </div>
                <div class="go-f"><label>Não incluso</label>
                    <textarea id="gp-nao" rows="3" placeholder="Um item por linha. Ex:&#10;Almoços e jantares&#10;Gorjetas"></textarea>
                </div>
                <div class="go-f"><label>Roteiro (um dia por linha)</label>
                    <textarea id="gp-rot" rows="6" placeholder="Formato: Título do dia | Descrição&#10;Ex:&#10;Chegada a Cancún | Transfer ao resort. Check-in e tarde livre.&#10;Praia + Piscina | Dia de relaxamento no resort all inclusive."></textarea>
                    <p class="go-hint-txt">Separe título e descrição com <strong>|</strong>. Um dia por linha.</p>
                </div>
                <div class="go-acts" style="margin-top:16px;">
                    <button class="go-ok" id="goa">✓ Criar Pacote</button>
                    <button class="go-ko" id="goc">Cancelar</button>
                </div>
            </div>`;

            p.querySelector('#goc').onclick = () => this.closePanel();
            p.querySelector('#goa').onclick = () => {
                const id      = p.querySelector('#gp-id').value.trim().replace(/[^a-z0-9_]/gi,'_').toLowerCase();
                const title   = p.querySelector('#gp-title').value.trim();
                const imgUrl  = p.querySelector('#gp-img').value.trim();
                const imgUrl2 = p.querySelector('#gp-img2').value.trim();
                const imgUrl3 = p.querySelector('#gp-img3').value.trim();

                if (!id)    { p.querySelector('#gp-id').focus();    p.querySelector('#gp-id').style.borderColor='#DC2626';    return; }
                if (!title) { p.querySelector('#gp-title').focus(); p.querySelector('#gp-title').style.borderColor='#DC2626'; return; }

                const incluso = p.querySelector('#gp-incluso').value.split('\n').map(s=>s.trim()).filter(Boolean);
                const nao     = p.querySelector('#gp-nao').value.split('\n').map(s=>s.trim()).filter(Boolean);
                const rotLines = p.querySelector('#gp-rot').value.split('\n').map(s=>s.trim()).filter(Boolean);
                const roteiro = rotLines.map((line, i) => {
                    const [t, d] = line.split('|').map(s=>s.trim());
                    return { dia: (i+1) + 'º Dia', title: t || ('Dia ' + (i+1)), desc: d || '' };
                });

                const rawImages = [imgUrl, imgUrl2, imgUrl3].filter(Boolean);
                const images = rawImages.filter(isValidImageSrc);
                if (rawImages.length !== images.length) {
                    this.toast('Alguma imagem foi ignorada por URL invalida', 'err');
                    return;
                }
                if (!images.length) images.push('imagens/destinos/balneario_camboriu.png');

                const novoPacote = {
                    category:    p.querySelector('#gp-cat').value || 'nacional',
                    title:       title,
                    subtitle:    p.querySelector('#gp-sub').value.trim(),
                    location:    p.querySelector('#gp-loc').value.trim(),
                    duration:    p.querySelector('#gp-dur').value.trim(),
                    price:       p.querySelector('#gp-price').value.trim(),
                    priceCartao: p.querySelector('#gp-cartao').value.trim(),
                    parcelas:    p.querySelector('#gp-parc').value.trim(),
                    flag:        p.querySelector('#gp-flag').value.trim(),
                    badge:       p.querySelector('#gp-badge').value.trim(),
                    images,
                    desc:        p.querySelector('#gp-desc').value.trim(),
                    incluso,
                    nao_incluso: nao,
                    roteiro
                };

                // Salvar no CMS como __new_packages
                const existing = this.cms.__new_packages || {};
                existing[id] = novoPacote;
                this.store('__new_packages', existing);

                this.closePanel();
                this.toast('✓ Pacote "' + title + '" criado! Acesse: pacote.html?id=' + id, 'ok');

                // Mostrar link de acesso
                setTimeout(() => {
                    const info = document.createElement('div');
                    info.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1a2436;color:#e8edf5;padding:14px 22px;border-radius:12px;font-size:13px;z-index:999999;box-shadow:0 8px 24px rgba(0,0,0,.4);text-align:center;border:1px solid rgba(255,255,255,.1);';
                    info.innerHTML = `📦 Pacote criado!<br><a href="pacote.html?id=${id}" style="color:#E8B84B;font-weight:700;" target="_blank">→ Abrir pacote.html?id=${id}</a><br><span style="font-size:11px;opacity:.6;margin-top:4px;display:block;">Publique para tornar permanente.</span>`;
                    document.body.appendChild(info);
                    setTimeout(() => info.remove(), 7000);
                }, 400);
            };
        },

        /* ── INSTAGRAM POSTS ── */
        pInstagram() {
            const p = this.panel_('📸 Editar Posts do Instagram');

            // Lê os 3 posts atuais do DOM
            const posts = [1,2,3].map(i => ({
                img:     document.getElementById('insta-img-' + i)?.src || '',
                caption: document.getElementById('insta-caption-' + i)?.textContent?.trim() || '',
                link:    document.getElementById('insta-post-' + i)?.href || ''
            }));

            const rows = posts.map((post, idx) => {
                const i = idx + 1;
                return `
                <div style="border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:14px;margin-bottom:16px;background:rgba(255,255,255,.04);">
                    <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">Post ${i}</div>
                    <img id="go-insta-prev-${i}" src="${post.img}" alt="Preview"
                         style="width:100%;height:140px;object-fit:cover;border-radius:8px;margin-bottom:10px;background:#243048;display:block;">
                    <div class="go-f">
                        <label>URL da Foto</label>
                        <input type="url" id="go-insta-img-${i}" value="${post.img}" placeholder="https://...foto.jpg">
                        <p class="go-hint-txt">Cole a URL direta da imagem do post do Instagram (clique direito → copiar endereço da imagem)</p>
                    </div>
                    <div class="go-f">
                        <label>Link do Post</label>
                        <input type="url" id="go-insta-link-${i}" value="${post.link}" placeholder="https://www.instagram.com/p/...">
                    </div>
                    <div class="go-f">
                        <label>Legenda</label>
                        <textarea id="go-insta-cap-${i}" rows="2" style="resize:vertical;">${post.caption}</textarea>
                    </div>
                </div>`;
            }).join('');

            p.innerHTML += `<div class="go-pb">
                <div class="go-info">
                    📌 <strong>Como pegar a URL da foto:</strong><br>
                    1. Abra o post no Instagram no computador<br>
                    2. Clique com botão direito na foto<br>
                    3. Selecione "Copiar endereço da imagem"<br>
                    4. Cole no campo "URL da Foto" abaixo
                </div>
                ${rows}
                <div class="go-f" style="margin-top:4px;">
                    <label>Link do Perfil (botão "Ver perfil")</label>
                    <input type="url" id="go-insta-perfil" value="${document.getElementById('insta-perfil-btn')?.href || 'https://www.instagram.com/asasbrasilviagens'}" placeholder="https://www.instagram.com/seuperfil">
                </div>
                <div class="go-acts" style="margin-top:16px;">
                    <button class="go-ok" id="goa">✓ Aplicar</button>
                    <button class="go-ko" id="goc">Cancelar</button>
                </div>
            </div>`;

            // Preview ao vivo ao digitar URL
            [1,2,3].forEach(i => {
                const imgInput = p.querySelector(`#go-insta-img-${i}`);
                const prev     = p.querySelector(`#go-insta-prev-${i}`);
                let debounce;
                imgInput.oninput = () => {
                    clearTimeout(debounce);
                    debounce = setTimeout(() => {
                        const v = imgInput.value.trim();
                        if (v) prev.src = v;
                    }, 600);
                };
            });

            p.querySelector('#goc').onclick = () => this.closePanel();
            p.querySelector('#goa').onclick = () => {
                [1,2,3].forEach(i => {
                    const imgUrl  = p.querySelector(`#go-insta-img-${i}`).value.trim();
                    const link    = p.querySelector(`#go-insta-link-${i}`).value.trim();
                    const caption = p.querySelector(`#go-insta-cap-${i}`).value.trim();

                    // Atualiza DOM
                    const imgEl     = document.getElementById('insta-img-' + i);
                    const linkEl    = document.getElementById('insta-post-' + i);
                    const captionEl = document.getElementById('insta-caption-' + i);
                    if (imgEl && imgUrl)     imgEl.src = imgUrl;
                    if (linkEl && link)      linkEl.href = link;
                    if (captionEl && caption) captionEl.textContent = caption;

                    // Salva no CMS
                    if (imgUrl)  this.store('insta-img-' + i,     { src: imgUrl });
                    if (link)    this.store('insta-link-' + i,    { href: link });
                    if (caption) this.store('insta-caption-' + i, { text: caption });
                });

                // Salva link do perfil
                const perfilUrl = p.querySelector('#go-insta-perfil').value.trim();
                const perfilBtn = document.getElementById('insta-perfil-btn');
                if (perfilBtn && perfilUrl) {
                    perfilBtn.href = perfilUrl;
                    this.store('insta-perfil-btn', { href: perfilUrl });
                }

                this.closePanel();
                this.toast('✓ Posts do Instagram salvos no rascunho', 'ok');
            };
        },

        /* ── CORES GLOBAIS ── */
        pColors() {
            const root = document.documentElement;
            const g = v => getComputedStyle(root).getPropertyValue(v).trim() || '#000000';
            const p = this.panel_('🎨 Cores Globais do Site');
            p.innerHTML += `<div class="go-pb">
                <div class="go-info">Altera as cores principais em todo o site de uma só vez.</div>
                <div class="go-cr"><label>🟠 Laranja principal</label><input type="color" id="gog1" value="${this.hex(g('--orange'))||'#E05220'}"></div>
                <div class="go-cr"><label>🟠 Laranja escuro</label><input type="color" id="gog2" value="${this.hex(g('--orange-dark'))||'#c04418'}"></div>
                <div class="go-cr"><label>🔵 Azul destaque</label><input type="color" id="gog3" value="${this.hex(g('--blue'))||'#22A8C9'}"></div>
                <div class="go-cr"><label>⬛ Fundo dark</label><input type="color" id="gog4" value="${this.hex(g('--dark'))||'#0f1623'}"></div>
                <hr class="go-hr">
                <div class="go-f"><label>📱 Número do WhatsApp</label>
                    <input type="text" id="gogwa" value="${this.cms.whatsapp||''}" placeholder="5521966501302">
                    <p class="go-hint-txt">Somente números com DDD e código do país. Atualiza todos os botões do site.</p>
                </div>
                <div class="go-acts">
                    <button class="go-ok" id="goa">✓ Aplicar cores</button>
                    <button class="go-ko" id="goc">Cancelar</button>
                </div>
            </div>`;
            const vars   = ['--orange','--orange-dark','--blue','--dark'];
            const inputs = ['gog1','gog2','gog3','gog4'].map(id => p.querySelector('#'+id));
            const waInp  = p.querySelector('#gogwa');
            inputs.forEach((inp, i) => {
                inp.oninput = () => root.style.setProperty(vars[i], inp.value);
            });
            waInp.oninput = () => {
                const num = waInp.value.replace(/\D/g, '');
                if (num) document.querySelectorAll('a[href*="wa.me/"]').forEach(a => {
                    a.href = a.href.replace(/wa\.me\/\d+/, 'wa.me/' + num);
                });
            };
            p.querySelector('#goa').onclick = () => {
                const colors = {};
                vars.forEach((v, i) => colors[v] = inputs[i].value);
                this.cms.colors = { ...(this.cms.colors || {}), ...colors };
                const num = waInp.value.replace(/\D/g, '');
                if (num) this.cms.whatsapp = num;
                localStorage.setItem(CMS_KEY, JSON.stringify(this.cms));
                this.markDirty();
                this.closePanel();
                this.toast('✓ Cores salvas no rascunho', 'ok');
            };
            p.querySelector('#goc').onclick = () => {
                vars.forEach(v => root.style.removeProperty(v));
                applyContent(this.cms);
                this.closePanel();
            };
        },

        /* ── REVERTER ── */
        revert() {
            let hasDraft = false;
            try { hasDraft = Object.keys(JSON.parse(localStorage.getItem(CMS_KEY) || '{}')).length > 0; } catch (_) {}
            if (!hasDraft) { this.toast('Não há rascunho para descartar', ''); return; }
            if (!confirm('Descartar todas as alterações não publicadas? O site voltará ao conteúdo publicado.')) return;
            localStorage.removeItem(CMS_KEY);
            document.querySelectorAll('.go-dirty-dot').forEach(d => d.remove());
            this.toast('Rascunho descartado. Recarregando…', '');
            setTimeout(() => location.reload(), 900);
        },

        /* ── PUBLICAR ── */
        async publish() {
            if (isLocal) {
                this.toast('⚠️ Publicar só funciona no site no Vercel', 'err');
                this.panel_('⚠️ Publicação Indisponível').innerHTML += `<div class="go-pb">
                    <div class="go-local-warn" style="margin-bottom:0;">
                        <strong>Você está no modo local.</strong><br>
                        Para publicar, acesse o editor pelo site publicado:<br><br>
                        <a href="https://321go-psi.vercel.app/admin/login.html" target="_blank" style="color:#C2410C;font-weight:700;">
                            → Abrir site no Vercel
                        </a>
                    </div>
                    <button class="go-ko" style="width:100%;margin-top:14px" onclick="this.closest('.go-panel').remove()">Fechar</button>
                </div>`;
                return;
            }

            this.cms = cleanContent(this.cms);
            localStorage.setItem(CMS_KEY, JSON.stringify(this.cms));

            const elems   = Object.keys(this.cms).filter(k => k !== 'colors' && k !== 'whatsapp');
            const hasCols = this.cms.colors && Object.keys(this.cms.colors).length > 0;
            const hasWA   = !!this.cms.whatsapp;
            const total   = elems.length + (hasCols ? 1 : 0) + (hasWA ? 1 : 0);

            if (total === 0) { this.toast('Nenhuma alteração para publicar', ''); return; }

            let items = '';
            if (elems.length) items += `<li>${elems.length} elemento(s) editados</li>`;
            if (hasCols) items += `<li>Cores globais do site</li>`;
            if (hasWA)   items += `<li>WhatsApp: ${this.cms.whatsapp}</li>`;

            const hasSavedSecret = !!localStorage.getItem(SECRET_KEY);
            const p = this.panel_('🚀 Publicar Alterações');
            p.innerHTML += `<div class="go-pb">
                <div class="go-info" style="background:#EFF6FF;border:1px solid #BFDBFE;color:#1E40AF;border-radius:10px;padding:14px;margin-bottom:14px;line-height:1.8;">
                    <strong>O que será publicado:</strong><ul style="margin:8px 0 0 16px;">${items}</ul>
                </div>
                ${!hasSavedSecret ? `<div class="go-f"><label>🔑 Senha de acesso</label>
                    <input type="password" id="gopwd" placeholder="Digite sua senha admin"></div>` : ''}
                <p class="go-hint-txt">Estas mudanças ficarão visíveis para todos os visitantes em ~30 segundos.</p>
                <div class="go-acts" style="margin-top:14px;">
                    <button class="go-ok" id="goa">✓ Confirmar e publicar</button>
                    <button class="go-ko" id="goc">Cancelar</button>
                </div>
            </div>`;

            p.querySelector('#goc').onclick = () => this.closePanel();
            p.querySelector('#goa').onclick = async () => {
                const pwdEl = p.querySelector('#gopwd');
                let secret = localStorage.getItem(SECRET_KEY) || '';
                if (pwdEl) {
                    if (!pwdEl.value) { pwdEl.focus(); pwdEl.style.borderColor='#DC2626'; return; }
                    secret = pwdEl.value;
                    localStorage.setItem(SECRET_KEY, secret);
                }
                p.querySelector('.go-pb').innerHTML = `<div class="go-loading"><span class="go-spin">⏳</span>Publicando alterações…</div>`;
                try {
                    const res = await fetch('/api/publish', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ content: cleanContent(this.cms), secret })
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                        localStorage.removeItem(CMS_KEY);
                        const now = new Date().toLocaleString('pt-BR', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
                        localStorage.setItem('asasbrasil_last_pub', now);
                        document.querySelectorAll('.go-dirty-dot').forEach(d => d.remove());
                        const lp = document.querySelector('.go-last-pub');
                        if (lp) { lp.textContent = 'Pub: ' + now; }
                        else {
                            const sep = document.createElement('div'); sep.className = 'go-sep';
                            const span = document.createElement('span'); span.className = 'go-last-pub'; span.textContent = 'Pub: ' + now;
                            const btn2 = document.getElementById('go-colors');
                            if (btn2) { btn2.before(span); btn2.before(sep); }
                        }
                        applyContent(this.cms);
                        p.querySelector('.go-pb').innerHTML = `
                            <div class="go-pub-box">✅ <strong>Publicado com sucesso!</strong><br>
                            A página vai recarregar em 3 segundos para confirmar.</div>
                            <button class="go-ok" style="width:100%;margin-top:12px" onclick="location.reload()">🔄 Recarregar agora</button>`;
                        this.toast('✅ Publicado! Recarregando em 3s…', 'ok');
                        setTimeout(() => location.reload(), 3000);
                    } else {
                        throw new Error(data.error || 'Erro desconhecido');
                    }
                } catch (err) {
                    p.querySelector('.go-pb').innerHTML = `
                        <div class="go-pub-err">❌ <strong>Erro:</strong> ${err.message}</div>
                        <button class="go-ko" style="width:100%;margin-top:12px" onclick="this.closest('.go-panel').remove()">Fechar</button>`;
                    this.toast('❌ Erro ao publicar', 'err');
                }
            };
        },

        /* ── SAIR ── */
        exit() {
            let hasDraft = false;
            try { hasDraft = Object.keys(JSON.parse(localStorage.getItem(CMS_KEY) || '{}')).length > 0; } catch (_) {}
            if (hasDraft && !confirm('Sair do editor? Você tem alterações não publicadas (rascunho salvo).')) return;
            sessionStorage.removeItem('editor_active');
            localStorage.removeItem(AUTH_KEY);
            localStorage.removeItem(SECRET_KEY);
            const u = new URL(location.href);
            u.searchParams.delete('editor');
            location.replace(u.toString());
        },

        /* ── HELPERS ── */
        panel_(title) {
            this.closePanel();
            const p = document.createElement('div');
            p.className = 'go-panel';
            p.style.cssText = 'color:#e8edf5;background:#1a2436;';
            p.innerHTML = `<div class="go-ph"><h3>${title}</h3><button class="go-px" title="Fechar">✕</button></div>`;
            document.body.appendChild(p);
            p.querySelector('.go-px').onclick = () => this.closePanel();
            this.drag_(p);
            this.panel = p;
            return p;
        },

        closePanel() {
            document.querySelectorAll('.go-panel').forEach(x => x.remove());
            document.querySelectorAll('.go-sel').forEach(x => x.classList.remove('go-sel'));
            this.panel = null;
        },

        drag_(el) {
            if (window.matchMedia('(max-width:600px)').matches) return;
            const h = el.querySelector('.go-ph');
            let d=false, sx=0, sy=0, ox=0, oy=0;
            h.onmousedown = e => { d=true; sx=e.clientX; sy=e.clientY; ox=el.offsetLeft; oy=el.offsetTop; e.preventDefault(); };
            document.addEventListener('mousemove', e => { if(!d) return; el.style.left=ox+e.clientX-sx+'px'; el.style.top=oy+e.clientY-sy+'px'; });
            document.addEventListener('mouseup', () => d=false);
        },

        store(key, val) {
            if (val && typeof val === 'object' && val.src != null && !isValidImageSrc(val.src)) {
                this.toast('Imagem ignorada: use URL direta, upload ou arquivo em imagens/', 'err');
                return;
            }
            // ── SINCRONIZAÇÃO AUTOMÁTICA ──────────────────────────────────
            // Qualquer edição de preço/título/parcela em qualquer página
            // é salva em __db_overrides[pkgId][campo] — fonte única de verdade.
            const DB_FIELDS = {
                'pkg-price':        'price',
                'pkg-price-cartao': 'priceCartao',
                'pkg-parcelas':     'parcelas',
                'pkg-title':        'title',
                'pkg-subtitle':     'subtitle',
                'pkg-badge':        'badge',
                'pkg-desc':         'desc',
            };
            const HOME_FIELDS = {
                'pix':    'priceCartao',
                'parcel': 'parcelas',
                'titulo': 'title',
                'dest':   'location',
                'badge':  'badge',
            };

            // Extrai o valor numérico/texto limpo do HTML
            // Ex: "No cartão: <strong>R$ 2.550,50</strong>" → "2.550,50"
            // Ex: "ou 10x de <strong>R$ 255,00</strong> sem juros" → "10x de R$ 255,00 sem juros"
            function extractValue(html, dbField) {
                if (!html) return '';
                const plain = html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g,' ').trim();
                // Para preço cartão: extrai só o número após "R$"
                if (dbField === 'priceCartao') {
                    const m = plain.match(/R\$\s*([\d.,]+)/);
                    return m ? m[1] : plain;
                }
                // Para preço PIX: extrai só o número após "R$"
                if (dbField === 'price') {
                    const m = plain.match(/R\$\s*([\d.,]+)/);
                    return m ? m[1] : plain;
                }
                return plain;
            }

            // Padrão pacote.html: "gramado-pkg-price"
            const pkgMatch = key.match(/^([a-z0-9_]+)-pkg-(.+)$/);
            if (pkgMatch) {
                const [, pkgId, field] = pkgMatch;
                const dbField = DB_FIELDS['pkg-' + field];
                if (dbField && typeof DB !== 'undefined' && DB[pkgId]) {
                    const overrides = this.cms.__db_overrides || {};
                    if (!overrides[pkgId]) overrides[pkgId] = {};
                    const rawVal = val.html != null
                        ? extractValue(val.html, dbField)
                        : (val.text || '');
                    if (rawVal) overrides[pkgId][dbField] = rawVal;
                    this.cms.__db_overrides = overrides;
                    Object.assign(DB[pkgId], overrides[pkgId]);
                }
            }

            // Padrão home: "pix-gramado" ou "parcel-gramado"
            const homeMatch = key.match(/^(pix|parcel|titulo|dest|badge)-([a-z0-9_]+)$/);
            if (homeMatch) {
                const [, field, pkgId] = homeMatch;
                const dbField = HOME_FIELDS[field];
                if (dbField && typeof DB !== 'undefined' && DB[pkgId]) {
                    const overrides = this.cms.__db_overrides || {};
                    if (!overrides[pkgId]) overrides[pkgId] = {};
                    const rawVal = val.html != null
                        ? extractValue(val.html, dbField)
                        : (val.text || '');
                    if (rawVal) overrides[pkgId][dbField] = rawVal;
                    this.cms.__db_overrides = overrides;
                    Object.assign(DB[pkgId], overrides[pkgId]);
                }
            }

            this.cms[key] = val;
            localStorage.setItem(CMS_KEY, JSON.stringify(this.cms));
            this.markDirty();
        },

        markDirty() {
            const btn = document.getElementById('go-pub');
            if (btn && !btn.querySelector('.go-dirty-dot')) {
                const dot = document.createElement('span');
                dot.className = 'go-dirty-dot';
                btn.prepend(dot);
            }
        },

        toast(msg, type='') {
            document.querySelectorAll('.go-toast').forEach(t => t.remove());
            const t = document.createElement('div');
            t.className = 'go-toast' + (type?' '+type:'');
            t.textContent = msg;
            document.body.appendChild(t);
            requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
            setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 320); }, 3000);
        },

        hex(rgb) {
            if (!rgb || rgb === 'transparent' || rgb.includes('rgba(0, 0, 0, 0)')) return '#ffffff';
            if (rgb.startsWith('#')) return rgb;
            const m = rgb.match(/\d+/g);
            if (!m || m.length < 3) return '#ffffff';
            return '#' + m.slice(0,3).map(n => (+n).toString(16).padStart(2,'0')).join('');
        }
    };

    /* ─── BOOT ──────────────────────────────────────────────── */
    document.addEventListener('DOMContentLoaded', async () => {
        const srv = await fetchContent();
        await loadAndApply(srv);
        if (editMode) {
            await ED.start(srv);
            setTimeout(() => { ED.bindAll(); ED.injectRemoveButtons(); }, 500);
        }
    });

    window._GO_CMS = ED;
})();
