import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import ADGFooter from "../components/ADGFooter";
import { useAuth } from "../context/AuthContext";
import { PLATFORMS, PRODUCTS } from "../data/productCatalogue";
import {
  Check, X, Edit3, RefreshCw, ChevronDown, ChevronUp,
  Send, Tag, DollarSign, FileText, Package, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

function TagEditor({ tags, onChange }) {
  const [input, setInput] = useState("");
  const addTag = (e) => {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      if (!tags.includes(input.trim())) onChange([...tags, input.trim()]);
      setInput("");
    }
  };
  return (
    <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-white/5 border border-white/10 min-h-[44px]">
      {tags.map(tag => (
        <span key={tag} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-[var(--raven)]/20 text-[var(--raven-glow)] border border-[var(--raven)]/30">
          {tag}
          <button onClick={() => onChange(tags.filter(t => t !== tag))} className="hover:text-red-400 transition-colors">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={addTag}
        placeholder="Add tag, press Enter"
        className="flex-1 min-w-[120px] bg-transparent text-xs text-[var(--text)] outline-none placeholder:text-[var(--subtle)]"
      />
    </div>
  );
}

function ListingCard({ listing, index, onUpdate, onApprove, onReject, bulkApprove }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(listing.analysis || {});
  const [selectedProduct, setSelectedProduct] = useState(
    listing.analysis?.recommended_products?.[0]?.product || ""
  );

  const analysis = listing.analysis || {};
  const products = analysis.recommended_products || [];
  const status = listing.status;

  const saveEdit = () => {
    onUpdate(listing.id, { ...listing, analysis: draft });
    setEditing(false);
    toast.success("Listing updated");
  };

  return (
    <div className={`glass rounded-2xl overflow-hidden transition-all duration-300 ${
      status === "approved" ? "border-emerald-500/30 bg-emerald-500/5"
        : status === "rejected" ? "border-red-500/30 bg-red-500/5 opacity-60"
        : ""
    }`}>
      {/* Card header */}
      <div className="flex items-center gap-4 p-5">
        {/* Thumbnail */}
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/5 shrink-0">
          {listing.public_url ? (
            <img src={listing.public_url} alt={listing.name}
              className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--subtle)] text-xs">No preview</div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--muted)]">#{index + 1}</span>
            {listing.error && (
              <span className="flex items-center gap-1 text-[10px] text-red-400">
                <AlertTriangle className="w-3 h-3" /> Failed
              </span>
            )}
          </div>
          <p className="font-semibold text-sm truncate">{analysis.seo_title || listing.name}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-[var(--muted)]">{products.length} products</span>
            {analysis.style_category && (
              <span className="text-xs text-[var(--subtle)]">{analysis.style_category}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {status !== "approved" && status !== "rejected" && !listing.error && (
            <>
              <button onClick={() => { setEditing(!editing); setExpanded(true); }}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] transition-all"
                title="Edit listing">
                <Edit3 className="w-4 h-4" />
              </button>
              <button onClick={() => onReject(listing.id)}
                className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 transition-all"
                title="Reject">
                <X className="w-4 h-4" />
              </button>
              <button onClick={() => onApprove(listing)}
                className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-semibold transition-all"
                title="Approve for final export">
                <Check className="w-3.5 h-3.5" /> Approve
              </button>
            </>
          )}
          {status === "approved" && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
              <Check className="w-3.5 h-3.5" /> Approved
            </span>
          )}
          {status === "rejected" && (
            <span className="text-xs text-red-400 font-semibold">Rejected</span>
          )}
          <button onClick={() => setExpanded(!expanded)}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[var(--muted)] transition-all">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded detail / edit */}
      {expanded && (
        <div className="border-t border-white/8 p-5 space-y-5">
          {editing ? (
            <>
              {/* Product type selector */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-[var(--muted)] mb-2">
                  <Package className="w-3.5 h-3.5" /> Product Type
                </label>
                <select
                  value={selectedProduct}
                  onChange={e => setSelectedProduct(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--raven)]/50"
                >
                  {products.map(p => (
                    <option key={p.product} value={p.product}>{p.product}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-[var(--muted)] mb-2">
                  <FileText className="w-3.5 h-3.5" /> Title
                </label>
                <input
                  value={draft.seo_title || ""}
                  onChange={e => setDraft(d => ({ ...d, seo_title: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--raven)]/50"
                  maxLength={140}
                />
                <p className="text-[10px] text-[var(--subtle)] mt-1 text-right">{(draft.seo_title || "").length}/140</p>
              </div>

              {/* Description */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-[var(--muted)] mb-2">
                  <FileText className="w-3.5 h-3.5" /> Description
                </label>
                <textarea
                  value={draft.description || ""}
                  onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                  rows={5}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--raven)]/50 resize-none"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-[var(--muted)] mb-2">
                  <Tag className="w-3.5 h-3.5" /> Tags
                </label>
                <TagEditor
                  tags={draft.tags || []}
                  onChange={tags => setDraft(d => ({ ...d, tags }))}
                />
              </div>

              {/* Price */}
              <div className="grid grid-cols-2 gap-4">
                {products.slice(0, 3).map((p, i) => (
                  <div key={i}>
                    <label className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-[var(--muted)] mb-2">
                      <DollarSign className="w-3.5 h-3.5" /> {p.product} Price (AUD)
                    </label>
                    <input
                      type="number"
                      defaultValue={p.retail_price}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--raven)]/50"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={saveEdit}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[var(--raven)] hover:bg-[var(--raven-glow)] text-white rounded-xl text-sm font-semibold transition-all">
                  <Check className="w-4 h-4" /> Save Changes
                </button>
                <button onClick={() => setEditing(false)}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-[var(--muted)] rounded-xl text-sm transition-all">
                  Cancel
                </button>
              </div>
            </>
          ) : (
            /* Read-only view */
            <>
              {listing.error && (
                <div className="flex gap-3 rounded-xl border border-red-500/25 bg-red-500/10 p-4">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-300">Processing failed</p>
                    <p className="text-xs text-red-200/80 mt-1 break-words">{listing.error}</p>
                    <p className="text-xs text-[var(--muted)] mt-2">
                      Correct the reported connection or API setting, then start a new pipeline run.
                    </p>
                  </div>
                </div>
              )}
              {analysis.seo_title && (
                <div>
                  <p className="text-xs text-[var(--muted)] mb-1">Title</p>
                  <p className="text-sm font-medium">{analysis.seo_title}</p>
                </div>
              )}
              {analysis.description && (
                <div>
                  <p className="text-xs text-[var(--muted)] mb-1">Description</p>
                  <p className="text-sm text-[var(--muted)] leading-relaxed line-clamp-4">{analysis.description}</p>
                </div>
              )}
              {analysis.tags?.length > 0 && (
                <div>
                  <p className="text-xs text-[var(--muted)] mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.tags.slice(0, 13).map(tag => (
                      <span key={tag} className="text-[10px] px-2 py-1 rounded-full bg-white/8 text-[var(--muted)] border border-white/10">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
              {products.length > 0 && (
                <div>
                  <p className="text-xs text-[var(--muted)] mb-3">Recommended Products</p>
                  <div className="space-y-2">
                    {products.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-sm py-2 px-3 rounded-lg bg-white/5">
                        <span className="font-medium">{p.product}</span>
                        <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
                          <span>Base: ${p.base_cost}</span>
                          <span className="text-emerald-400 font-semibold">Retail: ${p.retail_price}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReviewQueue() {
  const { runId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [run, setRun] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pushing, setPushing] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState("");

  const tier = user?.tier || "free";
  const canBulkApprove = ["pro", "agency", "owner"].includes(tier);

  useEffect(() => {
    if (!runId) return;
    api.get(`/pipeline/runs/${runId}`)
      .then(({ data }) => {
        setRun(data);
        setListings(data.results || []);
        setSelectedPlatform(data.platform || "");
      })
      .catch(() => toast.error("Could not load run"))
      .finally(() => setLoading(false));
  }, [runId]);

  const updateListing = (id, updated) => {
    setListings(prev => prev.map(l => l.id === id ? updated : l));
  };

  const approveListing = (listing) => {
    setListings(prev => prev.map(l => l.id === listing.id ? { ...l, status: "approved" } : l));
  };

  const rejectListing = (id) => {
    setListings(prev => prev.map(l => l.id === id ? { ...l, status: "rejected" } : l));
  };

  const approveAll = () => {
    setListings(prev => prev.map(l =>
      l.status !== "rejected" && !l.error ? { ...l, status: "approved" } : l));
    toast.success("All listings approved");
  };

  const finishExport = async () => {
    const approved = listings.filter(l => l.status === "approved");
    if (approved.length === 0) {
      toast.error("Approve at least one listing first");
      return;
    }
    if (!selectedPlatform) {
      toast.error("Choose a destination platform");
      return;
    }

    const destination = PLATFORMS[selectedPlatform];
    setPushing(true);
    try {
      if (!destination?.api) {
        const response = await api.post(
          `/pipeline/runs/${runId}/export/${selectedPlatform}`,
          { run_id: runId, listings: approved, approve_all: false, platform: selectedPlatform },
          { responseType: "blob" },
        );
        const url = URL.createObjectURL(response.data);
        const link = document.createElement("a");
        link.href = url;
        link.download = `raven-sharp-${selectedPlatform}-${runId}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        toast.success(`${destination?.name || selectedPlatform} package downloaded`);
        return;
      }

      const { data } = await api.post(`/pipeline/runs/${runId}/approve`, {
        run_id: runId,
        listings: approved,
        approve_all: false,
        platform: selectedPlatform,
      });
      const productDrafts = (data.results || []).reduce((sum, item) => sum + (item.drafts_ready || 0), 0);
      toast.success(`${productDrafts || data.pushed} mockup-ready draft${(productDrafts || data.pushed) !== 1 ? "s" : ""} created in ${destination.name}`);
      if (data.failed > 0) toast.error(`${data.failed} artwork batch${data.failed !== 1 ? "es" : ""} produced no mockup-ready drafts`);
      if (data.pushed > 0) setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err) {
      const _eid = err.response?.data?.error_id;
      toast.error((err.response?.data?.detail || err.response?.data?.error || err.message) + (_eid ? ` (error ${_eid})` : ""));
    } finally {
      setPushing(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen pt-20 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-2 border-[var(--raven)] border-t-transparent animate-spin mx-auto mb-4" />
        <p className="text-[var(--muted)]">Loading review queue...</p>
      </div>
    </div>
  );

  const approved  = listings.filter(l => l.status === "approved").length;
  const rejected  = listings.filter(l => l.status === "rejected").length;
  const pending   = listings.filter(l => !l.status || l.status === "pending_review").length;
  const failed    = listings.filter(l => l.error).length;
  const previousPlatform = run?.platform;
  const destination = selectedPlatform ? PLATFORMS[selectedPlatform] : null;

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <span className="text-xs font-mono uppercase tracking-[0.25em] text-[var(--gold)]">Review Queue</span>
          <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter mt-1">
            Review & Approve
          </h1>
          <p className="text-[var(--muted)] mt-2">
            {listings.length} reusable listings generated. Review them first, then choose where to send or export them.
            {previousPlatform && <span className="block text-xs mt-1">Older run default: {PLATFORMS[previousPlatform]?.name}</span>}
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Pending",   value: pending,   color: "text-[var(--muted)]" },
            { label: "Approved",  value: approved,  color: "text-emerald-400" },
            { label: "Rejected",  value: rejected,  color: "text-red-400" },
            { label: "Failed",    value: failed,    color: "text-amber-400" },
          ].map(stat => (
            <div key={stat.label} className="glass rounded-xl p-4 text-center">
              <div className={`font-display text-2xl font-black ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-[var(--muted)] mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Review and final destination */}
        <div className="glass rounded-2xl p-5 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="font-display text-lg font-bold">1. Approve the listings you want</h2>
              <p className="text-xs text-[var(--muted)] mt-1">Nothing is sent to a provider during processing or review.</p>
            </div>
            {canBulkApprove && pending > 0 ? (
              <button onClick={approveAll}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl text-sm font-semibold transition-all border border-emerald-500/30">
                <Check className="w-4 h-4" /> Approve All ({pending})
              </button>
            ) : !canBulkApprove ? (
              <div className="text-xs text-[var(--subtle)]">Bulk approve available on Pro+</div>
            ) : null}
          </div>

          <div className="border-t border-white/10 pt-5">
            <h2 className="font-display text-lg font-bold">2. Choose the destination</h2>
            <p className="text-xs text-[var(--muted)] mt-1 mb-4">
              API destinations create unpublished product drafts and request at least one authentic provider mockup per product. CSV destinations download an upload-ready package.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <select
                value={selectedPlatform}
                onChange={e => setSelectedPlatform(e.target.value)}
                className="bg-[var(--surface)] border border-white/10 rounded-xl px-4 py-3 text-sm text-[var(--text)]"
              >
                <option value="">Choose after review...</option>
                {Object.entries(PLATFORMS).map(([id, item]) => (
                  <option key={id} value={id}>{item.name} — {item.api ? "connected draft" : "CSV package"}</option>
                ))}
              </select>
              <button
                onClick={finishExport}
                disabled={pushing || approved === 0 || !selectedPlatform}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-[var(--raven)] hover:bg-[var(--raven-glow)] text-white rounded-xl text-sm font-semibold transition-all glow-pulse disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {pushing ? "Working..." : destination?.api
                  ? `Create Drafts + Mockups in ${destination.name}`
                  : destination ? `Download ${destination.name} Package` : "Choose a destination"}
              </button>
            </div>
          </div>
        </div>

        {/* Listings */}
        <div className="space-y-4">
          {listings.map((listing, i) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              index={i}
              onUpdate={updateListing}
              onApprove={approveListing}
              onReject={rejectListing}
              bulkApprove={canBulkApprove}
            />
          ))}
        </div>

        {listings.length === 0 && (
          <div className="text-center py-20 text-[var(--muted)]">
            No listings in this run.
          </div>
        )}
      </div>
      <ADGFooter />
    </div>
  );
}
