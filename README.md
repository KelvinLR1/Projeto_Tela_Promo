# Tela Promocional

Aplicacao Node.js para exibir promocoes em TVs ou navegadores, com painel administrativo para configurar banco de dados, cores, textos, layouts e intervalos.

## Requisitos

- Node.js 18 ou superior
- npm
- Um banco MySQL, PostgreSQL ou Microsoft SQL Server, caso va usar dados reais

## Instalacao

```bash
npm install
```

Crie o arquivo `.env` a partir do exemplo:

```bash
copy .env.example .env
```

No Linux/macOS, use:

```bash
cp .env.example .env
```

Edite o `.env` e troque pelo menos:

- `ADMIN_USER`
- `ADMIN_PASS`
- `SESSION_SECRET`
- dados `DB_*`, se for conectar no banco real

## Como rodar

```bash
npm start
```

Durante desenvolvimento, com reinicio automatico do Node:

```bash
npm run dev
```

A aplicacao abre por padrao em:

- Tela de selecao: `http://localhost:3000/`
- Tela promocional: `http://localhost:3000/display`
- Painel admin: `http://localhost:3000/config`
- Login admin: `http://localhost:3000/login`

## Dados esperados

A API `/api/promocoes` espera produtos com estas colunas:

- `id`
- `nome_produto`
- `preco_anterior`
- `preco_atual`
- `link_imagem`
- `data_validade`
- `texto_validade` opcional

Se `DB_QUERY` estiver preenchida, ela sera usada no lugar da consulta padrao. Se o banco nao estiver configurado ou a senha estiver como `sua_senha_aqui`, a aplicacao usa dados mock para facilitar a visualizacao.

## Estrutura

```text
server.js
public/
  admin/
    config.html
    login.html
    admin-config.css
    admin-config.js
    login.css
    login.js
  display/
    index.html
    display.html
    selector.css
    styles.css
    script.js
```

## Scripts

- `npm start`: inicia o servidor.
- `npm run dev`: inicia com `node --watch`.
- `npm run check`: valida a sintaxe do `server.js`.
- `npm run verify`: atalho para a verificacao atual.

## Observacoes de seguranca

- Nao versionar `.env`.
- Use uma `SESSION_SECRET` longa e aleatoria.
- Troque as credenciais padrao antes de colocar em producao.
- Defina `ALLOWED_ORIGINS` em producao quando houver frontends externos consumindo as APIs.
