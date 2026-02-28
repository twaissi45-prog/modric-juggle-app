// ============================================
// EnvironmentCheck — Pre-session environment
// validation screen with camera feed + checks
// ============================================

import { useState, useEffect, useRef, useCallback } from 'react';

/* ---- Inline SVG icons ---- */

const ICONS = {
  camera: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  lighting: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
  body: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="3" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="12" y1="16" x2="8" y2="22" />
      <line x1="12" y1="16" x2="16" y2="22" />
    </svg>
  ),
  distance: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 3L3 21" />
      <path d="M21 3h-6" />
      <path d="M21 3v6" />
      <path d="M3 21h6" />
      <path d="M3 21v-6" />
    </svg>
  ),
};

const CHECK_IDS = ['camera', 'lighting', 'body', 'distance'];

const CHECK_META = {
  camera: { label: 'Camera Access', icon: ICONS.camera },
  lighting: { label: 'Lighting', icon: ICONS.lighting },
  body: { label: 'Body Visible', icon: ICONS.body },
  distance: { label: 'Distance', icon: ICONS.distance },
};

export default function EnvironmentCheck({ onReady, onBack, gameMode = 'practice' }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);

  // Check states: 'pending' | 'checking' | 'passed' | 'failed'
  const [checks, setChecks] = useState({
    camera: 'pending',
    lighting: 'pending',
    body: 'pending',
    distance: 'pending',
  });

  const [brightnessValue, setBrightnessValue] = useState(0);
  const [visible, setVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isPractice = gameMode === 'practice';

  // Determine if ready
  const allPassed = CHECK_IDS.every((id) => checks[id] === 'passed');
  const canProceed = isPractice
    ? checks.camera === 'passed' // practice only needs camera
    : allPassed;

  /* ---- Update a single check ---- */
  const setCheck = useCallback((id, status) => {
    setChecks((prev) => ({ ...prev, [id]: status }));
  }, []);

  /* ---- Measure average brightness from video frame ---- */
  const measureBrightness = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return 0;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const w = 64;
    const h = 48;
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(video, 0, 0, w, h);

    const data = ctx.getImageData(0, 0, w, h).data;
    let sum = 0;
    const pixelCount = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      sum += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    }
    return sum / pixelCount;
  }, []);

  /* ---- Start camera and run checks ---- */
  useEffect(() => {
    let cancelled = false;
    const timers = [];
    const timer = setTimeout(() => setVisible(true), 60);
    timers.push(timer);

    const startCamera = async () => {
      setCheck('camera', 'checking');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCheck('camera', 'passed');
        runAnalysis();
      } catch (err) {
        if (!cancelled) {
          setCheck('camera', 'failed');
          setErrorMsg(
            err.name === 'NotAllowedError'
              ? 'Camera permission denied. Please allow camera access.'
              : 'Could not access camera. Check your device settings.'
          );
        }
      }
    };

    const runAnalysis = () => {
      setCheck('lighting', 'checking');
      setCheck('body', 'checking');
      setCheck('distance', 'checking');

      let lightingDone = false;

      // Body detection simulation: pass after ~2s if camera is active
      const bodyTimer = setTimeout(() => {
        if (!cancelled) setCheck('body', 'passed');
      }, 2000);
      timers.push(bodyTimer);

      // Distance check simulation: pass after ~3s
      const distTimer = setTimeout(() => {
        if (!cancelled) setCheck('distance', 'passed');
      }, 3000);
      timers.push(distTimer);

      // Continuous brightness check
      const analyzeFrame = () => {
        if (cancelled) return;
        const brightness = measureBrightness();
        setBrightnessValue(Math.round(brightness));

        if (!lightingDone) {
          if (brightness > 60) {
            setCheck('lighting', 'passed');
            lightingDone = true;
          } else if (brightness > 0 && brightness <= 60) {
            setCheck('lighting', 'failed');
          }
        }

        rafRef.current = requestAnimationFrame(analyzeFrame);
      };

      const startAnalysis = setTimeout(() => {
        if (!cancelled) analyzeFrame();
      }, 500);
      timers.push(startAnalysis);
    };

    startCamera();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [measureBrightness, setCheck]);

  /* ---- Status helpers ---- */
  const statusColor = (s) => {
    if (s === 'passed') return 'text-success';
    if (s === 'failed') return 'text-alert';
    return 'text-white/40';
  };

  const statusText = (id, s) => {
    if (s === 'pending') return 'Waiting...';
    if (s === 'checking') return 'Checking...';
    if (s === 'passed') return 'OK';
    if (id === 'camera') return 'No access';
    if (id === 'lighting') return `Too dark (${brightnessValue})`;
    if (id === 'body') return 'Not detected';
    if (id === 'distance') return 'Adjust distance';
    return 'Failed';
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
  };

  return (
    <div className="relative w-full h-full bg-navy-dark overflow-hidden flex flex-col select-none">
      {/* Hidden analysis canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera feed background */}
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          playsInline
          muted
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy-dark/60 via-navy-dark/30 to-navy-dark/90" />
      </div>

      {/* Content overlay */}
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
            onClick={() => { stopStream(); onBack(); }}
            className="flex items-center gap-1 text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span className="text-sm">Back</span>
          </button>

          <div className="ml-auto">
            <span
              className={`text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                isPractice
                  ? 'bg-electric/15 text-electric'
                  : 'bg-gold/15 text-gold'
              }`}
            >
              {isPractice ? 'Practice' : 'Ranked'}
            </span>
          </div>
        </div>

        {/* Title */}
        <div className="px-6 pt-4 pb-2">
          <h2 className="text-xl font-bold text-white">Environment Check</h2>
          <p className="text-sm text-white/40 mt-1">
            {isPractice
              ? 'Warnings only \u2014 you can start anytime.'
              : 'All checks must pass for ranked mode.'}
          </p>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Check cards */}
        <div className="px-6 space-y-3 pb-4">
          {CHECK_IDS.map((id, idx) => {
            const meta = CHECK_META[id];
            const status = checks[id];
            const isActive = status === 'checking';

            return (
              <div
                key={id}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all duration-500 ${
                  status === 'passed'
                    ? 'bg-success/[0.06] border-success/20'
                    : status === 'failed'
                    ? 'bg-alert/[0.06] border-alert/20'
                    : 'bg-white/[0.04] border-white/[0.06]'
                }`}
                style={{
                  animationDelay: `${idx * 100}ms`,
                  animation: 'slide-up 0.5s ease-out both',
                }}
              >
                {/* Icon */}
                <span className={`w-5 h-5 shrink-0 ${statusColor(status)}`}>
                  {meta.icon}
                </span>

                {/* Label */}
                <span className="flex-1 text-sm font-medium text-white/80">
                  {meta.label}
                </span>

                {/* Status indicator */}
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${statusColor(status)}`}>
                    {statusText(id, status)}
                  </span>
                  {status === 'passed' && (
                    <svg className="w-5 h-5 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  {status === 'failed' && (
                    <svg className="w-5 h-5 text-alert" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  )}
                  {isActive && (
                    <div className="w-5 h-5 border-2 border-electric/40 border-t-electric rounded-full animate-spin" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mx-6 mb-3 px-4 py-2.5 rounded-lg bg-alert/10 border border-alert/20">
            <p className="text-xs text-alert">{errorMsg}</p>
          </div>
        )}

        {/* Practice mode note */}
        {isPractice && !allPassed && checks.camera === 'passed' && (
          <div className="mx-6 mb-3 px-4 py-2.5 rounded-lg bg-gold/[0.08] border border-gold/20">
            <p className="text-xs text-gold/80">
              Practice mode \u2014 you can proceed even if some checks haven&apos;t passed.
            </p>
          </div>
        )}

        {/* Ready button */}
        <div className="px-6 pb-8 pt-2">
          <button
            onClick={() => { stopStream(); onReady(); }}
            disabled={!canProceed}
            className={`w-full py-3.5 rounded-xl font-bold text-base tracking-wide transition-all duration-300 cursor-pointer
              ${
                canProceed
                  ? 'bg-gradient-to-r from-success/80 to-success text-navy-dark shadow-[0_0_24px_rgba(0,255,136,0.25)] hover:shadow-[0_0_36px_rgba(0,255,136,0.4)] active:scale-[0.97]'
                  : 'bg-white/[0.06] text-white/20 cursor-not-allowed'
              }`}
          >
            {canProceed ? "I'm Ready" : 'Checking Environment...'}
          </button>
        </div>
      </div>
    </div>
  );
}
