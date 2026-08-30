/**
 * Stock Image Matcher v2: Unsplash Search Service
 * Handles live Unsplash search queries, orientation mapping, multi-stage retry (primary -> secondary -> fallback),
 * photo ID deduplication, and attribution metadata extraction.
 */

import { rankPhotoCandidates } from './candidateRanker.js';

export interface UnsplashRawPhoto {
  id: string;
  width: number;
  height: number;
  description: string | null;
  alt_description: string | null;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  links: {
    download_location: string;
  };
  user: {
    id: string;
    username: string;
    name: string;
    links: {
      html: string;
    };
  };
}

export interface StockCandidatePhoto {
  id: string;
  width: number;
  height: number;
  description: string;
  alt_description: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  user: {
    name: string;
    username: string;
    profileUrl: string;
  };
  downloadLocation: string;
}

export interface StockSearchRequestParams {
  headline?: string;
  body?: string;
  slideType?: string;
  primary_keyword?: string;
  secondary_keyword?: string;
  aspectRatio?: string;
  usedPhotoIds?: string[];
}

export interface RankedPhotoCandidate {
  photo: StockCandidatePhoto;
  rankScore: {
    totalScore: number;
    hardReqPassed: boolean;
    reasons: string[];
    suitability: '매우 적합' | '적합' | '애매' | '부적합';
  };
  originalRank: number;
}

export interface StockSearchResult {
  queryUsed: string;
  matchSource: 'primary' | 'secondary' | 'simplified_primary' | 'simplified_secondary' | 'no_match';
  totalFound: number;
  candidateCountBeforeFilter: number;
  candidateCountAfterFilter: number;
  /** Legacy fallback field for backwards compatibility (defaults to recommendedPhoto or first ranked candidate) */
  selectedPhotoCandidate: StockCandidatePhoto | null;
  /** Raw candidate photos retrieved from Unsplash after deduplication */
  candidatePhotos: StockCandidatePhoto[];
  /** Relevance-ranked candidates sorted from best to worst with scoring breakdown */
  rankedCandidates: RankedPhotoCandidate[];
  /** High-confidence recommendation candidate (strictly populated ONLY when Top 1 score >= 80 AND hardReqPassed === true; otherwise null) */
  recommendedPhoto: StockCandidatePhoto | null;
}

/**
 * Maps card news aspect ratio to Unsplash search orientation
 */
export function getOrientationFromAspectRatio(aspectRatio?: string): 'squarish' | 'portrait' | 'landscape' | undefined {
  if (!aspectRatio) return 'squarish';
  if (aspectRatio === '1:1') return 'squarish';
  if (aspectRatio === '4:5' || aspectRatio === '9:16') return 'portrait';
  return 'squarish';
}

/**
 * Sanitizes keyword search phrase
 */
export function sanitizeSearchQuery(query?: string): string {
  if (!query || typeof query !== 'string') return '';
  return query
    .trim()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Formats a raw Unsplash photo into a clean StockCandidatePhoto object
 */
export function formatUnsplashCandidate(photo: UnsplashRawPhoto): StockCandidatePhoto {
  return {
    id: photo.id,
    width: photo.width,
    height: photo.height,
    description: photo.description || '',
    alt_description: photo.alt_description || '',
    urls: {
      raw: photo.urls.raw,
      full: photo.urls.full,
      regular: photo.urls.regular,
      small: photo.urls.small,
      thumb: photo.urls.thumb,
    },
    user: {
      name: photo.user?.name || 'Unsplash Contributor',
      username: photo.user?.username || '',
      profileUrl: photo.user?.links?.html || 'https://unsplash.com',
    },
    downloadLocation: photo.links?.download_location || '',
  };
}

/**
 * Performs a single HTTP search query to Unsplash API
 */
export async function executeUnsplashSearchQuery(
  query: string,
  accessKey: string,
  orientation?: 'squarish' | 'portrait' | 'landscape'
): Promise<{ total: number; results: UnsplashRawPhoto[] }> {
  const url = new URL('https://api.unsplash.com/search/photos');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', '15');
  url.searchParams.set('content_filter', 'high');
  if (orientation) {
    url.searchParams.set('orientation', orientation);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Client-ID ${accessKey.trim()}`,
      'Accept-Version': 'v1',
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Unsplash API search failed with status ${response.status}: ${errorText || response.statusText}`);
  }

  const data = await response.json();
  return {
    total: data.total || 0,
    results: Array.isArray(data.results) ? data.results : [],
  };
}

/**
 * Generalized Stopwords and Low-Information Placeholder Words in stock photography queries
 */
const LOW_INFO_AND_FILLER_WORDS = new Set([
  'a', 'an', 'the', 'in', 'on', 'at', 'with', 'for', 'to', 'from', 'of', 'by',
  'and', 'or', 'as', 'into', 'over', 'after', 'before', 'between', 'during',
  'person', 'people', 'man', 'woman', 'someone', 'human', 'doing', 'looking', 'examining',
  'sitting', 'standing', 'front', 'side', 'back', 'top', 'shot', 'photo', 'picture',
  'view', 'background', 'indoor', 'outdoor', 'overhead', 'fairy', 'tale', 'morning',
  'quiet', 'routine', 'monthly', 'annual', 'daily', 'electric', 'automatic', 'digital',
  'manual', 'casual', 'road', 'trip', 'couch', 'modern', 'cozy', 'daylight',
  'bright', 'clean', 'minimal', 'simple', 'beautiful', 'natural', 'warm',
  'nice', 'great', 'fresh', 'stylish', 'concept', 'space', 'luxury', 'super',
  'new', 'old', 'big', 'small', 'high', 'low', 'young', 'senior', 'professional', 'expert',
  'mobile', 'facial'
]);

/**
 * High-Information Core Objects & Concepts (Domain specific anchors)
 */
const HIGH_INFO_OBJECTS = new Set([
  'banking', 'smartphone', 'calculator', 'checklist', 'budget',
  'car', 'vehicle', 'trunk', 'luggage', 'yoga', 'skincare', 'serum', 'latte', 'coffee',
  'dumbbell', 'salad', 'engine', 'perfume', 'whiteboard', 'keys', 'key', 'house',
  'dog', 'puppy', 'cat', 'book', 'books', 'smarthome', 'device', 'devices',
  'clothing', 'rack', 'hanger', 'boutique', 'makeup', 'laptop', 'tablet'
]);

/**
 * Specific Actions (High information verbs)
 */
const SPECIFIC_ACTIONS = new Set([
  'packing', 'reviewing', 'calculating', 'meditating', 'meditate', 'pouring',
  'studying', 'reading', 'repairing', 'applying', 'lifting', 'brainstorming',
  'stretching', 'typing', 'cooking', 'shopping', 'playing', 'running', 'walking'
]);

/**
 * Specific Actors & Non-generic Roles
 */
const SPECIFIC_ACTORS = new Set([
  'family', 'barista', 'student', 'mother', 'child', 'toddler', 'mechanic',
  'team', 'doctor', 'chef', 'dog', 'puppy', 'cat', 'backpacker', 'traveler'
]);

/**
 * Specific Places & Settings
 */
const SPECIFIC_PLACES = new Set([
  'beach', 'sunset', 'library', 'cafe', 'park', 'gym', 'workshop',
  'kitchen', 'mountain', 'livingroom', 'living', 'room', 'nature'
]);

/**
 * Semantically simplifies a long descriptive query into 2~3 high-impact Unsplash search keywords,
 * prioritizing [High-Information Concepts/Objects + Specific Actions + Specific Actors/Places]
 * while stripping generic filler words, modifiers, and low-information human placeholders.
 */
export function simplifySearchQuery(query: string): string {
  if (!query || typeof query !== 'string') return '';
  const rawTokens = query
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);

  if (rawTokens.length <= 3) return rawTokens.join(' ');

  // 1. Filter out low information placeholders and stopwords
  const meaningfulTokens = rawTokens.filter((t) => !LOW_INFO_AND_FILLER_WORDS.has(t));
  if (meaningfulTokens.length <= 3) return meaningfulTokens.join(' ');

  // 2. Classify meaningful tokens
  const matchedObjects = meaningfulTokens.filter((t) => HIGH_INFO_OBJECTS.has(t));
  const matchedActions = meaningfulTokens.filter((t) => SPECIFIC_ACTIONS.has(t) || t.endsWith('ing'));
  const matchedActors = meaningfulTokens.filter((t) => SPECIFIC_ACTORS.has(t));
  const matchedPlaces = meaningfulTokens.filter((t) => SPECIFIC_PLACES.has(t));
  const otherTokens = meaningfulTokens.filter(
    (t) => !matchedObjects.includes(t) && !matchedActions.includes(t) && !matchedActors.includes(t) && !matchedPlaces.includes(t)
  );

  const selectedTokens: string[] = [];

  // Priority 1: Pick Specific Actor (e.g. family, barista, student, mother, mechanic)
  if (matchedActors.length > 0) {
    selectedTokens.push(matchedActors[0]);
  }

  // Priority 2: Pick Specific Action (e.g. packing, pouring, studying, reading, repairing, applying)
  if (matchedActions.length > 0 && selectedTokens.length < 3) {
    selectedTokens.push(matchedActions[0]);
  }

  // Priority 3: Pick High-Info Objects/Concepts (e.g. banking, smartphone, car, latte, skincare, book, engine)
  for (const obj of matchedObjects) {
    if (selectedTokens.length >= 3) break;
    if (!selectedTokens.includes(obj)) selectedTokens.push(obj);
  }

  // Priority 4: Pick Specific Place (e.g. beach, library, living, room)
  for (const place of matchedPlaces) {
    if (selectedTokens.length >= 3) break;
    if (!selectedTokens.includes(place)) selectedTokens.push(place);
  }

  // Priority 5: Fallback from remaining meaningful tokens
  for (const other of otherTokens) {
    if (selectedTokens.length >= 3) break;
    if (!selectedTokens.includes(other)) selectedTokens.push(other);
  }

  return selectedTokens.slice(0, 3).join(' ');
}

/**
 * Core Stock Image Matcher Pipeline with Primary -> Secondary -> Simplified -> NO_MATCH
 */
export async function searchStockImageCandidates(
  params: StockSearchRequestParams,
  accessKey: string
): Promise<StockSearchResult> {
  if (!accessKey || accessKey.trim() === '') {
    throw new Error('UNSPLASH_ACCESS_KEY is not configured on the server.');
  }

  const orientation = getOrientationFromAspectRatio(params.aspectRatio);
  const usedIdSet = new Set<string>(params.usedPhotoIds || []);

  const primaryQuery = sanitizeSearchQuery(params.primary_keyword);
  const secondaryQuery = sanitizeSearchQuery(params.secondary_keyword);

  // Helper search attempt
  const attemptSearch = async (
    query: string,
    source: 'primary' | 'secondary' | 'simplified_primary' | 'simplified_secondary'
  ): Promise<StockSearchResult | null> => {
    if (!query) return null;
    try {
      const { total, results } = await executeUnsplashSearchQuery(query, accessKey, orientation);
      const filtered = results.filter((p) => !usedIdSet.has(p.id));

      if (filtered.length > 0) {
        const candidates = filtered.map(formatUnsplashCandidate);

        // 1. Rank candidates using Candidate Ranker
        const ranked = rankPhotoCandidates(candidates, query, {
          headline: params.headline,
          body: params.body,
          slideType: params.slideType,
          primary_keyword: params.primary_keyword,
          secondary_keyword: params.secondary_keyword,
        });

        const rankedCandidates: RankedPhotoCandidate[] = ranked.map((r) => ({
          photo: r.photo,
          rankScore: {
            totalScore: r.rankScore.totalScore,
            hardReqPassed: r.rankScore.breakdown.hardReqPassed,
            reasons: r.rankScore.reasons,
            suitability: r.rankScore.suitability,
          },
          originalRank: r.originalRank,
        }));

        // 2. Compute recommendedPhoto (Score >= 80 && hardReqPassed === true)
        let recommendedPhoto: StockCandidatePhoto | null = null;
        if (rankedCandidates.length > 0) {
          const top1 = rankedCandidates[0];
          if (top1.rankScore.totalScore >= 80 && top1.rankScore.hardReqPassed) {
            recommendedPhoto = top1.photo;
          }
        }

        return {
          queryUsed: query,
          matchSource: source,
          totalFound: total,
          candidateCountBeforeFilter: results.length,
          candidateCountAfterFilter: candidates.length,
          selectedPhotoCandidate: recommendedPhoto || rankedCandidates[0]?.photo || candidates[0],
          candidatePhotos: candidates,
          rankedCandidates,
          recommendedPhoto,
        };
      }
    } catch (err: any) {
      console.warn(`[Unsplash Matcher] ${source} query "${query}" search failed:`, err.message);
    }
    return null;
  };

  let bestFallbackResult: StockSearchResult | null = null;

  const updateBestFallback = (candidateResult: StockSearchResult) => {
    if (!bestFallbackResult) {
      bestFallbackResult = candidateResult;
      return;
    }

    const currentTop = candidateResult.rankedCandidates[0];
    const bestTop = bestFallbackResult.rankedCandidates[0];

    const currentScore = currentTop ? currentTop.rankScore.totalScore : -1;
    const bestScore = bestTop ? bestTop.rankScore.totalScore : -1;

    if (currentScore > bestScore) {
      bestFallbackResult = candidateResult;
    } else if (currentScore === bestScore) {
      const currentHardReq = currentTop?.rankScore.hardReqPassed ?? false;
      const bestHardReq = bestTop?.rankScore.hardReqPassed ?? false;
      if (currentHardReq && !bestHardReq) {
        bestFallbackResult = candidateResult;
      }
    }
  };

  // 1. Primary query search
  if (primaryQuery) {
    const res = await attemptSearch(primaryQuery, 'primary');
    if (res) {
      if (res.recommendedPhoto) return res;
      updateBestFallback(res);
    }
  }

  // 2. Secondary query search
  if (secondaryQuery && secondaryQuery !== primaryQuery) {
    const res = await attemptSearch(secondaryQuery, 'secondary');
    if (res) {
      if (res.recommendedPhoto) return res;
      updateBestFallback(res);
    }
  }

  // 3. Simplified primary query (2~3 words)
  const simplifiedPrimary = simplifySearchQuery(primaryQuery);
  if (simplifiedPrimary && simplifiedPrimary !== primaryQuery && simplifiedPrimary !== secondaryQuery) {
    const res = await attemptSearch(simplifiedPrimary, 'simplified_primary');
    if (res) {
      if (res.recommendedPhoto) return res;
      updateBestFallback(res);
    }
  }

  // 4. Simplified secondary query (2~3 words)
  const simplifiedSecondary = simplifySearchQuery(secondaryQuery);
  if (
    simplifiedSecondary &&
    simplifiedSecondary !== secondaryQuery &&
    simplifiedSecondary !== simplifiedPrimary &&
    simplifiedSecondary !== primaryQuery
  ) {
    const res = await attemptSearch(simplifiedSecondary, 'simplified_secondary');
    if (res) {
      if (res.recommendedPhoto) return res;
      updateBestFallback(res);
    }
  }

  // 5. If candidates were found in any stage but none met high-confidence threshold (recommendedPhoto === null)
  if (bestFallbackResult) {
    return bestFallbackResult;
  }

  // 6. NO MATCH: No random workspace/cafe images injected
  return {
    queryUsed: primaryQuery || secondaryQuery || '',
    matchSource: 'no_match',
    totalFound: 0,
    candidateCountBeforeFilter: 0,
    candidateCountAfterFilter: 0,
    selectedPhotoCandidate: null,
    candidatePhotos: [],
    rankedCandidates: [],
    recommendedPhoto: null,
  };
}
