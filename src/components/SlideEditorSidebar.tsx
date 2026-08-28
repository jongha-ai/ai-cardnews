import React, { useState, useRef, useEffect } from 'react';
import { CardSlide, SlideLayout, CardTheme } from '../types';
import { FontPickerDropdown } from './FontPickerDropdown';
import { getSmartTopicPhoto, extractStockKeywords, buildDynamicStockPhotoUrl } from '../utils/photoMatcher';
import { processImageBlobToBase64 } from '../utils/imageUtils';
import { 
  Sparkles, 
  Copy, 
  Check, 
  RefreshCw, 
  Image as ImageIcon, 
  Wand2, 
  Type, 
  AlignLeft, 
  Layers, 
  Palette,
  Lightbulb,
  ExternalLink,
  ChevronRight,
  Maximize2,
  Minimize2,
  ArrowUp,
  ArrowDown,
  Quote as QuoteIcon,
  BarChart3,
  AlignCenter,
  Layout,
  Upload,
  FolderUp,
  Trash2,
  FileImage,
  CheckCircle2,
  AlertCircle,
  ClipboardPaste
} from 'lucide-react';

interface SlideEditorSidebarProps {
  slide: CardSlide;
  theme: CardTheme;
  totalSlides: number;
  projectHeadlineFont?: string;
  projectBodyFont?: string;
  onUpdateSlide: (updatedSlide: Partial<CardSlide>) => void;
  onRefineSlide: (action: 'more_punchy' | 'more_professional' | 'shorter' | 'new_image_prompt' | 'rewrite_body') => Promise<void>;
  onGenerateImage: (slideId: string, prompt: string) => Promise<void>;
  onApplyFontsToAllSlides?: (headlineFont: string, bodyFont: string) => void;
  isRefining: boolean;
}

export const SlideEditorSidebar: React.FC<SlideEditorSidebarProps> = ({
  slide,
  theme,
  totalSlides,
  projectHeadlineFont,
  projectBodyFont,
  onUpdateSlide,
  onRefineSlide,
  onGenerateImage,
  onApplyFontsToAllSlides,
  isRefining,
}) => {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [activeTab, setActiveTab] = useState<'text' | 'image' | 'layout'>('text');
  const [newTagInput, setNewTagInput] = useState('');
  const [newStyleKeywordInput, setNewStyleKeywordInput] = useState('');
  const [appliedToAllSuccess, setAppliedToAllSuccess] = useState(false);
  const [activeRefineAction, setActiveRefineAction] = useState<string | null>(null);
  const [refineFeedback, setRefineFeedback] = useState<string | null>(null);
  const [flashUpdated, setFlashUpdated] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File | Blob, customSuccessMsg?: string) => {
    try {
      setUploadError(null);
      setUploadSuccess(null);

      if (!file) {
        setUploadError('선택된 이미지 데이터가 없습니다.');
        return;
      }

      // Check mime type (fallback to file extension if type is empty)
      const fileName = 'name' in file ? (file as File).name : '클립보드 이미지';
      const isImage =
        file.type.startsWith('image/') ||
        /\.(jpg|jpeg|png|webp|gif|svg|bmp|avif)$/i.test(fileName);

      if (!isImage && file.type) {
        setUploadError('이미지 파일(JPG, PNG, WebP 등)만 업로드 가능합니다.');
        return;
      }

      if (file.size > 25 * 1024 * 1024) {
        setUploadError('25MB 이하의 이미지만 업로드 가능합니다.');
        return;
      }

      const base64Url = await processImageBlobToBase64(file, 1600, 0.92);
      onUpdateSlide({ imageUrl: base64Url });
      setUploadSuccess(customSuccessMsg || `${fileName} 적용 완료`);
      setTimeout(() => setUploadSuccess(null), 3500);
    } catch (err: any) {
      console.error('handleFileUpload error:', err);
      setUploadError(`업로드 실패: ${err?.message || '알 수 없는 오류'}`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const [photoCycleCount, setPhotoCycleCount] = useState(0);

  const handleResetToTopicPhoto = (cycle: boolean = false) => {
    const nextCount = cycle ? photoCycleCount + 1 : 0;
    if (cycle) setPhotoCycleCount(nextCount);

    const keywords = slide.stockPhotoKeywords?.primary_keyword
      ? slide.stockPhotoKeywords
      : extractStockKeywords({
          headline: slide.headline,
          body: slide.body,
          slideNumber: slide.slideNumber,
        });

    const freshPhoto = buildDynamicStockPhotoUrl(
      keywords.primary_keyword,
      slide.slideNumber + nextCount
    );

    onUpdateSlide({ 
      imageUrl: freshPhoto,
      stockPhotoKeywords: keywords,
    });
    setUploadSuccess(cycle ? '새로운 스톡 사진으로 교체되었습니다.' : '주제 맞춤형 고화질 사진으로 재설정되었습니다.');
    setTimeout(() => setUploadSuccess(null), 3000);
  };

  const handleRefineWithFeedback = async (
    action: 'more_punchy' | 'more_professional' | 'shorter' | 'new_image_prompt' | 'rewrite_body',
    label: string
  ) => {
    try {
      setActiveRefineAction(action);
      await onRefineSlide(action);
      setRefineFeedback(`✨ ${label} 완료!`);
      setFlashUpdated(true);
      setTimeout(() => setFlashUpdated(false), 2000);
      setTimeout(() => setRefineFeedback(null), 3500);
    } catch (e) {
      console.error(e);
    } finally {
      setActiveRefineAction(null);
    }
  };

  const handleCopyPrompt = () => {
    const textToCopy = slide.imagePrompt || `${slide.headline.replace(/\n/g, ' ')}을 시각화한 감성적인 고화질 실사 이미지, 자연스러운 표정의 한국인 인물과 국내 배경, 고해상도`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleAddHighlightWord = () => {
    if (!newTagInput.trim()) return;
    const updated = [...(slide.highlightWords || []), newTagInput.trim()];
    onUpdateSlide({ highlightWords: updated });
    setNewTagInput('');
  };

  const handleRemoveHighlightWord = (index: number) => {
    const updated = slide.highlightWords.filter((_, i) => i !== index);
    onUpdateSlide({ highlightWords: updated });
  };

  const handleAddStyleKeyword = () => {
    if (!newStyleKeywordInput.trim()) return;
    const current = slide.imageStyleKeywords || [];
    if (current.includes(newStyleKeywordInput.trim())) return;
    const updated = [...current, newStyleKeywordInput.trim()];
    onUpdateSlide({ imageStyleKeywords: updated });
    setNewStyleKeywordInput('');
  };

  const handleRemoveStyleKeyword = (index: number) => {
    const updated = (slide.imageStyleKeywords || []).filter((_, i) => i !== index);
    onUpdateSlide({ imageStyleKeywords: updated });
  };

  const currentHeadlineFont = slide.customHeadlineFont || projectHeadlineFont || theme.fontFamily || "'Pretendard', sans-serif";
  const currentBodyFont = slide.customBodyFont || projectBodyFont || theme.fontFamily || "'Pretendard', sans-serif";

  return (
    <div className="flex flex-col h-full bg-slate-900/90 backdrop-blur-xl border-l border-slate-800 text-slate-100 overflow-hidden w-full lg:w-[420px]">
      {/* Editor Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center border border-indigo-500/30">
            {slide.slideNumber}
          </span>
          <div>
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
              슬라이드 {slide.slideNumber} 편집
              <span className="text-[11px] font-normal text-slate-400">
                ({slide.slideType.toUpperCase()})
              </span>
            </h3>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-800/80 p-1 rounded-lg border border-slate-700/50 text-xs">
          <button
            onClick={() => setActiveTab('text')}
            className={`px-2.5 py-1 rounded font-medium transition-all ${
              activeTab === 'text'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            텍스트
          </button>
          <button
            onClick={() => setActiveTab('image')}
            className={`px-2.5 py-1 rounded font-medium transition-all flex items-center gap-1 ${
              activeTab === 'image'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3 h-3" />
            이미지 프롬프트
          </button>
          <button
            onClick={() => setActiveTab('layout')}
            className={`px-2.5 py-1 rounded font-medium transition-all ${
              activeTab === 'layout'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            레이아웃
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 custom-scrollbar">
        {/* TEXT EDITING TAB */}
        {activeTab === 'text' && (
          <div className="space-y-4">
            {/* AI Fast Action Pills */}
            <div className="space-y-2 p-3 bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-slate-950/80 border border-indigo-900/40 rounded-xl shadow-inner">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold tracking-wider text-indigo-300 uppercase flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
                  AI 원클릭 카피 다듬기
                </label>
                {refineFeedback && (
                  <span className="text-[11px] text-emerald-300 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700/60 animate-fade-in flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[3]" />
                    {refineFeedback}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isRefining}
                  onClick={() => handleRefineWithFeedback('more_punchy', '후킹한 카피로 변경')}
                  className="px-2.5 py-2 text-xs bg-slate-900 hover:bg-slate-800 border border-amber-500/30 hover:border-amber-500/60 rounded-lg text-amber-300 font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shadow-sm"
                >
                  {activeRefineAction === 'more_punchy' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      <span>다듬는 중...</span>
                    </>
                  ) : (
                    <>
                      <span>⚡</span>
                      <span>더 후킹하게</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={isRefining}
                  onClick={() => handleRefineWithFeedback('more_professional', '전문가 톤으로 변경')}
                  className="px-2.5 py-2 text-xs bg-slate-900 hover:bg-slate-800 border border-sky-500/30 hover:border-sky-500/60 rounded-lg text-sky-300 font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shadow-sm"
                >
                  {activeRefineAction === 'more_professional' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
                      <span>다듬는 중...</span>
                    </>
                  ) : (
                    <>
                      <span>💼</span>
                      <span>더 전문적으로</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={isRefining}
                  onClick={() => handleRefineWithFeedback('shorter', '1초 핵심 요약')}
                  className="px-2.5 py-2 text-xs bg-slate-900 hover:bg-slate-800 border border-emerald-500/30 hover:border-emerald-500/60 rounded-lg text-emerald-300 font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shadow-sm"
                >
                  {activeRefineAction === 'shorter' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      <span>요약 중...</span>
                    </>
                  ) : (
                    <>
                      <span>✂️</span>
                      <span>1초 핵심 요약</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={isRefining}
                  onClick={() => handleRefineWithFeedback('rewrite_body', '실천 포인트 재작성')}
                  className="px-2.5 py-2 text-xs bg-slate-900 hover:bg-slate-800 border border-purple-500/30 hover:border-purple-500/60 rounded-lg text-purple-300 font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shadow-sm"
                >
                  {activeRefineAction === 'rewrite_body' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
                      <span>재작성 중...</span>
                    </>
                  ) : (
                    <>
                      <span>📝</span>
                      <span>포인트 재작성</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* FONT SELECTION SECTION */}
            <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-indigo-400" />
                  글꼴 (Font) 스타일 설정
                </label>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  웹 폰트 연동
                </span>
              </div>

              {/* Headline Font Selector */}
              <FontPickerDropdown
                label="제목 글꼴 (Headline Font)"
                selectedFontFamily={currentHeadlineFont}
                onChange={(fontFamily) => onUpdateSlide({ customHeadlineFont: fontFamily })}
                recommendedType="headline"
              />

              {/* Body Font Selector */}
              <FontPickerDropdown
                label="본문 글꼴 (Body Font)"
                selectedFontFamily={currentBodyFont}
                onChange={(fontFamily) => onUpdateSlide({ customBodyFont: fontFamily })}
                recommendedType="body"
              />

              {/* Bulk Apply to All Slides Button */}
              <div className="pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    if (onApplyFontsToAllSlides) {
                      onApplyFontsToAllSlides(currentHeadlineFont, currentBodyFont);
                    }
                    setAppliedToAllSuccess(true);
                    setTimeout(() => setAppliedToAllSuccess(false), 2500);
                  }}
                  className="w-full py-2 px-3 text-xs bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 hover:text-indigo-100 border border-indigo-700/60 hover:border-indigo-500 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  {appliedToAllSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                      <span className="text-emerald-300 font-bold">
                        모든 슬라이드에 글꼴 적용 완료!
                      </span>
                    </>
                  ) : (
                    <>
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      <span>모든 슬라이드에 이 글꼴 일괄 적용</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Badge Text */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>상단 뱃지 텍스트</span>
                <span className="text-[10px] text-slate-500">예: POINT 01, COVER, TIP</span>
              </label>
              <input
                type="text"
                value={slide.badgeText || ''}
                onChange={(e) => onUpdateSlide({ badgeText: e.target.value })}
                className="w-full bg-slate-950/70 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                placeholder="예: POINT 01"
              />
            </div>

            {/* Headline Text */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>헤드라인 (Headline)</span>
                <span className="text-[10px] text-slate-500">줄바꿈 가능</span>
              </label>
              <textarea
                rows={3}
                value={slide.headline}
                onChange={(e) => onUpdateSlide({ headline: e.target.value })}
                className={`w-full bg-slate-950/70 border rounded-lg p-3 text-sm text-slate-100 font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-300 ${
                  flashUpdated
                    ? 'border-indigo-400 ring-2 ring-indigo-500/50 bg-indigo-950/40'
                    : 'border-slate-700/80'
                }`}
                placeholder="카드의 핵심 메시지를 강렬하게 적어주세요"
              />
            </div>

            {/* Body Text */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>본문 내용 (Body Text)</span>
                <span className="text-[10px] text-slate-500">모바일 최적화</span>
              </label>
              <textarea
                rows={4}
                value={slide.body}
                onChange={(e) => onUpdateSlide({ body: e.target.value })}
                className={`w-full bg-slate-950/70 border rounded-lg p-3 text-sm text-slate-200 leading-relaxed focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-300 ${
                  flashUpdated
                    ? 'border-indigo-400 ring-2 ring-indigo-500/50 bg-indigo-950/40'
                    : 'border-slate-700/80'
                }`}
                placeholder="상세 내용을 2~3줄로 작성해주세요"
              />
            </div>

            {/* Highlighted Words Tag Manager */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>강조 키워드 (하이라이트)</span>
                <span className="text-[10px] text-slate-500">일치하는 단어가 자동 강조됩니다</span>
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(slide.highlightWords || []).map((word, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-indigo-950/80 text-indigo-300 border border-indigo-700/50 rounded-full font-medium"
                  >
                    {word}
                    <button
                      type="button"
                      onClick={() => handleRemoveHighlightWord(i)}
                      className="hover:text-rose-400 text-slate-400 ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddHighlightWord();
                    }
                  }}
                  placeholder="강조할 단어 입력 후 엔터"
                  className="flex-1 bg-slate-950/70 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddHighlightWord}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium rounded-lg border border-slate-700"
                >
                  추가
                </button>
              </div>
            </div>

            {/* Slide Top Style/Topic Keywords Tag Manager */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>상단 스타일/토픽 태그</span>
                <span className="text-[10px] text-slate-500">슬라이드 상단 뱃지에 노출되는 한국어 키워드</span>
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(slide.imageStyleKeywords || []).map((keyword, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-amber-950/60 text-amber-300 border border-amber-700/50 rounded-full font-medium"
                  >
                    {keyword}
                    <button
                      type="button"
                      onClick={() => handleRemoveStyleKeyword(i)}
                      className="hover:text-rose-400 text-slate-400 ml-0.5 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newStyleKeywordInput}
                  onChange={(e) => setNewStyleKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddStyleKeyword();
                    }
                  }}
                  placeholder="예: 트렌드 인사이트, 고화질 포토"
                  className="flex-1 bg-slate-950/70 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddStyleKeyword}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium rounded-lg border border-slate-700"
                >
                  추가
                </button>
              </div>
            </div>
          </div>
        )}

        {/* IMAGE & PROMPT TAB */}
        {activeTab === 'image' && (
          <div className="space-y-4">
            {/* Image Preview & Status */}
            <div className="space-y-2">
              <div className="relative rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 aspect-video flex items-center justify-center group shadow-inner">
                {slide.imageUrl ? (
                  <img
                    src={slide.imageUrl}
                    alt="Slide preview"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      // Gracefully handle preview error
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-slate-500 text-xs flex flex-col items-center gap-1">
                    <ImageIcon className="w-6 h-6 opacity-40" />
                    <span>이미지 없음</span>
                  </div>
                )}
                {slide.isGeneratingImage && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10">
                    <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
                    <span className="text-xs font-medium text-indigo-200">
                      AI 고화질 이미지 생성 중...
                    </span>
                  </div>
                )}
                {slide.imageUrl && !slide.isGeneratingImage && (
                  <div className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur-md px-2 py-1 rounded text-[10px] text-slate-300 font-mono border border-slate-700/50">
                    {slide.imageUrl.startsWith('data:image/') ? '📷 로컬 업로드' : '✨ 고화질 매칭'}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  disabled={slide.isGeneratingImage}
                  onClick={() => onGenerateImage(slide.id, slide.imagePrompt || '')}
                  className="flex-1 py-2.5 px-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {slide.isGeneratingImage ? '생성 중...' : 'AI 이미지 새로 생성'}
                </button>
                <button
                  disabled={isRefining}
                  onClick={() => onRefineSlide('new_image_prompt')}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
                  title="프롬프트 다시 작성"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  프롬프트 재작성
                </button>
              </div>
            </div>

            {/* 📸 Unsplash Dynamic Stock Matching Info & Action */}
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                  Unsplash 맥락 스톡 키워드
                </span>
                <button
                  type="button"
                  onClick={() => handleResetToTopicPhoto(true)}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-sky-950/60 hover:bg-sky-900/60 text-sky-300 rounded border border-sky-700/50 flex items-center gap-1 transition-all"
                  title="다른 스톡 사진으로 교체"
                >
                  <RefreshCw className="w-3 h-3" />
                  다른 사진 매칭
                </button>
              </div>

              {/* Display extracted keywords */}
              <div className="text-[11px] bg-slate-900/90 rounded-lg p-2.5 border border-slate-800/80 font-mono text-slate-300 space-y-1.5">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px]">1순위 검색어:</span>
                  <span className="text-sky-300 font-semibold bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800/40">
                    {slide.stockPhotoKeywords?.primary_keyword ||
                      extractStockKeywords({
                        headline: slide.headline,
                        body: slide.body,
                        slideNumber: slide.slideNumber,
                      }).primary_keyword}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px]">2순위 대안:</span>
                  <span className="text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/40">
                    {slide.stockPhotoKeywords?.secondary_keyword ||
                      extractStockKeywords({
                        headline: slide.headline,
                        body: slide.body,
                        slideNumber: slide.slideNumber,
                      }).secondary_keyword}
                  </span>
                </div>
              </div>
            </div>

            {/* 📁 Upload from PC (Drag and drop zone & file picker) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <FolderUp className="w-3.5 h-3.5 text-indigo-400" />
                  내 PC에서 이미지 업로드
                </label>
                {slide.imageUrl && (
                  <button
                    type="button"
                    onClick={() => handleResetToTopicPhoto(false)}
                    className="text-[11px] text-slate-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                    title="주제 맞춤 기본 사진으로 복원"
                  >
                    <RefreshCw className="w-3 h-3" />
                    기본 사진으로 리셋
                  </button>
                )}
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? 'border-indigo-400 bg-indigo-950/40 scale-[1.01]'
                    : 'border-slate-700/80 hover:border-indigo-500/70 bg-slate-950/50 hover:bg-slate-900/50'
                }`}
              >
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-200 hover:underline">
                      클릭하여 사진 파일 선택
                    </span>
                    <span className="text-xs text-slate-400"> 또는 파일 드래그</span>
                  </div>
                  
                  {/* Clipboard Ctrl+V Paste Guide */}
                  <div className="mt-1 flex items-center justify-center gap-1.5 px-2.5 py-1 bg-indigo-950/50 border border-indigo-500/20 rounded-lg text-[11px] text-indigo-300">
                    <ClipboardPaste className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>또는 이미지를 복사한 후 <kbd className="px-1.5 py-0.5 bg-indigo-900/80 border border-indigo-400/30 rounded text-[10px] font-mono font-bold text-white shadow-sm">Ctrl + V</kbd> 를 누르세요</span>
                  </div>

                  <span className="text-[10px] text-slate-500 mt-0.5">
                    JPG, PNG, WebP, GIF 지원 (최대 25MB)
                  </span>
                </div>
              </div>

              {/* Upload Status / Error Messages */}
              {uploadSuccess && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 rounded-lg px-2.5 py-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{uploadSuccess}</span>
                </div>
              )}
              {uploadError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-950/40 border border-rose-800/50 rounded-lg px-2.5 py-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>

            {/* 🖼️ Image Fit Mode & Object Position Alignment */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3 shadow-inner">
              <div>
                <label className="text-xs font-bold text-slate-200 flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                    이미지 맞춤 방식 (Fit)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {slide.imageFit === 'contain' ? '원본 1:1 유지' : '영역 꽉 채우기'}
                  </span>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateSlide({ imageFit: 'cover' })}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                      (slide.imageFit || 'cover') === 'cover'
                        ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500 shadow-sm font-bold'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>채우기 (Cover)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateSlide({ imageFit: 'contain' })}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                      slide.imageFit === 'contain'
                        ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500 shadow-sm font-bold'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <Minimize2 className="w-3.5 h-3.5 text-purple-400" />
                    <span>원본 비율 (Contain)</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  {slide.imageFit === 'contain'
                    ? '💡 1:1 이미지가 잘림 없이 프레임 안에 온전히 다 보입니다. (배경 빈 공간은 카드 테마 앰비언트로 자연스럽게 처리)'
                    : '💡 프레임에 꽉 차게 확대됩니다. 인물 얼굴이 잘리지 않도록 아래 초점을 조정하세요.'}
                </p>
              </div>

              {/* Object Position Alignment */}
              <div className="pt-2.5 border-t border-slate-800/80">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between mb-1.5">
                  <span>초점 기준점 (Object Position)</span>
                  <span className="text-[10px] text-slate-500">인물/주요 개체 정렬</span>
                </label>

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onUpdateSlide({ imagePosition: 'top' })}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 border transition-all ${
                      (slide.imagePosition || 'top') === 'top'
                        ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500 font-bold'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <ArrowUp className="w-3 h-3" />
                    <span>상단/얼굴</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateSlide({ imagePosition: 'center' })}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 border transition-all ${
                      slide.imagePosition === 'center'
                        ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500 font-bold'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <AlignCenter className="w-3 h-3" />
                    <span>중앙</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateSlide({ imagePosition: 'bottom' })}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 border transition-all ${
                      slide.imagePosition === 'bottom'
                        ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500 font-bold'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <ArrowDown className="w-3 h-3" />
                    <span>하단</span>
                  </button>
                </div>
              </div>
            </div>

            {/* AI Image Generation Prompt Box (ChatGPT / Gemini Optimized) */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI 이미지 생성용 프롬프트 (ChatGPT / 제미나이)
                </span>
                <button
                  onClick={handleCopyPrompt}
                  className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md border border-slate-700 flex items-center gap-1 transition-colors"
                >
                  {copiedPrompt ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">복사됨!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>프롬프트 복사</span>
                    </>
                  )}
                </button>
              </div>

              <textarea
                rows={4}
                value={slide.imagePrompt || ''}
                onChange={(e) => {
                  const newPrompt = e.target.value;
                  onUpdateSlide({
                    imagePrompt: newPrompt,
                  });
                }}
                className="w-full bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-indigo-500"
                placeholder="예: 따뜻한 원목 인테리어의 카페에서 노트북으로 SNS 마케팅 홍보 문구를 작성 중인 한국인 사장님, 자연스러운 표정과 조명, 고화질 실사 사진, 4:5 비율"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-500">
                  💡 ChatGPT(DALL-E 3)나 제미나이에 바로 입력할 수 있는 한국어 프롬프트입니다.
                </span>
                <button
                  type="button"
                  disabled={slide.isGeneratingImage || !slide.imagePrompt?.trim()}
                  onClick={() => onGenerateImage(slide.id, slide.imagePrompt || '')}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {slide.isGeneratingImage ? '생성 중...' : '이 프롬프트로 생성'}
                </button>
              </div>
            </div>

            {/* Korean Prompt & Scene Direction */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>한국어 연출 의도 및 해설</span>
                <span className="text-[10px] text-slate-500">구도 / 분위기 가이드</span>
              </label>
              <textarea
                rows={3}
                value={slide.imagePromptKorean || ''}
                onChange={(e) => onUpdateSlide({ imagePromptKorean: e.target.value })}
                className="w-full bg-slate-950/70 border border-slate-700/80 rounded-lg p-2.5 text-xs text-slate-300 leading-relaxed focus:outline-none focus:border-indigo-500"
                placeholder="이미지 시각 연출 가이드..."
              />
            </div>

            {/* Direct Image URL input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>직접 이미지 URL 지정</span>
                <span className="text-[10px] text-slate-500">Unsplash / 외부 링크</span>
              </label>
              <input
                type="text"
                value={slide.imageUrl || ''}
                onChange={(e) => onUpdateSlide({ imageUrl: e.target.value })}
                className="w-full bg-slate-950/70 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-mono"
                placeholder="https://images.unsplash.com/..."
              />
            </div>
          </div>
        )}

        {/* LAYOUT TAB */}
        {activeTab === 'layout' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Layout className="w-3.5 h-3.5 text-indigo-400" />
                  슬라이드 레이아웃 선택
                </label>
                <span className="text-[10px] text-slate-500 font-mono">
                  클릭 시 캔버스 즉각 반영
                </span>
              </div>

              {(() => {
                const currentActiveLayout: SlideLayout = 
                  slide.suggestedLayout || 
                  (slide.slideType === 'cover' || slide.slideNumber === 1 ? 'full_bg_overlay' :
                   slide.slideType === 'quote' ? 'quote_focus' :
                   slide.slideType === 'stat' ? 'stat_highlight' :
                   'split_top_image');

                const layoutOptions: Array<{
                  id: SlideLayout;
                  name: string;
                  desc: string;
                  badge: string;
                  icon: React.ReactNode;
                }> = [
                  {
                    id: 'split_top_image',
                    name: '이미지 상단 + 텍스트 하단',
                    desc: '매거진 표준 비주얼 주목형',
                    badge: '추천',
                    icon: <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />,
                  },
                  {
                    id: 'split_top_text',
                    name: '텍스트 상단 + 이미지 하단',
                    desc: '핵심 텍스트 우선 안정형',
                    badge: '인기',
                    icon: <AlignLeft className="w-3.5 h-3.5 text-sky-400" />,
                  },
                  {
                    id: 'full_bg_overlay',
                    name: '풀스크린 이미지 오버레이',
                    desc: '표지 & 임팩트 비주얼',
                    badge: '표지용',
                    icon: <Maximize2 className="w-3.5 h-3.5 text-amber-400" />,
                  },
                  {
                    id: 'quote_focus',
                    name: '인용구 & 명언 강조',
                    desc: '대화체/후기/핵심 인용',
                    badge: '인용구',
                    icon: <QuoteIcon className="w-3.5 h-3.5 text-emerald-400" />,
                  },
                  {
                    id: 'stat_highlight',
                    name: '통계 & 핵심 지표 강조',
                    desc: '숫자/비교 데이터 부각',
                    badge: '데이터',
                    icon: <BarChart3 className="w-3.5 h-3.5 text-rose-400" />,
                  },
                  {
                    id: 'card_centered',
                    name: '카드 중앙 집중형',
                    desc: '미니멀 센터 정렬',
                    badge: '미니멀',
                    icon: <AlignCenter className="w-3.5 h-3.5 text-purple-400" />,
                  },
                ];

                return (
                  <div className="grid grid-cols-2 gap-2">
                    {layoutOptions.map((item) => {
                      const isSelected = currentActiveLayout === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            onUpdateSlide({ suggestedLayout: item.id })
                          }
                          className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                            isSelected
                              ? 'bg-indigo-950/70 border-indigo-500 ring-2 ring-indigo-500/50 shadow-md'
                              : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-1.5">
                                {item.icon}
                                <span className={`font-bold text-xs ${isSelected ? 'text-indigo-200' : 'text-slate-200'}`}>
                                  {item.name}
                                </span>
                              </div>
                            </div>
                            <div className="text-[11px] text-slate-400 leading-tight">
                              {item.desc}
                            </div>
                          </div>

                          <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
                              {item.badge}
                            </span>
                            {isSelected && (
                              <span className="text-[10px] text-indigo-400 font-bold flex items-center gap-0.5">
                                <Check className="w-3 h-3 stroke-[3]" /> 적용 중
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Image Fit & Alignment Quick Toggle in Layout Tab */}
            <div className="space-y-2 pt-3 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                  이미지 맞춤 방식 (Fit)
                </span>
                <span className="text-[10px] text-slate-400">
                  {slide.imageFit === 'contain' ? '원본 1:1 유지' : '영역 꽉 채우기'}
                </span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateSlide({ imageFit: 'cover' })}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                    (slide.imageFit || 'cover') === 'cover'
                      ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500 shadow-sm font-bold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>채우기 (Cover)</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateSlide({ imageFit: 'contain' })}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                    slide.imageFit === 'contain'
                      ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500 shadow-sm font-bold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <Minimize2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>원본 비율 (Contain)</span>
                </button>
              </div>
            </div>

            {/* Custom Accent Color Overrides */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-300">
                개별 슬라이드 배경색 커스텀
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={slide.customBgColor || theme.cardBg}
                  onChange={(e) => onUpdateSlide({ customBgColor: e.target.value })}
                  className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                />
                <span className="text-xs font-mono text-slate-400">
                  {slide.customBgColor || theme.cardBg}
                </span>
                {slide.customBgColor && (
                  <button
                    onClick={() => onUpdateSlide({ customBgColor: undefined })}
                    className="text-[11px] text-rose-400 hover:underline ml-auto"
                  >
                    기본 테마로 복원
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
