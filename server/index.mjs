import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');
const DATA_FILE = join(DATA_DIR, 'batches.json');
const PORT = Number(process.env.PORT || 5174);

const expectedKeyHash =
  process.env.ADMIN_KEY_SHA256 ||
  '277839a853d9eb79ebd2fb5dd66e929021c8948721cd2aabc6e2be42da0a2d5e';

function sha256(s) {
  return createHash('sha256').update(String(s)).digest('hex');
}

async function readJson() {
  try {
    const raw = await readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeJson(arr) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(arr, null, 2), 'utf8');
}

async function ensureSeed() {
  const existing = await readJson();
  if (existing.length) return;
  const seeded = [
    {
      id: randomUUID(),
      title: 'Yakeen NEET 2027',
      subtitle: 'Class 12+ - NEET',
      examLabel: 'NEET 2027',
      language: 'HINGLISH',
      startDate: '2026-04-14',
      price: 5200,
      originalPrice: 6000,
      imageUrl:
        'https://static.pw.live/auth-fe/assets/images/pw_badge_v2_login.webp',
      createdAt: Date.now(),
    },
  ];
  await writeJson(seeded);
}

function send(res, status, body, headers = {}) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type,x-admin-key',
    ...headers,
  });
  res.end(json);
}

async function readBody(req) {
  return await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 1_000_000) req.destroy();
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function requireAdmin(req) {
  const key = req.headers['x-admin-key'] || '';
  return sha256(key) === expectedKeyHash;
}

function isValidBatchInput(x) {
  if (!x || typeof x !== 'object') return false;
  const fields = [
    'title',
    'subtitle',
    'examLabel',
    'language',
    'startDate',
    'price',
    'originalPrice',
    'imageUrl',
  ];
  for (const f of fields) {
    if (!(f in x)) return false;
  }
  if (typeof x.title !== 'string' || !x.title.trim()) return false;
  if (typeof x.subtitle !== 'string' || !x.subtitle.trim()) return false;
  if (typeof x.examLabel !== 'string' || !x.examLabel.trim()) return false;
  if (typeof x.language !== 'string' || !x.language.trim()) return false;
  if (typeof x.startDate !== 'string' || !x.startDate.trim()) return false;
  if (typeof x.imageUrl !== 'string' || !x.imageUrl.trim()) return false;
  const p = Number(x.price);
  const op = Number(x.originalPrice);
  if (!Number.isFinite(p) || p <= 0) return false;
  if (!Number.isFinite(op) || op <= 0) return false;
  return true;
}

createServer(async (req, res) => {
  try {
    if (!req.url) return send(res, 404, { error: 'Not found' });
    if (req.method === 'OPTIONS') return send(res, 204, {});

    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;

    if (req.method === 'GET' && path === '/api/health') {
      return send(res, 200, { ok: true });
    }

    if (req.method === 'GET' && path === '/api/batches') {
      const batches = await readJson();
      batches.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      return send(res, 200, batches);
    }

    if (req.method === 'POST' && path === '/api/batches') {
      if (!requireAdmin(req)) return send(res, 401, { error: 'Unauthorized' });
      const raw = await readBody(req);
      let body = null;
      try {
        body = raw ? JSON.parse(raw) : null;
      } catch {
        return send(res, 400, { error: 'Invalid JSON' });
      }
      if (!isValidBatchInput(body)) return send(res, 400, { error: 'Invalid input' });

      const batches = await readJson();
      const next = {
        id: randomUUID(),
        title: body.title.trim(),
        subtitle: body.subtitle.trim(),
        examLabel: body.examLabel.trim(),
        language: body.language.trim(),
        startDate: body.startDate.trim(),
        price: Number(body.price),
        originalPrice: Number(body.originalPrice),
        imageUrl: body.imageUrl.trim(),
        createdAt: Date.now(),
      };
      await writeJson([next, ...batches]);
      return send(res, 200, next);
    }

    if (req.method === 'DELETE' && path.startsWith('/api/batches/')) {
      if (!requireAdmin(req)) return send(res, 401, { error: 'Unauthorized' });
      const id = decodeURIComponent(path.slice('/api/batches/'.length));
      if (!id) return send(res, 400, { error: 'Invalid id' });
      const batches = await readJson();
      const next = batches.filter((b) => b && b.id !== id);
      await writeJson(next);
      return send(res, 200, { ok: true });
    }

    return send(res, 404, { error: 'Not found' });
  } catch (e) {
    return send(res, 500, { error: 'Server error' });
  }
}).listen(PORT, () => {
  process.stdout.write(`API running on http://localhost:${PORT}\n`);
});

ensureSeed().catch(() => {});

