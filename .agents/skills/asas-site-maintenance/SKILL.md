---
name: asas-site-maintenance
description: Use esta skill ao editar o site Asas Brasil Viagens: home, pacotes, textos, fotos, serviços, formulário, WhatsApp, HTML/CSS/JS e correções visuais. Ajuda a trabalhar com pouco contexto e evitar reler arquivos grandes.
metadata:
  short-description: Manutenção do site Asas Brasil
---

# Asas Site Maintenance

## Arquivos principais

- `index.html`: home, destinos, serviços, diferenciais, formulário, rodapé.
- `pacote.html`: banco `DB` dos pacotes, carrossel, sidebar, outros destinos.
- `editor.js`: editor visual/admin, rascunho local, publicação, upload.
- `content.json`: conteúdo publicado pelo editor.
- `api/content.js`, `api/publish.js`, `api/upload.js`: API do CMS no Vercel.

## Regras rápidas

- Não colocar `data-eid` no `<a class="card-link">` externo dos cards de destino; isso impede navegação no modo editor.
- Colocar `data-eid` apenas em textos/imagens internos editáveis.
- Imagens devem ser URL direta estável ou arquivo em `imagens/destinos/`.
- Não usar `data:` base64, link de post Instagram, nem CDN temporário Instagram.
- Depois de mudar `editor.js`, atualizar cache-bust nos HTMLs: `editor.js?v=YYYYMMDD-algo`.
- Mensagens WhatsApp devem usar texto ASCII simples quando possível para evitar mojibake em celulares.

## Validação mínima

Rodar:

```powershell
node -e "const fs=require('fs'); for (const f of ['index.html','pacote.html']) { const s=fs.readFileSync(f,'utf8'); [...s.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m,i)=>new Function(m[1])); console.log(f,'ok'); } new Function(fs.readFileSync('editor.js','utf8')); console.log('editor ok')"
rg -n "Nossos Viajantes|insta-grid|go-insta|pInstagram|solicitarCategoria|LenÃ|MaranhÃ|ï¿½" index.html pacote.html editor.js
git diff --check
```

## Referências locais úteis

- Lovisa referência: `C:\Users\win 10\Desktop\sites de clientes\lovisa-destinos-site`
- 321Go referência: `C:\Users\win 10\Desktop\sites de clientes\321go`

