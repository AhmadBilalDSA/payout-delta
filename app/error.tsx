"use client";

/**
 * Client error boundary. Next 16.3 passes `{ error, retry }`; `retry`
 * re-renders the failed subtree without a full page reload. For a fully
 * static export errors are rare (fetch-free), but the boundary keeps the SPA
 * from blanking if a vendor script misbehaves.
 */
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-wider text-red-700">
        Something went wrong
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
        The auditor hit an unexpected snag
      </h1>
      <p className="mt-4 text-slate-600">
        Try reloading the page. If the problem persists, a cached build may be
        out of date — hard-refresh or contact us.
      </p>
      {process.env.NODE_ENV === "development" && error?.message ? (
        <p className="mt-4 rounded-lg bg-red-50 p-3 font-mono text-xs text-red-800">
          {error.message}
        </p>
      ) : null}
      <button
        type="button"
        onClick={retry}
        className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-2.5 font-semibold text-white transition-colors hover:bg-emerald-700"
      >
        Try again
      </button>
    </div>
  );
}