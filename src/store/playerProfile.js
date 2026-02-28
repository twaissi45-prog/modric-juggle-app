// ============================================
// Player Profile Store — localStorage-backed
// Persistent player identity, stats & history
// ============================================

const STORAGE_KEY = 'modric_juggle_profile';
const HISTORY_KEY = 'modric_juggle_history';
const MAX_HISTORY = 50;

// Preset avatars — emoji-based for simplicity
export const AVATARS = [
  { id: 0, emoji: '⚽', label: 'Football' },
  { id: 1, emoji: '🏆', label: 'Trophy' },
  { id: 2, emoji: '🦁', label: 'Lion' },
  { id: 3, emoji: '🔥', label: 'Fire' },
  { id: 4, emoji: '⭐', label: 'Star' },
  { id: 5, emoji: '🎯', label: 'Target' },
  { id: 6, emoji: '👑', label: 'Crown' },
  { id: 7, emoji: '🐐', label: 'GOAT' },
  { id: 8, emoji: '💎', label: 'Diamond' },
  { id: 9, emoji: '🌟', label: 'Glow Star' },
  { id: 10, emoji: '🥇', label: 'Gold Medal' },
  { id: 11, emoji: '🎖️', label: 'Medal' },
];

// Country flags for player nationality
export const COUNTRIES = [
  { code: 'HR', flag: '🇭🇷', name: 'Croatia' },
  { code: 'US', flag: '🇺🇸', name: 'United States' },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'BR', flag: '🇧🇷', name: 'Brazil' },
  { code: 'ES', flag: '🇪🇸', name: 'Spain' },
  { code: 'DE', flag: '🇩🇪', name: 'Germany' },
  { code: 'FR', flag: '🇫🇷', name: 'France' },
  { code: 'IT', flag: '🇮🇹', name: 'Italy' },
  { code: 'AR', flag: '🇦🇷', name: 'Argentina' },
  { code: 'PT', flag: '🇵🇹', name: 'Portugal' },
  { code: 'JP', flag: '🇯🇵', name: 'Japan' },
  { code: 'KR', flag: '🇰🇷', name: 'South Korea' },
  { code: 'MX', flag: '🇲🇽', name: 'Mexico' },
  { code: 'NL', flag: '🇳🇱', name: 'Netherlands' },
  { code: 'BE', flag: '🇧🇪', name: 'Belgium' },
  { code: 'TR', flag: '🇹🇷', name: 'Turkey' },
  { code: 'SA', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: 'AE', flag: '🇦🇪', name: 'UAE' },
  { code: 'EG', flag: '🇪🇬', name: 'Egypt' },
  { code: 'NG', flag: '🇳🇬', name: 'Nigeria' },
  { code: 'IN', flag: '🇮🇳', name: 'India' },
  { code: 'AU', flag: '🇦🇺', name: 'Australia' },
  { code: 'CA', flag: '🇨🇦', name: 'Canada' },
  { code: 'JO', flag: '🇯🇴', name: 'Jordan' },
];

// Achievement definitions
export const ACHIEVEMENTS = [
  { id: 'first_juggle', title: 'First Touch', desc: 'Complete your first juggling session', icon: '🎯', requirement: (s) => s.gamesPlayed >= 1 },
  { id: 'combo_10', title: 'Getting Warmed Up', desc: 'Reach a 10x combo streak', icon: '🔥', requirement: (s) => s.bestCombo >= 10 },
  { id: 'combo_25', title: 'On Fire', desc: 'Reach a 25x combo streak', icon: '💥', requirement: (s) => s.bestCombo >= 25 },
  { id: 'combo_50', title: 'Unstoppable', desc: 'Reach a 50x combo streak', icon: '⚡', requirement: (s) => s.bestCombo >= 50 },
  { id: 'score_100', title: 'Century Club', desc: 'Score 100+ in a single session', icon: '💯', requirement: (s) => s.bestScore >= 100 },
  { id: 'score_500', title: 'Half K', desc: 'Score 500+ in a single session', icon: '🏅', requirement: (s) => s.bestScore >= 500 },
  { id: 'score_1000', title: 'Grand Master', desc: 'Score 1000+ in a single session', icon: '👑', requirement: (s) => s.bestScore >= 1000 },
  { id: 'games_5', title: 'Regular', desc: 'Play 5 games', icon: '⭐', requirement: (s) => s.gamesPlayed >= 5 },
  { id: 'games_25', title: 'Dedicated', desc: 'Play 25 games', icon: '🌟', requirement: (s) => s.gamesPlayed >= 25 },
  { id: 'games_100', title: 'Veteran', desc: 'Play 100 games', icon: '🎖️', requirement: (s) => s.gamesPlayed >= 100 },
  { id: 'juggles_1000', title: 'Thousand Touches', desc: 'Total 1,000 juggles across all games', icon: '🏆', requirement: (s) => s.totalJuggles >= 1000 },
  { id: 'streak_3', title: 'Three-peat', desc: 'Play 3 days in a row', icon: '📅', requirement: (s) => s.currentStreak >= 3 },
  { id: 'streak_7', title: 'Week Warrior', desc: 'Play 7 days in a row', icon: '🗓️', requirement: (s) => s.currentStreak >= 7 },
  { id: 'verified', title: 'Verified Juggler', desc: 'Get AI-verified in a ranked session', icon: '✅', requirement: (s) => s.verifiedCount >= 1 },
];

// Default profile
function createDefaultProfile() {
  return {
    id: generateId(),
    playerName: '',
    avatarId: 0,
    countryCode: '',
    createdAt: Date.now(),
    lastPlayedAt: null,
    stats: {
      bestScore: 0,
      totalScore: 0,
      totalJuggles: 0,
      gamesPlayed: 0,
      bestCombo: 0,
      currentStreak: 0,
      bestStreak: 0,
      averageScore: 0,
      verifiedCount: 0,
      practiceGames: 0,
      rankedGames: 0,
      totalPlayTime: 0, // seconds
    },
    unlockedAchievements: [], // achievement ids
    setupComplete: false,
  };
}

function generateId() {
  return 'player_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

// --- Load / Save ---
export function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const profile = JSON.parse(raw);
      // Ensure all stats fields exist (migration)
      const defaults = createDefaultProfile();
      profile.stats = { ...defaults.stats, ...profile.stats };
      return profile;
    }
  } catch (e) {
    console.warn('Failed to load profile:', e);
  }
  return createDefaultProfile();
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.warn('Failed to save profile:', e);
  }
}

export function hasProfile() {
  const profile = loadProfile();
  return profile.setupComplete && profile.playerName.length > 0;
}

// --- Update Stats After Game ---
export function recordGameResult(result) {
  const profile = loadProfile();
  const stats = profile.stats;

  // Basic stats
  stats.gamesPlayed += 1;
  stats.totalScore += result.score || 0;
  stats.totalJuggles += result.touches || 0;
  stats.bestScore = Math.max(stats.bestScore, result.score || 0);
  stats.bestCombo = Math.max(stats.bestCombo, result.bestCombo || 0);
  stats.averageScore = Math.round(stats.totalScore / stats.gamesPlayed);
  stats.totalPlayTime += result.duration || 60;

  // Game mode tracking
  if (result.mode === 'practice') stats.practiceGames += 1;
  if (result.mode === 'ranked') stats.rankedGames += 1;

  // Verification tracking
  if (result.verified) stats.verifiedCount += 1;

  // Daily streak
  const today = new Date().toDateString();
  const lastPlayed = profile.lastPlayedAt ? new Date(profile.lastPlayedAt).toDateString() : null;
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  if (lastPlayed === yesterday) {
    stats.currentStreak += 1;
  } else if (lastPlayed !== today) {
    stats.currentStreak = 1;
  }
  stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);

  profile.lastPlayedAt = Date.now();

  // Check achievements
  const newlyUnlocked = [];
  for (const ach of ACHIEVEMENTS) {
    if (!profile.unlockedAchievements.includes(ach.id) && ach.requirement(stats)) {
      profile.unlockedAchievements.push(ach.id);
      newlyUnlocked.push(ach);
    }
  }

  saveProfile(profile);

  // Save to match history
  saveMatchToHistory({
    date: Date.now(),
    score: result.score || 0,
    touches: result.touches || 0,
    bestCombo: result.bestCombo || 0,
    mode: result.mode || 'practice',
    verified: result.verified || false,
    duration: result.duration || 60,
  });

  return { profile, newlyUnlocked };
}

// --- Match History ---
export function saveMatchToHistory(match) {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const history = raw ? JSON.parse(raw) : [];
    history.unshift(match);
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.warn('Failed to save match history:', e);
  }
}

export function loadMatchHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

// --- Get Rank Title ---
export function getRankTitle(stats) {
  const score = stats.bestScore;
  if (score >= 1000) return { title: 'Legend', color: '#FFD700', tier: 6 };
  if (score >= 500) return { title: 'Master', color: '#E040FB', tier: 5 };
  if (score >= 250) return { title: 'Diamond', color: '#00BCD4', tier: 4 };
  if (score >= 100) return { title: 'Gold', color: '#D4AF37', tier: 3 };
  if (score >= 50) return { title: 'Silver', color: '#B0BEC5', tier: 2 };
  if (score >= 10) return { title: 'Bronze', color: '#CD7F32', tier: 1 };
  return { title: 'Rookie', color: '#78909C', tier: 0 };
}

// --- Get Level from XP (total score) ---
export function getLevel(stats) {
  const xp = stats.totalScore;
  // Logarithmic leveling: level = floor(sqrt(xp / 10))
  const level = Math.floor(Math.sqrt(xp / 10));
  const currentLevelXP = level * level * 10;
  const nextLevelXP = (level + 1) * (level + 1) * 10;
  const progress = nextLevelXP > currentLevelXP
    ? (xp - currentLevelXP) / (nextLevelXP - currentLevelXP)
    : 0;
  return { level: Math.max(1, level), progress: Math.min(1, Math.max(0, progress)), xp };
}
