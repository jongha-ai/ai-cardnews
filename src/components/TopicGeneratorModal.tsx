import React, { useState } from 'react';
import { GenerateCardNewsRequest, AspectRatio, CardThemeId } from '../types';
import { CARD_THEMES } from '../data/themes';
import { TOPIC_PRESETS, TopicPreset } from '../data/samplePresets';
import { 
  Sparkles, 
  Layers, 
  LayoutTemplate, 
  Palette, 
  Target, 
  MessageSquare, 
  X, 
  SlidersHorizontal,
  Bot,
  Coins,
  TrendingUp,
  Coffee,
  Home,
  HelpCircle,
  Check
} from 'lucide-react';

interface TopicGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (request: GenerateCardNewsRequest) => Promise<void>;
  isGenerating: boolean;
}

export const TopicGeneratorModal: React.FC<TopicGeneratorModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
  isGenerating,
}) => {
  const [topic, setTopic] = useState('');
  const [purpose, setPurpose] = useState('정보 전달 및 트렌드 요약');
  const [targetAudience, setTargetAudience] = useState('2030 직장인 및 대중');
  const [tone, setTone] = useState('신뢰감 있고 명쾌한 어조');
  const [slideCount, setSlideCount] = useState<number>(5);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [themeId, setThemeId] = useState<CardThemeId>('dark_tech');
  const [customNotes, setCustomNotes] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: TopicPreset) => {
    setTopic(preset.topic);
    setPurpose(preset.purpose);
    setTargetAudience(preset.targetAudience);
    setTone(preset.tone);
    setThemeId(preset.themeId as CardThemeId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    onGenerate({
      topic,
      purpose,
      targetAudience,
      tone,
      slideCount,
      aspectRatio,
      themeId,
      customNotes,
    });
  };

  const getPresetIcon = (iconName: string) => {
    switch (iconName) {
      case 'Bot': return <Bot className="w-4 h-4 text-indigo-400" />;
      case 'Coins': return <Coins className="w-4 h-4 text-amber-400" />;
      case 'TrendingUp': return <TrendingUp className="w-4 h-4 text-rose-400" />;
      case 'Coffee': return <Coffee className="w-4 h-4 text-orange-400" />;
      case 'Home': return <Home className="w-4 h-4 text-emerald-400" />;
      default: return <Sparkles className="w-4 h-4 text-sky-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-700/80 flex items-center justify-center shadow-lg text-white p-1">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span>AIWORKS 카드뉴스 생성하기</span>
              </h2>
              <p className="text-xs text-slate-400">
                주제만 입력하면 헤드라인, 본문, 이미지 프롬프트까지 원스톱 완성
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
          {/* Quick Preset Topics */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              추천 주제 템플릿 (클릭 시 자동 입력)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TOPIC_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="p-3 text-left rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/50 transition-all flex items-start gap-2.5 group"
                >
                  <div className="mt-0.5 p-1.5 rounded-lg bg-slate-800 group-hover:bg-slate-700 transition-colors">
                    {getPresetIcon(preset.icon)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 transition-colors truncate">
                      {preset.title}
                    </div>
                    <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                      {preset.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Topic Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-indigo-400" />
                카드뉴스 주제 / 기사 원문 / 기획 키워드 <span className="text-rose-400">*</span>
              </span>
              <span className="text-[11px] text-slate-400">자유롭게 입력해주세요</span>
            </label>
            <textarea
              required
              rows={3}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="예: 2026 자율형 AI 에이전트의 업무 혁신과 실무 활용 팁"
              className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 leading-relaxed transition-all"
            />
          </div>

          {/* Core Configuration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Slide Count */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                슬라이드 장수
              </label>
              <div className="flex bg-slate-950/70 p-1 rounded-xl border border-slate-800">
                {[3, 4, 5, 6, 7].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setSlideCount(num)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      slideCount === num
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {num}장
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <LayoutTemplate className="w-3.5 h-3.5 text-indigo-400" />
                카드 규격 비율
              </label>
              <div className="flex bg-slate-950/70 p-1 rounded-xl border border-slate-800">
                {[
                  { ratio: '1:1', label: '1:1 (정사각형)' },
                  { ratio: '4:5', label: '4:5 (인스타 피드)' },
                  { ratio: '9:16', label: '9:16 (스토리/쇼츠)' },
                ].map((item) => (
                  <button
                    key={item.ratio}
                    type="button"
                    onClick={() => setAspectRatio(item.ratio as AspectRatio)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      aspectRatio === item.ratio
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {item.ratio}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Theme Palette Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-indigo-400" />
              디자인 테마 스타일
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.values(CARD_THEMES).map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setThemeId(theme.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between h-20 relative overflow-hidden ${
                    themeId === theme.id
                      ? 'border-indigo-500 ring-2 ring-indigo-500/50 bg-slate-800'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between z-10">
                    <span className="text-xs font-bold text-slate-200 truncate">
                      {theme.nameEn}
                    </span>
                    {themeId === theme.id && (
                      <Check className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                  </div>
                  {/* Visual Color Preview Dots */}
                  <div className="flex items-center gap-1.5 z-10">
                    <span
                      className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                      style={{ backgroundColor: theme.cardBg }}
                    />
                    <span
                      className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                      style={{ backgroundColor: theme.accent }}
                    />
                    <span
                      className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                      style={{ backgroundColor: theme.badgeBg }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Accordion Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {showAdvanced ? '세부 설정 접기' : '타겟 독자 / 어조 / 세부 메모 설정하기'}
            </button>
          </div>

          {/* Advanced Inputs */}
          {showAdvanced && (
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    타겟 독자 (Audience)
                  </label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    placeholder="예: 2030 직장인, 대학생, 마케터"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    톤앤매너 (Tone)
                  </label>
                  <input
                    type="text"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    placeholder="예: 신뢰감 있고 명쾌한 어조"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  추가 참고사항 / 원본 글 발췌
                </label>
                <textarea
                  rows={2}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  placeholder="반드시 포함해야 할 통계 수치나 세부 브랜드명이 있다면 입력해주세요."
                />
              </div>
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isGenerating || !topic.trim()}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white font-bold text-sm sm:text-base shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2.5 transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-5 h-5" />
              {isGenerating ? 'AI가 카드뉴스를 기획 및 생성하고 있습니다...' : 'AI 카드뉴스 완성하기 (헤드라인+본문+이미지프롬프트)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
