import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import ADGFooter from "../components/ADGFooter";
import HowToGuide from "../components/HowToGuide";
import { Zap, Wand2, Calendar, Clock, ChevronRight, Plus, Check } from "lucide-react";

const TIER_LIMITS = {
  free:    { pipeline_runs: 3,   images_per_run: 3,  ai_gen_credits: 5 },
  creator: { pipeline_runs: 20,  images_per_run: 10, ai_gen_credits: 30 },
  pro:     { pipeline_runs: 50,  images_per_run: 25, ai_gen_credits: 100 },
  agency:  { pipeline_runs: 80,  images_per_run: 40, ai_gen_credits: 250 },
  owner:   { pipeline_runs: 9999, images_per_run: 9999, ai_gen_credits: 9999 },
};

function cleanRuns(data) {
  return Array.isArray(data) ? data.filter(run => run && typeof run === "object") : [];
}

function firstName(value) {
  return typeof value === "string" && value.trim() ? value.trim().split(/\s+/)[0] : "";
}

function cleanTier(value) {
  return typeof value === "string" && value.trim() ? value.trim().toLowerCase() : "free";
}

function runStatus(run) {
  return typeof run?.status === "string" && run.status ? run.status : "processing";
}

function runPlatform(run) {
  return typeof run?.platform === "string" && run.platform ? run.platform : "pipeline";
}

function runTotal(run) {
  const total = Number(run?.total_count);
  if (Number.isFinite(total) && total >= 0) return total;
  return Array.isArray(run?.results) ? run.results.length : 0;
}

function runResultCount(run) {
  return Array.isArray(run?.results) ? run.results.length : 0;
}

function runDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en-AU", { day:"numeric", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });
}

export default function Dashboard() {
  const { user } = useAuth();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/pipeline/runs")
      .then(({ data }) => {
        setRuns(cleanRuns(data));
      })
      .catch((err) => {
        console.error("Failed to load pipeline runs:", err);
        setRuns([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const tier = cleanTier(user?.tier);
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
  const runsUsed = Number.isFinite(Number(user?.pipeline_runs_used)) ? Number(user?.pipeline_runs_used) : 0;

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        <HowToGuide />

        {/* Welcome */}
        <div className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-[var(--gold)]">Dashboard</span>
            <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter mt-1">
              Welcome back{firstName(user?.name) ? `, ${firstName(user.name)}` : ""}
            </h1>
          </div>
          <Link to="/pipeline"
            className="flex items-center gap-2 px-6 py-3 bg-[var(--raven)] hover:bg-[var(--raven-glow)] text-white rounded-xl text-sm font-semibold transition-all glow-pulse self-start">
            <Plus className="w-4 h-4" /> New Pipeline Run
          </Link>
        </div>

        {/* Account & usage stats moved to /account to keep this page focused
            on "what do I do next" rather than duplicating account details. */}
        <div className="glass rounded-2xl p-5 mb-8 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">{tier.toUpperCase()} plan</div>
            <div className="text-xs text-[var(--subtle)] mt-0.5">
              {limits.pipeline_runs >= 9999 ? "Unlimited runs" : `${runsUsed}/${limits.pipeline_runs} runs used this month`}
            </div>
          </div>
          <Link to="/account" className="flex items-center gap-1.5 text-xs text-[var(--raven-glow)] hover:underline shrink-0">
            View account &amp; usage <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Quick actions */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {[
            { to:"/image-gen", icon:<Wand2 className="w-5 h-5" />,    title:"Generate Images",   desc:"AI art → review → pipeline" },
            { to:"/pipeline",  icon:<Zap className="w-5 h-5" />,      title:"New Pipeline Run",  desc:"Upload art → push to platform" },
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
              {runs.slice(0, 10).map((run, index) => {
                const id = run?.id || run?._id || `saved-run-${index}`;
                const status = runStatus(run);
                const total = runTotal(run);
                const canResume = ["in_progress", "processing"].includes(status);
                const hasFailed = run?.results?.some(r => r.status === "failed" || r.error);
                const allFailed = run?.results?.length > 0 && run.results.every(r => r.status === "failed" || r.error);

                return (
                <Link key={id}
                  to={canResume && run?.id ? `/pipeline/${run.id}` : run?.id ? `/review/${run.id}` : "/pipeline"}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-white/3 transition-colors group">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    status === "completed" ? "bg-emerald-500/15 text-emerald-400"
                      : status === "pending_review" ? "bg-amber-500/15 text-amber-400"
                      : "bg-white/10 text-[var(--muted)]"
                  }`}>
                    {status === "completed" ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium capitalize">{runPlatform(run)} · {total} image{total !== 1 ? "s" : ""}</div>
                    <div className="text-xs text-[var(--muted)]">
                      {runDate(run?.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      status === "completed" ? "bg-emerald-500/10 text-emerald-400"
                        : canResume ? "bg-sky-500/10 text-sky-400"
                        : allFailed ? "bg-red-500/10 text-red-400"
                        : hasFailed ? "bg-amber-500/10 text-amber-400"
                        : "bg-amber-500/10 text-amber-400"
                    }`}>
                      {status === "completed" ? "Published"
                        : canResume ? `Resume · ${runResultCount(run)}/${total}`
                        : allFailed ? "Failed — Try Again"
                        : hasFailed ? `Partial — ${run.results.filter(r => !r.error && r.status !== "failed").length}/${total} OK`
                        : "Review"}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[var(--subtle)] group-hover:text-[var(--muted)] transition-colors" />
                  </div>
                </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <ADGFooter />
    </div>
  );
}
