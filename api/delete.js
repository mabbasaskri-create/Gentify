export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    let body = '';
    await new Promise((resolve, reject) => {
      req.on('data', chunk => body += chunk);
      req.on('end', resolve);
      req.on('error', reject);
    });
    const { path, token } = JSON.parse(body);

    if (!path || !token) return res.status(400).json({ error: 'Missing required fields' });

    const bucket = 'gentify-bbd67.firebasestorage.app';
    const ep = encodeURIComponent(path);

    const delResp = await fetch(
      `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${ep}`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    if (!delResp.ok && delResp.status !== 404) {
      const errText = await delResp.text();
      return res.status(delResp.status).json({ error: errText });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
