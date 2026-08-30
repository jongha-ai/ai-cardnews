/**
 * Server-Only Unsplash Integration Service
 * 
 * Strict Security & Architecture Rules:
 * 1. Server-side only: Never import into client-side bundles.
 * 2. Explicit access key injection: Always receives accessKey as a parameter.
 * 3. Fault isolation: Errors in Unsplash search/tracking never crash card news generation.
 * 4. Exact deduplication: usedPhotoIds accumulated sequentially per slide.
 * 5. Best-effort awaited download tracking: Awaited to prevent premature termination on Serverless,
 *    without throwing errors to the parent caller on tracking failure.
 */

import {
  searchStockImageCandidates,
  StockSearchRequestParams,
  StockSearchResult,
  StockCandidatePhoto,
  RankedPhotoCandidate,
} from '../utils/unsplashSearchService.js';
import { CardSlide, StockPhotoAttribution } from '../types.js';

export {
  searchStockImageCandidates,
  type StockSearchRequestParams,
  type StockSearchResult,
  type StockCandidatePhoto,
  type RankedPhotoCandidate,
};

/**
 * Tracks an Unsplash download event according to Unsplash API guidelines.
 * Best-effort server-side execution. Never throws an unhandled exception to caller.
 */
export async function trackUnsplashDownload(
  photoId: string,
  accessKey: string
): Promise<{ success: boolean; status: number; error?: string }> {
  if (!accessKey || accessKey.trim() === '') {
    return { success: false, status: 500, error: 'UNSPLASH_ACCESS_KEY is not configured.' };
  }

  // Strictly validate photoId format (alphanumeric, dashes, underscores, length 1~64)
  if (!photoId || typeof photoId !== 'string' || !/^[\w-]{1,64}$/.test(photoId)) {
    return { success: false, status: 400, error: 'Valid photoId is required.' };
  }

  try {
    const targetUrl = `https://api.unsplash.com/photos/${encodeURIComponent(photoId)}/download`;

    const response = await fetch(targetUrl, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
      },
    });

    if (!response.ok) {
      console.warn(`[Unsplash Tracking] Upstream download tracking failed for photo ${photoId} with status ${response.status}`);
      return {
        success: false,
        status: response.status === 404 ? 404 : 502,
        error: 'Upstream Unsplash download tracking failed',
      };
    }

    return { success: true, status: 200 };
  } catch (error: any) {
    console.error(`[Unsplash Tracking] Network or runtime error for photo ${photoId}:`, error.message);
    return { success: false, status: 500, error: error.message || 'Failed to track download.' };
  }
}

/**
 * Sequentially enriches card news slides with ranked Unsplash stock photos.
 * 
 * Rules:
 * - Sequential processing to strictly accumulate usedPhotoIds and eliminate duplicates.
 * - Only assigns photo if recommendedPhoto exists (Score >= 80 AND hardReqPassed === true).
 * - Leaves imageUrl: undefined on low confidence, NO_MATCH, or API errors (NO arbitrary fallback photos).
 * - Awaits download tracking per adopted photo with error isolation.
 */
export async function enrichSlidesWithRankedStockPhotos(
  slides: any[],
  aspectRatio: string = '1:1',
  accessKey: string
): Promise<CardSlide[]> {
  if (!slides || !Array.isArray(slides) || slides.length === 0) {
    return [];
  }

  // If no Access Key is configured, return clean slides without images (graceful bypass)
  if (!accessKey || accessKey.trim() === '') {
    console.warn('[Unsplash Enrichment] Access Key not provided. Skipping stock photo enrichment.');
    return slides.map((s, idx) => ({
      ...s,
      id: s.id || `slide-${Date.now()}-${idx}`,
      imageUrl: undefined,
      stockPhotoId: undefined,
      stockPhotoAttribution: undefined,
    }));
  }

  const usedPhotoIds: string[] = [];
  const enrichedSlides: CardSlide[] = [];

  for (let idx = 0; idx < slides.length; idx++) {
    const slide = slides[idx];
    const slideId = slide.id || `slide-${Date.now()}-${idx}`;

    try {
      const searchResult = await searchStockImageCandidates(
        {
          headline: slide.headline,
          body: slide.body,
          slideType: slide.slideType,
          primary_keyword: slide.stockPhotoKeywords?.primary_keyword,
          secondary_keyword: slide.stockPhotoKeywords?.secondary_keyword,
          aspectRatio,
          usedPhotoIds: [...usedPhotoIds],
        },
        accessKey
      );

      const recommended = searchResult.recommendedPhoto;

      if (recommended) {
        // 1. Accumulate used photo ID to prevent reuse in subsequent slides
        usedPhotoIds.push(recommended.id);

        const attribution: StockPhotoAttribution = {
          photographerName: recommended.user.name,
          photographerUsername: recommended.user.username,
          profileUrl: recommended.user.profileUrl,
          unsplashUrl: 'https://unsplash.com',
        };

        // 2. Best-effort awaited download tracking (non-blocking failure)
        try {
          await trackUnsplashDownload(recommended.id, accessKey);
        } catch (trackErr: any) {
          console.warn(`[Unsplash Auto-Track] Best-effort tracking error for slide #${idx + 1} (${recommended.id}):`, trackErr.message);
        }

        enrichedSlides.push({
          ...slide,
          id: slideId,
          imageUrl: recommended.urls.regular,
          stockPhotoId: recommended.id,
          stockPhotoAttribution: attribution,
        });
      } else {
        // Low confidence, NO_MATCH, or no candidate met high-confidence threshold
        enrichedSlides.push({
          ...slide,
          id: slideId,
          imageUrl: undefined,
          stockPhotoId: undefined,
          stockPhotoAttribution: undefined,
        });
      }
    } catch (slideErr: any) {
      console.warn(`[Unsplash Enrichment] Error enriching slide #${idx + 1}:`, slideErr.message);
      // Gracefully isolate error: provide slide with no image
      enrichedSlides.push({
        ...slide,
        id: slideId,
        imageUrl: undefined,
        stockPhotoId: undefined,
        stockPhotoAttribution: undefined,
      });
    }
  }

  return enrichedSlides;
}
