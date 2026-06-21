import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import ADGFooter from "../components/ADGFooter";
import { PLATFORMS } from "../data/productCatalogue";
import { Calendar, Plus, Trash2, ToggleLeft, ToggleRight, Clock, Zap } from "lucide-react";
import { toast } from "sonner";

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const FREQUENCIES = ["once","daily","weekly"];
const TIER_SCHEDULING = {
  free: false, creator: "gen_only", pro: "full", agency: "full", owner: "full"
};

export default function Schedules() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name:"", platform:"gelato", source:"generated",
    prompt:"", quantity:5, frequency:"daily",
    run_time:"06:00", days:[], active:true,
  });

  const tier = user?.tier || "free";
  const scheduling = TIER_SCHEDULING[tier];

  useEffect(() => {
    Promise.all([
      api.get("/schedules"),
      api.get("/style-profiles"),
    ]).then(([s, p]) => {
      setSchedules(s.data);
      setProfiles(p.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/schedules", form);
      setSchedules(prev => [data, ...prev]);
      setCreating(false);
      setForm({ name:"", platform:"gelato", source:"generated", prompt:"", quantity:5, frequency:"daily", run_time:"06:00", days:[], active:true });
      toast.success("Schedule created");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not create schedule");
    }
  };

  const toggle = async (id, active) => {
    await api.patch(`/schedules/${id}`, null, { params: { active } });
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, active } : s));
  };

  const remove = async (id) => {
    await api.delete(`/schedules/${id}`);
    setSchedules(prev => prev.filter(s => s.id !== id));
    toast.success("Schedule deleted");
  };

  if (!scheduling) return (
    <div className="min-h-screen pt-20 flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <Calendar className="w-16 h-16 text-[var(--raven)]/40 mx-auto mb-6" />
        <h1 className="font-display text-3xl font-bold mb-3">Scheduling requires Creator+</h1>
        <p className="text-[var(--muted)] mb-6">Automated scheduling is available on Creator tier and above. Creator unlocks image generation scheduling; Pro and above unlock full pipeline scheduling.</p>
        <Link to="/pricing" className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--raven)] hover:bg-[var(--raven-glow)] text-white rounded-xl font-semibold text-sm transition-all">
          <Zap className="w-4 h-4" /> View Plans
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="flex items-center justify-between mb-10">
          <div>
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-[var(--gold)]">Automation</span>
            <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter mt-1">Schedules</h1>
            <p className="text-[var(--muted)] mt-1 text-sm">
              {scheduling === "gen_only" ? "Creator: image generation scheduling only" : "Full pipeline scheduling active"}
            </p>
          </div>
          <button onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[var(--raven)] hover:bg-[var(--raven-glow)] text-white rounded-xl text-sm font-semibold transition-all">
            <Plus className="w-4 h-4" /> New Schedule
          </button>
        </div>

        {/* Create form */}
        {creating && (
          <div className="glass rounded-2xl p-6 mb-8 border border-[var(--raven)]/20">
            <h2 className="font-display text-xl font-bold mb-5">New Schedule</h2>
            <form onSubmit={create} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] block mb-2">Schedule Name</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                    placeholder="e.g. Daily nature art — Gelato"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--raven)]/50" />
                </div>
                <div>
                  <label className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] block mb-2">Platform</label>
                  <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--raven)]/50">
                    {Object.entries(PLATFORMS).map(([id, p]) => (
                      <option key={id} value={id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {scheduling === "full" && (
                <div>
                  <label className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] block mb-2">Source</label>
                  <div className="flex gap-3">
                    {["generated","preloaded"].map(s => (
                      <button type="button" key={s} onClick={() => setForm(f => ({ ...f, source: s }))}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${
                          form.source === s
                            ? "bg-[var(--raven)]/20 text-[var(--raven-glow)] border border-[var(--raven)]/30"
                            : "bg-white/5 text-[var(--muted)] border border-white/10 hover:bg-white/10"
                        }`}>{s}</button>
                    ))}
                  </div>
                </div>
              )}

              {(form.source === "generated" || scheduling === "gen_only") && (
                <div>
                  <label className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] block mb-2">Generation Prompt</label>
                  <textarea value={form.prompt} onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))} rows={3}
                    placeholder="Abstract nature art with vibrant colours, digital illustration style..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--raven)]/50 resize-none" />
                </div>
              )}

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] block mb-2">Frequency</label>
                  <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--raven)]/50">
                    {FREQUENCIES.map(f => <option key={f} value={f} className="capitalize">{f.charAt(0).toUpperCase()+f.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] block mb-2">Run Time (AEST)</label>
                  <input type="time" value={form.run_time} onChange={e => setForm(f => ({ ...f, run_time: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--raven)]/50" />
                </div>
                <div>
                  <label className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] block mb-2">Images per Run</label>
                  <input type="number" min={1} max={50} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--raven)]/50" />
                </div>
              </div>

              {form.frequency === "weekly" && (
                <div>
                  <label className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] block mb-2">Run Days</label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map(d => (
                      <button type="button" key={d}
                        onClick={() => setForm(f => ({
                          ...f, days: f.days.includes(d) ? f.days.filter(x=>x!==d) : [...f.days,d]
                        }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          form.days.includes(d)
                            ? "bg-[var(--raven)]/20 text-[var(--raven-glow)] border border-[var(--raven)]/30"
                            : "bg-white/5 text-[var(--muted)] border border-white/10 hover:bg-white/10"
                        }`}>{d}</button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 bg-[var(--raven)] hover:bg-[var(--raven-glow)] text-white rounded-xl text-sm font-semibold transition-all">
                  <Calendar className="w-4 h-4" /> Create Schedule
                </button>
                <button type="button" onClick={() => setCreating(false)}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-[var(--muted)] rounded-xl text-sm transition-all">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Schedule list */}
        {loading ? (
          <div className="text-center py-16 text-[var(--muted)]">Loading...</div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="w-12 h-12 text-[var(--raven)]/30 mx-auto mb-4" />
            <p className="text-[var(--muted)] mb-4">No schedules yet. Set one up to automate your pipeline.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {schedules.map(s => (
              <div key={s.id} className={`glass rounded-2xl p-5 flex items-center gap-4 ${!s.active ? "opacity-60" : ""}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  s.active ? "bg-[var(--raven)]/15 text-[var(--raven-glow)]" : "bg-white/5 text-[var(--subtle)]"
                }`}>
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{s.name}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="text-[10px] font-mono text-[var(--muted)]">{PLATFORMS[s.platform]?.name}</span>
                    <span className="text-[10px] font-mono text-[var(--subtle)]">·</span>
                    <span className="text-[10px] font-mono text-[var(--muted)] flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {s.frequency} @ {s.run_time}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--subtle)]">·</span>
                    <span className="text-[10px] font-mono text-[var(--muted)]">{s.source} · {s.quantity} images</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => toggle(s.id, !s.active)}
                    className={`transition-colors ${s.active ? "text-[var(--raven-glow)]" : "text-[var(--subtle)]"}`}
                    title={s.active ? "Pause" : "Resume"}>
                    {s.active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                  </button>
                  <button onClick={() => remove(s.id)}
                    className="w-8 h-8 rounded-lg hover:bg-red-500/10 text-[var(--subtle)] hover:text-red-400 transition-all flex items-center justify-center">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <ADGFooter />
    </div>
  );
}
