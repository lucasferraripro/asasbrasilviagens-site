# Imagens Padrão dos Destinos — OBRIGATÓRIO USAR EM TODOS OS SITES

> REGRA: NUNCA usar links externos (Unsplash, Google, etc.) para imagens de destinos.
> SEMPRE usar os arquivos locais desta pasta `imagens/destinos/`.

## Como usar em sites novos
1. Copie a pasta `imagens/destinos/` inteira para o novo projeto
2. No `pacote.html`, use `'imagens/destinos/arquivo.webp'` no DB
3. No `index.html`, use `src="imagens/destinos/arquivo.webp"` nos cards

---

## Fortaleza & Jericoacoara
- `fortaleza-1.webp` — Vista aérea da praia de Fortaleza
- `fortaleza-2.webp` — Dunas de Jericoacoara
- `fortaleza-3.webp` — Rede na praia ao pôr do sol

**pacote.html DB:**
```js
images: ['imagens/destinos/fortaleza-1.webp','imagens/destinos/fortaleza-2.webp','imagens/destinos/fortaleza-3.webp']
```
**index.html card:** `src="imagens/destinos/fortaleza-1.webp"`

---

## Maceió & Maragogi
- `maceio-1.webp` — Águas cristalinas de Maragogi (aérea)
- `maceio-2.jpg` — Orla de Maceió/Maragogi
- `maceio-3.jpg` — Piscinas naturais de Maragogi

**pacote.html DB:**
```js
images: ['imagens/destinos/maceio-1.webp','imagens/destinos/maceio-2.jpg','imagens/destinos/maceio-3.jpg']
```
**index.html card:** `src="imagens/destinos/maceio-1.webp"`

---

## Porto de Galinhas
- `portogalinhas-1.jpg` — Praia de Porto de Galinhas

**index.html card:** `src="imagens/destinos/portogalinhas-1.jpg"`

---

## Caldas Novas
- `caldasnovas-1.jpg` — Resort com piscinas termais

**index.html card:** `src="imagens/destinos/caldasnovas-1.jpg"`

---

## Gramado & Canela
- `gramado-1.jpg` — Serra Gaúcha / paisagem

**index.html card:** `src="imagens/destinos/gramado-1.jpg"`

---

## Buenos Aires & Bariloche
- `buenosaires-1.jpg` — Vista de Buenos Aires

**index.html card:** `src="imagens/destinos/buenosaires-1.jpg"`

---

## Para adicionar novo destino
1. Baixe a imagem correta com PowerShell:
   ```
   powershell -Command "Invoke-WebRequest -Uri 'URL_DA_IMAGEM' -OutFile 'imagens/destinos/novodestino-1.jpg'"
   ```
2. Salve aqui com nome padronizado: `nomedestino-1.jpg`, `nomedestino-2.jpg`, etc.
3. Atualize este arquivo com os caminhos
