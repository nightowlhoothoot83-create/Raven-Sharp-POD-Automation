import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { PLATFORMS, getProductsForPlatform } from "../data/productCatalogue";
import ADGFooter from "../components/ADGFooter";
import { Upload, X, Play, ChevronRight, Globe, Zap, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const MARKETS = [
  { value: "global", label: "Global" },
  { value: "au",     label: "Australia" },
  { value: "us",     label: "United States" },
  { value: "uk",     label: "United Kingdom" },
  { value: "eu",     label: "Europe" },
  { value: "ca",     label: "Canada" },
];

const PRICE_TIERS = [
  { value: "budget",  label: "Budget" },
  { value: "mid",     label: "Mid-Range" },
  { value: "premium", label: "Premium" },
];

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload  = () => res(reader.result.split(",")[1]);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

function fmtSize(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + " MB";
  return (bytes / 1024).toFixed(0) + " KB";
}

export default function Pipeline() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [step, setStep] = useState(1); // 1=platform, 2=upload, 3=settings, 4=running
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [images, setImages] = useState([]);
  const [market, setMarket] = useState("global");
  const [priceTier, setPriceTier] = useState("mid");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ step: "", pct: 0 });

  const tier = user?.tier || "free";
  const tierLimits = { free: 1, creator: 10, pro: 25, agency: 40, owner: 999 };
  const maxImages = tierLimits[tier] || 1;

  // ── File handling ──────────────────────────────────────────────────────────
  const onFiles = useCallback(async (files) => {
    const valid = Array.from(files)
      .filter(f => f.type.startsWith("image/"))
      .slice(0, maxImages - images.length);

    const loaded = await Promise.all(valid.map(async f => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      name: f.name,
      size: f.size,
      preview: URL.createObjectURL(f),
      base64: await fileToBase64(f),
      mime: f.type,
    })));
    setImages(prev => [...prev, ...loaded].slice(0, maxImages));
  }, [images.length, maxImages]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    onFiles(e.dataTransfer.files);
  }, [onFiles]);

  const removeImage = (id) => setImages(prev => prev.filter(i => i.id !== id));

  // ── Run pipeline ───────────────────────────────────────────────────────────
  const runPipeline = async () => {
    if (!selectedPlatform || images.length === 0) return;
    setRunning(true);
    setStep(4);

    try {
      setProgress({ step: "Submitting to pipeline...", pct: 10 });

      const payload = {
        platform: selectedPlatform,
        market,
        price_tier: priceTier,
        images: images.map(img => ({
          name: img.name,
          base64: img.base64,
          mime: img.mime,
        })),
      };

      setProgress({ step: "Upscaling images with Real-ESRGAN AI...", pct: 25 });
      const { data } = await api.post("/pipeline/run", payload);
      setProgress({ step: "Analysing artwork with Claude Vision...", pct: 60 });

      await new Promise(r => setTimeout(r, 500));
      setProgress({ step: "Building review queue...", pct: 90 });
      await new Promise(r => setTimeout(r, 300));
      setProgress({ step: "Done! Redirecting to review...", pct: 100 });

      toast.success(`Pipeline complete — ${data.total - (data.failed || 0)} listings ready for review`);
      setTimeout(() => navigate(`/review/${data.run_id}`), 800);

    } catch (err) {
      toast.error(err.response?.data?.detail || err.message);
      setRunning(false);
      setStep(3);
    }
  };

  const platformProducts = selectedPlatform ? getProductsForPlatform(selectedPlatform) : [];

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-10">
          <span className="text-xs font-mono uppercase tracking-[0.25em] text-[var(--gold)]">Pipeline</span>
          <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter mt-1">
            New Pipeline Run
          </h1>
          <p className="text-[var(--muted)] mt-2">
            Select a platform, upload your artwork, and let Raven Sharp do the rest.
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-10">
          {[{n:1,label:"Platform"},{n:2,label:"Artwork"},{n:3,label:"Settings"},{n:4,label:"Running"}].map((s, i) => (
            <React.Fragment key={s.n}>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all ${
                step === s.n ? "bg-[var(--raven)]/20 text-[var(--raven-glow)] border border-[var(--raven)]/30"
                  : step > s.n ? "text-[var(--success)]" : "text-[var(--subtle)]"
              }`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step > s.n ? "bg-[var(--success)]/20 text-[var(--success)]"
                    : step === s.n ? "bg-[var(--raven)]/30 text-[var(--raven-glow)]"
                    : "bg-white/5 text-[var(--subtle)]"
                }`}>{s.n}</span>
                {s.label}
              </div>
              {i < 3 && <ChevronRight className="w-3.5 h-3.5 text-[var(--subtle)]" />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1 — Platform selection */}
        {step === 1 && (
          <div className="fade-up">
            <h2 className="font-display text-2xl font-bold mb-2">Choose your platform</h2>
            <p className="text-sm text-[var(--muted)] mb-8">
              Select one platform per run. Products, copy format and output method are all optimised for your choice.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(PLATFORMS).map(([id, plat]) => (
                <button
                  key={id}
                  onClick={() => { setSelectedPlatform(id); setStep(2); }}
                  className="glass rounded-2xl p-6 text-left hover:border-[var(--raven)]/40 transition-all group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-display text-lg font-bold">{plat.name}</span>
                    <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded border ${
                      plat.api
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                    }`}>
                      {plat.badge}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted)]">
                    {getProductsForPlatform(id).length} products available
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-xs text-[var(--raven-glow)] opacity-0 group-hover:opacity-100 transition-opacity">
                    Select <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Upload artwork */}
        {step === 2 && (
          <div className="fade-up">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display text-2xl font-bold">Upload artwork</h2>
              <button onClick={() => setStep(1)} className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors flex items-center gap-1">
                ← Change platform
              </button>
            </div>
            <p className="text-sm text-[var(--muted)] mb-2">
              Platform: <span className="text-[var(--raven-glow)] font-semibold">{PLATFORMS[selectedPlatform]?.name}</span>
              {" · "}{platformProducts.length} products available
            </p>

            {tier !== "owner" && (
              <div className="flex items-center gap-2 text-xs text-[var(--muted)] mb-6 px-3 py-2 rounded-lg bg-white/5 border border-white/8 w-fit">
                <AlertCircle className="w-3.5 h-3.5 text-[var(--gold)]" />
                Your {tier} tier allows {maxImages} image{maxImages !== 1 ? "s" : ""} per run
              </div>
            )}

            {/* Dropzone */}
            <div
              onDrop={onDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-[var(--raven)]/30 hover:border-[var(--raven)]/60 rounded-2xl p-12 text-center cursor-pointer transition-all group mb-6"
            >
              <input
                ref={fileRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={e => onFiles(e.target.files)}
              />
              <Upload className="w-10 h-10 text-[var(--raven-glow)] mx-auto mb-4 group-hover:scale-110 transition-transform" />
              <p className="font-display text-xl font-bold mb-2">Drop artwork here</p>
              <p className="text-sm text-[var(--muted)]">
                PNG, JPEG, WebP · Up to {maxImages} image{maxImages !== 1 ? "s" : ""} · Any size (will be AI upscaled)
              </p>
            </div>

            {/* Image grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
                {images.map(img => (
                  <div key={img.id} className="relative group rounded-xl overflow-hidden aspect-square bg-[var(--surface-2)]">
                    <img src={img.preview} alt={img.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                      <span className="text-[10px] text-white/80 truncate">{img.name}</span>
                    </div>
                    <button
                      onClick={() => removeImage(img.id)}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {images.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--muted)]">
                  {images.length} / {maxImages} image{maxImages !== 1 ? "s" : ""} loaded
                </span>
                <button
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[var(--raven)] hover:bg-[var(--raven-glow)] text-white rounded-xl text-sm font-semibold transition-all"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 3 — Settings */}
        {step === 3 && (
          <div className="fade-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl font-bold">Run settings</h2>
              <button onClick={() => setStep(2)} className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors">← Back</button>
            </div>

            <div className="grid sm:grid-cols-2 gap-6 mb-8">
              <div className="glass rounded-2xl p-6">
                <label className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] block mb-3">
                  <Globe className="w-3.5 h-3.5 inline mr-1.5" />Target Market
                </label>
                <div className="flex flex-wrap gap-2">
                  {MARKETS.map(m => (
                    <button key={m.value} onClick={() => setMarket(m.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        market === m.value
                          ? "bg-[var(--raven)]/30 text-[var(--raven-glow)] border border-[var(--raven)]/40"
                          : "bg-white/5 text-[var(--muted)] border border-white/10 hover:bg-white/10"
                      }`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="glass rounded-2xl p-6">
                <label className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] block mb-3">
                  <Zap className="w-3.5 h-3.5 inline mr-1.5" />Price Tier
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRICE_TIERS.map(t => (
                    <button key={t.value} onClick={() => setPriceTier(t.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        priceTier === t.value
                          ? "bg-[var(--raven)]/30 text-[var(--raven-glow)] border border-[var(--raven)]/40"
                          : "bg-white/5 text-[var(--muted)] border border-white/10 hover:bg-white/10"
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Run summary */}
            <div className="glass rounded-2xl p-6 mb-8">
              <h3 className="font-display text-lg font-bold mb-4">Run Summary</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                {[
                  { label: "Platform",    value: PLATFORMS[selectedPlatform]?.name },
                  { label: "Images",      value: `${images.length}` },
                  { label: "Market",      value: MARKETS.find(m => m.value === market)?.label },
                  { label: "Price tier",  value: PRICE_TIERS.find(t => t.value === priceTier)?.label },
                ].map(item => (
                  <div key={item.label} className="text-center p-3 rounded-xl bg-white/5">
                    <div className="text-xs text-[var(--muted)] mb-1">{item.label}</div>
                    <div className="font-semibold text-[var(--text)]">{item.value}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[var(--subtle)] mt-4">
                Pipeline will: AI upscale each image → Claude Vision analyse → match {platformProducts.length} available products → generate SEO copy → build review queue
              </p>
            </div>

            <button
              onClick={runPipeline}
              disabled={running}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-10 h-14 bg-[var(--raven)] hover:bg-[var(--raven-glow)] text-white rounded-xl text-base font-semibold transition-all glow-pulse disabled:opacity-50"
            >
              <Play className="w-5 h-5" />
              Run Pipeline ({images.length} image{images.length !== 1 ? "s" : ""})
            </button>
          </div>
        )}

        {/* Step 4 — Running */}
        {step === 4 && (
          <div className="fade-up text-center py-20">
            <div className="relative w-24 h-24 mx-auto mb-8">
              <div className="absolute inset-0 rounded-full bg-[var(--raven)]/20 blur-2xl animate-pulse" />
              <img src="/brands/ravenSharpLogo.png" alt="Raven Sharp"
                className="relative w-24 h-24 object-contain animate-spin" style={{ animationDuration: "8s" }} />
            </div>
            <h2 className="font-display text-3xl font-bold mb-3">Pipeline Running</h2>
            <p className="text-[var(--muted)] mb-8">{progress.step}</p>
            <div className="max-w-md mx-auto">
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[var(--raven)] to-[var(--raven-glow)] rounded-full transition-all duration-500"
                  style={{ width: `${progress.pct}%` }}
                />
              </div>
              <p className="text-xs text-[var(--subtle)] mt-2">{progress.pct}%</p>
            </div>
          </div>
        )}
      </div>
      <ADGFooter />
    </div>
  );
}
