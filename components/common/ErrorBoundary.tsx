"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  private handleReset = () => {
    // Reset state & clear hash
    window.location.hash = "";
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleCopyDiagnostic = () => {
    const bundle = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      error: this.state.error?.toString(),
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
    };
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(bundle, null, 2))
        .then(() => alert("Diagnostic bundle copied to clipboard."))
        .catch(() => alert("Failed to copy diagnostic bundle."));
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full max-w-3xl mx-auto flex flex-col gap-6 font-sans mb-16 mt-8">
          <section className="bg-zinc-900/80 rounded-xl border border-rose-500/50 p-6 md:p-8 shadow-2xl relative overflow-hidden backdrop-blur-sm">
            <div className="flex items-center gap-3 text-rose-400 mb-4 pb-4 border-b border-rose-500/20">
              <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h2 className="text-lg font-bold">Calculation Node Fault</h2>
            </div>
            
            <p className="text-zinc-300 text-sm mb-6 leading-relaxed">
              Corridor parameters exceeded statutory limits or failed currency matrix resolution.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button 
                onClick={this.handleReset}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm font-medium transition-colors border border-zinc-700 shadow-sm"
              >
                Reset State & Clear Hash
              </button>
              
              <button 
                onClick={this.handleCopyDiagnostic}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-sm font-medium transition-colors border border-rose-500/20 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Diagnostic Bundle
              </button>
            </div>
          </section>
        </div>
      );
    }

    return this.props.children;
  }
}
