import React from 'react';
import { CardSlide, AspectRatio, CardTheme } from '../types';
import { Plus, Trash2, Copy, Sparkles, ChevronUp, ChevronDown } from 'lucide-react';

interface SlideThumbnailListProps {
  slides: CardSlide[];
  theme: CardTheme;
  aspectRatio: AspectRatio;
  activeIndex: number;
  onSelectSlide: (index: number) => void;
  onAddSlide: () => void;
  onDeleteSlide: (index: number) => void;
  onDuplicateSlide: (index: number) => void;
  onMoveSlide: (fromIndex: number, toIndex: number) => void;
}

export const SlideThumbnailList: React.FC<SlideThumbnailListProps> = ({
  slides,
  theme,
  aspectRatio,
  activeIndex,
  onSelectSlide,
  onAddSlide,
  onDeleteSlide,
  onDuplicateSlide,
  onMoveSlide,
}) => {
  const ratioClasses = {
    '1:1': 'aspect-square w-28 sm:w-32',
    '4:5': 'aspect-[4/5] w-24 sm:w-28',
    '9:16': 'aspect-[9/16] w-20 sm:w-24',
  }[aspectRatio];

  return (
    <div className="w-full bg-slate-950/80 backdrop-blur-md border-t border-slate-800 p-3 sm:p-4 flex items-center gap-3 overflow-x-auto custom-scrollbar">
      {/* Slides list */}
      <div className="flex items-center gap-3">
        {slides.map((slide, index) => {
          const isActive = index === activeIndex;

          return (
            <div
              key={slide.id || index}
              className="relative flex-shrink-0 group flex flex-col items-center"
            >
              {/* Thumbnail card */}
              <button
                onClick={() => onSelectSlide(index)}
                className={`relative overflow-hidden rounded-xl border-2 transition-all p-2 text-left flex flex-col justify-between ${ratioClasses} ${
                  isActive
                    ? 'border-indigo-500 ring-2 ring-indigo-500/40 shadow-lg shadow-indigo-500/20 scale-[1.02]'
                    : 'border-slate-800 hover:border-slate-600 bg-slate-900 opacity-75 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: slide.customBgColor || theme.cardBg,
                }}
              >
                {/* Background image preview if available */}
                {slide?.imageUrl && (
                  <img
                    src={slide.imageUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                    className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none"
                  />
                )}

                {/* Top Badge */}
                <div className="relative z-10 flex items-center justify-between w-full">
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: theme.badgeBg,
                      color: theme.badgeText,
                    }}
                  >
                    {slide.badgeText || `0${index + 1}`}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400">
                    #{index + 1}
                  </span>
                </div>

                {/* Micro Headline */}
                <div className="relative z-10 my-auto">
                  <p
                    className="text-[10px] font-bold line-clamp-2 leading-tight"
                    style={{ color: slide.customTextColor || theme.textPrimary }}
                  >
                    {slide.headline || '제목 없음'}
                  </p>
                </div>

                {/* Footer status */}
                <div className="relative z-10 flex items-center justify-between w-full text-[8px] text-slate-400">
                  <span className="truncate max-w-[60px]">
                    {slide.slideType}
                  </span>
                  {slide.imageUrl ? (
                    <span className="text-emerald-400">●</span>
                  ) : (
                    <span className="text-slate-600">○</span>
                  )}
                </div>
              </button>

              {/* Floating action buttons on hover */}
              <div className="absolute -top-2 -right-2 hidden group-hover:flex items-center gap-0.5 bg-slate-900 border border-slate-700 rounded-lg p-0.5 shadow-xl z-20">
                {index > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveSlide(index, index - 1);
                    }}
                    className="p-1 hover:bg-slate-800 text-slate-300 rounded"
                    title="앞으로 이동"
                  >
                    <ChevronUp className="w-3 h-3 rotate-[-90deg]" />
                  </button>
                )}
                {index < slides.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveSlide(index, index + 1);
                    }}
                    className="p-1 hover:bg-slate-800 text-slate-300 rounded"
                    title="뒤로 이동"
                  >
                    <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicateSlide(index);
                  }}
                  className="p-1 hover:bg-slate-800 text-slate-300 rounded"
                  title="복제"
                >
                  <Copy className="w-3 h-3" />
                </button>
                {slides.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSlide(index);
                    }}
                    className="p-1 hover:bg-rose-950 text-rose-400 rounded"
                    title="삭제"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Add Slide Button */}
        <button
          onClick={onAddSlide}
          className={`flex-shrink-0 flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-700 hover:border-indigo-500 hover:bg-indigo-950/20 text-slate-400 hover:text-indigo-300 transition-all ${ratioClasses}`}
        >
          <Plus className="w-5 h-5" />
          <span className="text-[11px] font-bold">슬라이드 추가</span>
        </button>
      </div>
    </div>
  );
};
