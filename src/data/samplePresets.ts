import { CardNewsProject } from '../types';
import { getSmartTopicPhoto } from '../utils/photoMatcher';

export interface TopicPreset {
  title: string;
  topic: string;
  category: string;
  purpose: string;
  targetAudience: string;
  tone: string;
  themeId: string;
  description: string;
  icon: string;
}

export const TOPIC_PRESETS: TopicPreset[] = [
  {
    title: '사회초년생 월급 관리 4단계 법칙',
    topic: '사회초년생을 위한 통장 쪼개기, 비상금 마련 및 스마트 자산 배분',
    category: '금융 / 재테크',
    purpose: '실용적인 재테크 가이드',
    targetAudience: '사회초년생 및 2030 직장인',
    tone: '신뢰감 있고 친절한 멘토 톤',
    themeId: 'modern_blue',
    description: '첫 월급부터 지키는 스마트한 자산 배분과 저축 로드맵',
    icon: 'Coins',
  },
  {
    title: '피부 장벽 살리는 3분 나이트 루틴',
    topic: '환절기 건조함을 극복하는 수분 잠금 스킨케어 순서와 성분 가이드',
    category: '뷰티 / 스킨케어',
    purpose: '뷰티 팁 및 정보 전달',
    targetAudience: '스킨케어에 관심 많은 2040 남녀',
    tone: '세련되고 감성적인 뷰티 매거진 톤',
    themeId: 'rose_modern',
    description: '수분 폭탄 앰플과 보습 크림의 완벽 레이어링 공식',
    icon: 'Sparkles',
  },
  {
    title: '집에서 만드는 5성급 파스타 비결',
    topic: '면수 에멀전과 올리브 오일 온도로 결정되는 레스토랑급 알리오 올리오',
    category: '푸드 / 요리',
    purpose: '요리 레시피 및 미식 꿀팁',
    targetAudience: '홈쿠킹과 미식을 즐기는 1인가구',
    tone: '식감 넘치고 생생한 셰프 톤',
    themeId: 'warm_sunset',
    description: '마늘 향을 극대화하고 소스가 면에 착 감기는 황금 비율',
    icon: 'Coffee',
  },
  {
    title: '첫 독립을 위한 원룸 인테리어 꿀팁',
    topic: '좁은 공간을 2배 넓어 보이게 만드는 조명 배치와 수납 레이아웃',
    category: '부동산 / 인테리어',
    purpose: '공간 활용 인테리어 노하우',
    targetAudience: '자취를 시작하는 청년 및 신혼부부',
    tone: '감각적이고 아늑한 라이프스타일 톤',
    themeId: 'neutral_minimal',
    description: '빛과 컬러 매치로 완성하는 감성 가득한 미니멀 하우스',
    icon: 'Home',
  },
  {
    title: '2026 AI 에이전트 업무 혁신 가이드',
    topic: '2026년 일상을 바꾸는 차세대 자율형 AI 에이전트와 생산성 극대화',
    category: 'IT / 테크',
    purpose: '트렌드 분석 및 생산성 향상',
    targetAudience: '2030 직장인 및 테크 얼리어답터',
    tone: '전문적이고 명쾌한 인사이트 톤',
    themeId: 'dark_tech',
    description: '단순 챗봇을 넘어 스스로 계획하고 실행하는 AI 에이전트 혁신',
    icon: 'Bot',
  },
  {
    title: '인스타그램 릴스 터지는 훅 공식 5가지',
    topic: '첫 3초만에 시선을 사로잡는 숏폼 영상 후킹 카피라이팅 패턴',
    category: '마케팅 / SNS',
    purpose: '노하우 공유 및 브랜딩',
    targetAudience: '크리에이터 및 1인 마케터',
    tone: '강렬하고 즉각적인 실천 톤',
    themeId: 'vibrant_energy',
    description: '스크롤을 멈추게 만드는 뇌과학 기반의 인트로 기법',
    icon: 'TrendingUp',
  },
];

export const INITIAL_SAMPLE_PROJECT: CardNewsProject = {
  id: 'sample-project-finance',
  title: '사회초년생 월급 관리 4단계 법칙',
  subTitle: '통장 쪼개기부터 비상금 마련까지, 첫 월급 지키는 스마트 로드맵',
  category: 'FINANCE & MONEY',
  topic: '사회초년생을 위한 통장 쪼개기, 비상금 마련 및 스마트 자산 배분',
  purpose: '실용적인 재테크 가이드',
  targetAudience: '사회초년생 및 2030 직장인',
  tone: '신뢰감 있고 명쾌한 어조',
  tags: ['#재테크', '#월급관리', '#사회초년생', '#통장쪼개기', '#자산관리'],
  aspectRatio: '1:1',
  themeId: 'modern_blue',
  caption: `월급날만 되면 통장이 ‘로그아웃’ 되어 당황하셨나요? ⏳

열심히 일했는데 남는 돈이 없다면, '선저축 후지출' 시스템이 없기 때문입니다.
사회초년생을 위한 4단계 월급 관리 핵심 로드맵을 공개합니다!
━━━━━━━━━━━━━━━
1️⃣ 흔한 실수 점검
👉 '남은 돈을 저축하겠다'는 생각은 100% 실패! 먼저 저축하고 남은 돈으로 생활하세요.

2️⃣ 4개의 통장 쪼개기
👉 급여·고정·소비·비상금 통장 4개로 자동이체를 걸어 지출을 통제하세요.

3️⃣ 비상금 펀드 구축
👉 월급의 3~6배는 CMA·파킹통장에 넣어 적금을 깨는 비상 상황을 방지하세요.

4️⃣ 실천 & 소장하기
👉 이번 달 월급날부터 딱 10분만 투자해 통장 시스템을 만들어보세요.
━━━━━━━━━━━━━━━
💡 돈은 버는 것보다 '모이는 구조'를 만드는 것이 먼저입니다.

📌 이번 달 월급날에 바로 적용해보려면 지금 [저장]해두세요!
💬 주변에 통장 관리가 필요한 동료에게 [공유]로 알려주세요!
🙋‍♂️ 가장 먼저 만들어보고 싶은 통장은 무엇인가요? 댓글로 남겨주세요!

#사회초년생 #월급관리 #통장쪼개기 #재테크기초 #직장인재테크 #자산관리 #가계부 #파킹통장 #비상금모으기 #2030재테크 #금융상식 #돈모으기 #소비습관 #부자되는습관 #머니트렌드`,
  createdAt: new Date().toISOString(),
  slides: [
    {
      id: 'slide-1',
      slideNumber: 1,
      slideType: 'cover',
      badgeText: 'FINANCE GUIDE',
      headline: '💰 사회초년생 월급 관리\n어디서부터 시작해야 할까?\n딱 4단계로 끝내는 자산 법칙',
      body: '월급이 스쳐 지나가는 통장은 이제 그만!\n돈이 모이는 구조를 만드는 핵심 원리를 공개합니다.',
      highlightWords: ['사회초년생 월급 관리', '4단계 자산 법칙', '돈이 모이는 구조'],
      imagePrompt: '세련되고 깔끔한 원목 책상 위에서 가죽 지갑과 스마트폰 금융 앱을 확인 중인 20대 한국인 직장인, 자연스러운 아침 햇살과 정돈된 분위기, 고화질 실사 사진, 1:1 비율',
      imagePromptKorean: '세련된 미니멀 머니 라이프스타일: 정갈하게 쌓인 3D 골드 코인과 고급 가죽 지갑, 깔끔한 금융 자산 관리 스마트폰 디스플레이',
      imageStyleKeywords: ['금융 라이프', '골드 코인', '미니멀', '자연광'],
      suggestedLayout: 'split_top_image',
      imageUrl: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=1200&q=85',
    },
    {
      id: 'slide-2',
      slideNumber: 2,
      slideType: 'problem',
      badgeText: '01. 흔한 실수 점검',
      headline: '“남은 돈을 저축하겠다?”\n이 생각 때문에 1원도 안 모입니다',
      body: '지출 후 남은 돈을 저축하는 방식은 100% 실패합니다.\n반드시 [선저축 후지출] 시스템으로 통장 흐름을 바꿔야 합니다.',
      highlightWords: ['1원도 안 모입니다', '선저축 후지출', '시스템'],
      imagePrompt: '화사한 국내 카페 테이블에서 태블릿 가계부와 체크카드를 보며 예산을 점검 중인 30대 한국인 여성, 자연스러운 미소와 따뜻한 조명, 고화질 실사 사진, 1:1 비율',
      imagePromptKorean: '지출 통제와 예산 점검: 세련된 데스크 위의 가계부 노트와 계산기, 스마트한 소비 관리 분위기',
      imageStyleKeywords: ['소비 점검', '가계부', '스마트 예산', '클린 데스크'],
      suggestedLayout: 'split_top_image',
      imageUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=85',
    },
    {
      id: 'slide-3',
      slideNumber: 3,
      slideType: 'body',
      badgeText: '02. 4개의 통장 쪼개기',
      headline: '급여·고정·소비·비상금\n통장 4개로 자동 분류하기',
      body: '• 급여 통장: 월급 수령 후 즉시 각 통장으로 자동이체\n• 고정지출: 월세, 보험료, 통신비 전용\n• 생활비: 체크카드로 예산 안에서만 사용',
      highlightWords: ['통장 4개', '자동이체', '생활비 예산'],
      imagePrompt: '정돈된 한국식 오피스 데스크에서 모바일 뱅킹으로 4개 통장 자동이체를 설정 중인 20대 한국인 남성 직장인, 선명한 스마트폰 화면과 깔끔한 구도, 고화질 실사 사진, 1:1 비율',
      imagePromptKorean: '체계적인 통장 관리: 모바일 뱅킹 화면과 정돈된 카드, 통장 쪼개기 시스템 시각화',
      imageStyleKeywords: ['통장 쪼개기', '디지털 뱅킹', '카드 정리', '미니멀'],
      suggestedLayout: 'split_top_image',
      imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&q=85',
    },
    {
      id: 'slide-4',
      slideNumber: 4,
      slideType: 'tip',
      badgeText: '03. 비상금 펀드 구축',
      headline: '월급의 3~6배 비상금\nCMA·파킹통장에 보관하기',
      body: '예기치 못한 지출이 생겼을 때 적금을 깨지 않도록\n하루만 넣어도 이자가 붙는 파킹통장에 비상금을 채워두세요.',
      highlightWords: ['3~6배 비상금', '파킹통장', '적금 유지'],
      imagePrompt: '채광이 쏟아지는 아늑한 거실 테이블에 놓인 투명 저금통과 싱그러운 작은 반려식물, 따뜻하고 안정감 있는 한국 가정집 인테리어, 고화질 실사 사진, 1:1 비율',
      imagePromptKorean: '자라나는 비상금: 동전에서 피어나는 싱그러운 새싹과 자연광, 안전한 비상금 자산 성장',
      imageStyleKeywords: ['비상금 성장', '새싹 화분', '안전자산', '따뜻한 햇살'],
      suggestedLayout: 'split_top_image',
      imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=85',
    },
    {
      id: 'slide-5',
      slideNumber: 5,
      slideType: 'cta',
      badgeText: '04. 실천 & 소장하기',
      headline: '📌 이번 달 월급날부터\n통장 쪼개기 바로 실천해 보세요!',
      body: '월급날 10분만 투자하면 1년 뒤 자산이 달라집니다.\n저장해두고 월급날마다 체크리스트로 활용하세요!',
      highlightWords: ['통장 쪼개기 실천', '1년 뒤 자산', '체크리스트 저장'],
      imagePrompt: '세련된 국내 감성 카페에서 스마트폰으로 자산 포트폴리오를 확인하며 자신감 있게 미소 짓는 30대 한국인 직장인, 화사하고 따뜻한 자연광, 고화질 실사 사진, 1:1 비율',
      imagePromptKorean: '자신감 있는 금융 라이프스타일: 카페에서 스마트폰으로 자산 성장을 확인하며 미소 짓는 직장인',
      imageStyleKeywords: ['스마트 라이프', '금융 실천', '성공적인 저축', '화사한 카페'],
      suggestedLayout: 'split_top_image',
      imageUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=1200&q=85',
    },
  ],
};
