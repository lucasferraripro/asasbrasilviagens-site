# TEMPLATE-BASE — Site Lovisa Destinos (Base para Replicação)

Esta pasta contém uma cópia limpa do site Lovisa Destinos, usada como **ponto de partida**
para gerar previews e sites completos para novas agências de viagens.

---

## ESTRUTURA

```
TEMPLATE-BASE/
├── index.html          ← Página inicial
├── sobre.html          ← Página "Sobre"
├── pacote.html         ← Página de pacote/destino
├── clientes.html       ← Galeria de clientes
├── 404.html            ← Página de erro
├── editor.js           ← Editor visual (painel admin)
├── vercel.json         ← Configuração do Vercel (serverless)
├── content.json        ← {}  ← deve ser resetado para {} em cada cópia
├── logo.png            ← Substituir pelo logo da nova agência
├── 📁 imagens/         ← Fotos de destinos (ficam iguais no preview)
├── 📁 api/
│   ├── auth.js         ← Validação de senha (usa ADMIN_SECRET)
│   ├── content.js      ← Lê/grava content.json no GitHub
│   ├── publish.js      ← Publica alterações via GitHub API
│   └── upload.js       ← Upload de imagens via GitHub API
└── 📁 admin/
    └── login.html      ← Tela de login do painel
```

---

## COMO USAR PARA GERAR UM PREVIEW

1. Copie toda esta pasta para: `C:\Users\win 10\Desktop\[NOME-AGENCIA]-preview`
2. Cole o **PROMPT-PREVIEW-RAPIDO.md** (em FASE-2-PREVIEW/) na IA com os dados do cliente
3. A IA fará as substituições de nome, logo, WhatsApp e cidade
4. Faça push para GitHub e importe no Vercel

## COMO USAR PARA O SITE COMPLETO

1. Copie toda esta pasta para: `C:\Users\win 10\Desktop\[NOME-AGENCIA]-site`
2. Cole o **PROMPT-PARA-IA.md** (em FASE-3-SITE-COMPLETO/) com os dados completos do cliente
3. A IA fará a replicação total (pacotes, fotos, textos, cores, depoimentos)
4. Configure variáveis no Vercel: `GITHUB_TOKEN` + `ADMIN_SECRET`

---

## VARIÁVEIS DE AMBIENTE NECESSÁRIAS NO VERCEL

| Variável | Valor |
|----------|-------|
| `GITHUB_TOKEN` | Token pessoal do GitHub (mesmo do projeto Lovisa) |
| `ADMIN_SECRET` | Senha do painel (ex: `Agencia@2025` — qualquer senha) |

---

## O QUE SUBSTITUIR EM CADA NOVO SITE

| Arquivo | O que muda |
|---------|-----------|
| Todos os HTML | `Lovisa Destinos` → nome da agência |
| Todos os HTML | `5519995396281` → WhatsApp da agência (só números) |
| Todos os HTML | `lovisadestinos` → @ do Instagram |
| Todos os HTML | `Campinas, SP` → cidade da agência |
| logo.png | Logo da nova agência |
| api/*.js | `owner` e `repo` → usuário GitHub e nome do repositório |
| content.json | Resetar para `{}` |

---

*Template gerado a partir do projeto Lovisa Destinos — Abril 2026*
