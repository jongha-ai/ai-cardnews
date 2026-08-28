import React, { useState, useRef, useEffect } from 'react';
import { FONT_OPTIONS, FontOption, getFontByFamilyOrId } from '../data/fonts';
import { ChevronDown, Check, Type, Sparkles } from 'lucide-react';

interface FontPickerDropdownProps {
  label: string;
  selectedFontFamily?: string;
  onChange: (fontFamily: string) => void;
  recommendedType?: 'headline' | 'body';
}

export const FontPickerDropdown: React.FC<FontPickerDropdownProps> = ({
  label,
  selectedFontFamily,
  onChange,
  recommendedType,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentFont = getFontByFamilyOrId(selectedFontFamily);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredFonts = FONT_OPTIONS.filter((f) => {
    if (selectedCategory === 'all') return true;
    return f.category === selectedCategory;
  });

  return (
    <div className="space-y-1.5 relative" ref={dropdownRef}>
      <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5 text-indigo-400" />
          {label}
        </span>
        <span className="text-[10px] text-slate-400 font-mono">
          {currentFont.name.split(' ')[0]}
        </span>
      </label>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-950/80 hover:bg-slate-900 border border-slate-700/80 hover:border-slate-600 rounded-xl px-3 py-2.5 text-left text-slate-100 flex items-center justify-between transition-all group focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      >
        <div className="flex flex-col min-w-0 pr-2">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold text-slate-100 truncate">
              {currentFont.name}
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {currentFont.categoryName}
            </span>
          </div>
          <span
            className="text-xs text-slate-400 truncate opacity-90"
            style={{ fontFamily: currentFont.fontFamily }}
          >
            {currentFont.previewText}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-transform flex-shrink-0 ${
            isOpen ? 'rotate-180 text-indigo-400' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Modal / Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-fade-in backdrop-blur-xl">
          {/* Category Filter Tabs */}
          <div className="p-2 border-b border-slate-800 bg-slate-950/60 flex items-center gap-1 overflow-x-auto custom-scrollbar text-[11px]">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-2 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              전체 ({FONT_OPTIONS.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('sans')}
              className={`px-2 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                selectedCategory === 'sans'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              고딕/기본
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('impact')}
              className={`px-2 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                selectedCategory === 'impact'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              제목/임팩트
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('serif')}
              className={`px-2 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                selectedCategory === 'serif'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              명조/감성
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('handwriting')}
              className={`px-2 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                selectedCategory === 'handwriting'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              손글씨/캐주얼
            </button>
          </div>

          {/* Font List Items */}
          <div className="max-h-64 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
            {filteredFonts.map((font) => {
              const isSelected =
                currentFont.id === font.id ||
                currentFont.fontFamily === font.fontFamily;
              const isRecommended =
                recommendedType &&
                (font.recommendedFor === 'both' ||
                  font.recommendedFor === recommendedType);

              return (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => {
                    onChange(font.fontFamily);
                    setIsOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-lg text-left transition-all flex items-start justify-between group ${
                    isSelected
                      ? 'bg-indigo-950/90 border border-indigo-500/60 text-white shadow-inner'
                      : 'hover:bg-slate-800/80 text-slate-300 hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                        {font.name}
                      </span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {font.categoryName}
                      </span>
                      {isRecommended && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" />
                          추천
                        </span>
                      )}
                    </div>
                    {/* Live Font Typography Preview */}
                    <div
                      className="text-sm font-semibold tracking-normal text-slate-100 my-0.5"
                      style={{ fontFamily: font.fontFamily }}
                    >
                      {font.previewText}
                    </div>
                    <span className="text-[10px] text-slate-400 opacity-80">
                      {font.description}
                    </span>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white flex-shrink-0 mt-1">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
