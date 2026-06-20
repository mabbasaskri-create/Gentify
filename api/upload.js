const https = require('https');
const { URL } = require('url');

const BUCKET = 'gentify-bbd67.firebasestorage.app';
const HOST = 'firebasestorage.googleapis.com';

function request(method, path, headers, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: HOST,
      path,
      method,
      headers: headers || {}
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(data ? JSON.parse(data) : null); }
          catch { resolve(data); }
        } else {
          let msg = data;
          try { const j = JSON.parse(data); msg = j.error?.message || msg; } catch {}
          reject(new Error(msg || `HTTP ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function getDownloadURL(objectName, token) {
  const enc = objectName.split('/').map(encodeURIComponent).join('/');
  return `https://${HOST}/v0/b/${BUCKET}/o/${enc}?alt=media&token=${token}`;
}

function readBody(req) {
  return new Promise((resolve) => {
    const bufs = [];
    req.on('data', (c) => bufs.push(c));
    req.on('end', () => resolve(Buffer.concat(bufs)));
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }
  const idToken = auth.slice(7);

  if (req.method === 'POST') {
    const body = JSON.parse((await readBody(req)).toString());
    const { file, name, contentType } = body;

    if (!file || !name) {
      res.status(400).json({ error: 'Missing file or name' });
      return;
    }

    const ext = name.split('.').pop();
    const filename = Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.' + ext;
    const objectPath = 'product_images/' + filename;
    const fileBuffer = Buffer.from(file, 'base64');
    const ct = contentType || 'application/octet-stream';

    try {
      const result = await request('POST',
        `/v0/b/${BUCKET}/o?name=${encodeURIComponent(objectPath)}&uploadType=media`,
        {
          'Authorization': 'Firebase ' + idToken,
          'Content-Type': ct,
          'Content-Length': fileBuffer.length
        },
        fileBuffer
      );

      const dlToken = result?.downloadTokens
        ? (Array.isArray(result.downloadTokens) ? result.downloadTokens[0] : result.downloadTokens)
        : result?.downloadToken || '';
      const url = getDownloadURL(result?.name || objectPath, dlToken);
      res.json({ url });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
    return;
  }

  if (req.method === 'DELETE') {
    const body = JSON.parse((await readBody(req)).toString());
    const { url } = body;
    if (!url) { res.status(400).json({ error: 'Missing url' }); return; }

    const match = url.match(/\/o\/(.+?)\?(alt=media|alt=json)/);
    if (!match) { res.status(400).json({ error: 'Invalid URL' }); return; }

    const objectPath = decodeURIComponent(match[1]);
    try {
      await request('DELETE',
        `/v0/b/${BUCKET}/o/${encodeURIComponent(objectPath)}`,
        { 'Authorization': 'Firebase ' + idToken }
      );
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};
