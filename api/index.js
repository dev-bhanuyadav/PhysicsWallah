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
    return encB64;
  }
}

function sha256(s) {
  return createHash('sha256').update(String(s)).digest('hex');
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type,x-admin-key,authorization',
    ...headers,
  });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  return await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 2000000) req.destroy(); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function nodeFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (options.headers) {
      for (const k of Object.keys(options.headers)) {
        if (options.headers[k] !== undefined && options.headers[k] !== null) {
          headers[k] = String(options.headers[k]);
        }
      }
    }
    const reqOptions = { method: options.method || 'GET', headers };
    const req = https.request(url, reqOptions, (res) => {
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
    req.on('timeout', () => { req.destroy(); reject(new Error('Proxy Timeout')); });
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function getSetting(key) {
  try {
    const { data, error } = await supabase.from('settings').select('value').eq('key', key).order('updated_at', { ascending: false }).limit(1);
    return (data && data.length) ? data[0].value : null;
  } catch { return null; }
}

export default async function handler(req, res) {
  try {
    if (!req.url) return send(res, 404, { error: 'Not found' });
    if (req.method === 'OPTIONS') return send(res, 204, {});

    const host = req.headers.host || 'localhost';
    const url = new URL(req.url, `http://${host}`);
    const path = url.pathname;

    if (path.endsWith('/health')) return send(res, 200, { status: 'ok', node: process.version });

    // Helper: Shared Logic to retrieve token and proxy
    const getProxyToken = async () => {
      let token = req.headers['authorization'] || '';
      if (!token || token.length < 20) {
        const tokenRaw = await getSetting('pw_token');
        token = decryptToken(tokenRaw) || '';
      }
      if (token && token.toLowerCase().startsWith('bearer ')) token = token.substring(7).trim();
      return token;
    };

    const commonHeaders = {
      'accept': '*/*',
      'accept-language': 'en-US,en;q=0.9',
      'cache-control': 'no-cache',
      'client-type': 'WEB',
      'client-id': '5eb393ee95fab7468a79d189',
      'organizationId': '5eb393ee95fab7468a79d189',
      'client-version': '4.5.2',
      'origin': 'https://www.pw.live',
      'referer': 'https://www.pw.live/',
      'pragma': 'no-cache',
      'randomid': 'e62da5b8-956a-4762-94b5-2217ea0582af',
      'device-id': 'e62da5b8-956a-4762-94b5-2217ea0582af',
      'x-sdk-version': '0.0.16',
      'sec-ch-ua': '"Chromium";v="146", "Not-A.Brand";v="24", "Microsoft Edge";v="146"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'cross-site',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0'
    };


    if (req.method === 'GET' && path.endsWith('/batches')) {
      const { data, error } = await supabase.from('batches').select('*').order('created_at', { ascending: false });
      if (error) return send(res, 500, { error: 'Supabase Error' });
      return send(res, 200, (data || []).map(b => ({
        id: b.id, pwId: b.pw_id, title: b.title, subtitle: b.subtitle,
        examLabel: b.exam_label, language: b.language, startDate: b.start_date,
        price: Number(b.price), originalPrice: Number(b.original_price),
        imageUrl: b.image_url, createdAt: new Date(b.created_at).getTime()
      })));
    }

    if (req.method === 'POST' && path.endsWith('/batches')) {
      const authKey = (req.headers['x-admin-key'] || '').trim();
      if (sha256(authKey) !== expectedKeyHash) return send(res, 401, { error: 'Unauthorized' });
      const body = JSON.parse(await readBody(req));
      const { data, error } = await supabase.from('batches').insert([{
        pw_id: body.pwId, title: body.title, subtitle: body.subtitle,
        exam_label: body.examLabel, language: body.language, start_date: body.startDate,
        price: body.price, original_price: body.originalPrice, image_url: body.imageUrl
      }]).select().single();
      if (error) return send(res, 500, { error: 'Insert Error' });
      return send(res, 200, data);
    }

    if (path.includes('/pw-proxy/')) {
      let target = path.split('/pw-proxy/').pop()?.replace(/^v1\//, '') || '';
      
      // Safety Net: Rewrite v3 media-secure to v2 and map params
      if (target.includes('media-secure')) {
        target = target.replace('v3/', 'v2/');
      }

      const search = url.search || '';
      const qs = new URLSearchParams(search);
      if (qs.has('b')) qs.set('batchId', qs.get('b') || '');
      if (qs.has('s')) qs.set('subjectId', qs.get('s') || '');
      if (qs.has('c')) qs.set('childId', qs.get('c') || '');
      const finalSearch = qs.toString() ? `?${qs.toString()}` : '';

      const pinId = await getProxyToken();
      if (!pinId) return send(res, 401, { error: 'Login required' });

      const body = (req.method !== 'GET' && req.method !== 'HEAD') ? await readBody(req) : undefined;
      const headers = { ...commonHeaders, 'Authorization': `Bearer ${pinId}` };
      if (body) headers['Content-Type'] = 'application/json';

      const pRes = await nodeFetch(`https://api.penpencil.co/${target}${finalSearch}`, {
        method: req.method,
        headers,
        body
      });

      const cType = pRes.headers.get('content-type') || '';
      if (cType.includes('application/json')) {
        return send(res, pRes.statusCode || 200, await pRes.json());
      } else {
        return send(res, pRes.statusCode || 200, { text: await pRes.text(), contentType: cType });
      }
    }

    return send(res, 404, { error: 'Not found' });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'Server Error', message: e.message });
  }
}
