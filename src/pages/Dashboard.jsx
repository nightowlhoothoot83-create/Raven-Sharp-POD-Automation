import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import ADGFooter from "../components/ADGFooter";
import { Zap, Wand2, Calendar, Clock, ChevronRight, Plus, Check, AlertTriangle } from "lucide-react";

const TIER_LIMITS = {
  free:    { pipeline_runs: 3,   images_per_run: 1,  ai_gen_credits: 5 },
  creator: { pipeline_runs: 20,  images_per_run: 10, ai_gen_credits: 30 },
  pro:     { pipeline_runs: 50,  images_per_run: 25, ai_gen_credits: 100 },
  agency:  { pipeline_runs: 80,  images_per_run: 40, ai_gen_credits: 250 },
  owner:   { pipeline_runs: 9999, images_per_run: 9999, ai_gen_credits: 9999 },
};

function UsageBar({ used, max, label, color = "var(--raven)" }) {
  const pct = max >= 9999 ? 0 : Math.min((used / max) * 100, 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-[var(--muted)]">{label}</span>
        <span className="font-mono text-[var(--text)]">
          {max >= 9999 ? "∞" : `${used} / ${max}`}
        </span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${max >= 9999 ? 20 : pct}%`, background: `linear-gradient(90deg, ${color}, ${color}aa)` }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/pipeline/runs")
      .then(({ data }) => {
        setRuns(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Failed to load pipeline runs:", err);
        setRuns([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const tier = user?.tier || "free";
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
  const runsUsed = user?.pipeline_runs_used || 0;
  const genUsed  = user?.ai_gen_credits_used || 0;

  const TIER_COLORS = { free:"var(--muted)", creator:"var(--raven-glow)", pro:"var(--gold)", agency:"#34d399", owner:"#f87171" };

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Welcome */}
        <div className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-[var(--gold)]">Dashboard</span>
            <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter mt-1">
              Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
            </h1>
          </div>
          <Link to="/pipeline"
            className="flex items-center gap-2 px-6 py-3 bg-[var(--raven)] hover:bg-[var(--raven-glow)] text-white rounded-xl text-sm font-semibold transition-all glow-pulse self-start">
            <Plus className="w-4 h-4" /> New Pipeline Run
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Tier",         value: tier.toUpperCase(), sub: "current plan", color: TIER_COLORS[tier] },
            { label: "Runs Used",    value: limits.pipeline_runs >= 9999 ? "∞" : `${runsUsed}/${limits.pipeline_runs}`, sub: "this month", color: "var(--raven-glow)" },
            { label: "AI Credits",   value: limits.ai_gen_credits >= 9999 ? "∞" : `${genUsed}/${limits.ai_gen_credits}`, sub: "image gen", color: "var(--gold)" },
            { label: "Total Runs",   value: runs.length, sub: "all time", color: "#34d399" },
          ].map(stat => (
            <div key={stat.label} className="glass rounded-2xl p-5">
              <div className="font-display text-2xl font-black" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-sm font-medium mt-1">{stat.label}</div>
              <div className="text-xs text-[var(--subtle)] mt-0.5">{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Usage */}
        <div className="glass rounded-2xl p-6 mb-8">
          <h2 className="font-display text-lg font-bold mb-5">Monthly Usage</h2>
          <div className="space-y-4">
            <UsageBar used={runsUsed} max={limits.pipeline_runs} label="Pipeline Runs" />
            <UsageBar used={genUsed} max={limits.ai_gen_credits} label="AI Gen Credits" color="var(--gold)" />
          </div>
          {tier !== "owner" && runsUsed >= limits.pipeline_runs * 0.8 && (
            <div className="mt-4 flex items-center gap-2 text-xs text-amber-400 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              You're approaching your monthly limit.{" "}
              <Link to="/pricing" className="underline hover:text-amber-300">Upgrade to continue</Link>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {[
            { to:"/pipeline",  icon:<Zap className="w-5 h-5" />,      title:"New Pipeline Run",  desc:"Upload art → push to platform" },
            { to:"/image-gen", icon:<Wand2 className="w-5 h-5" />,    title:"Generate Images",   desc:"AI art → review → pipeline" },
            { to:"/schedules", icon:<Calendar className="w-5 h-5" />, title:"Manage Schedules",  desc:"Automate your pipeline runs" },
          ].map(action => (
            <Link key={action.to} to={action.to}
              className="glass rounded-2xl p-5 hover:border-[var(--raven)]/40 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-[var(--raven)]/15 border border-[var(--raven)]/20 flex items-center justify-center text-[var(--raven-glow)] mb-4 group-hover:bg-[var(--raven)]/25 transition-colors">
                {action.icon}
              </div>
              <h3 className="font-display font-bold text-base mb-1">{action.title}</h3>
              <p className="text-xs text-[var(--muted)]">{action.desc}</p>
              <div className="mt-3 flex items-center gap-1 text-xs text-[var(--raven-glow)] opacity-0 group-hover:opacity-100 transition-opacity">
                Open <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          ))}
        </div>

        {/* Recent runs */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
            <h2 className="font-display text-lg font-bold">Recent Pipeline Runs</h2>
            <Link to="/pipeline" className="text-xs text-[var(--raven-glow)] hover:underline flex items-center gap-1">
              New run <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {loading ? (
            <div className="p-8 text-center text-[var(--muted)] text-sm">Loading...</div>
          ) : runs.length === 0 ? (
            <div className="p-12 text-center">
              <Zap className="w-10 h-10 text-[var(--raven)]/40 mx-auto mb-3" />
              <p className="text-[var(--muted)] mb-4">No pipeline runs yet.</p>
              <Link to="/pipeline"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--raven)] hover:bg-[var(--raven-glow)] text-white rounded-xl text-sm font-semibold transition-all">
                <Plus className="w-4 h-4" /> Start your first run
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {runs.slice(0, 10).map(run => (
                <Link key={run.id}
                  to={["in_progress", "processing"].includes(run.status) ? `/pipeline/${run.id}` : `/review/${run.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-white/3 transition-colors group">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    run.status === "completed" ? "bg-emerald-500/15 text-emerald-400"
                      : run.status === "pending_review" ? "bg-amber-500/15 text-amber-400"
                      : "bg-white/10 text-[var(--muted)]"
                  }`}>
                    {run.status === "completed" ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium capitalize">{run.platform} · {run.total_count} image{run.total_count !== 1 ? "s" : ""}</div>
                    <div className="text-xs text-[var(--muted)]">
                      {new Date(run.created_at).toLocaleDateString("en-AU", { day:"numeric", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      run.status === "completed" ? "bg-emerald-500/10 text-emerald-400"
                        : run.status === "in_progress" ? "bg-sky-500/10 text-sky-400"
                        : "bg-amber-500/10 text-amber-400"
                    }`}>
                      {run.status === "completed" ? "Published"
                        : run.status === "in_progress" ? `Resume · ${(run.results || []).length}/${run.total_count}`
                        : "Review"}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[var(--subtle)] group-hover:text-[var(--muted)] transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <ADGFooter />
    </div>
  );
}
