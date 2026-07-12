import React, { useState } from "react";
import { X, HelpCircle } from "lucide-react";

const STORAGE_KEY = "ravensharp_pod_guide_dismissed";

/**
 * Closeable step-by-step "how this works" guide.
 * Dismissal is remembered in localStorage so it doesn't reappear every visit.
 * A small "?" button stays available to reopen it at any time.
 */
export default function HowToGuide() {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
  });

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
  };

  const reopen = () => {
    setDismissed(false);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  if (dismissed) {
    return (
      <button onClick={reopen}
        className="mb-6 flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--raven-glow)] transition-colors">
        <HelpCircle className="w-3.5 h-3.5" /> How does this work?
      </button>
    );
  }

  const steps = [
    { n: 1, title: "Choose a platform", body: "Pick which print-on-demand platform you're pushing this run to (Printify, Gelato, Etsy, etc.)." },
    { n: 2, title: "Upload your artwork", body: "Upload the source image(s) you want turned into product listings." },
    { n: 3, title: "Set your run settings", body: "Choose how many images, product types and any AI generation options for this run." },
    { n: 4, title: "Run & review", body: "The pipeline processes each image, then hands you a review queue — check the results before anything gets pushed live." },
    { n: 5, title: "Push or export", body: "Approve and push straight to your chosen platform, or export as a CSV/download if you'd rather list manually." },
  ];

  return (
    <div className="mb-8 rounded-2xl border border-[var(--raven)]/25 bg-[var(--raven)]/[0.06] p-5 relative">
      <button onClick={dismiss} aria-label="Close guide"
        className="absolute top-4 right-4 text-[var(--muted)] hover:text-white transition-colors">
        <X className="w-4 h-4" />
      </button>
      <h2 className="text-sm font-semibold mb-4 pr-8">How the pipeline works</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map(s => (
          <div key={s.n} className="flex gap-2.5">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--raven)]/25 border border-[var(--raven)]/40 flex items-center justify-center text-xs font-bold text-[var(--raven-glow)]">
              {s.n}
            </div>
            <div>
              <div className="text-xs font-semibold mb-0.5">{s.title}</div>
              <div className="text-xs text-[var(--muted)] leading-snug">{s.body}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
