export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    name: 'AI Card News Generator API',
    status: 'running',
    endpoints: ['/api/generate-cardnews', '/api/generate-image', '/api/refine-slide', '/api/health'],
  });
}