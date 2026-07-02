import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard, Sparkles, Wand2, Calendar,
  Settings, LogOut, Menu, X, ChevronDown, Zap
} from "lucide-react";

export default function TopNav() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (path) => location.pathname === path;
  const displayName = typeof user?.name === "string" && user.name.trim() ? user.name.trim() : "";
  const displayEmail = typeof user?.email === "string" ? user.email : "";
  const displayTier = typeof user?.tier === "string" && user.tier ? user.tier : "free";

  const NAV_LINKS = user ? [
    { to: "/dashboard",   icon: <LayoutDashboard className="w-4 h-4" />, label: "Dashboard" },
    { to: "/pipeline",    icon: <Zap className="w-4 h-4" />,             label: "Pipeline" },
    { to: "/image-gen",   icon: <Wand2 className="w-4 h-4" />,           label: "Image Gen" },
    { to: "/schedules",   icon: <Calendar className="w-4 h-4" />,        label: "Schedules" },
    { to: "/review",      icon: <Sparkles className="w-4 h-4" />,        label: "Review Queue" },
  ] : [];

  const TIER_COLORS = {
    free: "text-[var(--muted)]",
    creator: "text-[var(--raven-glow)]",
    pro: "text-[var(--gold)]",
    agency: "text-emerald-400",
    owner: "text-red-400",
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? "bg-[var(--bg)]/95 backdrop-blur-xl border-b border-white/8" : "bg-transparent"
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/brands/ravenSharpLogo.png"
              alt="Raven Sharp"
              className="w-9 h-9 object-contain group-hover:scale-105 transition-transform drop-shadow-[0_0_8px_rgba(124,92,191,0.4)]"
            />
            <div className="hidden sm:block">
              <div className="font-display text-lg font-black tracking-tight leading-none">
                RAVEN <span className="text-[var(--raven-glow)]">SHARP</span>
              </div>
              <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-[var(--subtle)]">
                POD Suite
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          {user && (
            <div className="hidden lg:flex items-center gap-1">
              {NAV_LINKS.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive(link.to)
                      ? "bg-[var(--raven)]/20 text-[var(--raven-glow)] border border-[var(--raven)]/30"
                      : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/5"
                  }`}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                >
                  <div className="w-7 h-7 rounded-full bg-[var(--raven)]/30 border border-[var(--raven)]/40 flex items-center justify-center text-xs font-bold text-[var(--raven-glow)]">
                    {displayName[0]?.toUpperCase() || displayEmail[0]?.toUpperCase() || "A"}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-xs font-medium text-[var(--text)] leading-none">
                      {displayName.split(/\s+/)[0] || "Account"}
                    </div>
                    <div className={`text-[10px] font-mono uppercase tracking-wider leading-none mt-0.5 ${TIER_COLORS[displayTier] || ""}`}>
                      {displayTier}
                    </div>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-[var(--muted)] transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-[var(--surface)] border border-white/10 shadow-2xl overflow-hidden z-50">
                    <Link to="/account" onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)] transition-colors">
                      <Settings className="w-4 h-4" /> Account Settings
                    </Link>
                    <Link to="/pricing" onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)] transition-colors">
                      <Sparkles className="w-4 h-4" /> Upgrade Plan
                    </Link>
                    <div className="border-t border-white/5" />
                    <button
                      onClick={async () => { await logout(); navigate("/"); setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login"
                  className="px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">
                  Sign In
                </Link>
                <Link to="/register"
                  className="px-4 py-2 text-sm font-semibold bg-[var(--raven)] hover:bg-[var(--raven-glow)] text-white rounded-lg transition-all">
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            {user && (
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-[var(--muted)]"
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && user && (
          <div className="lg:hidden border-t border-white/8 py-3">
            {NAV_LINKS.map(link => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                  isActive(link.to)
                    ? "text-[var(--raven-glow)] bg-[var(--raven)]/10"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                {link.icon} {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
