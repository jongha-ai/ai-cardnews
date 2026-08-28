import { Type } from '@google/genai';
import { getGeminiClient, generateContentWithFallback } from './_gemini';
import { extractStockKeywords, buildDynamicStockPhotoUrl } from '../src/utils/photoMatcher';

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

  const count = Number(slideCount) || 5;
  const cleanTopic = (topic || 'AI 카드뉴스').replace(/[^\w\s가-힣]/g, '').trim() || 'AI 카드뉴스';

  const generateFallback = () => {
    return {
      title: topic || `${cleanTopic} 완벽 가이드`,
      subTitle: purpose || `누구나 쉽게 이해하고 바로 실천하는 ${cleanTopic} 핵심 요약`,
      category: themeId || 'LIFESTYLE & INSIGHT',
      tags: ['#카드뉴스', `#${cleanTopic.replace(/\s+/g, '')}`, '#실전팁', '#인사이트'],
      caption: `${cleanTopic}, 아직도 혼자 고민하며 시간 낭비하고 계셨나요? ⏳\n\n바쁜 분들을 위한 ${count}단계 핵심 실천 가이드를 정리했습니다!\n━━━━━━━━━━━━━━━\n1️⃣ ${cleanTopic} 기본 원리 점검\n👉 문제의 원인을 먼저 파악하고 불필요한 시행착오를 줄이세요.\n\n2️⃣ 실전 적용 노하우\n👉 단계별 체크리스트를 따라 매일 10분씩 작은 습관으로 만드세요.\n\n3️⃣ 지속 가능한 시스템 구축\n👉 한 번의 실행으로 끝나지 않도록 자동화 루틴을 완성하세요.\n━━━━━━━━━━━━━━━\n💡 핵심은 '이해'가 아니라 '즉시 실행'입니다.\n\n📌 나중에 다시 보며 적용하려면 지금 [저장]해두세요!\n💬 주변에 꼭 필요한 분들께 [공유]로 알려주세요!\n\n#${cleanTopic.replace(/\s+/g, '')} #카드뉴스 #실전팁 #성장루틴`,
      slides: Array.from({ length: count }).map((_, idx) => {
        const headline = idx === 0 ? `✨ ${cleanTopic}\n지금 꼭 알아야 할 핵심 포인트` : `${idx}단계: ${cleanTopic} 핵심 실천 전략`;
        const body = `이 단계에서는 ${cleanTopic}와 관련된 가장 효과적인 실천 방법 및 핵심 지식을 전달합니다.\n2~3문장으로 간결하게 구성하여 모바일에서 한눈에 쏙 들어옵니다.`;
        const keywords = extractStockKeywords({ headline, body, slideNumber: idx + 1 });
        const photoUrl = buildDynamicStockPhotoUrl(keywords.primary_keyword, idx + 1);
        return {
          slideNumber: idx + 1,
          slideType: idx === 0 ? 'cover' : idx === count - 1 ? 'cta' : 'body',
          badgeText: idx === 0 ? 'GUIDE' : `POINT 0${idx}`,
          headline,
          body,
          highlightWords: [cleanTopic, '핵심 포인트'],
          imagePrompt: `밝고 정돈된 국내 비즈니스 공간에서 ${cleanTopic} 핵심 전략을 점검 중인 30대 한국인 직장인, 자연스러운 표정과 부드러운 채광, 고화질 실사 사진, ${aspectRatio} 비율`,
          imagePromptKorean: `${cleanTopic}의 핵심 메시지를 담은 세련된 한국형 고화질 비주얼`,
          imageStyleKeywords: ['고화질 포토', '미니멀', '스튜디오 조명'],
          stockPhotoKeywords: keywords,
          suggestedLayout: 'split_top_image',
          imageUrl: photoUrl,
        };
      }),
    };
  };

  if (!topic || typeof topic !== 'string' || topic.trim() === '') {
    return res.status(200).json(generateFallback());
  }

  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(200).json(generateFallback());
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
      return res.status(200).json(generateFallback());
    }

    const parsedData = JSON.parse(text);
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

    return res.status(200).json({
      ...parsedData,
      slides: enrichedSlides,
    });
  } catch (err: any) {
    console.error('Vercel API generate-cardnews error:', err);
    return res.status(200).json(generateFallback());
  }
}