import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || 'An unexpected application error occurred.',
    };
  }

  componentDidCatch(error: Error) {
    console.error('ZAD Foods ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      let displayMsg = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message) as { error?: string; path?: string; operationType?: string };
        if (parsed.error) {
          displayMsg = `Database ${parsed.operationType || 'operation'} failed on "${parsed.path || 'collection'}": ${parsed.error}`;
        }
      } catch {
        // plain string error
      }

      return (
        <div className="min-h-screen bg-[#F7FAF5] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-[#DCE6DC] rounded-xl p-8 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-[#17251B] mb-2">Something went wrong</h1>
            <p className="text-sm text-[#4E6153] mb-6 break-words">{displayMsg}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#006B35] text-white text-sm font-medium hover:bg-[#168B35] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
