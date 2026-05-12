---
name: asas-editor-cms
description: Use esta skill ao mexer no painel admin/editor visual do Asas Brasil Viagens, publicação de conteúdo, upload de imagens, data-eid, rodapé editável e sincronização content.json/GitHub/Vercel.
metadata:
  short-description: CMS/editor Asas
---

# Asas Editor CMS

## Como o editor funciona

- Ativar com `?editor=1`.
- `editor.js` aplica conteúdo por `[data-eid]`.
- Rascunho local: `localStorage` com chave `asasbrasil_cms_v3`.
- Publicação: envia para `/api/publish`, grava `content.json` no GitHub e Vercel redeploya.
- Upload: `/api/upload` envia imagem para GitHub e retorna URL/raw/path persistente.

## Padrões obrigatórios

- Todo texto editável precisa de `data-eid` único e `data-elabel` claro.
- Imagem editável precisa de `data-eid` no `<img>`.
- Links editáveis podem ter `data-eid`, mas não usar isso no wrapper de card que precisa navegar.
- Rodapé deve ser editável por clique e pelo botão `Rodapé` do editor.
- Se alterar `editor.js`, trocar cache-bust nos HTMLs.

## Imagens

Validar e bloquear:

- `data:image/...` salvo em `content.json`
- `instagram.com/p/...`
- `cdninstagram` ou `fbcdn`
- URL quebrada ou que não seja imagem

Preferir:

- `imagens/destinos/...`
- `https://raw.githubusercontent.com/...`
- Wikimedia `Special:FilePath` testado com status 200
- Unsplash testado com status 200

## Checklist pós-mudança

```powershell
rg -n "data:image|instagram.com/p|cdninstagram|fbcdn|LenÃ|MaranhÃ|ï¿½" content.json index.html pacote.html editor.js
node -e "const fs=require('fs'); new Function(fs.readFileSync('editor.js','utf8')); console.log('editor ok')"
```

