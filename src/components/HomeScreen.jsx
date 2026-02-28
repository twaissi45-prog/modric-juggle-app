// ============================================
// HomeScreen — Hero Landing with Luka Modrić
// Soccer Juggle Game — Premium sports-tech design
// ============================================

import { useState, useEffect, useRef, useMemo } from 'react';
import Football3D from './three/Football3D';
import { AVATARS, COUNTRIES, getRankTitle, getLevel } from '../store/playerProfile';
import soundEngine from '../engine/sounds';

// Gold sparkle particle component
function Sparkle({ delay, left, size }) {
  return (
    <div
      className="absolute pointer-events-none rounded-full"
      style={{
        left: `${left}%`,
        bottom: '25%',
        width: `${size}px`,
        height: `${size}px`,
        background: 'radial-gradient(circle, rgba(212,175,55,0.9) 0%, rgba(245,230,163,0.4) 40%, transparent 70%)',
        animation: `sparkle-drift ${2.5 + Math.random() * 2}s ease-out ${delay}s infinite`,
      }}
    />
  );
}

export default function HomeScreen({ onNavigate, profile }) {
  const [visible, setVisible] = useState(false);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Sparkle particles (generated once)
  const sparkles = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      delay: i * 0.4 + Math.random() * 0.5,
      left: 30 + Math.random() * 40,
      size: 2 + Math.random() * 4,
    })), []);

  // Parallax on mouse/touch move
  const handlePointerMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = ((clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((clientY - rect.top) / rect.height - 0.5) * 2;
    setMousePos({ x, y });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handlePointerMove}
      onTouchMove={handlePointerMove}
      className="relative w-full h-full bg-navy overflow-hidden select-none"
    >
      {/* ====== LAYERED BACKGROUND ====== */}
      <div className="pointer-events-none absolute inset-0">
        {/* Deep gold glow — hero backlight */}
        <div
          className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[140px]"
          style={{
            background: 'radial-gradient(circle, rgba(212,175,55,0.09) 0%, transparent 65%)',
            animation: 'hero-glow-pulse 6s ease-in-out infinite',
          }}
        />
        {/* Electric accent glow at bottom */}
        <div
          className="absolute bottom-[-8%] left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full blur-[90px]"
          style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.05) 0%, transparent 70%)' }}
        />
        {/* Subtle pitch-line texture */}
        <div
          className="absolute inset-0 opacity-[0.012]"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 50px, rgba(212,175,55,1) 50px, rgba(212,175,55,1) 51px)',
          }}
        />
      </div>

      {/* ====== HERO IMAGE — LUKA MODRIĆ ====== */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          opacity: heroLoaded && visible ? 1 : 0,
          transition: 'opacity 1s ease-out',
          paddingTop: '12vh',
        }}
      >
        {/* Gold rim-light ring behind Modrić */}
        <div
          className="absolute bottom-[20%] left-1/2 w-[280px] h-[280px] rounded-full pointer-events-none"
          style={{
            background: 'conic-gradient(from 0deg, rgba(212,175,55,0.0), rgba(212,175,55,0.25), rgba(245,230,163,0.1), rgba(212,175,55,0.3), rgba(212,175,55,0.0))',
            animation: 'hero-rim-light 8s linear infinite',
            filter: 'blur(25px)',
          }}
        />

        {/* Modrić image — breathing + parallax */}
        <img
          src="/assets/modric-hero.png"
          alt="Luka Modrić"
          onLoad={() => setHeroLoaded(true)}
          className="relative z-10 w-auto pointer-events-none max-sm:scale-[1.3] max-sm:translate-y-[-5%]"
          style={{
            maxHeight: '68vh',
            minHeight: '320px',
            objectFit: 'contain',
            animation: 'hero-breathe 5s ease-in-out infinite',
            transform: `translateX(${mousePos.x * -4}px)`,
            transition: 'transform 0.3s ease-out',
            maskImage: 'linear-gradient(to bottom, black 50%, transparent 95%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 95%)',
          }}
        />

        {/* Gold sweep light across Modrić */}
        <div
          className="absolute bottom-[10%] w-[3px] h-[50%] pointer-events-none z-20"
          style={{
            background: 'linear-gradient(to bottom, transparent, rgba(212,175,55,0.2), transparent)',
            animation: 'gold-sweep 4s ease-in-out 2s infinite',
            filter: 'blur(8px)',
          }}
        />

        {/* Sparkle particles rising from base */}
        {sparkles.map(s => (
          <Sparkle key={s.id} delay={s.delay} left={s.left} size={s.size} />
        ))}
      </div>

      {/* ====== CONTENT OVERLAY ====== */}
      <div className="relative z-20 flex flex-col h-full">

        {/* --- PLAYER PROFILE BADGE (top-right) --- */}
        {profile && profile.playerName && (
          <button
            onClick={() => onNavigate('profile')}
            className="absolute top-3 right-3 z-50 flex items-center gap-2 pl-1 pr-3 py-1 rounded-full cursor-pointer
              bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-gold/30
              active:scale-95 transition-all duration-200"
            style={{
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
              style={{
                background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
                border: '1.5px solid rgba(212,175,55,0.3)',
              }}
            >
              {AVATARS[profile.avatarId]?.emoji || '⚽'}
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[10px] text-white/80 font-semibold leading-tight">
                {profile.playerName}
              </span>
              <span className="text-[8px] leading-tight font-medium" style={{ color: getRankTitle(profile.stats).color }}>
                {getRankTitle(profile.stats).title} · Lv.{getLevel(profile.stats).level}
              </span>
            </div>
          </button>
        )}

        {/* --- TOP: Title Block --- */}
        <div
          className="flex flex-col items-center pt-5 sm:pt-8 px-4 transition-all duration-700 ease-out"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(-20px)',
          }}
        >
          {/* Sponsor badge */}
          <div
            className="flex items-center gap-2 mb-2 px-4 py-1 rounded-full"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.06), transparent)',
              border: '1px solid rgba(212,175,55,0.1)',
            }}
          >
            <div className="w-1 h-1 rounded-full bg-gold" style={{ animation: 'badge-pulse 3s ease-in-out infinite' }} />
            <span className="text-[9px] sm:text-[10px] text-gold/70 uppercase tracking-[0.2em] font-semibold">
              Sponsored by Luka Modri&#263;
            </span>
            <div className="w-1 h-1 rounded-full bg-gold" style={{ animation: 'badge-pulse 3s ease-in-out 1.5s infinite' }} />
          </div>

          {/* Main title with football icons */}
          <div className="flex items-center gap-2 sm:gap-3 mb-1">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gold/70 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <path d="M12 2a10 10 0 0 1 0 20 10 10 0 0 1 0-20zm0 2l2 3h3.5l1 3-2.5 2.5 1 3.5-3 1-2 3-2-3-3-1 1-3.5L4.5 10l1-3H9l2-3z" opacity="0.3" />
            </svg>
            <h1
              className="text-[28px] sm:text-4xl md:text-5xl font-black tracking-tight text-center leading-[1.05]"
              style={{
                background: 'linear-gradient(105deg, #D4AF37 0%, #F5E6A3 35%, #D4AF37 55%, #8B7425 100%)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'shimmer 4s linear infinite',
              }}
            >
              JUGGLE<br />CHALLENGE
            </h1>
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gold/70 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <path d="M12 2a10 10 0 0 1 0 20 10 10 0 0 1 0-20zm0 2l2 3h3.5l1 3-2.5 2.5 1 3.5-3 1-2 3-2-3-3-1 1-3.5L4.5 10l1-3H9l2-3z" opacity="0.3" />
            </svg>
          </div>

          <p className="text-[10px] sm:text-xs text-white/35 tracking-[0.25em] uppercase font-medium">
            AI-Verified Football Juggling
          </p>
        </div>

        {/* --- SPACER --- */}
        <div className="flex-1" />

        {/* --- 3D FOOTBALLS — floating with parallax --- */}

        {/* Main football — right side, JUGGLING with glow ring */}
        <div
          className="absolute right-2 sm:right-6 top-[24%] sm:top-[20%] z-30"
          style={{
            transform: `translate(${mousePos.x * 10}px, ${mousePos.y * 6}px)`,
            transition: 'transform 0.3s ease-out',
          }}
        >
          <Football3D size={130} interactive glow spin juggle />
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-20 h-3 rounded-full bg-gold/20 blur-lg" />
        </div>

        {/* Secondary football — left side, also juggling at different rhythm */}
        <div
          className="absolute left-0 sm:left-3 top-[38%] sm:top-[34%] z-30"
          style={{
            transform: `translate(${mousePos.x * -8}px, ${mousePos.y * 5}px)`,
            transition: 'transform 0.3s ease-out',
          }}
        >
          <Football3D size={65} spin glow bounce />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-10 h-1.5 rounded-full bg-gold/10 blur-md" />
        </div>

        {/* Tiny football — upper area accent */}
        <div
          className="absolute left-[14%] top-[20%] z-30 opacity-50"
          style={{
            animation: 'float 5s ease-in-out 0.5s infinite',
          }}
        >
          <Football3D size={32} spin glow={false} bounce />
        </div>

        {/* --- BOTTOM: Glass Card with Actions --- */}
        <div
          className="relative z-30 px-4 sm:px-5 pb-4 sm:pb-6 transition-all duration-700 ease-out"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(50px)',
            transitionDelay: '0.3s',
          }}
        >
          <div
            className="w-full max-w-md mx-auto rounded-2xl p-4 sm:p-5"
            style={{
              background: 'linear-gradient(145deg, rgba(26,26,46,0.88), rgba(12,12,30,0.96))',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(212,175,55,0.15)',
              boxShadow: '0 -20px 60px rgba(0,0,0,0.5), 0 0 50px rgba(212,175,55,0.04), inset 0 1px 0 rgba(255,255,255,0.03)',
            }}
          >
            {/* Score teaser */}
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/20" />
              <span className="text-[10px] text-gold/50 uppercase tracking-[0.2em] font-bold">
                Can you beat the record?
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/20" />
            </div>

            {/* Primary action buttons */}
            <div className="flex gap-3 mb-3">
              <button
                onClick={() => { soundEngine.playClick(); onNavigate('practice'); }}
                className="flex-1 py-3.5 rounded-xl font-bold text-sm sm:text-base tracking-wide text-black
                  bg-gradient-to-r from-[#8B7425] via-[#D4AF37] to-[#F5E6A3]
                  shadow-[0_0_25px_rgba(212,175,55,0.35)]
                  hover:shadow-[0_0_40px_rgba(212,175,55,0.55)]
                  active:scale-[0.96] transition-all duration-200 cursor-pointer
                  flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Practice
              </button>

              <button
                onClick={() => { soundEngine.playClick(); onNavigate('ranked'); }}
                className="flex-1 py-3.5 rounded-xl font-bold text-sm sm:text-base tracking-wide text-gold
                  border-2 border-gold/50 bg-gold/[0.06]
                  hover:bg-gold/[0.14] hover:border-gold/80
                  active:scale-[0.96] transition-all duration-200 cursor-pointer
                  flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
                  <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
                  <path d="M4 22h16" />
                  <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
                  <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
                  <path d="M18 2H6v7a6 6 0 0012 0V2z" />
                </svg>
                Ranked
              </button>
            </div>

            {/* Secondary nav */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Leaderboard', screen: 'leaderboard', icon: leaderboardIcon },
                { label: 'Daily Drill', screen: 'dailyDrill', icon: dailyDrillIcon },
                { label: 'How It Works', screen: 'howItWorks', icon: howItWorksIcon },
              ].map(({ label, screen, icon }) => (
                <button
                  key={screen}
                  onClick={() => { soundEngine.playClick(); onNavigate(screen); }}
                  className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl
                    bg-white/[0.03] border border-white/[0.05]
                    hover:bg-white/[0.07] hover:border-gold/25
                    active:scale-[0.94] transition-all duration-200 cursor-pointer"
                >
                  <span className="text-electric/60 w-4 h-4">{icon}</span>
                  <span className="text-[9px] sm:text-[10px] text-white/45 font-medium leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="text-[9px] text-white/12 tracking-wider text-center mt-2.5">
            Available on iOS &amp; Android
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---- Inline SVG icons ---- */

const leaderboardIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <rect x="4" y="12" width="4" height="8" rx="1" />
    <rect x="10" y="6" width="4" height="14" rx="1" />
    <rect x="16" y="9" width="4" height="11" rx="1" />
  </svg>
);

const dailyDrillIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 7 12 12 15 15" />
  </svg>
);

const howItWorksIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c0 .8-.5 1.2-1 1.7" />
    <circle cx="12" cy="17" r="0.5" fill="currentColor" />
  </svg>
);
