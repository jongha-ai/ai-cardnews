import React, { useState } from 'react';
import { CardSlide, StoryDirectorAnalysis, SlideType } from '../types';
import { 
  Sparkles, 
  X, 
  ArrowRight, 
  TrendingUp, 
  Repeat, 
  Layers, 
  CheckSquare, 
  Square as SquareIcon,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface StoryDirectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  slides?: CardSlide[];
}

// Role styling helper
const ROLE_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  cover: { label: '커버 (Cover)', bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  problem: { label: '문제 제기 (Problem)', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
  body: { label: '본문 (Body)', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  stat: { label: '수치/통계 (Stat)', bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  tip: { label: '실전 팁 (Tip)', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  quote: { label: '인용 (Quote)', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  summary: { label: '요약 (Summary)', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  cta: { label: '행동 유도 (CTA)', bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/30' },
};

// Base mock suggestions with distinctly improved copy for testing Before / After comparison
const BASE_MOCK_SUGGESTIONS = [
  {
    slideNumber: 1,
    originalRole: 'cover' as SlideType,
    suggestedRole: 'cover' as SlideType,
    badgeText: '핵심 전략',
    headline: '사회초년생 첫 월급 관리,\n돈이 저절로 모이는 4단계 법칙',
    body: '스쳐 지나가는 통장 대신 \'선저축 후지출\' 시스템으로 4단계 자산 로드맵을 완성하는 실전 가이드입니다.',
    highlightWords: ['사회초년생', '첫 월급 관리', '선저축 후지출', '4단계 자산 로드맵'],
    changeReason: '기존 질문형 커버를 \'저절로 모이는 4단계 법칙\'이라는 명확하고 강렬한 솔루션 중심 헤드라인으로 다듬었습니다.'
  },
  {
    slideNumber: 2,
    originalRole: 'problem' as SlideType,
    suggestedRole: 'problem' as SlideType,
    badgeText: '문제 인식',
    headline: '“남은 돈 모으기”는 왜 100% 실패할까요?',
    body: '지출 후 남은 돈을 모으려는 습관은 매달 통장을 비우게 만듭니다. 성공하는 재테크의 첫 단추는 지출 통제가 아닌 \'선저축\'입니다.',
    highlightWords: ['남은 돈 모으기', '100% 실패', '선저축'],
    changeReason: '실패 원인을 직접 질문형으로 제시하여 독자의 경각심과 다음 솔루션에 대한 몰입도를 극대화했습니다.'
  },
  {
    slideNumber: 3,
    originalRole: 'body' as SlideType,
    suggestedRole: 'body' as SlideType,
    badgeText: '핵심 솔루션',
    headline: '급여·고정·소비·비상금,\n4개 통장으로 자동 분류 시스템 구축',
    body: '단 하나의 통장 사용이 과소비의 주원인입니다. 4개 통장으로 자동이체 파이프라인을 구축해 의지력 없이도 돈이 모이게 만드세요.',
    highlightWords: ['4개 통장', '자동이체 파이프라인', '자동 분류 시스템'],
    changeReason: '단순한 나열 대신 \'자동 분류 시스템\'이라는 구체적 체계성을 강조하여 실행력을 높였습니다.'
  },
  {
    slideNumber: 4,
    originalRole: 'tip' as SlideType,
    suggestedRole: 'tip' as SlideType,
    badgeText: '실전 노하우',
    headline: '적금 깨지 않는 비결,\n월급 3~6배 비상금 파킹통장 분리',
    body: '예상치 못한 지출에 적금을 해지하지 않도록, 수시입출금 고금리 파킹통장에 3~6개월 치 비상금을 철저히 격리하세요.',
    highlightWords: ['적금 해지 방지', '3~6배 비상금', '파킹통장 분리'],
    changeReason: '비상금 통장의 목적(적금 해지 방지)을 헤드라인 전면에 내세워 실용적 가치를 부각했습니다.'
  },
  {
    slideNumber: 5,
    originalRole: 'cta' as SlideType,
    suggestedRole: 'cta' as SlideType,
    badgeText: 'ACTION',
    headline: '이번 달 월급날,\n10분 만에 4개 통장 시스템을 완성하세요',
    body: '내용이 유익하셨다면 [저장]하고 월급날 바로 실천하세요! 함께 자산을 불려갈 동료에게 [공유]해보세요.',
    highlightWords: ['월급날', '4개 통장 시스템', '저장', '공유'],
    changeReason: '구체적인 행동 시점(\'월급날 10분\')을 제시하고, 원본의 [저장], [공유] 행동 유도를 명확하게 정리했습니다.'
  }
];

export const StoryDirectorModal: React.FC<StoryDirectorModalProps> = ({
  isOpen,
  onClose,
  slides = []
}) => {
  const [isSummaryExpanded, setIsSummaryExpanded] = useState<boolean>(true);

  // Dynamic analysis mock mapped 1:1 to current slides
  const analysis: StoryDirectorAnalysis = React.useMemo(() => {
    const totalCount = slides.length;
    const suggestions = slides.map((origSlide, idx) => {
      const baseMock = BASE_MOCK_SUGGESTIONS[idx % BASE_MOCK_SUGGESTIONS.length];
      return {
        id: origSlide.id,
        slideNumber: origSlide.slideNumber || (idx + 1),
        originalRole: origSlide.slideType || baseMock.originalRole,
        suggestedRole: baseMock.suggestedRole,
        badgeText: baseMock.badgeText,
        headline: baseMock.headline,
        body: baseMock.body,
        highlightWords: baseMock.highlightWords,
        changeReason: baseMock.changeReason
      };
    });

    return {
      overallSummary: `총 ${totalCount}장의 슬라이드를 분석했습니다. [도입 ➔ 문제 제기 ➔ 핵심 솔루션 ➔ 실천 TIP ➔ 전환 CTA]의 유기적인 내러티브로 재구성하여 독자 이탈을 방지하고 전환율을 극대화했습니다.`,
      duplicateIssues: [
        '슬라이드 간 기계적 설명 반복을 제거하고 각 장별 고유한 가치(Why ➔ What ➔ How ➔ Action)를 부여했습니다.'
      ],
      flowIssues: [
        '단계 간 인과관계(선저축의 필요성 ➔ 통장 자동화 ➔ 비상금 분리)를 명확히 연결했습니다.'
      ],
      ctaIssue: '마지막 장에서 원본의 [저장], [공유] 행동 목적을 자연스럽게 유도하도록 개선했습니다.',
      storyStrategy: '1초 후킹(Cover) ➔ 독자 공감(Problem) ➔ 핵심 솔루션(Body) ➔ 실천 팁(Tip) ➔ 즉시 행동(CTA)',
      suggestions
    };
  }, [slides]);

  const [selectedSlideIds, setSelectedSlideIds] = useState<string[]>(() =>
    analysis.suggestions.map((s) => s.id)
  );

  // Sync selectedSlideIds when analysis suggestions change
  React.useEffect(() => {
    setSelectedSlideIds(analysis.suggestions.map((s) => s.id));
  }, [analysis]);

  if (!isOpen) return null;

  const totalSlides = analysis.suggestions.length;

  const toggleSelectSlide = (id: string) => {
    setSelectedSlideIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedSlideIds.length === totalSlides) {
      setSelectedSlideIds([]);
    } else {
      setSelectedSlideIds(analysis.suggestions.map((s) => s.id));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-indigo-950/40 overflow-hidden text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================================================================= */}
        {/* 1. Modal Header */}
        {/* ================================================================= */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-purple-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  전체 스토리 다듬기
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300">
                  Story Director v1
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                전체 슬라이드의 중복과 흐름을 분석하고 개선안을 비교합니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-all"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================================================================= */}
        {/* 2. Scrollable Body Content */}
        {/* ================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
          
          {/* A. Diagnosis Summary Box */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl overflow-hidden transition-all">
            <button
              onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
              className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between bg-slate-900/60 hover:bg-slate-900/90 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                <span className="text-xs sm:text-sm font-bold text-slate-200">
                  스토리 진단 및 개선 전략 요약
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{isSummaryExpanded ? '접기' : '자세히 보기'}</span>
                {isSummaryExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {isSummaryExpanded && (
              <div className="p-4 sm:p-5 space-y-4 border-t border-slate-800/80 text-xs">
                {/* Overall summary */}
                <div className="p-3.5 bg-indigo-950/30 border border-indigo-500/20 rounded-xl text-indigo-200 leading-relaxed">
                  <span className="font-bold text-indigo-300 block mb-1">💡 종합 진단</span>
                  {analysis.overallSummary}
                </div>

                {/* Strategy & Issues Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
                    <span className="font-bold text-amber-400 flex items-center gap-1.5 mb-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> 적용 스토리 전략
                    </span>
                    <p className="text-slate-300 leading-relaxed">{analysis.storyStrategy}</p>
                  </div>

                  <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
                    <span className="font-bold text-pink-400 flex items-center gap-1.5 mb-1.5">
                      <TrendingUp className="w-3.5 h-3.5" /> CTA 전환 진단
                    </span>
                    <p className="text-slate-300 leading-relaxed">{analysis.ctaIssue}</p>
                  </div>

                  <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
                    <span className="font-bold text-rose-400 flex items-center gap-1.5 mb-1.5">
                      <Repeat className="w-3.5 h-3.5" /> 중복 문제 진단
                    </span>
                    <ul className="space-y-1 text-slate-300 list-disc list-inside">
                      {analysis.duplicateIssues.map((issue, idx) => (
                        <li key={idx} className="leading-relaxed">{issue}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
                    <span className="font-bold text-sky-400 flex items-center gap-1.5 mb-1.5">
                      <Layers className="w-3.5 h-3.5" /> 흐름/이탈 지점 진단
                    </span>
                    <ul className="space-y-1 text-slate-300 list-disc list-inside">
                      {analysis.flowIssues.map((issue, idx) => (
                        <li key={idx} className="leading-relaxed">{issue}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* B. Slide Comparison List Header */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-200">
                슬라이드별 1:1 비교 ({analysis.suggestions.length}장)
              </h3>
              <span className="text-[11px] text-slate-500">
                (디자인, 이미지, 색상은 그대로 보존됩니다)
              </span>
            </div>

            <button
              onClick={toggleSelectAll}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-800 transition-all"
            >
              {selectedSlideIds.length === totalSlides ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5" /> 전체 선택 해제
                </>
              ) : (
                <>
                  <SquareIcon className="w-3.5 h-3.5" /> 전체 선택
                </>
              )}
            </button>
          </div>

          {/* C. Slide Cards Comparison Grid */}
          <div className="space-y-4">
            {analysis.suggestions.map((suggestion, idx) => {
              // 1. Strict matching: ONLY find slide with exact matching ID (NO index fallback)
              const originalSlide = slides.find((s) => s.id === suggestion.id);
              const hasOriginal = Boolean(originalSlide);
              
              const origRoleKey = (originalSlide?.slideType || 'body') as string;
              const origRole = hasOriginal ? (ROLE_BADGES[origRoleKey] || ROLE_BADGES.body) : null;
              const origBadge = originalSlide?.badgeText || '없음';
              const origHeadline = originalSlide?.headline || '원본 슬라이드 정보를 찾을 수 없습니다.';
              const origBody = originalSlide?.body || '원본 슬라이드 본문 정보를 찾을 수 없습니다.';
              const origHighlightWords = originalSlide?.highlightWords || [];

              const suggRoleKey = (suggestion.suggestedRole || 'body') as string;
              const suggRole = ROLE_BADGES[suggRoleKey] || ROLE_BADGES.body;
              const isSelected = selectedSlideIds.includes(suggestion.id);

              return (
                <div
                  key={suggestion.id}
                  className={`bg-slate-950/80 border rounded-xl overflow-hidden transition-all shadow-sm ${
                    !hasOriginal
                      ? 'border-rose-900/40 bg-rose-950/10'
                      : isSelected
                      ? 'border-indigo-500/40 ring-1 ring-indigo-500/20'
                      : 'border-slate-800'
                  }`}
                >
                  {/* Card Header Bar */}
                  <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-3">
                      <button
                        disabled={!hasOriginal}
                        onClick={() => hasOriginal && toggleSelectSlide(suggestion.id)}
                        className={`transition-colors ${
                          !hasOriginal
                            ? 'text-slate-600 cursor-not-allowed'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title={!hasOriginal ? '원본 슬라이드가 없어 선택할 수 없습니다' : isSelected ? '선택 해제' : '선택'}
                      >
                        {isSelected && hasOriginal ? (
                          <CheckSquare className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <SquareIcon className="w-4 h-4" />
                        )}
                      </button>

                      <span className="font-extrabold text-slate-100 bg-slate-800 px-2.5 py-0.5 rounded-md text-[11px]">
                        슬라이드 #{suggestion.slideNumber || idx + 1}
                      </span>

                      {/* Role Transition */}
                      <div className="flex items-center gap-1.5 text-[11px] font-bold">
                        {origRole ? (
                          <span className={`px-2 py-0.5 rounded border ${origRole.bg} ${origRole.text} ${origRole.border}`}>
                            {origRole.label.split(' ')[0]}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded border bg-slate-800 text-slate-500 border-slate-700">
                            미지정
                          </span>
                        )}
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                        <span className={`px-2 py-0.5 rounded border ${suggRole.bg} ${suggRole.text} ${suggRole.border}`}>
                          {suggRole.label}
                        </span>
                      </div>
                    </div>

                    {/* Badge Transition */}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                      <span>뱃지:</span>
                      <span className="text-slate-300 font-semibold">[{origBadge}]</span>
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                      <span className="text-amber-300 font-bold">[{suggestion.badgeText}]</span>
                    </div>
                  </div>

                  {/* Before / After Comparison Body */}
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Left: Before (Actual Original Slide Data) */}
                    <div className={`p-3.5 border rounded-xl space-y-2 ${
                      hasOriginal ? 'bg-slate-900/40 border-slate-800/60' : 'bg-rose-950/20 border-rose-800/40 text-rose-300'
                    }`}>
                      <div className="text-[11px] font-bold flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${hasOriginal ? 'bg-slate-500' : 'bg-rose-500'}`} />
                          <span className={hasOriginal ? 'text-slate-400' : 'text-rose-400 font-bold'}>
                            {hasOriginal ? '기존 원본 (Before)' : '⚠️ 원본 데이터 없음'}
                          </span>
                        </div>
                        {origRole && (
                          <span className="text-[10px] text-slate-500 px-1.5 py-0.5 bg-slate-800/60 rounded">
                            {origRole.label.split(' ')[0]}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">헤드라인</span>
                        <p className={`font-bold leading-snug whitespace-pre-line ${hasOriginal ? 'text-slate-300' : 'text-rose-300 italic'}`}>
                          {origHeadline}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">본문</span>
                        <p className={`leading-relaxed whitespace-pre-line ${hasOriginal ? 'text-slate-400' : 'text-rose-300/80 italic'}`}>
                          {origBody}
                        </p>
                      </div>
                      {origHighlightWords.length > 0 && (
                        <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-slate-500">기존 강조:</span>
                          {origHighlightWords.map((word, wIdx) => (
                            <span
                              key={wIdx}
                              className="px-1.5 py-0.5 bg-slate-800 text-slate-400 text-[10px] rounded"
                            >
                              #{word}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right: After (Suggestion Data) */}
                    <div className="p-3.5 bg-indigo-950/20 border border-indigo-500/30 rounded-xl space-y-2 relative">
                      <div className="text-[11px] font-bold text-indigo-300 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                          <span>개선 제안 (After)</span>
                        </div>
                        <span className="text-[10px] text-indigo-300 px-1.5 py-0.5 bg-indigo-500/20 rounded border border-indigo-500/30 font-bold">
                          {suggRole.label.split(' ')[0]}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-indigo-400/80 block mb-0.5">개선된 헤드라인</span>
                        <p className="font-bold text-white leading-snug whitespace-pre-line">
                          {suggestion.headline}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-indigo-400/80 block mb-0.5">개선된 본문</span>
                        <p className="text-slate-200 leading-relaxed whitespace-pre-line">
                          {suggestion.body}
                        </p>
                      </div>

                      {/* Highlight Words */}
                      {suggestion.highlightWords && suggestion.highlightWords.length > 0 && (
                        <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-slate-400">제안 강조:</span>
                          {suggestion.highlightWords.map((word, wIdx) => (
                            <span
                              key={wIdx}
                              className="px-1.5 py-0.5 bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-bold rounded"
                            >
                              #{word}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Change Reason Note */}
                  <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-300">수정 이유:</strong> {suggestion.changeReason}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* ================================================================= */}
        {/* 3. Modal Footer Actions */}
        {/* ================================================================= */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between flex-wrap gap-3 flex-shrink-0">
          <div className="text-xs text-slate-400">
            총 <strong className="text-white">{totalSlides}장</strong> 중{' '}
            <strong className="text-indigo-300">{selectedSlideIds.length}장</strong> 선택됨
            <span className="text-slate-500 ml-2">(현재 UI 골격 단계로 실제 적용은 비활성화 상태입니다)</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition-all"
            >
              취소
            </button>

            {/* Apply Selected (Disabled Skeleton) */}
            <button
              disabled
              className="px-4 py-2 bg-slate-800 text-slate-500 font-bold text-xs rounded-xl border border-slate-700/50 cursor-not-allowed opacity-60 flex items-center gap-1.5"
              title="다음 단계에서 실제 적용 로직이 연동됩니다."
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>선택 적용 ({selectedSlideIds.length})</span>
            </button>

            {/* Apply All (Disabled Skeleton) */}
            <button
              disabled
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-indigo-600 text-white/60 font-bold text-xs rounded-xl shadow-md cursor-not-allowed opacity-60 flex items-center gap-1.5"
              title="다음 단계에서 실제 적용 로직이 연동됩니다."
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>전체 적용</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
