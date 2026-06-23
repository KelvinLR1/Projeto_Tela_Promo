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

## Como Alterar a Porta do Servidor

Por padrão, a aplicação roda na porta `3000`. Se você precisar alterar essa porta (por exemplo, para rodar na porta `8080`), siga o passo a passo abaixo:

1. **Abra o arquivo `.env`** na raiz do projeto.
2. **Localize a linha que define a porta**:
   ```env
   PORT=3000
   ```
3. **Altere o valor** de `3000` para a porta desejada (ex: `PORT=8080`).
4. **Salve o arquivo**.
5. **Reinicie o servidor**:
   - **Se estiver rodando via terminal**: Pare o processo atual (`Ctrl + C`) e inicie novamente com `npm start` ou `npm run dev`.
   - **Se estiver rodando como Serviço do Windows**:
     - Abra o menu Iniciar, digite `Serviços` (ou abra `services.msc`) e localize o serviço **HUB - Tela Promo**. Clique com o botão direito e selecione **Reiniciar**.
     - *Ou*, via PowerShell (como Administrador), execute o comando:
       ```powershell
       Restart-Service -Name "HUB - Tela Promo"
       ```

A partir disso, os links de acesso serão ajustados para a nova porta configurada (ex: `http://localhost:8080/`).

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
