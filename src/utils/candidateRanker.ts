/**
 * Stock Image Matcher v2: Candidate Ranker
 * Evaluates and ranks Unsplash candidate photos based on semantic scene requirements:
 * [Role-Based Dynamic Anchors: Subject/Actor + Action + Place + Object + Hard Requirements]
 * 
 * CRITICAL RULE: Substring matching is strictly prohibited!
 * All word comparisons must use exact token boundary matching (\bword\b or Token Set).
 */

import { StockCandidatePhoto } from './unsplashSearchService';

export interface SceneRequirements {
  subjects: string[];
  actions: string[];
  places: string[];
  objects: string[];
  avoids: string[];
  hardRequiredObjects?: string[];
  hardRequiredActions?: string[];
  coreObjects?: string[];
  coreActors?: string[];
}

export interface CandidateRankScore {
  candidateId: string;
  totalScore: number; // 0 ~ 100
  breakdown: {
    subjectScore: number; // Max 25
    actionScore: number; // Max 30 (High weight)
    objectScore: number; // Max 30 (High weight)
    placeScore: number; // Max 15
    penalties: number; // Negative value
    hardReqPassed: boolean;
  };
  reasons: string[];
  suitability: '매우 적합' | '적합' | '애매' | '부적합';
}

export interface SlideContextForRanking {
  headline?: string;
  body?: string;
  slideType?: string;
  primary_keyword?: string;
  secondary_keyword?: string;
}

// 1. Role-Based Lexicon (Strict separation: furniture desk/table/chair is PLACES, not core objects)
export const KNOWN_OBJECTS = new Set([
  'smartphone', 'phone', 'app', 'credit', 'card', 'wallet', 'money', 'coins', 'piggy', 'bank',
  'refrigerator', 'fridge', 'food', 'pasta', 'dish', 'vegetables', 'coffee', 'latte', 'espresso',
  'bag', 'laptop', 'whiteboard', 'diagram', 'jars', 'pantry', 'scissors', 'cup', 'calculator',
  'calendar', 'screen', 'microphone', 'note', 'sticker', 'coupon', 'paper', 'notebook', 'device',
  'car', 'vehicle', 'luggage', 'speaker', 'checklist', 'document', 'chart'
]);

export const KNOWN_ACTORS = new Set([
  'person', 'people', 'student', 'students', 'teacher', 'children', 'teenager', 'barista',
  'owner', 'professional', 'family', 'man', 'woman', 'worker', 'human', 'hands', 'user', 'someone',
  'chef', 'stylist', 'child'
]);

export const KNOWN_ACTIONS = new Set([
  'typing', 'holding', 'cooking', 'chopping', 'meditating', 'breathing', 'sitting', 'talking',
  'smiling', 'planning', 'recording', 'search', 'cutting', 'check', 'checking', 'use', 'using',
  'touch', 'touching', 'browse', 'browsing', 'review', 'reviewing', 'calculate', 'calculating',
  'analyze', 'analyzing', 'pack', 'packing', 'load', 'loading', 'yoga', 'meditate', 'stretch',
  'stretching', 'workout', 'learning', 'drawing', 'raising'
]);

export const KNOWN_PLACES = new Set([
  'office', 'cafe', 'classroom', 'kitchen', 'bedroom', 'livingroom', 'salon', 'room', 'mountain',
  'nature', 'counter', 'desk', 'table', 'chair', 'beach', 'sunset', 'sand', 'ocean', 'sea', 'coast',
  'workspace', 'interior', 'school', 'shop', 'store'
]);

export const KNOWN_MODIFIERS = new Set([
  'fresh', 'happy', 'cozy', 'modern', 'peaceful', 'confident', 'smiling', 'delicious', 'clean',
  'colorful', 'organized', 'young', 'diverse', 'full', 'open', 'two', 'group', 'warm', 'wooden'
]);

// 2. Strict Conservative Synonym Map (Strict equivalents only, no loose contextual relations)
export const CONSERVATIVE_SYNONYMS: Record<string, string[]> = {
  person: ['man', 'woman', 'people', 'worker', 'someone', 'person', 'human', 'businessman', 'businesswoman'],
  student: ['students', 'teenager', 'learner', 'student'],
  teacher: ['teacher', 'instructor', 'tutor', 'mentor', 'educator'],
  laptop: ['laptop', 'macbook', 'computer', 'notebook'],
  food: ['food', 'meal', 'dish', 'vegetables', 'ingredients', 'produce', 'fruit', 'snack', 'dinner', 'plate', 'pasta'],
  refrigerator: ['refrigerator', 'fridge'],
  fridge: ['refrigerator', 'fridge'],
  coffee: ['coffee', 'latte', 'espresso', 'cappuccino'],
  latte: ['coffee', 'latte', 'espresso', 'cappuccino'],
  espresso: ['coffee', 'latte', 'espresso', 'cappuccino'],
  pantry: ['pantry', 'groceries', 'food'],
  phone: ['phone', 'smartphone', 'mobile', 'cellphone', 'iphone', 'android'],
  smartphone: ['phone', 'smartphone', 'mobile', 'cellphone', 'iphone', 'android'],
  screen: ['screen', 'display', 'monitor', 'app', 'ui'],
  document: ['document', 'paper', 'notes', 'notepad', 'notebook', 'planner', 'plan', 'chart'],
  whiteboard: ['whiteboard', 'planner', 'notebook', 'notepad', 'diagram', 'chart'],
  bag: ['bag', 'package', 'packaging', 'kraft', 'box'],
  meditate: ['meditate', 'meditating', 'meditation', 'yoga', 'breathing'],
  meditating: ['meditate', 'meditating', 'meditation', 'yoga', 'breathing'],
  scissors: ['scissors', 'shears'],
};

export function expandTokensWithSynonyms(target: string): string[] {
  const lower = target.toLowerCase();
  if (CONSERVATIVE_SYNONYMS[lower]) return [lower, ...CONSERVATIVE_SYNONYMS[lower]];
  return [lower];
}

/**
 * Tokenizes a string into a clean lowercase word set for exact word matching
 */
export function extractWordTokens(text?: string | null): Set<string> {
  if (!text) return new Set();
  const words = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
  return new Set(words);
}

/**
 * Checks whether any word or phrase in targets matches exactly in tokens or via word-boundary regex
 */
export function matchesExactKeyword(tokens: Set<string>, fullText: string, targets: string[]): boolean {
  for (const target of targets) {
    const trimmed = target.trim().toLowerCase();
    if (!trimmed) continue;
    if (trimmed.includes(' ')) {
      const escaped = trimmed.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      if (regex.test(fullText)) return true;
    } else {
      if (tokens.has(trimmed)) return true;
    }
  }
  return false;
}

/**
 * Extracts semantic scene requirements and role-based anchors from query and slide context
 */
export function extractSceneRequirements(
  query: string,
  context?: SlideContextForRanking
): SceneRequirements {
  const fullText = (query + ' ' + (context?.primary_keyword || '') + ' ' + (context?.secondary_keyword || '')).toLowerCase();
  const tokens = extractWordTokens(fullText);

  const subjects: string[] = [];
  const actions: string[] = [];
  const places: string[] = [];
  const objects: string[] = [];
  const avoids: string[] = ['illustration', 'drawing', 'vector', 'sketch', 'render', '3d render'];
  const hardRequiredObjects: string[] = [];
  const hardRequiredActions: string[] = [];
  const coreObjects: string[] = [];
  const coreActors: string[] = [];

  const queryWords = query.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter((w) => w.length > 1);

  for (const w of queryWords) {
    if (KNOWN_OBJECTS.has(w)) {
      objects.push(w);
      coreObjects.push(w);
    } else if (KNOWN_ACTORS.has(w)) {
      subjects.push(w);
      coreActors.push(w);
    } else if (KNOWN_ACTIONS.has(w)) {
      actions.push(w);
    } else if (KNOWN_PLACES.has(w)) {
      places.push(w);
    }
  }

  // Preserve compatibility for explicit avoid rules
  if (tokens.has('smartphone') || tokens.has('phone') || tokens.has('mobile')) {
    avoids.push('laptop only', 'keyboard only', 'imac only');
  }

  return {
    subjects,
    actions,
    places,
    objects,
    avoids,
    hardRequiredObjects,
    hardRequiredActions,
    coreObjects,
    coreActors,
  };
}

/**
 * Deterministic exact-token relevance ranker for an Unsplash photo candidate
 */
export function evaluateCandidatePhoto(
  photo: StockCandidatePhoto,
  requirements: SceneRequirements,
  originalQuery: string
): CandidateRankScore {
  const rawText = `${photo.alt_description || ''} ${photo.description || ''}`.toLowerCase();
  const photoTokens = extractWordTokens(rawText);
  const reasons: string[] = [];

  let subjectScore = 20;
  let actionScore = 20;
  let objectScore = 20;
  let placeScore = 10;
  let penalties = 0;
  let hardReqPassed = true;

  // 1. Subject/Actor match (Exact token match with conservative synonym support)
  const matchedActors = (requirements.coreActors || requirements.subjects || []).filter((a) => {
    const syns = expandTokensWithSynonyms(a);
    return matchesExactKeyword(photoTokens, rawText, syns);
  });

  if ((requirements.coreActors && requirements.coreActors.length > 0) || requirements.subjects.length > 0) {
    if (matchedActors.length > 0) {
      subjectScore = 25;
      reasons.push(`+25 인물/주체 일치 (${matchedActors.join(', ')})`);
    } else {
      subjectScore = 10;
      reasons.push('-10 사진 텍스트에 요구된 인물 부재');
    }
  } else {
    subjectScore = 20;
  }

  // 2. Action match (Exact token match with conservative synonym support)
  const matchedActions = requirements.actions.filter((a) => {
    const syns = expandTokensWithSynonyms(a);
    return matchesExactKeyword(photoTokens, rawText, syns);
  });

  if (requirements.actions.length > 0) {
    if (matchedActions.length > 0) {
      actionScore = 30;
      reasons.push(`+30 핵심 행동 일치 (${matchedActions.join(', ')})`);
    } else {
      actionScore = 15;
      reasons.push('-5 핵심 행동 미포함');
    }
  } else {
    actionScore = 20;
  }

  // 3. Object match (Exact token match with conservative synonym support, High weight)
  const matchedObjects = (requirements.coreObjects || requirements.objects || []).filter((o) => {
    const syns = expandTokensWithSynonyms(o);
    return matchesExactKeyword(photoTokens, rawText, syns);
  });

  if ((requirements.coreObjects && requirements.coreObjects.length > 0) || requirements.objects.length > 0) {
    if (matchedObjects.length > 0) {
      objectScore = 30;
      reasons.push(`+30 핵심 객체 일치 (${matchedObjects.join(', ')})`);
    } else {
      objectScore = 5;
      reasons.push('-15 핵심 객체 미포함');
    }
  } else {
    objectScore = 20;
  }

  // 4. Place match (Exact token match)
  const matchedPlaces = requirements.places.filter((p) => {
    const syns = expandTokensWithSynonyms(p);
    return matchesExactKeyword(photoTokens, rawText, syns);
  });

  if (requirements.places.length > 0) {
    if (matchedPlaces.length > 0) {
      placeScore = 15;
      reasons.push(`+15 장소 일치 (${matchedPlaces[0]})`);
    } else {
      placeScore = 5;
    }
  } else {
    placeScore = 10;
  }

  // 5. Hard Negative / Core Anchor Validation
  const coreObjects = requirements.coreObjects || [];
  const coreActors = requirements.coreActors || [];
  const hasCoreExpectation = coreObjects.length > 0 || coreActors.length > 0;
  const matchedCoreCount = matchedObjects.length + matchedActors.length;

  const hasFoodIntent = coreObjects.includes('food') || coreObjects.includes('pantry');
  const hasBeverageIntent = coreObjects.includes('coffee') || coreObjects.includes('latte') || coreObjects.includes('espresso');

  if (hasFoodIntent && !matchedObjects.includes('food') && !matchedObjects.includes('pantry')) {
    hardReqPassed = false;
    reasons.push('Hard Negative: 식재료/음식 맥락 불일치 (Cap 50)');
  } else if (hasBeverageIntent && !matchedObjects.includes('coffee') && !matchedObjects.includes('latte') && !matchedObjects.includes('espresso')) {
    hardReqPassed = false;
    reasons.push('Hard Negative: 커피/음료 맥락 불일치 (Cap 50)');
  } else if (hasCoreExpectation && matchedCoreCount === 0) {
    hardReqPassed = false;
    reasons.push(`Hard Negative: 핵심 Entity [${[...coreObjects, ...coreActors].join('/')}] 0개 일치 (Cap 50)`);
  }

  // 6. Avoid keyword penalty
  for (const avoid of requirements.avoids) {
    if (matchesExactKeyword(photoTokens, rawText, [avoid])) {
      penalties -= 25;
      reasons.push(`-25 비권장 요소 감점 (${avoid})`);
    }
  }

  const rawTotal = subjectScore + actionScore + objectScore + placeScore + penalties;
  let totalScore = Math.max(0, Math.min(100, rawTotal));
  if (!hardReqPassed) {
    totalScore = Math.min(totalScore, 50); // Cap at 50 to strictly prevent false positives
  }

  let suitability: '매우 적합' | '적합' | '애매' | '부적합' = '부적합';
  if (totalScore >= 80 && hardReqPassed) suitability = '매우 적합';
  else if (totalScore >= 60 && hardReqPassed) suitability = '적합';
  else if (totalScore >= 40) suitability = '애매';
  else suitability = '부적합';

  return {
    candidateId: photo.id,
    totalScore,
    breakdown: {
      subjectScore,
      actionScore,
      objectScore,
      placeScore,
      penalties,
      hardReqPassed,
    },
    reasons,
    suitability,
  };
}

/**
 * Sorts candidates by relevance score and returns Top 5 shortlist.
 * On equal scores, preserves original Unsplash natural ranking order.
 */
export function rankPhotoCandidates(
  candidates: StockCandidatePhoto[],
  query: string,
  context?: SlideContextForRanking
): Array<{ photo: StockCandidatePhoto; rankScore: CandidateRankScore; originalRank: number }> {
  const requirements = extractSceneRequirements(query, context);

  return candidates
    .map((photo, index) => ({
      photo,
      originalRank: index + 1,
      rankScore: evaluateCandidatePhoto(photo, requirements, query),
    }))
    .sort((a, b) => {
      if (b.rankScore.totalScore !== a.rankScore.totalScore) {
        return b.rankScore.totalScore - a.rankScore.totalScore;
      }
      return a.originalRank - b.originalRank; // Preserves Unsplash natural rank on ties
    });
}
