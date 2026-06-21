import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ADGFooter from "../components/ADGFooter";
import {
  ArrowRight, Check, Zap, Upload, Sparkles, Globe,
  Eye, DownloadCloud, Wand2, Clock, Shield, Star
} from "lucide-react";

const FLOW_STEPS = [
  { icon: <Upload className="w-6 h-6" />,        num: "01", title: "Upload or Generate",  desc: "Drop a folder of your own artwork or schedule AI image generation with style profiles. Preloaded art runs automatically. Generated art stops for your approval first." },
  { icon: <Sparkles className="w-6 h-6" />,      num: "02", title: "Auto Optimise + Upscale", desc: "True AI upscaling via Real-ESRGAN — genuine pixel reconstruction, not just a resize. DPI injection, colour profile correction, format conversion. Print-ready before it hits any platform." },
  { icon: <Eye className="w-6 h-6" />,           num: "03", title: "AI Analysis",          desc: "Claude Vision reads your artwork and recommends the best product matches from 60 product types — filtered to exactly what your chosen platform supports." },
  { icon: <Globe className="w-6 h-6" />,         num: "04", title: "Select Platform",      desc: "Choose one platform per run — Gelato, Printify, Printful, Prodigi, Redbubble, TeePublic, Merch by Amazon and more. API push where available, formatted CSV where not." },
  { icon: <Zap className="w-6 h-6" />,           num: "05", title: "Review & Edit",        desc: "Every listing lands in your review queue before anything goes live. Edit product type, title, description, tags, price — or regenerate copy with one click. Approve individually or in bulk." },
  { icon: <DownloadCloud className="w-6 h-6" />, num: "06", title: "Push Live",            desc: "Approve and listings publish directly to connected platforms via API. CSV exports for marketplace platforms. You wake up to live products — nothing touched manually." },
];

const TIERS = [
  {
    id: "free",    name: "Free",    price: "0",   period: "",    featured: false,
    desc: "Try the pipeline. No card needed.",
    perks: ["3 pipeline runs total","1 image per run","5 AI gen credits","All platforms","Manual runs only","Individual review"],
    cta: "Start Free",
  },
  {
    id: "creator", name: "Creator", price: "39",  period: "/mo", featured: false,
    desc: "For artists just starting out.",
    perks: ["20 pipeline runs/mo","10 images per run","30 AI gen credits/mo","Schedule image generation","3 style profiles","Inline listing editing"],
    cta: "Go Creator",
  },
  {
    id: "growth",  name: "Growth",  price: "69",  period: "/mo", featured: false,
    desc: "For serious sellers scaling up.",
    perks: ["35 pipeline runs/mo","15 images per run","60 AI gen credits/mo","Schedule image generation","5 style profiles","Inline listing editing"],
    cta: "Go Growth",
  },
  {
    id: "pro",     name: "Pro",     price: "119", period: "/mo", featured: true,
    desc: "Full automation. Wake up to listings.",
    perks: ["50 pipeline runs/mo","25 images per run","100 AI gen credits/mo","Full pipeline scheduling","Bulk approve listings","10 style profiles","Priority processing"],
    cta: "Go Pro",
  },
  {
    id: "agency",  name: "Agency",  price: "189", period: "/mo", featured: false,
    desc: "Multiple brands. Unlimited scale.",
    perks: ["80 pipeline runs/mo","40 images per run","250 AI gen credits/mo","Unlimited scheduling","5 brand workspaces","Unlimited style profiles","Priority support"],
    cta: "Go Agency",
  },
];

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="relative overflow-x-hidden">

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-20 pb-24">
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-[var(--raven)]/10 rounded-full blur-[140px]" />
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-blue-600/6 rounded-full blur-[100px]" />
          <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-[var(--gold)]/5 rounded-full blur-[100px]" />
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `linear-gradient(90deg,rgba(124,92,191,.5) 1px,transparent 1px),linear-gradient(0deg,rgba(124,92,191,.5) 1px,transparent 1px)`,
            backgroundSize: "80px 80px"
          }} />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-8 fade-up">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-[var(--raven)]/20 blur-3xl scale-150" />
              <img src="/brands/ravenSharpLogo.png" alt="Raven Sharp"
                className="relative w-40 h-40 sm:w-56 sm:h-56 object-contain drop-shadow-[0_0_40px_rgba(124,92,191,0.5)]" />
            </div>
          </div>

          <div className="fade-up" style={{ animationDelay: "0.1s" }}>
            <span className="inline-block text-xs font-mono uppercase tracking-[0.3em] text-[var(--raven-glow)] border border-[var(--raven)]/40 bg-[var(--raven)]/10 px-4 py-1.5 rounded-full mb-6">
              ✦ World's First Fully Automated POD Pipeline
            </span>
            <h1 className="font-display text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] mb-6">
              One artwork.<br />
              <span className="bg-gradient-to-r from-[var(--raven-glow)] via-[var(--gold)] to-[var(--raven-glow)] bg-clip-text text-transparent"
                style={{ backgroundSize: "200%", animation: "shimmer 4s linear infinite" }}>
                Every platform.
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-[var(--muted)] max-w-2xl mx-auto mb-10 leading-relaxed">
              Upload artwork or schedule AI generation. Raven Sharp upscales, analyses,
              writes your listings, and pushes directly to Gelato, Printify, Redbubble,
              TeePublic and more — fully automated, start to finish.
            </p>
            <div className="flex flex-wrap gap-4 justify-center mb-10">
              {user ? (
                <button onClick={() => navigate("/dashboard")}
                  className="flex items-center gap-2 px-10 h-14 text-base font-semibold bg-[var(--raven)] hover:bg-[var(--raven-glow)] text-white rounded-xl transition-all glow-pulse">
                  Open Studio <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <>
                  <Link to="/register"
                    className="flex items-center gap-2 px-10 h-14 text-base font-semibold bg-[var(--raven)] hover:bg-[var(--raven-glow)] text-white rounded-xl transition-all glow-pulse">
                    Start Free <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link to="/pricing"
                    className="flex items-center gap-2 px-8 h-14 text-base border border-white/20 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all">
                    See Pricing
                  </Link>
                </>
              )}
            </div>
            {/* Platform badges */}
            <div className="flex flex-wrap gap-2 justify-center">
              {["Gelato API","Printify API","Printful API","Prodigi API","Etsy OAuth","Redbubble CSV","TeePublic CSV","Merch by Amazon CSV"].map(p => (
                <span key={p} className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded border border-white/10 bg-white/5 text-[var(--subtle)]">{p}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 6-STEP PIPELINE ───────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-[var(--gold)]">The Pipeline</span>
            <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tighter mt-2">Six steps. Zero manual work.</h2>
            <p className="text-[var(--muted)] mt-4 max-w-xl mx-auto">Drop a folder. Wake up to listings. That's it.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FLOW_STEPS.map((step, i) => (
              <div key={step.num}
                className="glass rounded-2xl p-7 relative overflow-hidden group hover:border-[var(--raven)]/40 transition-all duration-300"
                style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="absolute top-4 right-5 font-display text-6xl font-black text-white/4 leading-none select-none">{step.num}</div>
                <div className="w-12 h-12 rounded-xl bg-[var(--raven)]/20 border border-[var(--raven)]/30 flex items-center justify-center text-[var(--raven-glow)] mb-5 group-hover:bg-[var(--raven)]/30 transition-colors">
                  {step.icon}
                </div>
                <h3 className="font-display text-lg font-bold mb-2">{step.title}</h3>
                <p className="text-sm text-[var(--muted)] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ORIGIN STORY ──────────────────────────────────────────────────── */}
      <section className="relative py-0 overflow-hidden">
        <div className="relative w-full" style={{ minHeight: "550px" }}>
          <img src="/brands/ravenOwlHero.jpg" alt="The Raven and the Owl"
            className="w-full object-cover object-center"
            style={{ minHeight: "550px", maxHeight: "650px", display: "block" }} />
          <div className="absolute inset-0" style={{
            background: "linear-gradient(180deg,var(--bg) 0%,transparent 15%,transparent 60%,var(--bg) 100%)"
          }} />
          <div className="absolute inset-0" style={{
            background: "linear-gradient(90deg,var(--bg) 0%,transparent 25%,transparent 75%,var(--bg) 100%)"
          }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
            <span className="inline-block text-xs font-mono uppercase tracking-[0.3em] text-[var(--gold)] border border-[var(--gold)]/30 bg-black/50 backdrop-blur-sm px-4 py-1.5 rounded-full mb-5">
              ✦ The Origin
            </span>
            <h2 className="font-display text-4xl sm:text-6xl font-black tracking-tighter text-white drop-shadow-2xl mb-3">
              The Raven & The Owl
            </h2>
            <p className="text-base text-white/60 drop-shadow-lg">Where intelligence meets wisdom</p>
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
          <div className="glass rounded-2xl p-8 sm:p-12 border border-[var(--raven)]/20">
            <div className="flex justify-center gap-6 mb-8 text-4xl">
              <span>🦅</span><span className="text-[var(--raven-glow)]">✦</span><span>🦉</span>
            </div>
            <h3 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-6 bg-gradient-to-r from-[var(--raven-glow)] via-[var(--gold)] to-[var(--raven-glow)] bg-clip-text text-transparent">
              Born from accountability
            </h3>
            <div className="space-y-5 text-[var(--muted)] leading-relaxed text-left sm:text-center">
              <p>Raven Sharp was born from a moment of creative reckoning. Emma James — creator, photographer, and builder — was working with AI when she noticed something: left unchallenged, it would settle. It would produce <em>good enough</em>. And good enough wasn't good enough.</p>
              <p>She held it accountable. She watched it produce markedly better work. She named that dynamic — <strong className="text-[var(--text)]">the Raven and the Trickster</strong> — and it became the philosophy underpinning everything she builds.</p>
              <p>The <strong className="text-[var(--raven-glow)]">Raven</strong> is sharp, strategic, relentless in pursuit of precision. The <strong className="text-[var(--gold)]">Owl</strong> — Zyia — is wise, sovereign, keeper of creative vision. Together they represent what AI and human creativity become when neither settles.</p>
              <p className="text-[var(--text)] font-medium border-t border-white/10 pt-5 mt-5">Raven Sharp the tool is the expression of that philosophy — AI that doesn't just assist, but elevates. Automation that doesn't cut corners. A pipeline that respects the art it carries.</p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3 justify-center text-xs font-mono uppercase tracking-widest text-[var(--subtle)]">
              <span className="px-3 py-1 rounded border border-white/10 bg-white/5">Part of Ascension Digital Group</span>
              <span className="px-3 py-1 rounded border border-white/10 bg-white/5">Built by Emma James</span>
              <span className="px-3 py-1 rounded border border-white/10 bg-white/5">Queensland, Australia</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28" id="pricing">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-[var(--gold)]">Pricing</span>
            <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tighter mt-2">Priced for real ROI.</h2>
            <p className="text-[var(--muted)] mt-4 max-w-xl mx-auto">A VA doing this manually costs $600–1000/mo. Raven Sharp starts at $39.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TIERS.map(t => (
              <div key={t.id}
                className={`relative rounded-2xl p-7 flex flex-col ${
                  t.featured
                    ? "bg-gradient-to-b from-[var(--raven)]/20 to-[var(--surface)] border border-[var(--raven)]/40"
                    : "glass"
                }`}>
                {t.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-mono uppercase tracking-widest bg-[var(--raven)] text-white px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                )}
                <h3 className="font-display text-xl font-bold">{t.name}</h3>
                <div className="flex items-baseline gap-1 mt-2 mb-1">
                  <span className="font-display text-4xl font-black">${t.price}</span>
                  <span className="text-sm text-[var(--muted)]">{t.period}</span>
                </div>
                <p className="text-xs text-[var(--muted)] mb-5">{t.desc}</p>
                <ul className="space-y-2 flex-1 mb-6">
                  {t.perks.map(p => (
                    <li key={p} className="flex items-start gap-2 text-xs text-[var(--muted)]">
                      <Check className="w-3.5 h-3.5 mt-0.5 text-[var(--raven-glow)] shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
                <Link to={user ? "/pricing" : "/register"}
                  className={`w-full h-10 rounded-lg text-sm font-semibold flex items-center justify-center transition-all ${
                    t.featured
                      ? "bg-[var(--raven)] hover:bg-[var(--raven-glow)] text-white"
                      : "bg-white/10 hover:bg-white/15 text-white"
                  }`}>
                  {t.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-[var(--subtle)] mt-6">
            Annual billing saves 2 months. AI generation credits are separate — top up anytime at $5/50 credits.
          </p>
        </div>
      </section>

      {/* ── TRUST SIGNALS ─────────────────────────────────────────────────── */}
      <section className="py-12 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            {[
              { icon: <Zap className="w-6 h-6" />,    label: "True AI Upscaling",     sub: "Real-ESRGAN, not resize" },
              { icon: <Globe className="w-6 h-6" />,  label: "9 Platforms",           sub: "API + CSV covered" },
              { icon: <Star className="w-6 h-6" />,   label: "60 Product Types",      sub: "Full catalogue preloaded" },
              { icon: <Shield className="w-6 h-6" />, label: "Your Art, Your IP",     sub: "You own everything" },
            ].map(item => (
              <div key={item.label} className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-[var(--raven)]/15 border border-[var(--raven)]/20 flex items-center justify-center text-[var(--raven-glow)]">
                  {item.icon}
                </div>
                <div className="font-display text-sm font-bold">{item.label}</div>
                <div className="text-xs text-[var(--subtle)]">{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ADGFooter />
    </div>
  );
}
