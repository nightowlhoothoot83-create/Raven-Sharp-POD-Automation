import React from "react";
import { Link } from "react-router-dom";
import ADGFooter from "../components/ADGFooter";
import { ArrowRight, Check, Sparkles, Image as ImageIcon, ListChecks, Calendar, Shield, Star } from "lucide-react";

const FEATURES = [
  { icon:<Sparkles className="w-5 h-5"/>,    title:"Claude Vision Product Match",  desc:"Drop in artwork and Claude analyses it visually, recommending the best-fit products from 60 options across 9 platforms — with real pricing, margins and SEO copy generated automatically." },
  { icon:<ImageIcon className="w-5 h-5"/>,   title:"Real AI Image Generation",     desc:"Need fresh artwork instead of uploading your own? Generate it directly in the pipeline — no separate tool required." },
  { icon:<ListChecks className="w-5 h-5"/>,  title:"Review & Approve Queue",       desc:"Every AI-generated listing lands in a review queue before it goes anywhere. Edit titles, tags and pricing inline, then approve in bulk." },
  { icon:<Shield className="w-5 h-5"/>,      title:"Real Per-Platform Output",     desc:"Etsy gets a real draft pushed via API. Redbubble, TeePublic and Merch by Amazon get platform-correct CSVs and ready-to-run upload packages — not one generic export." },
  { icon:<Calendar className="w-5 h-5"/>,    title:"Scheduling",                   desc:"Queue pipeline runs to fire automatically on a schedule. Set it up once, let it keep producing listings while you focus on the art." },
  { icon:<Check className="w-5 h-5"/>,       title:"Multi-Workspace",              desc:"Run multiple brands or stores from one account. Each workspace keeps its own style profiles, platform connections and history." },
];

const TIERS = [
  { name:"Free",     price:"0",  period:"",    desc:"Try the full pipeline, no card needed.", perks:["3 pipeline runs/mo","1 image per run","5 AI gen credits/mo","1 workspace","All 9 platforms"], cta:"Start Free", featured:false },
  { name:"Creator",  price:"39", period:"/mo", desc:"Solo sellers shipping weekly drops.",     perks:["20 pipeline runs/mo","10 images per run","30 AI gen credits/mo","3 style profiles","All 9 platforms"], cta:"Go Creator", featured:false },
  { name:"Pro",      price:"119",period:"/mo", desc:"Full automation. Wake up to listings.",   perks:["50 pipeline runs/mo","25 images per run","100 AI gen credits/mo","Full scheduling","Bulk approve"], cta:"Go Pro", featured:true },
];

export default function Landing() {
  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 pb-24">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-[var(--raven)]/10 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] bg-[var(--gold)]/5 rounded-full blur-[80px]" />
          <div className="absolute inset-0 opacity-[0.025]" style={{backgroundImage:"linear-gradient(90deg,rgba(124,92,191,.5) 1px,transparent 1px),linear-gradient(0deg,rgba(124,92,191,.5) 1px,transparent 1px)",backgroundSize:"80px 80px"}} />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-[var(--raven)]/20 blur-3xl scale-150" />
              <img src="/brands/ravenSharpLogo.png" alt="Raven Sharp"
                className="relative w-36 h-36 sm:w-52 sm:h-52 object-contain drop-shadow-[0_0_40px_rgba(124,92,191,0.5)]" />
            </div>
          </div>
          <span className="inline-block text-xs font-mono uppercase tracking-[0.3em] text-[var(--raven-glow)] border border-[var(--raven)]/40 bg-[var(--raven)]/10 px-4 py-1.5 rounded-full mb-6">
            ✦ Image → Product Line, Fully Automated
          </span>
          <h1 className="font-display text-5xl sm:text-7xl font-black tracking-tighter leading-[0.9] mb-6">
            One artwork.<br/>
            <span className="bg-gradient-to-r from-[var(--raven-glow)] via-[var(--gold)] to-[var(--raven-blue)] bg-clip-text text-transparent" style={{backgroundSize:"200%",animation:"shimmer 4s linear infinite"}}>
              A whole product line.
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-[var(--muted)] max-w-2xl mx-auto mb-10 leading-relaxed">
            Drop in artwork. Claude Vision matches it to 60 products across 9 platforms, writes the SEO copy, and ships platform-ready listings — direct API push for Etsy, ready-to-upload packages for the rest.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/register"
              className="flex items-center gap-2 px-10 h-14 text-base font-semibold bg-gradient-to-r from-[var(--raven)] to-[var(--raven-blue)] hover:brightness-110 text-white rounded-xl transition-all glow-pulse">
              Start Free <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="#pricing"
              className="flex items-center gap-2 px-8 h-14 text-base border border-white/20 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all">
              See Pricing
            </a>
          </div>
          <p className="text-xs text-[var(--subtle)] mt-6">Free to start · No card required</p>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-[var(--gold)]">What It Does</span>
            <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tighter mt-2">From image to live listing.</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="glass rounded-2xl p-6 group hover:border-[var(--raven)]/40 transition-all duration-300">
                <div className="w-11 h-11 rounded-xl bg-[var(--raven)]/15 border border-[var(--raven)]/20 flex items-center justify-center text-[var(--raven-glow)] mb-4 group-hover:bg-[var(--raven)]/25 transition-colors">
                  {f.icon}
                </div>
                <h3 className="font-display text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-[var(--muted)] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="glass rounded-2xl p-8 sm:p-10 text-center border border-[var(--raven)]/20">
            <span className="text-xs font-mono uppercase tracking-widest text-[var(--gold)]">No Manual Listing Work</span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mt-2 mb-6">
              What "platform-ready" actually means
            </h2>
            <div className="grid sm:grid-cols-2 gap-6 text-left">
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-[var(--raven-glow)]">Direct API Push</h3>
                {["Etsy — live draft listing created automatically","Real OAuth2 connection, no copy-paste"].map(i => (
                  <div key={i} className="flex items-center gap-2 text-xs text-[var(--muted)]">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> {i}
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-[var(--raven-glow)]">No-API Platforms</h3>
                {["Redbubble, TeePublic, Merch by Amazon","Platform-correct packages — title limits, dimensions, tag caps all matched to spec"].map(i => (
                  <div key={i} className="flex items-center gap-2 text-xs text-[var(--muted)]">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> {i}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 sm:py-24" id="pricing">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-[var(--gold)]">Pricing</span>
            <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tighter mt-2">Simple. Honest.</h2>
            <p className="text-[var(--muted)] mt-4 max-w-lg mx-auto">Start free. Upgrade only when your volume says so.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {TIERS.map(t => (
              <div key={t.name} className={`relative rounded-2xl p-7 flex flex-col ${t.featured ? "bg-gradient-to-b from-[var(--raven)]/20 to-[var(--surface)] border border-[var(--raven)]/40 shadow-[0_0_30px_rgba(124,92,191,0.1)]" : "glass"}`}>
                {t.featured && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest bg-[var(--raven)] text-white px-3 py-1 rounded-full">
                    <Star className="w-3 h-3" /> Most Popular
                  </span>
                )}
                <h3 className="font-display text-xl font-bold">{t.name}</h3>
                <p className="text-xs text-[var(--muted)] mt-1 mb-3">{t.desc}</p>
                <div className="flex items-baseline gap-1 mb-5">
                  <span className="font-display text-4xl font-black">${t.price}</span>
                  {t.period && <span className="text-sm text-[var(--muted)]">{t.period}</span>}
                </div>
                <ul className="space-y-2.5 flex-1 mb-6">
                  {t.perks.map(p => (
                    <li key={p} className="flex items-center gap-2 text-xs text-[var(--muted)]">
                      <Check className="w-3.5 h-3.5 text-[var(--raven-glow)] shrink-0" /> {p}
                    </li>
                  ))}
                </ul>
                <Link to={t.price === "0" ? "/register" : `/register?tier=${t.name.toLowerCase()}`}
                  className={`w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center transition-all ${
                    t.featured ? "bg-[var(--raven)] hover:bg-[var(--raven-glow)] text-white" : "bg-white/10 hover:bg-white/15 text-white"
                  }`}>
                  {t.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-[var(--subtle)] mt-6">
            All prices AUD · Cancel anytime · See full pricing for Pro &amp; Agency tiers on the{" "}
            <Link to="/pricing" className="text-[var(--raven-glow)] hover:underline">pricing page</Link>
          </p>
        </div>
      </section>

      <ADGFooter />
    </div>
  );
}
