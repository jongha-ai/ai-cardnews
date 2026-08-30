import { Type } from '@google/genai';
import { getGeminiClient, generateContentWithFallback } from './_gemini.js';

const ALLOWED_SLIDE_TYPES = ['cover', 'problem', 'body', 'stat', 'tip', 'quote', 'summary', 'cta'] as const;

const COMMON_PARTICLES = ['만에', '부터', '까지', '으로', '에서', '에게', '처럼', '보다', '하고', '하며', '하여', '이나', '이라', '이란', '에는', '에도', '은', '는', '이', '가', '을', '를', '의', '에', '도', '만', '로', '와', '과'];

function cleanParticle(unit: string): string {
  if (!unit) return '';
  let cleaned = unit;
  for (const particle of COMMON_PARTICLES) {
    if (cleaned.length > particle.length && cleaned.endsWith(particle)) {
      cleaned = cleaned.slice(0, -particle.length);
      break;
    }
  }
  return cleaned;
}

/**
 * Extracts numeric expressions (number + unit/affix) from text with strict structural validation.
 *
 * Structural rules:
 * - "슬라이드 1" ~ "슬라이드 N" (1 <= num <= slideCount)
 * - "슬라이드 #1" ~ "슬라이드 #N" (1 <= num <= slideCount)
 * - "총 N장", "N장의 슬라이드" (num === slideCount)
 * - Standalone "#1", "#2" are strictly NOT structural.
 */
function extractNumericExpressions(text: string, options: { slideCount?: number } = {}): Array<{ raw: string; normalized: string; isStructural: boolean }> {
  if (!text || typeof text !== 'string') return [];

  const slideCount = options.slideCount || 0;
  const results: Array<{ raw: string; normalized: string; isStructural: boolean }> = [];

  // 1. Identify and mask strict structural references (NO standalone #N)
  let workingText = text;
  const structuralRegex = /(?:슬라이드\s*#?\s*(\d+)|총\s*(\d+)\s*장|(\d+)\s*장의?\s*슬라이드)/g;
  let structMatch: RegExpExecArray | null;

  while ((structMatch = structuralRegex.exec(text)) !== null) {
    const slideRefNum = structMatch[1] ? Number(structMatch[1]) : null;
    const totalCountRefNum = (structMatch[2] || structMatch[3]) ? Number(structMatch[2] || structMatch[3]) : null;

    let isStrictlyValidStructure = false;
    if (slideRefNum !== null && slideRefNum >= 1 && slideRefNum <= slideCount) {
      isStrictlyValidStructure = true;
    } else if (totalCountRefNum !== null && totalCountRefNum === slideCount) {
      isStrictlyValidStructure = true;
    }

    if (isStrictlyValidStructure) {
      results.push({
        raw: structMatch[0],
        normalized: structMatch[0].replace(/\s+/g, ''),
        isStructural: true,
      });
      workingText = workingText.replace(structMatch[0], ' [STRUCT] ');
    }
  }

  // 2. Extract numeric expressions: Number (or Range) + optional Unit/Suffix
  const numericRegex = /(\d+(?:\.\d+)?(?:\s*[\~–\-]\s*\d+(?:\.\d+)?)?)\s*([%가-힣a-zA-Z]+)?/g;
  let match: RegExpExecArray | null;

  while ((match = numericRegex.exec(workingText)) !== null) {
    const rawNum = match[1].replace(/\s+/g, '');
    const rawUnit = match[2] || '';
    const cleanedUnit = cleanParticle(rawUnit);

    const fullNormalized = (rawNum + cleanedUnit).trim();
    if (fullNormalized) {
      results.push({
        raw: match[0].trim(),
        normalized: fullNormalized,
        isStructural: false,
      });
    }
  }

  return results;
}

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
  const { topic = '', purpose = '', targetAudience = '', tone = '', slides = [] } = bodyData;

  if (!Array.isArray(slides) || slides.length === 0) {
    return res.status(400).json({ error: '분석할 슬라이드 목록이 필요합니다.' });
  }

  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(401).json({
        error: 'Gemini API 키가 설정되지 않았습니다. 환경변수(GEMINI_API_KEY)를 확인해주세요.',
      });
    }

    // Format current slides overview for Gemini prompt
    const slidesOverview = slides.map((s: any, i: number) => `
[슬라이드 #${s.slideNumber || (i + 1)}] (ID: ${s.id})
- 현재 역할(Type): ${s.slideType || 'body'}
- 현재 뱃지(Badge): ${s.badgeText || ''}
- 현재 헤드라인: ${s.headline || ''}
- 현재 본문: ${s.body || ''}
- 현재 강조단어: ${(s.highlightWords || []).join(', ')}
`).join('\n');

    const systemInstruction = `당신은 대한민국 최고 수준의 SNS 카드뉴스 전문 스토리 디렉터(Story Director)입니다.
주어진 카드뉴스 전체 슬라이드(${slides.length}장)를 통째로 분석하여, 독자가 이탈하지 않고 끝까지 넘겨보며 저장/공유하게 만드는 완벽한 '스토리텔링 흐름'으로 다듬어주세요.

[절대 불변 규칙 - 엄격 준수]
1. 슬라이드 개수와 순서 엄수: 반드시 입력된 ${slides.length}장의 슬라이드 그대로 정확히 ${slides.length}개의 suggestions를 반환해야 합니다. 추가/삭제 절대 불가.
2. ID 및 slideNumber 엄수: 각 suggestion의 id와 slideNumber는 입력받은 슬라이드의 id, slideNumber와 100% 동일하게 일치해야 합니다.
3. 【사실정보 및 의미 보존 원칙 (Semantic Preservation)】:
   - Story Director는 팩트체커가 아니며, 원본 슬라이드와 프로젝트 입력에 제공된 사실정보는 사용자의 확정 데이터입니다.
   - [새로운 의미적 사실 생성 절대 금지]: 원본에 없는 다음 항목을 근거 없이 새로 추가하거나 지어내지 마세요:
     * 타깃 고객 (예: 원본에 '마케터'가 없으면 '초보 마케터', '전문 마케터' 등 가공 타깃 생성 금지)
     * 고객의 문제/고충 (예: 원본에 '전환율이 낮다'는 내용이 없으면 '낮은 전환율 때문에 고민' 등 가공 문제 생성 금지)
     * 제품 기능 및 서비스 범위 (예: 'AIWORKS가 제공하는 전략', 'AIWORKS 기능으로 해결', '템플릿', '자동화' 등 제품 능력/기능 추론 금지)
     * 인과관계, 사용 효과, 구매 욕구 자극, 성과 주장
     * 성과 보장 또는 약속 (예: 원본의 "매출 200% 올리는 비법"을 "매출 200%를 경험하세요", "보장합니다" 등으로 성과 약속/강조로 변형 금지)
   - [기존 사실·수치·의미의 강도 100% 보존]: 원본에 이미 존재하는 회사명, 제품명, 서비스명, 고유명사, 숫자, 통계, 성과 수치(예: "매출 200%", "10초 만에" 등)는 그 수치와 의미, 표현 강도를 그대로 유지하세요.
     * 허용: "AIWORKS로 매출 200% 올리는 카드뉴스, 핵심 제작 비법", "10초 만에 완성하는 실전 방법"
     * 금지: "매출 200%를 경험하세요" (성과 약속으로 변경 금지)
     * 금지: "매출 대폭 증가" (숫자 누락 금지)
     * 금지: "매출 300% 증가" (수치 조작 금지)
   - [새로운 숫자 및 단위 생성 절대 금지]: 원본 슬라이드와 프로젝트 입력에 명시되지 않은 어떠한 새로운 숫자나 시간/통계 단위(예: '10분', '1년', '30%', '5가지' 등)도 진단 요약, 전략, 제안 카피 등에 새로 만들어 넣지 마세요.
   - [원문의 원인/문제/해결책 관계 엄수 (의미 반전 절대 금지)]: 원문의 인과관계와 문제-해결책 관계를 뒤집거나 재해석하지 않는다. (예: 원문에서 '선저축 후지출'이 해결책이고 '지출 후 저축'이 실패 원인이면, '선저축 후지출 실패'처럼 의미와 인과관계를 반대로 뒤집어 표현하지 말 것).
4. 【CTA 행동 엄수 및 환각 방지】:
   - CTA 슬라이드는 원본에 명시된 행동(예: [저장], [공유] 등)만 유지하세요. 원본에 없는 '홈페이지 방문', '상담 신청', '구매', '다운로드', '팔로우', '더 많은 팁 확인' 등을 임의로 추가하지 마세요.
5. 【정보 부족 처리 (창작 금지)】:
   - 원본 내용만으로 특정 슬라이드를 충분히 차별화하기에 정보가 부족하다면, AI가 내용을 허구로 지어내지 마세요.
   - 원본의 텍스트 범위 내에서만 정돈하고, 해당 suggestion의 changeReason에 "원본 정보가 부족하여 추가적인 구체 정보가 필요합니다."를 명시하세요.
6. 【Story Director의 허용 작업 범위】:
   - 문장 길이 및 줄바꿈 조정, 문장 순서 정돈, 질문형/서술형 표현 다듬기, 슬라이드 간 연결 문맥(브릿지) 매끄럽게 잇기, 카드별 역할 재정의(cover, problem, body, stat, tip, quote, summary, cta), 중복 표현 제거에 한정됩니다.
   - 역할(suggestedRole)은 오직 'cover', 'problem', 'body', 'stat', 'tip', 'quote', 'summary', 'cta' 8가지 중에서만 지정하세요.
   - 모바일 가독성을 위해 헤드라인은 강렬한 1~2줄, 본문은 2~3문장의 명확한 어조로 다듬으세요.`;

    const prompt = `[카드뉴스 프로젝트 정보]
- 주제: ${topic || '미지정'}
- 목적: ${purpose || '정보 전달 및 공유 유도'}
- 타깃 독자: ${targetAudience || '대중'}
- 톤앤매너: ${tone || '전문적이고 친근한 톤'}
- 전체 슬라이드 수: ${slides.length}장

[현재 슬라이드 내용]
${slidesOverview}

위 슬라이드 전체를 분석하여, 다음 JSON 구조에 맞춰 스토리 진단 및 슬라이드별 개선안을 완성해주세요.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        overallSummary: {
          type: Type.STRING,
          description: '전체 카드뉴스 스토리 진단 요약 (어떤 흐름으로 개선했는지 2~3문장)',
        },
        duplicateIssues: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: '발견된 슬라이드 간 내용/헤드라인 중복 문제점 리스트',
        },
        flowIssues: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: '흐름 단절 또는 이탈 유발 지점 분석 리스트',
        },
        ctaIssue: {
          type: Type.STRING,
          description: '마지막 장 CTA 연결 및 전환 유도 진단',
        },
        storyStrategy: {
          type: Type.STRING,
          description: '적용된 핵심 스토리텔링 전략 요약 (예: 문제공감 ➔ 핵심원인 ➔ 실천솔루션 ➔ 저장CTA)',
        },
        suggestions: {
          type: Type.ARRAY,
          description: `입력받은 ${slides.length}장의 슬라이드별 1:1 개선안 (반드시 ${slides.length}개)`,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: '원본 슬라이드 ID' },
              slideNumber: { type: Type.INTEGER, description: '슬라이드 순번 (1부터 시작)' },
              originalRole: { type: Type.STRING, description: '기존 슬라이드 역할 (cover/problem/body/stat/tip/quote/summary/cta)' },
              suggestedRole: { type: Type.STRING, description: '개선된 슬라이드 역할 (cover/problem/body/stat/tip/quote/summary/cta)' },
              badgeText: { type: Type.STRING, description: '상단 뱃지 텍스트 (예: COVER, 문제인식, 핵심솔루션, 실천TIP, CTA)' },
              headline: { type: Type.STRING, description: '개선된 헤드라인 문구 (줄바꿈 \\n 가능, 최대 2줄)' },
              body: { type: Type.STRING, description: '개선된 본문 텍스트 (2~3문장, 모바일 최적화)' },
              highlightWords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '본문에서 강조할 2~4개 핵심 단어',
              },
              changeReason: { type: Type.STRING, description: '이 슬라이드의 역할을 재정의하고 문구를 수정한 구체적인 이유' },
            },
            required: [
              'id',
              'slideNumber',
              'originalRole',
              'suggestedRole',
              'badgeText',
              'headline',
              'body',
              'highlightWords',
              'changeReason',
            ],
          },
        },
      },
      required: [
        'overallSummary',
        'duplicateIssues',
        'flowIssues',
        'ctaIssue',
        'storyStrategy',
        'suggestions',
      ],
    };

    const response = await generateContentWithFallback(ai, {
      contents: prompt,
      models: [
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-1.5-pro',
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0.7,
      },
    });

    const rawText = response.text || '';
    if (!rawText.trim()) {
      return res.status(502).json({ error: 'AI 서비스로부터 응답을 받지 못했습니다.' });
    }

    let parsedResult: any = null;
    try {
      parsedResult = JSON.parse(rawText);
    } catch (parseErr: any) {
      console.error('Story Director JSON parsing error:', parseErr);
      return res.status(502).json({ error: 'AI 응답 데이터(JSON) 형식이 올바르지 않습니다.' });
    }

    // Strict Validation: Check suggestions count
    if (
      !parsedResult ||
      !Array.isArray(parsedResult.suggestions) ||
      parsedResult.suggestions.length !== slides.length
    ) {
      return res.status(502).json({
        error: `슬라이드 개수 불일치 오류: 원본(${slides.length}장)과 분석 결과(${parsedResult?.suggestions?.length || 0}장)가 일치하지 않습니다.`,
      });
    }

    // Strict Validation: Check 1:1 ID and slideNumber matching
    for (let i = 0; i < slides.length; i++) {
      const orig = slides[i];
      const sugg = parsedResult.suggestions[i];

      if (!sugg || sugg.id !== orig.id || Number(sugg.slideNumber) !== Number(orig.slideNumber || (i + 1))) {
        return res.status(502).json({
          error: `슬라이드 식별자 불일치 오류: ${i + 1}번째 슬라이드 ID(${orig.id})가 분석 결과(${sugg?.id})와 일치하지 않습니다.`,
        });
      }

      if (!ALLOWED_SLIDE_TYPES.includes(sugg.suggestedRole)) {
        return res.status(502).json({
          error: `유효하지 않은 슬라이드 역할 오류: ${i + 1}번째 슬라이드의 제안 역할(${sugg.suggestedRole})이 올바르지 않습니다.`,
        });
      }

      if (!sugg.headline || typeof sugg.headline !== 'string' || !sugg.body || typeof sugg.body !== 'string') {
        return res.status(502).json({
          error: `슬라이드 필수 문구 누락 오류: ${i + 1}번째 슬라이드의 헤드라인 또는 본문이 비어 있습니다.`,
        });
      }
    }

    // Strict Validation: Numeric Expression (Number + Unit) Check
    const slideCount = slides.length;
    const allowedNumericExpressions = new Set<string>();

    // 1. Extract approved numeric expressions from metadata
    [topic, purpose, targetAudience, tone].forEach((txt) => {
      extractNumericExpressions(txt, { slideCount }).forEach((exp) => {
        allowedNumericExpressions.add(exp.normalized);
      });
    });

    // 2. Extract approved numeric expressions from original slides
    slides.forEach((s: any) => {
      [s.headline, s.body, s.badgeText, ...(Array.isArray(s.highlightWords) ? s.highlightWords : [])].forEach((txt) => {
        extractNumericExpressions(txt, { slideCount }).forEach((exp) => {
          allowedNumericExpressions.add(exp.normalized);
        });
      });
    });

    // 3. Extract all numeric expressions from AI response
    const outputTexts: string[] = [];
    if (parsedResult.overallSummary) outputTexts.push(parsedResult.overallSummary);
    if (Array.isArray(parsedResult.duplicateIssues)) outputTexts.push(...parsedResult.duplicateIssues);
    if (Array.isArray(parsedResult.flowIssues)) outputTexts.push(...parsedResult.flowIssues);
    if (parsedResult.ctaIssue) outputTexts.push(parsedResult.ctaIssue);
    if (parsedResult.storyStrategy) outputTexts.push(parsedResult.storyStrategy);

    parsedResult.suggestions.forEach((sugg: any) => {
      if (sugg.badgeText) outputTexts.push(sugg.badgeText);
      if (sugg.headline) outputTexts.push(sugg.headline);
      if (sugg.body) outputTexts.push(sugg.body);
      if (Array.isArray(sugg.highlightWords)) outputTexts.push(...sugg.highlightWords);
      if (sugg.changeReason) outputTexts.push(sugg.changeReason);
    });

    // 4. Verify that each non-structural numeric expression exists in the allowed set
    for (const txt of outputTexts) {
      const expressions = extractNumericExpressions(txt, { slideCount });
      for (const exp of expressions) {
        if (exp.isStructural) {
          // Explicit structural reference (e.g. "슬라이드 1", "총 5장") is approved
          continue;
        }
        if (!allowedNumericExpressions.has(exp.normalized)) {
          console.error(`[Story Director] Numeric expression hallucination detected: unapproved expression "${exp.normalized}" (raw: "${exp.raw}") found in AI response. Allowed: [${Array.from(allowedNumericExpressions).join(', ')}]`);
          return res.status(502).json({
            error: 'AI 스토리 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
          });
        }
      }
    }

    return res.status(200).json(parsedResult);
  } catch (error: any) {
    console.error('Story Director API error:', error);
    return res.status(500).json({
      error: 'AI 스토리 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    });
  }
}
