/**
 * ASAS BRASIL VIAGENS — EDITOR VISUAL v3
 * Clique em qualquer elemento destacado para editar.
 * Sem necessidade de selecionar modo antes.
 */
(function () {
    'use strict';

    const CMS_KEY     = 'asasbrasil_cms_v3';
    const AUTH_KEY    = 'asasbrasil_auth';
    const CONTENT_URL = '/api/content';

    /* ─── AUTH ─────────────────────────────────────────────── */
    const auth     = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
    const isAdmin  = auth && auth.expires > Date.now();
    const params   = new URLSearchParams(location.search);
    const editMode = isAdmin && (params.get('editor') === '1' || sessionStorage.getItem('editor_active') === '1');

    /* ─── APLICAR CONTEÚDO ──────────────────────────────────── */
    function applyContent(cms) {
        if (!cms || !Object.keys(cms).length) return;

        // CRÍTICO: aplica __db_overrides ao DB antes de qualquer render
        if (cms.__db_overrides && typeof DB !== 'undefined') {
            Object.entries(cms.__db_overrides).forEach(([pkgId, ov]) => {
                if (DB[pkgId]) Object.assign(DB[pkgId], ov);
            });
        }

        if (cms.colors) {
            const aliases = { '--primary': '--navy', '--primary-dark': '--navy-dark', '--text-dark': '--text' };
            Object.entries(cms.colors).forEach(([k, v]) => {
                document.documentElement.style.setProperty(k, v);
                if (aliases[k]) document.documentElement.style.setProperty(aliases[k], v);
            });
        }
        if (cms.whatsapp) {
            document.querySelectorAll('a[href*="wa.me/"]').forEach(a => {
                a.href = a.href.replace(/wa\.me\/\d+/, 'wa.me/' + cms.whatsapp);
            });
        }
        document.querySelectorAll('[data-eid]').forEach(el => {
            const d = cms[el.dataset.eid];
            if (!d) return;
            if (d.html  != null) el.innerHTML = d.html;
            if (d.src   != null && el.tagName === 'IMG') el.src = d.src;
            if (d.href  != null) el.setAttribute('href', d.href);
            if (d.target!= null) el.setAttribute('target', d.target);
            if (d.style)         Object.assign(el.style, d.style);
        });

        // Remove cards marcados para remoção
        if (Array.isArray(cms.__removed_cards)) {
            cms.__removed_cards.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.remove();
            });
        }

        // Injeta novos pacotes na home
        if (cms.__new_packages && typeof cms.__new_packages === 'object') {
            const grid = document.querySelector('.cards-grid');
            if (grid) {
                const removed = Array.isArray(cms.__removed_cards) ? cms.__removed_cards : [];
                Object.entries(cms.__new_packages).forEach(([pkgId, pkg]) => {
                    const cardId = 'card-new-' + pkgId;
                    if (removed.includes(cardId)) return;
                    if (document.getElementById(cardId)) return;
                    const a = document.createElement('a');
                    a.className = 'card-link rv'; a.id = cardId;
                    a.href = 'pacote.html?id=' + pkgId;
                    const img = pkg.images && pkg.images[0] ? pkg.images[0] : 'https://images.unsplash.com/photo-1488085061387-422e29b40080?auto=format&fit=crop&w=800&q=80';
                    a.innerHTML = `
                        <div class="card-img">
                            <img src="${img}" alt="${pkg.title}" loading="lazy">
                            <div class="card-flag">${pkg.flag || '🌍'}</div>
                            <div class="card-overlay"><span>Ver pacote <i class="fa-solid fa-arrow-right"></i></span></div>
                        </div>
                        <div class="card-body">
                            <div class="card-loc"><i class="fa-solid fa-location-dot"></i> ${pkg.location || ''}</div>
                            <h3>${pkg.title}</h3>
                            <div class="card-foot">
                                <div class="card-price">R$ ${pkg.price || '—'} <small>/ pessoa</small></div>
                                <span class="card-arrow">Saiba mais <i class="fa-solid fa-arrow-right"></i></span>
                            </div>
                        </div>`;
                    grid.appendChild(a);
                });
            }
        }
    }

    async function fetchContent() {
        try {
            const r = await fetch(CONTENT_URL + '?_=' + Date.now());
            return r.ok ? await r.json() : {};
        } catch (_) { return {}; }
    }

    async function loadAndApply(srv) {
        let merged = (srv && typeof srv === 'object') ? { ...srv } : {};
        window.__ASAS_SRV_CMS = merged;
        // Sempre mescla rascunho local se for admin em modo editor
        if (editMode) {
            try {
                const draft = JSON.parse(localStorage.getItem(CMS_KEY) || '{}');
                merged = { ...merged, ...draft };
            } catch (_) {}
        }
        // SEMPRE aplica o conteúdo do servidor para todos os visitantes
        applyContent(merged);
        return merged;
    }

    /* ─── CSS ───────────────────────────────────────────────── */
    function injectCSS() {
        if (document.getElementById('ld-css')) return;
        const s = document.createElement('style');
        s.id = 'ld-css';
        s.textContent = `
        #ld-bar{position:fixed;top:0;left:0;right:0;z-index:99999;height:52px;background:#111827;display:flex;align-items:center;gap:6px;padding:0 14px;box-shadow:0 2px 16px rgba(0,0,0,.5);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;}
        #ld-bar *{box-sizing:border-box;}
        .ld-brand{color:#fff;font-weight:700;display:flex;align-items:center;gap:7px;padding-right:14px;border-right:1px solid rgba(255,255,255,.12);white-space:nowrap;margin-right:4px;font-size:13px;}
        .ld-dot{width:8px;height:8px;border-radius:50%;background:#22C55E;flex-shrink:0;animation:ldpulse 1.5s infinite;}
        @keyframes ldpulse{0%,100%{opacity:1}50%{opacity:.3}}
        .ld-hint-text{color:rgba(255,255,255,.55);font-size:12px;white-space:nowrap;}
        .ld-btn{padding:7px 14px;border:none;border-radius:8px;background:transparent;color:rgba(255,255,255,.75);cursor:pointer;font-size:12.5px;font-weight:600;display:inline-flex;align-items:center;gap:5px;transition:all .15s;white-space:nowrap;outline:none;}
        .ld-btn:hover{background:rgba(255,255,255,.12);color:#fff;}
        .ld-btn.blue{background:#0088A9;color:#fff;}
        .ld-btn.blue:hover{background:#006B87;}
        .ld-btn.green{background:#16A34A;color:#fff;}
        .ld-btn.green:hover{background:#15803D;}
        .ld-btn.orange{background:#7DC420;color:#fff;}
        .ld-btn.orange:hover{background:#69AB1A;}
        .ld-btn.red{color:rgba(255,255,255,.45);font-size:12px;}
        .ld-btn.red:hover{color:#F87171;background:rgba(248,113,113,.1);}
        .ld-sep{width:1px;height:28px;background:rgba(255,255,255,.12);margin:0 4px;flex-shrink:0;}
        .ld-spacer{flex:1;}

        body.ld-on{padding-top:52px!important;}
        body.ld-on [data-eid]{cursor:pointer!important;position:relative;transition:outline .1s;}
        body.ld-on [data-eid]:hover{outline:2px dashed #7DC420!important;outline-offset:3px;}
        body.ld-on [data-eid]:hover::after{content:attr(data-elabel);position:absolute;top:-26px;left:0;background:#7DC420;color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;white-space:nowrap;z-index:99997;pointer-events:none;font-family:-apple-system,sans-serif;}
        body.ld-on [data-eid].ld-sel{outline:2px solid #0088A9!important;outline-offset:3px;}
        body.ld-on .card-overlay,body.ld-on .card-flag{pointer-events:none!important;}
        body.ld-on a.card-link{pointer-events:none!important;}
        body.ld-on a.card-link [data-eid]{pointer-events:auto!important;}

        .ld-panel{position:fixed;top:62px;right:18px;width:320px;background:#fff;border-radius:16px;z-index:99998;box-shadow:0 20px 60px rgba(0,0,0,.25);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;overflow:hidden;}
        .ld-ph{background:#111827;color:#fff;padding:13px 16px;display:flex;align-items:center;justify-content:space-between;cursor:move;user-select:none;}
        .ld-ph h3{font-size:13px;font-weight:700;margin:0;}
        .ld-px{background:none;border:none;color:rgba(255,255,255,.55);font-size:18px;cursor:pointer;padding:0 2px;line-height:1;}
        .ld-px:hover{color:#fff;}
        .ld-pb{padding:16px;max-height:calc(100vh - 130px);overflow-y:auto;}
        .ld-f{margin-bottom:13px;}
        .ld-f label{display:block;font-size:11px;font-weight:700;color:#374151;margin-bottom:5px;text-transform:uppercase;letter-spacing:.06em;}
        .ld-f input[type=text],.ld-f input[type=url],.ld-f textarea,.ld-f select{width:100%;padding:8px 11px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;outline:none;font-family:inherit;resize:vertical;transition:border .15s;}
        .ld-f input:focus,.ld-f textarea:focus,.ld-f select:focus{border-color:#0088A9;}
        .ld-rich{min-height:70px;padding:9px 11px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;outline:none;transition:border .15s;line-height:1.5;}
        .ld-rich:focus{border-color:#0088A9;}
        .ld-fmts{display:flex;gap:5px;margin-top:6px;}
        .ld-fmts button{padding:4px 11px;border:1.5px solid #E5E7EB;border-radius:6px;background:#fff;cursor:pointer;font-size:13px;font-weight:700;transition:background .1s;}
        .ld-fmts button:hover{background:#F3F4F6;}
        .ld-cr{display:flex;align-items:center;gap:10px;margin-bottom:9px;}
        .ld-cr label{flex:1;font-size:12.5px;color:#374151;}
        .ld-cr input[type=color]{width:40px;height:32px;padding:2px;border:1.5px solid #E5E7EB;border-radius:6px;cursor:pointer;}
        .ld-prev{width:100%;height:110px;object-fit:cover;border-radius:9px;margin-bottom:10px;background:#F3F4F6;display:block;}
        .ld-acts{display:flex;gap:8px;margin-top:14px;}
        .ld-ok{flex:1;padding:9px;background:#0088A9;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;transition:background .15s;}
        .ld-ok:hover{background:#006B87;}
        .ld-ko{padding:9px 14px;background:#F3F4F6;color:#374151;border:none;border-radius:8px;font-size:13px;cursor:pointer;}
        .ld-ko:hover{background:#E5E7EB;}
        .ld-hint{font-size:11px;color:#9CA3AF;margin-top:4px;line-height:1.5;}
        .ld-hr{border:none;border-top:1px solid #F3F4F6;margin:12px 0;}
        .ld-g2{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
        .ld-info{font-size:12px;color:#6B7280;background:#F9FAFB;border-radius:8px;padding:10px;margin-bottom:12px;line-height:1.5;}

        .ld-toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(16px);background:#111827;color:#fff;padding:11px 22px;border-radius:50px;font-size:13px;font-weight:600;z-index:999999;opacity:0;transition:all .28s;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,.3);font-family:-apple-system,sans-serif;}
        .ld-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}
        .ld-toast.ok{background:#16A34A;}
        .ld-toast.err{background:#DC2626;}

        .ld-pub-box{background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:14px;font-size:13px;color:#166534;line-height:1.6;}
        .ld-pub-err{background:#FEF2F2;border:1px solid #FCA5A5;border-radius:10px;padding:14px;font-size:13px;color:#991B1B;line-height:1.6;}
        .ld-spin{font-size:26px;animation:ldspin 1s linear infinite;display:block;margin-bottom:8px;}
        @keyframes ldspin{to{transform:rotate(360deg)}}
        .ld-loading{text-align:center;padding:24px 16px;color:#6B7280;font-size:13px;}
        .ld-dirty-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#FCD34D;margin-right:4px;flex-shrink:0;}
        .ld-last-pub{color:rgba(255,255,255,.35);font-size:11px;white-space:nowrap;}

        @media(max-width:600px){
            #ld-bar{padding:0 8px;gap:2px;height:52px;}
            .ld-hint-text,.ld-sep,.ld-last-pub{display:none;}
            .ld-brand{padding-right:8px;font-size:12px;}
            .ld-btn{padding:7px 10px;font-size:14px;}
            .ld-btn-label{display:none;}
            .ld-panel{left:6px;right:6px;width:auto;top:58px;max-height:calc(100dvh - 66px);overflow-y:auto;}
            .ld-pb{max-height:none;padding:14px;}
            .ld-ph{cursor:default;}
            .ld-f input[type=text],.ld-f input[type=url],.ld-f textarea,.ld-f select,.ld-f input[type=password],.ld-rich{font-size:16px;}
            .ld-cr input[type=color]{width:44px;height:38px;}
            .ld-ok,.ld-ko{font-size:15px;padding:11px;}
        }
        `;
        document.head.appendChild(s);
    }

    /* ─── EDITOR ─────────────────────────────────────────────── */
    const ED = {
        cms: {},
        panel: null,

        async start(srv) {
            injectCSS();
            // Reconstrói cms: servidor como base + rascunho local por cima
            let draft = {};
            try { draft = JSON.parse(localStorage.getItem(CMS_KEY) || '{}'); } catch (_) {}
            // Rascunho local tem PRIORIDADE sobre servidor
            this.cms = Object.assign({}, srv || {}, draft);
            document.body.classList.add('ld-on');
            sessionStorage.setItem('editor_active', '1');
            this.buildBar();
            this.bindAll();
            this.injectRemoveButtons();
            if (Object.keys(draft).length > 0) this.markDirty();
        },

        buildBar() {
            if (document.getElementById('ld-bar')) return;
            const bar = document.createElement('div');
            bar.id = 'ld-bar';
            const lastPub = localStorage.getItem('asasbrasil_last_pub') || '';
            bar.innerHTML = `
            <div class="ld-brand"><span class="ld-dot"></span>Asas Brasil Editor</div>
            <span class="ld-hint-text">👆 Clique em qualquer elemento para editar</span>
            <div class="ld-spacer"></div>
            ${lastPub ? `<span class="ld-last-pub">Pub: ${lastPub}</span><div class="ld-sep"></div>` : ''}
            <button class="ld-btn" id="ld-add-pkg">➕ <span class="ld-btn-label">Pacote</span></button>
            <div class="ld-sep"></div>
            <button class="ld-btn orange" id="ld-colors">🎨 <span class="ld-btn-label">Cores</span></button>
            <div class="ld-sep"></div>
            <button class="ld-btn green" id="ld-pub">🚀 <span class="ld-btn-label">Publicar</span></button>
            <div class="ld-sep"></div>
            <button class="ld-btn" id="ld-revert" title="Descartar rascunho">↩ <span class="ld-btn-label">Reverter</span></button>
            <button class="ld-btn red" id="ld-exit">✕ <span class="ld-btn-label">Sair</span></button>`;
            document.body.prepend(bar);
            document.getElementById('ld-add-pkg').onclick = () => this.pAddPacote();
            document.getElementById('ld-colors').onclick  = () => this.pColors();
            document.getElementById('ld-pub').onclick     = () => this.publish();
            document.getElementById('ld-revert').onclick  = () => this.revert();
            document.getElementById('ld-exit').onclick    = () => this.exit();
        },

        bindAll() {
            if (this._ldDelegated) return;
            this._ldDelegated = true;
            document.addEventListener('click', e => {
                const el = e.target.closest('[data-eid]');
                if (el && document.body.classList.contains('ld-on')) {
                    if (e.target.closest('.ld-panel') || e.target.closest('#ld-bar')) return;
                    e.preventDefault();
                    e.stopPropagation();
                    document.querySelectorAll('.ld-sel').forEach(x => x.classList.remove('ld-sel'));
                    el.classList.add('ld-sel');
                    this.dispatch(el);
                }
            }, true);
        },

        dispatch(el) {
            if (el.tagName === 'IMG')      this.pImage(el);
            else if (el.tagName === 'A')   this.pLink(el);
            else                           this.pText(el);
        },

        /* ── TEXTO ── */
        pText(el) {
            const origHTML  = el.innerHTML;
            const origStyle = el.getAttribute('style') || '';
            const cs = getComputedStyle(el);
            let colorChanged = false, sizeChanged = false;
            const p = this.panel_('✏️ Editar Texto — ' + (el.dataset.elabel || ''));
            p.innerHTML += `<div class="ld-pb">
                <div class="ld-f"><label>Conteúdo</label>
                    <div class="ld-rich" contenteditable="true" id="ldr">${el.innerHTML}</div>
                    <div class="ld-fmts">
                        <button onmousedown="event.preventDefault();document.execCommand('bold')"><b>N</b></button>
                        <button onmousedown="event.preventDefault();document.execCommand('italic')"><i>I</i></button>
                        <button onmousedown="event.preventDefault();document.execCommand('underline')"><u>S</u></button>
                    </div>
                </div>
                <div class="ld-g2">
                    <div class="ld-f"><label>Cor do texto</label><input type="color" id="ldtc" value="${this.hex(cs.color)}"></div>
                    <div class="ld-f"><label>Tamanho (px)</label><input type="text" id="ldfs" value="${parseInt(cs.fontSize)||16}"></div>
                </div>
                <div class="ld-acts">
                    <button class="ld-ok" id="lda">✓ Aplicar</button>
                    <button class="ld-ko" id="ldc">Cancelar</button>
                </div>
            </div>`;
            const rich = p.querySelector('#ldr');
            const tc   = p.querySelector('#ldtc');
            const fs   = p.querySelector('#ldfs');
            rich.oninput = () => el.innerHTML = rich.innerHTML;
            tc.oninput   = () => { colorChanged = true; el.style.color = tc.value; };
            fs.oninput   = () => { sizeChanged  = true; el.style.fontSize = fs.value + 'px'; };
            p.querySelector('#lda').onclick = () => {
                const styleOverride = {};
                if (colorChanged) styleOverride.color = tc.value;
                if (sizeChanged)  styleOverride.fontSize = fs.value + 'px';
                const entry = { html: el.innerHTML };
                if (Object.keys(styleOverride).length) entry.style = styleOverride;
                this.store(el.dataset.eid, entry);
                this.closePanel();
                this.toast('✓ Texto salvo no rascunho', 'ok');
            };
            p.querySelector('#ldc').onclick = () => {
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
            p.innerHTML += `<div class="ld-pb">
                <div style="margin-bottom:10px;">
                    <div style="font-size:11px;color:#6B7280;margin-bottom:4px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Imagem atual</div>
                    <img id="ldprev" src="${origSrc}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;background:#F3F4F6;display:block;">
                </div>
                <div class="ld-f">
                    <label>📂 Enviar do computador</label>
                    <button id="ldbtn" style="width:100%;padding:10px;border:2px dashed #E5E7EB;border-radius:8px;background:#F9FAFB;cursor:pointer;font-size:13px;color:#374151;transition:border .15s;">
                        Escolher arquivo (JPG, PNG, WEBP)
                    </button>
                    <input type="file" id="ldfile" accept="image/jpeg,image/png,image/webp,image/gif" style="display:none">
                    <div id="ldupstatus" style="margin-top:6px;font-size:12px;"></div>
                </div>
                <div class="ld-f">
                    <label>🔗 Ou cole uma URL de imagem</label>
                    <input type="url" id="ldiu" value="" placeholder="https://images.unsplash.com/...">
                    <p style="font-size:11px;color:#9CA3AF;margin-top:4px;">Cole a URL completa da nova imagem aqui</p>
                </div>
                <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:10px;font-size:12px;color:#166534;margin-bottom:12px;">
                    ✅ Após escolher a imagem, clique <strong>✓ Salvar Imagem</strong>
                </div>
                <div class="ld-acts">
                    <button class="ld-ok" id="lda">✓ Salvar Imagem</button>
                    <button class="ld-ko" id="ldc">Cancelar</button>
                </div>
            </div>`;
            const ui     = p.querySelector('#ldiu');
            const pv     = p.querySelector('#ldprev');
            const btn    = p.querySelector('#ldbtn');
            const file   = p.querySelector('#ldfile');
            const status = p.querySelector('#ldupstatus');
            let debounce;

            // Botão abre seletor de arquivo
            btn.onclick = () => file.click();
            btn.onmouseenter = () => btn.style.borderColor = '#0088A9';
            btn.onmouseleave = () => btn.style.borderColor = '#E5E7EB';

            // Upload quando arquivo selecionado
            file.onchange = async () => {
                const f = file.files[0];
                if (!f) return;
                if (f.size > 3 * 1024 * 1024) {
                    status.textContent = '❌ Arquivo muito grande (máx 3MB). Comprima a imagem antes.';
                    status.style.color = '#DC2626';
                    return;
                }
                // Preview imediato com data URL
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
                        const secret = localStorage.getItem('asasbrasil_secret') || '';
                        const res = await fetch('/api/upload', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ filename: f.name, base64: b64, secret })
                        });
                        const data = await res.json();
                        if (res.ok && data.url) {
                            // Atualiza slide + miniaturas com mesmo data-eid
                            document.querySelectorAll(`[data-eid="${el.dataset.eid}"]`).forEach(e => {
                                if (e.tagName === 'IMG') e.src = data.url;
                            });
                            pv.src = data.url;
                            ui.value = data.url;
                            btn.textContent = '✅ Imagem enviada!';
                            status.textContent = 'Clique em ✓ Aplicar para salvar.';
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

            // Preview por URL digitada
            ui.oninput = () => {
                clearTimeout(debounce);
                // Mostra aviso que precisa clicar Aplicar
                const statusDiv = p.querySelector('#ld-img-status');
                if (statusDiv) statusDiv.style.display = 'block';
                debounce = setTimeout(() => {
                    const v = ui.value.trim();
                    if (v) { el.src = v; pv.src = v; }
                }, 500);
            };
            p.querySelector('#lda').onclick = () => {
                clearTimeout(debounce);
                // Pega a URL do campo — se vazio, usa o src atual do elemento (já pode ter sido trocado via upload)
                const newUrl = ui.value.trim();
                const currentSrc = el.getAttribute('src') || origAttr;
                const src = newUrl || currentSrc;

                // Verifica se realmente mudou
                if (src === origAttr || src === origSrc) {
                    // Nada mudou — avisa
                    const hint = p.querySelector('p[style*="9CA3AF"]');
                    if (hint) { hint.textContent = '⚠️ Cole uma URL nova ou faça upload de uma imagem diferente.'; hint.style.color = '#DC2626'; }
                    return;
                }

                pv.src = src;
                document.querySelectorAll(`[data-eid="${el.dataset.eid}"]`).forEach(e => {
                    if (e.tagName === 'IMG') e.src = src;
                });
                this.store(el.dataset.eid, { src });
                this.closePanel();
                this.toast('✓ Imagem salva no rascunho — clique Publicar', 'ok');
            };
            p.querySelector('#ldc').onclick = () => {
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
            p.innerHTML += `<div class="ld-pb">
                <div class="ld-f"><label>Texto</label><input type="text" id="ldbt" value="${el.textContent.trim()}"></div>
                <div class="ld-f"><label>Link (URL)</label><input type="url" id="ldbh" value="${origHref}" placeholder="https://wa.me/..."></div>
                <div class="ld-f"><label>Abrir em</label>
                    <select id="ldtgt">
                        <option value="_self" ${origTarget!=='_blank'?'selected':''}>Mesma aba</option>
                        <option value="_blank" ${origTarget==='_blank'?'selected':''}>Nova aba</option>
                    </select>
                </div>
                <div class="ld-g2">
                    <div class="ld-f"><label>Cor de fundo</label><input type="color" id="ldbbg" value="${this.hex(cs.backgroundColor)}"></div>
                    <div class="ld-f"><label>Cor do texto</label><input type="color" id="ldbfg" value="${this.hex(cs.color)}"></div>
                </div>
                <div class="ld-acts">
                    <button class="ld-ok" id="lda">✓ Aplicar</button>
                    <button class="ld-ko" id="ldc">Cancelar</button>
                </div>
            </div>`;
            const bt  = p.querySelector('#ldbt');
            const bh  = p.querySelector('#ldbh');
            const tgt = p.querySelector('#ldtgt');
            const bbg = p.querySelector('#ldbbg');
            const bfg = p.querySelector('#ldbfg');
            let bgChanged = false, fgChanged = false;
            bt.oninput  = () => { const ic = el.querySelector('i'); el.textContent = bt.value; if(ic) el.prepend(ic.cloneNode(true)); };
            bbg.oninput = () => { bgChanged = true; el.style.backgroundColor = bbg.value; };
            bfg.oninput = () => { fgChanged = true; el.style.color = bfg.value; };
            p.querySelector('#lda').onclick = () => {
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
            p.querySelector('#ldc').onclick = () => {
                el.innerHTML = origHTML;
                el.setAttribute('style', origStyle);
                el.setAttribute('href', origHref);
                this.closePanel();
            };
        },

        /* ── BOTÕES DE REMOÇÃO NOS CARDS ── */
        injectRemoveButtons() {
            document.querySelectorAll('a.card-link[href*="pacote.html"]').forEach(card => {
                if (!card.id) {
                    // Gera ID a partir do href se não tiver
                    const m = card.href.match(/id=([a-z0-9_]+)/);
                    if (m) card.id = 'card-' + m[1];
                }
                if (!card.id) return;
                if (card.querySelector('.ld-remove-btn')) return;
                const btn = document.createElement('button');
                btn.className = 'ld-remove-btn';
                btn.title = 'Remover este pacote';
                btn.innerHTML = '✕';
                btn.style.cssText = 'position:absolute;top:10px;right:10px;z-index:99990;width:28px;height:28px;border-radius:50%;background:#DC2626;color:#fff;border:none;cursor:pointer;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.4);transition:all .15s;';
                btn.onmouseenter = () => btn.style.transform = 'scale(1.15)';
                btn.onmouseleave = () => btn.style.transform = '';
                btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); this.confirmRemoveCard(card); };
                card.style.position = 'relative';
                card.appendChild(btn);
            });
        },

        confirmRemoveCard(card) {
            const title = card.querySelector('h3')?.textContent || card.id || 'este pacote';
            const p = this.panel_('🗑️ Remover Pacote');
            p.innerHTML += `<div class="ld-pb">
                <div class="ld-pub-err" style="margin-bottom:14px;">
                    ⚠️ Remover <strong>"${title}"</strong> da home?<br><br>
                    <span style="font-size:11px;opacity:.8;">Pode ser desfeito clicando em "Reverter" antes de publicar.</span>
                </div>
                <div class="ld-acts">
                    <button class="ld-ok" id="lda" style="background:#DC2626;">🗑️ Sim, remover</button>
                    <button class="ld-ko" id="ldc">Cancelar</button>
                </div>
            </div>`;
            p.querySelector('#ldc').onclick = () => this.closePanel();
            p.querySelector('#lda').onclick = () => {
                card.style.transition = 'all .3s';
                card.style.opacity = '0';
                card.style.transform = 'scale(.95)';
                setTimeout(() => card.remove(), 320);
                const removed = this.cms.__removed_cards || [];
                if (!removed.includes(card.id)) removed.push(card.id);
                this.store('__removed_cards', removed);
                if (card.id.startsWith('card-new-')) {
                    const pkgId = card.id.replace('card-new-', '');
                    const newPkgs = this.cms.__new_packages || {};
                    if (newPkgs[pkgId]) { delete newPkgs[pkgId]; this.store('__new_packages', newPkgs); }
                }
                this.closePanel();
                this.toast('✓ Card removido. Publique para salvar.', 'ok');
            };
        },

        /* ── ADICIONAR NOVO PACOTE ── */
        pAddPacote() {
            const p = this.panel_('➕ Adicionar Novo Pacote');
            p.innerHTML += `<div class="ld-pb">
                <div class="ld-info">Preencha os dados. O pacote ficará disponível em <code>pacote.html?id=SEU_ID</code>.</div>
                <div class="ld-f"><label>ID (sem espaços, minúsculas)</label>
                    <input type="text" id="lp-id" placeholder="ex: cancun, dubai, paris">
                    <p class="ld-hint">Letras minúsculas, números e _ (underline)</p>
                </div>
                <div class="ld-f"><label>Título</label><input type="text" id="lp-title" placeholder="Ex: Cancún All Inclusive"></div>
                <div class="ld-f"><label>Subtítulo</label><input type="text" id="lp-sub" placeholder="Ex: Paraíso caribenho com tudo pago"></div>
                <div class="ld-f"><label>Localização</label><input type="text" id="lp-loc" placeholder="Ex: Cancún, México"></div>
                <div class="ld-f"><label>Duração</label><input type="text" id="lp-dur" placeholder="Ex: 7 dias / 6 noites"></div>
                <div class="ld-f"><label>Preço (R$)</label><input type="text" id="lp-price" placeholder="Ex: 5.990,00"></div>
                <div class="ld-f"><label>Parcelas</label><input type="text" id="lp-parc" placeholder="Ex: 10x de R$ 599"></div>
                <div class="ld-f"><label>Flag / País</label><input type="text" id="lp-flag" placeholder="Ex: México 🇲🇽"></div>
                <div class="ld-f"><label>Foto Principal (URL)</label>
                    <input type="url" id="lp-img" placeholder="https://images.unsplash.com/...">
                </div>
                <div class="ld-f"><label>Foto 2 (URL) — opcional</label>
                    <input type="url" id="lp-img2" placeholder="https://images.unsplash.com/...">
                </div>
                <div class="ld-f"><label>Foto 3 (URL) — opcional</label>
                    <input type="url" id="lp-img3" placeholder="https://images.unsplash.com/...">
                </div>
                <div class="ld-f"><label>Descrição</label>
                    <textarea id="lp-desc" rows="3" placeholder="Descreva o destino…"></textarea>
                </div>
                <div class="ld-f"><label>O que está incluso (um por linha)</label>
                    <textarea id="lp-incluso" rows="4" placeholder="Passagem aérea ida e volta&#10;Hotel com café da manhã&#10;Transfer In/Out"></textarea>
                </div>
                <div class="ld-f"><label>Não incluso (um por linha)</label>
                    <textarea id="lp-nao" rows="2" placeholder="Seguro viagem&#10;Gorjetas"></textarea>
                </div>
                <div class="ld-f"><label>Roteiro (Título | Descrição — um dia por linha)</label>
                    <textarea id="lp-rot" rows="4" placeholder="Chegada | Transfer ao hotel. Check-in e tarde livre.&#10;Passeio | Visita aos pontos turísticos."></textarea>
                    <p class="ld-hint">Separe título e descrição com <strong>|</strong></p>
                </div>
                <div class="ld-acts" style="margin-top:16px;">
                    <button class="ld-ok" id="lda">✓ Criar Pacote</button>
                    <button class="ld-ko" id="ldc">Cancelar</button>
                </div>
            </div>`;
            p.querySelector('#ldc').onclick = () => this.closePanel();
            p.querySelector('#lda').onclick = () => {
                const id    = p.querySelector('#lp-id').value.trim().replace(/[^a-z0-9_]/gi,'_').toLowerCase();
                const title = p.querySelector('#lp-title').value.trim();
                if (!id)    { p.querySelector('#lp-id').focus();    p.querySelector('#lp-id').style.borderColor='#DC2626';    return; }
                if (!title) { p.querySelector('#lp-title').focus(); p.querySelector('#lp-title').style.borderColor='#DC2626'; return; }
                const img1 = p.querySelector('#lp-img').value.trim();
                const img2 = p.querySelector('#lp-img2').value.trim();
                const img3 = p.querySelector('#lp-img3').value.trim();
                const images = [img1, img2, img3].filter(Boolean);
                if (!images.length) images.push('https://images.unsplash.com/photo-1488085061387-422e29b40080?auto=format&fit=crop&w=1200&q=80');
                const incluso  = p.querySelector('#lp-incluso').value.split('\n').map(s=>s.trim()).filter(Boolean);
                const nao      = p.querySelector('#lp-nao').value.split('\n').map(s=>s.trim()).filter(Boolean);
                const rotLines = p.querySelector('#lp-rot').value.split('\n').map(s=>s.trim()).filter(Boolean);
                const roteiro  = rotLines.map((line, i) => {
                    const [t, d] = line.split('|').map(s=>s.trim());
                    return { dia: (i+1) + 'º Dia', title: t || ('Dia ' + (i+1)), desc: d || '' };
                });
                const novoPacote = {
                    title, subtitle: p.querySelector('#lp-sub').value.trim(),
                    location: p.querySelector('#lp-loc').value.trim(),
                    duration: p.querySelector('#lp-dur').value.trim(),
                    price:    p.querySelector('#lp-price').value.trim(),
                    parcelas: p.querySelector('#lp-parc').value.trim(),
                    flag:     p.querySelector('#lp-flag').value.trim(),
                    images, desc: p.querySelector('#lp-desc').value.trim(),
                    incluso, nao_incluso: nao, roteiro
                };
                const existing = this.cms.__new_packages || {};
                existing[id] = novoPacote;
                this.store('__new_packages', existing);
                // Injeta card imediatamente na home
                const grid = document.querySelector('.cards-grid');
                if (grid) {
                    const cardId = 'card-new-' + id;
                    if (!document.getElementById(cardId)) {
                        const a = document.createElement('a');
                        a.className = 'card-link rv'; a.id = cardId;
                        a.href = 'pacote.html?id=' + id;
                        a.innerHTML = `
                            <div class="card-img">
                                <img src="${images[0]}" alt="${title}" loading="lazy">
                                <div class="card-flag">${novoPacote.flag || '🌍'}</div>
                                <div class="card-overlay"><span>Ver pacote <i class="fa-solid fa-arrow-right"></i></span></div>
                            </div>
                            <div class="card-body">
                                <div class="card-loc"><i class="fa-solid fa-location-dot"></i> ${novoPacote.location}</div>
                                <h3>${title}</h3>
                                <div class="card-foot">
                                    <div class="card-price">R$ ${novoPacote.price} <small>/ pessoa</small></div>
                                    <span class="card-arrow">Saiba mais <i class="fa-solid fa-arrow-right"></i></span>
                                </div>
                            </div>`;
                        grid.appendChild(a);
                        setTimeout(() => this.injectRemoveButtons(), 100);
                    }
                }
                this.closePanel();
                this.toast('✓ Pacote "' + title + '" criado! Publique para salvar.', 'ok');
                setTimeout(() => {
                    const info = document.createElement('div');
                    info.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#006B87;color:#fff;padding:14px 22px;border-radius:12px;font-size:13px;z-index:999999;box-shadow:0 8px 24px rgba(0,0,0,.4);text-align:center;';
                    info.innerHTML = `📦 Pacote criado!<br><a href="pacote.html?id=${id}" style="color:#7DC420;font-weight:700;" target="_blank">→ Abrir pacote.html?id=${id}</a><br><span style="font-size:11px;opacity:.6;margin-top:4px;display:block;">Publique para tornar permanente.</span>`;
                    document.body.appendChild(info);
                    setTimeout(() => info.remove(), 7000);
                }, 400);
            };
        },

        /* ── CORES GLOBAIS ── */
        pColors() {
            const root = document.documentElement;
            const g = v => getComputedStyle(root).getPropertyValue(v).trim() || '#000000';
            const p = this.panel_('🎨 Cores Globais do Site');
            p.innerHTML += `<div class="ld-pb">
                <div class="ld-info">Altera as cores em todo o site de uma vez.</div>
                <div class="ld-cr"><label>🔵 Azul principal</label><input type="color" id="ldg1" value="${this.hex(g('--primary'))||'#0088A9'}"></div>
                <div class="ld-cr"><label>🔵 Azul escuro</label><input type="color" id="ldg2" value="${this.hex(g('--primary-dark'))||'#006B87'}"></div>
                <div class="ld-cr"><label>🟠 Laranja destaque</label><input type="color" id="ldg3" value="${this.hex(g('--accent'))||'#7DC420'}"></div>
                <div class="ld-cr"><label>⬛ Texto principal</label><input type="color" id="ldg4" value="${this.hex(g('--text-dark'))||'#1A1F2E'}"></div>
                <div class="ld-cr"><label>🟩 WhatsApp verde</label><input type="color" id="ldg5" value="${this.hex(g('--wa'))||'#25D366'}"></div>
                <hr class="ld-hr">
                <div class="ld-f"><label>📱 Número do WhatsApp</label>
                    <input type="text" id="ldgwa" value="${this.cms.whatsapp||''}" placeholder="5511999999999">
                    <p class="ld-hint">Somente números com código do país (ex: 5511999999999). Atualiza todos os botões do site.</p>
                </div>
                <div class="ld-acts">
                    <button class="ld-ok" id="lda">✓ Aplicar cores</button>
                    <button class="ld-ko" id="ldc">Cancelar</button>
                </div>
            </div>`;
            const vars = ['--primary','--primary-dark','--accent','--text-dark','--wa'];
            const inputs = ['ldg1','ldg2','ldg3','ldg4','ldg5'].map(id => p.querySelector('#'+id));
            const waInp = p.querySelector('#ldgwa');
            inputs.forEach((inp, i) => {
                inp.oninput = () => root.style.setProperty(vars[i], inp.value);
            });
            waInp.oninput = () => {
                const num = waInp.value.replace(/\D/g, '');
                if (num) document.querySelectorAll('a[href*="wa.me/"]').forEach(a => {
                    a.href = a.href.replace(/wa\.me\/\d+/, 'wa.me/' + num);
                });
            };
            p.querySelector('#lda').onclick = () => {
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
            p.querySelector('#ldc').onclick = () => {
                // Remove também aliases usados em index.html / pacote.html
                [...vars, '--navy', '--navy-dark', '--text'].forEach(v => root.style.removeProperty(v));
                applyContent(this.cms);
                this.closePanel();
            };
        },

        /* ── REVERTER ── */
        revert() {
            const hasDraft = Object.keys(JSON.parse(localStorage.getItem(CMS_KEY) || '{}')).length > 0;
            if (!hasDraft) { this.toast('Não há rascunho para descartar', ''); return; }
            if (!confirm('Descartar todas as alterações não publicadas? O site voltará ao conteúdo que está publicado.')) return;
            localStorage.removeItem(CMS_KEY);
            document.querySelectorAll('.ld-dirty-dot').forEach(d => d.remove());
            this.toast('Rascunho descartado. Recarregando…', '');
            setTimeout(() => location.reload(), 900);
        },

        /* ── PUBLICAR ── */
        async publish() {
            // Resumo do que será publicado
            const elems   = Object.keys(this.cms).filter(k => k !== 'colors' && k !== 'whatsapp');
            const hasCols = this.cms.colors && Object.keys(this.cms.colors).length > 0;
            const hasWA   = !!this.cms.whatsapp;
            const total   = elems.length + (hasCols ? 1 : 0) + (hasWA ? 1 : 0);

            if (total === 0) {
                this.toast('Nenhuma alteração para publicar', '');
                return;
            }

            // Mostra o que será publicado incluindo imagens
            const imgs = elems.filter(k => this.cms[k] && this.cms[k].src);
            const txts = elems.filter(k => this.cms[k] && (this.cms[k].html != null || this.cms[k].text != null));

            let items = '';
            if (imgs.length)  items += `<li>🖼️ ${imgs.length} imagem(ns) trocada(s)</li>`;
            if (txts.length)  items += `<li>✏️ ${txts.length} texto(s) editado(s)</li>`;
            if (hasCols)      items += `<li>🎨 Cores globais do site</li>`;
            if (hasWA)        items += `<li>📱 WhatsApp: ${this.cms.whatsapp}</li>`;

            const hasSavedSecret = !!localStorage.getItem('asasbrasil_secret');
            const p = this.panel_('🚀 Publicar no Site');
            p.innerHTML += `<div class="ld-pb">
                <div class="ld-info" style="background:#EFF6FF;border:1px solid #BFDBFE;color:#1E40AF;border-radius:10px;padding:14px;margin-bottom:14px;line-height:1.8;">
                    <strong>O que será publicado:</strong><ul style="margin:8px 0 0 16px;">${items}</ul>
                </div>
                ${!hasSavedSecret ? `<div class="ld-f"><label>🔑 Senha de acesso</label>
                    <input type="password" id="ldpwd" placeholder="Digite sua senha" style="width:100%;padding:8px 11px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;outline:none;">
                </div>` : ''}
                <p class="ld-hint">Estas mudanças ficarão visíveis para todos os visitantes imediatamente.</p>
                <div class="ld-acts" style="margin-top:14px;">
                    <button class="ld-ok" id="lda">✓ Confirmar e publicar</button>
                    <button class="ld-ko" id="ldc">Cancelar</button>
                </div>
            </div>`;

            p.querySelector('#ldc').onclick = () => this.closePanel();
            p.querySelector('#lda').onclick = async () => {
                const pwdEl = p.querySelector('#ldpwd');
                let secret = localStorage.getItem('asasbrasil_secret') || '';
                if (pwdEl) {
                    if (!pwdEl.value) { pwdEl.focus(); pwdEl.style.borderColor='#DC2626'; return; }
                    secret = pwdEl.value;
                    localStorage.setItem('asasbrasil_secret', secret);
                }
                p.querySelector('.ld-pb').innerHTML = `<div class="ld-loading"><span class="ld-spin">⏳</span>Publicando alterações…</div>`;
                try {
                    const res = await fetch('/api/publish', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ content: this.cms, secret })
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                        localStorage.removeItem(CMS_KEY);
                        const now = new Date().toLocaleString('pt-BR', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
                        localStorage.setItem('asasbrasil_last_pub', now);
                        document.querySelectorAll('.ld-dirty-dot').forEach(d => d.remove());
                        const lp = document.querySelector('.ld-last-pub');
                        if (lp) { lp.textContent = 'Publicado: ' + now; }
                        else {
                            const sep = document.createElement('div'); sep.className = 'ld-sep';
                            const span = document.createElement('span'); span.className = 'ld-last-pub'; span.textContent = 'Publicado: ' + now;
                            const btn2 = document.getElementById('ld-colors');
                            if (btn2) { btn2.before(span); btn2.before(sep); }
                        }
                        applyContent(this.cms);
                        p.querySelector('.ld-pb').innerHTML = `
                            <div class="ld-pub-box">✅ <strong>Publicado com sucesso!</strong><br>
                            Visitantes verão as mudanças em alguns segundos.</div>
                            <button class="ld-ok" style="width:100%;margin-top:12px" onclick="this.closest('.ld-panel').remove()">✓ OK</button>`;
                        this.toast('✅ Publicado!', 'ok');
                    } else {
                        throw new Error(data.error || 'Erro desconhecido');
                    }
                } catch (err) {
                    p.querySelector('.ld-pb').innerHTML = `
                        <div class="ld-pub-err">❌ <strong>Erro:</strong> ${err.message}</div>
                        <button class="ld-ko" style="width:100%;margin-top:12px" onclick="this.closest('.ld-panel').remove()">Fechar</button>`;
                    this.toast('❌ Erro ao publicar', 'err');
                }
            };
        },

        /* ── SAIR ── */
        exit() {
            let hasDraft = false;
            try { hasDraft = Object.keys(JSON.parse(localStorage.getItem(CMS_KEY) || '{}')).length > 0; } catch(_) {}
            if (hasDraft && !confirm('Sair do editor? Você tem alterações não publicadas (rascunho salvo).')) return;
            sessionStorage.removeItem('editor_active');
            sessionStorage.removeItem(AUTH_KEY);
            localStorage.removeItem(AUTH_KEY);
            localStorage.removeItem('asasbrasil_secret');
            const u = new URL(location.href);
            u.searchParams.delete('editor');
            location.replace(u.toString());
        },

        /* ── HELPERS ── */
        panel_(title) {
            this.closePanel();
            const p = document.createElement('div');
            p.className = 'ld-panel';
            p.innerHTML = `<div class="ld-ph"><h3>${title}</h3><button class="ld-px" title="Fechar">✕</button></div>`;
            document.body.appendChild(p);
            p.querySelector('.ld-px').onclick = () => this.closePanel();
            this.drag_(p);
            this.panel = p;
            return p;
        },

        closePanel() {
            document.querySelectorAll('.ld-panel').forEach(x => x.remove());
            document.querySelectorAll('.ld-sel').forEach(x => x.classList.remove('ld-sel'));
            this.panel = null;
        },

        drag_(el) {
            if (window.matchMedia('(max-width:600px)').matches) return; // sem drag em mobile
            const h = el.querySelector('.ld-ph');
            let d=false, sx=0, sy=0, ox=0, oy=0;
            h.onmousedown = e => { d=true; sx=e.clientX; sy=e.clientY; ox=el.offsetLeft; oy=el.offsetTop; e.preventDefault(); };
            document.addEventListener('mousemove', e => { if(!d) return; el.style.left=ox+e.clientX-sx+'px'; el.style.top=oy+e.clientY-sy+'px'; });
            document.addEventListener('mouseup', () => d=false);
        },

        store(key, val) {
            // Sincronização: detecta campos do DB e salva em __db_overrides
            const DB_FIELDS = {
                'pkg-price': 'price', 'pkg-parcelas': 'parcelas',
                'pkg-title': 'title', 'pkg-subtitle': 'subtitle',
                'pkg-desc':  'desc',  'pkg-badge': 'badge',
            };
            const HOME_FIELDS = {
                'price': 'price', 'parcel': 'parcelas',
                'titulo': 'title', 'dest': 'location',
            };
            function extractValue(html, dbField) {
                if (!html) return '';
                const plain = html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
                if (dbField === 'price') {
                    const m = plain.match(/R\$\s*([\d.,]+)/);
                    return m ? m[1] : plain;
                }
                return plain;
            }
            // Padrão pacote.html: "lencois-pkg-price"
            const pkgMatch = key.match(/^([a-z0-9_]+)-pkg-(.+)$/);
            if (pkgMatch) {
                const [, pkgId, field] = pkgMatch;
                const dbField = DB_FIELDS['pkg-' + field];
                if (dbField && typeof DB !== 'undefined' && DB[pkgId]) {
                    const overrides = this.cms.__db_overrides || {};
                    if (!overrides[pkgId]) overrides[pkgId] = {};
                    const rawVal = val.html != null ? extractValue(val.html, dbField) : (val.text || '');
                    if (rawVal) overrides[pkgId][dbField] = rawVal;
                    this.cms.__db_overrides = overrides;
                    Object.assign(DB[pkgId], overrides[pkgId]);
                }
            }
            // Padrão home: "card1-price", "card1-title"
            const homeMatch = key.match(/^card\d+-(price|title|loc|flag)$/);
            if (homeMatch) {
                // Tenta identificar o pkgId pelo href do card pai
                const el = document.querySelector(`[data-eid="${key}"]`);
                const card = el && el.closest('a[href*="pacote.html"]');
                if (card) {
                    const m = card.href.match(/id=([a-z0-9_]+)/);
                    if (m) {
                        const pkgId = m[1];
                        const fieldMap = { 'price': 'price', 'title': 'title', 'loc': 'location', 'flag': 'flag' };
                        const dbField = fieldMap[homeMatch[1]];
                        if (dbField && typeof DB !== 'undefined' && DB[pkgId]) {
                            const overrides = this.cms.__db_overrides || {};
                            if (!overrides[pkgId]) overrides[pkgId] = {};
                            const rawVal = val.html != null ? extractValue(val.html, dbField) : (val.text || '');
                            if (rawVal) overrides[pkgId][dbField] = rawVal;
                            this.cms.__db_overrides = overrides;
                            Object.assign(DB[pkgId], overrides[pkgId]);
                        }
                    }
                }
            }
            this.cms[key] = val;
            localStorage.setItem(CMS_KEY, JSON.stringify(this.cms));
            this.markDirty();
        },

        markDirty() {
            const btn = document.getElementById('ld-pub');
            if (btn && !btn.querySelector('.ld-dirty-dot')) {
                const dot = document.createElement('span');
                dot.className = 'ld-dirty-dot';
                btn.prepend(dot);
            }
        },

        toast(msg, type='') {
            document.querySelectorAll('.ld-toast').forEach(t => t.remove());
            const t = document.createElement('div');
            t.className = 'ld-toast' + (type?' '+type:'');
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
        const srv = await fetchContent();   // 1 único fetch para toda a sessão
        await loadAndApply(srv);
        if (editMode) {
            await ED.start(srv);            // reutiliza dados já carregados
            setTimeout(() => ED.bindAll(), 500);
        }
    });

    window._LD = ED;
})();
