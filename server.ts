import express, { Request, Response } from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
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

// Resilient Gemini generateContent helper with automatic model fallback and 429 backoff
async function generateContentWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
    models?: string[];
  }
): Promise<any> {
  const candidateModels = params.models || [
    "gemini-2.5-flash",
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
          err?.message?.includes("429") ||
          err?.message?.includes("RESOURCE_EXHAUSTED");

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

  throw lastError || new Error("All Gemini models failed to respond.");
}

import { extractStockKeywords } from "./src/utils/photoMatcher";
import {
  searchStockImageCandidates,
  enrichSlidesWithRankedStockPhotos,
  trackUnsplashDownload,
} from "./src/server/unsplashService";

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
            imageUrl: undefined,
            stockPhotoId: undefined,
            stockPhotoAttribution: undefined,
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
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY || process.env.UNSPLASH_KEY || '';

    // Map base slides with keywords
    let enrichedSlides = parsedData.slides.map((s: any, idx: number) => {
      const keywords = s.stockPhotoKeywords?.primary_keyword
        ? s.stockPhotoKeywords
        : extractStockKeywords({
            headline: s.headline,
            body: s.body,
            slideNumber: idx + 1,
          });

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
          req.body?.aspectRatio || '1:1',
          unsplashKey
        );
      } catch (stockErr: any) {
        console.warn('[server generate-cardnews] Stock photo enrichment failed gracefully:', stockErr.message);
      }
    }

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
            imageUrl: undefined,
            stockPhotoId: undefined,
            stockPhotoAttribution: undefined,
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

// Story Director v1: Analyze all slides & refine narrative story flow without altering design/images
app.post("/api/story-director", async (req: Request, res: Response) => {
  const { topic = '', purpose = '', targetAudience = '', tone = '', slides = [] } = req.body || {};

  if (!Array.isArray(slides) || slides.length === 0) {
    return res.status(400).json({ error: '분석할 슬라이드 목록이 필요합니다.' });
  }

  const ALLOWED_SLIDE_TYPES = ['cover', 'problem', 'body', 'stat', 'tip', 'quote', 'summary', 'cta'] as const;

  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(401).json({
        error: 'Gemini API 키가 설정되지 않았습니다. 환경변수(GEMINI_API_KEY)를 확인해주세요.',
      });
    }

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
});

// Stock Image Search API (supports both /api/stock-image-search and /stock-image-search)
app.post(["/api/stock-image-search", "/stock-image-search"], async (req: Request, res: Response) => {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY || process.env.UNSPLASH_KEY;

  if (!accessKey || accessKey.trim() === '') {
    return res.status(500).json({
      error: 'UNSPLASH_ACCESS_KEY is not configured on the server. Please set UNSPLASH_ACCESS_KEY in server environment variables.',
    });
  }

  try {
    const result = await searchStockImageCandidates(req.body || {}, accessKey);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Stock Image Search API error:', error);
    return res.status(500).json({
      error: '스톡 이미지 검색 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    });
  }
});

// Unsplash Download Tracking API (records download event on Unsplash when user selects photo)
app.post(["/api/unsplash-track-download", "/unsplash-track-download"], async (req: Request, res: Response) => {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY || process.env.UNSPLASH_KEY || '';
  if (!accessKey || accessKey.trim() === '') {
    return res.status(500).json({ error: 'UNSPLASH_ACCESS_KEY is not configured.' });
  }

  try {
    const { photoId } = req.body || {};
    const result = await trackUnsplashDownload(photoId, accessKey);
    if (!result.success) {
      return res.status(result.status || 502).json({ error: result.error || 'Upstream Unsplash download tracking failed', success: false });
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[Unsplash Tracking] Error:', error.message);
    return res.status(500).json({ error: 'Failed to track download.' });
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
