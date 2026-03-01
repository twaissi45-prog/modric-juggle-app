// ============================================
// PWA Install Prompt — Smart banner for
// Android (beforeinstallprompt) + iOS (manual)
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';

const DISMISS_KEY = 'modric_pwa_install_dismissed';
const SHOW_DELAY_MS = 8000; // show after 8 seconds

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isInStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const deferredPromptRef = useRef(null);

  useEffect(() => {
    // Already installed or running as PWA
    if (isInStandaloneMode()) return;

    // Already dismissed recently (24 hours)
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      if (Date.now() - dismissedAt < 24 * 60 * 60 * 1000) return;
    }

    const ios = isIOS();
    setIsIOSDevice(ios);

    if (ios) {
      // iOS: no beforeinstallprompt — show manual instructions after delay
      const timer = setTimeout(() => setShow(true), SHOW_DELAY_MS);
      return () => clearTimeout(timer);
    }

    // Android/Desktop: listen for beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setTimeout(() => setShow(true), SHOW_DELAY_MS);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPromptRef.current) return;
    deferredPromptRef.current.prompt();
    const result = await deferredPromptRef.current.userChoice;
    if (result.outcome === 'accepted') {
      setShow(false);
    }
    deferredPromptRef.current = null;
  }, []);

  const handleDismiss = useCallback(() => {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  }, []);

  if (!show) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] px-4 pb-5 pt-2"
      style={{
        animation: 'installSlideUp 0.4s cubic-bezier(0.16,1,0.3,1) both',
      }}
    >
      <style>{`
        @keyframes installSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      <div
        className="relative mx-auto max-w-md rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(20,20,40,0.97), rgba(10,10,25,0.98))',
          border: '1px solid rgba(212,175,55,0.3)',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.5), 0 0 30px rgba(212,175,55,0.08)',
        }}
      >
        {/* Dismiss X */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full
                     text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors"
          aria-label="Dismiss"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        <div className="flex items-center gap-4 p-4">
          {/* App icon */}
          <div
            className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #D4AF37 0%, #8B7225 100%)',
              boxShadow: '0 4px 12px rgba(212,175,55,0.3)',
            }}
          >
            <span className="text-2xl">⚽</span>
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white tracking-wide">
              Install Modrić Juggle
            </h3>

            {isIOSDevice ? (
              <p className="text-xs text-white/50 mt-1 leading-relaxed">
                Tap{' '}
                <svg className="inline w-4 h-4 -mt-0.5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3 5h-2v6h-2V7H9l3-5zM5 16h14v2H5z"/>
                </svg>{' '}
                then <span className="text-white/80 font-medium">"Add to Home Screen"</span>
              </p>
            ) : (
              <p className="text-xs text-white/50 mt-1">
                Add to your home screen for the full experience
              </p>
            )}
          </div>

          {/* Action */}
          {!isIOSDevice && (
            <button
              onClick={handleInstall}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider
                         text-[#030510] transition-transform active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #D4AF37, #F0D060)',
                boxShadow: '0 2px 10px rgba(212,175,55,0.35)',
              }}
            >
              Install
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
