# Correcoes e Aprendizado - Asas Brasil Viagens

Atualizado em: 2026-05-12

Este documento registra o que foi descoberto, corrigido e validado no projeto Asas Brasil Viagens para que outras IAs ou futuras sessoes do Codex nao precisem redescobrir os mesmos problemas.

## Projeto correto

- Pasta local: `C:\Users\win 10\Desktop\sites de clientes\asasbrasilviagens`
- GitHub: `https://github.com/lucasferraripro/asasbrasilviagens-site.git`
- Branch: `master`
- Vercel: `https://asasbrasilviagens.vercel.app`
- Projeto Vercel: `lucasferraris-projects-65d9de34/asasbrasilviagens`

## Referencias usadas

- Lovisa: `C:\Users\win 10\Desktop\sites de clientes\lovisa-destinos-site`
- 321Go: `C:\Users\win 10\Desktop\sites de clientes\321go`

Esses projetos servem como referencia de estrutura, publicacao e comportamento do editor. Nao copiar cegamente: adaptar mantendo o repo e identidade da Asas.

## Problemas encontrados e solucoes

### 0. Conteudo do painel sumia depois de alteracao local

Causa:
- O painel admin grava textos/fotos editados em `content.json` no GitHub.
- Quando o agente local commita um `content.json` antigo, ele sobrescreve o arquivo publicado pelo painel.

Correcao:
- Criado `scripts/sync-live-content.ps1` para buscar `/api/content` publicado e atualizar o `content.json` local antes de commit/deploy.
- A skill de deploy agora exige sincronizar o conteudo publicado antes de qualquer `git add`, `git commit`, `git push` ou deploy manual.

Regra permanente:
- Nunca commitar `content.json` antigo.
- Se o usuario nao pediu para alterar conteudo do painel, preservar o `content.json` sincronizado.
- Se o conteudo publicado vier vazio, abortar para nao apagar edicoes.

### 1. Imagem trocada no editor voltava depois de publicar

Causa:
- `content.json` podia receber imagem invalida, base64, post do Instagram ou CDN temporario.
- O editor aplicava o conteudo do servidor depois e sobrescrevia a imagem boa.
- O upload precisava publicar em branch correta.

Correcoes:
- `editor.js`: validacao de imagem com `isValidImageSrc`.
- `editor.js`: ao trocar imagem, salvar imediatamente no rascunho.
- `editor.js`: limpar conteudo ruim antes de publicar.
- `api/publish.js` e `api/content.js`: sanitizacao server-side.
- `api/upload.js`: validacao de extensao e branch `master` como fallback.

Regra permanente:
- Nunca salvar `data:image`, link `instagram.com/p`, `cdninstagram` ou `fbcdn` como `src`.

### 2. Rodape nao editavel

Causa:
- Nem todos os textos do rodape tinham `data-eid`.
- Clicar em texto pequeno do rodape era ruim no editor.

Correcoes:
- `index.html`, `pacote.html`, `sobre.html`, `clientes.html`: rodapes e textos comuns receberam `data-eid`.
- `editor.js`: botao `Rodape` na barra do editor abre lista dos campos do rodape.

Regra permanente:
- Todo texto/imagem/link editavel precisa de `data-eid` unico e `data-elabel` claro.

### 3. Cards de pacote nao navegavam

Causa:
- O wrapper `<a class="card-link">` tinha `data-eid`.
- No modo editor, o clique era interceptado para editar o card em vez de navegar.

Correcao:
- Remover `data-eid` do `<a class="card-link">`.
- Manter `data-eid` apenas em imagem, titulo, local, preco e textos internos.

Regra permanente:
- Nao colocar `data-eid` em links que devem navegar quando clicados.

### 4. Fotos da Disney quebradas

Causa:
- URLs antigas do Unsplash retornavam 404.

Correcoes:
- Home e pacote Disney usam URLs testadas:
  - `Cinderella_Castle_at_Magic_Kingdom...`
  - `photo-1576502200916...`
  - `Spaceship_Earth_at_Epcot...`
- Fallbacks em `pacote.html` tambem foram atualizados.

Regra permanente:
- Testar URLs externas com `fetch HEAD` e status 200 antes de publicar.

### 5. Textos com mojibake

Exemplos:
- `LenÃ§Ã³is Maranhenses`
- `MaranhÃ£o`
- `informa��es`

Causa:
- Conteudo salvo ou lido com encoding errado.

Correcoes:
- Normalizacao do HTML para UTF-8.
- Mensagens WhatsApp com ASCII simples para reduzir risco em celulares.

Regra permanente:
- Validar com `rg -n "LenÃ|MaranhÃ|ï¿½|informa��"`.

### 6. Secao Instagram nao funcionava bem

Causa:
- CDN do Instagram expira.
- Links de post nao sao imagem direta.

Correcao:
- Remover secao "Nossos Viajantes pelo Mundo" da home.
- Remover botao/funcoes de Instagram do editor.

Regra permanente:
- Nao depender de CDN temporario do Instagram para imagem permanente.

### 7. Servicos especializados no lugar errado

Causa:
- A secao estava dentro de `pacote.html`, com caracteres quebrados e fluxo ruim.

Correcao:
- Remover servicos do pacote.
- Criar secao `#servicos` na home, abaixo de destinos.
- Cards ficam minimizados e expandem detalhes ao clicar.
- Botao `Solicitar` rola para o formulario e preenche `Tipo de viagem`.

## Validacoes uteis

```powershell
node -e "const fs=require('fs'); for (const f of ['index.html','pacote.html']) { const s=fs.readFileSync(f,'utf8'); [...s.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m,i)=>new Function(m[1])); console.log(f,'ok'); } new Function(fs.readFileSync('editor.js','utf8')); console.log('editor ok')"
rg -n "Nossos Viajantes|insta-grid|go-insta|pInstagram|solicitarCategoria|LenÃ|MaranhÃ|ï¿½|data:image|cdninstagram|fbcdn" index.html pacote.html editor.js content.json
git diff --check
```

## Commits importantes

- `20fa59b`: blindagem inicial de publicacao de imagens.
- `983c0ea`: salvar imagem no rascunho ao trocar.
- `2b455c6`: tornar textos do site editaveis.
- `0596926`: corrigir textos e fotos dos pacotes.
- `0ef8010`: painel de edicao do rodape.
- `fe9f7a5`: servicos, fotos Disney, remover Instagram, cards navegaveis.
- `7337048`: skills locais e mensagem WhatsApp limpa.
