// ============================================
// ResultsScreen — Post-session results display
// Score, stats, verification, profile, actions
// ============================================

import { useState, useEffect } from 'react';
import Football3D from './three/Football3D';
import { AVATARS, getRankTitle, getLevel } from '../store/playerProfile';
import soundEngine from '../engine/sounds';

export default function ResultsScreen({
  sessionData = {},
  profile,
  onPlayAgain,
  onLeaderboard,
  onShare,
  onHome,
}) {
  const {
    totalScore = 0,
    totalTouches = 0,
    bestCombo = 0,
    drops = 0,
    touchBreakdown = { foot: 0, thigh: 0, head: 0 },
    duration = 0,
    gameMode = 'practice',
    verification = { checks: [], isVerified: false, badge: '', overallScore: 0 },
  } = sessionData;

  const [visible, setVisible] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [showVerification, setShowVerification] = useState(false);
  const [showNewBest, setShowNewBest] = useState(false);

  // Check for new personal best
  const isNewBest = profile && totalScore > 0 && totalScore >= (profile.stats?.bestScore || 0);

  // Entrance animation
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  // Animated score counter + sound
  useEffect(() => {
    if (!visible) return;
    const target = totalScore;
    if (target === 0) return;

    const dur = 1200;
    const startTime = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / dur, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
      else {
        // Score finished counting — play sound and show new best
        if (isNewBest) {
          setShowNewBest(true);
          soundEngine.playSessionComplete();
        }
      }
    };

    const delay = setTimeout(() => requestAnimationFrame(tick), 300);
    return () => clearTimeout(delay);
  }, [visible, totalScore]);

  // Touch breakdown bar widths
  const breakdownTotal = touchBreakdown.foot + touchBreakdown.thigh + touchBreakdown.head;
  const pct = (v) => (breakdownTotal > 0 ? Math.round((v / breakdownTotal) * 100) : 0);

  // Format duration
  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const rank = profile ? getRankTitle(profile.stats) : null;
  const level = profile ? getLevel(profile.stats) : null;

  return (
    <div className="relative w-full h-full bg-navy overflow-y-auto overflow-x-hidden select-none">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-gold/[0.05] blur-[120px]" />
        {isNewBest && showNewBest && (
          <div
            className="absolute top-[5%] left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full blur-[100px]"
            style={{
              background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)',
              animation: 'hero-glow-pulse 3s ease-in-out infinite',
            }}
          />
        )}
      </div>

      {/* Content */}
      <div
        className="relative z-10 flex flex-col items-center w-full max-w-md mx-auto px-6 py-6 transition-all duration-700 ease-out"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(40px)',
        }}
      >
        {/* Player identity row */}
        {profile && profile.playerName && (
          <div className="flex items-center gap-3 mb-4 w-full">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
              style={{
                background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
                border: '2px solid rgba(212,175,55,0.3)',
              }}
            >
              {AVATARS[profile.avatarId]?.emoji || '⚽'}
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-white">{profile.playerName}</div>
              <div className="flex items-center gap-2">
                {rank && (
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: rank.color }}>
                    {rank.title}
                  </span>
                )}
                {level && (
                  <span className="text-[10px] text-white/30">Lv.{level.level}</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-white/30 uppercase tracking-wider">
                {gameMode === 'ranked' ? '🏆 Ranked' : '🎯 Practice'}
              </div>
            </div>
          </div>
        )}

        {/* Football decoration */}
        <div className="mb-2">
          <Football3D size={100} spin bounce={false} glow={isNewBest} />
        </div>

        {/* New personal best banner */}
        {isNewBest && showNewBest && (
          <div
            className="flex items-center gap-2 px-4 py-1.5 rounded-full mb-2"
            style={{
              background: 'linear-gradient(90deg, rgba(212,175,55,0.15), rgba(245,230,163,0.1), rgba(212,175,55,0.15))',
              border: '1px solid rgba(212,175,55,0.4)',
              animation: 'pulse-gold 2s ease-in-out infinite',
            }}
          >
            <span className="text-sm">🏆</span>
            <span className="text-xs font-bold text-gold uppercase tracking-wider">New Personal Best!</span>
          </div>
        )}

        {/* Score display */}
        <div className="text-center mb-5">
          <p className="text-sm text-white/40 uppercase tracking-widest mb-1">Your Score</p>
          <h1
            className="text-6xl font-black tabular-nums"
            style={{
              background: 'linear-gradient(135deg, #D4AF37 0%, #F5E6A3 50%, #D4AF37 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {animatedScore.toLocaleString()}
          </h1>
          <p className="text-xs text-white/30 mt-1">
            {formatDuration(duration)} session
          </p>
        </div>

        {/* XP Progress bar (if profile exists) */}
        {level && (
          <div className="w-full mb-5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">
                Level {level.level}
              </span>
              <span className="text-[10px] text-gold/60">
                +{totalScore} XP
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold-dark to-gold transition-all duration-1000 ease-out"
                style={{
                  width: visible ? `${Math.round(level.progress * 100)}%` : '0%',
                  transitionDelay: '1.5s',
                }}
              />
            </div>
          </div>
        )}

        {/* Verification badge */}
        <button
          onClick={() => setShowVerification(!showVerification)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full mb-5 transition-all duration-200 cursor-pointer ${
            verification.isVerified
              ? 'bg-success/10 border border-success/30 hover:bg-success/15'
              : 'bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06]'
          }`}
        >
          {verification.isVerified ? (
            <svg className="w-4 h-4 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
          <span className={`text-xs font-bold uppercase tracking-wider ${verification.isVerified ? 'text-success' : 'text-white/30'}`}>
            {verification.isVerified ? 'AI Verified' : 'Unverified'}
          </span>
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${verification.isVerified ? 'text-success/50' : 'text-white/20'} ${showVerification ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Expandable verification report */}
        {showVerification && (
          <div
            className="w-full mb-5 rounded-xl bg-card border border-white/[0.06] overflow-hidden"
            style={{ animation: 'slide-up 0.3s ease-out' }}
          >
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Verification Report</span>
                <span className="text-xs text-white/30">Score: {Math.round((verification.overallScore ?? 0) * 100)}%</span>
              </div>
            </div>
            <div className="px-4 py-3 space-y-3">
              {(verification.checks || []).map((check, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white/60">{check.name || `Check ${i + 1}`}</span>
                    <span className={`text-xs font-medium ${Math.round((check.score ?? check.value ?? 0) * 100) >= 70 ? 'text-success' : 'text-alert'}`}>
                      {Math.round((check.score ?? check.value ?? 0) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${Math.round((check.score ?? check.value ?? 0) * 100) >= 70 ? 'bg-gradient-to-r from-success/70 to-success' : 'bg-gradient-to-r from-alert/70 to-alert'}`}
                      style={{ width: `${Math.min(Math.round((check.score ?? check.value ?? 0) * 100), 100)}%` }}
                    />
                  </div>
                </div>
              ))}
              {verification.checks?.length === 0 && (
                <p className="text-xs text-white/30 text-center py-2">No verification data available.</p>
              )}
            </div>
          </div>
        )}

        {/* Stats grid */}
        <div className="w-full grid grid-cols-4 gap-2 mb-5">
          {[
            { label: 'Touches', value: totalTouches, icon: '👆', color: 'text-electric' },
            { label: 'Best Combo', value: bestCombo, icon: '🔥', color: 'text-gold' },
            { label: 'Drops', value: drops, icon: '💧', color: 'text-alert' },
            { label: 'Accuracy', value: breakdownTotal > 0 ? `${Math.round((totalTouches / (totalTouches + drops)) * 100)}%` : '—', icon: '🎯', color: 'text-success' },
          ].map(({ label, value, icon, color }) => (
            <div
              key={label}
              className="flex flex-col items-center py-2.5 px-1 rounded-xl bg-white/[0.03] border border-white/[0.06]"
            >
              <span className="text-xs mb-0.5">{icon}</span>
              <span className={`text-lg font-bold tabular-nums ${color}`}>{value}</span>
              <span className="text-[8px] text-white/40 uppercase tracking-wider mt-0.5 text-center leading-tight">{label}</span>
            </div>
          ))}
        </div>

        {/* Touch breakdown bar chart */}
        <div className="w-full mb-6">
          <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
            Touch Breakdown
          </h3>
          <div className="space-y-2.5">
            {[
              { label: 'Foot', value: touchBreakdown.foot, emoji: '🦶', color: 'from-electric/70 to-electric' },
              { label: 'Thigh', value: touchBreakdown.thigh, emoji: '🦵', color: 'from-gold/70 to-gold' },
              { label: 'Head', value: touchBreakdown.head, emoji: '🗣️', color: 'from-success/70 to-success' },
            ].map(({ label, value, emoji, color }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white/50">{emoji} {label}</span>
                  <span className="text-xs text-white/30">{value} ({pct(value)}%)</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-white/[0.05] overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-1000 ease-out`}
                    style={{
                      width: visible ? `${pct(value)}%` : '0%',
                      transitionDelay: '0.6s',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={() => { soundEngine.playClick(); onPlayAgain(); }}
            className="w-full py-3.5 rounded-xl font-bold text-base tracking-wide text-black
              bg-gradient-to-r from-gold-dark via-gold to-gold-light
              shadow-[0_0_20px_rgba(212,175,55,0.3)]
              hover:shadow-[0_0_32px_rgba(212,175,55,0.5)]
              active:scale-[0.97] transition-all duration-200 cursor-pointer"
          >
            ⚽ Play Again
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { soundEngine.playClick(); onLeaderboard(); }}
              className="py-3 rounded-xl text-sm font-semibold text-white/70
                bg-white/[0.04] border border-white/[0.08]
                hover:bg-white/[0.08] hover:text-white
                active:scale-[0.97] transition-all duration-200 cursor-pointer"
            >
              🏆 Leaderboard
            </button>
            <button
              onClick={() => { soundEngine.playClick(); onShare(); }}
              className="py-3 rounded-xl text-sm font-semibold text-electric/80
                bg-electric/[0.06] border border-electric/20
                hover:bg-electric/[0.12] hover:text-electric
                active:scale-[0.97] transition-all duration-200 cursor-pointer"
            >
              📤 Challenge
            </button>
          </div>

          <button
            onClick={() => { soundEngine.playClick(); onHome(); }}
            className="w-full py-3 rounded-xl text-sm font-medium text-white/40
              hover:text-white/60 active:scale-[0.97] transition-all duration-200 cursor-pointer"
          >
            Back to Home
          </button>
        </div>

        {/* Bottom spacer */}
        <div className="h-8" />
      </div>
    </div>
  );
}
