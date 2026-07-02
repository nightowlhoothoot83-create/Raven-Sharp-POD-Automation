import React from "react";

/**
 * Raven Sharp logo — uses the raven mark (bird graphic) alongside the wordmark text.
 * The source image already contains the brand art; we add wordmark text beside small sizes
 * and show the full stacked logo at large sizes.
 */
export const Logo = ({ size = "md", variant = "horizontal", className = "" }) => {
  // full = stacked logo with tagline, horizontal = mark + wordmark side-by-side
  if (variant === "full") {
    const h = size === "lg" ? "h-28 sm:h-36" : size === "sm" ? "h-14" : "h-20";
    return (
      <div className={`flex items-center ${className}`} data-testid="rs-logo">
        <img src="/logos/raven-sharp-v2.png" alt="Raven Sharp" className={`${h} w-auto object-contain`} draggable="false" />
      </div>
    );
  }
  const h = size === "lg" ? "h-12" : size === "sm" ? "h-7" : "h-9";
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-lg";
  return (
    <div className={`flex items-center gap-2.5 ${className}`} data-testid="rs-logo">
      <img src="/logos/raven-sharp-mark-v2.png" alt="Raven Sharp" className={`${h} w-auto object-contain`} draggable="false" />
      <span className={`font-display font-black tracking-tight ${text} leading-none`}>
        RAVEN<span className="text-[var(--raven-glow)]">SHARP</span>
      </span>
    </div>
  );
};

/**
 * Ascension Digital footer mark — logo + "Part of the Ascension Digital Group".
 */
export const AscensionMark = ({ className = "" }) => (
  <div className={`flex items-center gap-3 ${className}`} data-testid="ascension-mark">
    <img src="/logos/ascension-digital-v2.png" alt="Ascension Digital" className="h-9 w-auto object-contain" draggable="false" />
    <div className="leading-tight border-l border-[var(--border)] pl-3">
      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--subtle)]">Part of the</div>
      <div className="text-xs font-mono uppercase tracking-[0.15em] text-[var(--gold)]">Ascension Digital Group</div>
    </div>
  </div>
);

export default Logo;
