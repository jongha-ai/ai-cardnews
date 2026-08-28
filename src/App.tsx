/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { CardNewsProject, CardSlide, GenerateCardNewsRequest, CardThemeId, AspectRatio } from './types';
import { CARD_THEMES } from './data/themes';
import { INITIAL_SAMPLE_PROJECT } from './data/samplePresets';
import { generatePromptAccurateDataUrl } from './utils/promptVisualGenerator';
import { getSmartTopicPhoto } from './utils/photoMatcher';
import { processImageBlobToBase64 } from './utils/imageUtils';
import { Header } from './components/Header';
import { CardSlideCanvas } from './components/CardSlideCanvas';
import { SlideEditorSidebar } from './components/SlideEditorSidebar';
import { SlideThumbnailList } from './components/SlideThumbnailList';
import { TopicGeneratorModal } from './components/TopicGeneratorModal';
import { ExportModal } from './components/ExportModal';
import { AllSlidesGridView } from './components/AllSlidesGridView';
import { ErrorBoundary } from './components/ErrorBoundary';
import confetti from 'canvas-confetti';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Wand2, 
  Download, 
  Layers, 
  Copy, 
  Check, 
  RefreshCw, 
  Eye, 
  Sliders,
  ClipboardCheck,
  ClipboardPaste,
  CheckCircle2
} from 'lucide-react';

export default function App() {
  const [project, setProject] = useState<CardNewsProject>(() => {
    const saved = localStorage.getItem('ai_cardnews_project');
    if (saved) {
      try {
        const parsed: CardNewsProject = JSON.parse(saved);
        // Automatically migrate any legacy mismatched stock photos, picsum URLs, or dummy SVG data URLs to authentic high-resolution topic photos
        if (parsed.slides && parsed.slides.length > 0) {
          parsed.slides = parsed.slides.map((s, idx) => {
            const hasLegacyMismatchedUrl =
              !s.imageUrl ||
              s.imageUrl.startsWith('data:image/svg+xml') ||
              s.imageUrl.includes('photo-1509198397868-475647b2a1e5') ||
              s.imageUrl.includes('photo-1550745165-9bc0b252726f') ||
              s.imageUrl.includes('picsum.photos');

            if (hasLegacyMismatchedUrl) {
              return {
                ...s,
                imageUrl: getSmartTopicPhoto({
                  headline: s.headline,
                  body: s.body,
                  slideNumber: s.slideNumber || idx + 1,
                }),
              };
            }
            return s;
          });
        }
        return parsed;
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_SAMPLE_PROJECT;
  });

  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'focus' | 'grid'>('focus');
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'preview' | 'edit'>('preview');
  const [pasteNotification, setPasteNotification] = useState<string | null>(null);

  // Save to localStorage on change safely
  useEffect(() => {
    try {
      localStorage.setItem('ai_cardnews_project', JSON.stringify(project));
    } catch (storageErr) {
      console.warn('localStorage autosave failed (e.g. storage quota):', storageErr);
    }
  }, [project]);

  // Ensure active index is within bounds
  const currentSlideIndex = Math.min(Math.max(0, activeSlideIndex), Math.max(0, project.slides.length - 1));
  const currentSlide = project.slides[currentSlideIndex] || project.slides[0];
  const currentTheme = CARD_THEMES[project.themeId] || CARD_THEMES.dark_tech;

  // Global Clipboard Image Paste Handler (Ctrl + V / Cmd + V)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      // Don't intercept text pastes into input or textarea elements
      const target = e.target as HTMLElement | null;
      const isTextInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      const items = e.clipboardData?.items;
      if (!items || items.length === 0) return;

      let imageItem: DataTransferItem | null = null;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          imageItem = items[i];
          break;
        }
      }

      // If an image is in the clipboard, process and update current slide
      if (imageItem) {
        // Prevent default browser paste behavior if pasting an image
        e.preventDefault();

        const file = imageItem.getAsFile();
        if (!file) return;

        try {
          const base64Url = await processImageBlobToBase64(file, 1600, 0.92);
          
          // Apply to current slide
          setProject((prev) => {
            if (!prev.slides || prev.slides.length === 0) return prev;
            const updatedSlides = [...prev.slides];
            const targetIdx = Math.min(Math.max(0, activeSlideIndex), prev.slides.length - 1);
            updatedSlides[targetIdx] = {
              ...updatedSlides[targetIdx],
              imageUrl: base64Url,
            };
            return { ...prev, slides: updatedSlides };
          });

          setPasteNotification(`슬라이드 #${currentSlideIndex + 1}에 클립보드 이미지가 즉시 적용되었습니다!`);
          setTimeout(() => setPasteNotification(null), 3500);
        } catch (err: any) {
          console.error('Failed to paste clipboard image:', err);
          alert(`클립보드 이미지 처리 실패: ${err?.message || '알 수 없는 오류'}`);
        }
      } else if (!isTextInput && e.clipboardData?.files && e.clipboardData.files.length > 0) {
        // Fallback for file drop/paste without items API
        const file = e.clipboardData.files[0];
        if (file && file.type.startsWith('image/')) {
          e.preventDefault();
          try {
            const base64Url = await processImageBlobToBase64(file, 1600, 0.92);
            setProject((prev) => {
              if (!prev.slides || prev.slides.length === 0) return prev;
              const updatedSlides = [...prev.slides];
              const targetIdx = Math.min(Math.max(0, activeSlideIndex), prev.slides.length - 1);
              updatedSlides[targetIdx] = {
                ...updatedSlides[targetIdx],
                imageUrl: base64Url,
              };
              return { ...prev, slides: updatedSlides };
            });
            setPasteNotification(`슬라이드 #${currentSlideIndex + 1}에 클립보드 이미지가 즉시 적용되었습니다!`);
            setTimeout(() => setPasteNotification(null), 3500);
          } catch (err) {
            console.error('Failed to paste file:', err);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [activeSlideIndex, currentSlideIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'ArrowLeft' && currentSlideIndex > 0) {
        setActiveSlideIndex(currentSlideIndex - 1);
      } else if (e.key === 'ArrowRight' && currentSlideIndex < project.slides.length - 1) {
        setActiveSlideIndex(currentSlideIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlideIndex, project.slides.length]);

  // Generate Card News via API
  const handleGenerateCardNews = async (request: GenerateCardNewsRequest) => {
    try {
      setIsGenerating(true);
      const res = await fetch('/api/generate-cardnews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || '카드뉴스 생성에 실패했습니다.');
      }

      const data = await res.json();

      const newProject: CardNewsProject = {
        id: `project-${Date.now()}`,
        title: data.title || request.topic,
        subTitle: data.subTitle || '',
        category: data.category || 'TREND',
        topic: request.topic,
        purpose: request.purpose || '',
        targetAudience: request.targetAudience || '',
        tone: request.tone || '',
        tags: data.tags || ['#카드뉴스', '#AI'],
        aspectRatio: request.aspectRatio || '1:1',
        themeId: request.themeId || 'dark_tech',
        createdAt: new Date().toISOString(),
        slides: data.slides || [],
      };

      setProject(newProject);
      setActiveSlideIndex(0);
      setIsNewModalOpen(false);
      setViewMode('focus');
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
    } catch (err: any) {
      console.error('Generation failed:', err);
      alert(err.message || '카드뉴스 생성 중 문제가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Update specific slide
  const handleUpdateSlide = (updatedFields: Partial<CardSlide>) => {
    setProject((prev) => {
      const updatedSlides = [...prev.slides];
      updatedSlides[currentSlideIndex] = {
        ...updatedSlides[currentSlideIndex],
        ...updatedFields,
      };
      return { ...prev, slides: updatedSlides };
    });
  };

  // Update overall project
  const handleUpdateProject = (updates: Partial<CardNewsProject>) => {
    setProject((prev) => ({ ...prev, ...updates }));
  };

  // Refine current slide with AI
  const handleRefineSlide = async (action: 'more_punchy' | 'more_professional' | 'shorter' | 'new_image_prompt' | 'rewrite_body') => {
    try {
      setIsRefining(true);
      const res = await fetch('/api/refine-slide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slide: currentSlide,
          action,
          projectContext: {
            topic: project.topic || project.title || '카드뉴스',
            targetAudience: project.targetAudience || '독자',
            tone: project.tone || '신뢰감 있고 명쾌한 어조',
          },
        }),
      });

      if (!res.ok) {
        throw new Error('슬라이드 개선에 실패했습니다.');
      }

      const refined = await res.json();
      if (refined) {
        handleUpdateSlide(refined);
      }
    } catch (err: any) {
      console.error('Refine error:', err);
      alert(err.message || '슬라이드 수정 중 오류가 발생했습니다.');
    } finally {
      setIsRefining(false);
    }
  };

  // Generate AI Image for a slide
  const handleGenerateImage = async (slideId: string, prompt: string) => {
    const targetPrompt = (prompt || '').trim();
    if (!targetPrompt) {
      alert('이미지를 생성할 영문 프롬프트(prompt)를 입력해주세요.');
      return;
    }

    try {
      // Mark as generating & sync latest prompt
      setProject((prev) => ({
        ...prev,
        slides: prev.slides.map((s) =>
          s.id === slideId ? { ...s, isGeneratingImage: true, imagePrompt: targetPrompt } : s
        ),
      }));

      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: targetPrompt,
          aspectRatio: project.aspectRatio || '1:1',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'AI 이미지 생성 요청 실패');
      }

      const data = await res.json();
      if (!data.imageUrl) {
        throw new Error('생성된 AI 이미지 데이터가 없습니다.');
      }

      setProject((prev) => ({
        ...prev,
        slides: prev.slides.map((s) =>
          s.id === slideId
            ? { ...s, imageUrl: data.imageUrl, isGeneratingImage: false }
            : s
        ),
      }));

      setPasteNotification('✨ AI 고화질 이미지가 성공적으로 생성되었습니다!');
      setTimeout(() => setPasteNotification(null), 3500);
    } catch (err: any) {
      console.error('AI image generation error:', err);
      alert(err.message || 'AI 이미지 생성 중 오류가 발생했습니다.');
      setProject((prev) => ({
        ...prev,
        slides: prev.slides.map((s) =>
          s.id === slideId ? { ...s, isGeneratingImage: false } : s
        ),
      }));
    }
  };

  // Slide management: Add, Delete, Duplicate, Move
  const handleAddSlide = () => {
    const nextNumber = project.slides.length + 1;
    const defaultHeadline = `새로운 핵심 포인트 0${nextNumber}`;
    const defaultBody = '여기에 전달하고자 하는 핵심 설명 및 인사이트를 작성하세요.';
    const defaultPhoto = getSmartTopicPhoto({
      headline: defaultHeadline,
      body: defaultBody,
      slideNumber: nextNumber,
    });

    const newSlide: CardSlide = {
      id: `slide-${Date.now()}`,
      slideNumber: nextNumber,
      slideType: 'body',
      badgeText: `POINT 0${nextNumber}`,
      headline: `새 슬라이드 ${nextNumber}\n핵심 메시지를 적어주세요`,
      body: '상세 내용을 2~3문장으로 간결하게 구성하세요.',
      highlightWords: ['새 슬라이드'],
      imagePrompt: `A high quality aesthetic modern photography matching ${project.topic || 'lifestyle and business'}, clean studio lighting, high resolution --ar ${project.aspectRatio === '4:5' ? '4:5' : project.aspectRatio === '9:16' ? '9:16' : '1:1'}`,
      imagePromptKorean: '주제와 자연스럽게 어우러지는 세련된 고화질 비주얼',
      imageStyleKeywords: ['고화질 포토', '미니멀', '스튜디오 조명'],
      suggestedLayout: 'split_top_image',
      imageUrl: defaultPhoto,
    };

    setProject((prev) => ({
      ...prev,
      slides: [...prev.slides, newSlide],
    }));
    setActiveSlideIndex(project.slides.length);
  };

  const handleDeleteSlide = (index: number) => {
    if (project.slides.length <= 1) {
      alert('최소 1개의 슬라이드가 필요합니다.');
      return;
    }
    const updated = project.slides.filter((_, i) => i !== index).map((s, i) => ({
      ...s,
      slideNumber: i + 1,
    }));
    setProject((prev) => ({ ...prev, slides: updated }));
    if (activeSlideIndex >= updated.length) {
      setActiveSlideIndex(updated.length - 1);
    }
  };

  const handleDuplicateSlide = (index: number) => {
    const target = project.slides[index];
    const duplicated: CardSlide = {
      ...target,
      id: `slide-${Date.now()}`,
      headline: `${target.headline} (복사본)`,
    };
    const updated = [
      ...project.slides.slice(0, index + 1),
      duplicated,
      ...project.slides.slice(index + 1),
    ].map((s, i) => ({ ...s, slideNumber: i + 1 }));

    setProject((prev) => ({ ...prev, slides: updated }));
    setActiveSlideIndex(index + 1);
  };

  const handleMoveSlide = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= project.slides.length) return;
    const updated = [...project.slides];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    const renumbered = updated.map((s, i) => ({ ...s, slideNumber: i + 1 }));
    setProject((prev) => ({ ...prev, slides: renumbered }));
    setActiveSlideIndex(toIndex);
  };

  const handleApplyFontsToAllSlides = (headlineFont: string, bodyFont: string) => {
    setProject((prev) => ({
      ...prev,
      headlineFont,
      bodyFont,
      slides: prev.slides.map((s) => ({
        ...s,
        customHeadlineFont: headlineFont,
        customBodyFont: bodyFont,
      })),
    }));
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* Top Navigation Bar */}
      <Header
        project={project}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        onUpdateProject={handleUpdateProject}
        onOpenNewModal={() => setIsNewModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {viewMode === 'grid' ? (
          /* ALL SLIDES GRID OVERVIEW */
          <AllSlidesGridView
            slides={project.slides}
            theme={currentTheme}
            aspectRatio={project.aspectRatio}
            category={project.category}
            projectHeadlineFont={project.headlineFont}
            projectBodyFont={project.bodyFont}
            onSelectSlide={(index) => {
              setActiveSlideIndex(index);
              setViewMode('focus');
            }}
            onOpenExport={() => setIsExportModalOpen(true)}
          />
        ) : (
          /* FOCUS SINGLE SLIDE EDITOR */
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden w-full">
            {/* Mobile View Toggle Tabs (Small Screens Only) */}
            <div className="lg:hidden flex bg-slate-900 border-b border-slate-800 p-2 gap-2">
              <button
                onClick={() => setMobileTab('preview')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  mobileTab === 'preview'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 bg-slate-950'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                카드 미리보기
              </button>
              <button
                onClick={() => setMobileTab('edit')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  mobileTab === 'edit'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 bg-slate-950'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                헤드라인 & 프롬프트 편집
              </button>
            </div>

            {/* Left/Center: Visual Stage / Canvas */}
            <div
              className={`flex-1 flex flex-col items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-y-auto relative ${
                mobileTab === 'edit' ? 'hidden lg:flex' : 'flex'
              }`}
            >
              {/* Carousel Previous / Next Navigation Arrows */}
              <div className="w-full max-w-4xl flex items-center justify-between gap-2 sm:gap-4 mb-3 px-2">
                <button
                  disabled={currentSlideIndex === 0}
                  onClick={() => setActiveSlideIndex(currentSlideIndex - 1)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-md"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">이전 카드</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400">
                    <strong className="text-indigo-400">{currentSlideIndex + 1}</strong> / {project.slides.length}
                  </span>

                  {/* Ratio Selector Pill */}
                  <div className="flex items-center bg-slate-950/80 border border-slate-800/90 rounded-lg p-0.5 shadow-inner">
                    {(['1:1', '4:5', '9:16'] as AspectRatio[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => handleUpdateProject({ aspectRatio: r })}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all ${
                          project.aspectRatio === r
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title={
                          r === '1:1'
                            ? '1:1 정사각형'
                            : r === '4:5'
                            ? '4:5 인스타 피드'
                            : '9:16 릴스/스토리'
                        }
                      >
                        {r}
                      </button>
                    ))}
                  </div>

                  <span className="hidden md:inline text-[10px] text-slate-500 font-medium">
                    {project.aspectRatio === '1:1'
                      ? '피드 정사각형'
                      : project.aspectRatio === '4:5'
                      ? '인스타 피드 세로'
                      : '릴스/스토리'}
                  </span>
                </div>

                <button
                  disabled={currentSlideIndex === project.slides.length - 1}
                  onClick={() => setActiveSlideIndex(currentSlideIndex + 1)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-md"
                >
                  <span className="hidden sm:inline">다음 카드</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Rendered Card Canvas */}
              {currentSlide && (
                <div className="flex items-center justify-center w-full max-w-xl transition-all duration-300 my-auto py-2">
                  <ErrorBoundary fallbackTitle={`슬라이드 ${currentSlideIndex + 1} 렌더링 오류`}>
                    <CardSlideCanvas
                      slide={currentSlide}
                      theme={currentTheme}
                      aspectRatio={project.aspectRatio}
                      totalSlides={project.slides.length}
                      projectCategory={project.category}
                      projectHeadlineFont={project.headlineFont}
                      projectBodyFont={project.bodyFont}
                      onNextSlide={() => {
                        if (currentSlideIndex < project.slides.length - 1) {
                          setActiveSlideIndex(currentSlideIndex + 1);
                        }
                      }}
                      onPrevSlide={() => {
                        if (currentSlideIndex > 0) {
                          setActiveSlideIndex(currentSlideIndex - 1);
                        }
                      }}
                      onOpenExport={() => setIsExportModalOpen(true)}
                    />
                  </ErrorBoundary>
                </div>
              )}
            </div>

            {/* Right: Slide Editor Sidebar */}
            <div
              className={`flex-shrink-0 ${
                mobileTab === 'preview' ? 'hidden lg:flex' : 'flex'
              }`}
            >
              {currentSlide && (
                <SlideEditorSidebar
                  slide={currentSlide}
                  theme={currentTheme}
                  totalSlides={project.slides.length}
                  projectHeadlineFont={project.headlineFont}
                  projectBodyFont={project.bodyFont}
                  onUpdateSlide={handleUpdateSlide}
                  onRefineSlide={handleRefineSlide}
                  onGenerateImage={handleGenerateImage}
                  onApplyFontsToAllSlides={handleApplyFontsToAllSlides}
                  isRefining={isRefining}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      {viewMode === 'focus' && (
        <SlideThumbnailList
          slides={project.slides}
          theme={currentTheme}
          aspectRatio={project.aspectRatio}
          activeIndex={currentSlideIndex}
          onSelectSlide={(idx) => {
            setActiveSlideIndex(idx);
            setMobileTab('preview');
          }}
          onAddSlide={handleAddSlide}
          onDeleteSlide={handleDeleteSlide}
          onDuplicateSlide={handleDuplicateSlide}
          onMoveSlide={handleMoveSlide}
        />
      )}

      {/* Topic Generator Modal */}
      <TopicGeneratorModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onGenerate={handleGenerateCardNews}
        isGenerating={isGenerating}
      />

      {/* Export / Share Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        project={project}
        theme={currentTheme}
        activeSlideIndex={currentSlideIndex}
      />

      {/* 📋 Global Clipboard Image Paste Toast */}
      {pasteNotification && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 bg-indigo-950/95 border border-indigo-500/50 rounded-xl text-xs font-semibold text-white shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <span>{pasteNotification}</span>
        </div>
      )}
    </div>
  );
}
