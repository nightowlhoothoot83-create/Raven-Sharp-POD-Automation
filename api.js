import React from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { Logo, AscensionMark } from "./Logo";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { LayoutDashboard, Sparkles, Image as ImageIcon, Wand2, FileText, CreditCard, LogOut, User as UserIcon } from "lucide-react";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, key: "nav-dashboard" },
  { to: "/pod-suite", label: "POD Suite", icon: Sparkles, key: "nav-pod" },
  { to: "/image-gen", label: "AI Image Gen", icon: Wand2, key: "nav-imgen" },
  { to: "/optimiser", label: "Optimiser", icon: ImageIcon, key: "nav-optimiser" },
  { to: "/content", label: "Content Engine", icon: FileText, key: "nav-content" },
  { to: "/pricing", label: "Pricing", icon: CreditCard, key: "nav-pricing" },
];

export const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const isLanding = location.pathname === "/";

  return (
    <div className="min-h-screen flex flex-col">
      <div className="noise-overlay" />
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[rgba(8,8,16,0.72)] border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link to={user ? "/dashboard" : "/"} data-testid="header-logo-link">
            <Logo />
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {user && NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                data-testid={n.key}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                    isActive ? "text-white bg-white/5" : "text-[var(--muted)] hover:text-white hover:bg-white/5"
                  }`
                }
              >
                <n.icon className="w-3.5 h-3.5" />
                {n.label}
              </NavLink>
            ))}
            {!user && !isLanding && (
              <Link to="/pricing" className="px-3 py-1.5 text-sm text-[var(--muted)] hover:text-white" data-testid="nav-pricing-guest">Pricing</Link>
            )}
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="hidden sm:inline text-xs font-mono uppercase tracking-widest px-2.5 py-1 rounded-full border border-[var(--raven)]/40 bg-[var(--raven)]/10 text-[var(--raven-glow)]" data-testid="user-tier-badge">
                  {user.tier}
                </span>
                <Button variant="ghost" size="sm" onClick={() => navigate("/account")} data-testid="header-account-btn">
                  <UserIcon className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={async () => { await logout(); navigate("/"); }} data-testid="header-logout-btn">
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button
                onClick={handleLogin}
                data-testid="header-login-btn"
                className="bg-[var(--raven)] hover:bg-[var(--raven-glow)] text-white"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 relative z-10">{children}</main>
      <footer className="relative z-10 border-t border-[var(--border)] mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="text-xs text-[var(--subtle)] font-mono uppercase tracking-widest hidden sm:inline">Creator Tools Suite</span>
          </div>
          <AscensionMark />
        </div>
      </footer>
    </div>
  );
};

export default Layout;
