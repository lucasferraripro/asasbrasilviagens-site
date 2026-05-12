---
name: agencia-site-replication
description: Use esta skill para replicar o modelo Asas Brasil Viagens em sites de outras empresas/agencias, reaproveitando o aprendizado sobre editor visual, CMS, GitHub, Vercel, imagens, WhatsApp e paginas de pacotes.
metadata:
  short-description: Replicar site de agencia
---

# Agencia Site Replication

## Quando usar

Use ao criar, corrigir ou migrar sites de agencias semelhantes ao Asas, Lovisa ou 321Go.

## Primeiro carregamento

Leia apenas se necessario:

- `../../project-memory/CORRECOES-E-APRENDIZADO.md`
- `../../project-memory/PLAYBOOK-REPLICAR-CLIENTES.md`
- `../../project-memory/ESTADO-ATUAL.md`

## Fluxo curto

1. Confirmar repo, branch, dominio Vercel e pasta local.
2. Mapear arquivos: home, pacote, editor, API, content.
3. Garantir `data-eid` em conteudo editavel, mas nao em links de navegacao.
4. Blindar imagens e publicacao.
5. Testar formulario WhatsApp com texto simples.
6. Validar scripts e buscar mojibake.
7. Commit, push e deploy Vercel.

## Guardrails

- Nao usar CDN temporario do Instagram.
- Nao salvar base64 em JSON.
- Nao prometer deploy sem confirmar o alias de producao.
- Nao tratar arquivo antigo de pendencias como verdade absoluta.
- Se houver cache, atualizar `editor.js?v=...`.

