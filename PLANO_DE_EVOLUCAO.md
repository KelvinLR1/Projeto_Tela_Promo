# Plano de evolucao do projeto

Este arquivo serve como guia vivo para evoluir a tela promocional com ordem de prioridade e criterio pratico de conclusao.

## 1. Seguranca basica do painel admin

Objetivo: reduzir risco de acesso indevido ao painel `/config`.

- Trocar credenciais padrao em `ADMIN_USER` e `ADMIN_PASS`.
- Usar sessao assinada no cookie, com expiracao.
- Definir `SESSION_SECRET` forte no `.env`.
- Aplicar `HttpOnly`, `SameSite=Lax` e `Secure` quando estiver em HTTPS.
- Restringir CORS por ambiente com `ALLOWED_ORIGINS`.

Criterio de conclusao: login continua funcionando, `/config` exige sessao valida, logout invalida a sessao e o servidor inicia sem erro.

## 2. Integracao real com banco

Objetivo: garantir que a tela consiga consumir dados reais sem ajustes manuais de ultima hora.

Status: implementado com sanitizador e parser de banco defensivo (trata floats, strings, vírgulas, datas em múltiplos formatos, converte caminhos absolutos locais de imagens no servidor de qualquer partição/pasta em tempo real).

- Confirmar a query final da tabela de promocoes.
- Padronizar colunas esperadas: `id`, `nome_produto`, `preco_anterior`, `preco_atual`, `link_imagem`, `data_validade` e opcionalmente `texto_validade`.
- Testar produtos sem imagem, sem preco anterior e com nomes longos.
- Validar datas e precos vindos como texto/decimal.

Criterio de conclusao: `/api/promocoes` retorna dados reais consistentes e o fallback mock aparece somente quando necessario.

## 3. Robustez visual da tela

Objetivo: manter a tela bonita mesmo quando os dados vierem imperfeitos.

Status: implementado na primeira passada. Manter como ponto de revisao visual quando houver dados reais do banco.

- Criar fallback quando imagem externa falhar.
- Ajustar textos longos para nao estourarem os cards.
- Tratar API indisponivel com mensagem visual adequada.
- Revisar preco muito grande e nomes extensos nos layouts.

Criterio de conclusao: nenhum layout quebra com dados comuns de supermercado.

## 4. Configuracoes visuais pelo painel

Objetivo: permitir ajustes sem mexer no codigo.

Status: implementado na primeira passada com persistencia no `.env` e leitura publica pela tela.

- Titulo da tela.
- Texto do rodape.
- Layout padrao.
- Intervalo do carrossel.
- Cores principais.
- Quantidade de itens por pagina.

Criterio de conclusao: o usuario altera configuracoes no painel e a tela aplica sem redeploy.

## 5. Organizacao e manutencao

Objetivo: deixar o projeto mais facil de evoluir.

Status: implementado com README, `.env.example`, pastas separadas para admin/tela publica, login com CSS/JS externos e scripts de manutencao.

- Criar `README.md`.
- Criar `.env.example`.
- Separar admin e tela publica em pastas mais claras.
- Extrair CSS/JS inline de `login.html` e `config.html` quando fizer sentido.
- Adicionar scripts uteis no `package.json`.

Criterio de conclusao: uma pessoa nova consegue instalar, configurar e rodar o projeto seguindo a documentacao.

## 6. Preparacao para producao

Objetivo: deixar o sistema pronto para rodar continuamente.

- Definir processo de start com PM2, NSSM ou servico do sistema.
- Adicionar logs mais claros.
- Documentar backup do `.env`.
- Definir dominio/IP fixo para TVs.
- Validar comportamento em reinicio do servidor.

Criterio de conclusao: a aplicacao roda de forma estavel em ambiente real de loja.

## 7. Testes minimos

Objetivo: evitar regressao em pontos essenciais.

- Testar `/api/promocoes`.
- Testar login e logout.
- Testar bloqueio de `/config` sem cookie.
- Testar leitura de configuracao atual.

Criterio de conclusao: existe um comando simples para validar as rotas principais antes de entregar mudancas.
