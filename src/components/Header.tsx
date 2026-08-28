import React from 'react';
import { CardNewsProject, AspectRatio, CardThemeId } from '../types';
import { CARD_THEMES } from '../data/themes';
import { AiworksLogo } from './AiworksLogo';
import { 
  Sparkles, 
  Download, 
  Plus, 
  Grid, 
  Square, 
  Palette, 
  LayoutTemplate,
  FileEdit,
  Share2
} from 'lucide-react';

interface HeaderProps {
  project: CardNewsProject;
  viewMode: 'focus' | 'grid';
  onToggleViewMode: (mode: 'focus' | 'grid') => void;
  onUpdateProject: (updates: Partial<CardNewsProject>) => void;
  onOpenNewModal: () => void;
  onOpenExportModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  viewMode,
  onToggleViewMode,
  onUpdateProject,
  onOpenNewModal,
  onOpenExportModal,
}) => {
  return (
    <header className="h-16 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 px-3.5 sm:px-6 flex items-center justify-between z-30 flex-shrink-0">
      {/* Left: AIWORKS Official Brand & Editable Project Title */}
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-950/70 border border-slate-800 rounded-xl hover:border-slate-700 transition-all shadow-sm">
            <AiworksLogo height={30} />
            <div className="h-4 w-px bg-slate-800 hidden lg:block" />
            <span className="text-xs font-bold text-indigo-300 hidden lg:inline tracking-tight">
              카드뉴스 스튜디오
            </span>
          </div>
        </div>

        {/* Vertical divider */}
        <div className="h-6 w-px bg-slate-800 hidden md:block" />

        {/* Editable Title */}
        <div className="flex items-center gap-2 min-w-0">
          <input
            type="text"
            value={project.title}
            onChange={(e) => onUpdateProject({ title: e.target.value })}
            className="bg-transparent hover:bg-slate-800/50 focus:bg-slate-950/80 px-2 py-1 rounded-lg text-xs sm:text-sm font-bold text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all truncate max-w-[160px] sm:max-w-xs md:max-w-md border border-transparent hover:border-slate-700/60 focus:border-indigo-500"
            placeholder="카드뉴스 프로젝트 제목"
          />
        </div>
      </div>

      {/* Right: Controls & Actions */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Ratio Selector */}
        <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
          {(['1:1', '4:5', '9:16'] as AspectRatio[]).map((ratio) => (
            <button
              key={ratio}
              onClick={() => onUpdateProject({ aspectRatio: ratio })}
              className={`px-2 sm:px-2.5 py-1 rounded-lg font-bold text-[11px] sm:text-xs transition-all ${
                project.aspectRatio === ratio
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={
                ratio === '1:1'
                  ? '1:1 정사각형 (피드)'
                  : ratio === '4:5'
                  ? '4:5 세로형 (인스타 피드)'
                  : '9:16 세로형 (릴스/스토리)'
              }
            >
              {ratio}
            </button>
          ))}
        </div>

        {/* Theme Dropdown */}
        <div className="relative">
          <select
            value={project.themeId}
            onChange={(e) => onUpdateProject({ themeId: e.target.value as CardThemeId })}
            className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold rounded-xl px-2.5 sm:px-3 py-2 pr-7 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none"
          >
            {Object.values(CARD_THEMES).map((t) => (
              <option key={t.id} value={t.id}>
                🎨 {t.nameEn}
              </option>
            ))}
          </select>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">
            ▼
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => onToggleViewMode('focus')}
            title="단일 카드 집중 편집"
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === 'focus'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Square className="w-4 h-4" />
          </button>
          <button
            onClick={() => onToggleViewMode('grid')}
            title="전체 덱 보기"
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === 'grid'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>
        </div>

        {/* New Generation Button */}
        <button
          onClick={onOpenNewModal}
          className="px-3 sm:px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4 text-indigo-400" />
          <span className="hidden sm:inline">새 카드뉴스</span>
        </button>

        {/* Export / Share Button */}
        <button
          onClick={onOpenExportModal}
          className="px-3.5 sm:px-4 py-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all transform active:scale-95"
        >
          <Download className="w-4 h-4" />
          <span>내보내기</span>
        </button>
      </div>
    </header>
  );
};
