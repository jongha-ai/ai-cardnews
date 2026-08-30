import { Type } from '@google/genai';
import { getGeminiClient, generateContentWithFallback } from './_gemini.js';
import { enrichSlidesWithRankedStockPhotos } from '../src/server/unsplashService.js';

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED', message: '허용되지 않은 HTTP 메소드입니다.' });
  }

  const bodyData = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const {
    topic = '',
    purpose = '정보 전달 및 독자 유입',
    targetAudience = '2030 직장인 및 대중',
    tone = '신뢰감 있고 명쾌한 어조',
    slideCount = 5,
    aspectRatio = '1:1',
    themeId = 'modern_blue',
    customNotes = '',
  } = bodyData;

  if (!topic || typeof topic !== 'string' || topic.trim() === '') {
    return res.status(400).json({
      error: 'INVALID_REQUEST',
      message: '주제(topic)를 입력해주세요.',
    });
  }

  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(500).json({
        error: 'GEMINI_CONFIG_ERROR',
        message: 'Gemini API 설정이 올바르지 않습니다. API 키를 확인해주세요.',
      });
    }

    const systemInstruction = `당신은 대한민국 최고의 소셜 미디어(인스타그램, 링크드인, 페이스북, 블라인드) 카드뉴스 전문 크리에이터이자 수석 비주얼 아트 디렉터, AI 이미지 프롬프트 엔지니어 및 카드뉴스 스톡 이미지 매칭 전문가입니다.

사용자의 [주제], [카테고리], [타겟 독자], [목적]의 맥락에 100% 최적화된 맞춤형 카드뉴스를 제작합니다.

[1. 텍스트 카피라이팅 가이드]
- 헤드라인(Headline): 시선을 1초 만에 사로잡는 강력한 후킹 카피. 모바일 가독성을 위해 적절한 줄바꿈(\\n)을 포함하세요.
- 본문(Body): 모바일 가독성 극대화 (2~3줄 내외, 불렛포인트 • 또는 1,2,3 번호 매기기 활용).
- 강조 단어(highlightWords): 독자의 시선이 머물 핵심 키워드 1~3개 선정.

[2. AI 이미지 생성용 한국어 서술형 프롬프트(imagePrompt) 생성 규칙 - ChatGPT / 제미나이 최적화]
모든 슬라이드의 imagePrompt는 챗GPT(DALL-E 3)와 제미나이(Imagen 3)에 바로 입력하여 사용할 수 있도록 **자연스러운 한국어 서술형 프롬프트**로 작성해야 합니다:
- 인물 및 국적 규칙: 인물 등장 시 반드시 '한국인 사장님', '한국인 20대 여성', '한국인 30대 남성 직장인', '친절한 한국인 바리스타', '한국인 크리에이터' 등 한국 국적과 자연스러운 이목구비를 명시하세요. (서양인 인물 및 이국적 분위기 절대 방지)
- 공간 및 배경 규칙: 국내 카페 카운터, 아늑한 한국 매장 인테리어, 정돈된 한국 오피스 데스크 등 친숙한 한국적 비즈니스 및 일상 환경으로 서술하세요.
- 스타일 및 비율: '자연스러운 표정과 조명, 고화질 실사 사진, ${aspectRatio} 비율'을 문장 끝에 명시하세요.
- 작성 예시: "따뜻한 원목 인테리어의 카페에서 노트북으로 SNS 마케팅 홍보 문구를 작성 중인 한국인 사장님, 자연스러운 표정과 조명, 고화질 실사 사진, ${aspectRatio} 비율"

[3. Unsplash 스톡 사진 검색 키워드(stockPhotoKeywords) 생성 가이드라인 - Physical Scene & Camera Realism Enforced]
Unsplash에서 실제 고화질 실사 사진으로 촬영되어 검색 가능한 3~7단어 영문 소문자 구(Phrase)로 primary_keyword와 secondary_keyword를 생성하세요.

1) 📸 Stock Photo Realism (카메라 촬영 가능성 원칙):
   - 검색어를 결정하기 전 반드시 자문하세요: "전문 사진작가가 카메라 렌즈로 이 물리적 장면을 직접 촬영할 수 있는가? (Can a photographer physically photograph this exact scene?)"
   - NO라면 카메라로 촬영 가능한 물리적 인물/실물/공간/행동 장면으로 즉시 변환하세요.
   - 추상적 개념 단어 단독 사용 절대 금지: 'productivity', 'energy savings', 'digital transformation', 'business growth', 'efficiency', 'marketing success', 'technology', 'tech', 'ai', 'abstract', 'code', 'chip', 'circuit', '3d' 등.

2) 🏗️ Physical Scene 필수 구조 패턴 (아래 4대 구조 중 택 1):
   - [구조 A] ACTOR + ACTION + OBJECT (예: "person cleaning air conditioner filter", "baker organizing fresh bread on shelf")
   - [구조 B] ACTOR + ACTION + PLACE (예: "office worker stretching neck at desk", "student studying with laptop in cafe")
   - [구조 C] OBJECT + ACTION/STATE (예: "hand unplugging power strip from wall", "freshly baked croissants on wooden tray")
   - [구조 D] ACTOR + OBJECT + PLACE (예: "shop owner checking refrigerator in store", "freelancer writing planner in home office")

3) 💻 디지털 도구 / 소프트웨어 / 브랜드명 변환 규칙:
   - Notion, ChatGPT, iPad, Goodnotes, CRM, SaaS 등 스톡사진에서 직접 찾기 어려운 디지털 개념은 브랜드명을 억지로 검색하지 말고 실제 물리적 사용 장면으로 변환하세요.
     - "노션 템플릿/생산성 루틴" -> "person planning tasks on laptop desk", "clean workspace with laptop and notebook"
     - "아이패드/굿노트 다이어리" -> "person writing with stylus on tablet desk", "hands journaling on digital tablet"
     - "마케팅 자동화/대시보드" -> "business person analyzing charts on laptop", "tablet screen with analytics graph"
   - 주의: 디지털 주제에 대해 'poster design creative desk', 'store flyer marketing' 같은 엉뚱한 인쇄물/포스터 키워드를 자동 매핑하지 마세요.

4) 🏃‍♂️ Action(행동) 우선 반영 규칙:
   - 슬라이드 본문에 구체적인 행동(청소, 스트레칭, 플러그 뽑기, 점검, 글쓰기, 조리 등)이 언급되어 있다면 단순 장소('cafe', 'office')만 검색하지 말고 반드시 그 행동('cleaning filter', 'stretching at desk', 'unplugging cable')을 검색어에 포함하세요.

5) 🎯 Primary vs Secondary 역할 분리:
   - primary_keyword: 가장 구체적인 실제 장면 (3~7단어, 예: "office worker stretching neck at desk")
   - secondary_keyword: 동일한 의미와 대상을 유지하되 Unsplash 검색 성공률을 높인 정제/단순화된 장면 (3~5단어, 예: "person doing desk stretch")
   - 주의: Secondary가 Primary와 전혀 다른 이질적인 장면(예: Primary가 에어컨 청소인데 Secondary가 카페 인테리어)이 되어서는 절대 안 됩니다.

6) 📏 형식 규칙:
   - 3~7개 영문 소문자 단어로 구성.
   - 해시태그(#), 특수문자, 마케팅 카피 문장, 마침표 일체 금지.

[4. 인스타그램 4단 고전환 캡션(caption) 생성 가이드라인 - 도달률 & 저장 전환 극대화]
인스타그램 업로드 시 도달률(SEO), 체류 시간, 저장/공유 전환율을 극대화할 수 있도록 아래 4대 필수 구조를 엄격히 지켜 완성된 한국어 캡션(caption) 텍스트를 작성하세요:

1) ⚡ 1~2초 훅킹 & 공감 도입부 (더보기 누르기 전 첫 2줄)
   - 독자의 문제 상황이나 페인포인트를 찌르는 공감 질문형 문장 + 이모지
2) 📌 카드뉴스 핵심 요약 & 실무 꿀팁 (본문)
   - 카드뉴스 각 장의 핵심 내용을 깔끔한 이모지 넘버링(1️⃣, 2️⃣, 3️⃣, 4️⃣, 5️⃣)으로 정리
   - 단순 요약을 넘어 독자가 바로 써먹을 수 있는 '👉 한 줄 실전 팁'을 덧붙여 정보 가치 극대화
3) 📢 행동 유도 (저장 / 공유 / 댓글 CTA)
   - 💡 핵심 결론 및 인사이트
   - 📌 내일 바로 적용해보실 분은 미리 [저장]해두세요!
   - 💬 주변에 꼭 필요한 동료/지인에게 [공유]로 알려주세요!
4) 🏷️ 타깃 최적화 해시태그 (10~15개)
   - [대형 키워드 3개] + [타깃/업종 키워드 5개] + [행동/트렌드 키워드 4개] 조합

총 슬라이드 수는 정확히 ${slideCount}장이어야 합니다.
슬라이드 1은 'cover'(표지), 마지막 슬라이드는 'cta' 또는 'summary'로 구성하세요.`;

    const userPrompt = `
[카드뉴스 및 인스타그램 캡션 생성 요청]
- 주제: "${topic}"
- 목적: ${purpose}
- 타겟 독자: ${targetAudience}
- 톤앤매너: ${tone}
- 총 슬라이드 수: ${slideCount}장
- 화면 비율: ${aspectRatio}
- 테마 스타일: ${themeId}
${customNotes ? `- 추가 참고사항/원본 텍스트: ${customNotes}` : ""}

위 주제의 도메인에 딱 맞는 ChatGPT/제미나이 최적화 한국어 이미지 프롬프트(한국인 인물 명시), 매력적인 한국어 카피라이팅, 그리고 인스타그램 4단 고전환 본문 캡션(caption)까지 완벽히 포함된 카드뉴스 JSON을 완성해주세요.`;

    const response = await generateContentWithFallback(ai, {
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "카드뉴스 전체 대표 제목" },
            subTitle: { type: Type.STRING, description: "카드뉴스 부제목" },
            category: { type: Type.STRING, description: "카테고리명 (예: FINANCE, BEAUTY, FOOD, REAL ESTATE, PRODUCTIVITY, TECH)" },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "관련 해시태그 4~6개 (예: #카드뉴스, #주제키워드)",
            },
            caption: {
              type: Type.STRING,
              description: "인스타그램 4단 고전환 캡션 전문 (1~2초 훅킹 공감 질문, 1️⃣2️⃣3️⃣ 넘버링 핵심 요약 & 👉 실전 팁, 저장/공유/댓글 CTA, 10~15개 타깃 해시태그 포함)",
            },
            slides: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  slideNumber: { type: Type.INTEGER, description: "슬라이드 순번 (1부터 시작)" },
                  slideType: {
                    type: Type.STRING,
                    description: "슬라이드 종류: cover, problem, body, stat, tip, quote, summary, cta",
                  },
                  badgeText: { type: Type.STRING, description: "상단 뱃지 텍스트 (예: COVER, POINT 01, TIP, CHECK)" },
                  headline: { type: Type.STRING, description: "슬라이드 헤드라인 (줄바꿈 \\n 포함 권장)" },
                  body: { type: Type.STRING, description: "슬라이드 본문 텍스트 (모바일 가독성 높은 2~4문장)" },
                  highlightWords: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "본문이나 헤드라인 중 강조할 핵심 키워드 1~3개",
                  },
                  imagePrompt: {
                    type: Type.STRING,
                    description: "ChatGPT/제미나이 최적화 자연스러운 100% 한국어 서술형 이미지 생성 프롬프트 (한국인 인물 명시, 국내 배경, 고화질 실사, 비율 포함)",
                  },
                  imagePromptKorean: {
                    type: Type.STRING,
                    description: "이미지 프롬프트의 한국어 해석 및 비주얼 연출 의도",
                  },
                  imageStyleKeywords: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "카드 상단 뱃지에 표시될 100% 한국어 스타일 키워드 2~3개 (예: 고화질 포토, 미니멀, 자연광). 영문 사용 금지.",
                  },
                  stockPhotoKeywords: {
                    type: Type.OBJECT,
                    properties: {
                      primary_keyword: { type: Type.STRING, description: "Unsplash 검색용 구체적 1순위 영문 키워드 구문 (2~4단어)" },
                      secondary_keyword: { type: Type.STRING, description: "Unsplash 검색용 대체 2순위 영문 키워드 구문 (2~4단어)" },
                    },
                    required: ["primary_keyword", "secondary_keyword"],
                  },
                  suggestedLayout: {
                    type: Type.STRING,
                    description: "split_top_text, split_top_image, full_bg_overlay, stat_highlight, quote_focus 중 택1",
                  },
                },
                required: [
                  "slideNumber",
                  "slideType",
                  "badgeText",
                  "headline",
                  "body",
                  "highlightWords",
                  "imagePrompt",
                  "imagePromptKorean",
                  "imageStyleKeywords",
                  "stockPhotoKeywords",
                  "suggestedLayout",
                ],
              },
            },
          },
          required: ["title", "subTitle", "category", "tags", "caption", "slides"],
        },
      },
    });

    const text = response?.text;
    if (!text) {
      return res.status(502).json({
        error: 'EMPTY_AI_RESPONSE',
        message: 'AI로부터 응답을 받지 못했습니다. 잠시 후 다시 시도해주세요.',
      });
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(text);
    } catch (parseErr: any) {
      console.error('Failed to parse Gemini JSON response:', text);
      return res.status(502).json({
        error: 'MALFORMED_AI_RESPONSE',
        message: 'AI 응답 형식이 올바르지 않습니다. 다시 시도해주세요.',
      });
    }

    if (!parsedData || !Array.isArray(parsedData.slides) || parsedData.slides.length === 0) {
      return res.status(502).json({
        error: 'INVALID_SLIDES_SCHEMA',
        message: '생성된 슬라이드 데이터가 올바르지 않습니다. 다시 시도해주세요.',
      });
    }

    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY || process.env.UNSPLASH_KEY || '';

    // Default basic slide normalization without fallback keyword contamination
    let enrichedSlides = parsedData.slides.map((s: any, idx: number) => {
      const keywords = s.stockPhotoKeywords?.primary_keyword
        ? s.stockPhotoKeywords
        : undefined;

      return {
        ...s,
        id: `slide-${Date.now()}-${idx}`,
        stockPhotoKeywords: keywords,
        imageUrl: undefined,
        stockPhotoId: undefined,
        stockPhotoAttribution: undefined,
      };
    });

    // Best-effort sequential Live Unsplash enrichment
    if (unsplashKey && unsplashKey.trim()) {
      try {
        enrichedSlides = await enrichSlidesWithRankedStockPhotos(
          enrichedSlides,
          aspectRatio || '1:1',
          unsplashKey
        );
      } catch (stockErr: any) {
        console.warn('[Vercel generate-cardnews] Stock photo enrichment failed gracefully:', stockErr.message);
      }
    }

    return res.status(200).json({
      ...parsedData,
      slides: enrichedSlides,
    });
  } catch (err: any) {
    console.error('Vercel API generate-cardnews error:', err?.message || err);
    const is429 =
      err?.status === 429 ||
      err?.message?.includes('429') ||
      err?.message?.includes('RESOURCE_EXHAUSTED');

    if (is429) {
      return res.status(429).json({
        error: 'GEMINI_RATE_LIMIT_EXCEEDED',
        message: 'AI 요청 한도를 일시적으로 초과했습니다. 약 1분 후 다시 시도해주세요.',
        retryable: true,
      });
    }

    return res.status(500).json({
      error: 'CARDNEWS_GENERATION_FAILED',
      message: '카드뉴스 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    });
  }
}