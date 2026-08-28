import { getSmartTopicPhoto } from './photoMatcher';

/**
 * High-Resolution Photo-to-Visual Provider
 * Replaces dummy SVG synthesis with authentic, high-definition topic photos.
 */
export function generatePromptAccurateDataUrl(
  prompt: string,
  slideNumber: number = 1,
  _themeId: string = 'modern_blue'
): string {
  return getSmartTopicPhoto({
    headline: prompt,
    body: prompt,
    slideNumber,
  });
}
