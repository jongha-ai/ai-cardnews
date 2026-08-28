import React from 'react';
import { CardSlide, AspectRatio, CardTheme } from '../types';
import { CardSlideCanvas } from './CardSlideCanvas';
import { ErrorBoundary } from './ErrorBoundary';
import { Edit3, Download } from 'lucide-react';

interface AllSlidesGridViewProps {
  slides: CardSlide[];
  theme: CardTheme;
  aspectRatio: AspectRatio;
  category?: string;
  projectHeadlineFont?: string;
  projectBodyFont?: string;
  onSelectSlide: (index: number) => void;
  onOpenExport: () => void;
}

export const AllSlidesGridView: React.FC<AllSlidesGridViewProps> = ({
  slides = [],
  theme,
  aspectRatio,
  category,
  projectHeadlineFont,
  projectBodyFont,
  onSelectSlide,
  onOpenExport,
}) => {
  return (
    <div className="w-full h-full overflow-y-auto p-6 sm:p-8 custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              전체 카드뉴스 슬라이드 덱 ({slides?.length || 0}장)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              카드를 클릭하면 해당 슬라이드 편집 모드로 전환됩니다.
            </p>
          </div>
          <button
            onClick={onOpenExport}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all"
          >
            <Download className="w-4 h-4" />
            전체 다운로드 / 내보내기
          </button>
        </div>

        {/* Grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(slides || []).map((slide, index) => (
            <div
              key={slide?.id || index}
              onClick={() => onSelectSlide(index)}
              className="group cursor-pointer flex flex-col space-y-2 relative"
            >
              <div className="relative rounded-2xl transition-all duration-300 group-hover:scale-[1.01] group-hover:shadow-2xl group-hover:shadow-indigo-500/10">
                <ErrorBoundary fallbackTitle={`슬라이드 ${index + 1} 렌더링 에러`}>
                  <CardSlideCanvas
                    slide={slide}
                    theme={theme}
                    aspectRatio={aspectRatio}
                    totalSlides={slides.length}
                    projectCategory={category}
                    projectHeadlineFont={projectHeadlineFont}
                    projectBodyFont={projectBodyFont}
                    className="w-full pointer-events-none"
                  />
                </ErrorBoundary>

                {/* Hover overlay with edit button */}
                <div className="absolute inset-0 bg-indigo-950/30 opacity-0 group-hover:opacity-100 backdrop-blur-[2px] rounded-2xl flex items-center justify-center transition-all duration-200">
                  <div className="px-4 py-2 bg-slate-900/90 text-white text-xs font-bold rounded-xl border border-slate-700 shadow-xl flex items-center gap-2">
                    <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                    슬라이드 {index + 1} 편집하기
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between px-1 text-xs">
                <span className="font-semibold text-slate-300">
                  {index + 1}. {slide?.badgeText || slide?.slideType || '슬라이드'}
                </span>
                <span className="text-[11px] text-slate-500 font-mono truncate max-w-[160px]">
                  {(slide?.imagePrompt || '').slice(0, 30)}...
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
