// ============================================
// HomeScreen — Video Hero Landing
// Cinematic video background + 3D footballs + game UI
// ============================================

import { useState, useEffect, useRef, useMemo } from 'react';
import Football3D from './three/Football3D';
import { AVATARS, getRankTitle, getLevel } from '../store/playerProfile';
import soundEngine from '../engine/sounds';

// Floating gold particle
function Sparkle({ delay, left, size }) {
  return (
    <div className="absolute pointer-events-none rounded-full" style={{
      left: `${left}%`, bottom: '30%',
      width: `${size}px`, height: `${size}px`,
      background: 'radial-gradient(circle, rgba(212,175,55,0.9) 0%, rgba(245,230,163,0.4) 40%, transparent 70%)',
      animation: `sparkle-drift ${2.5 + Math.random() * 2}s ease-out ${delay}s infinite`,
    }} />
  );
}

export default function HomeScreen({ onNavigate, profile }) {
  const [visible, setVisible] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [videoReady, setVideoReady] = useState(false);
  const containerRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Auto-play video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => {
      const tryPlay = () => {
        video.play().catch(() => {});
        window.removeEventListener('click', tryPlay);
        window.removeEventListener('touchstart', tryPlay);
      };
      window.addEventListener('click', tryPlay);
      window.addEventListener('touchstart', tryPlay);
    });
  }, []);

  // Sparkle particles
  const sparkles = useMemo(() =>
    Array.from({ length: 14 }, (_, i) => ({
      id: i, delay: i * 0.35 + Math.random() * 0.5,
      left: 25 + Math.random() * 50, size: 2 + Math.random() * 4,
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
      className="relative w-full h-full bg-[#0a0a1a] overflow-hidden select-none"
    >
      {/* ====== VIDEO HERO — main background ====== */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: videoReady && visible ? 1 : 0,
          transition: 'opacity 1.5s ease-out',
        }}
      >
        <video
          ref={videoRef}
          src={`${import.meta.env.BASE_URL}assets/Vid6.mp4`}
          muted
          loop
          playsInline
          preload="auto"
          onLoadedData={() => setVideoReady(true)}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'saturate(0.8) brightness(0.75)' }}
        />
      </div>

      {/* ====== Cinematic overlays ====== */}
      <div className="pointer-events-none absolute inset-0">
        {/* Radial vignette — darkens edges, keeps center bright */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 65% 55% at 50% 35%, transparent 0%, rgba(10,10,26,0.5) 55%, rgba(10,10,26,0.9) 100%)',
        }} />
        {/* Top fade — sponsor badge area */}
        <div className="absolute top-0 left-0 right-0 h-[12%]" style={{
          background: 'linear-gradient(to bottom, rgba(10,10,26,0.75) 0%, transparent 100%)',
        }} />
        {/* Bottom fade — title + card area needs to be readable */}
        <div className="absolute bottom-0 left-0 right-0 h-[45%]" style={{
          background: 'linear-gradient(to top, rgba(10,10,26,0.97) 0%, rgba(10,10,26,0.85) 35%, rgba(10,10,26,0.3) 70%, transparent 100%)',
        }} />
        {/* Gold backlight glow */}
        <div
          className="absolute top-[15%] left-1/2 w-[500px] h-[500px] rounded-full blur-[120px]"
          style={{
            background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 65%)',
            animation: 'hero-glow-pulse 6s ease-in-out infinite',
            transform: `translate(calc(-50% + ${mousePos.x * -2}px), ${mousePos.y * -2}px)`,
            transition: 'transform 0.6s ease-out',
          }}
        />
        {/* Electric blue accent — bottom */}
        <div
          className="absolute bottom-[-5%] left-1/2 -translate-x-1/2 w-[400px] h-[200px] rounded-full blur-[80px]"
          style={{ background: 'radial-gradient(circle, rgba(0,180,255,0.04) 0%, transparent 70%)' }}
        />
      </div>

      {/* ====== Floating 3D Footballs ====== */}

      {/* Main football — right side, juggling */}
      <div
        className="absolute right-[-5px] sm:right-4 top-[22%] sm:top-[18%] z-[25]"
        style={{
          transform: `translate(${mousePos.x * 14}px, ${mousePos.y * 8}px)`,
          transition: 'transform 0.25s ease-out',
        }}
      >
        <Football3D size={120} interactive glow spin juggle />
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-16 h-3 rounded-full bg-gold/15 blur-lg" />
      </div>

      {/* Secondary football — left side, bouncing */}
      <div
        className="absolute left-[-8px] sm:left-2 top-[36%] sm:top-[32%] z-[25]"
        style={{
          transform: `translate(${mousePos.x * -10}px, ${mousePos.y * 6}px)`,
          transition: 'transform 0.25s ease-out',
        }}
      >
        <Football3D size={60} spin glow bounce />
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1.5 rounded-full bg-gold/10 blur-md" />
      </div>

      {/* Tiny accent football — top-left, subtle float */}
      <div
        className="absolute left-[12%] top-[16%] z-[25] opacity-40"
        style={{
          transform: `translate(${mousePos.x * -16}px, ${mousePos.y * -10}px)`,
          transition: 'transform 0.35s ease-out',
          animation: 'float 5s ease-in-out 0.5s infinite',
        }}
      >
        <Football3D size={28} spin glow={false} bounce />
      </div>

      {/* ====== Gold sweep + sparkles ====== */}
      <div className="absolute inset-0 pointer-events-none z-[18]">
        <div
          className="absolute bottom-[20%] w-[3px] h-[35%]"
          style={{
            background: 'linear-gradient(to bottom, transparent, rgba(212,175,55,0.18), transparent)',
            animation: 'gold-sweep 4s ease-in-out 2s infinite',
            filter: 'blur(8px)',
          }}
        />
        {sparkles.map(s => (
          <Sparkle key={s.id} delay={s.delay} left={s.left} size={s.size} />
        ))}
      </div>

      {/* ====== CONTENT OVERLAY ====== */}
      <div className="relative z-[30] flex flex-col h-full">

        {/* Player profile badge (top-right) */}
        {profile && profile.playerName && (
          <button
            onClick={() => onNavigate('profile')}
            className="absolute top-3 right-3 z-50 flex items-center gap-2 pl-1 pr-3 py-1 rounded-full cursor-pointer
              bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-gold/30
              active:scale-95 transition-all duration-200"
            style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm" style={{
              background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
              border: '1.5px solid rgba(212,175,55,0.3)',
            }}>
              {AVATARS[profile.avatarId]?.emoji || '⚽'}
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[10px] text-white/80 font-semibold leading-tight">{profile.playerName}</span>
              <span className="text-[8px] leading-tight font-medium" style={{ color: getRankTitle(profile.stats).color }}>
                {getRankTitle(profile.stats).title} · Lv.{getLevel(profile.stats).level}
              </span>
            </div>
          </button>
        )}

        {/* Sponsor Badge */}
        <div
          className="flex justify-center pt-3 sm:pt-5 px-4 transition-all duration-700 ease-out"
          style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(-10px)' }}
        >
          <div className="flex items-center gap-2 px-4 py-1 rounded-full" style={{
            background: 'linear-gradient(90deg, transparent, rgba(10,10,26,0.6), transparent)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(212,175,55,0.15)',
          }}>
            <div className="w-1 h-1 rounded-full bg-gold" style={{ animation: 'badge-pulse 3s ease-in-out infinite' }} />
            <span className="text-[9px] sm:text-[10px] text-gold/70 uppercase tracking-[0.2em] font-semibold">
              Sponsored by Luka Modri&#263;
            </span>
            <div className="w-1 h-1 rounded-full bg-gold" style={{ animation: 'badge-pulse 3s ease-in-out 1.5s infinite' }} />
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Title + Glass Card */}
        <div
          className="relative z-[35] px-4 sm:px-5 pb-4 sm:pb-6 transition-all duration-700 ease-out"
          style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(40px)', transitionDelay: '0.3s' }}
        >
          {/* Title block */}
          <div className="flex flex-col items-center mb-3">
            <div className="flex items-center gap-2 sm:gap-3 mb-1">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gold/70 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <path d="M12 2a10 10 0 0 1 0 20 10 10 0 0 1 0-20zm0 2l2 3h3.5l1 3-2.5 2.5 1 3.5-3 1-2 3-2-3-3-1 1-3.5L4.5 10l1-3H9l2-3z" opacity="0.3" />
              </svg>
              <h1
                className="text-[26px] sm:text-4xl md:text-5xl font-black tracking-tight text-center leading-[1.05]"
                style={{
                  background: 'linear-gradient(105deg, #D4AF37 0%, #F5E6A3 35%, #D4AF37 55%, #8B7425 100%)',
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  animation: 'shimmer 4s linear infinite',
                }}
              >
                JUGGLE CHALLENGE
              </h1>
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gold/70 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <path d="M12 2a10 10 0 0 1 0 20 10 10 0 0 1 0-20zm0 2l2 3h3.5l1 3-2.5 2.5 1 3.5-3 1-2 3-2-3-3-1 1-3.5L4.5 10l1-3H9l2-3z" opacity="0.3" />
              </svg>
            </div>
            <p className="text-[10px] sm:text-xs text-white/40 tracking-[0.25em] uppercase font-medium">
              AI-Verified Football Juggling
            </p>
          </div>

          {/* Glass card */}
          <div className="w-full max-w-md mx-auto rounded-2xl p-4 sm:p-5" style={{
            background: 'linear-gradient(145deg, rgba(26,26,46,0.9), rgba(10,10,26,0.97))',
            backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(212,175,55,0.15)',
            boxShadow: '0 -20px 60px rgba(0,0,0,0.5), 0 0 50px rgba(212,175,55,0.04), inset 0 1px 0 rgba(255,255,255,0.03)',
          }}>
            {/* Score teaser */}
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/20" />
              <span className="text-[10px] text-gold/50 uppercase tracking-[0.2em] font-bold">Can you beat the record?</span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/20" />
            </div>

            {/* Primary buttons */}
            <div className="flex gap-3 mb-3">
              <button
                onClick={() => { soundEngine.playClick(); onNavigate('practice'); }}
                className="flex-1 py-3.5 rounded-xl font-bold text-sm sm:text-base tracking-wide text-black
                  bg-gradient-to-r from-[#8B7425] via-[#D4AF37] to-[#F5E6A3]
                  shadow-[0_0_25px_rgba(212,175,55,0.35)] hover:shadow-[0_0_40px_rgba(212,175,55,0.55)]
                  active:scale-[0.96] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                Practice
              </button>
              <button
                onClick={() => { soundEngine.playClick(); onNavigate('ranked'); }}
                className="flex-1 py-3.5 rounded-xl font-bold text-sm sm:text-base tracking-wide text-gold
                  border-2 border-gold/50 bg-gold/[0.06] hover:bg-gold/[0.14] hover:border-gold/80
                  active:scale-[0.96] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9H4.5a2.5 2.5 0 010-5H6" /><path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
                  <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
                  <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" /><path d="M18 2H6v7a6 6 0 0012 0V2z" />
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
                    bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.07] hover:border-gold/25
                    active:scale-[0.94] transition-all duration-200 cursor-pointer"
                >
                  <span className="text-electric/60 w-4 h-4">{icon}</span>
                  <span className="text-[9px] sm:text-[10px] text-white/45 font-medium leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="text-[9px] text-white/12 tracking-wider text-center mt-2.5">Available on iOS &amp; Android</p>
        </div>
      </div>
    </div>
  );
}

/* ---- Inline SVG icons ---- */

const leaderboardIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <rect x="4" y="12" width="4" height="8" rx="1" /><rect x="10" y="6" width="4" height="14" rx="1" /><rect x="16" y="9" width="4" height="11" rx="1" />
  </svg>
);

const dailyDrillIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 15" />
  </svg>
);

const howItWorksIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c0 .8-.5 1.2-1 1.7" />
    <circle cx="12" cy="17" r="0.5" fill="currentColor" />
  </svg>
);
