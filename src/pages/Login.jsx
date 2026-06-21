import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/brands/ravenSharpLogo.png" alt="Raven Sharp" className="w-20 h-20 object-contain mx-auto mb-4 drop-shadow-[0_0_20px_rgba(124,92,191,0.4)]" />
          <h1 className="font-display text-3xl font-black tracking-tight">Welcome back</h1>
          <p className="text-[var(--muted)] text-sm mt-1">Sign in to your Raven Sharp account</p>
        </div>
        <div className="glass rounded-2xl p-8">
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] block mb-2">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--raven)]/50 transition-colors"
                placeholder="you@example.com" required />
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] block mb-2">Password</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--raven)]/50 transition-colors"
                placeholder="••••••••" required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full h-12 bg-[var(--raven)] hover:bg-[var(--raven-glow)] text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50">
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          <p className="text-center text-xs text-[var(--muted)] mt-6">
            Don't have an account?{" "}
            <Link to="/register" className="text-[var(--raven-glow)] hover:underline">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
