require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const ADMIN_DIR = path.join(PUBLIC_DIR, 'admin');
const DISPLAY_DIR = path.join(PUBLIC_DIR, 'display');
const IMAGES_DIR = path.join(PUBLIC_DIR, 'imagens');
const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 2;
const SESSION_SECRET = process.env.SESSION_SECRET || process.env.ADMIN_PASS || 'dev-session-secret';
const VALID_LAYOUTS = ['padrao', 'destaque', 'compacto', 'vitrine', 'sem-foto', 'sem-foto-destaque'];

if (!process.env.SESSION_SECRET) {
  console.warn('[AUTH] SESSION_SECRET nao definido. Configure uma chave forte no .env antes de usar em producao.');
}

// Middleware
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0) return callback(null, false);
    return callback(null, allowedOrigins.includes(origin));
  }
}));
app.use(express.json());

function parseCookies(req) {
  const cookieHeader = req.headers.cookie || '';
  const cookies = {};
  cookieHeader.split(';').forEach(c => {
    const separatorIndex = c.indexOf('=');
    if (separatorIndex === -1) return;
    const key = c.slice(0, separatorIndex).trim();
    const value = c.slice(separatorIndex + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  });
  return cookies;
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signPayload(payload) {
  return crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
}

function createSessionToken(username) {
  const now = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(JSON.stringify({
    sub: username,
    iat: now,
    exp: now + SESSION_TTL_SECONDS
  }));
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

function isValidSessionToken(token) {
  if (!token || !token.includes('.')) return false;

  const [payload, signature] = token.split('.');
  const expectedSignature = signPayload(payload);
  const signatureBuffer = Buffer.from(signature || '');
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) return false;
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return false;

  try {
    const session = JSON.parse(base64UrlDecode(payload));
    const now = Math.floor(Date.now() / 1000);
    return Boolean(session.sub && session.exp && session.exp > now);
  } catch (err) {
    return false;
  }
}

function buildSessionCookie(value, req, maxAge = SESSION_TTL_SECONDS) {
  const cookieParts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(value)}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${maxAge}`
  ];

  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    cookieParts.push('Secure');
  }

  return cookieParts.join('; ');
}

// Middleware de Autenticação baseada em Cookie (HttpOnly)
function clampNumber(value, fallback, min, max) {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function sanitizeColor(value, fallback) {
  const color = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback;
}

function sanitizeWindowsPath(p) {
  let cleaned = String(p || '').trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  // Remove escapes adicionados indevidamente (como \\\\ -> \\ ou \\ -> \)
  // Mantém prefixo UNC se houver (ex: \\host\pasta)
  if (cleaned.startsWith('\\\\')) {
    cleaned = '\\\\' + cleaned.substring(2).replace(/\\+/g, '\\');
  } else {
    cleaned = cleaned.replace(/\\+/g, '\\');
  }
  return cleaned;
}

function getDisplayConfig() {
  return {
    localImagesPath: sanitizeWindowsPath(process.env.LOCAL_IMAGES_PATH),
    title: process.env.DISPLAY_TITLE || 'OFERTAS IMPERDIVEIS',
    footerText: process.env.DISPLAY_FOOTER_TEXT || 'Aproveite! Promocoes validas enquanto durarem os estoques.',
    fetchInterval: clampNumber(process.env.DISPLAY_FETCH_INTERVAL, 30000, 5000, 300000),
    carouselInterval: clampNumber(process.env.DISPLAY_CAROUSEL_INTERVAL, 10000, 3000, 120000),
    vitrineItemInterval: clampNumber(process.env.DISPLAY_VITRINE_ITEM_INTERVAL, 6000, 3000, 120000),

    primaryColor: sanitizeColor(process.env.DISPLAY_PRIMARY_COLOR, '#d32f2f'),
    accentColor: sanitizeColor(process.env.DISPLAY_ACCENT_COLOR, '#fbc02d'),
    backgroundColor: sanitizeColor(process.env.DISPLAY_BACKGROUND_COLOR, '#111111'),
    filterActiveOnly: process.env.DISPLAY_FILTER_ACTIVE_ONLY === 'true'
  };
}

function cookieAuth(req, res, next) {
  const cookies = parseCookies(req);

  if (isValidSessionToken(cookies[SESSION_COOKIE_NAME])) {
    return next();
  }

  // Se for uma requisição de API, retorna 401
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ success: false, error: 'Acesso não autorizado' });
  }

  // Se for uma requisição da página, redireciona para o login
  res.redirect('/login');
}

// Serve os arquivos estaticos da tela publica e do painel admin.
app.get('/', (req, res) => {
  res.sendFile(path.join(DISPLAY_DIR, 'index.html'));
});

app.get('/display', (req, res) => {
  res.sendFile(path.join(DISPLAY_DIR, 'display.html'));
});

app.use('/admin', express.static(ADMIN_DIR));
app.use(express.static(DISPLAY_DIR));

app.use('/imagens', express.static(IMAGES_DIR));
// Gerenciador de conexão dinâmico para múltiplos bancos de dados
let dbPool = null;

async function getDbConnection() {
  if (dbPool) return dbPool;

  const dbType = (process.env.DB_TYPE || 'mysql').toLowerCase();

  // Se a senha padrão não foi alterada, avisa que usará o mock
  if (process.env.DB_PASSWORD === 'sua_senha_aqui') {
    console.log('◇ [DB] Senha padrão detectada no .env. Utilizando dados MOCK para visualização imediata.');
    return null;
  }

  try {
    if (dbType === 'mysql') {
      const mysql = require('mysql2/promise');
      dbPool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT) || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
      console.log('◇ [DB] Conexão MySQL inicializada com sucesso!');
    } else if (dbType === 'postgres' || dbType === 'postgresql') {
      const { Pool } = require('pg');
      dbPool = new Pool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT) || 5432,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
      console.log('◇ [DB] Conexão PostgreSQL inicializada com sucesso!');
    } else if (dbType === 'mssql' || dbType === 'sqlserver') {
      const mssql = require('mssql');
      const config = {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        server: process.env.DB_HOST,
        database: process.env.DB_NAME,
        options: {
          encrypt: process.env.DB_ENCRYPT === 'true', // Usar true para Azure SQL
          trustServerCertificate: true // Necessário para conexões locais/desenvolvimento
        },
        pool: {
          max: 10,
          min: 0,
          idleTimeoutMillis: 30000
        }
      };
      if (process.env.DB_INSTANCE) {
        config.options.instanceName = process.env.DB_INSTANCE;
      } else {
        config.port = parseInt(process.env.DB_PORT) || 1433;
      }
      dbPool = await mssql.connect(config);
      console.log('◇ [DB] Conexão SQL Server inicializada com sucesso!');
    } else {
      console.warn(`◇ [DB] Tipo de banco de dados "${dbType}" não reconhecido. Usando dados MOCK.`);
    }
  } catch (err) {
    console.error('◇ [DB] Falha ao conectar ao banco de dados:', err.message);
    console.log('◇ [DB] Usando dados MOCK automáticos para evitar falha no painel.');
    dbPool = null;
  }

  return dbPool;
}

// Helper para processar resultados e converter caminhos absolutos locais, formatar datas e sanitizar preços
function processProductRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map(originalRow => {
    // Normalizar chaves para caixa baixa (evita problemas com maiúsculas/minúsculas vindas do SQL)
    const r = {};
    for (const key of Object.keys(originalRow)) {
      r[key.toLowerCase()] = originalRow[key];
    }

    // Identificar ID com fallback para apelidos comuns
    const rawId = r.id ?? r.id_produto ?? r.codigo ?? r.id_prod ?? r.cod_produto;
    const productId = rawId !== undefined && rawId !== null ? String(rawId).trim() : null;

    // Identificar Nome com fallback
    const nomeProduto = r.nome_produto ?? r.nome ?? r.descricao ?? r.desc_produto ?? 'Produto em oferta';

    // 1. Tratamento do link de imagem (com fallback para apelidos comuns)
    let link = r.link_imagem ?? r.url_imagem ?? r.imagem ?? r.foto ?? '';
    if (typeof link === 'string') {
      link = link.trim();
      if (link.toLowerCase() === 'null' || link.toLowerCase() === 'undefined') {
        link = '';
      }
    }
    
    // Se não houver link no banco, tenta buscar pelo ID na pasta local configurada ou na pasta padrão do projeto
    if (!link && productId) {
      // Lista de extensões suportadas (incluindo caixa alta para sistemas case-sensitive como Linux)
      const extensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.JPG', '.JPEG', '.PNG', '.WEBP', '.GIF', '.SVG'];
      const searchDirs = [];
      
      let localPath = sanitizeWindowsPath(process.env.LOCAL_IMAGES_PATH);

      console.log(`◇ [IMAGENS LOCAIS] Buscando arquivo para ID "${productId}". Pasta: "${localPath || 'não configurada'}"`);

      if (localPath) {
        searchDirs.push({ dir: path.normalize(localPath), isCustom: true });
      }
      searchDirs.push({ dir: IMAGES_DIR, isCustom: false });

      let found = false;
      for (const item of searchDirs) {
        for (const ext of extensions) {
          const fileName = `${productId}${ext}`;
          const fullPath = path.join(item.dir, fileName);
          if (fs.existsSync(fullPath)) {
            if (item.isCustom) {
              link = `/api/local-image?path=${encodeURIComponent(fullPath)}`;
              console.log(`   -> Encontrado na pasta customizada: "${fullPath}"`);
            } else {
              link = `/imagens/${fileName}`;
              console.log(`   -> Encontrado na pasta padrão do projeto: "${fullPath}"`);
            }
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (!found) {
        console.log(`   -> Nenhuma imagem local encontrada para o produto ID "${productId}" nas pastas pesquisadas.`);
      }
    }

    if (link && (/^[a-zA-Z]:[\\\/]/.test(link))) {
      link = `/api/local-image?path=${encodeURIComponent(link)}`;
    }

    // 2. Tratamento seguro de preços (pode vir como número, string com vírgula/ponto, ou null)
    let precoAtual = 0;
    // Fallback para nomes comuns de preços
    const rawPrecoAtual = r.preco_atual ?? r.preco ?? r.valor;
    if (rawPrecoAtual !== undefined && rawPrecoAtual !== null) {
      if (typeof rawPrecoAtual === 'number') {
        precoAtual = rawPrecoAtual;
      } else {
        precoAtual = parseFloat(String(rawPrecoAtual).replace(',', '.'));
        if (Number.isNaN(precoAtual)) precoAtual = 0;
      }
    }

    let precoAnterior = null;
    const rawPrecoAnterior = r.preco_anterior ?? r.preco_de ?? r.valor_anterior;
    if (rawPrecoAnterior !== undefined && rawPrecoAnterior !== null && String(rawPrecoAnterior).trim() !== '') {
      if (typeof rawPrecoAnterior === 'number') {
        precoAnterior = rawPrecoAnterior;
      } else {
        precoAnterior = parseFloat(String(rawPrecoAnterior).replace(',', '.'));
        if (Number.isNaN(precoAnterior)) precoAnterior = null;
      }
    }

    // 3. Formatação segura de datas (data_validade, data_inicio, data_fim)
    const formatDate = (dateVal) => {
      if (!dateVal) return null;
      if (dateVal instanceof Date) {
        return dateVal.toISOString().split('T')[0];
      }
      const str = String(dateVal).trim();
      const match = str.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
      if (match) return `${match[1]}-${match[2]}-${match[3]}`;
      const matchBR = str.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
      if (matchBR) return `${matchBR[3]}-${matchBR[2]}-${matchBR[1]}`;
      return str;
    };

    return {
      ...r,
      id: r.id ?? productId,
      nome_produto: nomeProduto,
      link_imagem: link,
      preco_atual: precoAtual,
      preco_anterior: precoAnterior,
      data_validade: formatDate(r.data_validade ?? r.validade),
      data_inicio: r.data_inicio !== undefined ? formatDate(r.data_inicio) : undefined,
      data_fim: r.data_fim !== undefined ? formatDate(r.data_fim) : undefined
    };
  });
}

// Rota da API para buscar as promoções
app.get('/api/promocoes', async (req, res) => {
  try {
    const dbType = (process.env.DB_TYPE || 'mysql').toLowerCase();
    const conn = await getDbConnection();
    const customQuery = (process.env.DB_QUERY || '').trim();

    if (conn) {
      console.log(`◇ [API] Buscando dados ativos do banco de dados: ${dbType.toUpperCase()}`);
      
      try {
        if (dbType === 'mysql') {
          const queryToRun = customQuery || `
            SELECT id, nome_produto, preco_anterior, preco_atual, link_imagem, DATE_FORMAT(data_validade, '%Y-%m-%d') as data_validade 
            FROM promocoes 
            WHERE data_validade >= CURDATE()
          `;
          const [rows] = await conn.query(queryToRun);
          return res.json(processProductRows(rows));
        } 
        
        else if (dbType === 'postgres' || dbType === 'postgresql') {
          const queryToRun = customQuery || `
            SELECT id, nome_produto, preco_anterior, preco_atual, link_imagem, to_char(data_validade, 'YYYY-MM-DD') as data_validade 
            FROM promocoes 
            WHERE data_validade >= CURRENT_DATE
          `;
          const { rows } = await conn.query(queryToRun);
          return res.json(processProductRows(rows));
        } 
        
        else if (dbType === 'mssql' || dbType === 'sqlserver') {
          const queryToRun = customQuery || `
            SELECT id, nome_produto, preco_anterior, preco_atual, link_imagem, FORMAT(data_validade, 'yyyy-MM-dd') as data_validade 
            FROM promocoes 
            WHERE data_validade >= CAST(GETDATE() AS DATE)
          `;
          const result = await conn.request().query(queryToRun);
          return res.json(processProductRows(result.recordset));
        }
      } catch (dbErr) {
        console.error('◇ [API] Falha ao consultar banco de dados:', dbErr.message);
        console.log('◇ [API] Recorrendo aos dados MOCK para exibição na tela.');
        // Reseta o pool para forçar uma nova tentativa de conexão no futuro
        dbPool = null;
      }
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    // Retorna 16 produtos falsos (MOCK) se o banco não estiver configurado ou falhar
    const mockProdutos = [
      { id: 1, nome_produto: "Arroz Branco Tipo 1 5kg Premium", preco_anterior: 25.90, preco_atual: 19.99, link_imagem: "https://loremflickr.com/400/400/rice,package/all", data_validade: "2026-12-31", texto_validade: "OFERTA DA SEMANA" },
      { id: 2, nome_produto: "Feijão Carioca 1kg", preco_anterior: 8.50, preco_atual: 5.99, link_imagem: "", data_validade: "2026-12-31", texto_validade: "SÓ NESTA QUARTA" },
      { id: 3, nome_produto: "Óleo de Soja 900ml", preco_anterior: null, preco_atual: 5.49, link_imagem: "https://loremflickr.com/400/400/oil,bottle/all", data_validade: "2026-12-31", texto_validade: "SÓ HOJE!" },
      { id: 4, nome_produto: "Café Torrado e Moído 500g", preco_anterior: 18.90, preco_atual: 14.50, link_imagem: "https://loremflickr.com/400/400/coffee,bag/all", data_validade: "2026-12-31", texto_validade: "DURANTE O HAPPY HOUR" },
      { id: 5, nome_produto: "Açúcar Refinado 1kg", preco_anterior: 4.80, preco_atual: 3.99, link_imagem: "https://loremflickr.com/400/400/sugar/all", data_validade: todayStr },
      { id: 6, nome_produto: "Leite Integral 1L", preco_anterior: 5.50, preco_atual: 4.29, link_imagem: "https://loremflickr.com/400/400/milk,carton/all", data_validade: tomorrowStr },
      { id: 7, nome_produto: "Macarrão Espaguete Sêmola 500g", preco_anterior: 4.50, preco_atual: 2.99, link_imagem: "https://loremflickr.com/400/400/pasta,spaghetti/all", data_validade: "2026-12-31", texto_validade: "SÓ SEXTA E SÁBADO" },
      { id: 8, nome_produto: "Detergente Líquido Neutro 500ml", preco_anterior: 2.50, preco_atual: 1.89, link_imagem: "https://loremflickr.com/400/400/detergent,soap/all", data_validade: "2026-12-31", texto_validade: "DAS 8h ÀS 12h" },
      { id: 9, nome_produto: "Sabão em Pó Premium 1kg", preco_anterior: 15.90, preco_atual: 11.99, link_imagem: "https://loremflickr.com/400/400/detergent,box/all", data_validade: "2026-12-31", texto_validade: "LEVE 3 PAGUE 2" },
      { id: 10, nome_produto: "Cerveja Pilsen Lata 350ml", preco_anterior: 3.89, preco_atual: 2.79, link_imagem: "https://loremflickr.com/400/400/beer,can/all", data_validade: "2026-12-31", texto_validade: "FIM DE SEMANA" },
      { id: 11, nome_produto: "Refrigerante Cola 2L Original", preco_anterior: 9.90, preco_atual: 7.99, link_imagem: "https://loremflickr.com/400/400/soda,bottle/all", data_validade: "2026-12-31" },
      { id: 12, nome_produto: "Biscoito Recheado Chocolate 130g", preco_anterior: 3.20, preco_atual: 2.19, link_imagem: "https://loremflickr.com/400/400/cookie,chocolate/all", data_validade: "2026-12-31" },
      { id: 13, nome_produto: "Manteiga com Sal Pote 200g", preco_anterior: 12.50, preco_atual: 9.89, link_imagem: "https://loremflickr.com/400/400/butter/all", data_validade: "2026-12-31" },
      { id: 14, nome_produto: "Creme de Leite Leve TP 200g", preco_anterior: 3.90, preco_atual: 2.79, link_imagem: "https://loremflickr.com/400/400/cream,carton/all", data_validade: "2026-12-31" },
      { id: 15, nome_produto: "Sabonete em Barra 90g Fragrâncias", preco_anterior: 2.80, preco_atual: 1.99, link_imagem: "https://loremflickr.com/400/400/soap,bar/all", data_validade: "2026-12-31" },
      { id: 16, nome_produto: "Creme Dental Tripla Ação 90g", preco_anterior: 4.50, preco_atual: 3.29, link_imagem: "https://loremflickr.com/400/400/toothpaste/all", data_validade: "2026-12-31" }
    ];
    mockProdutos.unshift(
      { id: 101, nome_produto: "Arroz Branco Tipo 1 5kg Premium", preco_anterior: 25.90, preco_atual: 19.99, link_imagem: "https://loremflickr.com/400/400/rice,package/all", data_inicio: todayStr, data_fim: nextWeekStr },
      { id: 102, nome_produto: "Feijao Carioca 1kg", preco_anterior: 8.50, preco_atual: 5.99, link_imagem: "", data_inicio: todayStr, data_fim: nextWeekStr, dias_semana: "1,3" },
      { id: 103, nome_produto: "Oleo de Soja 900ml", preco_anterior: null, preco_atual: 5.49, link_imagem: "https://loremflickr.com/400/400/oil,bottle/all", data_inicio: todayStr, data_fim: todayStr, hora_inicio: "08:00", hora_fim: "10:00" },
      { id: 104, nome_produto: "Cafe Torrado e Moido 500g", preco_anterior: 18.90, preco_atual: 14.50, link_imagem: "https://loremflickr.com/400/400/coffee,bag/all", data_inicio: todayStr, data_fim: nextWeekStr, dias_semana: "1,3,5", hora_inicio: "08:00", hora_fim: "10:00" }
    );

    res.json(mockProdutos);

  } catch (error) {
    console.error('Erros fatais ao buscar promoções:', error);
    res.status(500).json({ error: 'Erro interno ao processar dados das promoções.' });
  }
});

// Endpoint seguro para servir imagens locais de qualquer pasta do servidor
app.get('/api/local-image', (req, res) => {
  const filePath = req.query.path;
  if (!filePath) {
    console.log('  [local-image] ERRO: nenhum caminho fornecido na query.');
    return res.status(400).send('Caminho do arquivo não fornecido.');
  }

  try {
    const resolvedPath = path.resolve(decodeURIComponent(filePath));
    console.log(`  [local-image] Servindo: "${resolvedPath}"`);

    // Verifica se o arquivo existe fisicamente no servidor
    if (!fs.existsSync(resolvedPath)) {
      console.log(`  [local-image] ERRO 404: arquivo não encontrado em "${resolvedPath}"`);
      return res.status(404).send('Imagem não encontrada no servidor.');
    }

    // Extensões de imagem permitidas (segurança básica)
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.PNG', '.JPG', '.JPEG'];
    const ext = path.extname(resolvedPath).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      console.log(`  [local-image] ERRO 403: extensão não permitida "${ext}"`);
      return res.status(403).send('Formato de arquivo não permitido.');
    }

    // Determina o content-type correto
    const mimeTypes = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.png': 'image/png', '.gif': 'image/gif',
      '.webp': 'image/webp', '.svg': 'image/svg+xml',
      '.bmp': 'image/bmp'
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    // Usa createReadStream para compatibilidade total com caminhos Windows
    const stream = fs.createReadStream(resolvedPath);
    stream.on('error', (err) => {
      console.log(`  [local-image] ERRO ao ler o arquivo: ${err.message}`);
      if (!res.headersSent) res.status(500).send('Erro ao ler o arquivo.');
    });
    stream.pipe(res);

  } catch (err) {
    console.log(`  [local-image] EXCEÇÃO: ${err.message}`);
    res.status(500).send('Erro interno ao servir a imagem.');
  }
});

// Rota para a tela de login customizada
app.get('/login', (req, res) => {
  res.sendFile(path.join(ADMIN_DIR, 'login.html'));
});

// Endpoint de login (Gera o cookie HttpOnly de sessão)
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const expectedUser = process.env.ADMIN_USER || 'admin';
  const expectedPass = process.env.ADMIN_PASS || 'admin123';

  if (username === expectedUser && password === expectedPass) {
    const token = createSessionToken(username);
    res.setHeader('Set-Cookie', buildSessionCookie(token, req));
    return res.json({ success: true, message: 'Autenticação realizada!' });
  }

  res.status(401).json({ success: false, error: 'Usuário ou senha inválidos' });
});

// Endpoint de logout (Limpa o cookie)
app.post('/api/logout', (req, res) => {
  res.setHeader('Set-Cookie', buildSessionCookie('', req, 0));
  res.json({ success: true, message: 'Sessão encerrada com sucesso!' });
});

// Redirect para evitar acesso direto ao HTML estático sem autenticação
app.get('/admin/config.html', (req, res) => {
  res.redirect('/config');
});

// Rota para abrir a página de configuração de forma mais amigável com Cache-Control desativado
app.get('/config', cookieAuth, (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.sendFile(path.join(ADMIN_DIR, 'config.html'));
});

// Retorna as configurações atuais do arquivo .env
app.get('/api/config/current', cookieAuth, (req, res) => {
  res.json({
    dbType: process.env.DB_TYPE || 'mysql',
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || '3306',
    database: process.env.DB_NAME || 'supermercado_db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD === 'sua_senha_aqui' ? '' : process.env.DB_PASSWORD,
    dbQuery: process.env.DB_QUERY || '',
    dbInstance: process.env.DB_INSTANCE || ''
  });
});

app.get('/api/display-config', (req, res) => {
  res.json(getDisplayConfig());
});

app.get('/api/config/display', cookieAuth, (req, res) => {
  res.json(getDisplayConfig());
});

// Rota para testar conexão com o banco de dados temporariamente antes de salvar
app.post('/api/config/test', cookieAuth, async (req, res) => {
  const { dbType, host, port, database, user, password, dbQuery, dbInstance } = req.body;
  const cleanedQuery = (dbQuery || '').trim();
  try {
    if (dbType === 'mysql') {
      const mysql = require('mysql2/promise');
      const conn = await mysql.createConnection({
        host,
        user,
        password,
        database,
        port: parseInt(port) || 3306,
        connectTimeout: 3000
      });
      if (cleanedQuery) {
        await conn.query(cleanedQuery);
      } else {
        await conn.ping();
      }
      await conn.end();
    } else if (dbType === 'postgres' || dbType === 'postgresql') {
      const { Client } = require('pg');
      const client = new Client({
        host,
        user,
        password,
        database,
        port: parseInt(port) || 5432,
        connectionTimeoutMillis: 3000
      });
      await client.connect();
      if (cleanedQuery) {
        await client.query(cleanedQuery);
      }
      await client.end();
    } else if (dbType === 'mssql' || dbType === 'sqlserver') {
      const mssql = require('mssql');
      const config = {
        user,
        password,
        server: host,
        database,
        options: { encrypt: false, trustServerCertificate: true },
        connectionTimeout: 3000
      };
      if (dbInstance) {
        config.options.instanceName = dbInstance;
      } else {
        config.port = parseInt(port) || 1433;
      }
      const conn = await mssql.connect(config);
      if (cleanedQuery) {
        await conn.request().query(cleanedQuery);
      }
      await conn.close();
    } else {
      return res.status(400).json({ success: false, error: 'Banco não suportado' });
    }
    res.json({ success: true, message: 'Conexão bem sucedida!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

function isSafeSelectQuery(query) {
  if (!query || query.trim() === '') return true;
  const cleaned = query.trim().toUpperCase();
  if (cleaned.includes(';')) return false; // Impede múltiplas instruções
  if (!cleaned.startsWith('SELECT') && !cleaned.startsWith('WITH')) return false;
  
  const forbidden = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|REPLACE|CREATE|GRANT|REVOKE|EXEC|EXECUTE|CALL|MERGE|COMMIT|ROLLBACK|DENY)\b/i;
  if (forbidden.test(query)) return false;
  return true;
}

app.post('/api/config/test-query', cookieAuth, async (req, res) => {
  const { dbType, host, port, database, user, password, dbQuery, dbInstance } = req.body;
  const cleanedQuery = (dbQuery || '').trim();
  
  if (!isSafeSelectQuery(cleanedQuery)) {
    return res.status(403).json({ success: false, error: 'Comando SQL não permitido. Apenas consultas SELECT (leitura) são aceitas.' });
  }

  let defaultQuery = '';

  try {
    let rows = [];
    if (dbType === 'mysql') {
      const mysql = require('mysql2/promise');
      const conn = await mysql.createConnection({ host, user, password, database, port: parseInt(port) || 3306, connectTimeout: 3000 });
      defaultQuery = `SELECT id, nome_produto, preco_anterior, preco_atual, link_imagem, DATE_FORMAT(data_validade, '%Y-%m-%d') as data_validade FROM promocoes WHERE data_validade >= CURDATE() LIMIT 10`;
      const [results] = await conn.query(cleanedQuery || defaultQuery);
      rows = results;
      await conn.end();
    } else if (dbType === 'postgres' || dbType === 'postgresql') {
      const { Client } = require('pg');
      const client = new Client({ host, user, password, database, port: parseInt(port) || 5432, connectionTimeoutMillis: 3000 });
      await client.connect();
      defaultQuery = `SELECT id, nome_produto, preco_anterior, preco_atual, link_imagem, to_char(data_validade, 'YYYY-MM-DD') as data_validade FROM promocoes WHERE data_validade >= CURRENT_DATE LIMIT 10`;
      const result = await client.query(cleanedQuery || defaultQuery);
      rows = result.rows;
      await client.end();
    } else if (dbType === 'mssql' || dbType === 'sqlserver') {
      const mssql = require('mssql');
      const config = { user, password, server: host, database, options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 3000 };
      if (dbInstance) config.options.instanceName = dbInstance;
      else config.port = parseInt(port) || 1433;
      const conn = await mssql.connect(config);
      defaultQuery = `SELECT TOP 10 id, nome_produto, preco_anterior, preco_atual, link_imagem, FORMAT(data_validade, 'yyyy-MM-dd') as data_validade FROM promocoes WHERE data_validade >= CAST(GETDATE() AS DATE)`;
      const result = await conn.request().query(cleanedQuery || defaultQuery);
      rows = result.recordset;
      await conn.close();
    } else {
      return res.status(400).json({ success: false, error: 'Banco não suportado' });
    }
    
    // Pegar no máximo as primeiras 15 linhas para não travar o navegador
    const limitedRows = Array.isArray(rows) ? rows.slice(0, 15) : [];
    res.json({ success: true, data: limitedRows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Salva as novas configurações no .env e atualiza as conexões em tempo de execução
function envLine(key, value) {
  const raw = String(value ?? '');
  // Valores simples sem caracteres especiais ficam sem aspas
  if (/^[A-Za-z0-9_./:@-]*$/.test(raw)) {
    return `${key}=${raw}`;
  }
  // Caminhos Windows com barras invertidas usam aspas SIMPLES (dotenv lê literalmente,
  // sem processar escapes como \\→\ que JSON.stringify causaria)
  if (raw.includes('\\')) {
    return `${key}='${raw}'`;
  }
  return `${key}=${JSON.stringify(raw)}`;
}

function buildEnvContent() {
  return [
    '# Tipo de Banco de Dados: mysql, postgres, sqlserver',
    envLine('DB_TYPE', process.env.DB_TYPE || 'mysql'),
    envLine('DB_HOST', process.env.DB_HOST || '127.0.0.1'),
    envLine('DB_PORT', process.env.DB_PORT || '3306'),
    envLine('DB_INSTANCE', process.env.DB_INSTANCE || ''),
    envLine('DB_USER', process.env.DB_USER || 'root'),
    envLine('DB_PASSWORD', process.env.DB_PASSWORD || ''),
    envLine('DB_NAME', process.env.DB_NAME || 'supermercado_db'),
    envLine('DB_QUERY', process.env.DB_QUERY || ''),
    envLine('PORT', PORT),
    envLine('ADMIN_USER', process.env.ADMIN_USER || 'admin'),
    envLine('ADMIN_PASS', process.env.ADMIN_PASS || 'admin123'),
    envLine('SESSION_SECRET', SESSION_SECRET),
    envLine('ALLOWED_ORIGINS', process.env.ALLOWED_ORIGINS || ''),
    '',
    '# Configuracoes visuais da tela',
    envLine('LOCAL_IMAGES_PATH', process.env.LOCAL_IMAGES_PATH || ''),
    envLine('DISPLAY_TITLE', process.env.DISPLAY_TITLE || 'OFERTAS IMPERDIVEIS'),
    envLine('DISPLAY_FOOTER_TEXT', process.env.DISPLAY_FOOTER_TEXT || 'Aproveite! Promocoes validas enquanto durarem os estoques.'),
    envLine('DISPLAY_FETCH_INTERVAL', process.env.DISPLAY_FETCH_INTERVAL || '30000'),
    envLine('DISPLAY_CAROUSEL_INTERVAL', process.env.DISPLAY_CAROUSEL_INTERVAL || '10000'),
    envLine('DISPLAY_VITRINE_ITEM_INTERVAL', process.env.DISPLAY_VITRINE_ITEM_INTERVAL || '6000'),

    envLine('DISPLAY_PRIMARY_COLOR', process.env.DISPLAY_PRIMARY_COLOR || '#d32f2f'),
    envLine('DISPLAY_ACCENT_COLOR', process.env.DISPLAY_ACCENT_COLOR || '#fbc02d'),
    envLine('DISPLAY_BACKGROUND_COLOR', process.env.DISPLAY_BACKGROUND_COLOR || '#111111'),
    envLine('DISPLAY_FILTER_ACTIVE_ONLY', process.env.DISPLAY_FILTER_ACTIVE_ONLY || 'false'),
    ''
  ].join('\n');
}

function saveEnvFile() {
  const envPath = path.join(__dirname, '.env');
  fs.writeFileSync(envPath, buildEnvContent());
}

app.post('/api/config/save', cookieAuth, async (req, res) => {
  const { dbType, host, port, dbInstance, database, user, password, dbQuery } = req.body;
  const cleanedQuery = (dbQuery || '').trim();

  if (!isSafeSelectQuery(cleanedQuery)) {
    return res.status(403).json({ success: false, error: 'Comando SQL não permitido. Apenas consultas SELECT (leitura) são aceitas.' });
  }
  try {
    // Atualiza em tempo de execução
    process.env.DB_TYPE = dbType;
    process.env.DB_HOST = host;
    process.env.DB_PORT = port;
    process.env.DB_INSTANCE = String(dbInstance || '').trim();
    process.env.DB_USER = user;
    process.env.DB_PASSWORD = password;
    process.env.DB_NAME = database;
    process.env.DB_QUERY = cleanedQuery;
    saveEnvFile();

    // Derruba o pool antigo para recriar com a nova configuração na próxima requisição
    if (dbPool) {
      console.log('◇ [DB] Configurações alteradas! Fechando conexões anteriores...');
      try {
        if (typeof dbPool.end === 'function') {
          await dbPool.end();
        } else if (typeof dbPool.close === 'function') {
          await dbPool.close();
        }
      } catch (poolErr) {
        console.warn('◇ [DB] Erro ao fechar conexão antiga:', poolErr.message);
      }
      dbPool = null;
    }

    res.json({ success: true, message: 'Configuração atualizada com sucesso!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/config/display/save', cookieAuth, (req, res) => {
  try {
    const {
      localImagesPath,
      title,
      footerText,
      defaultLayout,
      fetchInterval,
      carouselInterval,
      vitrineItemInterval,
      itemsPadrao,
      itemsCompacto,
      itemsVitrine,
      itemsSemFoto,
      primaryColor,
      accentColor,
      backgroundColor,
      filterActiveOnly
    } = req.body;

    process.env.LOCAL_IMAGES_PATH = sanitizeWindowsPath(localImagesPath);

    process.env.DISPLAY_TITLE = String(title || 'OFERTAS IMPERDIVEIS').trim();
    process.env.DISPLAY_FOOTER_TEXT = String(footerText || 'Aproveite! Promocoes validas enquanto durarem os estoques.').trim();
    process.env.DISPLAY_FETCH_INTERVAL = String(clampNumber(fetchInterval, 30000, 5000, 300000));
    process.env.DISPLAY_CAROUSEL_INTERVAL = String(clampNumber(carouselInterval, 10000, 3000, 120000));
    process.env.DISPLAY_VITRINE_ITEM_INTERVAL = String(clampNumber(vitrineItemInterval, 6000, 3000, 120000));
    process.env.DISPLAY_ITEMS_PADRAO = String(clampNumber(itemsPadrao, 4, 1, 8));
    process.env.DISPLAY_ITEMS_COMPACTO = String(clampNumber(itemsCompacto, 6, 1, 12));
    process.env.DISPLAY_ITEMS_VITRINE = String(clampNumber(itemsVitrine, 5, 1, 10));
    process.env.DISPLAY_ITEMS_SEM_FOTO = String(clampNumber(itemsSemFoto, 4, 1, 8));
    process.env.DISPLAY_PRIMARY_COLOR = sanitizeColor(primaryColor, '#d32f2f');
    process.env.DISPLAY_ACCENT_COLOR = sanitizeColor(accentColor, '#fbc02d');
    process.env.DISPLAY_BACKGROUND_COLOR = sanitizeColor(backgroundColor, '#111111');
    process.env.DISPLAY_FILTER_ACTIVE_ONLY = filterActiveOnly ? 'true' : 'false';

    saveEnvFile();
    res.json({ success: true, message: 'Configuracoes visuais salvas!', config: getDisplayConfig() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
