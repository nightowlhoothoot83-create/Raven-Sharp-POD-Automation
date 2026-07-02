@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
@import url('https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@400,500,700,800,900&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #080810;
  --surface: #0f0f1a;
  --surface-2: #15152a;
  --raven: #7c5cbf;
  --raven-glow: #a78bfa;
  --gold: #d4af37;
  --text: #f8f8f8;
  --muted: #a1a1aa;
  --subtle: #71717a;
  --border: rgba(255, 255, 255, 0.08);
  --border-strong: rgba(255, 255, 255, 0.18);
  --success: #10b981;
  --danger: #ef4444;
  --warning: #fbbf24;
}

* { box-sizing: border-box; }

html, body, #root {
  background: var(--bg);
  color: var(--text);
  font-family: 'Outfit', ui-sans-serif, system-ui, sans-serif;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

body {
  background-image:
    radial-gradient(at 20% -20%, rgba(124, 92, 191, 0.18), transparent 50%),
    radial-gradient(at 90% 10%, rgba(212, 175, 55, 0.08), transparent 45%),
    radial-gradient(at 50% 120%, rgba(124, 92, 191, 0.12), transparent 50%);
  background-attachment: fixed;
}

.font-display { font-family: 'Cabinet Grotesk', 'Outfit', sans-serif; letter-spacing: -0.02em; }
.font-mono { font-family: 'DM Mono', ui-monospace, monospace; }

/* Selection */
::selection { background: rgba(124, 92, 191, 0.4); color: #fff; }

/* Scrollbar */
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: rgba(124, 92, 191, 0.3); border-radius: 6px; }
::-webkit-scrollbar-thumb:hover { background: rgba(124, 92, 191, 0.6); }

/* Noise */
.noise-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  z-index: 1;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.glow-pulse {
  box-shadow: 0 0 0 0 rgba(124, 92, 191, 0.7);
  animation: glowpulse 2.2s infinite;
}
@keyframes glowpulse {
  0% { box-shadow: 0 0 0 0 rgba(124, 92, 191, 0.7); }
  70% { box-shadow: 0 0 0 14px rgba(124, 92, 191, 0); }
  100% { box-shadow: 0 0 0 0 rgba(124, 92, 191, 0); }
}

.fade-up { animation: fadeUp 0.6s ease-out both; }
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

.glass {
  background: rgba(15, 15, 26, 0.55);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid var(--border);
}

.card-hover {
  transition: border-color 0.3s, transform 0.3s, box-shadow 0.3s;
}
.card-hover:hover {
  border-color: rgba(124, 92, 191, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 12px 40px -12px rgba(124, 92, 191, 0.35);
}

.feather-mark {
  font-size: 1.1em;
  line-height: 1;
  background: linear-gradient(135deg, #a78bfa 0%, #d4af37 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  display: inline-block;
}

/* Dropzone */
.dropzone {
  border: 2px dashed rgba(124, 92, 191, 0.35);
  background: rgba(124, 92, 191, 0.04);
  transition: all 0.25s ease;
}
.dropzone:hover, .dropzone.is-dragging {
  border-color: var(--raven-glow);
  background: rgba(124, 92, 191, 0.1);
}

/* Progress bar */
.rs-progress-track {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 999px;
  overflow: hidden;
  height: 6px;
}
.rs-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #7c5cbf, #a78bfa, #d4af37);
  transition: width 0.3s ease;
}

/* Tier cards */
.tier-card-featured {
  border: 1px solid rgba(124, 92, 191, 0.5);
  box-shadow: 0 0 60px -20px rgba(124, 92, 191, 0.6);
  background: linear-gradient(180deg, rgba(124, 92, 191, 0.08) 0%, rgba(15, 15, 26, 0.6) 100%);
}
