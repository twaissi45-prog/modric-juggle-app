// ============================================
// GhostDuel — Ghost Challenge / Duel Screen
// Share mode (create challenge) + Duel mode (compare)
// ============================================

import { useState, useMemo, useCallback } from 'react';
import Football3D from './three/Football3D';

// --- SVG Icons ---
function ArrowLeftIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

function CrownIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
      <rect x="4" y="18" width="16" height="2" rx="1" />
    </svg>
  );
}

function CopyIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function ShareIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function HomeIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function PlayIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function TrophyIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
      <path d="M18 2H6v7a6 6 0 0012 0V2z" />
    </svg>
  );
}

// --- Encode session data for sharing ---
function encodeSessionForURL(sessionData) {
  if (!sessionData) return '';
  const payload = {
    s: sessionData.score || 0,
    c: sessionData.combo || 0,
    n: sessionData.name || 'Player',
  };
  return btoa(JSON.stringify(payload));
}

// ============================================
// Share Mode — Show challenge card with URL
// ============================================
function ShareMode({ sessionData, onPlay, onBack }) {
  const [copied, setCopied] = useState(false);

  const shareURL = useMemo(() => {
    const encoded = encodeSessionForURL(sessionData);
    return `modric.app/duel?c=${encoded}`;
  }, [sessionData]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(shareURL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback: select text approach
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [shareURL]);

  return (
    <div className="flex-1 flex flex-col items-center px-6 pb-8">
      {/* Title */}
      <div className="text-center mt-4 mb-8">
        <ShareIcon className="w-8 h-8 text-gold mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-white tracking-tight">Challenge a Friend</h1>
        <p className="text-white/40 text-sm mt-2 max-w-xs mx-auto">
          Share your score and dare them to beat it
        </p>
      </div>

      {/* Challenge card */}
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden mb-8"
        style={{
          background: 'linear-gradient(145deg, rgba(212,175,55,0.12), rgba(12,12,30,0.95))',
          border: '2px solid rgba(212,175,55,0.3)',
          boxShadow: '0 0 60px rgba(212,175,55,0.1), 0 12px 40px rgba(0,0,0,0.5)',
        }}
      >
        {/* Card header with gold bar */}
        <div className="bg-gradient-to-r from-gold/25 to-gold/10 px-6 py-3 border-b border-gold/20">
          <div className="flex items-center justify-center gap-2">
            <TrophyIcon className="w-4 h-4 text-gold" />
            <span className="text-xs font-bold text-gold uppercase tracking-[0.2em]">
              Juggle Challenge
            </span>
            <TrophyIcon className="w-4 h-4 text-gold" />
          </div>
        </div>

        {/* Card body */}
        <div className="px-6 py-6 flex flex-col items-center">
          {/* Player name */}
          <p className="text-white/40 text-xs uppercase tracking-widest mb-1">
            {sessionData?.name || 'Player'}
          </p>

          {/* Score */}
          <div className="text-5xl font-black text-white mb-1">
            {sessionData?.score || 0}
          </div>
          <p className="text-white/30 text-xs uppercase tracking-wider mb-4">Points</p>

          {/* Stats row */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-lg font-bold text-gold">{sessionData?.combo || 0}x</div>
              <div className="text-white/30 text-[10px] uppercase tracking-wider">Best Combo</div>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <div className="text-lg font-bold text-electric">{sessionData?.touches || 0}</div>
              <div className="text-white/30 text-[10px] uppercase tracking-wider">Touches</div>
            </div>
          </div>
        </div>

        {/* Card footer — dare */}
        <div className="px-6 py-3 bg-navy-dark/50 border-t border-gold/10">
          <p className="text-center text-gold/60 text-xs italic">
            &quot;Think you can beat me?&quot;
          </p>
        </div>
      </div>

      {/* Shareable URL */}
      <div className="w-full max-w-sm mb-8">
        <label className="text-xs text-white/30 uppercase tracking-widest mb-2 block">
          Share Link
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-card border border-white/10 rounded-xl px-4 py-3 text-sm text-white/60 font-mono truncate">
            {shareURL}
          </div>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95"
            style={{
              background: copied
                ? 'linear-gradient(135deg, #00FF88, #00CC66)'
                : 'linear-gradient(135deg, #D4AF37, #8B7425)',
              boxShadow: copied
                ? '0 0 20px rgba(0,255,136,0.3)'
                : '0 0 20px rgba(212,175,55,0.2)',
            }}
          >
            {copied ? (
              <svg className="w-5 h-5 text-navy-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <CopyIcon className="w-5 h-5 text-navy-dark" />
            )}
          </button>
        </div>
        <p className="text-white/20 text-xs mt-2 text-center">
          {copied ? 'Copied to clipboard!' : 'Tap to copy the challenge link'}
        </p>
      </div>

      {/* Play again button */}
      <button
        onClick={onPlay}
        className="w-full max-w-sm py-3.5 rounded-xl font-bold text-navy-dark transition-all duration-200 active:scale-[0.97] flex items-center justify-center gap-2"
        style={{
          background: 'linear-gradient(135deg, #D4AF37, #F5E6A3, #D4AF37)',
          boxShadow: '0 0 25px rgba(212,175,55,0.25)',
        }}
      >
        <PlayIcon className="w-4 h-4" />
        Play Again
      </button>
    </div>
  );
}

// ============================================
// Duel Mode — Side-by-side comparison
// ============================================
function DuelMode({ challengeData, sessionData, onPlay, onHome }) {
  const userScore = sessionData?.score || 0;
  const ghostScore = challengeData?.score || 0;
  const userCombo = sessionData?.combo || 0;
  const ghostCombo = challengeData?.combo || 0;
  const userWins = userScore > ghostScore;
  const isTie = userScore === ghostScore;

  return (
    <div className="flex-1 flex flex-col items-center px-6 pb-8">
      {/* Title */}
      <div className="text-center mt-4 mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Duel Results</h1>
        <p className="text-white/40 text-sm mt-1">
          {isTie ? "It's a tie!" : userWins ? 'You won!' : `${challengeData?.name || 'Ghost'} wins!`}
        </p>
      </div>

      {/* Versus layout */}
      <div className="w-full max-w-md flex items-start gap-2 mb-8">
        {/* Player column */}
        <div className="flex-1 flex flex-col items-center">
          {/* Winner crown */}
          <div className="h-8 flex items-end mb-1">
            {userWins && !isTie && <CrownIcon className="w-7 h-7 text-gold" />}
          </div>

          {/* Player card */}
          <div
            className="w-full rounded-2xl overflow-hidden"
            style={{
              background: userWins && !isTie
                ? 'linear-gradient(180deg, rgba(212,175,55,0.15), rgba(12,12,30,0.9))'
                : 'linear-gradient(180deg, rgba(212,175,55,0.06), rgba(12,12,30,0.9))',
              border: userWins && !isTie
                ? '2px solid rgba(212,175,55,0.4)'
                : '1px solid rgba(212,175,55,0.15)',
              boxShadow: userWins && !isTie
                ? '0 0 40px rgba(212,175,55,0.15)'
                : 'none',
            }}
          >
            {/* Label */}
            <div className="py-2 bg-gold/10 border-b border-gold/20">
              <p className="text-center text-xs font-black text-gold uppercase tracking-[0.15em]">
                YOU
              </p>
            </div>

            {/* Score */}
            <div className="py-5 flex flex-col items-center">
              <div className="text-4xl font-black text-white mb-1">{userScore}</div>
              <p className="text-white/30 text-[10px] uppercase tracking-wider">Points</p>
            </div>

            {/* Combo */}
            <div className="px-4 pb-4">
              <div className="bg-navy/60 rounded-lg p-2.5 text-center border border-white/5">
                <span className="text-gold font-bold text-sm">{userCombo}x</span>
                <span className="text-white/30 text-[10px] ml-1">combo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center ball + VS */}
        <div className="flex flex-col items-center justify-center pt-12 px-1">
          <Football3D size={80} spin={true} bounce={true} glow={true} />
          <div className="mt-2 bg-card border border-white/10 rounded-full px-3 py-1">
            <span className="text-xs font-black text-white/50 tracking-widest">VS</span>
          </div>
        </div>

        {/* Ghost column */}
        <div className="flex-1 flex flex-col items-center">
          {/* Winner crown */}
          <div className="h-8 flex items-end mb-1">
            {!userWins && !isTie && <CrownIcon className="w-7 h-7 text-gold" />}
          </div>

          {/* Ghost card */}
          <div
            className="w-full rounded-2xl overflow-hidden"
            style={{
              background: !userWins && !isTie
                ? 'linear-gradient(180deg, rgba(0,212,255,0.12), rgba(12,12,30,0.9))'
                : 'linear-gradient(180deg, rgba(0,212,255,0.05), rgba(12,12,30,0.9))',
              border: !userWins && !isTie
                ? '2px solid rgba(0,212,255,0.4)'
                : '1px solid rgba(0,212,255,0.15)',
              boxShadow: !userWins && !isTie
                ? '0 0 40px rgba(0,212,255,0.12)'
                : 'none',
            }}
          >
            {/* Label */}
            <div className="py-2 bg-electric/10 border-b border-electric/20">
              <p className="text-center text-xs font-black text-electric uppercase tracking-[0.15em]">
                GHOST
              </p>
            </div>

            {/* Score */}
            <div className="py-5 flex flex-col items-center">
              <div className="text-4xl font-black text-white mb-1">{ghostScore}</div>
              <p className="text-white/30 text-[10px] uppercase tracking-wider">Points</p>
            </div>

            {/* Combo */}
            <div className="px-4 pb-4">
              <div className="bg-navy/60 rounded-lg p-2.5 text-center border border-white/5">
                <span className="text-electric font-bold text-sm">{ghostCombo}x</span>
                <span className="text-white/30 text-[10px] ml-1">combo</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ghost name */}
      <div className="flex items-center gap-2 mb-8">
        <span className="text-white/30 text-sm">Challenger:</span>
        <span className="text-electric font-semibold text-sm">{challengeData?.name || 'Ghost'}</span>
      </div>

      {/* Action buttons */}
      <div className="w-full max-w-sm flex gap-3">
        <button
          onClick={onPlay}
          className="flex-1 py-3.5 rounded-xl font-bold text-navy-dark transition-all duration-200 active:scale-[0.97] flex items-center justify-center gap-2"
          style={{
            background: 'linear-gradient(135deg, #D4AF37, #F5E6A3, #D4AF37)',
            boxShadow: '0 0 25px rgba(212,175,55,0.25)',
          }}
        >
          <PlayIcon className="w-4 h-4" />
          Play Again
        </button>

        <button
          onClick={onHome}
          className="py-3.5 px-5 rounded-xl font-bold text-white/70 bg-card border border-white/10 hover:border-white/20 transition-all duration-200 active:scale-[0.97] flex items-center justify-center gap-2"
        >
          <HomeIcon className="w-4 h-4" />
          Home
        </button>
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================
export default function GhostDuel({ challengeData, sessionData, onPlay, onBack, onHome }) {
  // Determine mode:
  // A) No challengeData but sessionData exists => Share mode
  // B) challengeData exists => Duel mode
  const isShareMode = !challengeData && !!sessionData;
  const isDuelMode = !!challengeData;

  return (
    <div className="fixed inset-0 bg-navy flex flex-col overflow-y-auto">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {isShareMode && (
          <div className="absolute top-[-20%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-gold/[0.04] blur-[100px]" />
        )}
        {isDuelMode && (
          <>
            <div className="absolute top-[10%] left-[-10%] w-[40vw] h-[60vh] rounded-full bg-gold/[0.03] blur-[100px]" />
            <div className="absolute top-[10%] right-[-10%] w-[40vw] h-[60vh] rounded-full bg-electric/[0.03] blur-[100px]" />
          </>
        )}
      </div>

      {/* Back button */}
      <div className="relative z-10 px-4 pt-4 pb-2 flex items-center">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors active:scale-95"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col">
        {isShareMode && (
          <ShareMode
            sessionData={sessionData}
            onPlay={onPlay}
            onBack={onBack}
          />
        )}
        {isDuelMode && (
          <DuelMode
            challengeData={challengeData}
            sessionData={sessionData}
            onPlay={onPlay}
            onHome={onHome}
          />
        )}
        {!isShareMode && !isDuelMode && (
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <Football3D size={120} spin={true} bounce={true} glow={true} />
            <p className="text-white/40 text-center mt-6 max-w-xs">
              Play a session first to create a challenge or receive a challenge link from a friend.
            </p>
            <button
              onClick={onPlay}
              className="mt-6 py-3.5 px-8 rounded-xl font-bold text-navy-dark transition-all active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, #D4AF37, #F5E6A3, #D4AF37)',
                boxShadow: '0 0 25px rgba(212,175,55,0.25)',
              }}
            >
              Start Playing
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
