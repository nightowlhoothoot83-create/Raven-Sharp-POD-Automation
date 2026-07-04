import React from "react";
import { Link } from "react-router-dom";

const BRANDS = [
  { name: "Mystical Moments",  logo: "/brands/mysticalMoments.png",  url: "#",                            desc: "Photography" },
  { name: "Zyia Creations",    logo: "/brands/zyiaCreations.png",     url: "#",                            desc: "Digital Art" },
  { name: "Spew Crew Kids",    logo: "/brands/spewCrew.png",          url: "https://youtube.com/@spewcrewkids", desc: "Kids Content" },
  { name: "Feed The Feed",     logo: "/brands/feedTheFeed.png",       url: "#",                            desc: "Social Media" },
  { name: "MyCalTools",        logo: "/brands/myCalTools.png",        url: "https://mycalctools.net",      desc: "Calculator Tools" },
  { name: "MyCalendarTools",   logo: "/brands/myCalendarTools.png",   url: "https://mycalendartools.net",  desc: "Calendar Tools" },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy",    to: "/legal/privacy" },
  { label: "Terms of Service",  to: "/legal/terms" },
  { label: "Cookie Policy",     to: "/legal/cookies" },
  { label: "Refund Policy",     to: "/legal/refunds" },
  { label: "Acceptable Use",    to: "/legal/acceptable-use" },
];

export default function ADGFooter() {
  return (
    <footer className="relative mt-24 border-t border-white/8 bg-[var(--surface)]">
      {/* ADG Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <div className="flex flex-col items-center mb-10">
          <img
            src="/brands/ascensionDigital.png"
            alt="Ascension Digital Group"
            className="h-10 object-contain mb-3 opacity-90"
          />
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-[var(--muted)]">
            Elevating Your Digital Future
          </p>
        </div>

        {/* Brand logos */}
        <div className="mb-10">
          <p className="text-center text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--subtle)] mb-6">
            Part of the Ascension Digital Group Ecosystem
          </p>
          <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-8">
            {BRANDS.map((brand) => (
              <a
                key={brand.name}
                href={brand.url}
                target={brand.url.startsWith("http") ? "_blank" : "_self"}
                rel="noopener noreferrer"
                aria-label={brand.url.startsWith("http") ? `${brand.name} (opens in new tab)` : brand.name}
                className="group flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition-all duration-300"
                title={brand.name}
              >
                <img
                  src={brand.logo}
                  alt={brand.name}
                  className="h-10 w-10 object-contain rounded-lg group-hover:scale-110 transition-transform duration-300"
                />
                <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--subtle)] group-hover:text-[var(--muted)]">
                  {brand.name}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/5 my-8" />

        {/* Links grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10 text-sm">
          <div>
            <h4 className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] mb-3">Tools</h4>
            <ul className="space-y-2">
              <li><Link to="/" className="text-[var(--subtle)] hover:text-[var(--text)] transition-colors">POD Suite</Link></li>
              <li><a href="https://ascensiondigitalgroup.com/optimiser" className="text-[var(--subtle)] hover:text-[var(--text)] transition-colors">Image Optimiser</a></li>
              <li><Link to="/pricing" className="text-[var(--subtle)] hover:text-[var(--text)] transition-colors">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] mb-3">Account</h4>
            <ul className="space-y-2">
              <li><Link to="/login" className="text-[var(--subtle)] hover:text-[var(--text)] transition-colors">Sign In</Link></li>
              <li><Link to="/register" className="text-[var(--subtle)] hover:text-[var(--text)] transition-colors">Sign Up</Link></li>
              <li><Link to="/account" className="text-[var(--subtle)] hover:text-[var(--text)] transition-colors">My Account</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] mb-3">Company</h4>
            <ul className="space-y-2">
              <li><a href="https://ascensiondigitalgroup.com" className="text-[var(--subtle)] hover:text-[var(--text)] transition-colors">Ascension Digital</a></li>
              <li><a href="mailto:ascensiondigitalagency@outlook.com" className="text-[var(--subtle)] hover:text-[var(--text)] transition-colors">Contact Us</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] mb-3">Legal</h4>
            <ul className="space-y-2">
              {LEGAL_LINKS.map(l => (
                <li key={l.to}>
                  <Link to={l.to} className="text-[var(--subtle)] hover:text-[var(--text)] transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--subtle)]">
          <div className="flex items-center gap-3">
            <img src="/brands/ravenSharpLogo.png" alt="Raven Sharp" className="h-6 w-6 object-contain opacity-60" />
            <span>Raven Sharp POD Suite — Part of Ascension Digital Group</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center">
            <span>© {new Date().getFullYear()} Ascension Digital Group. All rights reserved.</span>
            <span className="hidden sm:block">·</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
