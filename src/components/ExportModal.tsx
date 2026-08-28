import React, { useState } from 'react';
import { CardNewsProject, CardTheme } from '../types';
import { toPng } from 'html-to-image';
import confetti from 'canvas-confetti';
import { buildInstagramHighConvertingCaption } from '../utils/captionGenerator';
import { 
  Download, 
  Copy, 
  Check, 
  X, 
  FileText, 
  Sparkles, 
  Share2, 
  Image as ImageIcon,
  Layers,
  AlertCircle
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: CardNewsProject;
  theme: CardTheme;
  activeSlideIndex: number;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
  theme,
  activeSlideIndex,
}) => {
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedPrompts, setCopiedPrompts] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [exportProgress, setExportProgress] = useState<string>('');

  if (!isOpen) return null;

  // Generate Instagram / SNS High-Conversion Caption Text (4-stage structure)
  const fullCaptionText = buildInstagramHighConvertingCaption(project);

  // Generate clean Korean prompt list optimized for ChatGPT / Gemini
  const fullPromptsText = `[카드뉴스 AI 이미지 생성 프롬프트 (ChatGPT / 제미나이 최적화)]

${project.slides
  .map(
    (s, i) => `■ 슬라이드 ${i + 1} (${s.badgeText || (i === 0 ? '표지' : `POINT 0${i}`)})
${s.imagePrompt || `${s.headline.replace(/\n/g, ' ')}을 시각화한 고화질 실사 사진, 한국인 인물과 자연스러운 국내 공간 연출, ${project.aspectRatio || '1:1'} 비율`}`
  )
  .join('\n\n')}`;

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(fullCaptionText);
    setCopiedCaption(true);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    setTimeout(() => setCopiedCaption(false), 2500);
  };

  const handleCopyPrompts = () => {
    navigator.clipboard.writeText(fullPromptsText);
    setCopiedPrompts(true);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    setTimeout(() => setCopiedPrompts(false), 2500);
  };

  // Download Current Slide as PNG
  const handleDownloadSingle = async (slideNumber: number) => {
    try {
      setIsExportingPng(true);
      // Wait for all web fonts to load completely before capturing canvas
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      const element = document.getElementById(`card-canvas-${slideNumber}`);
      if (!element) throw new Error('슬라이드 캔버스 요소를 찾을 수 없습니다.');

      const dataUrl = await toPng(element, { 
        quality: 0.98, 
        pixelRatio: 2,
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.download = `${project.title.slice(0, 15).replace(/\s+/g, '_')}_slide_${slideNumber}.png`;
      link.href = dataUrl;
      link.click();
      confetti({ particleCount: 40, spread: 50 });
    } catch (err: any) {
      console.error('PNG Export error:', err);
      alert('PNG 저장 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setIsExportingPng(false);
    }
  };

  // Download All Slides as ZIP/Multiple PNGs
  const handleDownloadAll = async () => {
    try {
      setIsExportingPng(true);
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      for (let i = 0; i < project.slides.length; i++) {
        const slide = project.slides[i];
        setExportProgress(`슬라이드 ${i + 1} / ${project.slides.length} 이미지 렌더링 중...`);
        const element = document.getElementById(`card-canvas-${slide.slideNumber}`);
        if (element) {
          const dataUrl = await toPng(element, { 
            quality: 0.98, 
            pixelRatio: 2,
            cacheBust: true,
          });
          const link = document.createElement('a');
          link.download = `${project.title.slice(0, 12).replace(/\s+/g, '_')}_${i + 1}.png`;
          link.href = dataUrl;
          link.click();
          // Small delay between downloads
          await new Promise((r) => setTimeout(r, 400));
        }
      }
      confetti({ particleCount: 80, spread: 80 });
    } catch (err: any) {
      console.error('All PNG Export error:', err);
      alert('전체 다운로드 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setIsExportingPng(false);
      setExportProgress('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                카드뉴스 내보내기 & 공유
              </h2>
              <p className="text-xs text-slate-400">
                고해상도 이미지 다운로드 및 SNS 게시용 텍스트·프롬프트 복사
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
          {/* Section 1: Image Export */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-emerald-400" />
              고화질 PNG 이미지 저장
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Single Slide Download */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-3">
                <div>
                  <div className="text-xs font-bold text-slate-200">
                    현재 슬라이드 ({activeSlideIndex + 1}장) 저장
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    현재 화면에 보고 있는 카드를 즉시 PNG로 다운로드합니다.
                  </div>
                </div>
                <button
                  disabled={isExportingPng}
                  onClick={() => handleDownloadSingle(project.slides[activeSlideIndex]?.slideNumber || 1)}
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs rounded-lg border border-slate-700 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  슬라이드 {activeSlideIndex + 1} PNG 다운로드
                </button>
              </div>

              {/* All Slides Download */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-3">
                <div>
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <span>전체 카드뉴스 ({project.slides.length}장) 일괄 다운로드</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-semibold">
                      추천
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    모든 슬라이드를 순서대로 고해상도 PNG 파일로 저장합니다.
                  </div>
                </div>
                <button
                  disabled={isExportingPng}
                  onClick={handleDownloadAll}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isExportingPng ? (exportProgress || '저장 중...') : `전체 ${project.slides.length}장 일괄 저장`}
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: SNS Caption Text Copy */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                인스타그램 / SNS 본문 캡션 복사
              </h3>
              <button
                onClick={handleCopyCaption}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow transition-all"
              >
                {copiedCaption ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>본문 복사 완료!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>전체 캡션 복사</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative rounded-xl bg-slate-950/90 border border-slate-800 p-3.5">
              <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap max-h-44 overflow-y-auto leading-relaxed custom-scrollbar">
                {fullCaptionText}
              </pre>
            </div>
          </div>

          {/* Section 3: ChatGPT / Gemini Korean Prompts Batch Copy */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                AI 이미지 생성용 프롬프트 (ChatGPT / 제미나이)
              </h3>
              <button
                onClick={handleCopyPrompts}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow transition-all"
              >
                {copiedPrompts ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>프롬프트 복사 완료!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>전체 AI 이미지 프롬프트 일괄 복사 (한국어)</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative rounded-xl bg-slate-950/90 border border-slate-800 p-3.5">
              <pre className="text-xs text-purple-200 font-mono whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed custom-scrollbar">
                {fullPromptsText}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
