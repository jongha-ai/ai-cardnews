import { trackUnsplashDownload } from '../src/server/unsplashService.js';

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Only POST is supported.' });
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY || process.env.UNSPLASH_KEY || '';
  if (!accessKey || accessKey.trim() === '') {
    return res.status(500).json({ error: 'UNSPLASH_ACCESS_KEY is not configured.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { photoId } = body;

    const result = await trackUnsplashDownload(photoId, accessKey);
    if (!result.success) {
      return res.status(result.status || 502).json({ error: result.error || 'Upstream Unsplash download tracking failed', success: false });
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[Unsplash Tracking] Error:', error.message);
    return res.status(500).json({ error: 'Failed to track Unsplash download.' });
  }
}
