import React, { forwardRef, useState, useEffect } from 'react';
import { CardSlide, AspectRatio, CardTheme, SlideLayout } from '../types';
import { Sparkles, Quote, ChevronRight, Hash, Bookmark, ImageOff } from 'lucide-react';
import { getSmartTopicPhoto } from '../utils/photoMatcher';

const KOREAN_KEYWORD_TRANSLATIONS: Record<string, string> = {
  'minimalist': '미니멀',
  'minimal': '미니멀',
  'dynamic motion': '역동적 연출',
  'dynamic': '역동적',
  'motion': '역동적',
  'professional': '전문가 인사이트',
  'high contrast': '선명한 비주얼',
  'contrast': '고대비',
  'editorial photography': '에디토리얼 포토',
  'editorial': '에디토리얼',
  'photography': '고화질 포토',
  'photo': '포토',
  'clean daylight': '자연광',
  'daylight': '자연광',
  'natural light': '자연광',
  'studio lighting': '스튜디오 조명',
  'lighting': '스튜디오 조명',
  'sophisticated aesthetics': '감각적 무드',
  'aesthetic': '감각적 무드',
  'cinematic': '시네마틱',
  '3d rendering': '3D 렌더링',
  '3d': '3D 비주얼',
  'glassmorphism': '글래스모피즘',
  'dark tech': '다크 테크',
  'clean': '깔끔한 무드',
  'modern': '모던 스타일',
};

function formatKoreanKeyword(keyword: string): string {
  if (!keyword) return '';
  const trimmed = keyword.trim();
  const lower = trimmed.toLowerCase();
  if (KOREAN_KEYWORD_TRANSLATIONS[lower]) return KOREAN_KEYWORD_TRANSLATIONS[lower];
  for (const [eng, kor] of Object.entries(KOREAN_KEYWORD_TRANSLATIONS)) {
    if (lower.includes(eng)) return kor;
  }
  return trimmed;
}

interface CardSlideCanvasProps {
  slide?: CardSlide | null;
  theme?: CardTheme;
  aspectRatio?: AspectRatio;
  totalSlides?: number;
  projectCategory?: string;
  projectHeadlineFont?: string;
  projectBodyFont?: string;
  className?: string;
  isExporting?: boolean;
  onNextSlide?: () => void;
  onPrevSlide?: () => void;
  onOpenExport?: () => void;
}

export const CardSlideCanvas = forwardRef<HTMLDivElement, CardSlideCanvasProps>(
  (
    {
      slide,
      theme,
      aspectRatio = '1:1',
      totalSlides = 1,
      projectCategory = '',
      projectHeadlineFont,
      projectBodyFont,
      className = '',
      isExporting = false,
      onNextSlide,
      onPrevSlide,
      onOpenExport,
    },
    ref
  ) => {
    const [imageLoadFailed, setImageLoadFailed] = useState(false);
    const [fallbackImgUrl, setFallbackImgUrl] = useState<string | null>(null);

    // Reset image error state whenever the slide changes
    useEffect(() => {
      setImageLoadFailed(false);
      setFallbackImgUrl(null);
    }, [slide?.id, slide?.imageUrl, slide?.slideNumber]);

    // Fallback safe slide object in case slide is undefined
    const safeSlide: CardSlide = slide || {
      id: 'fallback-slide',
      slideNumber: 1,
      slideType: 'body',
      badgeText: 'INSIGHT 01',
      headline: '슬라이드 제목을 입력하세요',
      body: '슬라이드 본문 내용이 표시되는 영역입니다.',
      highlightWords: [],
      imagePrompt: '',
      imagePromptKorean: '',
      imageStyleKeywords: ['미니멀'],
      suggestedLayout: 'split_top_image',
      imageUrl: '',
    };

    // Safe Theme Resolution
    const safeTheme: CardTheme = theme || {
      id: 'dark_tech',
      name: '다크 테크',
      nameEn: 'Dark Tech',
      bgGradient: 'from-slate-900 to-indigo-950',
      cardBg: '#0f172a',
      textPrimary: '#f8fafc',
      textSecondary: '#94a3b8',
      accent: '#6366f1',
      accentBg: '#312e81',
      border: '#1e293b',
      badgeBg: '#1e293b',
      badgeText: '#818cf8',
      fontFamily: "'Pretendard', sans-serif",
    };

    // 1. Aspect Ratio Container Width & Ratio constraints
    const ratioClasses = {
      '1:1': 'aspect-square w-full max-w-[500px]',
      '4:5': 'aspect-[4/5] w-full max-w-[440px]',
      '9:16': 'aspect-[9/16] w-full max-w-[360px]',
    }[aspectRatio] || 'aspect-square w-full max-w-[500px]';

    const cardBg = safeSlide.customBgColor || safeTheme.cardBg;
    const textColor = safeSlide.customTextColor || safeTheme.textPrimary;
    const subTextColor = safeTheme.textSecondary;
    const accentColor = safeSlide.customAccentColor || safeTheme.accent;

    // Font Resolution
    const headlineFont =
      safeSlide.customHeadlineFont ||
      projectHeadlineFont ||
      safeTheme.fontFamily ||
      "'Pretendard', sans-serif";
    const bodyFont =
      safeSlide.customBodyFont ||
      projectBodyFont ||
      safeTheme.fontFamily ||
      "'Pretendard', sans-serif";

    // Dynamic Text Length Analysis & Safe-Zone Step Calculation
    const headlineLength = (safeSlide.headline || '').length;
    const headlineLineCount = (safeSlide.headline || '').split('\n').length;
    const bodyLength = (safeSlide.body || '').length;

    // Automatic font reduction triggers for safe zone protection
    const isVeryLongHeadline =
      headlineLength > (aspectRatio === '1:1' ? 36 : 48) || headlineLineCount >= 4;
    const isMediumLongHeadline =
      headlineLength > (aspectRatio === '1:1' ? 24 : 32) || headlineLineCount >= 3;

    const isVeryLongBody = bodyLength > (aspectRatio === '1:1' ? 120 : 160);
    const isMediumLongBody = bodyLength > (aspectRatio === '1:1' ? 85 : 110);

    // Dynamic Layout Resolution
    const effectiveLayout: SlideLayout =
      safeSlide.suggestedLayout ||
      (safeSlide.slideType === 'cover' || safeSlide.slideNumber === 1
        ? 'full_bg_overlay'
        : safeSlide.slideType === 'quote'
        ? 'quote_focus'
        : safeSlide.slideType === 'stat'
        ? 'stat_highlight'
        : 'split_top_image');

    const isFullOverlay = effectiveLayout === 'full_bg_overlay';

    // 3. Aspect Ratio Specific Dynamic Config
    const config = (
      {
        '1:1': {
          headerPadding: 'px-[6%] pt-[5%] pb-[2%]',
          footerPadding: 'px-[6%] pb-[5%] pt-[2%]',
          bodySlideContentPadding: 'px-[6%] pt-[1%] pb-[3%]',
          coverContentPadding: 'px-[6.5%]',
          imageContainerHeight: 'h-[46%]',
          textPadding: 'px-1 py-1',
          headlineFontSize: isVeryLongHeadline
            ? 'clamp(0.95rem, 4.2cqi, 1.25rem)'
            : isMediumLongHeadline
            ? 'clamp(1.08rem, 4.8cqi, 1.45rem)'
            : 'clamp(1.22rem, 5.4cqi, 1.70rem)',
          coverHeadlineFontSize: isVeryLongHeadline
            ? 'clamp(1.15rem, 5.2cqi, 1.60rem)'
            : isMediumLongHeadline
            ? 'clamp(1.32rem, 5.9cqi, 1.85rem)'
            : 'clamp(1.50rem, 6.6cqi, 2.15rem)',
          bodyFontSize: isVeryLongBody
            ? 'clamp(0.72rem, 2.4cqi, 0.84rem)'
            : isMediumLongBody
            ? 'clamp(0.78rem, 2.7cqi, 0.90rem)'
            : 'clamp(0.84rem, 2.9cqi, 0.96rem)',
          coverBodyFontSize: 'clamp(0.80rem, 2.7cqi, 0.94rem)',
          bodyLineHeight: '1.65',
          badgeSize: 'text-[clamp(0.65rem,2.2cqi,0.76rem)] px-[2.8cqi] py-[0.8cqi]',
          footerTextSize: 'text-[clamp(0.64rem,2.2cqi,0.76rem)]',
        },
        '4:5': {
          headerPadding: 'px-[6.5%] pt-[5.5%] pb-[2%]',
          footerPadding: 'px-[6.5%] pb-[5.5%] pt-[2%]',
          bodySlideContentPadding: 'px-[6.5%] pt-[1%] pb-[3.5%]',
          coverContentPadding: 'px-[7%]',
          imageContainerHeight: 'h-[52%]',
          textPadding: 'px-1.5 py-1',
          headlineFontSize: isVeryLongHeadline
            ? 'clamp(0.98rem, 4.4cqi, 1.30rem)'
            : isMediumLongHeadline
            ? 'clamp(1.12rem, 5.0cqi, 1.55rem)'
            : 'clamp(1.28rem, 5.7cqi, 1.80rem)',
          coverHeadlineFontSize: isVeryLongHeadline
            ? 'clamp(1.20rem, 5.5cqi, 1.70rem)'
            : isMediumLongHeadline
            ? 'clamp(1.38rem, 6.2cqi, 2.00rem)'
            : 'clamp(1.60rem, 7.0cqi, 2.35rem)',
          bodyFontSize: isVeryLongBody
            ? 'clamp(0.74rem, 2.5cqi, 0.86rem)'
            : isMediumLongBody
            ? 'clamp(0.80rem, 2.8cqi, 0.94rem)'
            : 'clamp(0.86rem, 3.1cqi, 1.02rem)',
          coverBodyFontSize: 'clamp(0.82rem, 2.9cqi, 0.98rem)',
          bodyLineHeight: '1.68',
          badgeSize: 'text-[clamp(0.68rem,2.4cqi,0.80rem)] px-[3cqi] py-[0.9cqi]',
          footerTextSize: 'text-[clamp(0.66rem,2.3cqi,0.78rem)]',
        },
        '9:16': {
          headerPadding: 'px-[7.5%] pt-[7.5%] pb-[2.5%]',
          footerPadding: 'px-[7.5%] pb-[7.5%] pt-[2.5%]',
          bodySlideContentPadding: 'px-[7.5%] pt-[1.5%] pb-[4%]',
          coverContentPadding: 'px-[8%]',
          imageContainerHeight: 'h-[48%]',
          textPadding: 'px-2 py-1',
          headlineFontSize: isVeryLongHeadline
            ? 'clamp(1.02rem, 4.6cqi, 1.38rem)'
            : isMediumLongHeadline
            ? 'clamp(1.18rem, 5.3cqi, 1.65rem)'
            : 'clamp(1.35rem, 6.0cqi, 1.95rem)',
          coverHeadlineFontSize: isVeryLongHeadline
            ? 'clamp(1.28rem, 5.8cqi, 1.85rem)'
            : isMediumLongHeadline
            ? 'clamp(1.48rem, 6.6cqi, 2.15rem)'
            : 'clamp(1.72rem, 7.6cqi, 2.55rem)',
          bodyFontSize: isVeryLongBody
            ? 'clamp(0.76rem, 2.6cqi, 0.90rem)'
            : isMediumLongBody
            ? 'clamp(0.82rem, 3.0cqi, 0.98rem)'
            : 'clamp(0.88rem, 3.3cqi, 1.06rem)',
          coverBodyFontSize: 'clamp(0.86rem, 3.1cqi, 1.04rem)',
          bodyLineHeight: '1.70',
          badgeSize: 'text-[clamp(0.70rem,2.6cqi,0.85rem)] px-[3.2cqi] py-[1cqi]',
          footerTextSize: 'text-[clamp(0.68rem,2.4cqi,0.82rem)]',
        },
      }[aspectRatio]
    ) || {
      headerPadding: 'px-[6%] pt-[5%] pb-[2%]',
      footerPadding: 'px-[6%] pb-[5%] pt-[2%]',
      bodySlideContentPadding: 'px-[6%] pt-[1%] pb-[3.5%]',
      coverContentPadding: 'px-[6.5%]',
      imageContainerHeight: 'h-[48%]',
      textPadding: 'px-1 py-1',
      headlineFontSize: '1.35rem',
      coverHeadlineFontSize: '1.75rem',
      bodyFontSize: '0.9rem',
      coverBodyFontSize: '0.92rem',
      bodyLineHeight: '1.65',
      badgeSize: 'text-xs px-2.5 py-1',
      footerTextSize: 'text-xs',
    };

    // Helper to highlight words with safe contrast, smooth wrapping and no overlap
    const renderHighlightedText = (text?: string, isHeadline = false) => {
      if (!text) return null;

      try {
        const lines = String(text).split('\n');
        return lines.map((line, lineIdx) => {
          let content: React.ReactNode = line;
          if (safeSlide.highlightWords && Array.isArray(safeSlide.highlightWords) && safeSlide.highlightWords.length > 0) {
            const validWords = safeSlide.highlightWords
              .filter(Boolean)
              .map((w) => String(w).trim())
              .filter((w) => w.length > 0);

            if (validWords.length > 0) {
              const escapedWords = validWords.map((w) =>
                w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
              );
              const regex = new RegExp(`(${escapedWords.join('|')})`, 'gi');
              const parts = line.split(regex);
              content = parts.map((part, i) => {
                const isMatch = validWords.some(
                  (hw) => hw.toLowerCase() === part.toLowerCase()
                );
                if (isMatch) {
                  return (
                    <span
                      key={i}
                      style={{
                        color: isHeadline ? accentColor : '#ffffff',
                        backgroundColor: isHeadline ? 'transparent' : `${safeTheme.accentBg}dd`,
                        padding: isHeadline ? '0 2px' : '2px 6px',
                        borderRadius: isHeadline ? '0' : '4px',
                        fontWeight: 800,
                        boxDecorationBreak: 'clone',
                        WebkitBoxDecorationBreak: 'clone',
                        margin: isHeadline ? '0' : '0 2px',
                      }}
                      className="font-extrabold inline align-baseline"
                    >
                      {part}
                    </span>
                  );
                }
                return (
                  <span key={i} className="inline align-baseline">
                    {part}
                  </span>
                );
              });
            }
          }

          return (
            <span key={lineIdx} className="inline-block w-full">
              {content}
            </span>
          );
        });
      } catch (err) {
        console.warn('Error in renderHighlightedText:', err);
        return String(text);
      }
    };

    const handleImageError = () => {
      if (!fallbackImgUrl) {
        const fallback = getSmartTopicPhoto({
          headline: safeSlide.headline,
          body: safeSlide.body,
          slideNumber: safeSlide.slideNumber,
        });
        if (fallback && fallback !== safeSlide.imageUrl) {
          setFallbackImgUrl(fallback);
          return;
        }
      }
      setImageLoadFailed(true);
    };

    const activeImageSrc = fallbackImgUrl || safeSlide.imageUrl;
    const hasValidImage = Boolean(activeImageSrc && !imageLoadFailed);

    const fitMode = safeSlide.imageFit || 'cover';
    const posMode = safeSlide.imagePosition || 'top';
    const objectPositionStyle =
      posMode === 'top' ? '50% 15%' : posMode === 'bottom' ? '50% 85%' : '50% 50%';

    const renderSlideImage = (extraClasses = '', styleObj: React.CSSProperties = {}) => {
      if (!hasValidImage) {
        const defaultFallback = getSmartTopicPhoto({
          headline: safeSlide.headline,
          body: safeSlide.body,
          slideNumber: safeSlide.slideNumber,
        });
        return (
          <img
            src={defaultFallback}
            alt="Card visual"
            referrerPolicy="no-referrer"
            className={`w-full h-full object-cover ${extraClasses}`}
            style={{
              objectPosition: objectPositionStyle,
              ...styleObj,
            }}
          />
        );
      }

      if (fitMode === 'contain') {
        return (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black/40">
            {/* Ambient subtle blurred backdrop for letterboxing */}
            <img
              src={activeImageSrc}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-35 pointer-events-none"
            />
            <img
              src={activeImageSrc}
              alt={safeSlide.headline || 'Card visual'}
              referrerPolicy="no-referrer"
              onError={handleImageError}
              className={`relative z-10 max-w-full max-h-full object-contain ${extraClasses}`}
              style={styleObj}
            />
          </div>
        );
      }

      return (
        <img
          src={activeImageSrc}
          alt={safeSlide.headline || 'Card visual'}
          referrerPolicy="no-referrer"
          onError={handleImageError}
          className={`w-full h-full object-cover ${extraClasses}`}
          style={{
            objectPosition: objectPositionStyle,
            ...styleObj,
          }}
        />
      );
    };

    const isFirstSlide = safeSlide.slideNumber === 1 || safeSlide.slideType === 'cover';
    const isLastSlide = safeSlide.slideNumber === totalSlides || safeSlide.slideType === 'cta' || safeSlide.slideType === 'summary';
    const isSpecialSlide = isFirstSlide || isLastSlide || isFullOverlay;

    return (
      <div
        ref={ref}
        id={`card-canvas-${safeSlide.slideNumber}`}
        className={`relative overflow-hidden rounded-2xl flex flex-col justify-between select-none shadow-2xl transition-all duration-300 [container-type:inline-size] ${ratioClasses} ${className}`}
        style={{
          backgroundColor: cardBg,
          color: textColor,
          border: `1px solid ${safeTheme.border}`,
          boxShadow: '0 20px 45px -15px rgba(0, 0, 0, 0.65)',
        }}
      >
        {/* Ambient Subtle Background Lighting */}
        <div
          className="absolute -top-[20%] -right-[20%] w-[60%] h-[60%] rounded-full pointer-events-none opacity-25 blur-3xl"
          style={{ backgroundColor: accentColor }}
        />
        <div
          className="absolute -bottom-[20%] -left-[20%] w-[60%] h-[60%] rounded-full pointer-events-none opacity-20 blur-3xl"
          style={{ backgroundColor: safeTheme.accentBg }}
        />

        {/* 1. TOP TIER: Safe-Zone Header Bar (Badge + Slide Index + Meta) */}
        <div
          className={`relative z-20 flex items-center justify-between flex-shrink-0 ${config.headerPadding}`}
        >
          <div className="flex items-center gap-[2cqi] min-w-0">
            <span
              className={`font-medium uppercase tracking-wider rounded-full flex items-center gap-1.5 shadow-sm whitespace-nowrap backdrop-blur-md px-3.5 py-1 text-[clamp(0.62rem,2.1cqi,0.76rem)]`}
              style={{
                backgroundColor: isSpecialSlide
                  ? 'rgba(255, 255, 255, 0.08)'
                  : safeTheme.badgeBg,
                color: isSpecialSlide ? '#E2E8F0' : safeTheme.badgeText,
                border: isSpecialSlide
                  ? '1px solid rgba(255, 255, 255, 0.15)'
                  : `1px solid ${safeTheme.border}`,
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                fontFamily: bodyFont,
              }}
            >
              {isFirstSlide ? (
                <Sparkles className="w-[3cqi] h-[3cqi] text-amber-300" />
              ) : isLastSlide ? (
                <Bookmark className="w-[3cqi] h-[3cqi] text-amber-300" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400/90 shrink-0" />
              )}
              {safeSlide.badgeText ||
                (isFirstSlide
                  ? '핵심 인사이트'
                  : isLastSlide
                  ? '핵심 요약 & 실천'
                  : `포인트 0${safeSlide.slideNumber}`)}
            </span>

            {projectCategory && (
              <span
                className="text-[clamp(0.6rem,2cqi,0.72rem)] font-bold tracking-wider uppercase truncate max-w-[120px]"
                style={{
                  color: isSpecialSlide ? 'rgba(255, 255, 255, 0.85)' : subTextColor,
                  fontFamily: bodyFont,
                  textShadow: isSpecialSlide ? '0 2px 8px rgba(0,0,0,0.8)' : 'none',
                }}
              >
                {projectCategory}
              </span>
            )}
          </div>

          {/* Slide Progress Counter Pill */}
          <div
            className={`font-semibold rounded-full flex items-center gap-1 font-mono tracking-tight flex-shrink-0 backdrop-blur-md ${config.badgeSize}`}
            style={{
              backgroundColor: isSpecialSlide
                ? 'rgba(0, 0, 0, 0.45)'
                : 'rgba(255, 255, 255, 0.08)',
              color: isSpecialSlide ? '#ffffff' : subTextColor,
              border: isSpecialSlide
                ? '1px solid rgba(255, 255, 255, 0.2)'
                : '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <span
              style={{ color: isSpecialSlide ? '#ffffff' : accentColor }}
              className="font-bold"
            >
              {safeSlide.slideNumber}
            </span>
            <span className="opacity-40">/</span>
            <span>{totalSlides}</span>
          </div>
        </div>

        {/* 2. MIDDLE & CONTENT TIER: Dynamic Responsive Layout Branching */}
        {effectiveLayout === 'full_bg_overlay' ? (
          /* A. Full-Screen Background Image with Center-Bottom Balanced Editorial Typography */
          <div className="relative flex-1 flex flex-col justify-between min-h-0 overflow-hidden z-10">
            {/* Full-Bleed Edge-to-Edge Background Image */}
            {hasValidImage ? (
              <div className="absolute inset-0 z-0 overflow-hidden">
                {fitMode === 'contain' ? (
                  <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black/60">
                    <img
                      src={activeImageSrc}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-35 pointer-events-none"
                    />
                    <img
                      src={activeImageSrc}
                      alt={safeSlide.headline || 'Card visual'}
                      referrerPolicy="no-referrer"
                      onError={handleImageError}
                      className="relative z-10 max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <img
                    src={activeImageSrc}
                    alt={safeSlide.headline || 'Card visual'}
                    referrerPolicy="no-referrer"
                    onError={handleImageError}
                    className="w-full h-full object-cover transition-transform duration-700"
                    style={{ objectPosition: objectPositionStyle }}
                  />
                )}
                {/* Editorial Dark Dramatic Multi-Stop Gradient Overlay */}
                <div
                  className="absolute inset-0 pointer-events-none z-10"
                  style={{
                    background:
                      'linear-gradient(to top, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.82) 30%, rgba(0, 0, 0, 0.45) 65%, rgba(0, 0, 0, 0.20) 100%)',
                  }}
                />
              </div>
            ) : (
              <div className="absolute inset-0 z-0 bg-slate-900 flex flex-col items-center justify-center text-white/40 text-xs gap-1.5 p-4 text-center">
                <ImageOff className="w-6 h-6 text-slate-500" />
                <span>표지 이미지를 지정하거나 업로드하세요</span>
              </div>
            )}

            {/* Top Optical Spacer for 1:1.5 Space Balance */}
            <div className="flex-[1] min-h-[30px] pointer-events-none" />

            {/* Cover Center-Bottom Balanced Editorial Typography */}
            <div
              className={`relative z-20 flex flex-col justify-center ${config.coverContentPadding} ${config.textPadding} pb-[6%] sm:pb-[8%]`}
              style={{ wordBreak: 'keep-all', overflowWrap: 'break-word' }}
            >
              {(safeSlide.imageStyleKeywords?.[0] || isFirstSlide || isLastSlide) && (
                <div className="flex items-center gap-1.5" style={{ marginBottom: '20px' }}>
                  <span
                    className="px-4 py-1.5 text-[clamp(0.62rem,2.1cqi,0.76rem)] font-medium tracking-wide rounded-full shadow-sm inline-flex items-center gap-2 select-none"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#E2E8F0',
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 shadow-sm" />
                    <span>
                      {safeSlide.imageStyleKeywords?.length
                        ? safeSlide.imageStyleKeywords.map(formatKoreanKeyword).filter(Boolean).join(' • ')
                        : isFirstSlide
                        ? '트렌드 인사이트'
                        : '핵심 요약 & 실천'}
                    </span>
                  </span>
                </div>
              )}

              <h1
                className="font-black tracking-tight leading-[1.22] drop-shadow-xl text-white select-text mb-2.5"
                style={{
                  fontSize: config.coverHeadlineFontSize,
                  fontFamily: headlineFont,
                  textShadow:
                    '0 4px 24px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.9)',
                }}
              >
                {renderHighlightedText(safeSlide.headline, true)}
              </h1>

              {safeSlide.body && (
                <p
                  className="font-normal opacity-95 text-slate-100/90 whitespace-pre-line drop-shadow-md select-text"
                  style={{
                    fontSize: config.coverBodyFontSize,
                    lineHeight: config.bodyLineHeight,
                    fontFamily: bodyFont,
                  }}
                >
                  {renderHighlightedText(safeSlide.body)}
                </p>
              )}
            </div>

            {/* Bottom Optical Spacer for 1:1.5 Space Balance */}
            <div className="flex-[0.4] min-h-[16px] pointer-events-none" />
          </div>
        ) : effectiveLayout === 'quote_focus' ? (
          /* B. Quote Focus Layout */
          <div
            className={`relative z-20 flex-1 flex flex-col items-center justify-center text-center min-h-0 overflow-hidden px-[7%] py-3 gap-3`}
          >
            {/* Dedicated Quote Mark Badge Container */}
            <div
              className="w-[8.5cqi] h-[8.5cqi] max-w-[42px] max-h-[42px] rounded-full flex items-center justify-center border shadow-sm flex-shrink-0 relative z-20"
              style={{
                backgroundColor: `${safeTheme.accentBg}60`,
                borderColor: `${accentColor}50`,
                color: accentColor,
              }}
            >
              <Quote className="w-[4.2cqi] h-[4.2cqi] max-w-[20px] max-h-[20px]" />
            </div>

            {/* Highest Z-Index Typography Safe Container */}
            <div
              className={`relative z-30 flex-shrink min-h-0 overflow-hidden flex flex-col items-center w-full max-w-[95%] ${config.textPadding}`}
              style={{ wordBreak: 'keep-all', overflowWrap: 'break-word' }}
            >
              <h2
                className="font-black tracking-tight leading-[1.35] mb-2.5 text-center select-text"
                style={{
                  color: textColor,
                  fontSize: config.headlineFontSize,
                  fontFamily: headlineFont,
                }}
              >
                “{renderHighlightedText(safeSlide.headline, true)}”
              </h2>
              <div
                className="font-normal opacity-90 whitespace-pre-line max-w-[90%] text-center overflow-y-auto custom-scrollbar flex-shrink min-h-0 select-text"
                style={{
                  color: subTextColor,
                  fontSize: config.bodyFontSize,
                  lineHeight: config.bodyLineHeight,
                  fontFamily: bodyFont,
                }}
              >
                {renderHighlightedText(safeSlide.body)}
              </div>
            </div>

            {/* Optional Quote Avatar / Reference Thumbnail */}
            {hasValidImage && (
              <div
                className="aspect-square w-[14cqi] max-w-[56px] rounded-full overflow-hidden border-2 shadow-md flex-shrink-0 relative z-20 mt-1"
                style={{ borderColor: accentColor }}
              >
                <img
                  src={activeImageSrc}
                  alt="Quote visual"
                  referrerPolicy="no-referrer"
                  onError={handleImageError}
                  className="w-full h-full object-cover"
                  style={{ objectPosition: objectPositionStyle }}
                />
              </div>
            )}
          </div>
        ) : effectiveLayout === 'split_top_text' ? (
          /* C. Split Top Text + Bottom Image (Text First Layout) */
          <div
            className={`flex-1 flex flex-col z-10 min-h-0 overflow-hidden ${config.bodySlideContentPadding} gap-3.5 sm:gap-4`}
          >
            {/* Upper Breathable Editorial Typography */}
            <div
              className={`flex-1 min-h-0 overflow-hidden flex flex-col justify-center space-y-2 sm:space-y-2.5 ${config.textPadding}`}
              style={{ wordBreak: 'keep-all', overflowWrap: 'break-word' }}
            >
              <h2
                className="font-black tracking-tight leading-[1.3] flex-shrink-0 select-text"
                style={{
                  color: textColor,
                  fontSize: config.headlineFontSize,
                  fontFamily: headlineFont,
                }}
              >
                {renderHighlightedText(safeSlide.headline, true)}
              </h2>
              <div
                className="font-normal opacity-90 whitespace-pre-line overflow-y-auto custom-scrollbar flex-shrink min-h-0 select-text"
                style={{
                  color: subTextColor,
                  fontSize: config.bodyFontSize,
                  lineHeight: config.bodyLineHeight,
                  wordBreak: 'keep-all',
                  fontFamily: bodyFont,
                }}
              >
                {renderHighlightedText(safeSlide.body)}
              </div>
            </div>

            {/* Lower Wide Editorial Visual Container */}
            <div
              className={`relative w-full rounded-xl overflow-hidden shadow-md border border-white/10 group flex-shrink-0 min-h-0 ${config.imageContainerHeight}`}
            >
              {renderSlideImage()}
              {safeSlide.imageStyleKeywords?.[0] && (
                <span className="absolute bottom-2 right-2 px-2.5 py-0.5 text-[clamp(0.55rem,1.8cqi,0.7rem)] font-semibold bg-black/75 backdrop-blur-md rounded-md text-white/95 border border-white/15 shadow-sm z-20">
                  {formatKoreanKeyword(safeSlide.imageStyleKeywords[0])}
                </span>
              )}
            </div>
          </div>
        ) : effectiveLayout === 'stat_highlight' ? (
          /* D. Stat Highlight Layout */
          <div
            className={`relative z-20 flex-1 flex flex-col min-h-0 overflow-hidden ${config.bodySlideContentPadding} gap-3`}
          >
            <div className="flex items-center gap-2 flex-shrink-0">
              <div
                className="px-3 py-1 rounded-lg font-mono font-black text-[clamp(0.75rem,2.8cqi,0.95rem)] tracking-tight shadow-sm flex items-center gap-1.5"
                style={{
                  backgroundColor: `${safeTheme.accentBg}80`,
                  color: accentColor,
                  border: `1px solid ${accentColor}40`,
                }}
              >
                <Hash className="w-[3cqi] h-[3cqi]" />
                <span>KEY POINT</span>
              </div>
            </div>

            <div
              className="rounded-xl p-3.5 border flex flex-col justify-center space-y-1.5 shadow-sm"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                borderColor: 'rgba(255, 255, 255, 0.08)',
              }}
            >
              <h2
                className="font-black tracking-tight leading-[1.28] select-text"
                style={{
                  color: textColor,
                  fontSize: config.headlineFontSize,
                  fontFamily: headlineFont,
                }}
              >
                {renderHighlightedText(safeSlide.headline, true)}
              </h2>
            </div>

            <div className="flex-1 flex gap-3 min-h-0 items-center">
              {hasValidImage && (
                <div className="w-[40%] h-full rounded-xl overflow-hidden shadow-md border border-white/10 flex-shrink-0">
                  {renderSlideImage()}
                </div>
              )}
              <div
                className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col justify-center select-text"
                style={{ wordBreak: 'keep-all', overflowWrap: 'break-word' }}
              >
                <div
                  className="font-normal opacity-90 whitespace-pre-line"
                  style={{
                    color: subTextColor,
                    fontSize: config.bodyFontSize,
                    lineHeight: config.bodyLineHeight,
                    fontFamily: bodyFont,
                  }}
                >
                  {renderHighlightedText(safeSlide.body)}
                </div>
              </div>
            </div>
          </div>
        ) : effectiveLayout === 'card_centered' ? (
          /* E. Card Centered Layout */
          <div
            className={`relative z-20 flex-1 flex flex-col items-center justify-center text-center min-h-0 overflow-hidden px-[7%] py-3 gap-3`}
          >
            {hasValidImage && (
              <div className="w-full max-w-[260px] aspect-video rounded-xl overflow-hidden shadow-md border border-white/10 flex-shrink-0 mb-1">
                {renderSlideImage()}
              </div>
            )}
            <div
              className={`flex-shrink min-h-0 overflow-hidden flex flex-col items-center max-w-[95%] ${config.textPadding}`}
              style={{ wordBreak: 'keep-all', overflowWrap: 'break-word' }}
            >
              {(safeSlide.imageStyleKeywords?.[0] || isFirstSlide || isLastSlide) && (
                <div className="flex items-center gap-1.5" style={{ marginBottom: '20px' }}>
                  <span
                    className="px-4 py-1.5 text-[clamp(0.62rem,2.1cqi,0.76rem)] font-medium tracking-wide rounded-full shadow-sm inline-flex items-center gap-2 select-none"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#E2E8F0',
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 shadow-sm" />
                    <span>
                      {safeSlide.imageStyleKeywords?.length
                        ? safeSlide.imageStyleKeywords.map(formatKoreanKeyword).filter(Boolean).join(' • ')
                        : isFirstSlide
                        ? '트렌드 인사이트'
                        : '핵심 요약 & 실천'}
                    </span>
                  </span>
                </div>
              )}
              <h2
                className="font-black tracking-tight leading-[1.3] mb-2 select-text"
                style={{
                  color: textColor,
                  fontSize: config.headlineFontSize,
                  fontFamily: headlineFont,
                }}
              >
                {renderHighlightedText(safeSlide.headline, true)}
              </h2>
              <div
                className="font-normal opacity-90 whitespace-pre-line max-w-[90%] overflow-y-auto custom-scrollbar flex-shrink min-h-0 select-text"
                style={{
                  color: subTextColor,
                  fontSize: config.bodyFontSize,
                  lineHeight: config.bodyLineHeight,
                  fontFamily: bodyFont,
                }}
              >
                {renderHighlightedText(safeSlide.body)}
              </div>
            </div>
          </div>
        ) : (
          /* F. Default Magazine Editorial (45~52% Wide Upper Image + Lower Text) */
          <div
            className={`flex-1 flex flex-col z-10 min-h-0 overflow-hidden ${config.bodySlideContentPadding} gap-3.5 sm:gap-4`}
          >
            {/* Upper Wide Editorial Visual Container */}
            <div
              className={`relative w-full rounded-xl overflow-hidden shadow-md border border-white/10 group flex-shrink-0 min-h-0 ${config.imageContainerHeight}`}
            >
              {renderSlideImage()}
              {safeSlide.imageStyleKeywords?.[0] && (
                <span className="absolute bottom-2 right-2 px-2.5 py-0.5 text-[clamp(0.55rem,1.8cqi,0.7rem)] font-semibold bg-black/75 backdrop-blur-md rounded-md text-white/95 border border-white/15 shadow-sm z-20">
                  {formatKoreanKeyword(safeSlide.imageStyleKeywords[0])}
                </span>
              )}
            </div>

            {/* Lower Breathable Editorial Typography */}
            <div
              className={`flex-1 min-h-0 overflow-hidden flex flex-col justify-center space-y-2 sm:space-y-2.5 ${config.textPadding}`}
              style={{ wordBreak: 'keep-all', overflowWrap: 'break-word' }}
            >
              <h2
                className="font-black tracking-tight leading-[1.3] flex-shrink-0 select-text"
                style={{
                  color: textColor,
                  fontSize: config.headlineFontSize,
                  fontFamily: headlineFont,
                }}
              >
                {renderHighlightedText(safeSlide.headline, true)}
              </h2>
              <div
                className="font-normal opacity-90 whitespace-pre-line overflow-y-auto custom-scrollbar flex-shrink min-h-0 select-text"
                style={{
                  color: subTextColor,
                  fontSize: config.bodyFontSize,
                  lineHeight: config.bodyLineHeight,
                  wordBreak: 'keep-all',
                  fontFamily: bodyFont,
                }}
              >
                {renderHighlightedText(safeSlide.body)}
              </div>
            </div>
          </div>
        )}

        {/* 3. BOTTOM TIER: Safe-Zone Footer Bar (Brand, Ratio & Swipe/Save CTA) */}
        <div
          className={`relative z-20 flex items-center justify-between flex-shrink-0 ${
            isFullOverlay
              ? 'border-t border-white/20 bg-black/30 backdrop-blur-md'
              : 'border-t border-white/10'
          } ${config.footerPadding}`}
        >
          <div className="flex items-center gap-[1.5cqi] opacity-80">
            <span
              className={`font-bold tracking-wider uppercase font-mono ${config.footerTextSize}`}
              style={{
                color: isFullOverlay ? '#ffffff' : subTextColor,
                fontFamily: bodyFont,
              }}
            >
              AIWORKS 스튜디오
            </span>
          </div>

          <div
            className={`flex items-center gap-1 font-bold tracking-wide ${config.footerTextSize}`}
            style={{
              color: isFullOverlay ? '#ffffff' : accentColor,
              fontFamily: bodyFont,
            }}
          >
            {safeSlide.slideNumber < totalSlides ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNextSlide?.();
                }}
                className={`flex items-center gap-1 opacity-95 transition-all text-left ${
                  onNextSlide && !isExporting
                    ? 'cursor-pointer hover:opacity-100 hover:scale-105 active:scale-95'
                    : ''
                }`}
                title="다음 장으로 이동"
              >
                <span>다음 장 넘기기</span>
                <ChevronRight className="w-[3.2cqi] h-[3.2cqi]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenExport?.();
                }}
                className={`flex items-center gap-1 font-extrabold transition-all text-left ${
                  onOpenExport && !isExporting
                    ? 'cursor-pointer hover:opacity-100 hover:scale-105 active:scale-95'
                    : ''
                }`}
                title="저장 및 내보내기"
              >
                <Bookmark className="w-[3.2cqi] h-[3.2cqi]" />
                <span>저장 & 공유하기</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
);

CardSlideCanvas.displayName = 'CardSlideCanvas';
