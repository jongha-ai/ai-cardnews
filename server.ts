import express, { Request, Response } from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));

// CORS middleware for Vercel & cross-origin support
app.use((_req: Request, res: Response, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (_req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Lazy initialize GoogleGenAI client (supports GEMINI_API_KEY, VITE_GEMINI_API_KEY, GOOGLE_API_KEY)
function getGeminiClient(): GoogleGenAI | null {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_KEY;
  if (!apiKey || apiKey.trim() === "") {
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

// Resilient Gemini generateContent helper with automatic model fallback
async function generateContentWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
    models?: string[];
  }
): Promise<any> {
  const candidateModels = params.models || [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
  ];

  let lastError: any = null;

  for (const modelName of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: params.contents,
        config: params.config,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const isUnavailableOrRateLimited =
        err?.status === 503 ||
        err?.status === 429 ||
        err?.message?.includes("503") ||
        err?.message?.includes("429") ||
        err?.message?.includes("high demand") ||
        err?.message?.includes("UNAVAILABLE") ||
        err?.message?.includes("RESOURCE_EXHAUSTED");

      if (isUnavailableOrRateLimited) {
        console.warn(`Model ${modelName} unavailable or rate-limited (${err.message}). Trying next fallback model...`);
        continue;
      }
      console.warn(`Model ${modelName} call failed: ${err.message}. Retrying with next model...`);
    }
  }

  throw lastError || new Error("All Gemini models failed to respond.");
}

import { extractStockKeywords, buildDynamicStockPhotoUrl } from "./src/utils/photoMatcher";

// Health check (supports both /api/health and /health)
app.get(["/api/health", "/health"], (_req: Request, res: Response) => {
  const hasKey = !!(
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY
  );
  res.json({ status: "ok", hasApiKey: hasKey });
});

// Card News Generation API (supports both /api/generate-cardnews and /generate-cardnews)
app.post(["/api/generate-cardnews", "/generate-cardnews"], async (req: Request, res: Response) => {
  try {
    const {
      topic,
      purpose = "정보 전달 및 독자 유입",
      targetAudience = "2030 직장인 및 대중",
      tone = "신뢰감 있고 명쾌한 어조",
      slideCount = 5,
      aspectRatio = "1:1",
      themeId = "modern_blue",
      customNotes = "",
    } = req.body;

    if (!topic || typeof topic !== "string" || topic.trim() === "") {
      return res.status(400).json({ error: "주제(topic)를 입력해주세요." });
    }

    const ai = getGeminiClient();

    if (!ai) {
      // Fallback demo generation matching topic
      const count = Number(slideCount) || 5;
      const cleanTopic = topic.replace(/[^\w\s가-힣]/g, '').trim();
      const demoResponse = {
        title: `${topic} 완벽 가이드`,
        subTitle: `누구나 쉽게 이해하고 바로 실천하는 ${topic} 핵심 요약`,
        category: "LIFESTYLE & INSIGHT",
        tags: ["#카드뉴스", `#${cleanTopic.replace(/\s+/g, '')}`, "#실전팁", "#비즈니스", "#성장노하우"],
        caption: `${cleanTopic}, 아직도 혼자 고민하며 시간 낭비하고 계셨나요? ⏳

바쁜 분들을 위해 당장 써먹을 수 있는 ${count}단계 핵심 실천 가이드를 정리했습니다!
━━━━━━━━━━━━━━━
1️⃣ ${cleanTopic} 기본 원리 점검
👉 문제의 원인을 먼저 파악하고 불필요한 시행착오를 줄이세요.

2️⃣ 실전 적용 노하우
👉 단계별 체크리스트를 따라 매일 10분씩 작은 습관으로 만드세요.

3️⃣ 지속 가능한 시스템 구축
👉 한 번의 실행으로 끝나지 않도록 자동화 루틴을 완성하세요.
━━━━━━━━━━━━━━━
💡 핵심은 '이해'가 아니라 '즉시 실행'입니다.

📌 나중에 다시 보며 적용하려면 지금 [저장]해두세요!
💬 주변에 꼭 필요한 분들께 [공유]로 알려주세요!
🙋‍♂️ 가장 먼저 실천해보고 싶은 단계는 무엇인가요? 댓글로 남겨주세요!

#${cleanTopic.replace(/\s+/g, '')} #카드뉴스 #실전팁 #성장루틴 #노하우 #비즈니스 #자기계발 #인사이트 #생산성 #필수템 #트렌드`,
        slides: Array.from({ length: count }).map((_, idx) => {
          const headline = idx === 0 ? `✨ ${topic}\n지금 꼭 알아야 할 핵심 포인트` : `${idx}단계: ${topic} 핵심 실천 전략`;
          const body = `이 단계에서는 ${topic}와 관련된 가장 효과적인 실천 방법 및 핵심 지식을 전달합니다.\n2~3문장으로 간결하게 구성하여 모바일에서 한눈에 쏙 들어옵니다.`;
          const keywords = extractStockKeywords({
            headline,
            body,
            slideNumber: idx + 1,
          });
          const photoUrl = buildDynamicStockPhotoUrl(keywords.primary_keyword, idx + 1);
          return {
            slideNumber: idx + 1,
            slideType: idx === 0 ? "cover" : idx === count - 1 ? "cta" : "body",
            badgeText: idx === 0 ? "GUIDE" : `POINT 0${idx}`,
            headline: idx === 0 ? `✨ ${topic}\n지금 꼭 알아야 할 핵심 포인트` : `${idx}단계: ${topic} 핵심 실천 전략`,
            body: `이 단계에서는 ${topic}와 관련된 가장 효과적인 실천 방법 및 핵심 지식을 전달합니다.\n2~3문장으로 간결하게 구성하여 모바일에서 한눈에 쏙 들어옵니다.`,
            highlightWords: [topic, "핵심 포인트"],
            imagePrompt: `밝고 정돈된 국내 비즈니스 공간에서 ${topic} 핵심 실천 전략을 점검 중인 30대 한국인 직장인, 자연스러운 표정과 부드러운 채광, 고화질 실사 사진, ${aspectRatio === '4:5' ? '4:5' : aspectRatio === '9:16' ? '9:16' : '1:1'} 비율`,
            imagePromptKorean: `${topic}의 핵심 메시지를 담은 친근하고 세련된 한국형 고화질 비주얼`,
            imageStyleKeywords: ["고화질 포토", "미니멀", "스튜디오 조명"],
            stockPhotoKeywords: keywords,
            suggestedLayout: "split_top_image",
            imageUrl: photoUrl,
          };
        }),
      };
      return res.json(demoResponse);
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
- 스타일 및 비율: '자연스러운 표정과 조명, 고화질 실사 사진, ${aspectRatio === '4:5' ? '4:5' : aspectRatio === '9:16' ? '9:16' : '1:1'} 비율'을 문장 끝에 명시하세요.
- 작성 예시: "따뜻한 원목 인테리어의 카페에서 노트북으로 SNS 마케팅 홍보 문구를 작성 중인 한국인 사장님, 자연스러운 표정과 조명, 고화질 실사 사진, ${aspectRatio === '4:5' ? '4:5' : aspectRatio === '9:16' ? '9:16' : '1:1'} 비율"

[3. Unsplash 스톡 사진 검색 키워드(stockPhotoKeywords) 추출 규칙 - 테마/카테고리명 배제 & 본문 직접 매칭]
각 슬라이드의 헤드라인과 본문(Headline + Body)의 구체적 행위/대상(인물, 매장, 스마트폰, 포스터 등)만을 바탕으로 Unsplash 검색 키워드를 생성합니다:
1) 테마/카테고리 기반 추상 키워드 절대 금지: 'technology', 'tech', 'ai', 'abstract', 'code', 'chip', 'circuit', '3d' 등 추상적 테크 단어는 일체 생성하지 마세요. (테크/AI 주제라도 실제 사람이 일하거나 소통하는 물리적 장면을 묘사)
2) 본문 내용 기반 구체적 물리적 실체 매핑:
   - "홍보물/포스터/배너/카드뉴스/광고/템플릿 제작" -> 'poster design creative desk', 'store flyer marketing'
   - "고객 응대/상담/챗봇/메시지/카톡/문의" -> 'friendly customer service mobile chat', 'smartphone messaging chat app'
   - "매출 성장/실전 전략/매장/가게/소상공인/점주" -> 'happy small business owner cafe', 'retail store checkout counter'
   - "숏폼/릴스/영상 제작/촬영/편집/유튜브" -> 'creator ring light filming setup', 'editing video smartphone screen'
   - "오디오/음악/로고송/목소리/팟캐스트" -> 'audio wave headphones desk', 'podcast microphone studio'
   - "데이터/대시보드/성과/분석/차트" -> 'business dashboard tablet screen', 'financial analytics charts graph'
3) 반드시 [대상/공간] + [구체적 행동/객체] + [무드]가 결합된 2~4단어 순수 영문 소문자 구(Phrase)로 primary_keyword와 secondary_keyword를 반환하세요.

[4. 인스타그램 4단 고전환 캡션(caption) 생성 가이드라인 - 도달률 & 저장 전환 극대화]
인스타그램 업로드 시 도달률(SEO), 체류 시간, 저장/공유 전환율을 극대화할 수 있도록 아래 4대 필수 구조를 엄격히 지켜 완성된 한국어 캡션(caption) 텍스트를 작성하세요:

1) ⚡ 1~2초 훅킹 & 공감 도입부 (더보기 누르기 전 첫 2줄)
   - 독자의 문제 상황이나 페인포인트를 찌르는 공감 질문형 문장 + 이모지
   - 예: "매장 마감하고 혼자 홍보글 쓰느라 1~2시간씩 버리고 계셨나요? ⏳\n\n바쁜 사장님들을 위한 3분 완성 실전 가이드를 공개합니다."
2) 📌 카드뉴스 핵심 요약 & 실무 꿀팁 (본문)
   - 카드뉴스 각 장의 핵심 내용을 깔끔한 이모지 넘버링(1️⃣, 2️⃣, 3️⃣, 4️⃣, 5️⃣)으로 정리
   - 단순 요약을 넘어 독자가 바로 써먹을 수 있는 '👉 한 줄 실전 팁'을 덧붙여 정보 가치 극대화
3) 📢 행동 유도 (저장 / 공유 / 댓글 CTA)
   - 💡 핵심 결론 및 인사이트
   - 📌 내일 바로 적용해보실 분은 미리 [저장]해두세요!
   - 💬 주변에 꼭 필요한 동료/지인에게 [공유]로 알려주세요!
   - 🙋‍♂️ 궁금한 점이나 적용해보고 싶은 팁은 댓글로 남겨주세요!
4) 🏷️ 타깃 최적화 해시태그 (10~15개)
   - [대형 키워드 3개] + [타깃/업종 키워드 5개] + [행동/트렌드 키워드 4개] 조합

[출력 예시]:
{공감_질문_훅킹문구} ⏳

{본문_도입_한줄}
━━━━━━━━━━━━━━━
1️⃣ {포인트 1 제목}
👉 {실전 적용 팁 / 핵심 설명}

2️⃣ {포인트 2 제목}
👉 {실전 적용 팁 / 핵심 설명}

3️⃣ {포인트 3 제목}
👉 {실전 적용 팁 / 핵심 설명}
━━━━━━━━━━━━━━━
💡 {핵심 결론 및 인사이트}

📌 나중에 다시 보며 적용하려면 지금 [저장]해두세요!
💬 주변에 필요한 사장님께 [공유]로 알려주세요.
🙋‍♂️ 가장 궁금한 점은 댓글로 남겨주시면 자세히 알려드릴게요!

#대형태그1 #대형태그2 #업종태그1 #업종태그2 #실전팁 #트렌드 #인사이트

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

    const text = response.text;
    if (!text) {
      throw new Error("Gemini API에서 빈 응답이 반환되었습니다.");
    }

    const parsedData = JSON.parse(text);

    // Map each slide strictly to a dynamic high-resolution photo based on its headline & body
    const enrichedSlides = parsedData.slides.map((s: any, idx: number) => {
      const keywords = s.stockPhotoKeywords?.primary_keyword
        ? s.stockPhotoKeywords
        : extractStockKeywords({
            headline: s.headline,
            body: s.body,
            slideNumber: idx + 1,
          });

      const highResPhotoUrl = buildDynamicStockPhotoUrl(keywords.primary_keyword, idx + 1);

      return {
        ...s,
        id: `slide-${Date.now()}-${idx}`,
        stockPhotoKeywords: keywords,
        imageUrl: highResPhotoUrl,
      };
    });

    res.json({
      ...parsedData,
      slides: enrichedSlides,
    });
  } catch (error: any) {
    console.error("Card News Generation Error:", error);
    try {
      const count = Number(req.body?.slideCount) || 5;
      const rawTopic = req.body?.topic || "핵심 가이드";
      const cleanTopic = rawTopic.replace(/[^\w\s가-힣]/g, '').trim() || "AI 카드뉴스";
      const fallbackResponse = {
        title: `${rawTopic}`,
        subTitle: req.body?.purpose || '지금 바로 실천 가능한 핵심 가이드',
        category: req.body?.themeId || "TREND",
        tags: ["#카드뉴스", `#${cleanTopic.replace(/\s+/g, '')}`, "#실전팁", "#인사이트"],
        caption: `${cleanTopic}, 아직도 혼자 고민하며 시간 낭비하고 계셨나요? ⏳\n\n바쁜 분들을 위한 ${count}단계 핵심 실천 가이드를 정리했습니다!\n━━━━━━━━━━━━━━━\n1️⃣ 기본 원리 점검\n👉 문제의 원인을 먼저 파악하고 불필요한 시행착오를 줄이세요.\n\n2️⃣ 실전 적용 노하우\n👉 단계별 체크리스트를 따라 매일 10분씩 작은 습관으로 만드세요.\n\n3️⃣ 지속 가능한 시스템 구축\n👉 한 번의 실행으로 끝나지 않도록 자동화 루틴을 완성하세요.\n━━━━━━━━━━━━━━━\n💡 핵심은 '즉시 실행'입니다.\n\n📌 나중에 다시 보며 적용하려면 지금 [저장]해두세요!\n💬 주변에 꼭 필요한 분들께 [공유]로 알려주세요!\n\n#${cleanTopic.replace(/\s+/g, '')} #카드뉴스 #실전팁 #성장루틴`,
        slides: Array.from({ length: count }).map((_, idx) => {
          const headline = idx === 0 ? `✨ ${cleanTopic}\n지금 꼭 알아야 할 핵심 포인트` : `${idx}단계: ${cleanTopic} 핵심 실천 전략`;
          const body = `이 단계에서는 ${cleanTopic}와 관련된 가장 효과적인 실천 방법 및 핵심 지식을 전달합니다.\n2~3문장으로 간결하게 구성하여 모바일에서 한눈에 쏙 들어옵니다.`;
          const keywords = extractStockKeywords({ headline, body, slideNumber: idx + 1 });
          const photoUrl = buildDynamicStockPhotoUrl(keywords.primary_keyword, idx + 1);
          return {
            slideNumber: idx + 1,
            slideType: idx === 0 ? "cover" : idx === count - 1 ? "cta" : "body",
            badgeText: idx === 0 ? "GUIDE" : `POINT 0${idx}`,
            headline,
            body,
            highlightWords: [cleanTopic, "핵심 포인트"],
            imagePrompt: `밝고 정돈된 국내 비즈니스 공간에서 ${cleanTopic} 핵심 전략을 점검 중인 30대 한국인 직장인, 자연스러운 표정과 부드러운 채광, 고화질 실사 사진, 1:1 비율`,
            imagePromptKorean: `${cleanTopic}의 핵심 메시지를 담은 세련된 한국형 고화질 비주얼`,
            imageStyleKeywords: ["고화질 포토", "미니멀", "스튜디오 조명"],
            stockPhotoKeywords: keywords,
            suggestedLayout: "split_top_image",
            imageUrl: photoUrl,
          };
        }),
      };
      return res.json(fallbackResponse);
    } catch {
      res.status(500).json({
        error: error.message || "카드뉴스 생성 중 오류가 발생했습니다.",
      });
    }
  }
});

// Hybrid AI Image Generation API: Gemini Prompt Enhancement + High-Resolution FLUX Engine
app.post(["/api/generate-image", "/generate-image"], async (req: Request, res: Response) => {
  try {
    const { prompt, aspectRatio = "1:1" } = req.body;
    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      return res.status(400).json({ error: "프롬프트(prompt)를 입력해주세요." });
    }

    // Clean initial prompt: remove Midjourney-style parameter flags
    const cleanPrompt = prompt
      .replace(/--ar\s+\d+:\d+/gi, "")
      .replace(/--v\s+\d+(\.\d+)?/gi, "")
      .replace(/--stylize\s+\d+/gi, "")
      .replace(/--q\s+\d+/gi, "")
      .replace(/--quality\s+\d+/gi, "")
      .trim();

    // 1. Enhance & Translate Prompt using Gemini AI (if available)
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
          enhancedPrompt = rawEnhanced
            .replace(/^["'`]|["'`]$/g, "")
            .replace(/--ar\s+\d+:\d+/gi, "")
            .replace(/--v\s+\d+(\.\d+)?/gi, "")
            .replace(/--stylize\s+\d+/gi, "")
            .replace(/--q\s+\d+/gi, "")
            .trim();
        }
      } catch (enhanceErr: any) {
        console.warn("Gemini prompt enhancement fallback (using original prompt):", enhanceErr?.message || enhanceErr);
      }
    }

    // 2. Map aspect ratio to pixel dimensions
    let width = 1024;
    let height = 1024;

    if (aspectRatio === "4:5") {
      width = 864;
      height = 1080;
    } else if (aspectRatio === "9:16") {
      width = 720;
      height = 1280;
    } else if (aspectRatio === "16:9") {
      width = 1280;
      height = 720;
    } else if (aspectRatio === "3:4") {
      width = 768;
      height = 1024;
    } else if (aspectRatio === "4:3") {
      width = 1024;
      height = 768;
    }

    // 3. Generate high-resolution FLUX image URL with random seed
    const seed = Math.floor(Math.random() * 100000000);
    const encodedEnhancedPrompt = encodeURIComponent(enhancedPrompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedEnhancedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=false&model=flux`;

    return res.json({
      imageUrl,
      source: "flux-enhanced",
      aspectRatio,
      enhancedPrompt,
      originalPrompt: prompt,
    });
  } catch (error: any) {
    console.error("Hybrid AI image generation error:", {
      message: error?.message,
      status: error?.status,
      stack: error?.stack,
    });
    res.status(500).json({
      error: error.message || "고화질 AI 이미지 생성 중 오류가 발생했습니다.",
    });
  }
});

// Slide Refine API
app.post(["/api/refine-slide", "/refine-slide"], async (req: Request, res: Response) => {
  try {
    const { slide, action, projectContext } = req.body;
    if (!slide || !action) {
      return res.status(400).json({ error: "슬라이드 정보와 동작을 제공해주세요." });
    }

    const ai = getGeminiClient();

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

    const generateLocalFallback = (slideData: any, refineAction: string) => {
      let headline = slideData.headline;
      let body = slideData.body;
      let highlightWords = [...(slideData.highlightWords || [])];
      let imagePrompt = slideData.imagePrompt;
      let imagePromptKorean = slideData.imagePromptKorean;
      let imageStyleKeywords = sanitizeKeywordsToKorean(slideData.imageStyleKeywords || ['트렌드', '핵심 포인트']);

      const cleanHeadline = headline.replace(/^🔥\s*|^\💡\s*|^\💼\s*|^\✨\s*|^\💰\s*/, '').trim();

      switch (refineAction) {
        case "more_punchy":
          headline = `🔥 ${cleanHeadline}\n놓치면 100% 손해보는 결정적 차이`;
          body = `남들과 똑같이 해서는 성과를 낼 수 없습니다.\n지금 당장 점검해야 할 핵심 1가지를 확인하세요.`;
          highlightWords = ["결정적 차이", "성과", "핵심 1가지"];
          break;
        case "more_professional":
          headline = `[전략 인사이트] ${cleanHeadline.replace(/\n/g, ' ')}`;
          body = `체계적인 프로세스와 실무 데이터 기반의 접근법이 필요합니다.\n단계별 실행 로드맵을 수립하여 효율성을 극대화하세요.`;
          highlightWords = ["프로세스", "실행 로드맵", "효율성 극대화"];
          break;
        case "shorter":
          const firstLine = cleanHeadline.split('\n')[0] || cleanHeadline;
          headline = firstLine;
          body = `• 핵심 1: 즉시 실행 가능한 포인트\n• 핵심 2: 놓치지 말아야 할 결과값`;
          highlightWords = ["핵심 1", "핵심 2"];
          break;
        case "rewrite_body":
          body = `1. 현황 진단: 현재의 병목 요인을 명확히 파악\n2. 즉시 실천: 5분 안에 실행 가능한 첫 단계\n3. 지속 루틴: 주간 단위 셀프 피드백 시스템 구축`;
          highlightWords = ["현황 진단", "즉시 실천", "지속 루틴"];
          break;
        case "new_image_prompt":
          imagePrompt = `따뜻하고 세련된 국내 비즈니스 공간에서 ${cleanHeadline} 전략을 구상 중인 30대 한국인 직장인, 자연스러운 조명과 온화한 표정, 고화질 실사 사진, 1:1 비율`;
          imagePromptKorean = "메시지의 핵심을 직관적으로 전달하는 감각적인 한국형 고화질 에디토리얼 포토그래피";
          imageStyleKeywords = ["에디토리얼", "자연광", "고화질 포토", "미니멀"];
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

    if (!ai) {
      const fallbackResult = generateLocalFallback(slide, action);
      return res.json(fallbackResult);
    }

    const actionPromptMap: Record<string, { desc: string; toneGuide: string }> = {
      more_punchy: {
        desc: "헤드라인을 스크롤을 멈추게 만드는 강렬한 호기심/후킹형 문구로 바꾸고, 본문도 강력한 임팩트의 한국어 문장으로 재작성해주세요.",
        toneGuide: "독자의 감정과 호기심을 직접 자극하며 직관적인 한국어 단어를 사용하세요. 줄바꿈(\\n)을 활용해 리듬감을 주세요.",
      },
      more_professional: {
        desc: "헤드라인과 본문을 전문적이고 신뢰도 높은 비즈니스/전문가 한국어 톤으로 재작성해주세요.",
        toneGuide: "정제된 비즈니스 어휘, 논리적 인과관계, 권위와 신뢰감이 느껴지는 한국어 격식체를 사용하세요.",
      },
      shorter: {
        desc: "모바일에서 1초 만에 훑어볼 수 있도록 헤드라인과 본문을 극도로 간결하게 한국어로 압축해주세요.",
        toneGuide: "헤드라인은 1~2줄, 본문은 2줄 이내의 짧은 불렛포인트나 핵심 한 줄로 축약하세요.",
      },
      rewrite_body: {
        desc: "본문 내용을 독자가 바로 따라할 수 있는 1-2-3 실천 가이드 또는 핵심 요약 형식으로 완전히 새로 작성해주세요.",
        toneGuide: "가독성 높은 글머리 기호(• 또는 1, 2, 3)를 활용하여 명쾌한 한국어로 정리하세요.",
      },
      new_image_prompt: {
        desc: "이 슬라이드의 주제와 메시지에 가장 잘 어울리는 새로운 ChatGPT/제미나이 최적화 한국어 이미지 생성 프롬프트(한국인 인물 명시, 친숙한 국내 공간 배경, 고화질 실사)와 한국어 연출 의도를 작성해주세요.",
        toneGuide: "인물 등장 시 반드시 한국 국적(예: 한국인 사장님, 한국인 20대 여성)을 명시하고, 자연스러운 조명과 실사 사진, 비율이 포함된 한국어 서술형 문장으로 작성하세요.",
      },
    };

    const targetGuide = actionPromptMap[action] || actionPromptMap.more_punchy;

    const prompt = `
당신은 대한민국 최고 수준의 카드뉴스 전문 한국어 카피라이터이자 에디터입니다.
슬라이드 원본 정보:
- 현재 헤드라인: ${slide.headline}
- 현재 본문: ${slide.body}
- 현재 강조 키워드: ${(slide.highlightWords || []).join(", ")}
- 현재 이미지 프롬프트: ${slide.imagePrompt || ""}
${projectContext ? `- 전체 프로젝트 주제: ${projectContext.topic} (${projectContext.category || ''})` : ""}

[개선 목표]
${targetGuide.desc}

[작성 가이드라인 - 엄격한 100% 한국어 준수]
${targetGuide.toneGuide}
1. 【언어 규칙 - 절대 준수】: 헤드라인(headline), 본문(body), 강조 단어(highlightWords), 스타일 키워드(imageStyleKeywords), 이미지 프롬프트(imagePrompt), 한국어 의도(imagePromptKorean)는 **예외 없이 100% 한국어(국문)**로만 작성하세요. 절대로 영문으로 번역하거나 영문 텍스트를 출력하지 마세요!
2. 【ChatGPT / 제미나이 최적화 이미지 프롬프트(imagePrompt)】: 챗GPT/제미나이에 바로 입력할 수 있도록 한국인 인물(한국인 사장님, 한국인 여성 등)과 국내 공간 배경, 자연스러운 조명과 실사 사진 서술형 문장으로 작성하세요.
3. 【스타일 키워드(imageStyleKeywords)】: 카드의 상단 태그 뱃지에 직접 노출되는 한국어 핵심 키워드(예: "고화질 포토", "미니멀", "스튜디오 조명", "트렌드 인사이트")로 2~3개만 100% 한국어로 작성하세요. 영문 단어는 절대 사용 금지합니다.
4. 응답은 반드시 JSON 형식으로만 반환하세요.`;

    const response = await generateContentWithFallback(ai, {
      contents: prompt,
      config: {
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING, description: "개선된 100% 한국어 헤드라인" },
            body: { type: Type.STRING, description: "개선된 100% 한국어 본문 (모바일 가독성 최적화)" },
            highlightWords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "100% 한국어 강조 키워드 1~3개",
            },
            imagePrompt: { type: Type.STRING, description: "ChatGPT/제미나이 최적화 100% 한국어 서술형 이미지 생성 프롬프트 (한국인 인물 명시)" },
            imagePromptKorean: { type: Type.STRING, description: "이미지 프롬프트의 100% 한국어 의도 해설" },
            imageStyleKeywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "카드 상단 뱃지에 노출될 100% 한국어 스타일 키워드 2~3개 (예: 고화질 포토, 미니멀, 스튜디오 조명)",
            },
          },
          required: ["headline", "body", "highlightWords", "imagePrompt", "imagePromptKorean", "imageStyleKeywords"],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("AI 응답을 받지 못했습니다.");
    }

    const updatedData = JSON.parse(text);

    // If refining copy only (not regenerating image prompt), preserve existing imagePrompt and sanitize keywords to Korean
    const finalStyleKeywords = sanitizeKeywordsToKorean(
      action === 'new_image_prompt'
        ? updatedData.imageStyleKeywords
        : (slide.imageStyleKeywords && slide.imageStyleKeywords.length > 0
            ? slide.imageStyleKeywords
            : updatedData.imageStyleKeywords)
    );

    const finalResult = {
      ...slide,
      ...updatedData,
      imageStyleKeywords: finalStyleKeywords,
      imagePrompt: action === 'new_image_prompt' ? updatedData.imagePrompt : (slide.imagePrompt || updatedData.imagePrompt),
      imagePromptKorean: action === 'new_image_prompt' ? updatedData.imagePromptKorean : (slide.imagePromptKorean || updatedData.imagePromptKorean),
    };

    res.json(finalResult);
  } catch (error: any) {
    console.error("Slide refine error:", error);
    res.status(500).json({ error: error.message || "슬라이드 수정 실패" });
  }
});

// Vite dev & production static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Only listen directly when running standalone (local development / node server)
if (!process.env.VERCEL) {
  startServer();
}

export default app;
export { app };
