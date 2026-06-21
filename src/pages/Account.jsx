import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import ADGFooter from "../components/ADGFooter";
import { PLATFORMS } from "../data/productCatalogue";
import { Key, Check, Eye, EyeOff, ExternalLink, Zap } from "lucide-react";
import { toast } from "sonner";

const PLATFORM_DOCS = {
  gelato:   "https://dashboard.gelato.com/settings/api",
  printify: "https://printify.com/app/account/connections",
  printful: "https://www.printful.com/dashboard/store/api",
  prodigi:  "https://www.prodigi.com/account/api",
  etsy:     "https://www.etsy.com/developers/your-apps",
  shopify:  "https://help.shopify.com/en/api/getting-started/authentication/private-authentication",
};

function PlatformRow({ id, plat, connected, onSave }) {
  const [key, setKey] = useState("");
  const [storeId, setStoreId] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const save = async () => {
    if (!key.trim()) return;
    setSaving(true);
    try {
      await onSave(id, key.trim(), storeId.trim() || null);
      toast.success(`${plat.name} connected`);
      setKey(""); setOpen(false);
    } catch { toast.error("Failed to save key"); }
    finally { setSaving(false); }
  };

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-5 hover:bg-white/3 transition-colors text-left">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          connected ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
            : "bg-white/5 text-[var(--subtle)] border border-white/10"
        }`}>
          <Key className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{plat.name}</span>
            <span className={`text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded border ${
              plat.api
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-amber-500/30 bg-amber-500/10 text-amber-400"
            }`}>{plat.badge}</span>
          </div>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            {connected ? "✓ Connected — key saved" : plat.api ? "Requires API key" : "CSV export — no key needed"}
          </p>
        </div>
        {plat.api && !plat.badge.includes("CSV") && (
          <div className={`text-xs font-semibold px-3 py-1 rounded-full ${
            connected ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-[var(--muted)]"
          }`}>
            {connected ? "Connected" : "Connect"}
          </div>
        )}
      </button>

      {open && plat.api && (
        <div className="border-t border-white/8 p-5 space-y-4">
          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] block mb-2">
              API Key
              {PLATFORM_DOCS[id] && (
                <a href={PLATFORM_DOCS[id]} target="_blank" rel="noreferrer"
                  className="ml-2 text-[var(--raven-glow)] hover:underline inline-flex items-center gap-1">
                  Get key <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={key}
                onChange={e => setKey(e.target.value)}
                placeholder={connected ? "Enter new key to update" : "Paste your API key"}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm text-[var(--text)] outline-none focus:border-[var(--raven)]/50 font-mono"
              />
              <button onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--subtle)] hover:text-[var(--muted)] transition-colors">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {id === "gelato" && (
            <div>
              <label className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] block mb-2">Store ID</label>
              <input value={storeId} onChange={e => setStoreId(e.target.value)}
                placeholder="Your Gelato store ID"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--raven)]/50 font-mono" />
            </div>
          )}
          {id === "shopify" && (
            <div>
              <label className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] block mb-2">Store URL</label>
              <input value={storeId} onChange={e => setStoreId(e.target.value)}
                placeholder="your-store.myshopify.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--raven)]/50 font-mono" />
            </div>
          )}
          <button onClick={save} disabled={saving || !key.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-[var(--raven)] hover:bg-[var(--raven-glow)] text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50">
            <Check className="w-4 h-4" />
            {saving ? "Saving..." : "Save Key"}
          </button>
          <p className="text-[10px] text-[var(--subtle)]">
            Keys are stored encrypted. We only use them when you trigger a pipeline action.
          </p>
        </div>
      )}
    </div>
  );
}

export default function Account() {
  const { user, checkAuth } = useAuth();
  const [platforms, setPlatforms] = useState({ connected: [], available: {} });

  useEffect(() => {
    api.get("/account/platforms").then(({ data }) => setPlatforms(data)).catch(() => {});
  }, []);

  const savePlatformKey = async (platform, apiKey, storeId) => {
    await api.post("/account/platform-key", { platform, api_key: apiKey, store_id: storeId });
    const { data } = await api.get("/account/platforms");
    setPlatforms(data);
  };

  const tier = user?.tier || "free";
  const TIER_PERKS = {
    free:    { badge:"bg-white/10 text-[var(--muted)]",       label:"Free" },
    creator: { badge:"bg-[var(--raven)]/20 text-[var(--raven-glow)]", label:"Creator" },
    pro:     { badge:"bg-[var(--gold)]/15 text-[var(--gold)]", label:"Pro" },
    agency:  { badge:"bg-emerald-500/15 text-emerald-400",      label:"Agency" },
    owner:   { badge:"bg-red-500/15 text-red-400",              label:"Owner" },
  };

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <span className="text-xs font-mono uppercase tracking-[0.25em] text-[var(--gold)]">Account</span>
          <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter mt-1">Settings</h1>
        </div>

        {/* Profile */}
        <div className="glass rounded-2xl p-6 mb-6">
          <h2 className="font-display text-lg font-bold mb-4">Profile</h2>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--raven)]/20 border border-[var(--raven)]/30 flex items-center justify-center font-display text-xl font-black text-[var(--raven-glow)]">
              {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold">{user?.name}</p>
              <p className="text-sm text-[var(--muted)]">{user?.email}</p>
              <span className={`inline-block text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded mt-1 ${TIER_PERKS[tier]?.badge}`}>
                {TIER_PERKS[tier]?.label} tier
              </span>
            </div>
          </div>
        </div>

        {/* Subscription */}
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold">Subscription</h2>
            {tier !== "owner" && tier !== "agency" && (
              <Link to="/pricing"
                className="flex items-center gap-1.5 text-xs text-[var(--raven-glow)] hover:underline">
                <Zap className="w-3.5 h-3.5" /> Upgrade
              </Link>
            )}
          </div>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            {[
              { label:"Current Plan", value: tier.charAt(0).toUpperCase() + tier.slice(1) },
              { label:"Pipeline Runs Used", value: user?.pipeline_runs_used || 0 },
              { label:"AI Credits Used", value: user?.ai_gen_credits_used || 0 },
            ].map(item => (
              <div key={item.label} className="p-4 rounded-xl bg-white/5 text-center">
                <div className="font-display text-xl font-bold">{item.value}</div>
                <div className="text-xs text-[var(--muted)] mt-1">{item.label}</div>
              </div>
            ))}
          </div>
          {tier === "free" && (
            <div className="mt-4 p-4 rounded-xl bg-[var(--raven)]/10 border border-[var(--raven)]/20 text-sm">
              <p className="text-[var(--muted)]">
                Upgrade to <strong className="text-[var(--raven-glow)]">Creator</strong> for 20 runs/month, batch processing, and schedule support.{" "}
                <Link to="/pricing" className="text-[var(--raven-glow)] hover:underline">View plans →</Link>
              </p>
            </div>
          )}
        </div>

        {/* Platform connections */}
        <div className="mb-6">
          <h2 className="font-display text-lg font-bold mb-4">Platform Connections</h2>
          <p className="text-sm text-[var(--muted)] mb-4">
            Connect your platform API keys to enable direct publishing. Keys are encrypted at rest and used only when you run the pipeline.
          </p>
          <div className="space-y-3">
            {Object.entries(PLATFORMS).map(([id, plat]) => (
              <PlatformRow
                key={id}
                id={id}
                plat={plat}
                connected={platforms.connected?.includes(id)}
                onSave={savePlatformKey}
              />
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div className="glass rounded-2xl p-6 border border-red-500/20">
          <h2 className="font-display text-lg font-bold text-red-400 mb-2">Danger Zone</h2>
          <p className="text-sm text-[var(--muted)] mb-4">
            Deleting your account removes all your data including pipeline history, style profiles and platform keys. This cannot be undone.
          </p>
          <button className="px-5 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-semibold border border-red-500/20 transition-all"
            onClick={() => toast.error("Contact ascensiondigitalagency@outlook.com to delete your account")}>
            Delete Account
          </button>
        </div>
      </div>
      <ADGFooter />
    </div>
  );
}
