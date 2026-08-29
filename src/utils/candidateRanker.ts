/**
 * Stock Image Matcher v2: Candidate Ranker
 * Evaluates and ranks Unsplash candidate photos based on semantic scene requirements:
 * [Subject + Action + Place + Object + Hard Requirements]
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
      // Multi-word phrase: use word boundary regex
      const escaped = trimmed.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      if (regex.test(fullText)) return true;
    } else {
      // Single word: check exact token in Set
      if (tokens.has(trimmed)) return true;
    }
  }
  return false;
}

/**
 * Extracts scene requirements and hard requirements from query and slide context
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

  // 1. Subject extraction (Exact token match)
  if (['person', 'people', 'man', 'woman', 'worker', 'human', 'hands', 'user', 'family', 'someone'].some((s) => tokens.has(s))) {
    subjects.push('person', 'people', 'man', 'woman', 'worker', 'hands', 'family');
  }

  // 2. Action extraction
  if (['check', 'checking', 'use', 'using', 'touch', 'touching', 'browse', 'browsing', 'hold', 'holding'].some((a) => tokens.has(a))) {
    actions.push('check', 'checking', 'using', 'holding', 'touching', 'browsing');
  }
  if (['review', 'reviewing', 'calculate', 'calculating', 'plan', 'planning', 'analyze', 'analyzing'].some((a) => tokens.has(a))) {
    actions.push('review', 'reviewing', 'calculating', 'plan', 'planning', 'analyzing');
    hardRequiredActions.push('review', 'reviewing', 'calculating', 'calculat', 'plan', 'budget', 'document');
  }
  if (['pack', 'packing', 'load', 'loading', 'travel', 'trip'].some((a) => tokens.has(a))) {
    actions.push('pack', 'packing', 'load', 'loading', 'luggage', 'trip');
    hardRequiredActions.push('pack', 'packing', 'load', 'loading', 'luggage');
  }
  if (['yoga', 'meditate', 'meditating', 'stretch', 'stretching', 'pose', 'workout'].some((a) => tokens.has(a))) {
    actions.push('yoga', 'meditation', 'stretch', 'pose', 'workout');
    hardRequiredActions.push('yoga', 'meditation', 'stretch', 'pose');
  }

  // 3. Object extraction
  if (['smartphone', 'mobile', 'phone', 'app', 'banking'].some((o) => tokens.has(o))) {
    objects.push('phone', 'smartphone', 'mobile', 'app', 'screen', 'banking');
    hardRequiredObjects.push('phone', 'smartphone', 'mobile', 'app', 'banking');
    avoids.push('laptop only', 'keyboard only', 'imac only');
  }
  if (['calculator', 'checklist', 'document', 'paper', 'budget'].some((o) => tokens.has(o))) {
    objects.push('calculator', 'checklist', 'document', 'paper', 'notebook', 'notes');
    hardRequiredObjects.push('calculator', 'checklist', 'document', 'paper', 'notebook');
  }
  if (['speaker', 'device', 'devices', 'smarthome'].some((o) => tokens.has(o)) || fullText.includes('smart home')) {
    objects.push('speaker', 'device', 'smart home', 'gadget');
  }
  if (['car', 'trunk', 'vehicle', 'ev', 'automobile'].some((o) => tokens.has(o))) {
    objects.push('car', 'trunk', 'vehicle', 'automobile', 'hatchback', 'suv', 'boot');
    hardRequiredObjects.push('car', 'trunk', 'vehicle', 'automobile', 'suv');
  }

  // 4. Place extraction
  if (['office', 'desk', 'workspace', 'table'].some((p) => tokens.has(p))) {
    places.push('office', 'desk', 'workspace', 'table');
  }
  if (['livingroom', 'home', 'cozy', 'room'].some((p) => tokens.has(p)) || fullText.includes('living room')) {
    places.push('living room', 'room', 'couch', 'sofa', 'home', 'interior');
  }
  if (['beach', 'sunset', 'sand', 'ocean', 'seashore', 'sea', 'coast'].some((p) => tokens.has(p))) {
    places.push('beach', 'sunset', 'sand', 'ocean', 'coast', 'sea');
  }

  return { subjects, actions, places, objects, avoids, hardRequiredObjects, hardRequiredActions };
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

  let subjectScore = 0;
  let actionScore = 0;
  let objectScore = 0;
  let placeScore = 0;
  let penalties = 0;
  let hardReqPassed = true;

  // 1. Subject match (Exact token match)
  if (requirements.subjects.length > 0) {
    const hasSubject = matchesExactKeyword(photoTokens, rawText, requirements.subjects);
    if (hasSubject) {
      subjectScore = 25;
      reasons.push('+25 인물/주체 일치');
    } else {
      penalties -= 15;
      reasons.push('-15 사진 텍스트에 인물 부재');
    }
  } else {
    subjectScore = 20;
  }

  // 2. Action match (Exact token match, High weight)
  if (requirements.actions.length > 0) {
    const matchedActions = requirements.actions.filter((a) => matchesExactKeyword(photoTokens, rawText, [a]));
    if (matchedActions.length > 0) {
      actionScore = Math.min(30, matchedActions.length * 15 + 10);
      reasons.push(`+${actionScore} 핵심 행동 일치 (${matchedActions.slice(0, 2).join(', ')})`);
    } else {
      penalties -= 10;
      reasons.push('-10 핵심 행동 미포함');
    }
  } else {
    actionScore = 20;
  }

  // 3. Object match (Exact token match, High weight)
  if (requirements.objects.length > 0) {
    const matchedObjects = requirements.objects.filter((o) => matchesExactKeyword(photoTokens, rawText, [o]));
    if (matchedObjects.length > 0) {
      objectScore = Math.min(30, matchedObjects.length * 15 + 10);
      reasons.push(`+${objectScore} 핵심 객체 일치 (${matchedObjects.slice(0, 2).join(', ')})`);
    } else {
      penalties -= 15;
      reasons.push('-15 핵심 객체 미포함');
    }
  } else {
    objectScore = 20;
  }

  // 4. Place match (Exact token match)
  if (requirements.places.length > 0) {
    const matchedPlaces = requirements.places.filter((p) => matchesExactKeyword(photoTokens, rawText, [p]));
    if (matchedPlaces.length > 0) {
      placeScore = 15;
      reasons.push(`+15 장소 일치 (${matchedPlaces[0]})`);
    } else {
      placeScore = 5;
    }
  } else {
    placeScore = 10;
  }

  // 5. Hard Requirements validation
  if (requirements.hardRequiredObjects && requirements.hardRequiredObjects.length > 0) {
    const hasHardObj = matchesExactKeyword(photoTokens, rawText, requirements.hardRequiredObjects);
    if (!hasHardObj) {
      hardReqPassed = false;
      penalties -= 20;
      reasons.push('-20 필수 객체(Hard Requirement) 누락');
    }
  }
  if (requirements.hardRequiredActions && requirements.hardRequiredActions.length > 0) {
    const hasHardAction = matchesExactKeyword(photoTokens, rawText, requirements.hardRequiredActions);
    if (!hasHardAction) {
      hardReqPassed = false;
      penalties -= 15;
      reasons.push('-15 필수 행동(Hard Requirement) 누락');
    }
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
    totalScore = Math.min(totalScore, 40); // Cap at 40 to prevent misleading high score
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
