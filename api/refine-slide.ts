import { Type } from '@google/genai';
import { getGeminiClient, generateContentWithFallback } from './_gemini.js';

const STYLE_KEYWORD_MAP: Record<string, string> = {
  'minimalist': '미니멀',
  'minimal': '미니멀',
  'dynamic motion': '역동적 연출',
  'dynamic': '역동적',
  'motion': '역동적',
  'professional': '전문가 인사이트',
  'high contrast': '선명한 비주얼',
  'contrast': '선명한 대비',
  'editorial photography': '에디토리얼 포토',
  'editorial': '에디토리얼',
  'photography': '고화질 포토',
  'photo': '포토',
  'clean daylight': '자연광',
  'daylight': '자연광',
  'natural light': '자연광',
  'studio lighting': '스튜디오 조명',
  'lighting': '스튜디오 조명',
  'sophisticated aesthetics': '감각적 무드',
  'aesthetic': '감각적 무드',
  'cinematic': '시네마틱',
  '3d rendering': '3D 렌더링',
  '3d': '3D 비주얼',
  'glassmorphism': '글래스모피즘',
  'dark tech': '다크 테크',
  'clean': '깔끔한 무드',
  'modern': '모던 스타일',
  'magazine insight': '트렌드 인사이트',
  'summary & action': '핵심 요약 & 실천',
};

const sanitizeKeywordsToKorean = (keywords: any[]): string[] => {
  if (!keywords || !Array.isArray(keywords)) return ['트렌드', '핵심 포인트'];
  return keywords.map((k) => {
    if (!k || typeof k !== 'string') return '';
    const trimmed = k.trim();
    const lower = trimmed.toLowerCase();
    if (STYLE_KEYWORD_MAP[lower]) return STYLE_KEYWORD_MAP[lower];
    for (const [eng, kor] of Object.entries(STYLE_KEYWORD_MAP)) {
      if (lower.includes(eng)) return kor;
    }
    return trimmed;
  }).filter(Boolean);
};

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

  const bodyData = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { slide, action = 'more_punchy', projectContext } = bodyData;

  if (!slide) {
    return res.status(400).json({ error: '슬라이드 정보가 필요합니다.' });
  }

  try {

    const generateLocalFallback = (slideData: any, refineAction: string) => {
      let headline = slideData.headline || '';
      let body = slideData.body || '';
      let highlightWords = [...(slideData.highlightWords || [])];
      let imagePrompt = slideData.imagePrompt;
      let imagePromptKorean = slideData.imagePromptKorean;
      let imageStyleKeywords = sanitizeKeywordsToKorean(slideData.imageStyleKeywords || ['트렌드', '핵심 포인트']);

      const cleanHeadline = headline.replace(/^🔥\s*|^\💡\s*|^\💼\s*|^\✨\s*|^\💰\s*/, '').trim();

      switch (refineAction) {
        case 'more_punchy':
          headline = `🔥 ${cleanHeadline}\n놓치면 100% 손해보는 결정적 차이`;
          body = `남들과 똑같이 해서는 성과를 낼 수 없습니다.\n지금 당장 점검해야 할 핵심 1가지를 확인하세요.`;
          highlightWords = ['결정적 차이', '성과', '핵심 1가지'];
          break;
        case 'more_professional':
          headline = `[전략 인사이트] ${cleanHeadline.replace(/\n/g, ' ')}`;
          body = `체계적인 프로세스와 실무 데이터 기반의 접근법이 필요합니다.\n단계별 실행 로드맵을 수립하여 효율성을 극대화하세요.`;
          highlightWords = ['프로세스', '실행 로드맵', '효율성 극대화'];
          break;
        case 'shorter':
          const firstLine = cleanHeadline.split('\n')[0] || cleanHeadline;
          headline = firstLine;
          body = `• 핵심 1: 즉시 실행 가능한 포인트\n• 핵심 2: 놓치지 말아야 할 결과값`;
          highlightWords = ['핵심 1', '핵심 2'];
          break;
        case 'rewrite_body':
          body = `1. 현황 진단: 현재의 병목 요인을 명확히 파악\n2. 즉시 실천: 5분 안에 실행 가능한 첫 단계\n3. 지속 루틴: 주간 단위 셀프 피드백 시스템 구축`;
          highlightWords = ['현황 진단', '즉시 실천', '지속 루틴'];
          break;
        case 'new_image_prompt':
          imagePrompt = `따뜻하고 세련된 국내 비즈니스 공간에서 ${cleanHeadline} 전략을 구상 중인 30대 한국인 직장인, 자연스러운 조명과 온화한 표정, 고화질 실사 사진, 1:1 비율`;
          imagePromptKorean = '메시지의 핵심을 직관적으로 전달하는 감각적인 한국형 고화질 에디토리얼 포토그래피';
          imageStyleKeywords = ['에디토리얼', '자연광', '고화질 포토', '미니멀'];
          break;
        default:
          headline = `✨ ${cleanHeadline}`;
          body = `${body}\n(AI 카피라이팅 최적화 완료)`;
      }

      return {
        ...slideData,
        headline,
        body,
        highlightWords,
        imagePrompt,
        imagePromptKorean,
        imageStyleKeywords,
      };
    };

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(200).json(generateLocalFallback(slide, action));
    }

    const actionPromptMap: Record<string, { desc: string; toneGuide: string }> = {
      more_punchy: {
        desc: '헤드라인을 스크롤을 멈추게 만드는 강렬한 호기심/후킹형 문구로 바꾸고, 본문도 강력한 임팩트의 한국어 문장으로 재작성해주세요.',
        toneGuide: '독자의 감정과 호기심을 직접 자극하며 직관적인 한국어 단어를 사용하세요. 줄바꿈(\\n)을 활용해 리듬감을 주세요.',
      },
      more_professional: {
        desc: '헤드라인과 본문을 전문적이고 신뢰도 높은 비즈니스/전문가 한국어 톤으로 재작성해주세요.',
        toneGuide: '정제된 비즈니스 어휘, 논리적 인과관계, 권위와 신뢰감이 느껴지는 한국어 격식체를 사용하세요.',
      },
      shorter: {
        desc: '모바일에서 1초 만에 훑어볼 수 있도록 헤드라인과 본문을 극도로 간결하게 한국어로 압축해주세요.',
        toneGuide: '헤드라인은 1~2줄, 본문은 2줄 이내의 짧은 불렛포인트나 핵심 한 줄로 축약하세요.',
      },
      rewrite_body: {
        desc: '본문 내용을 독자가 바로 따라할 수 있는 1-2-3 실천 가이드 또는 핵심 요약 형식으로 완전히 새로 작성해주세요.',
        toneGuide: '가독성 높은 글머리 기호(• 또는 1, 2, 3)를 활용하여 명쾌한 한국어로 정리하세요.',
      },
      new_image_prompt: {
        desc: '이 슬라이드의 주제와 메시지에 가장 잘 어울리는 새로운 ChatGPT/제미나이 최적화 한국어 이미지 생성 프롬프트(한국인 인물 명시, 친숙한 국내 공간 배경, 고화질 실사)와 한국어 연출 의도를 작성해주세요.',
        toneGuide: '인물 등장 시 반드시 한국 국적(예: 한국인 사장님, 한국인 20대 여성)을 명시하고, 자연스러운 조명과 실사 사진, 비율이 포함된 한국어 서술형 문장으로 작성하세요.',
      },
    };

    const targetGuide = actionPromptMap[action] || actionPromptMap.more_punchy;

    const prompt = `
당신은 대한민국 최고 수준의 카드뉴스 전문 한국어 카피라이터이자 에디터입니다.
슬라이드 원본 정보:
- 현재 헤드라인: ${slide.headline}
- 현재 본문: ${slide.body}
- 현재 강조 키워드: ${(slide.highlightWords || []).join(', ')}
- 현재 이미지 프롬프트: ${slide.imagePrompt || ''}
${projectContext ? `- 전체 프로젝트 주제: ${projectContext.topic} (${projectContext.category || ''})` : ''}

[개선 목표]
${targetGuide.desc}

[작성 가이드라인]
${targetGuide.toneGuide}
`;

    const response = await generateContentWithFallback(ai, {
      contents: prompt,
      config: {
        temperature: 0.7,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING, description: '개선된 헤드라인' },
            body: { type: Type.STRING, description: '개선된 본문 (줄바꿈 포함)' },
            highlightWords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '핵심 강조 키워드 1~3개',
            },
            imagePrompt: {
              type: Type.STRING,
              description: '자연스러운 한국어 서술형 이미지 생성 프롬프트',
            },
            imagePromptKorean: {
              type: Type.STRING,
              description: '비주얼 연출 의도 (한국어)',
            },
            imageStyleKeywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '100% 한국어 스타일 키워드 2~3개 (예: 고화질 포토, 미니멀, 자연광)',
            },
          },
          required: ['headline', 'body', 'highlightWords', 'imagePrompt', 'imagePromptKorean', 'imageStyleKeywords'],
        },
      },
    });

    const text = response?.text;
    if (!text) {
      return res.status(200).json(generateLocalFallback(slide, action));
    }

    const updatedData = JSON.parse(text);
    const finalStyleKeywords = sanitizeKeywordsToKorean(
      action === 'new_image_prompt'
        ? updatedData.imageStyleKeywords
        : (slide.imageStyleKeywords && slide.imageStyleKeywords.length > 0
            ? slide.imageStyleKeywords
            : updatedData.imageStyleKeywords)
    );

    return res.status(200).json({
      ...slide,
      ...updatedData,
      imageStyleKeywords: finalStyleKeywords,
      imagePrompt: action === 'new_image_prompt' ? updatedData.imagePrompt : (slide.imagePrompt || updatedData.imagePrompt),
      imagePromptKorean: action === 'new_image_prompt' ? updatedData.imagePromptKorean : (slide.imagePromptKorean || updatedData.imagePromptKorean),
    });
  } catch (err: any) {
    console.error('Vercel refine-slide error:', err);
    return res.status(200).json(slide);
  }
}