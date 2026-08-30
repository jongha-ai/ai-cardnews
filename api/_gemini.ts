import { GoogleGenAI } from '@google/genai';

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_KEY;

  if (!apiKey || apiKey.trim() === '') {
    return null;
  }

  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function generateContentWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
    models?: string[];
  }
): Promise<any> {
  const candidateModels = params.models || [
    'gemini-2.5-flash',
  ];

  let lastError: any = null;

  for (const modelName of candidateModels) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: params.contents,
          config: params.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const is429 =
          err?.status === 429 ||
          err?.message?.includes('429') ||
          err?.message?.includes('RESOURCE_EXHAUSTED');
        if (is429 && attempt < 2) {
          console.warn(`Model ${modelName} 429 rate limited. Retrying in 6s (attempt ${attempt + 1}/3)...`);
          await new Promise((r) => setTimeout(r, 6000));
          continue;
        }
        console.warn(`Model ${modelName} call failed:`, err?.message || err);
        break;
      }
    }
  }

  throw lastError || new Error('All Gemini models failed to respond.');
}
