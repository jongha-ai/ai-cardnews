export type AspectRatio = '1:1' | '4:5' | '9:16';

export type CardThemeId = 
  | 'modern_blue'
  | 'dark_tech'
  | 'warm_sunset'
  | 'editorial_chic'
  | 'pastel_soft'
  | 'vibrant_energy'
  | 'clean_mono'
  | 'forest_nature';

export interface CardTheme {
  id: CardThemeId;
  name: string;
  nameEn: string;
  bgGradient: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentBg: string;
  badgeBg: string;
  badgeText: string;
  border: string;
  fontFamily: string;
}

export type SlideType = 'cover' | 'problem' | 'body' | 'stat' | 'tip' | 'quote' | 'summary' | 'cta';

export type SlideLayout = 
  | 'split_top_text'
  | 'split_top_image'
  | 'full_bg_overlay'
  | 'stat_highlight'
  | 'quote_focus'
  | 'card_centered';

export interface StockPhotoKeywords {
  primary_keyword: string;
  secondary_keyword: string;
}

export interface CardSlide {
  id: string;
  slideNumber: number;
  slideType: SlideType;
  badgeText: string;
  headline: string;
  body: string;
  highlightWords: string[];
  imagePrompt: string;
  imagePromptKorean: string;
  imageStyleKeywords: string[];
  suggestedLayout: SlideLayout;
  imageUrl?: string;
  stockPhotoKeywords?: StockPhotoKeywords;
  imageFit?: 'cover' | 'contain';
  imagePosition?: 'top' | 'center' | 'bottom';
  customBgColor?: string;
  customTextColor?: string;
  customAccentColor?: string;
  customHeadlineFont?: string;
  customBodyFont?: string;
  isGeneratingImage?: boolean;
}

export interface CardNewsProject {
  id: string;
  title: string;
  subTitle: string;
  category: string;
  topic: string;
  purpose: string;
  targetAudience: string;
  tone: string;
  tags: string[];
  aspectRatio: AspectRatio;
  themeId: CardThemeId;
  headlineFont?: string;
  bodyFont?: string;
  caption?: string;
  slides: CardSlide[];
  createdAt: string;
}

export interface GenerateCardNewsRequest {
  topic: string;
  purpose?: string;
  targetAudience?: string;
  tone?: string;
  slideCount?: number;
  aspectRatio?: AspectRatio;
  themeId?: CardThemeId;
  customNotes?: string;
}

export interface RefineSlideRequest {
  slide: CardSlide;
  action: 'more_punchy' | 'more_professional' | 'shorter' | 'new_image_prompt' | 'rewrite_body';
  projectContext?: {
    topic: string;
    targetAudience?: string;
    tone?: string;
  };
}

export interface StorySlideSuggestion {
  id: string;
  slideNumber: number;
  originalRole: SlideType;
  suggestedRole: SlideType;
  badgeText: string;
  headline: string;
  body: string;
  highlightWords: string[];
  changeReason: string;
}

export interface StoryDirectorAnalysis {
  overallSummary: string;
  duplicateIssues: string[];
  flowIssues: string[];
  ctaIssue: string;
  storyStrategy: string;
  suggestions: StorySlideSuggestion[];
}

export interface StoryDirectorRequest {
  topic: string;
  purpose?: string;
  targetAudience?: string;
  tone?: string;
  slides: CardSlide[];
}

