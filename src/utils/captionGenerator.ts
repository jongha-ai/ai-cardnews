import { CardSlide } from '../types';

/**
 * Generates an Instagram 4-stage high-conversion caption
 * 
 * 1. ⚡ 1~2초 훅킹 & 공감 도입부 (더보기 누르기 전 첫 2줄)
 * 2. 📌 카드뉴스 핵심 요약 & 실무 꿀팁 (1️⃣ 2️⃣ 3️⃣ 이모지 넘버링)
 * 3. 📢 행동 유도 (저장 / 공유 / 댓글 CTA)
 * 4. 🏷️ 타깃 최적화 해시태그 (10~15개)
 */
export function buildInstagramHighConvertingCaption(project: {
  title: string;
  subTitle?: string;
  topic?: string;
  targetAudience?: string;
  category?: string;
  tags?: string[];
  slides: CardSlide[];
  caption?: string;
}): string {
  if (project.caption && project.caption.trim().length > 20) {
    return project.caption.trim();
  }

  // 1. Hooking question & intro (Under 2 lines before "more")
  const titleClean = (project.title || '').replace(/^💰\s*|^✨\s*|^📌\s*|^🔥\s*/, '').trim();
  const subTitle = project.subTitle || '지금 바로 실천 가능한 핵심 가이드를 공개합니다.';
  
  const hookQuestion = `${titleClean}, 아직도 혼자 고민하고 계셨나요? ⏳\n\n${subTitle}`;

  // 2. Extract key points (format with 1️⃣, 2️⃣, 3️⃣)
  const contentSlides = (project.slides || []).filter(
    (s) => s.slideType !== 'cover'
  );
  const slidesToUse = contentSlides.length > 0 ? contentSlides : (project.slides || []);

  const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

  const pointsText = slidesToUse
    .slice(0, 5)
    .map((s, idx) => {
      const numEmoji = numberEmojis[idx] || `${idx + 1}️⃣`;
      const cleanHeadline = s.headline
        .replace(/^[0-9]+[단계|가지|\.]*\s*|^[✨|💰|📌|🔥|💡]\s*/g, '')
        .replace(/\n/g, ' ')
        .trim();
      const firstBodyLine = (s.body || '')
        .split('\n')[0]
        .replace(/^[•\-\*1-9\.]\s*/, '')
        .trim();

      return `${numEmoji} ${cleanHeadline}\n👉 ${firstBodyLine || '핵심 실천 포인트를 확인하고 바로 적용해보세요.'}`;
    })
    .join('\n\n');

  // 3. CTA
  const ctaSection = `━━━━━━━━━━━━━━━
💡 한 번 보고 넘기면 잊어버리기 쉽습니다.

📌 내일 바로 적용해보시려면 지금 [저장]해두세요!
💬 주변에 꼭 필요한 분들께 [공유]로 알려주세요.
🙋‍♂️ 더 궁금한 점이나 의견은 편하게 [댓글]로 남겨주세요!`;

  // 4. Target hashtags (10~15 optimized hashtags)
  const defaultTagList = [
    '#카드뉴스',
    '#실전팁',
    '#정보공유',
    '#노하우',
    '#성장루틴',
    '#생산성',
    '#트렌드',
    '#인사이트',
    '#자기계발',
    '#필수템',
    '#동기부여',
    '#비즈니스',
  ];

  const rawTopicWords = (project.topic || titleClean)
    .replace(/[^\w\s가-힣]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .map((w) => `#${w}`);

  const projectTags = (project.tags || []).map((t) => (t.startsWith('#') ? t : `#${t}`));
  const mergedTags = Array.from(new Set([...projectTags, ...rawTopicWords, ...defaultTagList])).slice(0, 15);
  const tagsText = mergedTags.join(' ');

  return `${hookQuestion}

━━━━━━━━━━━━━━━
${pointsText}

${ctaSection}

${tagsText}`;
}
