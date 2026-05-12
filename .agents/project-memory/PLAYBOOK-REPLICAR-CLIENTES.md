# Playbook para Replicar em Outros Sites de Clientes

Objetivo: usar o aprendizado do Asas Brasil Viagens para criar ou corrigir sites de agencias sem repetir bugs de editor, imagem, publicacao e encoding.

## 1. Antes de editar

1. Confirmar pasta local, repo GitHub, branch e projeto Vercel.
2. Conferir `git status --short`.
3. Identificar arquivos principais: home, pagina de pacote, editor, APIs e `content.json`.
4. Se houver site referencia funcionando, comparar comportamento, nao copiar tudo sem criterio.

## 2. Estrutura recomendada

- Home com secoes: hero, destinos, servicos, diferenciais, contato, rodape.
- Pagina de pacote com DB interno ou fonte de dados clara.
- Editor unico com `data-eid`.
- API de publicacao sanitizando conteudo antes de gravar.
- Imagens locais ou URLs diretas estaveis.

## 3. Checklist de editor 100% editavel

- Textos importantes tem `data-eid`.
- Imagens editaveis tem `data-eid`.
- Rodape tem `data-eid` em textos, links e contatos.
- O wrapper de card/link navegavel nao deve ter `data-eid`.
- O editor deve ter atalhos para areas pequenas, como `Rodape`.
- Atualizar cache-bust do `editor.js` apos mudancas.

## 4. Checklist de imagem permanente

Bloquear:
- base64 em `content.json`
- post do Instagram como imagem
- CDN temporario Instagram/Facebook
- URL quebrada

Preferir:
- arquivos em `imagens/`
- upload via `/api/upload`
- raw GitHub
- Wikimedia `Special:FilePath` testado
- Unsplash testado

## 5. Checklist de WhatsApp

- Mensagem deve ser simples e legivel.
- Evitar caracteres especiais quando houver risco de mojibake.
- Usar `encodeURIComponent`.
- Testar a URL final depois de preencher formulario.

## 6. Publicacao obrigatoria

Sempre que terminar:

```powershell
git add <arquivos alterados>
git commit -m "mensagem curta"
git pull --rebase origin master
git push origin master
cmd /c "set NODE_OPTIONS=--use-system-ca && npx --yes vercel --prod --yes"
```

Depois confirmar ao vivo com cache bust:

```powershell
$env:NODE_OPTIONS='--use-system-ca'
@'
(async()=>{
 const ts=Date.now();
 const home=await (await fetch('https://DOMINIO/index.html?_='+ts)).text();
 console.log(home.length);
})()
'@ | node -
```

## 7. Erros que nao devem voltar

- Dizer que publicou sem confirmar o alias de producao da Vercel.
- Confiar apenas no deploy automatico quando o usuario esta vendo versao antiga.
- Usar imagem de post Instagram como imagem permanente.
- Salvar HTML/JS com encoding quebrado.
- Deixar arquivo de problemas antigo virar "fonte da verdade".

