// ============================================
// ProfileScreen — Player Profile & Stats Hub
// Premium game profile — dark navy + gold design
// ============================================

import { useState, useEffect, useMemo } from 'react';
import {
  AVATARS,
  COUNTRIES,
  ACHIEVEMENTS,
  loadMatchHistory,
  getRankTitle,
  getLevel,
} from '../store/playerProfile';

// ---- SVG Icons ----

function ArrowLeftIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

function EditIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
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

function LockIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
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

function FlameIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2c-1 5-6 7-6 12a6 6 0 0012 0c0-5-5-7-6-12zm0 16a3 3 0 01-3-3c0-2 1.5-3.5 3-5.5 1.5 2 3 3.5 3 5.5a3 3 0 01-3 3z" />
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

function GamepadIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="12" x2="10" y2="12" />
      <line x1="8" y1="10" x2="8" y2="14" />
      <line x1="15" y1="13" x2="15.01" y2="13" />
      <line x1="18" y1="11" x2="18.01" y2="11" />
      <rect x="2" y="6" width="20" height="12" rx="2" />
    </svg>
  );
}

function ZapIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function StarIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 20.49 12 17.77 5.82 20.49 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function BarChartIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="4" y="12" width="4" height="8" rx="1" />
      <rect x="10" y="6" width="4" height="14" rx="1" />
      <rect x="16" y="9" width="4" height="11" rx="1" />
    </svg>
  );
}

// ---- Stat Card Icon Map ----
const STAT_ICONS = {
  bestScore: TrophyIcon,
  totalJuggles: TargetIcon,
  gamesPlayed: GamepadIcon,
  bestCombo: ZapIcon,
  winStreak: FlameIcon,
  avgScore: BarChartIcon,
};

// ============================================
// Main Component
// ============================================

export default function ProfileScreen({ profile, onSave, onBack, onNavigate }) {
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState(false);

  // Editable fields
  const [editName, setEditName] = useState(profile?.playerName || '');
  const [editAvatarId, setEditAvatarId] = useState(profile?.avatarId ?? 0);
  const [editCountryCode, setEditCountryCode] = useState(profile?.countryCode || '');

  // Match history
  const matchHistory = useMemo(() => loadMatchHistory().slice(0, 5), []);

  // Derived data
  const stats = profile?.stats || {};
  const rank = getRankTitle(stats);
  const level = getLevel(stats);
  const avatar = AVATARS.find((a) => a.id === (editing ? editAvatarId : profile?.avatarId)) || AVATARS[0];
  const country = COUNTRIES.find((c) => c.code === (editing ? editCountryCode : profile?.countryCode));
  const unlockedIds = profile?.unlockedAchievements || [];

  // Entrance animation
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  // Sync editable state when profile changes
  useEffect(() => {
    if (profile) {
      setEditName(profile.playerName || '');
      setEditAvatarId(profile.avatarId ?? 0);
      setEditCountryCode(profile.countryCode || '');
    }
  }, [profile]);

  // Toggle edit mode
  const handleToggleEdit = () => {
    if (editing) {
      // Cancel — reset to profile values
      setEditName(profile?.playerName || '');
      setEditAvatarId(profile?.avatarId ?? 0);
      setEditCountryCode(profile?.countryCode || '');
    }
    setEditing(!editing);
  };

  // Save changes
  const handleSave = () => {
    if (onSave) {
      onSave({
        ...profile,
        playerName: editName.trim().slice(0, 16),
        avatarId: editAvatarId,
        countryCode: editCountryCode,
      });
    }
    setEditing(false);
  };

  // Stats grid config
  const statCards = [
    { key: 'bestScore', label: 'Best Score', value: stats.bestScore || 0, highlight: true },
    { key: 'totalJuggles', label: 'Total Juggles', value: stats.totalJuggles || 0 },
    { key: 'gamesPlayed', label: 'Games Played', value: stats.gamesPlayed || 0 },
    { key: 'bestCombo', label: 'Best Combo', value: stats.bestCombo || 0, highlight: true },
    { key: 'winStreak', label: 'Win Streak', value: stats.bestStreak || 0 },
    { key: 'avgScore', label: 'Avg Score', value: stats.averageScore || 0 },
  ];

  // Format date for match history
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="relative w-full h-full bg-navy overflow-y-auto overflow-x-hidden select-none">
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-gold/[0.04] blur-[120px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[400px] h-[400px] rounded-full bg-electric/[0.03] blur-[100px]" />
        {/* Subtle diagonal lines */}
        <div
          className="absolute inset-0 opacity-[0.008]"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 60px, rgba(212,175,55,1) 60px, rgba(212,175,55,1) 61px)',
          }}
        />
      </div>

      {/* Content */}
      <div
        className="relative z-10 flex flex-col w-full max-w-md mx-auto px-4 pb-10 transition-all duration-700 ease-out"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(30px)',
        }}
      >
        {/* ====== HEADER ====== */}
        <div className="flex items-center justify-between pt-4 pb-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors cursor-pointer active:scale-95"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>

          <h2 className="text-lg font-bold text-white tracking-tight">Player Profile</h2>

          <button
            onClick={handleToggleEdit}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer active:scale-95 ${
              editing
                ? 'bg-white/10 text-white/70 hover:bg-white/15'
                : 'bg-gold/10 text-gold hover:bg-gold/20 border border-gold/20'
            }`}
          >
            {editing ? (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Cancel
              </>
            ) : (
              <>
                <EditIcon className="w-3.5 h-3.5" />
                Edit
              </>
            )}
          </button>
        </div>

        {/* ====== PLAYER CARD ====== */}
        <div
          className="relative rounded-2xl overflow-hidden mb-5"
          style={{
            background: 'linear-gradient(145deg, rgba(26,26,46,0.92), rgba(12,12,30,0.98))',
            border: '1px solid rgba(212,175,55,0.15)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.4), 0 0 60px rgba(212,175,55,0.04), inset 0 1px 0 rgba(255,255,255,0.03)',
          }}
        >
          {/* Gold accent line at top */}
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

          <div className="px-5 pt-6 pb-5">
            {/* Avatar + Info Row */}
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
                    border: '2px solid rgba(212,175,55,0.3)',
                    boxShadow: '0 0 20px rgba(212,175,55,0.1), inset 0 0 20px rgba(212,175,55,0.05)',
                  }}
                >
                  {avatar.emoji}
                </div>
                {/* Level badge on avatar */}
                <div
                  className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-navy-dark"
                  style={{
                    background: 'linear-gradient(135deg, #D4AF37, #F5E6A3)',
                    boxShadow: '0 2px 8px rgba(212,175,55,0.4)',
                  }}
                >
                  {level.level}
                </div>
              </div>

              {/* Name, Country, Rank */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold text-white truncate">
                    {profile?.playerName || 'Player'}
                  </h3>
                  {country && (
                    <span className="text-lg flex-shrink-0">{country.flag}</span>
                  )}
                </div>

                {/* Rank Badge */}
                <div className="flex items-center gap-2 mb-2.5">
                  <div
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider"
                    style={{
                      background: `${rank.color}15`,
                      border: `1px solid ${rank.color}40`,
                      color: rank.color,
                    }}
                  >
                    <StarIcon className="w-3 h-3" />
                    {rank.title}
                  </div>
                </div>

                {/* XP Progress Bar */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-white/40 font-medium">Level {level.level}</span>
                    <span className="text-[10px] text-gold/60 font-semibold">{Math.round(level.progress * 100)}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${Math.round(level.progress * 100)}%`,
                        background: 'linear-gradient(90deg, #8B7425, #D4AF37, #F5E6A3)',
                        boxShadow: '0 0 8px rgba(212,175,55,0.3)',
                      }}
                    />
                  </div>
                  <p className="text-[9px] text-white/25 mt-0.5">{level.xp.toLocaleString()} XP total</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ====== EDIT MODE ====== */}
        {editing && (
          <div
            className="rounded-2xl mb-5 overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, rgba(26,26,46,0.92), rgba(12,12,30,0.98))',
              border: '1px solid rgba(212,175,55,0.12)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              animation: 'slide-up 0.3s ease-out',
            }}
          >
            <div className="px-5 py-4">
              {/* Section title */}
              <div className="flex items-center gap-2 mb-4">
                <EditIcon className="w-4 h-4 text-gold/60" />
                <span className="text-xs font-bold text-gold/70 uppercase tracking-widest">Edit Profile</span>
              </div>

              {/* Name Input */}
              <div className="mb-5">
                <label className="text-[11px] text-white/40 font-semibold uppercase tracking-wider mb-1.5 block">
                  Player Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value.slice(0, 16))}
                  maxLength={16}
                  placeholder="Enter your name..."
                  className="w-full px-4 py-3 rounded-xl text-sm text-white font-medium placeholder:text-white/20
                    bg-white/[0.04] border border-white/[0.08] focus:border-gold/40 focus:bg-white/[0.06]
                    outline-none transition-all duration-200"
                />
                <p className="text-[10px] text-white/25 mt-1 text-right">{editName.length}/16</p>
              </div>

              {/* Avatar Picker */}
              <div className="mb-5">
                <label className="text-[11px] text-white/40 font-semibold uppercase tracking-wider mb-2 block">
                  Avatar
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {AVATARS.map((av) => (
                    <button
                      key={av.id}
                      onClick={() => setEditAvatarId(av.id)}
                      className={`aspect-square rounded-xl flex items-center justify-center text-2xl
                        transition-all duration-200 cursor-pointer active:scale-90 ${
                          editAvatarId === av.id
                            ? 'bg-gold/20 border-2 border-gold shadow-[0_0_12px_rgba(212,175,55,0.2)]'
                            : 'bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08]'
                        }`}
                    >
                      {av.emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Country Picker */}
              <div className="mb-5">
                <label className="text-[11px] text-white/40 font-semibold uppercase tracking-wider mb-2 block">
                  Country
                </label>
                <div className="max-h-36 overflow-y-auto rounded-xl border border-white/[0.06] bg-white/[0.02]">
                  {COUNTRIES.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => setEditCountryCode(c.code)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 transition-all duration-150 cursor-pointer ${
                        editCountryCode === c.code
                          ? 'bg-gold/15 text-gold'
                          : 'text-white/60 hover:bg-white/[0.04] hover:text-white/80'
                      } ${c.code !== COUNTRIES[COUNTRIES.length - 1].code ? 'border-b border-white/[0.04]' : ''}`}
                    >
                      <span className="text-lg">{c.flag}</span>
                      <span className="text-sm font-medium truncate">{c.name}</span>
                      {editCountryCode === c.code && (
                        <CheckIcon className="w-4 h-4 text-gold ml-auto flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={!editName.trim()}
                className="w-full py-3.5 rounded-xl font-bold text-base tracking-wide text-navy-dark
                  transition-all duration-200 cursor-pointer active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: editName.trim()
                    ? 'linear-gradient(135deg, #D4AF37, #F5E6A3, #D4AF37)'
                    : 'rgba(212,175,55,0.2)',
                  boxShadow: editName.trim()
                    ? '0 0 25px rgba(212,175,55,0.3), 0 4px 12px rgba(0,0,0,0.3)'
                    : 'none',
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  <CheckIcon className="w-5 h-5" />
                  Save Changes
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ====== STATS GRID ====== */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/15" />
            <span className="text-[10px] text-gold/50 uppercase tracking-[0.2em] font-bold">Statistics</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/15" />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {statCards.map((card, idx) => {
              const IconComponent = STAT_ICONS[card.key];
              return (
                <div
                  key={card.key}
                  className="relative rounded-2xl p-3 overflow-hidden"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: card.highlight ? '1px solid rgba(212,175,55,0.15)' : '1px solid rgba(255,255,255,0.05)',
                    boxShadow: card.highlight ? '0 0 20px rgba(212,175,55,0.04)' : 'none',
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateY(0)' : 'translateY(12px)',
                    transition: `opacity 0.4s ease-out ${200 + idx * 60}ms, transform 0.4s ease-out ${200 + idx * 60}ms`,
                  }}
                >
                  {/* Gold accent for highlighted cards */}
                  {card.highlight && (
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
                  )}

                  {/* Icon */}
                  <div className="mb-2">
                    <IconComponent
                      className={`w-4 h-4 ${card.highlight ? 'text-gold/70' : 'text-white/25'}`}
                    />
                  </div>

                  {/* Value */}
                  <p
                    className={`text-2xl font-black tabular-nums leading-none mb-0.5 ${
                      card.highlight ? 'text-gold' : 'text-white/80'
                    }`}
                  >
                    {card.value.toLocaleString()}
                  </p>

                  {/* Label */}
                  <p className="text-[9px] text-white/35 uppercase tracking-wider font-medium leading-tight">
                    {card.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ====== ACHIEVEMENTS ====== */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrophyIcon className="w-4 h-4 text-gold/50" />
              <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Achievements</span>
            </div>
            <span className="text-[10px] text-white/30 font-medium">
              {unlockedIds.length}/{ACHIEVEMENTS.length}
            </span>
          </div>

          {/* Scrollable row */}
          <div className="overflow-x-auto pb-2 -mx-4 px-4">
            <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
              {ACHIEVEMENTS.map((ach) => {
                const isUnlocked = unlockedIds.includes(ach.id);
                return (
                  <div
                    key={ach.id}
                    className="flex flex-col items-center gap-1.5 flex-shrink-0"
                    style={{ width: '72px' }}
                  >
                    {/* Badge circle */}
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl relative transition-all duration-300 ${
                        isUnlocked
                          ? 'bg-gold/15 border-2 border-gold/40'
                          : 'bg-white/[0.03] border border-white/[0.08]'
                      }`}
                      style={
                        isUnlocked
                          ? { boxShadow: '0 0 16px rgba(212,175,55,0.2), 0 0 4px rgba(212,175,55,0.1)' }
                          : {}
                      }
                    >
                      {isUnlocked ? (
                        <span style={{ filter: 'none' }}>{ach.icon}</span>
                      ) : (
                        <>
                          <span style={{ filter: 'grayscale(1) opacity(0.3)' }}>{ach.icon}</span>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <LockIcon className="w-4 h-4 text-white/20" />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Title */}
                    <p
                      className={`text-[9px] font-semibold text-center leading-tight ${
                        isUnlocked ? 'text-gold/80' : 'text-white/25'
                      }`}
                    >
                      {ach.title}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progress to next achievement */}
          {(() => {
            const nextAch = ACHIEVEMENTS.find((a) => !unlockedIds.includes(a.id));
            if (!nextAch) return null;
            return (
              <div
                className="mt-3 rounded-xl px-4 py-3 flex items-center gap-3"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <span className="text-lg flex-shrink-0" style={{ filter: 'grayscale(0.5)' }}>
                  {nextAch.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-white/50 font-semibold truncate">
                    Next: {nextAch.title}
                  </p>
                  <p className="text-[9px] text-white/25 truncate">{nextAch.desc}</p>
                </div>
                <div className="flex-shrink-0">
                  <svg className="w-4 h-4 text-gold/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            );
          })()}
        </div>

        {/* ====== RECENT MATCHES ====== */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Recent Matches</span>
            <span className="text-[10px] text-white/25 font-medium">Last 5</span>
          </div>

          {matchHistory.length === 0 ? (
            <div
              className="rounded-2xl py-8 flex flex-col items-center gap-2"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <GamepadIcon className="w-8 h-8 text-white/15" />
              <p className="text-sm text-white/25 font-medium">No matches yet</p>
              <p className="text-[10px] text-white/15">Play a game to see your history</p>
            </div>
          ) : (
            <div className="space-y-2">
              {matchHistory.map((match, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-400"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateY(0)' : 'translateY(10px)',
                    transition: `opacity 0.4s ease-out ${400 + idx * 70}ms, transform 0.4s ease-out ${400 + idx * 70}ms`,
                  }}
                >
                  {/* Date */}
                  <span className="text-[11px] text-white/35 font-medium w-16 flex-shrink-0">
                    {formatDate(match.date)}
                  </span>

                  {/* Score */}
                  <span className="text-sm font-bold text-white/80 tabular-nums w-12 flex-shrink-0">
                    {(match.score || 0).toLocaleString()}
                  </span>

                  {/* Combo */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <ZapIcon className="w-3 h-3 text-gold/50" />
                    <span className="text-[11px] text-gold/60 font-semibold tabular-nums">
                      {match.bestCombo || 0}x
                    </span>
                  </div>

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Mode badge */}
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 ${
                      match.mode === 'ranked'
                        ? 'bg-gold/10 text-gold/70 border border-gold/20'
                        : 'bg-white/[0.04] text-white/30 border border-white/[0.06]'
                    }`}
                  >
                    {match.mode || 'practice'}
                  </span>

                  {/* Verified check */}
                  {match.verified ? (
                    <CheckIcon className="w-3.5 h-3.5 text-success/70 flex-shrink-0" />
                  ) : (
                    <div className="w-3.5 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ====== BOTTOM SPACER ====== */}
        <div className="h-6" />
      </div>
    </div>
  );
}
