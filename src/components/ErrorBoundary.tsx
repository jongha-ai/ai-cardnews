import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  handleReset() {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-6 bg-slate-900/90 border border-slate-800 rounded-2xl text-center shadow-xl space-y-4 max-w-md mx-auto my-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-slate-100">
              {this.props.fallbackTitle || '슬라이드 렌더링 일시적 오류'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              이미지 데이터 처리 중 일시적인 오류가 발생했으나 안전하게 보호되었습니다. 아래 버튼을 눌러 화면을 복원할 수 있습니다.
            </p>
            {this.state.error && (
              <div className="text-[10px] text-rose-300 font-mono bg-rose-950/40 p-2 rounded border border-rose-900/50 max-h-20 overflow-y-auto text-left">
                {this.state.error.message}
              </div>
            )}
          </div>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            화면 복구하기
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
