import { getGeminiClient, generateContentWithFallback } from './_gemini.js';

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const bodyData = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { prompt = '', aspectRatio = '1:1' } = bodyData;

    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return res.status(400).json({ error: '프롬프트(prompt)를 입력해주세요.' });
    }

    const cleanPrompt = prompt
      .replace(/--ar\s+\d+:\d+/gi, '')
      .replace(/--v\s+\d+(\.\d+)?/gi, '')
      .replace(/--stylize\s+\d+/gi, '')
      .replace(/--q\s+\d+/gi, '')
      .replace(/--quality\s+\d+/gi, '')
      .trim();

    let enhancedPrompt = cleanPrompt;
    const ai = getGeminiClient();

    if (ai) {
      try {
        const enhanceResponse = await generateContentWithFallback(ai, {
          contents: `You are an expert AI art director.
Convert and expand the following Korean image prompt into an ultra-detailed, cinematic, photorealistic, 8k resolution English prompt optimized for the FLUX AI image generator.
CRITICAL RULES:
- If people or workers are mentioned, ALWAYS explicitly depict authentic Korean ethnicity (Korean person, Korean business owner/worker) with natural Korean facial features. Do NOT default to Caucasian/western people.
- If indoor/business spaces are mentioned, ALWAYS depict modern Korean aesthetic (Korean cafe, domestic boutique store, sleek modern Seoul office setup).
- Focus on soft natural daylight, depth of field, high texture detail, 8k resolution.
- Do NOT include any preamble, quotes, markdown formatting, or parameter flags (--ar, --v). Output ONLY the single English prompt text.

User Prompt: "${cleanPrompt}"`,
          config: {
            temperature: 0.7,
            maxOutputTokens: 300,
          },
        });

        const rawEnhanced = enhanceResponse?.text?.trim();
        if (rawEnhanced && rawEnhanced.length > 5) {
          enhancedPrompt = rawEnhanced;
        }
      } catch (err: any) {
        console.warn('Gemini prompt enhance fallback:', err?.message || err);
      }
    }

    let width = 1024;
    let height = 1024;
    if (aspectRatio === '4:5') {
      width = 896;
      height = 1120;
    } else if (aspectRatio === '9:16') {
      width = 768;
      height = 1344;
    } else if (aspectRatio === '16:9') {
      width = 1344;
      height = 768;
    }

    const randomSeed = Math.floor(Math.random() * 9000000) + 1000000;
    const encodedPrompt = encodeURIComponent(enhancedPrompt);
    const fluxImageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&model=flux&nologo=true&enhance=true&seed=${randomSeed}`;

    return res.status(200).json({
      imageUrl: fluxImageUrl,
      enhancedPrompt,
      originalPrompt: prompt,
    });
  } catch (err: any) {
    console.error('Vercel generate-image error:', err);
    return res.status(500).json({ error: err.message || 'AI 이미지 생성 실패' });
  }
}