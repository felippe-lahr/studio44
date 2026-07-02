import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

// Pasta de dados persistente (na Railway, monte um volume aqui via DATA_DIR).
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'studio44';
const PORT = process.env.PORT || 3000;
const MAX_UPLOAD = 10 * 1024 * 1024; // 10 MB

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

/* ------------------------------------------------------------------ *
 * Auth simples por token em memória (invalida ao reiniciar o servidor)
 * ------------------------------------------------------------------ */
const tokens = new Set();
function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (token && tokens.has(token)) return next();
  return res.status(401).json({ error: 'não autorizado' });
}

/* ------------------------------------------------------------------ *
 * Upload de imagens
 * ------------------------------------------------------------------ */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
    cb(null, `${Date.now()}-${safe}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD },
  fileFilter: (_req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
});

/* ------------------------------------------------------------------ */
const app = express();
app.use(express.json({ limit: '2mb' }));

// Uploads persistentes
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d' }));

// --- API ---
app.get('/api/content', (_req, res) => {
  try {
    if (fs.existsSync(CONTENT_FILE)) {
      return res.type('application/json').send(fs.readFileSync(CONTENT_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('read content error', e);
  }
  return res.json(null); // sem conteúdo salvo → o site usa os padrões
});

app.post('/api/login', (req, res) => {
  const { password } = req.body || {};
  if (password && password === ADMIN_PASSWORD) {
    const token = crypto.randomBytes(24).toString('hex');
    tokens.add(token);
    return res.json({ token });
  }
  return res.status(401).json({ error: 'senha inválida' });
});

app.post('/api/logout', requireAuth, (req, res) => {
  const token = (req.headers.authorization || '').slice(7);
  tokens.delete(token);
  res.json({ ok: true });
});

app.put('/api/content', requireAuth, (req, res) => {
  try {
    fs.writeFileSync(CONTENT_FILE, JSON.stringify(req.body, null, 2));
    res.json({ ok: true });
  } catch (e) {
    console.error('write content error', e);
    res.status(500).json({ error: 'falha ao salvar' });
  }
});

app.post('/api/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'arquivo inválido' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// --- SPA estática + fallback ---
app.use(express.static(DIST, { index: false }));
app.get('*', (_req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Studio44 server on :${PORT} (data: ${DATA_DIR})`);
});
