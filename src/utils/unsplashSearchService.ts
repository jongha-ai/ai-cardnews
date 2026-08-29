/**
 * Stock Image Matcher v2: Unsplash Search Service
 * Handles live Unsplash search queries, orientation mapping, multi-stage retry (primary -> secondary -> fallback),
 * photo ID deduplication, and attribution metadata extraction.
 */

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

export interface StockSearchResult {
  queryUsed: string;
  matchSource: 'primary' | 'secondary' | 'fallback';
  totalFound: number;
  candidateCountBeforeFilter: number;
  candidateCountAfterFilter: number;
  selectedPhotoCandidate: StockCandidatePhoto | null;
  candidatePhotos: StockCandidatePhoto[];
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
 * Core Stock Image Matcher Pipeline with Primary -> Secondary -> Fallback and Photo ID Deduplication
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

  // 1. First Attempt: Search with primary_keyword
  if (primaryQuery) {
    try {
      const { total, results } = await executeUnsplashSearchQuery(primaryQuery, accessKey, orientation);
      const filtered = results.filter((p) => !usedIdSet.has(p.id));

      if (filtered.length > 0) {
        const candidates = filtered.map(formatUnsplashCandidate);
        return {
          queryUsed: primaryQuery,
          matchSource: 'primary',
          totalFound: total,
          candidateCountBeforeFilter: results.length,
          candidateCountAfterFilter: candidates.length,
          selectedPhotoCandidate: candidates[0],
          candidatePhotos: candidates,
        };
      }
    } catch (err: any) {
      console.warn(`[Unsplash Matcher] Primary query "${primaryQuery}" search failed:`, err.message);
    }
  }

  // 2. Second Attempt: Search with secondary_keyword (if primary yielded 0 non-duplicate candidates)
  if (secondaryQuery && secondaryQuery !== primaryQuery) {
    try {
      const { total, results } = await executeUnsplashSearchQuery(secondaryQuery, accessKey, orientation);
      const filtered = results.filter((p) => !usedIdSet.has(p.id));

      if (filtered.length > 0) {
        const candidates = filtered.map(formatUnsplashCandidate);
        return {
          queryUsed: secondaryQuery,
          matchSource: 'secondary',
          totalFound: total,
          candidateCountBeforeFilter: results.length,
          candidateCountAfterFilter: candidates.length,
          selectedPhotoCandidate: candidates[0],
          candidatePhotos: candidates,
        };
      }
    } catch (err: any) {
      console.warn(`[Unsplash Matcher] Secondary query "${secondaryQuery}" search failed:`, err.message);
    }
  }

  // 3. Fallback Scene Query: If both primary and secondary are empty or exhausted
  const fallbackQuery = 'minimal modern workspace desk daylight';
  try {
    const { total, results } = await executeUnsplashSearchQuery(fallbackQuery, accessKey, orientation);
    const filtered = results.filter((p) => !usedIdSet.has(p.id));
    const candidates = (filtered.length > 0 ? filtered : results).map(formatUnsplashCandidate);

    return {
      queryUsed: fallbackQuery,
      matchSource: 'fallback',
      totalFound: total,
      candidateCountBeforeFilter: results.length,
      candidateCountAfterFilter: candidates.length,
      selectedPhotoCandidate: candidates[0] || null,
      candidatePhotos: candidates,
    };
  } catch (err: any) {
    throw new Error(`Unsplash search failed for all candidate queries: ${err.message}`);
  }
}
