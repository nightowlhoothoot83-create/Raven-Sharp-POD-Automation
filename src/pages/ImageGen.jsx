import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import ADGFooter from "../components/ADGFooter";
import { Wand2, Plus, Sparkles, Check, X, Trash2, ChevronRight, Zap, Download, UploadCloud, Pencil, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const ASPECT_RATIOS = [
  { value:"square",    label:"1:1 Square",   sub:"Best for most products" },
  { value:"portrait",  label:"2:3 Portrait", sub:"Art prints, posters" },
  { value:"landscape", label:"3:2 Landscape",sub:"Mugs, phone cases" },
  { value:"wide",      label:"16:9 Wide",    sub:"Banners, panoramics" },
];

export default function ImageGen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [batches, setBatches] = useState([]);
  const [tab, setTab] = useState("generate"); // generate | profiles | history
  const [generating, setGenerating] = useState(false);

  const [form, setForm] = useState({
    prompt: "", style_profile_id: null,
    quantity: 1, aspect_ratio: "square",
  });

  const [profileForm, setProfileForm] = useState({
    name:"", base_prompt:"", negative_prompt:"",
    aspect_ratio:"square", colour_palette:"", mood_tags:[]
  });
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [moodInput, setMoodInput] = useState("");
  const [editingImage, setEditingImage] = useState(null); // { batchId, index, prompt } | null
  const [regenerating, setRegenerating] = useState(false);

  const tier = user?.tier || "free";
  const genUsed  = user?.ai_gen_credits_used || 0;
  const LIMITS = { free:5, creator:30, pro:100, agency:250, owner:9999 };
  const maxCredits = LIMITS[tier] || 5;
  const canGenerate = tier === "owner" || genUsed < maxCredits;

  useEffect(() => {
    Promise.all([api.get("/style-profiles"), api.get("/image-gen/batches")])
      .then(([p, b]) => { setProfiles(p.data); setBatches(b.data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!batches.some(b => b.status === "processing")) return;
    const timer = setInterval(async () => {
      try {
        const { data } = await api.get("/image-gen/batches");
        setBatches(data);
      } catch {
        // Keep the current history visible if a refresh briefly fails.
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [batches]);

  const generate = async (e) => {
    e.preventDefault();
    if (!canGenerate) { toast.error("AI gen credits exhausted — top up or upgrade"); return; }
    setGenerating(true);
    try {
      await api.post("/image-gen", form);
      toast.success(`Generation started for ${form.quantity} image${form.quantity !== 1 ? "s" : ""}`);
      const { data: newBatches } = await api.get("/image-gen/batches");
      setBatches(newBatches);
      setTab("history");
    } catch (err) {
      const _eid = err.response?.data?.error_id;
      toast.error((err.response?.data?.detail || err.response?.data?.error || err.message) + (_eid ? ` (error ${_eid})` : ""));
    } finally {
      setGenerating(false);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/style-profiles", profileForm);
      setProfiles(prev => [...prev, data]);
      setCreatingProfile(false);
      setProfileForm({ name:"", base_prompt:"", negative_prompt:"", aspect_ratio:"square", colour_palette:"", mood_tags:[] });
      toast.success("Style profile saved");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not save profile");
    }
  };

  const deleteProfile = async (id) => {
    await api.delete(`/style-profiles/${id}`);
    setProfiles(prev => prev.filter(p => p.id !== id));
    toast.success("Profile deleted");
  };

  const imageToPipeline = async (img, index) => {
    if (!img?.url) return;
    try {
      const res = await fetch(img.url);
      if (!res.ok) throw new Error("Could not fetch generated image");
      const blob = await res.blob();
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      localStorage.setItem("pendingPipelineImages", JSON.stringify([{
        id: `generated-${Date.now()}`,
        name: `generated-image-${index + 1}.png`,
        size: blob.size,
        preview: img.url,
        base64,
        mime: blob.type || "image/png",
      }]));
      toast.success("Image ready for pipeline");
      navigate("/pipeline");
    } catch (err) {
      toast.error("Could not send that image to the pipeline. Download it and upload it instead.");
    }
  };

  const approveBatch = async (batchId, approvedIds) => {
    await api.post(`/image-gen/${batchId}/approve`, approvedIds);
    setBatches(prev => prev.map(b => b.id === batchId ? { ...b, status:"approved" } : b));
    toast.success("Images approved — send to pipeline from Dashboard");
  };

  const regenerateWithPrompt = async () => {
    if (!editingImage) return;
    setRegenerating(true);
    try {
      await api.post(`/image-gen/${editingImage.batchId}/retry/${editingImage.index}`, {
        prompt: editingImage.prompt,
      });
      toast.success("Regenerating with your edited prompt...");
      setEditingImage(null);
      const { data: newBatches } = await api.get("/image-gen/batches");
      setBatches(newBatches);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Regeneration failed");
    } finally {
      setRegenerating(false);
    }
  };

  const profileLimits = { free:0, creator:3, pro:10, agency:-1, owner:-1 };
  const maxProfiles = profileLimits[tier] ?? 0;
  const canAddProfile = maxProfiles === -1 || profiles.length < maxProfiles;

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="mb-8">
          <span className="text-xs font-mono uppercase tracking-[0.25em] text-[var(--gold)]">AI Studio</span>
          <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter mt-1">Image Generation</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-[var(--muted)]">
              Credits: {tier === "owner" ? "∞" : `${genUsed} / ${maxCredits}`} used this month
            </span>
            {!canGenerate && (
              <Link to="/pricing" className="text-xs text-[var(--raven-glow)] hover:underline flex items-center gap-1">
                <Zap className="w-3 h-3" /> Top up or upgrade
              </Link>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10 mb-8 w-fit">
          {[
            { id:"generate", label:"Generate" },
            { id:"profiles", label:`Style Profiles (${profiles.length})` },
            { id:"history",  label:`History (${batches.length})` },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id ? "bg-[var(--raven)] text-white" : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Generate tab */}
        {tab === "generate" && (
          <div className="fade-up">
            <form onSubmit={generate} className="space-y-6">
              <div className="glass rounded-2xl p-6">
                <label className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] block mb-3">
                  <Wand2 className="w-3.5 h-3.5 inline mr-1.5" />Image Prompt
                </label>
                <textarea
                  value={form.prompt}
                  onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))}
                  rows={4} required
                  placeholder="Describe the artwork you want to create. Be specific about style, colours, mood, subject matter. E.g. 'A serene Australian bushland at golden hour, watercolour style, warm oranges and deep greens, soft ethereal quality'"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--raven)]/50 resize-none"
                />
              </div>

              {profiles.length > 0 && (
                <div className="glass rounded-2xl p-6">
                  <label className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] block mb-3">
                    Style Profile (optional)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setForm(f => ({ ...f, style_profile_id: null }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        !form.style_profile_id
                          ? "bg-[var(--raven)]/20 text-[var(--raven-glow)] border border-[var(--raven)]/30"
                          : "bg-white/5 text-[var(--muted)] border border-white/10 hover:bg-white/10"
                      }`}>None</button>
                    {profiles.map(p => (
                      <button key={p.id} type="button"
                        onClick={() => setForm(f => ({ ...f, style_profile_id: p.id }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          form.style_profile_id === p.id
                            ? "bg-[var(--raven)]/20 text-[var(--raven-glow)] border border-[var(--raven)]/30"
                            : "bg-white/5 text-[var(--muted)] border border-white/10 hover:bg-white/10"
                        }`}>{p.name}</button>
                    ))}
                  </div>
                </div>
              )}

              <div className="glass rounded-2xl p-6">
                <label className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] block mb-3">Aspect Ratio</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {ASPECT_RATIOS.map(r => (
                    <button key={r.value} type="button"
                      onClick={() => setForm(f => ({ ...f, aspect_ratio: r.value }))}
                      className={`p-3 rounded-xl text-left transition-all ${
                        form.aspect_ratio === r.value
                          ? "bg-[var(--raven)]/20 border border-[var(--raven)]/30"
                          : "bg-white/5 border border-white/10 hover:bg-white/10"
                      }`}>
                      <div className="text-xs font-semibold">{r.label}</div>
                      <div className="text-[10px] text-[var(--subtle)] mt-0.5">{r.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="glass rounded-2xl p-6">
                <label className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] block mb-3">
                  Quantity: {form.quantity}
                </label>
                <input type="range" min={1} max={tier === "free" ? 2 : 10}
                  value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) }))}
                  className="w-full accent-[var(--raven)]" />
                <div className="flex justify-between text-[10px] text-[var(--subtle)] mt-1">
                  <span>1</span><span>{tier === "free" ? 2 : 10} max</span>
                </div>
              </div>

              <button type="submit" disabled={generating || !canGenerate}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-10 h-14 bg-[var(--raven)] hover:bg-[var(--raven-glow)] text-white rounded-xl text-base font-semibold transition-all glow-pulse disabled:opacity-50">
                <Sparkles className="w-5 h-5" />
                {generating ? "Generating..." : `Generate ${form.quantity} Image${form.quantity !== 1 ? "s" : ""}`}
              </button>

              <p className="text-xs text-[var(--subtle)]">
                Generated images go to a review queue before entering the pipeline. Costs ~{form.quantity} credit{form.quantity !== 1 ? "s" : ""}.
              </p>
            </form>
          </div>
        )}

        {/* Profiles tab */}
        {tab === "profiles" && (
          <div className="fade-up space-y-4">
            {!canAddProfile && maxProfiles !== -1 && (
              <div className="flex items-center gap-2 text-xs text-amber-400 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Zap className="w-3.5 h-3.5 shrink-0" />
                Profile limit reached for your tier.{" "}
                <Link to="/pricing" className="underline">Upgrade</Link> for more.
              </div>
            )}

            {canAddProfile && (
              <button onClick={() => setCreatingProfile(true)}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-[var(--raven)]/30 hover:border-[var(--raven)]/60 text-[var(--muted)] hover:text-[var(--raven-glow)] transition-all text-sm font-medium">
                <Plus className="w-4 h-4" /> New Style Profile
              </button>
            )}

            {creatingProfile && (
              <div className="glass rounded-2xl p-6 border border-[var(--raven)]/20">
                <h3 className="font-display text-lg font-bold mb-5">New Style Profile</h3>
                <form onSubmit={saveProfile} className="space-y-4">
                  <div>
                    <label className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] block mb-2">Profile Name</label>
                    <input value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} required
                      placeholder="e.g. Mystical Nature Series"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--raven)]/50" />
                  </div>
                  <div>
                    <label className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] block mb-2">Base Prompt</label>
                    <textarea value={profileForm.base_prompt} onChange={e => setProfileForm(f => ({ ...f, base_prompt: e.target.value }))} rows={3} required
                      placeholder="Consistent style description applied to all prompts using this profile..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--raven)]/50 resize-none" />
                  </div>
                  <div>
                    <label className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] block mb-2">Negative Prompt (optional)</label>
                    <input value={profileForm.negative_prompt} onChange={e => setProfileForm(f => ({ ...f, negative_prompt: e.target.value }))}
                      placeholder="Things to exclude: text, watermarks, low quality..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--raven)]/50" />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button type="submit"
                      className="flex items-center gap-2 px-5 py-2.5 bg-[var(--raven)] hover:bg-[var(--raven-glow)] text-white rounded-xl text-sm font-semibold transition-all">
                      <Check className="w-4 h-4" /> Save Profile
                    </button>
                    <button type="button" onClick={() => setCreatingProfile(false)}
                      className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-[var(--muted)] rounded-xl text-sm transition-all">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {profiles.map(p => (
              <div key={p.id} className="glass rounded-2xl p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--raven)]/15 border border-[var(--raven)]/20 flex items-center justify-center text-[var(--raven-glow)] shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{p.name}</p>
                  <p className="text-xs text-[var(--muted)] mt-1 line-clamp-2">{p.base_prompt}</p>
                </div>
                <button onClick={() => deleteProfile(p.id)}
                  className="w-8 h-8 rounded-lg hover:bg-red-500/10 text-[var(--subtle)] hover:text-red-400 transition-all flex items-center justify-center shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {profiles.length === 0 && !creatingProfile && (
              <div className="text-center py-12 text-[var(--muted)] text-sm">
                No style profiles yet. Create one to apply consistent aesthetics to all your AI generations.
              </div>
            )}
          </div>
        )}

        {/* History tab */}
        {tab === "history" && (
          <div className="fade-up space-y-4">
            {batches.length === 0 ? (
              <div className="text-center py-12 text-[var(--muted)] text-sm">
                No generation batches yet.
              </div>
            ) : batches.map(batch => (
              <div key={batch.id} className="glass rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-xs font-mono text-[var(--muted)]">
                      {new Date(batch.created_at).toLocaleDateString("en-AU", { day:"numeric", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })}
                    </span>
                    <span className={`ml-2 text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      batch.status === "approved" ? "bg-emerald-500/10 text-emerald-400"
                        : batch.status === "failed" ? "bg-red-500/10 text-red-400"
                        : batch.status === "processing" ? "bg-blue-500/10 text-blue-400"
                        : "bg-amber-500/10 text-amber-400"
                    }`}>{batch.status}</span>
                  </div>
                  <span className="text-xs text-[var(--muted)]">{batch.images?.length || 0} images</span>
                </div>
                {batch.status === "processing" && batch.current_step && (
                  <p className="mb-3 text-xs text-blue-300">{batch.current_step}</p>
                )}
                {batch.errors?.length > 0 && (
                  <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                    {batch.errors.map((error, index) => (
                      <p key={index}>{error.message || "Image generation failed"}</p>
                    ))}
                  </div>
                )}
                {batch.images?.length > 0 && (
                  <div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {batch.images.map((img, i) => (
                        <div key={i} className="rounded-xl overflow-hidden bg-white/5 border border-white/10">
                          <div className="aspect-square bg-black/20">
                            {img.url && <img src={img.url} alt={`Generated ${i + 1}`} className="w-full h-full object-contain" />}
                          </div>
                          <div className="p-3 flex flex-wrap gap-2">
                            <button
                              onClick={() => setEditingImage({ batchId: batch.id, index: i, prompt: batch.prompt_overrides?.[i] || batch.prompt || "" })}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 text-[var(--muted)] text-xs font-semibold border border-white/10 hover:text-[var(--text)] hover:bg-white/10 transition-all">
                              <Pencil className="w-3.5 h-3.5" /> Edit Prompt
                            </button>
                            <button
                              onClick={() => imageToPipeline(img, i)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--raven)] text-white text-xs font-semibold hover:bg-[var(--raven-glow)] transition-all">
                              <UploadCloud className="w-3.5 h-3.5" /> Use in Pipeline
                            </button>
                            {img.url && (
                              <a href={img.url} download target="_blank" rel="noreferrer"
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 text-[var(--muted)] text-xs font-semibold border border-white/10 hover:text-[var(--text)] hover:bg-white/10 transition-all">
                                <Download className="w-3.5 h-3.5" /> Download
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {batch.status === "pending_review" && (
                      <button
                        onClick={() => approveBatch(batch.id, batch.images.map((_, i) => i))}
                        className="mt-4 flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-semibold border border-emerald-500/20 hover:bg-emerald-500/25 transition-all">
                        <Check className="w-3.5 h-3.5" /> Approve All
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {editingImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => !regenerating && setEditingImage(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-[var(--surface)] border border-white/10 p-5" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold mb-3">Edit Prompt & Regenerate</h3>
            <textarea
              value={editingImage.prompt}
              onChange={e => setEditingImage(prev => ({ ...prev, prompt: e.target.value }))}
              rows={5}
              className="w-full rounded-xl bg-black/20 border border-white/10 p-3 text-sm text-[var(--text)] resize-vertical"
              placeholder="Describe what you want this image to look like..."
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={regenerateWithPrompt}
                disabled={regenerating || !editingImage.prompt.trim()}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[var(--raven)] text-white text-sm font-semibold hover:bg-[var(--raven-glow)] transition-all disabled:opacity-50">
                <RefreshCw className={`w-4 h-4 ${regenerating ? "animate-spin" : ""}`} />
                {regenerating ? "Regenerating..." : "Regenerate with New Prompt"}
              </button>
              <button
                onClick={() => setEditingImage(null)}
                disabled={regenerating}
                className="px-4 py-2.5 rounded-lg bg-white/5 text-[var(--muted)] text-sm font-semibold border border-white/10 hover:text-[var(--text)] transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <ADGFooter />
    </div>
  );
}
