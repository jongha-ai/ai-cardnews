import { searchStockImageCandidates } from '../src/utils/unsplashSearchService';

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Only POST is supported.' });
  }

  const accessKey =
    process.env.UNSPLASH_ACCESS_KEY ||
    process.env.UNSPLASH_KEY;

  if (!accessKey || accessKey.trim() === '') {
    return res.status(500).json({
      error: 'UNSPLASH_ACCESS_KEY is not configured on the server. Please set UNSPLASH_ACCESS_KEY in server environment variables.',
    });
  }

  try {
    const bodyData = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const result = await searchStockImageCandidates(bodyData, accessKey);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Stock Image Search API error:', error);
    return res.status(500).json({
      error: '스톡 이미지 검색 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    });
  }
}
