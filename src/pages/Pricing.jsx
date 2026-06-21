import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import ADGFooter from "../components/ADGFooter";
import { Check, Zap, Star } from "lucide-react";
import { toast } from "sonner";

const TIERS = [
  {
    id: "free", name: "Free", monthly: 0, annual: 0,
    desc: "Try the pipeline. No card needed.",
    perks: [
      "3 pipeline runs total",
      "1 image per run",
      "5 AI gen credits",
      "All 9 platforms",
      "Manual runs only",
      "Individual review",
    ],
    limit: null, featured: false, cta: "Start Free",
  },
  {
    id: "creator", name: "Creator", monthly: 39, annual: 390,
    desc: "For artists shipping weekly drops.",
    perks: [
      "20 pipeline runs / month",
      "10 images per run",
      "30 AI gen credits / month",
      "Schedule image generation",
      "3 style profiles",
      "Inline listing editing",
      "Duplicate run feature",
    ],
    limit: null, featured: false, cta: "Go Creator",
  },
  {
    id: "growth", name: "Growth", monthly: 69, annual: 690,
    desc: "Scaling sellers, more headroom.",
    perks: [
      "35 pipeline runs / month",
      "15 images per run",
      "60 AI gen credits / month",
      "Schedule image generation",
      "5 style profiles",
      "Inline listing editing",
      "Duplicate run feature",
    ],
    limit: null, featured: false, cta: "Go Growth",
  },
  {
    id: "pro", name: "Pro", monthly: 119, annual: 1190,
    desc: "Full automation. Wake up to listings.",
    perks: [
      "50 pipeline runs / month",
      "25 images per run",
      "100 AI gen credits / month",
      "Full pipeline scheduling",
      "3× daily schedules",
      "Bulk approve listings",
      "10 style profiles",
      "Priority processing",
    ],
    limit: null, featured: true, cta: "Go Pro",
  },
  {
    id: "agency", name: "Agency", monthly: 189, annual: 1890,
    desc: "Multiple brands. Real scale.",
    perks: [
      "80 pipeline runs / month",
      "40 images per run",
      "250 AI gen credits / month",
      "Full scheduling",
      "5 brand workspaces",
      "Unlimited style profiles",
      "White label CSV exports",
      "Priority support",
    ],
    limit: null, featured: false, cta: "Go Agency",
  },
];

const FAQS = [
  { q: "Can I cancel anytime?", a: "Yes. Cancel from Account Settings any time. You keep access until the end of your billing period — no lock-in." },
  { q: "What counts as a pipeline run?", a: "One run = one batch submission, regardless of how many images are in it. A Creator run with 10 images counts as 1 run." },
  { q: "Do unused credits roll over?", a: "Monthly credits reset each billing period. AI gen top-up packs don't expire." },
  { q: "What platforms can I publish to?", a: "All tiers get access to all 9 platforms: Gelato, Printify, Printful, Prodigi, Etsy, Shopify (API), plus Redbubble, TeePublic and Merch by Amazon via CSV." },
  { q: "Do you store my artwork?", a: "No. Images are processed in memory. We don't permanently store your original artwork." },
  { q: "What's the difference between Free and paid?", a: "Free gives you 3 total runs with 1 image each — enough to see exactly what the pipeline does. Paid tiers unlock higher batch sizes, scheduling, style profiles and bulk approval." },
];

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [billing, setBilling] = useState("monthly");
  const [loading, setLoading] = useState(null);

  const checkout = async (tierId) => {
    if (tierId === "free") { navigate("/register"); return; }
    if (!user) { navigate("/register"); return; }
    setLoading(tierId);
    try {
      const { data } = await api.post("/billing/checkout", { tier: tierId, billing });
      window.location.href = data.checkout_url;
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not start checkout");
      setLoading(null);
    }
  };

  const price = (tier) => billing === "annual"
    ? `$${(tier.annual / 12).toFixed(0)}`
    : `$${tier.monthly}`;

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-xs font-mono uppercase tracking-[0.25em] text-[var(--gold)]">Pricing</span>
          <h1 className="font-display text-5xl sm:text-6xl font-black tracking-tighter mt-2 mb-4">
            Priced for real ROI.
          </h1>
          <p className="text-[var(--muted)] max-w-xl mx-auto mb-8">
            A VA doing this manually costs $600–1,000/month. Raven Sharp starts at $39.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            {["monthly", "annual"].map(b => (
              <button key={b} onClick={() => setBilling(b)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                  billing === b ? "bg-[var(--raven)] text-white" : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}>
                {b === "monthly" ? "Monthly" : "Annual"}
                {b === "annual" && <span className="ml-2 text-[10px] text-emerald-400 font-mono">2 months free</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {TIERS.map(tier => (
            <div key={tier.id}
              className={`relative rounded-2xl p-7 flex flex-col ${
                tier.featured
                  ? "bg-gradient-to-b from-[var(--raven)]/20 to-[var(--surface)] border border-[var(--raven)]/40 shadow-[0_0_40px_rgba(124,92,191,0.15)]"
                  : "glass"
              }`}>
              {tier.featured && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest bg-[var(--raven)] text-white px-3 py-1 rounded-full">
                  <Star className="w-3 h-3" /> Most Popular
                </div>
              )}

              <h3 className="font-display text-xl font-bold mb-1">{tier.name}</h3>
              <p className="text-xs text-[var(--muted)] mb-4">{tier.desc}</p>

              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-display text-4xl font-black">{price(tier)}</span>
                {tier.monthly > 0 && <span className="text-sm text-[var(--muted)]">/mo</span>}
              </div>
              {billing === "annual" && tier.annual > 0 && (
                <p className="text-xs text-emerald-400 mb-4">
                  ${tier.annual}/yr · saves ${tier.monthly * 12 - tier.annual}
                </p>
              )}

              <ul className="space-y-2.5 flex-1 my-5">
                {tier.perks.map(p => (
                  <li key={p} className="flex items-start gap-2 text-xs text-[var(--muted)]">
                    <Check className="w-3.5 h-3.5 mt-0.5 text-[var(--raven-glow)] shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => checkout(tier.id)}
                disabled={loading === tier.id || (user?.tier === tier.id)}
                className={`w-full h-11 rounded-xl text-sm font-semibold transition-all ${
                  user?.tier === tier.id
                    ? "bg-white/5 text-[var(--muted)] cursor-default"
                    : tier.featured
                      ? "bg-[var(--raven)] hover:bg-[var(--raven-glow)] text-white"
                      : "bg-white/10 hover:bg-white/15 text-white"
                }`}>
                {loading === tier.id ? "Loading..." : user?.tier === tier.id ? "Current Plan" : tier.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Add-ons */}
        <div className="glass rounded-2xl p-8 mb-16 text-center">
          <h2 className="font-display text-2xl font-bold mb-2">AI Generation Top-Ups</h2>
          <p className="text-[var(--muted)] text-sm mb-6">Need more AI image gen credits? Top up any time — credits don't expire.</p>
          <div className="inline-flex items-center gap-6 px-8 py-5 rounded-xl bg-[var(--raven)]/10 border border-[var(--raven)]/20">
            <div>
              <div className="font-display text-3xl font-black text-[var(--raven-glow)]">$5</div>
              <div className="text-xs text-[var(--muted)] mt-1">50 credits</div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-sm text-[var(--muted)]">
              ~$0.10 per image generated<br />
              <span className="text-xs text-[var(--subtle)]">AI image generation · Instant top-up</span>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div className="mb-16">
          <h2 className="font-display text-3xl font-bold text-center mb-8">Common Questions</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {FAQS.map(faq => (
              <div key={faq.q} className="glass rounded-2xl p-6">
                <h3 className="font-display font-bold text-base mb-2">{faq.q}</h3>
                <p className="text-sm text-[var(--muted)] leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center">
          <p className="text-xs text-[var(--subtle)]">
            All prices in AUD · GST included where applicable ·{" "}
            <Link to="/legal/refunds" className="text-[var(--raven-glow)] hover:underline">Refund Policy</Link>
            {" · "}
            <Link to="/legal/terms" className="text-[var(--raven-glow)] hover:underline">Terms of Service</Link>
          </p>
        </div>
      </div>
      <ADGFooter />
    </div>
  );
}
