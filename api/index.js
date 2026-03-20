import { createHash, pbkdf2Sync, createDecipheriv } from 'crypto';
import https from 'https';
import { createClient } from '@supabase/supabase-js';

// Supabase config
const supabaseUrl = 'https://wokvqlueeuxwqkzjwdgq.supabase.co';
const supabaseAnonKey = 'sb_publishable_Jxd-JJ87Vz6Fk5bFc1mQ6w_lK29j27y';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Crypto config for Token Encryption
const CRYPTO_PASS = "AlManer-Secure-Key-2025-PW-Clone";
const CRYPTO_SALT = "almaner-salt";

// Admin Key Hash (pw-admin-2026)
const expectedKeyHash = '01e669848c66516767163aa30b02530e7d21f0b19376bf5ba899216dbe594ba5';

// Helper: Decrypt token from frontend
function decryptToken(encB64) {
  if (!encB64 || encB64.length < 30) return encB64;
  try {
    const combined = Buffer.from(encB64, 'base64');
    const iv = combined.subarray(0, 12);
    const tag = combined.subarray(combined.length - 16);
    const cts = combined.subarray(12, combined.length - 16);
    const key = pbkdf2Sync(CRYPTO_PASS, CRYPTO_SALT, 100000, 32, 'sha256');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    let dec = decipher.update(cts, undefined, 'utf8');
    dec += decipher.final('utf8');
    return dec;
  } catch (e) {
    console.error('Decryption failed:', e.message);
    return encB64;
  }
}

// Helper: SHA256
function sha256(s) {
  return createHash('sha256').update(String(s)).digest('hex');
}

// Helper: Response sender
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

// Helper: Read request body
async function readBody(req) {
  return await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 1000000) req.destroy(); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

// Helper: Check Admin
function requireAdmin(req) {
  const key = (req.headers['x-admin-key'] || '').trim();
  return sha256(key) === expectedKeyHash;
}

// Helper: Get Supabase Setting
async function getSetting(key) {
  try {
    const { data, error } = await supabase.from('settings').select('value').eq('key', key).order('updated_at', { ascending: false }).limit(1);
    return (data && data.length) ? data[0].value : null;
  } catch { return null; }
}

// Helper: Tiny Fetch replacement for https
function nodeFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: { get: (k) => res.headers[k.toLowerCase()] },
          json: async () => { try { return JSON.parse(data); } catch { return { error: 'Invalid JSON', text: data }; } },
          text: async () => data,
        });
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

export default async function handler(req, res) {
  try {
    if (!req.url) return send(res, 404, { error: 'Not found' });
    if (req.method === 'OPTIONS') return send(res, 204, {});

    const host = req.headers.host || 'localhost';
    const url = new URL(req.url, `http://${host}`);
    const path = url.pathname;

    // --- Health ---
    if (path.endsWith('/health')) return send(res, 200, { status: 'ok', node: process.version });

    // --- Media Proxy ---
    if (path.endsWith('/media-secure')) {
      const b = url.searchParams.get('b');
      if (!b) return send(res, 400, { error: 'Batch ID (b) required' });
      const targetUrl = `https://api.penpencil.co/v3/batches/${b}/media-secure${url.search}`;
      // Prioritize incoming Authorization header from browser, fallback to Admin token
      let token = req.headers['authorization'] || '';
      if (!token || token.length < 20) {
        const tokenRaw = await getSetting('pw_token');
        token = decryptToken(tokenRaw) || '';
      }
      if (token && token.toLowerCase().startsWith('bearer ')) token = token.substring(7).trim();

      const proxyRes = await nodeFetch(targetUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'client-type': 'WEB',
          'client-id': '5eb393ee95fab7468a79d189',
          'organizationId': '5eb393ee95fab7468a79d189',
          'randomId': 'e62da5b8-956a-4762-94b5-2217ea0582af',
          'randomid': 'e62da5b8-956a-4762-94b5-2217ea0582af',
          'device-id': 'e62da5b8-956a-4762-94b5-2217ea0582af',
          'client-version': '50',
          'Content-Type': 'application/json'
        }
      });
      const data = await proxyRes.json();
      return send(res, proxyRes.statusCode || 200, data);
    }

    // --- Batches API ---
    if (req.method === 'GET' && path.endsWith('/batches')) {
      const { data, error } = await supabase.from('batches').select('*').order('created_at', { ascending: false });
      if (error) return send(res, 500, { error: 'Supabase Fetch Error', details: error });
      
      const mapped = (data || []).map(b => ({
        id: b.id,
        pwId: b.pw_id || null,
        title: b.title,
        subtitle: b.subtitle,
        examLabel: b.exam_label,
        language: b.language,
        startDate: b.start_date,
        price: Number(b.price),
        originalPrice: Number(b.original_price),
        imageUrl: b.image_url,
        createdAt: new Date(b.created_at).getTime()
      }));
      return send(res, 200, mapped);
    }

    if (req.method === 'POST' && path.endsWith('/batches')) {
      if (!requireAdmin(req)) return send(res, 401, { error: 'Unauthorized' });
      const body = JSON.parse(await readBody(req));
      const { data, error } = await supabase.from('batches').insert([{
        pw_id: body.pwId || null,
        title: body.title,
        subtitle: body.subtitle,
        exam_label: body.examLabel,
        language: body.language,
        start_date: body.startDate,
        price: body.price,
        original_price: body.originalPrice,
        image_url: body.imageUrl
      }]).select().single();
      if (error) return send(res, 500, { error: 'Supabase Insert Error', details: error });
      return send(res, 200, data);
    }

    if (req.method === 'DELETE' && path.includes('/batches/')) {
      if (!requireAdmin(req)) return send(res, 401, { error: 'Unauthorized' });
      const id = path.split('/batches/').pop();
      const { error } = await supabase.from('batches').delete().eq('id', id);
      if (error) return send(res, 500, { error: 'Supabase Delete Error' });
      return send(res, 200, { ok: true });
    }

    // --- Admin Settings (Token) ---
    if (path.endsWith('/admin/settings/token')) {
      if (req.method === 'GET') {
        const token = await getSetting('pw_token');
        return send(res, 200, { token: token || '' });
      }
      if (req.method === 'POST') {
        if (!requireAdmin(req)) return send(res, 401, { error: 'Invalid Admin Key' });
        const body = JSON.parse(await readBody(req));
        const { error } = await supabase.from('settings').upsert({ key: 'pw_token', value: body.token, updated_at: new Date().toISOString() });
        if (error) return send(res, 500, { error: 'Failed to save token' });
        return send(res, 200, { ok: true });
      }
    }

    // --- Proxy ---
    if (path.includes('/pw-proxy/')) {
      const targetPath = path.split('/pw-proxy/').pop()?.replace(/^v1\//, '') || '';
      const targetUrl = `https://api.penpencil.co/${targetPath}${url.search}`;
      
      // Prioritize incoming Authorization header from browser, fallback to Admin token
      let token = req.headers['authorization'] || '';
      if (!token || token.length < 20) {
        const tokenRaw = await getSetting('pw_token');
        token = decryptToken(tokenRaw) || '';
      }
      if (token && token.toLowerCase().startsWith('bearer ')) token = token.substring(7).trim();

      if (!token) return send(res, 401, { error: 'Authorization token missing. Please log in or configure Admin token.' });

      const bodyData = (req.method !== 'GET' && req.method !== 'HEAD') ? await readBody(req) : undefined;
      
      // Use internal nodeFetch helper (more robust than global fetch on some Node versions)
        const proxyHeaders = {
          'Authorization': `Bearer ${token}`,
          'client-type': 'WEB',
          'client-id': '5eb393ee95fab7468a79d189',
          'organizationId': '5eb393ee95fab7468a79d189',
          'randomId': 'e62da5b8-956a-4762-94b5-2217ea0582af',
          'randomid': 'e62da5b8-956a-4762-94b5-2217ea0582af',
          'device-id': 'e62da5b8-956a-4762-94b5-2217ea0582af',
          'client-version': '50'
        };
        if (bodyData) proxyHeaders['Content-Type'] = 'application/json';

        const proxyRes = await nodeFetch(targetUrl, {
          method: req.method,
          headers: proxyHeaders,
          body: bodyData
        });
      
      if (contentType && contentType.includes('application/json')) {
        const data = await proxyRes.json();
        return send(res, proxyRes.statusCode || 200, data);
      } else {
        const text = await proxyRes.text();
        return send(res, proxyRes.statusCode || 200, { text, contentType });
      }
    }

    return send(res, 404, { error: 'Not found' });
  } catch (e) {
    console.error('Server error:', e);
    return send(res, 500, { error: 'Internal Server Error', message: e.message, stack: e.stack });
  }
}
