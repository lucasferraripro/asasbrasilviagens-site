# PROBLEMA FREQUENTE — Imagem trocada não aparece após publicar

> Registrado em: 22/04/2026  
> Ocorreu em: Asas Brasil Viagens  
> Aplica-se a: todos os projetos com editor.js

---

## O Sintoma

Admin troca uma imagem no painel → clica Publicar → imagem some do rascunho.  
Mas ao recarregar o site, a imagem **continua a mesma de antes**.  
O `content.json` no GitHub tem o valor correto, mas o site não aplica.

---

## A Causa

O `loadAndApply()` no `editor.js` só mesclava o rascunho local quando `editMode = true`:

```javascript
// ❌ ERRADO — só aplica para admin logado
async function loadAndApply(srv) {
    let merged = srv || {};
    if (editMode) {                          // ← só entra aqui se for admin
        const draft = JSON.parse(localStorage.getItem(CMS_KEY) || '{}');
        merged = { ...merged, ...draft };
    }
    applyContent(merged);   // ← para visitantes, merged = só {} vazio
    return merged;
}
```

Para visitantes normais, `editMode = false`, então `merged` ficava com o conteúdo do servidor — mas o `applyContent` não estava sendo chamado com os dados corretos porque o `srv` retornado pelo `/api/content` não estava sendo mesclado corretamente.

**Resultado:** Visitantes viam a imagem antiga. Admin via a nova (porque tinha o rascunho no localStorage).

---

## A Solução

```javascript
// ✅ CORRETO — sempre aplica o conteúdo do servidor para TODOS
async function loadAndApply(srv) {
    let merged = (srv && typeof srv === 'object') ? { ...srv } : {};
    window.__SRV_CMS = merged;  // expõe para outros scripts usarem

    // Mescla rascunho local APENAS para admin em modo editor
    if (editMode) {
        try {
            const draft = JSON.parse(localStorage.getItem(CMS_KEY) || '{}');
            merged = { ...merged, ...draft };
        } catch (_) {}
    }

    // SEMPRE aplica — tanto para visitantes quanto para admin
    applyContent(merged);
    return merged;
}
```

**A diferença:** `{ ...srv }` garante que o objeto do servidor é sempre copiado e aplicado, mesmo quando `editMode = false`.

---

## Como o `applyContent` aplica imagens

Para que uma imagem seja atualizada pelo CMS, ela precisa ter `data-eid`:

```html
<!-- ✅ CORRETO — imagem editável -->
<img src="foto-original.jpg"
     data-eid="hero-bg-img"
     data-elabel="Foto de Fundo do Hero">

<!-- ❌ ERRADO — imagem não editável pelo CMS -->
<img src="foto-original.jpg">
```

O `applyContent` faz:
```javascript
document.querySelectorAll('[data-eid]').forEach(el => {
    const d = cms[el.dataset.eid];
    if (!d) return;
    if (d.src != null && el.tagName === 'IMG') el.src = d.src;  // ← aplica src
    if (d.html != null) el.innerHTML = d.html;
    // ...
});
```

---

## Checklist para garantir que imagens salvam corretamente

- [ ] A imagem tem `data-eid` único no HTML
- [ ] A imagem tem `data-elabel` descritivo
- [ ] O `loadAndApply` usa `{ ...srv }` (não `srv || {}`)
- [ ] O `applyContent` trata `d.src` para elementos `IMG`
- [ ] O `content.json` publicado tem a chave `{ "data-eid": { "src": "url" } }`
- [ ] Testar: trocar imagem → publicar → abrir aba anônima → imagem nova aparece ✅

---

## Como verificar se a imagem foi salva no servidor

Acesse: `https://SEU-SITE.vercel.app/api/content`

Deve aparecer algo como:
```json
{
  "hero-bg-img": { "src": "https://nova-imagem.jpg" },
  "card1-img":   { "src": "imagens/destinos/nova.png" }
}
```

Se aparecer, o problema é no `loadAndApply` — não está aplicando para visitantes.  
Se não aparecer, o problema é no `publish` — não está salvando no GitHub.

---

## Imagens locais vs URLs externas

| Tipo | Exemplo | Funciona? |
|------|---------|-----------|
| URL externa (Unsplash) | `https://images.unsplash.com/...` | ✅ Sempre |
| URL raw GitHub | `https://raw.githubusercontent.com/...` | ✅ Sempre |
| Caminho local | `imagens/destinos/foto.png` | ✅ Se o arquivo existir no repo |
| Upload via admin | Salvo em `imagens/uploads/` no GitHub | ✅ Após upload |

> **Atenção:** Imagens locais (`imagens/destinos/foto.png`) só funcionam se o arquivo estiver commitado no repositório GitHub. Se você trocar por uma imagem local que não existe no repo, vai aparecer quebrada.

---

## Regra de ouro

> **Sempre use URLs absolutas para imagens trocadas pelo admin.**  
> URLs do Unsplash, raw.githubusercontent.com ou upload via `/api/upload` são as mais seguras.  
> Caminhos relativos só funcionam se o arquivo estiver no repositório.
