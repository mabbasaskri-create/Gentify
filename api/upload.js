export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { file, filename, contentType, token } = req.body || {};
    if (!file || !filename || !token) return res.status(400).json({ error: 'Missing required fields' });

    const bucket = 'gentify-bbd67.firebasestorage.app';
    const path = 'product_images/' + filename;
    const ep = encodeURIComponent(path);

    const uploadResp = await fetch(
      `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${ep}?uploadType=media`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': contentType || 'application/octet-stream'
        },
        body: Buffer.from(file, 'base64')
      }
    );

    if (!uploadResp.ok) {
      const errText = await uploadResp.text();
      return res.status(uploadResp.status).json({ error: errText });
    }

    const metaResp = await fetch(
      `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${ep}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    let downloadUrl;
    if (metaResp.ok) {
      const meta = await metaResp.json();
      const downloadToken = meta.downloadTokens ? meta.downloadTokens.split(',')[0].trim() : '';
      downloadUrl = downloadToken
        ? `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${ep}?alt=media&token=${downloadToken}`
        : `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${ep}?alt=media`;
    } else {
      downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${ep}?alt=media`;
    }

    res.json({ url: downloadUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
