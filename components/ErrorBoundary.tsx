"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * PayoutDelta — Phase S1 institutional React fault guard.
 *
 * An enterprise-grade error boundary that converts a thrown render crash into
 * a calm, on-theme obsidian fallback instead of an unhandled React white-out.
 * Because the app is a fully static export, an uncaught exception below this
 * boundary would otherwise tear down the entire route's interactivity; the
 * boundary confines the blast radius to one module and offers a one-click
 * "Reset Module to Defaults" that re-mounts the affected subtree.
 *
 * Zero external packages — native React class-based boundary only
 * (`getDerivedStateFromError` + `componentDidCatch`).
 */

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Overrides the headline when a containing route names its module. */
  fallbackTitle?: string;
  /** Called when the user resets the errored module. */
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Institutional fault-guard fallback, rendered on the obsidian surface
 * (`bg-slate-900/90` card, red-500 fault accent, tabular type). Mirrors the
 * app's `#0B0F19` canvas and slate-900 card tokens exactly.
 */
function FallbackCard({
  title,
  onReset,
}: {
  title: string;
  onReset: () => void;
}) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="mx-auto my-8 max-w-lg rounded-2xl border border-red-500/30 bg-slate-900/90 p-6 text-center"
    >
      <span className="inline-block rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-400">
        Component Fault Guard
      </span>
      <h2 className="mt-3 text-lg font-bold tracking-tight text-white">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-white/60">
        An unexpected parameter prevented this module from computing. No user
        data was lost.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-4 rounded-xl bg-emerald-400 px-4 py-2 text-xs font-bold text-slate-950 transition-all hover:bg-emerald-300"
      >
        ↻ Reset Module to Defaults
      </button>
    </div>
  );
}

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Fault is contained to the wrapped subtree — record it locally only.
    console.error("[PayoutDelta fault guard]", error, errorInfo.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <FallbackCard
          title={this.props.fallbackTitle ?? "Calculation Engine Interrupted"}
          onReset={this.handleReset}
        />
      );
    }
    return this.props.children;
  }
}