// ============================================
// ActiveSession — Core Gameplay Screen
// Camera feed, pose detection, ball tracking,
// touch detection, scoring, HUD overlay
// Now with TensorFlow.js COCO-SSD ML detection
// ============================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { PoseDetector } from '../engine/poseDetection.js';
import { BallTracker, MLBallDetector, BALL_STATES } from '../engine/ballTracking.js';
import { TouchDetector } from '../engine/touchDetection.js';
import { ScoringEngine, COMBO_TIERS } from '../engine/scoring.js';

// --- SVG Icons for HUD ---
function FootIcon({ active }) {
  return (
    <svg className={`w-6 h-6 transition-colors duration-200 ${active ? 'text-success' : 'text-white/20'}`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C8 2 4 6 4 10c0 5 4 7 4 12h8c0-5 4-7 4-12 0-4-4-8-8-8zm-1 16H9c0-3-3-4.5-3-9 0-3.3 2.7-6 6-6v15zm2 0V3c3.3 0 6 2.7 6 6 0 4.5-3 6-3 9h-3z" />
    </svg>
  );
}

function ThighIcon({ active }) {
  return (
    <svg className={`w-6 h-6 transition-colors duration-200 ${active ? 'text-success' : 'text-white/20'}`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 3h6v2H9zM8 7h8l1 8H7zM8 17h8l-1 4H9z" />
    </svg>
  );
}

function HeadIcon({ active }) {
  return (
    <svg className={`w-6 h-6 transition-colors duration-200 ${active ? 'text-success' : 'text-white/20'}`} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="8" r="5" />
      <path d="M8 14h8v2H8z" />
    </svg>
  );
}

function StopIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}

function PauseIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

// --- Format time (seconds) to mm:ss ---
function formatTime(seconds) {
  const m = Math.floor(Math.abs(seconds) / 60);
  const s = Math.floor(Math.abs(seconds) % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ============================================
// Main Component
// ============================================
export default function ActiveSession({ gameMode = 'practice', drillConfig = null, onSessionEnd }) {
  // --- Core state ---
  const [score, setScore] = useState(0);
  const [touches, setTouches] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [multiplier, setMultiplier] = useState({ multiplier: 1.0, label: '' });
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [countdownValue, setCountdownValue] = useState(null);
  const [drops, setDrops] = useState(0);

  // --- ML loading state ---
  const [mlLoadingStatus, setMlLoadingStatus] = useState('loading'); // 'loading' | 'ready' | 'fallback'
  const [loadingStep, setLoadingStep] = useState('camera'); // 'camera' | 'pose' | 'ml' | 'done'

  // --- UI effect state ---
  const [showDrop, setShowDrop] = useState(false);
  const [lastTouchZone, setLastTouchZone] = useState(null);
  const [touchFlash, setTouchFlash] = useState(null);
  const [comboAnim, setComboAnim] = useState(0);
  const [cameraError, setCameraError] = useState(null);

  // Active body zones (flash green on touch)
  const [activeZones, setActiveZones] = useState({ foot: false, thigh: false, head: false });

  // --- AR Debug state (updated periodically, not every frame) ---
  const [debugInfo, setDebugInfo] = useState({
    poseDetected: false,
    poseInit: false,
    ballDetected: false,
    ballSource: 'None',
    ballConf: 0,
    mlStatus: 'loading',
  });

  // --- Refs ---
  const videoRef = useRef(null);
  const poseCanvasRef = useRef(null);
  const ballCanvasRef = useRef(null);
  const poseDetectorRef = useRef(null);
  const ballTrackerRef = useRef(null);
  const touchDetectorRef = useRef(null);
  const scoringEngineRef = useRef(null);
  const mlDetectorRef = useRef(null);
  const animFrameRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const sessionStartTimeRef = useRef(null);
  const isRunningRef = useRef(false);
  const wasBallDropped = useRef(false);
  const streamRef = useRef(null);
  const mlLoopRef = useRef(null);
  const canvasSizedRef = useRef(false);
  const lastDebugUpdateRef = useRef(0);

  // Keep isRunning ref in sync
  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  // --- Initialize engines ---
  const initEngines = useCallback(() => {
    poseDetectorRef.current = new PoseDetector();
    ballTrackerRef.current = new BallTracker();
    touchDetectorRef.current = new TouchDetector();
    scoringEngineRef.current = new ScoringEngine();
    mlDetectorRef.current = new MLBallDetector();

    // Wire up scoring callbacks
    scoringEngineRef.current.onScoreUpdate = (scoreData) => {
      setScore(scoreData.totalScore);
      setCombo(scoreData.combo);
      setTouches((prev) => prev + 0); // touches updated via touch callback
      const tier = COMBO_TIERS.find(
        (t) => scoreData.combo >= t.min && scoreData.combo <= t.max
      );
      if (tier) setMultiplier(tier);
    };

    scoringEngineRef.current.onComboBroken = (brokenCombo) => {
      setCombo(0);
      setMultiplier(COMBO_TIERS[0]);
    };

    scoringEngineRef.current.onComboMilestone = (comboVal, label) => {
      setComboAnim((prev) => prev + 1);
    };

    // Wire up touch callback
    touchDetectorRef.current.onTouch = (touchData) => {
      const se = scoringEngineRef.current;
      se.registerTouch(touchData);

      setTouches(se.totalTouches);
      setScore(Math.round(se.totalScore * 10) / 10);
      setCombo(se.currentCombo);
      if (se.currentCombo > bestCombo) {
        setBestCombo(se.currentCombo);
      }

      // Flash touch zone
      const zoneType = touchData.type;
      setActiveZones((prev) => ({ ...prev, [zoneType]: true }));
      setTimeout(() => {
        setActiveZones((prev) => ({ ...prev, [zoneType]: false }));
      }, 400);

      // Touch flash effect
      setTouchFlash({ x: touchData.position.x, y: touchData.position.y, id: Date.now() });
      setTimeout(() => setTouchFlash(null), 600);

      setLastTouchZone(touchData.label);
      setComboAnim((prev) => prev + 1);

      // Reset drop state on touch
      wasBallDropped.current = false;
    };
  }, [bestCombo]);

  // --- Start camera ---
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30, min: 15 }, // Request 30fps for smoother tracking
        },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      return true;
    } catch (err) {
      console.error('Camera access failed:', err);
      setCameraError(err.message || 'Camera access denied');
      return false;
    }
  }, []);

  // --- Stop camera ---
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // --- Async ML detection loop (runs independently from game loop) ---
  const startMLDetectionLoop = useCallback(() => {
    const mlDetector = mlDetectorRef.current;
    const video = videoRef.current;

    if (!mlDetector || !mlDetector.isReady || !video) return;

    async function mlLoop() {
      if (!isRunningRef.current) return;

      try {
        const result = await mlDetector.detect(video);
        // Result is stored in mlDetector.lastDetection and picked up by game loop
      } catch (err) {
        // Silently continue
      }

      // Schedule next ML detection (150ms = ~7 Hz)
      mlLoopRef.current = setTimeout(mlLoop, 150);
    }

    mlLoop();
  }, []);

  // --- Game loop ---
  const gameLoop = useCallback(() => {
    if (!isRunningRef.current) return;

    const video = videoRef.current;
    const pose = poseDetectorRef.current;
    const ball = ballTrackerRef.current;
    const touch = touchDetectorRef.current;
    const mlDetector = mlDetectorRef.current;

    if (!video || !pose || !ball || !touch) {
      animFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    // Video dimensions
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;

    // Size canvases to match video (only when dimensions change)
    if (vw > 0 && vh > 0) {
      if (poseCanvasRef.current && poseCanvasRef.current.width !== vw) {
        poseCanvasRef.current.width = vw;
        poseCanvasRef.current.height = vh;
      }
      if (ballCanvasRef.current && ballCanvasRef.current.width !== vw) {
        ballCanvasRef.current.width = vw;
        ballCanvasRef.current.height = vh;
      }
    }

    try {
      // 1. Send frame to pose detector (async, results come via callback)
      if (pose.isInitialized) {
        pose.sendFrame(video);
      }

      // 2. Get latest ML detection (non-blocking — uses cached result)
      const mlResult = mlDetector && mlDetector.isReady
        ? mlDetector.lastDetection
        : null;

      // 3. Process ball tracking with ML result (if available)
      ball.processFrame(video, pose, mlResult);

      // 4. Check for touches
      touch.checkTouch(ball, pose, vw, vh);

      // 5. Check for drops
      if (ball.state === BALL_STATES.DROPPED && !wasBallDropped.current) {
        wasBallDropped.current = true;
        const se = scoringEngineRef.current;
        se.registerDrop();
        setDrops(se.drops);
        setCombo(0);
        setMultiplier(COMBO_TIERS[0]);

        setShowDrop(true);
        setTimeout(() => setShowDrop(false), 800);
      }

      if (ball.state === BALL_STATES.TRACKING) {
        wasBallDropped.current = false;
      }

      // 6. Draw pose skeleton overlay (AR wireframe)
      if (poseCanvasRef.current) {
        try {
          const ctx = poseCanvasRef.current.getContext('2d');
          pose.drawSkeleton(ctx, vw, vh);
        } catch (drawErr) { /* skip frame */ }
      }

      // 7. Draw ball indicator overlay (AR ball tracking)
      if (ballCanvasRef.current) {
        try {
          const ctx = ballCanvasRef.current.getContext('2d');
          ctx.clearRect(0, 0, vw, vh);
          ball.drawBallIndicator(ctx, vw, vh);
        } catch (drawErr) { /* skip frame */ }
      }

      // 8. Update debug info periodically (every 400ms to avoid re-render spam)
      const now = Date.now();
      if (now - lastDebugUpdateRef.current > 400) {
        lastDebugUpdateRef.current = now;
        setDebugInfo({
          poseDetected: !!pose.landmarks,
          poseInit: pose.isInitialized,
          ballDetected: ball.state === BALL_STATES.TRACKING,
          ballSource: ball.lastMLResult ? 'ML' : ball.position ? 'Motion' : 'None',
          ballConf: Math.round(ball.confidence * 100),
          mlStatus: mlDetector
            ? mlDetector.isReady ? 'ready' : mlDetector.isLoading ? 'loading' : 'failed'
            : 'none',
        });
      }
    } catch (err) {
      // Silently continue — single frame error shouldn't crash the loop
    }

    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, []);

  // --- Timer logic ---
  const startTimer = useCallback(() => {
    sessionStartTimeRef.current = Date.now();

    if (gameMode === 'ranked' || (gameMode === 'drill' && drillConfig?.timed)) {
      // Countdown timer
      const timeLimit = drillConfig?.timeLimit || 60;
      setTimer(timeLimit);

      timerIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
        const remaining = timeLimit - elapsed;

        if (remaining <= 0) {
          setTimer(0);
          endSession();
        } else {
          setTimer(remaining);
        }
      }, 200);
    } else {
      // Count-up timer for practice
      setTimer(0);
      timerIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
        setTimer(elapsed);
      }, 200);
    }
  }, [gameMode, drillConfig]);

  // --- End session ---
  const endSession = useCallback(() => {
    setIsRunning(false);

    // Stop ML detection loop
    if (mlLoopRef.current) {
      clearTimeout(mlLoopRef.current);
      mlLoopRef.current = null;
    }

    // Stop timers and animation frame
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    // Collect session data
    const se = scoringEngineRef.current;
    const pd = poseDetectorRef.current;
    const bt = ballTrackerRef.current;
    const td = touchDetectorRef.current;

    const duration = sessionStartTimeRef.current
      ? Math.floor((Date.now() - sessionStartTimeRef.current) / 1000)
      : 0;

    const sessionData = {
      totalScore: se ? Math.round(se.totalScore * 10) / 10 : 0,
      score: se ? Math.round(se.totalScore * 10) / 10 : 0,
      totalTouches: se ? se.totalTouches : 0,
      touches: se ? se.totalTouches : 0,
      bestCombo: se ? se.bestCombo : 0,
      combo: se ? se.bestCombo : 0,
      drops: se ? se.drops : 0,
      duration,
      gameMode,
      touchBreakdown: td ? td.getTouchBreakdown() : { foot: 0, thigh: 0, head: 0 },
      avgPoseConfidence: pd ? pd.getAverageSessionConfidence() : 0,
      avgBallConfidence: bt ? bt.getAverageSessionConfidence() : 0,
      bodyVisibilityPercent: pd ? pd.getBodyFillPercent(480) : 0,
      maxBallJump: 0,
      maxBallAccel: 0,
    };

    // Stop camera
    stopCamera();

    if (onSessionEnd) {
      onSessionEnd(sessionData);
    }
  }, [gameMode, onSessionEnd, stopCamera]);

  // --- Start game (after countdown or immediately) ---
  const startGame = useCallback(() => {
    setIsRunning(true);
    startTimer();
    gameLoop();

    // Start ML detection loop (runs async alongside game loop)
    startMLDetectionLoop();
  }, [startTimer, gameLoop, startMLDetectionLoop]);

  // --- Countdown sequence for ranked/drill ---
  const startCountdown = useCallback(() => {
    let count = 3;
    setCountdownValue(count);

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdownValue(count);
      } else if (count === 0) {
        setCountdownValue('GO!');
      } else {
        clearInterval(interval);
        setCountdownValue(null);
        startGame();
      }
    }, 1000);
  }, [startGame]);

  // --- Initialize on mount ---
  useEffect(() => {
    let mounted = true;

    async function init() {
      // 1. Initialize engines
      initEngines();

      // 2. Start camera
      setLoadingStep('camera');
      const cameraOk = await startCamera();
      if (!cameraOk || !mounted) return;

      // 3. Initialize pose detector
      setLoadingStep('pose');
      const pd = poseDetectorRef.current;
      if (pd && videoRef.current) {
        try {
          await pd.initialize(videoRef.current, () => {});
        } catch (err) {
          console.error('Pose init error:', err);
        }
      }

      // 4. Initialize ML ball detector (async, don't block game start)
      setLoadingStep('ml');
      const mlDetector = mlDetectorRef.current;
      if (mlDetector) {
        setMlLoadingStatus('loading');
        mlDetector.initialize().then(() => {
          if (!mounted) return;
          if (mlDetector.isReady) {
            setMlLoadingStatus('ready');
            setLoadingStep('done');
            console.log('[ActiveSession] ML ball detection ready');
            if (isRunningRef.current) {
              startMLDetectionLoop();
            }
          } else {
            setMlLoadingStatus('fallback');
            setLoadingStep('done');
            console.log('[ActiveSession] ML failed, using motion-only tracking');
          }
        });
      }

      // 5. Start countdown or game immediately (don't wait for ML)
      if (!mounted) return;
      setLoadingStep('done');

      if (gameMode === 'ranked' || gameMode === 'drill') {
        startCountdown();
      } else {
        startGame();
      }
    }

    init();

    return () => {
      mounted = false;

      // Cleanup
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (mlLoopRef.current) clearTimeout(mlLoopRef.current);
      stopCamera();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Get multiplier label for display ---
  const multiplierLabel = multiplier.label || '';
  const isCountingDown = countdownValue !== null;
  const isTimedMode = gameMode === 'ranked' || (gameMode === 'drill' && drillConfig?.timed);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none">
      {/* Camera feed */}
      <video
        ref={videoRef}
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* Pose skeleton overlay */}
      <canvas
        ref={poseCanvasRef}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* Ball tracking overlay */}
      <canvas
        ref={ballCanvasRef}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* Dark overlay gradient for HUD readability */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      {/* ==== Loading Progress Overlay ==== */}
      {loadingStep !== 'done' && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center px-8">
          {/* Animated football icon */}
          <div className="w-16 h-16 mb-6 relative">
            <svg viewBox="0 0 64 64" className="w-full h-full animate-bounce" style={{ animationDuration: '1.5s' }}>
              <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(212,175,55,0.6)" strokeWidth="2" />
              <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(212,175,55,1)" strokeWidth="2"
                strokeDasharray="176" strokeDashoffset={loadingStep === 'camera' ? '132' : loadingStep === 'pose' ? '88' : loadingStep === 'ml' ? '44' : '0'}
                style={{ transition: 'stroke-dashoffset 0.5s ease', transform: 'rotate(-90deg)', transformOrigin: 'center' }} />
              <text x="32" y="36" textAnchor="middle" fill="white" fontSize="20">⚽</text>
            </svg>
          </div>

          {/* Loading title */}
          <h3 className="text-white font-bold text-lg mb-2">Setting Up AR</h3>

          {/* Progress steps */}
          <div className="w-full max-w-xs space-y-2.5 mb-4">
            {/* Camera */}
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                loadingStep === 'camera' ? 'bg-gold/20 border border-gold/50 text-gold animate-pulse' :
                'bg-success/20 border border-success/50 text-success'
              }`}>
                {loadingStep === 'camera' ? '•' : '✓'}
              </div>
              <span className={`text-sm flex-1 ${loadingStep === 'camera' ? 'text-white' : 'text-white/50'}`}>
                Camera Access
              </span>
              {loadingStep === 'camera' && <div className="w-3 h-3 border-2 border-gold border-t-transparent rounded-full animate-spin" />}
            </div>

            {/* Pose */}
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                loadingStep === 'pose' ? 'bg-gold/20 border border-gold/50 text-gold animate-pulse' :
                loadingStep === 'camera' ? 'bg-white/10 border border-white/20 text-white/30' :
                'bg-success/20 border border-success/50 text-success'
              }`}>
                {loadingStep === 'pose' ? '•' : loadingStep === 'camera' ? '2' : '✓'}
              </div>
              <span className={`text-sm flex-1 ${loadingStep === 'pose' ? 'text-white' : loadingStep === 'camera' ? 'text-white/30' : 'text-white/50'}`}>
                Body Detection AI
              </span>
              {loadingStep === 'pose' && <div className="w-3 h-3 border-2 border-gold border-t-transparent rounded-full animate-spin" />}
            </div>

            {/* ML Ball */}
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                loadingStep === 'ml' ? 'bg-gold/20 border border-gold/50 text-gold animate-pulse' :
                (loadingStep === 'camera' || loadingStep === 'pose') ? 'bg-white/10 border border-white/20 text-white/30' :
                'bg-success/20 border border-success/50 text-success'
              }`}>
                {loadingStep === 'ml' ? '•' : (loadingStep === 'camera' || loadingStep === 'pose') ? '3' : '✓'}
              </div>
              <span className={`text-sm flex-1 ${loadingStep === 'ml' ? 'text-white' : (loadingStep === 'camera' || loadingStep === 'pose') ? 'text-white/30' : 'text-white/50'}`}>
                Ball Detection AI
              </span>
              {loadingStep === 'ml' && <div className="w-3 h-3 border-2 border-gold border-t-transparent rounded-full animate-spin" />}
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full max-w-xs h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: loadingStep === 'camera' ? '15%' : loadingStep === 'pose' ? '45%' : loadingStep === 'ml' ? '75%' : '100%',
                background: 'linear-gradient(90deg, #D4AF37, #F5E6A3)',
              }}
            />
          </div>

          <p className="text-white/30 text-xs mt-3">First load takes a few seconds</p>
        </div>
      )}

      {/* ==== ML Status Badge (after loading) ==== */}
      {loadingStep === 'done' && mlLoadingStatus === 'ready' && !isCountingDown && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-30">
          <div
            className="bg-success/20 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-2 border border-success/30"
            style={{ animation: 'fadeOut 3s ease-out forwards' }}
          >
            <svg className="w-3 h-3 text-success" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-success text-xs font-medium">AI Detection Active</span>
          </div>
        </div>
      )}

      {loadingStep === 'done' && mlLoadingStatus === 'fallback' && !isCountingDown && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-30">
          <div
            className="bg-amber-500/20 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-2 border border-amber-500/30"
            style={{ animation: 'fadeOut 5s ease-out 2s forwards' }}
          >
            <span className="text-amber-400 text-xs font-medium">Using Motion Detection</span>
          </div>
        </div>
      )}

      {/* ==== AR Debug Panel — Shows detection status ==== */}
      {!isCountingDown && isRunning && (
        <div className="absolute bottom-20 left-2 z-30 bg-black/70 backdrop-blur-sm rounded-lg px-2.5 py-2 border border-white/10 space-y-1.5" style={{ minWidth: '120px' }}>
          <div className="text-[8px] text-white/30 uppercase tracking-widest font-bold mb-1">AR Status</div>

          {/* Pose detection */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${debugInfo.poseDetected ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]' : debugInfo.poseInit ? 'bg-amber-400' : 'bg-red-400'}`} />
            <span className="text-[10px] text-white/70 font-mono">
              BODY {debugInfo.poseDetected ? '✓' : debugInfo.poseInit ? '...' : '✗'}
            </span>
          </div>

          {/* Ball detection */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${debugInfo.ballDetected ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]' : 'bg-red-400'}`} />
            <span className="text-[10px] text-white/70 font-mono">
              BALL {debugInfo.ballSource}
            </span>
          </div>

          {/* ML Model status */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${debugInfo.mlStatus === 'ready' ? 'bg-green-400' : debugInfo.mlStatus === 'loading' ? 'bg-amber-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-[10px] text-white/70 font-mono">
              ML {debugInfo.mlStatus === 'ready' ? '✓' : debugInfo.mlStatus === 'loading' ? '⏳' : '✗'}
            </span>
          </div>

          {/* Confidence */}
          {debugInfo.ballDetected && (
            <div className="flex items-center gap-1 mt-0.5">
              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${debugInfo.ballConf}%`,
                    background: debugInfo.ballConf > 60 ? '#00ff88' : '#ffb400',
                  }}
                />
              </div>
              <span className="text-[9px] text-white/40 font-mono">{debugInfo.ballConf}%</span>
            </div>
          )}
        </div>
      )}

      {/* ==== COUNTDOWN OVERLAY ==== */}
      {isCountingDown && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            key={countdownValue}
            className="text-white font-black select-none"
            style={{
              fontSize: countdownValue === 'GO!' ? '80px' : '120px',
              color: countdownValue === 'GO!' ? '#00FF88' : '#D4AF37',
              textShadow: countdownValue === 'GO!'
                ? '0 0 60px rgba(0,255,136,0.5)'
                : '0 0 60px rgba(212,175,55,0.5)',
              animation: 'countdown-pulse 1s ease-out forwards',
            }}
          >
            {countdownValue}
          </div>
        </div>
      )}

      {/* ==== HUD — Top Center: Touch Counter ==== */}
      {!isCountingDown && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
          <div
            className="font-black text-white leading-none"
            style={{
              fontSize: '64px',
              textShadow: '0 2px 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.4)',
            }}
          >
            {touches}
          </div>
          <span className="text-white/40 text-xs uppercase tracking-[0.2em] mt-0.5">Touches</span>

          {/* Score below touch counter */}
          <div className="mt-1 flex items-center gap-2">
            <span
              className="text-lg font-bold text-gold"
              style={{ textShadow: '0 0 10px rgba(212,175,55,0.4)' }}
            >
              {Math.round(score * 10) / 10}
            </span>
            <span className="text-white/30 text-xs">pts</span>
          </div>
        </div>
      )}

      {/* ==== HUD — Top Left: Combo Indicator ==== */}
      {!isCountingDown && combo > 0 && (
        <div
          key={comboAnim}
          className="absolute top-5 left-4 z-30"
          style={{ animation: 'combo-pop 0.3s ease-out' }}
        >
          <div
            className="font-black text-gold"
            style={{
              fontSize: combo >= 10 ? '28px' : '24px',
              textShadow: '0 0 20px rgba(212,175,55,0.5), 0 2px 10px rgba(0,0,0,0.8)',
            }}
          >
            COMBO x{combo}
          </div>
        </div>
      )}

      {/* ==== HUD — Top Right: Timer ==== */}
      {!isCountingDown && (
        <div className="absolute top-5 right-4 z-30 flex flex-col items-end gap-2">
          {/* Timer */}
          <div
            className="font-mono font-bold text-white"
            style={{
              fontSize: '20px',
              textShadow: '0 2px 10px rgba(0,0,0,0.8)',
              color: isTimedMode && timer <= 10 ? '#FF4444' : '#ffffff',
            }}
          >
            {formatTime(timer)}
          </div>

          {/* Stop / Pause for practice */}
          {gameMode === 'practice' && isRunning && (
            <button
              onClick={endSession}
              className="flex items-center gap-1.5 bg-alert/80 hover:bg-alert rounded-lg px-3 py-1.5 transition-colors active:scale-95"
            >
              <StopIcon className="w-3.5 h-3.5 text-white" />
              <span className="text-white text-xs font-bold">STOP</span>
            </button>
          )}
        </div>
      )}

      {/* ==== Multiplier Badge ==== */}
      {!isCountingDown && multiplierLabel && (
        <div
          className="absolute top-24 left-1/2 -translate-x-1/2 z-30"
          style={{ animation: 'combo-pop 0.3s ease-out' }}
        >
          <div
            className="bg-gold/90 text-navy-dark font-black text-sm px-4 py-1.5 rounded-full"
            style={{ boxShadow: '0 0 20px rgba(212,175,55,0.5)' }}
          >
            {multiplierLabel}
          </div>
        </div>
      )}

      {/* ==== DROP flash ==== */}
      {showDrop && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
          style={{ animation: 'drop-shake 0.4s ease-out' }}
        >
          <div
            className="font-black text-alert"
            style={{
              fontSize: '72px',
              textShadow: '0 0 40px rgba(255,68,68,0.6), 0 4px 20px rgba(0,0,0,0.8)',
              animation: 'combo-pop 0.4s ease-out',
            }}
          >
            DROP!
          </div>
        </div>
      )}

      {/* ==== Touch flash effect ==== */}
      {touchFlash && (
        <div
          key={touchFlash.id}
          className="absolute z-35 pointer-events-none"
          style={{
            // Mirror the x position since video is mirrored
            left: `calc(100% - ${(touchFlash.x / 640) * 100}%)`,
            top: `${(touchFlash.y / 480) * 100}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div
            className="w-16 h-16 rounded-full border-4 border-success"
            style={{
              animation: 'touch-flash 0.6s ease-out forwards',
              boxShadow: '0 0 30px rgba(0,255,136,0.4)',
            }}
          />
        </div>
      )}

      {/* ==== Bottom: Body Zone Indicators ==== */}
      {!isCountingDown && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4">
          <div className="flex flex-col items-center gap-1">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200"
              style={{
                background: activeZones.foot
                  ? 'rgba(0,255,136,0.25)'
                  : 'rgba(255,255,255,0.08)',
                border: activeZones.foot
                  ? '2px solid rgba(0,255,136,0.6)'
                  : '1px solid rgba(255,255,255,0.1)',
                boxShadow: activeZones.foot ? '0 0 20px rgba(0,255,136,0.3)' : 'none',
              }}
            >
              <FootIcon active={activeZones.foot} />
            </div>
            <span className="text-[9px] text-white/30 uppercase tracking-wider">Foot</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200"
              style={{
                background: activeZones.thigh
                  ? 'rgba(0,255,136,0.25)'
                  : 'rgba(255,255,255,0.08)',
                border: activeZones.thigh
                  ? '2px solid rgba(0,255,136,0.6)'
                  : '1px solid rgba(255,255,255,0.1)',
                boxShadow: activeZones.thigh ? '0 0 20px rgba(0,255,136,0.3)' : 'none',
              }}
            >
              <ThighIcon active={activeZones.thigh} />
            </div>
            <span className="text-[9px] text-white/30 uppercase tracking-wider">Thigh</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200"
              style={{
                background: activeZones.head
                  ? 'rgba(0,255,136,0.25)'
                  : 'rgba(255,255,255,0.08)',
                border: activeZones.head
                  ? '2px solid rgba(0,255,136,0.6)'
                  : '1px solid rgba(255,255,255,0.1)',
                boxShadow: activeZones.head ? '0 0 20px rgba(0,255,136,0.3)' : 'none',
              }}
            >
              <HeadIcon active={activeZones.head} />
            </div>
            <span className="text-[9px] text-white/30 uppercase tracking-wider">Head</span>
          </div>
        </div>
      )}

      {/* ==== Camera Error Overlay ==== */}
      {cameraError && (
        <div className="absolute inset-0 z-50 bg-navy/95 flex flex-col items-center justify-center px-8">
          <div className="w-16 h-16 rounded-full bg-alert/20 border border-alert/40 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-alert" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2 text-center">Camera Required</h2>
          <p className="text-white/50 text-sm text-center max-w-xs mb-6">
            {cameraError}
          </p>
          <button
            onClick={endSession}
            className="py-3 px-8 rounded-xl font-bold text-navy-dark"
            style={{
              background: 'linear-gradient(135deg, #D4AF37, #F5E6A3, #D4AF37)',
              boxShadow: '0 0 20px rgba(212,175,55,0.3)',
            }}
          >
            Go Back
          </button>
        </div>
      )}

      {/* ==== Drill target indicator (for drill mode) ==== */}
      {!isCountingDown && gameMode === 'drill' && drillConfig && (
        <div className="absolute top-32 left-4 z-30 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10">
          <p className="text-white/40 text-[10px] uppercase tracking-wider">Target</p>
          <p className="text-white font-bold text-sm">
            {drillConfig.type === 'touches' && `${touches}/${drillConfig.target} touches`}
            {drillConfig.type === 'combo' && `${combo}/${drillConfig.target}x combo`}
            {drillConfig.type === 'score' && `${Math.round(score)}/${drillConfig.target} pts`}
          </p>
        </div>
      )}

      {/* Inline CSS animations */}
      <style>{`
        @keyframes fadeOut {
          0% { opacity: 1; }
          70% { opacity: 1; }
          100% { opacity: 0; pointer-events: none; }
        }
      `}</style>
    </div>
  );
}
