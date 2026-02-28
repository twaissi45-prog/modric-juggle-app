// ============================================
// MODRIĆ JUGGLE CHALLENGE — Main App
// Navigation + State + Profile + Transitions
// ============================================

import { useState, useCallback, useEffect, useRef } from 'react';
import './App.css';

import HomeScreen from './components/HomeScreen';
import EnvironmentCheck from './components/EnvironmentCheck';
import ActiveSession from './components/ActiveSession';
import ResultsScreen from './components/ResultsScreen';
import Leaderboard from './components/Leaderboard';
import DailyDrill from './components/DailyDrill';
import GhostDuel from './components/GhostDuel';
import ProfileScreen from './components/ProfileScreen';
import ProfileSetup from './components/ProfileSetup';
import VerificationEngine from './engine/verification';
import soundEngine from './engine/sounds';
import {
  loadProfile,
  saveProfile,
  hasProfile,
  recordGameResult,
} from './store/playerProfile';

// App screens
const SCREENS = {
  HOME: 'home',
  ENV_CHECK: 'envCheck',
  ACTIVE_SESSION: 'activeSession',
  RESULTS: 'results',
  LEADERBOARD: 'leaderboard',
  DAILY_DRILL: 'dailyDrill',
  GHOST_DUEL: 'ghostDuel',
  PROFILE: 'profile',
  PROFILE_SETUP: 'profileSetup',
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState(SCREENS.HOME);
  const [gameMode, setGameMode] = useState('practice');
  const [sessionData, setSessionData] = useState(null);
  const [drillConfig, setDrillConfig] = useState(null);
  const [challengeData, setChallengeData] = useState(null);
  const [userBestScore, setUserBestScore] = useState(null);
  const [profile, setProfile] = useState(() => loadProfile());
  const [newAchievements, setNewAchievements] = useState([]);

  // Screen transition state
  const [transitioning, setTransitioning] = useState(false);
  const [displayScreen, setDisplayScreen] = useState(() => {
    // Check if profile setup needed
    const p = loadProfile();
    if (!p.setupComplete || !p.playerName) return SCREENS.PROFILE_SETUP;
    return SCREENS.HOME;
  });
  const pendingScreenRef = useRef(null);

  // Initialize sound engine on first interaction
  useEffect(() => {
    const initSound = () => {
      soundEngine.init();
      soundEngine.resume();
      window.removeEventListener('click', initSound);
      window.removeEventListener('touchstart', initSound);
    };
    window.addEventListener('click', initSound);
    window.addEventListener('touchstart', initSound);
    return () => {
      window.removeEventListener('click', initSound);
      window.removeEventListener('touchstart', initSound);
    };
  }, []);

  // Load best score from profile on mount
  useEffect(() => {
    if (profile.stats.bestScore > 0) {
      setUserBestScore(profile.stats.bestScore);
    }
  }, []);

  // Smooth screen transition helper
  const transitionTo = useCallback((nextScreen) => {
    if (nextScreen === displayScreen) return;
    pendingScreenRef.current = nextScreen;
    setTransitioning(true);
    soundEngine.playClick();

    // After fade-out completes, swap screen and fade-in
    setTimeout(() => {
      setDisplayScreen(nextScreen);
      setCurrentScreen(nextScreen);
      setTransitioning(false);
    }, 200);
  }, [displayScreen]);

  // Parse challenge from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('score')) {
      setChallengeData({
        score: parseInt(params.get('score')) || 0,
        combo: parseInt(params.get('combo')) || 0,
        name: params.get('name') || 'Challenger',
      });
      setDisplayScreen(SCREENS.GHOST_DUEL);
      setCurrentScreen(SCREENS.GHOST_DUEL);
    }
  }, []);

  // Navigation handler
  const handleNavigate = useCallback((screen, data = {}) => {
    switch (screen) {
      case 'practice':
        setGameMode('practice');
        transitionTo(SCREENS.ENV_CHECK);
        break;
      case 'ranked':
        setGameMode('ranked');
        transitionTo(SCREENS.ENV_CHECK);
        break;
      case 'leaderboard':
        transitionTo(SCREENS.LEADERBOARD);
        break;
      case 'dailyDrill':
        transitionTo(SCREENS.DAILY_DRILL);
        break;
      case 'profile':
        transitionTo(SCREENS.PROFILE);
        break;
      case 'howItWorks':
        break;
      default:
        transitionTo(screen);
    }
  }, [transitionTo]);

  // Profile setup complete
  const handleProfileSetupComplete = useCallback(({ playerName, avatarId, countryCode }) => {
    const updatedProfile = {
      ...profile,
      playerName,
      avatarId,
      countryCode,
      setupComplete: true,
    };
    saveProfile(updatedProfile);
    setProfile(updatedProfile);
    soundEngine.playSessionComplete();
    transitionTo(SCREENS.HOME);
  }, [profile, transitionTo]);

  // Profile save (from ProfileScreen edit)
  const handleProfileSave = useCallback((updatedProfile) => {
    saveProfile(updatedProfile);
    setProfile(updatedProfile);
    soundEngine.playClick();
  }, []);

  // Environment check passed
  const handleEnvReady = useCallback(() => {
    transitionTo(SCREENS.ACTIVE_SESSION);
  }, [transitionTo]);

  // Session ended
  const handleSessionEnd = useCallback((data) => {
    const verification = VerificationEngine.verify({
      avgPoseConfidence: data.avgPoseConfidence || 0.7,
      avgBallConfidence: data.avgBallConfidence || 0.5,
      bodyVisibilityPercent: data.bodyVisibilityPercent || 85,
      maxBallJump: data.maxBallJump || 100,
      maxBallAccel: data.maxBallAccel || 300,
    });

    const fullSessionData = { ...data, verification, gameMode };
    setSessionData(fullSessionData);

    if (!userBestScore || data.totalScore > userBestScore) {
      setUserBestScore(data.totalScore);
    }

    // Record game result to profile
    const { profile: updatedProfile, newlyUnlocked } = recordGameResult({
      score: data.totalScore || 0,
      touches: data.totalTouches || 0,
      bestCombo: data.bestCombo || 0,
      mode: gameMode,
      verified: verification.verified || false,
      duration: data.duration || 60,
    });
    setProfile(updatedProfile);

    // Show achievement notifications
    if (newlyUnlocked.length > 0) {
      setNewAchievements(newlyUnlocked);
      // Auto-dismiss after 4 seconds
      setTimeout(() => setNewAchievements([]), 4000);
      soundEngine.playComboMilestone(50);
    }

    transitionTo(SCREENS.RESULTS);
  }, [gameMode, userBestScore, transitionTo]);

  // Daily drill start
  const handleDrillStart = useCallback((drill) => {
    setGameMode('drill');
    setDrillConfig(drill);
    transitionTo(SCREENS.ENV_CHECK);
  }, [transitionTo]);

  // Play again
  const handlePlayAgain = useCallback(() => {
    setSessionData(null);
    transitionTo(SCREENS.ENV_CHECK);
  }, [transitionTo]);

  // Share challenge
  const handleShare = useCallback(() => {
    transitionTo(SCREENS.GHOST_DUEL);
  }, [transitionTo]);

  // Go home
  const handleHome = useCallback(() => {
    setSessionData(null);
    setDrillConfig(null);
    setChallengeData(null);
    transitionTo(SCREENS.HOME);
  }, [transitionTo]);

  // Play from duel
  const handleDuelPlay = useCallback(() => {
    setGameMode('ranked');
    transitionTo(SCREENS.ENV_CHECK);
  }, [transitionTo]);

  // Render current screen
  const renderScreen = () => {
    switch (displayScreen) {
      case SCREENS.PROFILE_SETUP:
        return <ProfileSetup onComplete={handleProfileSetupComplete} />;
      case SCREENS.HOME:
        return <HomeScreen onNavigate={handleNavigate} profile={profile} />;
      case SCREENS.PROFILE:
        return (
          <ProfileScreen
            profile={profile}
            onSave={handleProfileSave}
            onBack={handleHome}
            onNavigate={handleNavigate}
          />
        );
      case SCREENS.ENV_CHECK:
        return (
          <EnvironmentCheck
            onReady={handleEnvReady}
            onBack={handleHome}
            gameMode={gameMode}
          />
        );
      case SCREENS.ACTIVE_SESSION:
        return (
          <ActiveSession
            gameMode={gameMode}
            drillConfig={drillConfig}
            onSessionEnd={handleSessionEnd}
          />
        );
      case SCREENS.RESULTS:
        return (
          <ResultsScreen
            sessionData={sessionData}
            profile={profile}
            onPlayAgain={handlePlayAgain}
            onLeaderboard={() => transitionTo(SCREENS.LEADERBOARD)}
            onShare={handleShare}
            onHome={handleHome}
          />
        );
      case SCREENS.LEADERBOARD:
        return (
          <Leaderboard
            onBack={handleHome}
            userScore={userBestScore}
            profile={profile}
          />
        );
      case SCREENS.DAILY_DRILL:
        return (
          <DailyDrill
            onStart={handleDrillStart}
            onBack={handleHome}
          />
        );
      case SCREENS.GHOST_DUEL:
        return (
          <GhostDuel
            challengeData={challengeData}
            sessionData={sessionData}
            onPlay={handleDuelPlay}
            onBack={() => transitionTo(sessionData ? SCREENS.RESULTS : SCREENS.HOME)}
            onHome={handleHome}
          />
        );
      default:
        return <HomeScreen onNavigate={handleNavigate} profile={profile} />;
    }
  };

  return (
    <div className="w-full h-full bg-[#1A1A2E] relative overflow-hidden">
      <div
        className="w-full h-full transition-all duration-200 ease-in-out"
        style={{
          opacity: transitioning ? 0 : 1,
          transform: transitioning ? 'scale(0.98)' : 'scale(1)',
        }}
      >
        {renderScreen()}
      </div>

      {/* Achievement unlock notification overlay */}
      {newAchievements.length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] flex flex-col gap-2 pointer-events-none">
          {newAchievements.map((ach, i) => (
            <div
              key={ach.id}
              className="flex items-center gap-3 px-5 py-3 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(26,26,46,0.95))',
                border: '1px solid rgba(212,175,55,0.5)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(212,175,55,0.25), 0 0 60px rgba(212,175,55,0.1)',
                animation: `slide-up 0.5s ease-out ${i * 0.15}s both`,
              }}
            >
              <span className="text-2xl">{ach.icon}</span>
              <div>
                <div className="text-xs text-gold/70 uppercase tracking-wider font-bold">Achievement Unlocked!</div>
                <div className="text-sm font-bold text-white">{ach.title}</div>
                <div className="text-[10px] text-white/50">{ach.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
