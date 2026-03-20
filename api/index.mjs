import { createHash, pbkdf2Sync, createDecipheriv } from 'crypto';
import https from 'https';
import { createClient } from '@supabase/supabase-js';

// Unified Supabase Project (vmtvghkicidatwyzttic)
const supabaseUrl = 'https://vmtvghkicidatwyzttic.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZl9pZCI6InZtdHZnaGtpY2lkYXR3eXp0dGljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzOTY3MTAsImV4cCI6MjA1ODAzMjcxMH0.tXm4h4m5M-f3hG4W-6J7W3A7wFOnqYUPA1cuGeQ';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CRYPTO_PASS = "AlManer-Secure-Key-2025-PW-Clone";
const CRYPTO_SALT = "almaner-salt";

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
  } catch (e) { return encB64; }
}

function send(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type,x-admin-key,authorization',
  });
  res.end(JSON.stringify(body));
}

function nodeFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (options.headers) {
      for (const k of Object.keys(options.headers)) headers[k] = String(options.headers[k]);
    }
    const req = https.request(url, { method: options.method || 'GET', headers }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({
          statusCode: res.statusCode,
          headers: { get: (k) => res.headers[k.toLowerCase()] },
          json: async () => { try { return JSON.parse(data); } catch { return { error: 'Invalid JSON', text: data }; } },
          text: async () => data,
      }));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => resolve(body));
  });
}

async function getSetting(key) {
  try {
    const { data } = await supabase.from('settings').select('value').eq('key', key).order('updated_at', { ascending: false }).limit(1);
    return (data && data.length) ? data[0].value : null;
  } catch { return null; }
}

export default async function handler(req, res) {
  try {
    if (req.method === 'OPTIONS') return send(res, 204, {});
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const path = url.pathname;

    const getProxyToken = async () => {
      let token = req.headers['authorization'] || '';
      if (!token || token.length < 20) token = decryptToken(await getSetting('pw_token')) || '';
      if (token.toLowerCase().startsWith('bearer ')) token = token.substring(7).trim();
      return token;
    };

    const commonHeaders = {
      'accept': '*/*', 'client-type': 'WEB', 'client-id': '5eb393ee95fab7468a79d189',
      'organizationId': '5eb393ee95fab7468a79d189', 'client-version': '4.5.2',
      'origin': 'https://www.pw.live', 'referer': 'https://www.pw.live/',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0'
    };

    if (path.includes('/render/video')) {
      const b = url.searchParams.get('batchId');
      const s = url.searchParams.get('subjectId');
      const c = url.searchParams.get('childId');
      const targetUrl = `https://apiserverpro.onrender.com/api/pw/video?batchId=${b}&subjectId=${s}&childId=${c}`;
      const rRes = await nodeFetch(targetUrl, {
        headers: {
          'accept': '*/*',
          'origin': 'https://deltastudy.site',
          'referer': 'https://deltastudy.site/',
          'user-agent': commonHeaders['user-agent']
        }
      });
      return send(res, rRes.statusCode, await rRes.json());
    }

    if (path.includes('/render/batches')) {
      let targetUrl = `https://apiserverpro.onrender.com/api/pw/batches`;
      const id = path.split('/render/batches/')[1];
      if (id) targetUrl += `/${id}`;
      
      const rRes = await nodeFetch(targetUrl, {
        method: req.method,
        headers: {
          'accept': '*/*',
          'content-type': 'application/json',
          'x-admin-key': req.headers['x-admin-key'] || '',
          'origin': 'https://deltastudy.site',
          'referer': 'https://deltastudy.site/',
          'user-agent': commonHeaders['user-agent']
        },
        body: req.method === 'POST' ? await readBody(req) : undefined
      });
      return send(res, rRes.statusCode, await rRes.json());
    }

    if (path.includes('/media-secure')) {
      const b = url.searchParams.get('b') || url.searchParams.get('batchId');
      const s = url.searchParams.get('s') || url.searchParams.get('subjectId');
      const c = url.searchParams.get('c') || url.searchParams.get('childId');
      const pinId = await getProxyToken();
      const headers = { ...commonHeaders, 'Authorization': `Bearer ${pinId}` };
      const targetUrl = `https://api.penpencil.co/v2/batches/${b}/media-secure?batchId=${b}&subjectId=${s || ''}&childId=${c || ''}`;
      const pRes = await nodeFetch(targetUrl, { method: 'GET', headers });
      return send(res, pRes.statusCode, await pRes.json());
    }

    if (path.includes('/pw-proxy/')) {
      let target = path.split('/pw-proxy/').pop()?.replace(/^v1\//, '') || '';
      if (target.includes('media-secure')) target = target.replace('v3/', 'v2/');
      const qs = new URLSearchParams(url.search);
      if (target.includes('media-secure')) {
        if (qs.has('b')) qs.set('batchId', qs.get('b'));
        if (qs.has('s')) qs.set('subjectId', qs.get('s'));
        if (qs.has('c')) qs.set('childId', qs.get('c'));
      }
      const pinId = await getProxyToken();
      const headers = { ...commonHeaders, 'Authorization': `Bearer ${pinId}` };
      const pRes = await nodeFetch(`https://api.penpencil.co/${target}?${qs.toString()}`, { method: req.method, headers });
      return send(res, pRes.statusCode, await pRes.json());
    }
    
    // Core routes
    if (path.endsWith('/batches')) {
      const { data } = await supabase.from('batches').select('*').order('created_at', { ascending: false });
      return send(res, 200, (data || []));
    }

    return send(res, 404, { error: 'Not found' });
  } catch (e) { return send(res, 500, { error: 'Server error', msg: e.message }); }
}
