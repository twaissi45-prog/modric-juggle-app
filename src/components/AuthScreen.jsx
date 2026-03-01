// ============================================
// AuthScreen — Dark Luxury Minimal
// Pure dark + gold, centered form, no image
// ============================================

import { useState, useEffect } from 'react';
import {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  resetPassword,
  getAuthErrorMessage,
} from '../services/auth';
import Football3D from './three/Football3D';

/* ── Inject keyframes once ── */
const KF_ID = 'auth-kf';
function injectKF() {
  if (document.getElementById(KF_ID)) return;
  const s = document.createElement('style');
  s.id = KF_ID;
  s.textContent = `
    @keyframes authIn {
      from { opacity: 0; transform: translateY(18px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes goldShimmer {
      0%   { background-position: 200% center; }
      100% { background-position: -200% center; }
    }
    @keyframes ringRotate {
      from { transform: translate(-50%,-50%) rotate(0deg); }
      to   { transform: translate(-50%,-50%) rotate(360deg); }
    }
    @keyframes pulseGlow {
      0%,100% { opacity: 0.5; transform: scale(1); }
      50%     { opacity: 1; transform: scale(1.08); }
    }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(s);
}

export default function AuthScreen({ onAuthSuccess, onSkip }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    injectKF();
    const t = setTimeout(() => setReady(true), 80);
    return () => clearTimeout(t);
  }, []);

  /* ── Auth handlers ── */
  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        if (!name.trim() || name.trim().length < 2) {
          setError('Name must be at least 2 characters.');
          setLoading(false);
          return;
        }
        const user = await signUpWithEmail(email, password, name.trim());
        onAuthSuccess(user, name.trim());
      } else {
        const user = await signInWithEmail(email, password);
        onAuthSuccess(user);
      }
    } catch (err) {
      setError(getAuthErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      onAuthSuccess(user, user.displayName);
    } catch (err) {
      setError(getAuthErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err) {
      setError(getAuthErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none"
      style={{ background: '#050510' }}
    >
      {/* ═══════ Ambient background effects ═══════ */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Center gold glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(212,175,55,0.04) 0%, transparent 50%)',
            filter: 'blur(60px)',
          }}
        />
        {/* Top accent */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 60%)',
            filter: 'blur(80px)',
          }}
        />
        {/* Subtle grid texture */}
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(rgba(212,175,55,0.015) 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }} />
      </div>

      {/* ═══════ Main content ═══════ */}
      <div className="relative z-10 w-full h-full flex items-center justify-center overflow-y-auto">
        <div
          className="w-full max-w-[380px] mx-auto px-6 py-8"
          style={{
            animation: ready ? 'authIn 0.6s cubic-bezier(0.16,1,0.3,1) both' : 'none',
            opacity: ready ? undefined : 0,
          }}
        >

          {/* ── 3D Soccer Ball ── */}
          <div className="flex justify-center mb-2 -mt-2">
            <div className="relative" style={{ filter: 'drop-shadow(0 4px 20px rgba(212,175,55,0.15))' }}>
              <Football3D
                size={120}
                spin={true}
                bounce={false}
                interactive={true}
                glow={false}
                juggle={true}
              />
            </div>
          </div>

          {/* ── Title ── */}
          <div className="text-center mb-7"
            style={{ animation: ready ? 'fadeUp 0.6s 0.15s both' : 'none' }}
          >
            <p className="text-[10px] tracking-[0.4em] uppercase font-medium mb-2"
              style={{ color: 'rgba(212,175,55,0.45)' }}
            >
              Luka Modrić
            </p>
            <h1 className="text-[28px] sm:text-[34px] font-black tracking-tight leading-[1.1]"
              style={{
                background: 'linear-gradient(105deg, #8B7425 0%, #D4AF37 25%, #F5E6A3 50%, #D4AF37 75%, #8B7425 100%)',
                backgroundSize: '300% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'goldShimmer 5s linear infinite',
              }}
            >
              JUGGLING<br/>CHALLENGE
            </h1>
            <div className="flex items-center justify-center gap-3 mt-3">
              <div className="h-px w-8" style={{ background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.2))' }} />
              <p className="text-[10px] tracking-[0.2em] uppercase text-white/20 font-medium">
                {mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Reset password' : 'Welcome back'}
              </p>
              <div className="h-px w-8" style={{ background: 'linear-gradient(to left, transparent, rgba(212,175,55,0.2))' }} />
            </div>
          </div>

          {/* ── Form area ── */}
          <div style={{ animation: ready ? 'fadeUp 0.6s 0.3s both' : 'none' }}>

            {/* Google */}
            {mode !== 'reset' && (
              <button onClick={handleGoogle} disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl mb-4
                  cursor-pointer active:scale-[0.98] transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed group"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                }}
              >
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="text-[13px] font-medium text-white/60">Continue with Google</span>
              </button>
            )}

            {/* Divider */}
            {mode !== 'reset' && (
              <div className="flex items-center gap-4 my-4">
                <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.04)' }} />
                <span className="text-[9px] text-white/15 uppercase tracking-[0.2em] font-medium">or</span>
                <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.04)' }} />
              </div>
            )}

            {/* Form */}
            <form onSubmit={mode === 'reset' ? handleReset : handleEmailAuth} className="space-y-3">
              {mode === 'signup' && (
                <div className="relative">
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Player name" maxLength={16}
                    className="w-full pl-11 pr-4 py-3 rounded-xl text-white text-sm placeholder:text-white/15
                      focus:outline-none transition-all duration-300"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    onFocus={(e) => { e.target.style.borderColor = 'rgba(212,175,55,0.3)'; e.target.style.boxShadow = '0 0 0 3px rgba(212,175,55,0.05)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.06)'; e.target.style.boxShadow = 'none'; }}
                  />
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0"/>
                  </svg>
                </div>
              )}

              <div className="relative">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address" autoComplete="email" required
                  className="w-full pl-11 pr-4 py-3 rounded-xl text-white text-sm placeholder:text-white/15
                    focus:outline-none transition-all duration-300"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(212,175,55,0.3)'; e.target.style.boxShadow = '0 0 0 3px rgba(212,175,55,0.05)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.06)'; e.target.style.boxShadow = 'none'; }}
                />
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"/>
                </svg>
              </div>

              {mode !== 'reset' && (
                <div className="relative">
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    required minLength={6}
                    className="w-full pl-11 pr-4 py-3 rounded-xl text-white text-sm placeholder:text-white/15
                      focus:outline-none transition-all duration-300"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    onFocus={(e) => { e.target.style.borderColor = 'rgba(212,175,55,0.3)'; e.target.style.boxShadow = '0 0 0 3px rgba(212,175,55,0.05)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.06)'; e.target.style.boxShadow = 'none'; }}
                  />
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"/>
                  </svg>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(255,59,48,0.06)', border: '1px solid rgba(255,59,48,0.12)' }}>
                  <svg className="w-3.5 h-3.5 text-[#FF3B30] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM8.94 6.94a.75.75 0 1 1-1.06-1.06.75.75 0 0 1 1.06 1.06ZM10 8.25a.75.75 0 0 1 .75.75v3.25a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Z" clipRule="evenodd"/>
                  </svg>
                  <p className="text-xs text-[#FF3B30]">{error}</p>
                </div>
              )}

              {/* Reset confirmation */}
              {resetSent && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(48,209,88,0.06)', border: '1px solid rgba(48,209,88,0.12)' }}>
                  <svg className="w-3.5 h-3.5 text-[#30D158] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd"/>
                  </svg>
                  <p className="text-xs text-[#30D158]">Reset email sent! Check your inbox.</p>
                </div>
              )}

              {/* CTA */}
              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold text-[14px] tracking-wide cursor-pointer
                  active:scale-[0.97] transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                style={{
                  background: 'linear-gradient(135deg, #8B7425 0%, #D4AF37 50%, #F5E6A3 100%)',
                  color: '#050510',
                  boxShadow: '0 4px 24px rgba(212,175,55,0.2), 0 0 60px rgba(212,175,55,0.06)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 28px rgba(212,175,55,0.35), 0 0 80px rgba(212,175,55,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 4px 24px rgba(212,175,55,0.2), 0 0 60px rgba(212,175,55,0.06)'}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <circle cx="12" cy="12" r="10" strokeDasharray="31.42" strokeDashoffset="10" strokeLinecap="round"/>
                    </svg>
                    {mode === 'reset' ? 'Sending...' : mode === 'signup' ? 'Creating...' : 'Signing in...'}
                  </span>
                ) : (
                  mode === 'reset' ? 'Send Reset Link' : mode === 'signup' ? 'Create Account' : 'Sign In'
                )}
              </button>
            </form>

            {/* Links */}
            <div className="flex flex-col items-center gap-2 mt-5">
              {mode === 'login' && (
                <>
                  <button onClick={() => { setMode('signup'); setError(''); }}
                    className="text-xs cursor-pointer transition-colors"
                    style={{ color: 'rgba(212,175,55,0.5)' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#D4AF37'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(212,175,55,0.5)'}
                  >
                    Don&apos;t have an account?{' '}
                    <span className="font-bold" style={{ color: '#D4AF37' }}>Sign up</span>
                  </button>
                  <button onClick={() => { setMode('reset'); setError(''); setResetSent(false); }}
                    className="text-[11px] text-white/20 hover:text-white/40 transition-colors cursor-pointer">
                    Forgot password?
                  </button>
                </>
              )}
              {mode === 'signup' && (
                <button onClick={() => { setMode('login'); setError(''); }}
                  className="text-xs cursor-pointer transition-colors"
                  style={{ color: 'rgba(212,175,55,0.5)' }}>
                  Already have an account?{' '}
                  <span className="font-bold" style={{ color: '#D4AF37' }}>Sign in</span>
                </button>
              )}
              {mode === 'reset' && (
                <button onClick={() => { setMode('login'); setError(''); setResetSent(false); }}
                  className="text-xs cursor-pointer transition-colors"
                  style={{ color: 'rgba(212,175,55,0.5)' }}>
                  Back to <span className="font-bold" style={{ color: '#D4AF37' }}>Sign in</span>
                </button>
              )}
            </div>

            {/* Skip */}
            {onSkip && (
              <div className="flex justify-center mt-5">
                <button onClick={onSkip}
                  className="text-[11px] text-white/15 hover:text-white/30 transition-all duration-300 cursor-pointer"
                >
                  Skip — play as guest
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
