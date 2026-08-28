export interface FontOption {
  id: string;
  name: string;
  category: 'sans' | 'impact' | 'serif' | 'handwriting';
  categoryName: string;
  fontFamily: string;
  previewText: string;
  description: string;
  recommendedFor: 'headline' | 'body' | 'both';
}

export const FONT_OPTIONS: FontOption[] = [
  // 1. 고딕/기본계 (Sans / Basic)
  {
    id: 'pretendard',
    name: '프리텐다드 (Pretendard)',
    category: 'sans',
    categoryName: '고딕 / 기본',
    fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif",
    previewText: '가장 깔끔하고 세련된 표준 고딕',
    description: '모바일 가독성 1위, 신뢰감 주는 현대적 디자인',
    recommendedFor: 'both',
  },
  {
    id: 'noto_sans',
    name: '본고딕 (Noto Sans KR)',
    category: 'sans',
    categoryName: '고딕 / 기본',
    fontFamily: "'Noto Sans KR', sans-serif",
    previewText: '단정하고 명확한 구글 표준 한글 서체',
    description: '어디서나 안정적이고 균형 잡힌 가독성',
    recommendedFor: 'both',
  },
  {
    id: 'score_dream',
    name: '에스코어드림 (S-Core Dream)',
    category: 'sans',
    categoryName: '고딕 / 기본',
    fontFamily: "'S-CoreDream', sans-serif",
    previewText: '단단하고 꽉 찬 직사각형 그리드 고딕',
    description: '블록처럼 정갈한 정보 전달에 최적화',
    recommendedFor: 'both',
  },

  // 2. 제목/임팩트계 (Impact / Display)
  {
    id: 'black_han_sans',
    name: '블랙한산스 (Black Han Sans)',
    category: 'impact',
    categoryName: '제목 / 임팩트',
    fontFamily: "'Black Han Sans', sans-serif",
    previewText: '시선을 압도하는 묵직한 볼드 헤드라인',
    description: '유튜브 썸네일 & 강렬한 후킹 표지에 강력 추천',
    recommendedFor: 'headline',
  },
  {
    id: 'gmarket_sans',
    name: 'G마켓 산스 (Gmarket Sans)',
    category: 'impact',
    categoryName: '제목 / 임팩트',
    fontFamily: "'GmarketSans', sans-serif",
    previewText: '트렌디하고 직선적인 임팩트 타이포',
    description: '마케팅, 프로모션, 카드뉴스 타이틀 베스트셀러',
    recommendedFor: 'headline',
  },
  {
    id: 'yanolja_yache',
    name: '야놀자 야체 (Yanolja Yache)',
    category: 'impact',
    categoryName: '제목 / 임팩트',
    fontFamily: "'YanoljaYache', sans-serif",
    previewText: '동글동글 개성 넘치고 발랄한 서체',
    description: '트렌디한 2030 라이프스타일 및 여행/여가 콘텐츠',
    recommendedFor: 'headline',
  },

  // 3. 명조/감성계 (Serif / Emotional)
  {
    id: 'nanum_myeongjo',
    name: '나눔명조 (Nanum Myeongjo)',
    category: 'serif',
    categoryName: '명조 / 감성',
    fontFamily: "'Nanum Myeongjo', serif",
    previewText: '우아하고 격조 높은 정통 에세이 명조',
    description: '인문학, 명언, 깊이 있는 인사이트 카드뉴스',
    recommendedFor: 'both',
  },
  {
    id: 'gowun_batang',
    name: '고운바탕 (Gowun Batang)',
    category: 'serif',
    categoryName: '명조 / 감성',
    fontFamily: "'Gowun Batang', serif",
    previewText: '따뜻한 온기와 부드러움을 품은 감성 폰트',
    description: '힐링, 뷰티, 에세이, 브랜딩에 어울리는 감성',
    recommendedFor: 'both',
  },

  // 4. 손글씨/캐주얼계 (Handwriting / Casual)
  {
    id: 'gaegu',
    name: '개구체 (Gaegu)',
    category: 'handwriting',
    categoryName: '손글씨 / 캐주얼',
    fontFamily: "'Gaegu', cursive",
    previewText: '귀엽고 친근한 몽글몽글 손글씨',
    description: '일상 브이로그, 꿀팁, 친근한 대화형 카드뉴스',
    recommendedFor: 'both',
  },
  {
    id: 'kcc_e_eum',
    name: 'KCC 이음/은영체 (KCC e-Eum)',
    category: 'handwriting',
    categoryName: '손글씨 / 캐주얼',
    fontFamily: "'KCC-e-eum', cursive",
    previewText: '정갈하고 감성적인 펜 드로잉 손글씨',
    description: '따뜻한 편지, 감성 다이어리 스타일',
    recommendedFor: 'both',
  },
  {
    id: 'nanum_pen',
    name: '나눔손글씨 펜 (Nanum Pen)',
    category: 'handwriting',
    categoryName: '손글씨 / 캐주얼',
    fontFamily: "'Nanum Pen Script', cursive",
    previewText: '자유롭고 감각적인 필기체 감성',
    description: '손으로 쓴 듯한 자연스러운 포인트 연출',
    recommendedFor: 'both',
  },
];

export const DEFAULT_HEADLINE_FONT = FONT_OPTIONS[0].fontFamily; // Pretendard
export const DEFAULT_BODY_FONT = FONT_OPTIONS[0].fontFamily; // Pretendard

export function getFontByFamilyOrId(idOrFamily?: string): FontOption {
  if (!idOrFamily) return FONT_OPTIONS[0];
  return (
    FONT_OPTIONS.find(
      (f) => f.id === idOrFamily || f.fontFamily === idOrFamily || idOrFamily.includes(f.id)
    ) || FONT_OPTIONS[0]
  );
}
