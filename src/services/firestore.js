// ============================================
// Firestore Service — Cloud Data Layer
// Player profiles, leaderboard, match history
// ============================================

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  increment,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// --- Player Profile ---

export async function getCloudProfile(uid) {
  const ref = doc(db, 'players', uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function createCloudProfile(uid, data) {
  const ref = doc(db, 'players', uid);
  await setDoc(ref, {
    ...data,
    uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateCloudProfile(uid, data) {
  const ref = doc(db, 'players', uid);
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// --- Sync Local Profile to Cloud ---
export async function syncProfileToCloud(uid, localProfile) {
  const existing = await getCloudProfile(uid);

  if (!existing) {
    // First time — create cloud profile
    await createCloudProfile(uid, {
      playerName: localProfile.playerName,
      avatarId: localProfile.avatarId,
      countryCode: localProfile.countryCode,
      stats: localProfile.stats,
      unlockedAchievements: localProfile.unlockedAchievements || [],
    });
  } else {
    // Merge — take the best stats
    const mergedStats = {
      bestScore: Math.max(existing.stats?.bestScore || 0, localProfile.stats.bestScore),
      totalScore: Math.max(existing.stats?.totalScore || 0, localProfile.stats.totalScore),
      totalJuggles: Math.max(existing.stats?.totalJuggles || 0, localProfile.stats.totalJuggles),
      gamesPlayed: Math.max(existing.stats?.gamesPlayed || 0, localProfile.stats.gamesPlayed),
      bestCombo: Math.max(existing.stats?.bestCombo || 0, localProfile.stats.bestCombo),
      bestStreak: Math.max(existing.stats?.bestStreak || 0, localProfile.stats.bestStreak),
      currentStreak: localProfile.stats.currentStreak,
      averageScore: localProfile.stats.averageScore,
      verifiedCount: Math.max(existing.stats?.verifiedCount || 0, localProfile.stats.verifiedCount),
      practiceGames: Math.max(existing.stats?.practiceGames || 0, localProfile.stats.practiceGames),
      rankedGames: Math.max(existing.stats?.rankedGames || 0, localProfile.stats.rankedGames),
      totalPlayTime: Math.max(existing.stats?.totalPlayTime || 0, localProfile.stats.totalPlayTime),
    };

    // Merge achievements
    const allAchievements = [...new Set([
      ...(existing.unlockedAchievements || []),
      ...(localProfile.unlockedAchievements || []),
    ])];

    await updateCloudProfile(uid, {
      playerName: localProfile.playerName,
      avatarId: localProfile.avatarId,
      countryCode: localProfile.countryCode,
      stats: mergedStats,
      unlockedAchievements: allAchievements,
    });
  }
}

// --- Record a Game to Cloud ---
export async function recordCloudGame(uid, gameResult) {
  // Update player stats atomically
  const playerRef = doc(db, 'players', uid);
  await updateDoc(playerRef, {
    'stats.gamesPlayed': increment(1),
    'stats.totalScore': increment(gameResult.score || 0),
    'stats.totalJuggles': increment(gameResult.touches || 0),
    'stats.totalPlayTime': increment(gameResult.duration || 60),
    updatedAt: serverTimestamp(),
  });

  // Check if new best score for leaderboard
  const profile = await getCloudProfile(uid);
  if (gameResult.score > (profile?.stats?.bestScore || 0)) {
    await updateDoc(playerRef, {
      'stats.bestScore': gameResult.score,
    });

    // Update leaderboard entry
    await updateLeaderboardEntry(uid, {
      playerName: profile.playerName,
      avatarId: profile.avatarId,
      countryCode: profile.countryCode,
      bestScore: gameResult.score,
      bestCombo: Math.max(gameResult.bestCombo || 0, profile?.stats?.bestCombo || 0),
      verified: gameResult.verified || false,
    });
  }
}

// --- Global Leaderboard ---

export async function updateLeaderboardEntry(uid, data) {
  const ref = doc(db, 'leaderboard', uid);
  await setDoc(ref, {
    ...data,
    uid,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function getLeaderboard(limitCount = 50) {
  const ref = collection(db, 'leaderboard');
  const q = query(ref, orderBy('bestScore', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((doc, index) => ({
    rank: index + 1,
    uid: doc.id,
    ...doc.data(),
  }));
}

export async function getCountryLeaderboard(countryCode, limitCount = 20) {
  const ref = collection(db, 'leaderboard');
  const q = query(
    ref,
    where('countryCode', '==', countryCode),
    orderBy('bestScore', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((doc, index) => ({
    rank: index + 1,
    uid: doc.id,
    ...doc.data(),
  }));
}

export async function getPlayerRank(uid) {
  // Get all leaderboard entries ordered by score
  const ref = collection(db, 'leaderboard');
  const q = query(ref, orderBy('bestScore', 'desc'));
  const snap = await getDocs(q);
  const index = snap.docs.findIndex(d => d.id === uid);
  return index >= 0 ? index + 1 : null;
}
