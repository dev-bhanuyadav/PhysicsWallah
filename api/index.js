import { createHash, randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');
const DATA_FILE = join(DATA_DIR, 'batches.json');

// Supabase config (Hardcoded as per user request for immediate fix)
const supabaseUrl = 'https://wokvqlueeuxwqkzjwdgq.supabase.co';
const supabaseAnonKey = 'sb_publishable_Jxd-JJ87Vz6Fk5bFc1mQ6w_lK29j27y';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const expectedKeyHash =
  process.env.ADMIN_KEY_SHA256 ||
  '23d47445adfb8991789b459b6ba1b974d727d310aa9d80b7c2875b9430c0ba25';

async function getSetting(key) {
  try {
    const { data, error } = await supabase.from('settings').select('value').eq('key', key).single();
    if (error || !data) return null;
    return data.value;
  } catch {
    return null;
  }
}

async function setSetting(key, value) {
  try {
    const { error } = await supabase.from('settings').upsert({ key, value, updated_at: new Date() });
    return !error;
  } catch {
    return false;
  }
}

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
  // NOTE: On Vercel, this will NOT persist correctly across requests.
  // Filesystem is read-only or ephemeral. Use a database for persistent storage.
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify(arr, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write JSON (expected on Vercel):', e);
  }
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
  const fields = ['title', 'subtitle', 'examLabel', 'language', 'startDate', 'price', 'originalPrice', 'imageUrl'];
  for (const f of fields) {
    if (!(f in x)) return false;
  }
  return true;
}

export default async function handler(req, res) {
  try {
    if (!req.url) return send(res, 404, { error: 'Not found' });
    if (req.method === 'OPTIONS') return send(res, 204, {});

    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;
    console.log(`[Proxy] ${req.method} ${path}`);

    // Route matching
    // --- Batches Health / Ping ---
    if (path.endsWith('/health')) {
      return send(res, 200, { status: 'ok', time: new Date() });
    }

    // --- Media Secure Proxy ---
    if (path.endsWith('/media-secure')) {
      const b = url.searchParams.get('b');
      if (!b) return send(res, 400, { error: 'Batch ID (b) required' });
      
      const targetUrl = `https://api.penpencil.co/v3/batches/${b}/media-secure${url.search}`;

      try {
        const proxyRes = await fetch(targetUrl, {
          method: 'GET',
          headers: {
            'client-type': 'WEB'
          }
        });
        
        const contentType = proxyRes.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await proxyRes.json();
          return send(res, proxyRes.status, data);
        } else {
          const text = await proxyRes.text();
          return send(res, proxyRes.status, { text, contentType });
        }
      } catch (e) {
        return send(res, 500, { error: 'Media Proxy Error: ' + e.message, url: targetUrl });
      }
    }

    if (req.method === 'GET' && path.endsWith('/batches')) {
      const batches = await readJson();
      batches.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      return send(res, 200, batches);
    }

    if (req.method === 'POST' && path.endsWith('/batches')) {
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
        ...body,
        createdAt: Date.now(),
      };
      await writeJson([next, ...batches]);
      return send(res, 200, next);
    }

    if (req.method === 'DELETE' && (path.includes('/batches/'))) {
      if (!requireAdmin(req)) return send(res, 401, { error: 'Unauthorized' });
      const id = decodeURIComponent(path.split('/batches/').pop() || '');
      if (!id) return send(res, 400, { error: 'Invalid id' });
      const batches = await readJson();
      const next = batches.filter((b) => b && b.id !== id);
      await writeJson(next);
      return send(res, 200, { ok: true });
    }

    // --- Admin Settings (Token) ---
    if (path.endsWith('/admin/settings/token')) {
      if (req.method === 'GET') {
        const token = await getSetting('pw_token');
        return send(res, 200, { token: token || process.env.PW_TOKEN || '' });
      }
      if (req.method === 'POST') {
        if (!requireAdmin(req)) return send(res, 401, { error: 'Invalid Admin Key' });
        const raw = await readBody(req);
        let body = null;
        try { body = JSON.parse(raw); } catch { return send(res, 400, { error: 'Invalid JSON' }); }
        if (!body.token) return send(res, 400, { error: 'Token required' });
        
        const { error } = await supabase.from('settings').upsert({ key: 'pw_token', value: body.token, updated_at: new Date().toISOString() });
        if (!error) return send(res, 200, { ok: true });
        else return send(res, 500, { error: 'Failed to save token to Supabase', details: error });
      }
    }

    // --- PW Proxy ---
    if (path.includes('/pw-proxy/')) {
      const targetPath = path.split('/pw-proxy/').pop()?.replace(/^v1\//, '') || '';
      const targetUrl = `https://api.penpencil.co/${targetPath}${url.search}`;
      
      const token = (await getSetting('pw_token')) || process.env.PW_TOKEN || '';

      if (!token) return send(res, 401, { error: 'PW Bearer Token not configured in Admin panel or Env' });

      try {
        const bodyData = (req.method !== 'GET' && req.method !== 'HEAD') ? await readBody(req) : undefined;
        const proxyRes = await fetch(targetUrl, {
          method: req.method,
          headers: {
            'Authorization': `Bearer ${token}`,
            'client-type': 'WEB',
            'Content-Type': 'application/json'
          },
          body: bodyData
        });
        
        const contentType = proxyRes.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await proxyRes.json();
          return send(res, proxyRes.status, data);
        } else {
          const text = await proxyRes.text();
          return send(res, proxyRes.status, { text, contentType });
        }
      } catch (e) {
        return send(res, 500, { error: 'Proxy Fetch Error: ' + e.message, url: targetUrl });
      }
    }

    return send(res, 404, { error: 'Not found' });
  } catch (e) {
    console.error('Handler Error:', e);
    return send(res, 500, { error: 'Server error: ' + e.message, stack: e.stack });
  }
}
