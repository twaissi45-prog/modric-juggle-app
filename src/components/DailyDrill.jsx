// ============================================
// DailyDrill — Daily Challenge Screen
// Rotating drills, streak tracking, drill preview
// ============================================

import { useState, useMemo } from 'react';
import Football3D from './three/Football3D';

// --- Drill definitions ---
const DRILLS = [
  {
    id: 'touch20',
    title: 'Touch Master',
    description: 'Reach 20 touches without dropping the ball',
    target: 20,
    targetLabel: '20 Touches',
    type: 'touches',
    icon: 'target', // target icon for touch drills
    timed: false,
  },
  {
    id: 'combo5',
    title: 'Combo King',
    description: 'Build up a 5x combo streak',
    target: 5,
    targetLabel: '5x Combo',
    type: 'combo',
    icon: 'target',
    timed: false,
  },
  {
    id: 'score50',
    title: 'Speed Scorer',
    description: 'Score 50 points in 60 seconds',
    target: 50,
    targetLabel: '50 Points',
    type: 'score',
    icon: 'timer',
    timed: true,
    timeLimit: 60,
  },
];

// --- Mock history data ---
const MOCK_HISTORY = [
  { day: 'Yesterday', result: 'Completed', success: true },
  { day: '2 days ago', result: 'Failed', success: false },
];
const MOCK_STREAK = 3;

// --- Helpers ---
function getDayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

// --- SVG Icons ---
function TimerIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2 2" />
      <path d="M5 3l2 2" />
      <path d="M19 3l-2 2" />
      <line x1="12" y1="1" x2="12" y2="3" />
    </svg>
  );
}

function TargetIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function ArrowLeftIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

function FlameIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2c-1 5-6 7-6 12a6 6 0 0012 0c0-5-5-7-6-12zm0 16a3 3 0 01-3-3c0-2 1.5-3.5 3-5.5 1.5 2 3 3.5 3 5.5a3 3 0 01-3 3z" />
    </svg>
  );
}

function CheckIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ============================================
// Main Component
// ============================================
export default function DailyDrill({ onStart, onBack }) {
  const todayDrill = useMemo(() => {
    const dayOfYear = getDayOfYear();
    return DRILLS[dayOfYear % 3];
  }, []);

  const [hovering, setHovering] = useState(false);

  return (
    <div className="fixed inset-0 bg-navy flex flex-col overflow-y-auto">
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-gold/[0.03] blur-[100px]" />
        <div className="absolute bottom-[-30%] right-[-15%] w-[70vw] h-[70vw] rounded-full bg-electric/[0.03] blur-[120px]" />
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

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center px-6 pb-8">
        {/* Title section */}
        <div className="text-center mt-2 mb-6">
          <h1 className="text-2xl font-bold text-white tracking-tight">Daily Drill</h1>
          <p className="text-white/40 text-sm mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Streak badge */}
        <div className="flex items-center gap-2 bg-gradient-to-r from-gold/20 to-gold/5 border border-gold/30 rounded-full px-5 py-2 mb-8">
          <FlameIcon className="w-5 h-5 text-gold" />
          <span className="text-gold font-bold text-sm tracking-wide">{MOCK_STREAK} DAY STREAK</span>
          <FlameIcon className="w-5 h-5 text-gold" />
        </div>

        {/* Football visual */}
        <div className="mb-6" style={{ animation: 'float 3s ease-in-out infinite' }}>
          <Football3D size={100} spin={true} bounce={true} glow={true} />
        </div>

        {/* Active drill card */}
        <div
          className="w-full max-w-sm bg-gradient-to-b from-card to-navy-dark border border-gold/20 rounded-2xl overflow-hidden mb-6"
          style={{
            boxShadow: '0 0 40px rgba(212,175,55,0.08), 0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          {/* Card header */}
          <div className="bg-gradient-to-r from-gold/15 to-gold/5 px-5 py-3 flex items-center justify-between border-b border-gold/10">
            <span className="text-xs font-bold text-gold/80 uppercase tracking-widest">
              Today&apos;s Challenge
            </span>
            <div className="flex items-center gap-1.5">
              {todayDrill.icon === 'timer' ? (
                <TimerIcon className="w-4 h-4 text-electric" />
              ) : (
                <TargetIcon className="w-4 h-4 text-electric" />
              )}
              <span className="text-xs text-electric font-semibold">
                {todayDrill.timed ? `${todayDrill.timeLimit}s` : 'Untimed'}
              </span>
            </div>
          </div>

          {/* Card body */}
          <div className="px-5 py-6">
            {/* Drill icon and title */}
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/20 flex items-center justify-center">
                {todayDrill.icon === 'timer' ? (
                  <TimerIcon className="w-6 h-6 text-gold" />
                ) : (
                  <TargetIcon className="w-6 h-6 text-gold" />
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-white mb-1">{todayDrill.title}</h2>
                <p className="text-white/50 text-sm leading-relaxed">{todayDrill.description}</p>
              </div>
            </div>

            {/* Target indicator */}
            <div className="bg-navy/60 rounded-xl p-4 flex items-center justify-between border border-white/5">
              <span className="text-white/40 text-sm font-medium">Target</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-white">{todayDrill.target}</span>
                <span className="text-white/40 text-xs">
                  {todayDrill.type === 'touches' && 'touches'}
                  {todayDrill.type === 'combo' && 'x combo'}
                  {todayDrill.type === 'score' && 'points'}
                </span>
              </div>
            </div>

            {/* Time limit badge for timed drills */}
            {todayDrill.timed && (
              <div className="mt-3 bg-electric/10 border border-electric/20 rounded-lg px-4 py-2.5 flex items-center gap-2">
                <TimerIcon className="w-4 h-4 text-electric" />
                <span className="text-electric text-sm font-medium">
                  Time Limit: {todayDrill.timeLimit} seconds
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Start drill button */}
        <button
          onClick={() => onStart(todayDrill)}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          className="w-full max-w-sm py-4 rounded-xl font-bold text-lg text-navy-dark transition-all duration-200 active:scale-[0.97]"
          style={{
            background: 'linear-gradient(135deg, #D4AF37, #F5E6A3, #D4AF37)',
            backgroundSize: '200% auto',
            animation: hovering ? 'shimmer 2s linear infinite' : 'none',
            boxShadow: '0 0 30px rgba(212,175,55,0.3), 0 4px 15px rgba(0,0,0,0.3)',
          }}
        >
          Start Drill
        </button>

        {/* Previous results */}
        <div className="w-full max-w-sm mt-8">
          <h3 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">
            Recent Results
          </h3>
          <div className="space-y-2">
            {MOCK_HISTORY.map((entry, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-card/60 border border-white/5 rounded-xl px-4 py-3"
              >
                <span className="text-white/50 text-sm">{entry.day}</span>
                <div className="flex items-center gap-2">
                  {entry.success ? (
                    <>
                      <CheckIcon className="w-4 h-4 text-success" />
                      <span className="text-success text-sm font-semibold">{entry.result}</span>
                    </>
                  ) : (
                    <>
                      <XIcon className="w-4 h-4 text-alert" />
                      <span className="text-alert text-sm font-semibold">{entry.result}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
