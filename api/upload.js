const https = require('https');
const http = require('http');

const BUCKET = 'gentify-bbd67.firebasestorage.app';
const FB_HOST = 'firebasestorage.googleapis.com';

function send(res, code, data) {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type'
  });
  res.end(JSON.stringify(data));
}

function api(method, target, headers, body) {
  return new Promise((resolve, reject) => {
    let hostname, path;
    if (target.startsWith('http')) {
      const u = new URL(target);
      hostname = u.hostname;
      path = u.pathname + u.search;
    } else {
      hostname = FB_HOST;
      path = target;
    }

    const mod = hostname.includes('googleapis') || hostname.includes('google') ? https : http;
    const opts = { hostname, path, method, headers: headers || {} };
    const req = mod.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ data, headers: res.headers, status: res.statusCode });
        } else {
          let msg = data;
          try { const j = JSON.parse(data); msg = j.error?.message || msg; } catch {}
          reject(new Error(msg || 'HTTP ' + res.statusCode));
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function readBody(req) {
  return new Promise((resolve) => {
    const bufs = [];
    req.on('data', (c) => bufs.push(c));
    req.on('end', () => resolve(Buffer.concat(bufs)));
  });
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type'
      });
      res.end();
      return;
    }

    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      send(res, 401, { error: 'Missing Authorization header' });
      return;
    }
    const idToken = auth.slice(7);

    if (req.method === 'POST') {
      const raw = (await readBody(req)).toString();
      const body = JSON.parse(raw);
      const { file, name, contentType } = body;

      if (!file || !name) {
        send(res, 400, { error: 'Missing file or name' });
        return;
      }

      const ext = name.split('.').pop();
      const filename = Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.' + ext;
      const objectPath = 'product_images/' + filename;
      const fileBuffer = Buffer.from(file, 'base64');
      const ct = contentType || 'application/octet-stream';
      const downloadToken = uuid();

      const meta = JSON.stringify({
        name: objectPath,
        contentType: ct,
        metadata: { firebaseStorageDownloadTokens: downloadToken }
      });

      // Step 1: Create resumable session
      const session = await api('POST',
        '/v0/b/' + BUCKET + '/o?name=' + encodeURIComponent(objectPath) + '&uploadType=resumable',
        {
          'Authorization': 'Firebase ' + idToken,
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(meta),
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': fileBuffer.length,
          'X-Goog-Upload-Header-Content-Type': ct
        },
        meta
      );

      const uploadUrl = session.headers.location;
      if (!uploadUrl) {
        send(res, 500, { error: 'No upload URL from Firebase' });
        return;
      }

      // Step 2: Upload bytes
      await api('PUT', uploadUrl, {
        'Content-Length': fileBuffer.length,
        'Content-Type': ct,
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'upload, finalize',
        'X-Goog-Upload-Offset': '0'
      }, fileBuffer);

      const enc = objectPath.split('/').map(encodeURIComponent).join('/');
      const url = 'https://' + FB_HOST + '/v0/b/' + BUCKET + '/o/' + enc + '?alt=media&token=' + downloadToken;
      send(res, 200, { url });
      return;
    }

    if (req.method === 'DELETE') {
      const raw = (await readBody(req)).toString();
      const body = JSON.parse(raw);
      const url = body.url;
      if (!url) { send(res, 400, { error: 'Missing url' }); return; }

      const match = url.match(/\/o\/(.+?)\?/);
      if (!match) { send(res, 400, { error: 'Invalid URL' }); return; }

      const objectPath = decodeURIComponent(match[1]);
      await api('DELETE',
        '/v0/b/' + BUCKET + '/o/' + encodeURIComponent(objectPath),
        { 'Authorization': 'Firebase ' + idToken }
      );
      send(res, 200, { success: true });
      return;
    }

    send(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    send(res, 500, { error: e.message || 'Internal error' });
  }
};
