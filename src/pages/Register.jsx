import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { toast.error("Passwords don't match"); return; }
    if (form.password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      await register(form.email, form.password, form.name);
      navigate("/dashboard");
      toast.success("Welcome to Raven Sharp!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/brands/ravenSharpLogo.png" alt="Raven Sharp" className="w-20 h-20 object-contain mx-auto mb-4 drop-shadow-[0_0_20px_rgba(124,92,191,0.4)]" />
          <h1 className="font-display text-3xl font-black tracking-tight">Create your account</h1>
          <p className="text-[var(--muted)] text-sm mt-1">Free to start — no credit card required</p>
        </div>
        <div className="glass rounded-2xl p-8">
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] block mb-2">Full Name</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--raven)]/50"
                placeholder="Your name" required />
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] block mb-2">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--raven)]/50"
                placeholder="you@example.com" required />
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] block mb-2">Password</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--raven)]/50"
                placeholder="Min. 8 characters" required />
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] block mb-2">Confirm Password</label>
              <input type="password" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--raven)]/50"
                placeholder="••••••••" required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-[var(--raven)] to-[var(--raven-blue)] hover:brightness-110 shadow-[0_4px_16px_rgba(124,92,191,0.35)] hover:shadow-[0_6px_24px_rgba(124,92,191,0.5)] text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50 glow-pulse">
              {loading ? "Creating account..." : "Create Free Account"}
            </button>
          </form>
          <p className="text-center text-[10px] text-[var(--subtle)] mt-5">
            By signing up you agree to our{" "}
            <Link to="/legal/terms" className="text-[var(--raven-glow)] hover:underline">Terms of Service</Link>
            {" "}and{" "}
            <Link to="/legal/privacy" className="text-[var(--raven-glow)] hover:underline">Privacy Policy</Link>
          </p>
          <p className="text-center text-xs text-[var(--muted)] mt-4">
            Already have an account?{" "}
            <Link to="/login" className="text-[var(--raven-glow)] hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
