---
name: asas-deploy-vercel-github
description: Use esta skill sempre que publicar o site Asas Brasil Viagens no GitHub e Vercel. Inclui o repositorio correto, branch, comandos, protecao do content.json e verificacoes de deploy.
metadata:
  short-description: Deploy GitHub/Vercel Asas
---

# Asas Deploy GitHub/Vercel

## Destinos corretos

- GitHub: `https://github.com/lucasferraripro/asasbrasilviagens-site.git`
- Branch: `master`
- Vercel: `https://asasbrasilviagens.vercel.app`
- Projeto Vercel: `lucasferraris-projects-65d9de34/asasbrasilviagens`

## Regra critica do CMS

O painel admin publica as alteracoes do usuario em `content.json`.

Antes de qualquer `git add`, `git commit`, `git push` ou deploy manual, sincronizar o conteudo publicado:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\sync-live-content.ps1
git diff -- content.json
```

Nunca commitar um `content.json` antigo por cima do GitHub. Se o usuario nao pediu para alterar conteudo do painel, preservar o `content.json` sincronizado do site publicado.

## Publicacao padrao

Sempre fazer commit e push quando concluir correcao.

```powershell
powershell -ExecutionPolicy Bypass -File scripts\sync-live-content.ps1
git status --short
git add index.html pacote.html editor.js sobre.html clientes.html api/content.js api/publish.js api/upload.js content.json scripts/sync-live-content.ps1
git commit -m "mensagem curta"
git pull --rebase origin master
git push origin master
cmd /c "set NODE_OPTIONS=--use-system-ca && npx --yes vercel --prod --yes"
```

Se `git add` incluir arquivo inexistente, usar so os arquivos modificados.

## Verificacao ao vivo

```powershell
$env:NODE_OPTIONS='--use-system-ca'
@'
(async()=>{
 const ts=Date.now();
 const home=await (await fetch('https://asasbrasilviagens.vercel.app/index.html?_='+ts)).text();
 const pkg=await (await fetch('https://asasbrasilviagens.vercel.app/pacote.html?_='+ts)).text();
 const editor=await (await fetch('https://asasbrasilviagens.vercel.app/editor.js?_='+ts)).text();
 console.log('home bytes', home.length);
 console.log('pacote bytes', pkg.length);
 console.log('editor bytes', editor.length);
})().catch(e=>{console.error(e); process.exit(1)})
'@ | node -
```

## Cuidados

- Se push for rejeitado, usar `git pull --rebase origin master`, validar de novo e so entao `git push`.
- Nunca usar `git reset --hard`.
- Ignorar nao rastreados existentes se nao fizerem parte da tarefa.
- Conferir `../../project-memory/ESTADO-ATUAL.md` se houver duvida sobre repo, branch ou dominio corretos.
