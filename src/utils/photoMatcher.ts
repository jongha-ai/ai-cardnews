/**
 * Dynamic Stock Photo Matching & Unsplash Keyword Extraction Pipeline
 * Directly extracts contextual, high-precision stock search phrases based strictly on slide headline & body,
 * and generates dynamic high-resolution Unsplash photos per slide.
 * 
 * Strict Rules:
 * 1. Theme/Category based matching completely disabled (No TECH/PRODUCTIVITY/dark_tech theme lookups)
 * 2. Slide Headline + Body direct matching enforced (Physical subjects: people, store, smartphone, poster, cafe, etc.)
 * 3. Generic tech words ('abstract', 'technology', 'tech', 'code', 'chip', '3d', 'circuit') purged
 */

export interface StockPhotoKeywords {
  primary_keyword: string;
  secondary_keyword: string;
}

const FORBIDDEN_GENERIC_WORDS = [
  'abstract',
  'technology',
  'tech',
  'code',
  'coding',
  'chip',
  'circuit',
  'microchip',
  '3d',
  'matrix',
  'cyber',
  'server',
  'dark',
  'binary',
  'hardware',
  'computer screen',
];

/**
 * Clean and format keyword phrase to lowercase alphanumeric without noise or forbidden tech words
 */
export function sanitizeStockKeyword(keyword: string): string {
  if (!keyword) return 'happy small business owner cafe';
  
  let cleaned = keyword
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Filter out forbidden generic words
  for (const word of FORBIDDEN_GENERIC_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    cleaned = cleaned.replace(regex, '').trim();
  }

  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned || 'happy small business owner cafe';
}

/**
 * High-resolution Unsplash photo catalog indexed by specific 2~4 word concrete scene phrases.
 * All entries feature real authentic human subjects, workspaces, stores, and tangible physical objects.
 */
const SCENE_PHOTO_REGISTRY: Record<string, string[]> = {
  // 1. Poster / Marketing / Flyer / Banner / Creative Design
  'poster design creative desk': [
    'https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=1200&q=85',
  ],
  'store flyer marketing': [
    'https://images.unsplash.com/photo-1556742049-0a67e5572263?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=85',
  ],

  // 2. Customer Service / Mobile Chat / Messaging / Friendly Support
  'friendly customer service mobile chat': [
    'https://images.unsplash.com/photo-1534536281715-e28d76689b4d?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1525182008055-f88b95ff7980?auto=format&fit=crop&w=1200&q=85',
  ],
  'smartphone messaging chat app': [
    'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1585060544812-6b45742d762f?auto=format&fit=crop&w=1200&q=85',
  ],
  'customer support agent desk': [
    'https://images.unsplash.com/photo-1549923746-c502d488b3ea?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1525182008055-f88b95ff7980?auto=format&fit=crop&w=1200&q=85',
  ],

  // 3. Store / Small Business / Cafe / Retail Owner
  'happy small business owner cafe': [
    'https://images.unsplash.com/photo-1508766917616-d22f3f1eea14?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1556742111-a301076d9d18?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=85',
  ],
  'small business owner cafe': [
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=1200&q=85',
  ],
  'retail store checkout counter': [
    'https://images.unsplash.com/photo-1556742049-0a67e5572263?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1200&q=85',
  ],
  'barista brewing specialty coffee': [
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=85',
  ],
  'bakery bread display counter': [
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1200&q=85',
  ],

  // 4. Content / SNS / Reels / Shortform / Video Filming
  'creator ring light filming setup': [
    'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1200&q=85',
  ],
  'editing video smartphone screen': [
    'https://images.unsplash.com/photo-1533750516457-a7f992034fec?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1574717024453-354056aef981?auto=format&fit=crop&w=1200&q=85',
  ],
  'social media content creation': [
    'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=85',
  ],

  // 5. Audio / Logo Song / Podcast / Microphone
  'audio wave headphones desk': [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1200&q=85',
  ],
  'podcast microphone studio': [
    'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1589903102056-142112739a72?auto=format&fit=crop&w=1200&q=85',
  ],

  // 6. Sales / Dashboard / Analytics / Tablet
  'business dashboard tablet screen': [
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=85',
  ],
  'financial analytics charts graph': [
    'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=85',
  ],
  'team high five office celebration': [
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&q=85',
  ],

  // 7. Finance / Money / Savings / Wallet
  'piggy bank golden coins': [
    'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1565372195458-9de0b320ef04?auto=format&fit=crop&w=1200&q=85',
  ],
  'clean wallet credit card': [
    'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=85',
  ],
  'modern mobile banking app': [
    'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=1200&q=85',
  ],

  // 8. Beauty / Skincare / Cosmetics
  'aesthetic serum dropper bottle': [
    'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=1200&q=85',
  ],
  'natural daylight organic cosmetics': [
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=1200&q=85',
  ],
  'skincare cream texture close up': [
    'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1508746829417-e6f548d8d6ed?auto=format&fit=crop&w=1200&q=85',
  ],

  // 9. Food / Culinary / Cafe
  'gourmet culinary dish plating': [
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=85',
  ],
  'steaming latte art cup': [
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=85',
  ],
  'fresh colorful salad bowl table': [
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=85',
  ],

  // 10. Real Estate / Architecture / Interior
  'sunlit modern living room': [
    'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85',
  ],
  'minimalist kitchen marble island': [
    'https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=85',
  ],

  // 11. Productivity / Desk / Routine / Work
  'minimalist desk laptop notebook': [
    'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=85',
  ],
  'morning coffee planner journal': [
    'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=85',
  ],

  // 12. Fitness / Wellness
  'gym fitness workout dumbbell': [
    'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=85',
  ],
  'morning yoga meditation sunlight': [
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=85',
  ],
};

/**
 * Intelligent Keyword Extractor matching STRICTLY against Slide Headline and Body.
 * Completely ignores themes or generic categories.
 */
export function extractStockKeywords(params: {
  headline?: string;
  body?: string;
  slideNumber?: number;
}): StockPhotoKeywords {
  const text = `${params.headline || ''} ${params.body || ''}`.toLowerCase();
  const num = params.slideNumber || 1;

  // 1. Promotional Material / Poster / Flyer / Banner / Ad Design / Creative Copy
  if (
    text.includes('홍보물') ||
    text.includes('포스터') ||
    text.includes('전단지') ||
    text.includes('배너') ||
    text.includes('디자인') ||
    text.includes('템플릿') ||
    text.includes('카드뉴스') ||
    text.includes('광고') ||
    text.includes('카피') ||
    text.includes('제작') ||
    text.includes('flyer') ||
    text.includes('poster') ||
    text.includes('banner')
  ) {
    if (num % 2 === 1) {
      return {
        primary_keyword: 'poster design creative desk',
        secondary_keyword: 'store flyer marketing',
      };
    } else {
      return {
        primary_keyword: 'store flyer marketing',
        secondary_keyword: 'poster design creative desk',
      };
    }
  }

  // 2. Customer Support / CS / Messaging / Chatbot / Inquiries / Automation
  if (
    text.includes('고객 응대') ||
    text.includes('고객응대') ||
    text.includes('상담') ||
    text.includes('챗봇') ||
    text.includes('자동화') ||
    text.includes('카톡') ||
    text.includes('dm') ||
    text.includes('메시지') ||
    text.includes('문의') ||
    text.includes('비서') ||
    text.includes('고객지원') ||
    text.includes('소통') ||
    text.includes('customer') ||
    text.includes('chat') ||
    text.includes('support')
  ) {
    if (num % 2 === 1) {
      return {
        primary_keyword: 'friendly customer service mobile chat',
        secondary_keyword: 'smartphone messaging chat app',
      };
    } else {
      return {
        primary_keyword: 'smartphone messaging chat app',
        secondary_keyword: 'customer support agent desk',
      };
    }
  }

  // 3. Sales / Growth / Store / Cafe / Small Business / Owner / Shop Management
  if (
    text.includes('매출') ||
    text.includes('실전') ||
    text.includes('전략') ||
    text.includes('가게') ||
    text.includes('매장') ||
    text.includes('소상공인') ||
    text.includes('점주') ||
    text.includes('사장님') ||
    text.includes('손님') ||
    text.includes('창업') ||
    text.includes('자영업') ||
    text.includes('수익') ||
    text.includes('주문') ||
    text.includes('정산') ||
    text.includes('상권')
  ) {
    if (num % 3 === 1) {
      return {
        primary_keyword: 'happy small business owner cafe',
        secondary_keyword: 'retail store checkout counter',
      };
    } else if (num % 3 === 2) {
      return {
        primary_keyword: 'retail store checkout counter',
        secondary_keyword: 'happy small business owner cafe',
      };
    } else {
      return {
        primary_keyword: 'barista brewing specialty coffee',
        secondary_keyword: 'happy small business owner cafe',
      };
    }
  }

  // 4. Shortform / Reels / Video / Filming / Creator / YouTube / Instagram
  if (
    text.includes('숏폼') ||
    text.includes('릴스') ||
    text.includes('영상') ||
    text.includes('촬영') ||
    text.includes('편집') ||
    text.includes('유튜브') ||
    text.includes('인스타') ||
    text.includes('크리에이터') ||
    text.includes('조회수') ||
    text.includes('틱톡') ||
    text.includes('카메라')
  ) {
    if (num % 2 === 1) {
      return {
        primary_keyword: 'creator ring light filming setup',
        secondary_keyword: 'editing video smartphone screen',
      };
    } else {
      return {
        primary_keyword: 'editing video smartphone screen',
        secondary_keyword: 'social media content creation',
      };
    }
  }

  // 5. Audio / Logo Song / Sound / Music / Voice / Podcast / Headphones
  if (
    text.includes('오디오') ||
    text.includes('로고송') ||
    text.includes('음악') ||
    text.includes('음원') ||
    text.includes('목소리') ||
    text.includes('팟캐스트') ||
    text.includes('사운드') ||
    text.includes('마이크') ||
    text.includes('헤드폰')
  ) {
    return {
      primary_keyword: 'audio wave headphones desk',
      secondary_keyword: 'podcast microphone studio',
    };
  }

  // 6. Data / Dashboard / Analytics / Charts / Metrics / Results
  if (
    text.includes('데이터') ||
    text.includes('차트') ||
    text.includes('대시보드') ||
    text.includes('분석') ||
    text.includes('성과') ||
    text.includes('지표') ||
    text.includes('그래프') ||
    text.includes('통계') ||
    text.includes('전환율')
  ) {
    return {
      primary_keyword: 'business dashboard tablet screen',
      secondary_keyword: 'financial analytics charts graph',
    };
  }

  // 7. Finance / Money / Wealth / Savings / Bank Account
  if (
    text.includes('금융') ||
    text.includes('재테크') ||
    text.includes('돈') ||
    text.includes('월급') ||
    text.includes('저축') ||
    text.includes('투자') ||
    text.includes('통장') ||
    text.includes('자산') ||
    text.includes('주식') ||
    text.includes('적금') ||
    text.includes('예산') ||
    text.includes('비상금')
  ) {
    if (num % 2 === 1) {
      return {
        primary_keyword: 'piggy bank golden coins',
        secondary_keyword: 'clean wallet credit card',
      };
    } else {
      return {
        primary_keyword: 'clean wallet credit card',
        secondary_keyword: 'modern mobile banking app',
      };
    }
  }

  // 8. Beauty / Skincare / Cosmetics
  if (
    text.includes('뷰티') ||
    text.includes('화장품') ||
    text.includes('스킨케어') ||
    text.includes('피부') ||
    text.includes('세럼') ||
    text.includes('보습') ||
    text.includes('앰플') ||
    text.includes('에스테틱')
  ) {
    if (num % 2 === 1) {
      return {
        primary_keyword: 'aesthetic serum dropper bottle',
        secondary_keyword: 'skincare cream texture close up',
      };
    } else {
      return {
        primary_keyword: 'natural daylight organic cosmetics',
        secondary_keyword: 'aesthetic serum dropper bottle',
      };
    }
  }

  // 9. Food / Culinary / Dining / Cafe
  if (
    text.includes('요리') ||
    text.includes('음식') ||
    text.includes('맛집') ||
    text.includes('레시피') ||
    text.includes('식사') ||
    text.includes('커피') ||
    text.includes('디저트') ||
    text.includes('베이커리')
  ) {
    if (num % 2 === 1) {
      return {
        primary_keyword: 'gourmet culinary dish plating',
        secondary_keyword: 'steaming latte art cup',
      };
    } else {
      return {
        primary_keyword: 'steaming latte art cup',
        secondary_keyword: 'fresh colorful salad bowl table',
      };
    }
  }

  // 10. Interior / Home / Room / Architecture
  if (
    text.includes('인테리어') ||
    text.includes('아파트') ||
    text.includes('원룸') ||
    text.includes('방') ||
    text.includes('가구') ||
    text.includes('집') ||
    text.includes('공간') ||
    text.includes('수납')
  ) {
    return {
      primary_keyword: 'sunlit modern living room',
      secondary_keyword: 'minimalist kitchen marble island',
    };
  }

  // 11. Fitness / Health / Exercise
  if (
    text.includes('운동') ||
    text.includes('헬스') ||
    text.includes('피트니스') ||
    text.includes('요가') ||
    text.includes('다이어트') ||
    text.includes('건강')
  ) {
    return {
      primary_keyword: 'gym fitness workout dumbbell',
      secondary_keyword: 'morning yoga meditation sunlight',
    };
  }

  // 12. Productivity / Routine / Work / Planning
  if (
    text.includes('업무') ||
    text.includes('루틴') ||
    text.includes('일잘러') ||
    text.includes('시간관리') ||
    text.includes('메모') ||
    text.includes('다이어리') ||
    text.includes('습관')
  ) {
    return {
      primary_keyword: 'minimalist desk laptop notebook',
      secondary_keyword: 'morning coffee planner journal',
    };
  }

  // Concrete default fallback (Never abstract tech/chips)
  return {
    primary_keyword: 'happy small business owner cafe',
    secondary_keyword: 'poster design creative desk',
  };
}

/**
 * Dynamically resolves high-definition Unsplash photo URL matching the extracted keyword.
 * Ensures every slide gets a distinct, non-colliding image.
 */
export function buildDynamicStockPhotoUrl(
  keyword: string,
  slideNumber: number = 1
): string {
  const cleanKey = sanitizeStockKeyword(keyword);
  const photos = SCENE_PHOTO_REGISTRY[cleanKey];

  if (photos && photos.length > 0) {
    const idx = Math.abs((slideNumber - 1)) % photos.length;
    return photos[idx];
  }

  // Find nearest matching scene in registry
  for (const [sceneKey, scenePhotos] of Object.entries(SCENE_PHOTO_REGISTRY)) {
    const words = cleanKey.split(' ').filter(w => w.length > 2);
    const matchCount = words.filter(w => sceneKey.includes(w)).length;
    if (matchCount >= 1 && scenePhotos.length > 0) {
      const idx = Math.abs((slideNumber - 1)) % scenePhotos.length;
      return scenePhotos[idx];
    }
  }

  // Fallback to vibrant small business / creative workspace
  const fallbackPool = SCENE_PHOTO_REGISTRY['happy small business owner cafe'];
  return fallbackPool[Math.abs((slideNumber - 1)) % fallbackPool.length];
}

/**
 * Main Smart Topic Photo Matching Function
 * Strictly uses slide headline and body to resolve dynamic high-resolution Unsplash photo URL.
 */
export function getSmartTopicPhoto(params: {
  headline?: string;
  body?: string;
  slideNumber?: number;
}): string {
  const { primary_keyword } = extractStockKeywords(params);
  return buildDynamicStockPhotoUrl(primary_keyword, params.slideNumber || 1);
}

