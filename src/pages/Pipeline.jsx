import React, { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { PLATFORMS, getProductsForPlatform } from "../data/productCatalogue";
import ADGFooter from "../components/ADGFooter";
import { Upload, X, Play, ChevronRight, Globe, Zap, AlertCircle, CheckCircle2, Info, Clock, Lock } from "lucide-react";
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
  { value: "budget",  label: "Budget",    range: "~$12–25",  desc: "Best for volume sellers & entry-level buyers" },
  { value: "mid",     label: "Mid-Range", range: "~$22–55",  desc: "Sweet spot for most POD products" },
  { value: "premium", label: "Premium",   range: "~$38–95",  desc: "Higher margins, curated feel" },
];

const PLATFORM_NOTES = {
  gelato:    { desc: "Global print network. Ships direct to customers in 30+ countries.", type: "API" },
  printify:  { desc: "Wide product catalogue, multiple print providers to choose from.", type: "API" },
  printful:  { desc: "Premium quality fulfillment with warehousing options.", type: "API" },
  prodigi:   { desc: "UK-based global fulfillment, great for European markets.", type: "API" },
  etsy:      { desc: "Marketplace with built-in traffic. Connects via OAuth.", type: "OAuth" },
  shopify:   { desc: "Your own store. Full control over branding and pricing.", type: "API" },
  redbubble: { desc: "Artist marketplace. Outputs a CSV file you upload yourself.", type: "CSV" },
  teepublic: { desc: "Design-focused marketplace with a loyal buyer base.", type: "CSV" },
  merch:     { desc: "Amazon's POD program. High reach, requires approval.", type: "CSV" },
};

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
  const { runId: resumeRunId } = useParams();
  const fileRef = useRef(null);
  const pollTimerRef = useRef(null);

  const [step, setStep] = useState(1); // 1=platform, 2=upload, 3=settings, 4=running
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [images, setImages] = useState([]);
  const [market, setMarket] = useState("global");
  const [priceTier, setPriceTier] = useState("mid");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ step: "", pct: 0 });
  const [runId, setRunId] = useState(null);
  const [total, setTotal] = useState(0);
  const [completed, setCompleted] = useState([]);
  const [lastPreview, setLastPreview] = useState(null);
  const [awaitingContinue, setAwaitingContinue] = useState(false);
  const [resuming, setResuming] = useState(!!resumeRunId);
  const [connectedPlatforms, setConnectedPlatforms] = useState([]);
  const [platformsLoading, setPlatformsLoading] = useState(true);

  const tier = user?.tier || "free";
  const tierLimits = { free: 3, creator: 10, pro: 25, agency: 40, owner: 999 };
  const maxImages = tierLimits[tier] || 1;

  useEffect(() => () => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
  }, []);

  useEffect(() => {
    const pending = localStorage.getItem("pendingPipelineImages");
    if (!pending) return;
    try {
      const loaded = JSON.parse(pending);
      if (Array.isArray(loaded) && loaded.length > 0) {
        setImages(loaded.slice(0, maxImages));
        setStep(2);
        toast.success("Generated image loaded");
      }
    } catch (err) {
      toast.error("Could not load the generated image");
    } finally {
      localStorage.removeItem("pendingPipelineImages");
    }
  }, [maxImages]);

  // ── Fetch connected platforms on mount ────────────────────────────────────
  useEffect(() => {
    api.get("/account/platforms")
      .then(({ data }) => setConnectedPlatforms(data.connected || []))
      .catch(() => {})
      .finally(() => setPlatformsLoading(false));
  }, []);

  // ── Resume an existing in_progress run (save point) ──────────────────────
  useEffect(() => {
    if (!resumeRunId) return;
    (async () => {
      try {
        const { data } = await api.get(`/pipeline/runs/${resumeRunId}`);
        setRunId(data.id);
        setTotal(data.total_count);
        setCompleted(data.results || []);
        setStep(4);
        setRunning(true);
        setResuming(false);
        // Pass the freshly-fetched values directly rather than relying on
        // `total`/`completed` state — those setState calls above haven't
        // actually applied yet at this point (React batches updates), so
        // pollRun would otherwise poll using stale/zero values instead of
        // this run's real progress.
        pollRun(data.id, data.total_count, (data.results || []).length);
      } catch (err) {
        toast.error("Could not load that run to resume");
        setResuming(false);
        navigate("/dashboard");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeRunId]);

  // ── File handling ──────────────────────────────────────────────────────────
  const onFiles = useCallback(async (files) => {
    const allImages = Array.from(files).filter(f => f.type.startsWith("image/"));
    const valid = allImages.slice(0, maxImages - images.length);

    if (valid.length < allImages.length) {
      toast.info(`Only ${maxImages} image${maxImages !== 1 ? "s" : ""} allowed on your ${tier} plan`);
    }

    const loaded = await Promise.all(valid.map(async f => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      name: f.name,
      size: f.size,
      preview: URL.createObjectURL(f),
      base64: await fileToBase64(f),
      mime: f.type,
      removeBg: false,
    })));
    setImages(prev => [...prev, ...loaded].slice(0, maxImages));
  }, [images.length, maxImages, tier]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    onFiles(e.dataTransfer.files);
  }, [onFiles]);

  const removeImage = (id) => setImages(prev => prev.filter(i => i.id !== id));
  const toggleRemoveBg = (id) => setImages(prev => prev.map(i => i.id === id ? { ...i, removeBg: !i.removeBg } : i));

  // ── Process one image at a time with save-point after each ────────────────
  const pollRun = async (rid, runTotal = total, alreadyDone = completed.length, retryCount = 0) => {
    setProgress({ step: `Processing image ${alreadyDone + 1} of ${runTotal}...`, pct: Math.round((alreadyDone / runTotal) * 100) });
    try {
      const { data } = await api.get(`/pipeline/runs/${rid}`);
      const results = data.results || [];
      const savedTotal = data.total_count || runTotal || results.length;
      const pct = savedTotal ? Math.round((results.length / savedTotal) * 100) : 0;
      setTotal(savedTotal);
      setCompleted(results);
      setLastPreview(results[results.length - 1] || null);

      if (["pending_review", "completed"].includes(data.status) || results.length >= savedTotal) {
        setProgress({ step: "All images processed! Redirecting to review...", pct: 100 });
        toast.success(`Pipeline complete — ${data.processed} listing${data.processed !== 1 ? "s" : ""} ready for review`);
        setTimeout(() => navigate(`/review/${rid}`), 800);
        return;
      }
      setAwaitingContinue(false);
      // Prefer the real, live step the backend is actually doing right now
      // (e.g. "Image 3 of 10 (design.png): analysing with Claude Vision")
      // over a generic client-side guess.
      setProgress({
        step: data.current_step || `Processing image ${Math.min(results.length + 1, savedTotal)} of ${savedTotal}...`,
        pct,
      });
      pollTimerRef.current = setTimeout(() => pollRun(rid, savedTotal, results.length), 3000);
      return;
    } catch (err) {
      if (err.response?.status === 404 && retryCount < 3) {
        setProgress({ step: "Waiting for saved run...", pct: Math.max(2, Math.round((alreadyDone / runTotal) * 100)) });
        pollTimerRef.current = setTimeout(() => pollRun(rid, runTotal, alreadyDone, retryCount + 1), 1500);
        return;
      }
      const _eid = err.response?.data?.error_id;
      toast.error((err.response?.data?.detail || err.response?.data?.error || err.message) + (_eid ? ` (error ${_eid})` : ""));
      setRunning(false);
    }
  };

  const createRun = async (payload) => {
    try {
      return await api.post("/pipeline/run", payload);
    } catch (err) {
      if (err.response?.status !== 404) throw err;
      return api.post("/pipeline/runs", payload);
    }
  };

  const continueToNext = () => {
    setAwaitingContinue(false);
    pollRun(runId, total, completed.length);
  };

  const pauseRun = () => {
    toast.message("Run paused — it's saved. Resume anytime from your Dashboard.");
    navigate("/dashboard");
  };

  // ── Retry failed images in the current run ────────────────────────────────
  // Uses the checkpoint-aware retry endpoint: if an image already made it
  // through upscaling/upload before failing (e.g. only the analysis step
  // failed), the retry skips straight to the failed step instead of
  // re-running — and re-paying for — everything from scratch.
  const retryFailed = async () => {
    if (!runId) return;
    const failedItems = completed.filter(r => r.status === "failed" || r.error);
    if (failedItems.length === 0) {
      toast.info("No failed images to retry");
      return;
    }
    setRunning(true);
    setAwaitingContinue(false);
    toast.info(`Retrying ${failedItems.length} failed image${failedItems.length !== 1 ? "s" : ""} — already-completed steps won't be re-run...`);
    try {
      await Promise.all(failedItems.map(item => {
        const src = images.find(img => img.name === item.name);
        return api.post(`/pipeline/runs/${runId}/retry/${item.id}`, {
          base64: src?.base64 || null,
          mime: src?.mime || "image/jpeg",
        }).catch(err => {
          const msg = err.userMessage || err.response?.data?.error || err.message;
          toast.error(`Couldn't retry ${item.name}: ${msg}`);
        });
      }));
      setCompleted(prev => prev.filter(r => r.status !== "failed" && !r.error));
      setStep(4);
      pollRun(runId, total, completed.length - failedItems.length);
    } catch (err) {
      const _eid = err.response?.data?.error_id;
      toast.error((err.response?.data?.detail || err.response?.data?.error || err.message) + (_eid ? ` (error ${_eid})` : ""));
      setRunning(false);
    }
  };

  // ── Kick off a brand new run ───────────────────────────────────────────────
  const runPipeline = async () => {
    if (!selectedPlatform || images.length === 0) return;
    setRunning(true);
    setStep(4);

    try {
      setProgress({ step: "Creating pipeline run...", pct: 2 });
      const payload = {
        platform: selectedPlatform,
        market,
        price_tier: priceTier,
        images: images.map(img => ({
          name: img.name,
          base64: img.base64,
          mime: img.mime,
          removeBg: !!img.removeBg,
        })),
      };

      const { data } = await createRun(payload);
      const createdRunId = data.run_id || data.id;
      const createdTotal = data.total || data.total_count || images.length;
      if (!createdRunId) throw new Error("Pipeline started but no run ID was returned");

      setRunId(createdRunId);
      setTotal(createdTotal);
      setCompleted([]);
      pollRun(createdRunId, createdTotal, 0);

    } catch (err) {
      const _eid = err.response?.data?.error_id;
      toast.error((err.response?.data?.detail || err.response?.data?.error || err.message) + (_eid ? ` (error ${_eid})` : ""));
      setRunning(false);
      setStep(3);
    }
  };

  const platformProducts = selectedPlatform ? getProductsForPlatform(selectedPlatform) : [];
  const isConnected = (id) => connectedPlatforms.includes(id);
  const needsSetup = (id) => PLATFORMS[id]?.api && !isConnected(id);

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
            Select a platform, upload your artwork, configure your settings — Raven Sharp handles the rest.
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

        {/* ── Step 1 — Platform selection ─────────────────────────────────────── */}
        {step === 1 && (
          <div className="fade-up">
            <h2 className="font-display text-2xl font-bold mb-1">Choose your platform</h2>
            <p className="text-sm text-[var(--muted)] mb-4">
              Select one platform per run. Products, copy format and output method are all optimised for your choice.
            </p>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mb-6 text-xs">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                API / OAuth — publishes directly to your store
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Info className="w-3.5 h-3.5" />
                CSV — downloads a file you upload yourself
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(PLATFORMS).map(([id, plat]) => {
                const connected = isConnected(id);
                const setupNeeded = needsSetup(id);
                const note = PLATFORM_NOTES[id];
                return (
                  <button
                    key={id}
                    onClick={() => { setSelectedPlatform(id); setStep(2); }}
                    className="glass rounded-2xl p-5 text-left hover:border-[var(--raven)]/40 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-display text-base font-bold leading-tight">{plat.name}</span>
                      <span className={`shrink-0 text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border mt-0.5 ${
                        plat.api
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                      }`}>
                        {note?.type || plat.badge}
                      </span>
                    </div>

                    {note?.desc && (
                      <p className="text-xs text-[var(--muted)] mb-3 leading-relaxed">{note.desc}</p>
                    )}

                    {!platformsLoading && (
                      <div className={`flex items-center gap-1.5 text-[11px] font-medium mb-2 ${
                        connected ? "text-emerald-400"
                          : plat.api ? "text-amber-400"
                          : "text-[var(--subtle)]"
                      }`}>
                        {connected ? (
                          <><CheckCircle2 className="w-3.5 h-3.5" /> Connected</>
                        ) : plat.api ? (
                          <><AlertCircle className="w-3.5 h-3.5" /> Needs setup</>
                        ) : (
                          <><Info className="w-3.5 h-3.5" /> No connection needed</>
                        )}
                      </div>
                    )}

                    <p className="text-[11px] text-[var(--subtle)]">
                      {getProductsForPlatform(id).length} products available
                    </p>

                    {setupNeeded && !platformsLoading && (
                      <p className="text-[10px] text-amber-400/70 mt-2">
                        Add your API key in <span className="underline">Account → Platforms</span> to publish directly
                      </p>
                    )}

                    <div className="mt-3 flex items-center gap-1 text-xs text-[var(--raven-glow)] opacity-0 group-hover:opacity-100 transition-opacity">
                      Select <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                );
              })}
            </div>

            {!platformsLoading && connectedPlatforms.length === 0 && (
              <div className="mt-6 flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">No platforms connected yet.</span> CSV platforms (Redbubble, TeePublic, Merch by Amazon) work without any connection. API platforms need a key.{" "}
                  <Link to="/account" className="underline text-amber-200 hover:text-white transition-colors">
                    Connect platforms →
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2 — Upload artwork ─────────────────────────────────────────── */}
        {step === 2 && (
          <div className="fade-up">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display text-2xl font-bold">Upload artwork</h2>
              <button onClick={() => setStep(1)} className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors flex items-center gap-1">
                ← Change platform
              </button>
            </div>
            <p className="text-sm text-[var(--muted)] mb-5">
              Platform: <span className="text-[var(--raven-glow)] font-semibold">{PLATFORMS[selectedPlatform]?.name}</span>
              {" · "}{platformProducts.length} products will be matched
            </p>

            {/* What the pipeline does */}
            <div className="glass rounded-2xl p-5 mb-5 border-l-2 border-[var(--raven)]/40">
              <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                <Zap className="w-4 h-4 text-[var(--raven-glow)]" />
                What happens to your artwork
              </div>
              <div className="grid sm:grid-cols-4 gap-3 text-xs text-[var(--muted)]">
                {[
                  { n: "1", label: "AI Upscale", desc: "Real-ESRGAN upscales to print-quality resolution" },
                  { n: "2", label: "DPI Inject", desc: "Sets 300 DPI metadata for clean print output" },
                  { n: "3", label: "Vision Analysis", desc: "Claude reads your art: colours, style, themes" },
                  { n: "4", label: "SEO Copy", desc: "Titles, descriptions & tags written per platform" },
                ].map(s => (
                  <div key={s.n} className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-[var(--raven)]/20 text-[var(--raven-glow)] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{s.n}</span>
                    <div>
                      <div className="font-semibold text-[var(--text)]">{s.label}</div>
                      <div>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Image tips */}
            <div className="flex flex-wrap gap-3 mb-5 text-xs text-[var(--muted)]">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Any resolution — AI handles upscaling
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Square or portrait both fine
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> PNG, JPEG, or WebP
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                <Info className="w-3 h-3 text-amber-400" /> Higher source res = better final quality
              </span>
            </div>

            {/* Plan limit */}
            {tier !== "owner" && (
              <div className="flex items-center gap-2 text-xs text-[var(--muted)] mb-5 px-3 py-2 rounded-lg bg-white/5 border border-white/8 w-fit">
                <Lock className="w-3.5 h-3.5 text-[var(--gold)]" />
                Your <span className="capitalize font-semibold mx-0.5">{tier}</span> plan allows{" "}
                <span className="font-semibold mx-0.5">{maxImages}</span> image{maxImages !== 1 ? "s" : ""} per run
                {tier !== "agency" && (
                  <Link to="/pricing" className="ml-2 text-[var(--raven-glow)] underline hover:no-underline">Upgrade</Link>
                )}
              </div>
            )}

            {/* Need to crop or remove background first? */}
            <div className="flex items-start gap-3 mb-5 px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-[var(--muted)]">
                <span className="text-[var(--text)] font-semibold">Need to crop or remove a background first?</span>{" "}
                Use{" "}
                <a href="https://raven-sharp-image-optimiser-upscaler.pages.dev" target="_blank" rel="noopener"
                   className="text-[var(--raven-glow)] underline hover:no-underline">
                  Image Optimiser
                </a>{" "}
                to fix your artwork before uploading here — the pipeline upscales and analyses images as-is, it doesn't edit them.
              </div>
            </div>

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
              <p className="font-display text-xl font-bold mb-2">Drop artwork here or click to browse</p>
              <p className="text-sm text-[var(--muted)]">
                Up to {maxImages} image{maxImages !== 1 ? "s" : ""} · PNG, JPEG, WebP · Any size
              </p>
            </div>

            {/* Image grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6">
                {images.map(img => (
                  <div key={img.id} className="relative group rounded-xl overflow-hidden aspect-square bg-[var(--surface-2)]">
                    <img src={img.preview} alt={img.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleRemoveBg(img.id); }}
                        className={`self-start text-[10px] px-2 py-1 rounded-full font-semibold transition-colors ${
                          img.removeBg ? "bg-[var(--raven)] text-white" : "bg-white/15 text-white/80 hover:bg-white/25"
                        }`}
                      >
                        {img.removeBg ? "✓ Remove BG" : "Remove BG"}
                      </button>
                      <div>
                        <span className="text-[10px] text-white/80 truncate block">{img.name}</span>
                        <span className="text-[10px] text-white/50">{fmtSize(img.size)}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {images.length < maxImages && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="rounded-xl aspect-square border-2 border-dashed border-white/10 hover:border-[var(--raven)]/40 flex flex-col items-center justify-center gap-2 text-[var(--subtle)] hover:text-[var(--muted)] transition-all"
                  >
                    <Upload className="w-5 h-5" />
                    <span className="text-[10px]">Add more</span>
                  </button>
                )}
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
                  Continue to settings <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Step 3 — Settings ───────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="fade-up">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display text-2xl font-bold">Run settings</h2>
              <button onClick={() => setStep(2)} className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors">← Back</button>
            </div>
            <p className="text-sm text-[var(--muted)] mb-7">
              These settings shape the AI-generated copy. You can still edit everything in the review queue before anything goes live.
            </p>

            <div className="grid sm:grid-cols-2 gap-6 mb-6">
              {/* Market */}
              <div className="glass rounded-2xl p-6">
                <label className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] block mb-1">
                  <Globe className="w-3.5 h-3.5 inline mr-1.5" />Target Market
                </label>
                <p className="text-xs text-[var(--subtle)] mb-4">
                  Influences currency, product selection and listing copy tone — e.g. Australian vs US spelling, local holiday relevance.
                </p>
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

              {/* Price Tier */}
              <div className="glass rounded-2xl p-6">
                <label className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] block mb-1">
                  <Zap className="w-3.5 h-3.5 inline mr-1.5" />Price Tier
                </label>
                <p className="text-xs text-[var(--subtle)] mb-4">
                  Sets the suggested retail price range in your listing copy. Adjust per product in the review queue.
                </p>
                <div className="flex flex-col gap-2">
                  {PRICE_TIERS.map(t => (
                    <button key={t.value} onClick={() => setPriceTier(t.value)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left ${
                        priceTier === t.value
                          ? "bg-[var(--raven)]/30 text-[var(--raven-glow)] border border-[var(--raven)]/40"
                          : "bg-white/5 text-[var(--muted)] border border-white/10 hover:bg-white/10"
                      }`}>
                      <span className="font-semibold">{t.label}</span>
                      <span className={`font-mono ${priceTier === t.value ? "text-[var(--raven-glow)]/70" : "text-[var(--subtle)]"}`}>{t.range}</span>
                    </button>
                  ))}
                  {priceTier && (
                    <p className="text-[11px] text-[var(--subtle)] mt-1 px-1">
                      {PRICE_TIERS.find(t => t.value === priceTier)?.desc}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Run summary */}
            <div className="glass rounded-2xl p-6 mb-6">
              <h3 className="font-display text-base font-bold mb-4">Run Summary</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-4">
                {[
                  { label: "Platform",   value: PLATFORMS[selectedPlatform]?.name },
                  { label: "Images",     value: `${images.length}` },
                  { label: "Market",     value: MARKETS.find(m => m.value === market)?.label },
                  { label: "Price tier", value: PRICE_TIERS.find(t => t.value === priceTier)?.label },
                ].map(item => (
                  <div key={item.label} className="text-center p-3 rounded-xl bg-white/5">
                    <div className="text-xs text-[var(--muted)] mb-1">{item.label}</div>
                    <div className="font-semibold text-[var(--text)]">{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-[var(--raven)]/10 border border-[var(--raven)]/20 p-4 text-xs text-[var(--muted)]">
                <div className="font-semibold text-[var(--text)] mb-2 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[var(--raven-glow)]" />
                  What happens when you hit Run
                </div>
                <ol className="space-y-1 list-decimal list-inside">
                  <li>Each image is AI-upscaled and DPI-corrected for print</li>
                  <li>Claude Vision analyses your artwork for themes, colours and style</li>
                  <li>Platform-specific listings are generated — titles, descriptions, tags and {platformProducts.length} product variants</li>
                  <li>Everything lands in your <strong className="text-[var(--text)]">review queue</strong> — nothing is published until you approve it</li>
                </ol>
                <p className="mt-3 text-[var(--subtle)]">
                  Images are processed one at a time. You'll see a preview of each result before continuing to the next.
                </p>
              </div>
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

        {/* ── Step 4 — Running ────────────────────────────────────────────────── */}
        {step === 4 && (
          <div className="fade-up">
            {!awaitingContinue && !resuming && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-sm font-medium mb-8">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Keep this tab open — or use Save &amp; Continue Later to pick up where you left off
              </div>
            )}

            <div className="text-center py-12">
              {resuming ? (
                <p className="text-[var(--muted)]">Loading saved run...</p>
              ) : (
                <>
                  <div className="relative w-20 h-20 mx-auto mb-6">
                    <div className="absolute inset-0 rounded-full bg-[var(--raven)]/20 blur-2xl animate-pulse" />
                    <img src="/brands/ravenSharpLogo.png" alt="Raven Sharp"
                      className={`relative w-20 h-20 object-contain ${awaitingContinue ? "" : "animate-spin"}`}
                      style={{ animationDuration: "8s" }} />
                  </div>

                  <h2 className="font-display text-2xl sm:text-3xl font-bold mb-2">
                    {awaitingContinue ? "Image ready — review before continuing" : "Pipeline Running"}
                  </h2>
                  <p className="text-[var(--muted)] mb-2">{progress.step}</p>

                  {!awaitingContinue && (
                    <p className="text-xs text-[var(--subtle)] mb-6 flex items-center justify-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Allow 1–3 minutes per image
                    </p>
                  )}

                  <div className="max-w-md mx-auto mb-8">
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[var(--raven)] to-[var(--raven-glow)] rounded-full transition-all duration-500"
                        style={{ width: `${progress.pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-[var(--subtle)] mt-2">{completed.length} / {total} processed — {progress.pct}%</p>
                  </div>

                  {/* Preview of the most recently completed image */}
                  {lastPreview && (
                    <div className="max-w-sm mx-auto glass rounded-2xl p-5 mb-8">
                      {lastPreview.public_url ? (
                        <img src={lastPreview.public_url} alt={lastPreview.name}
                          className="w-full rounded-xl mb-4 object-cover aspect-square" />
                      ) : (
                        <div className="w-full rounded-xl mb-4 aspect-square bg-white/5 flex items-center justify-center text-xs text-red-400">
                          Failed: {lastPreview.error}
                        </div>
                      )}
                      <p className="text-sm font-medium truncate">{lastPreview.name}</p>
                      {lastPreview.analysis?.title && (
                        <p className="text-xs text-[var(--muted)] mt-1 line-clamp-2">{lastPreview.analysis.title}</p>
                      )}
                    </div>
                  )}

                  {awaitingContinue && (
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={pauseRun}
                        className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-white/15 text-[var(--muted)] hover:text-[var(--text)] hover:border-white/30 transition-all">
                        Save &amp; Continue Later
                      </button>
                      <button onClick={continueToNext}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[var(--raven)] hover:bg-[var(--raven-glow)] text-white rounded-xl text-sm font-semibold transition-all">
                        Looks good — Continue <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {!awaitingContinue && running && runId && (
                    <div className="flex items-center justify-center gap-3 flex-wrap">
                      <button onClick={pauseRun}
                        className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-white/15 text-[var(--muted)] hover:text-[var(--text)] hover:border-white/30 transition-all">
                        Save &amp; Continue Later
                      </button>
                      {completed.some(r => r.status === "failed" || r.error) && (
                        <button onClick={retryFailed}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 transition-all">
                          <RefreshCw className="w-4 h-4" /> Retry Failed
                        </button>
                      )}
                    </div>
                  )}
                  {!running && completed.some(r => r.status === "failed" || r.error) && (
                    <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
                      <p className="text-xs text-red-400 w-full text-center mb-1">
                        {completed.filter(r => r.status === "failed" || r.error).length} image{completed.filter(r => r.status === "failed" || r.error).length !== 1 ? "s" : ""} failed
                      </p>
                      <button onClick={retryFailed}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 transition-all">
                        <RefreshCw className="w-4 h-4" /> Retry Failed Images
                      </button>
                      <button onClick={() => { setStep(1); setCompleted([]); setRunId(null); setRunning(false); }}
                        className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-white/15 text-[var(--muted)] hover:text-[var(--text)] transition-all">
                        Start New Run
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

      </div>
      <ADGFooter />
    </div>
  );
}
