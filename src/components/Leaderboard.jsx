// ============================================
// Leaderboard — Global / Country / Friends
// Ranked player list with animated rows
// ============================================

import { useState, useEffect } from 'react';
import Football3D from './three/Football3D';

/* ---- Mock data ---- */

const MOCK_PLAYERS = [
  { rank: 1, name: 'LukaM10', score: 98750, country: '\uD83C\uDDED\uD83C\uDDF7', verified: true },
  { rank: 2, name: 'JogaBonito', score: 94320, country: '\uD83C\uDDE7\uD83C\uDDF7', verified: true },
  { rank: 3, name: 'TikiTaka99', score: 91800, country: '\uD83C\uDDEA\uD83C\uDDF8', verified: true },
  { rank: 4, name: 'FreestyleKing', score: 88540, country: '\uD83C\uDDEB\uD83C\uDDF7', verified: true },
  { rank: 5, name: 'BallMaster_DE', score: 85200, country: '\uD83C\uDDE9\uD83C\uDDEA', verified: true },
  { rank: 6, name: 'FutbolAce', score: 82400, country: '\uD83C\uDDE6\uD83C\uDDF7', verified: false },
  { rank: 7, name: 'SkillzNL', score: 79870, country: '\uD83C\uDDF3\uD83C\uDDF1', verified: true },
  { rank: 8, name: 'TouchMaster', score: 76500, country: '\uD83C\uDDEC\uD83C\uDDE7', verified: true },
  { rank: 9, name: 'DribblerIT', score: 73200, country: '\uD83C\uDDEE\uD83C\uDDF9', verified: false },
  { rank: 10, name: 'JuggleProJP', score: 70100, country: '\uD83C\uDDEF\uD83C\uDDF5', verified: true },
  { rank: 11, name: 'KickFlipPT', score: 67800, country: '\uD83C\uDDF5\uD83C\uDDF9', verified: true },
  { rank: 12, name: 'BalonKR', score: 64500, country: '\uD83C\uDDF0\uD83C\uDDF7', verified: false },
  { rank: 13, name: 'VolleyKingUS', score: 61200, country: '\uD83C\uDDFA\uD83C\uDDF8', verified: true },
  { rank: 14, name: 'StrikerNG', score: 58700, country: '\uD83C\uDDF3\uD83C\uDDEC', verified: true },
  { rank: 15, name: 'TekkersMX', score: 55300, country: '\uD83C\uDDF2\uD83C\uDDFD', verified: false },
];

const COUNTRY_PLAYERS = [
  { rank: 1, name: 'LukaM10', score: 98750, country: '\uD83C\uDDED\uD83C\uDDF7', verified: true },
  { rank: 2, name: 'ZagrebZlatko', score: 62400, country: '\uD83C\uDDED\uD83C\uDDF7', verified: true },
  { rank: 3, name: 'DalmatiaBall', score: 51800, country: '\uD83C\uDDED\uD83C\uDDF7', verified: false },
  { rank: 4, name: 'SplitJuggler', score: 48200, country: '\uD83C\uDDED\uD83C\uDDF7', verified: true },
  { rank: 5, name: 'RijekaTrick', score: 44100, country: '\uD83C\uDDED\uD83C\uDDF7', verified: false },
];

const FRIENDS_PLAYERS = [
  { rank: 1, name: 'BestMate', score: 74200, country: '\uD83C\uDDEC\uD83C\uDDE7', verified: true },
  { rank: 2, name: 'SquadGoals', score: 61500, country: '\uD83C\uDDE9\uD83C\uDDEA', verified: true },
  { rank: 3, name: 'ParkKicker', score: 53800, country: '\uD83C\uDDFA\uD83C\uDDF8', verified: false },
  { rank: 4, name: 'WkndWarrior', score: 42100, country: '\uD83C\uDDEB\uD83C\uDDF7', verified: true },
  { rank: 5, name: 'CasualTouch', score: 31900, country: '\uD83C\uDDEA\uD83C\uDDF8', verified: false },
];

const TABS = [
  { id: 'global', label: 'Global', data: MOCK_PLAYERS },
  { id: 'country', label: 'Country', data: COUNTRY_PLAYERS },
  { id: 'friends', label: 'Friends', data: FRIENDS_PLAYERS },
];

export default function Leaderboard({ onBack, userScore }) {
  const [activeTab, setActiveTab] = useState('global');
  const [visible, setVisible] = useState(false);
  const [rowsVisible, setRowsVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 60);
    const t2 = setTimeout(() => setRowsVisible(true), 300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Reset row animation on tab change
  useEffect(() => {
    setRowsVisible(false);
    const t = setTimeout(() => setRowsVisible(true), 80);
    return () => clearTimeout(t);
  }, [activeTab]);

  const currentTab = TABS.find((t) => t.id === activeTab);
  const players = currentTab?.data || [];

  // Determine if userScore matches any player
  const userRank = userScore
    ? players.findIndex((p) => p.score === userScore)
    : -1;

  const rankColor = (rank) => {
    if (rank === 1) return 'text-gold';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-amber-700';
    return 'text-white/40';
  };

  const rankBg = (rank) => {
    if (rank === 1) return 'bg-gold/[0.08] border-gold/20';
    if (rank === 2) return 'bg-gray-300/[0.05] border-gray-400/15';
    if (rank === 3) return 'bg-amber-700/[0.06] border-amber-700/15';
    return 'bg-white/[0.02] border-white/[0.05]';
  };

  const medalIcon = (rank) => {
    if (rank === 1) return '\uD83E\uDD47';
    if (rank === 2) return '\uD83E\uDD48';
    if (rank === 3) return '\uD83E\uDD49';
    return null;
  };

  return (
    <div className="relative w-full h-full bg-navy overflow-hidden flex flex-col select-none">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-gold/[0.03] blur-[100px]" />
      </div>

      {/* Content */}
      <div
        className="relative z-10 flex flex-col h-full transition-all duration-700 ease-out"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(30px)',
        }}
      >
        {/* Top bar */}
        <div className="flex items-center px-4 pt-4 pb-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span className="text-sm">Back</span>
          </button>

          {/* Small football decoration */}
          <div className="ml-auto">
            <Football3D size={60} spin bounce={false} glow={false} />
          </div>
        </div>

        {/* Title */}
        <div className="px-6 pb-4">
          <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
          <p className="text-sm text-white/40 mt-0.5">Compete with the world</p>
        </div>

        {/* Tabs */}
        <div className="px-6 mb-4">
          <div className="flex bg-white/[0.04] rounded-xl p-1 border border-white/[0.06]">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-gold/15 text-gold shadow-sm'
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Player list (scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="space-y-2">
            {players.map((player, idx) => {
              const isUser = userScore != null && player.score === userScore;
              const medal = medalIcon(player.rank);

              return (
                <div
                  key={`${activeTab}-${player.rank}`}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-500 ${
                    isUser
                      ? 'bg-gold/[0.12] border-gold/30 ring-1 ring-gold/20'
                      : rankBg(player.rank)
                  }`}
                  style={{
                    opacity: rowsVisible ? 1 : 0,
                    transform: rowsVisible ? 'translateY(0)' : 'translateY(16px)',
                    transition: `opacity 0.4s ease-out ${idx * 50}ms, transform 0.4s ease-out ${idx * 50}ms`,
                  }}
                >
                  {/* Rank */}
                  <div className="w-8 text-center shrink-0">
                    {medal ? (
                      <span className="text-lg">{medal}</span>
                    ) : (
                      <span className={`text-sm font-bold tabular-nums ${rankColor(player.rank)}`}>
                        {player.rank}
                      </span>
                    )}
                  </div>

                  {/* Flag */}
                  <span className="text-lg shrink-0">{player.country}</span>

                  {/* Name */}
                  <span
                    className={`flex-1 text-sm font-semibold truncate ${
                      isUser ? 'text-gold' : 'text-white/80'
                    }`}
                  >
                    {player.name}
                    {isUser && (
                      <span className="ml-1.5 text-[10px] text-gold/60 uppercase tracking-wider">
                        (You)
                      </span>
                    )}
                  </span>

                  {/* Score */}
                  <span
                    className={`text-sm font-bold tabular-nums shrink-0 ${
                      isUser ? 'text-gold' : player.rank <= 3 ? rankColor(player.rank) : 'text-white/60'
                    }`}
                  >
                    {player.score.toLocaleString()}
                  </span>

                  {/* Verified badge */}
                  {player.verified && (
                    <svg
                      className="w-4 h-4 text-success/70 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  {!player.verified && <div className="w-4 shrink-0" />}
                </div>
              );
            })}
          </div>

          {/* User score insert if not in list */}
          {userScore != null && userRank === -1 && (
            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gold/[0.12] border border-gold/30 ring-1 ring-gold/20">
                <div className="w-8 text-center shrink-0">
                  <span className="text-sm font-bold text-gold tabular-nums">--</span>
                </div>
                <span className="text-lg shrink-0">{'\uD83C\uDDED\uD83C\uDDF7'}</span>
                <span className="flex-1 text-sm font-semibold text-gold truncate">
                  You
                </span>
                <span className="text-sm font-bold text-gold tabular-nums shrink-0">
                  {userScore.toLocaleString()}
                </span>
                <div className="w-4 shrink-0" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
