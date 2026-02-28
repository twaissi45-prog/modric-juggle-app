// ============================================
// ProfileSetup — First-time player onboarding
// 3-step wizard: Name, Avatar, Country
// Premium dark navy + gold design
// ============================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { AVATARS, COUNTRIES } from '../store/playerProfile';

// ---- Sparkle particle for decorative background ----
function Sparkle({ delay, x, y, size }) {
  return (
    <div
      className="absolute pointer-events-none rounded-full"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${size}px`,
        height: `${size}px`,
        background:
          'radial-gradient(circle, rgba(212,175,55,0.8) 0%, rgba(245,230,163,0.3) 40%, transparent 70%)',
        animation: `sparkle-drift ${3 + Math.random() * 2}s ease-out ${delay}s infinite`,
        opacity: 0,
      }}
    />
  );
}

// ---- Step indicator dots ----
function StepDots({ current, total }) {
  return (
    <div className="flex items-center gap-2.5">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="transition-all duration-500 rounded-full"
          style={{
            width: i === current ? '24px' : '8px',
            height: '8px',
            background:
              i === current
                ? 'linear-gradient(90deg, #D4AF37, #F5E6A3)'
                : i < current
                ? 'rgba(212,175,55,0.4)'
                : 'rgba(255,255,255,0.1)',
            boxShadow: i === current ? '0 0 12px rgba(212,175,55,0.4)' : 'none',
          }}
        />
      ))}
    </div>
  );
}

// ---- Decorative football SVG ----
function FootballDecor({ className = '', size = 48, style = {} }) {
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="rgba(212,175,55,0.15)"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M12 2a10 10 0 0 1 0 20 10 10 0 0 1 0-20zm0 2l2 3h3.5l1 3-2.5 2.5 1 3.5-3 1-2 3-2-3-3-1 1-3.5L4.5 10l1-3H9l2-3z"
        fill="rgba(212,175,55,0.08)"
      />
    </svg>
  );
}

export default function ProfileSetup({ onComplete }) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1=forward, -1=back
  const [animating, setAnimating] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Form data
  const [playerName, setPlayerName] = useState('');
  const [avatarId, setAvatarId] = useState(null);
  const [countryCode, setCountryCode] = useState('');
  const [countrySearch, setCountrySearch] = useState('');

  // Entrance animation
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Random sparkles
  const sparkles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        delay: i * 0.5 + Math.random() * 1.5,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 2 + Math.random() * 3,
      })),
    [],
  );

  // Filter countries by search
  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return COUNTRIES;
    const q = countrySearch.toLowerCase().trim();
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q),
    );
  }, [countrySearch]);

  // Validation
  const isStepValid = useCallback(() => {
    if (step === 0) return playerName.trim().length >= 2;
    if (step === 1) return avatarId !== null;
    if (step === 2) return countryCode !== '';
    return false;
  }, [step, playerName, avatarId, countryCode]);

  // Step transition helper
  const goToStep = useCallback(
    (nextStep) => {
      if (animating) return;
      setDirection(nextStep > step ? 1 : -1);
      setAnimating(true);
      setTimeout(() => {
        setStep(nextStep);
        setAnimating(false);
      }, 250);
    },
    [step, animating],
  );

  const handleNext = useCallback(() => {
    if (!isStepValid()) return;
    if (step < 2) {
      goToStep(step + 1);
    } else {
      // Final step -- complete
      onComplete({
        playerName: playerName.trim(),
        avatarId,
        countryCode,
      });
    }
  }, [step, isStepValid, goToStep, onComplete, playerName, avatarId, countryCode]);

  const handleBack = useCallback(() => {
    if (step > 0) goToStep(step - 1);
  }, [step, goToStep]);

  // Selected avatar object
  const selectedAvatar = AVATARS.find((a) => a.id === avatarId);

  // Slide animation style for current step content
  const stepContentStyle = {
    opacity: animating ? 0 : 1,
    transform: animating
      ? `translateX(${direction * -40}px)`
      : 'translateX(0)',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  return (
    <div className="relative w-full h-full bg-navy overflow-hidden select-none flex flex-col">
      {/* ====== BACKGROUND EFFECTS ====== */}
      <div className="pointer-events-none absolute inset-0">
        {/* Gold radial glow center */}
        <div
          className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[160px]"
          style={{
            background:
              'radial-gradient(circle, rgba(212,175,55,0.07) 0%, transparent 60%)',
          }}
        />
        {/* Secondary subtle glow bottom */}
        <div
          className="absolute bottom-[-5%] left-1/2 -translate-x-1/2 w-[400px] h-[300px] rounded-full blur-[100px]"
          style={{
            background:
              'radial-gradient(circle, rgba(212,175,55,0.04) 0%, transparent 70%)',
          }}
        />
        {/* Subtle diagonal texture */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, transparent, transparent 50px, rgba(212,175,55,1) 50px, rgba(212,175,55,1) 51px)',
          }}
        />
        {/* Sparkle particles */}
        {sparkles.map((s) => (
          <Sparkle key={s.id} delay={s.delay} x={s.x} y={s.y} size={s.size} />
        ))}
      </div>

      {/* ====== DECORATIVE FOOTBALLS ====== */}
      <FootballDecor
        className="absolute pointer-events-none"
        size={80}
        style={{
          right: '-12px',
          top: '12%',
          opacity: 0.3,
          animation: 'float 6s ease-in-out infinite',
        }}
      />
      <FootballDecor
        className="absolute pointer-events-none"
        size={48}
        style={{
          left: '5%',
          bottom: '18%',
          opacity: 0.2,
          animation: 'float 5s ease-in-out 1s infinite',
        }}
      />
      <FootballDecor
        className="absolute pointer-events-none"
        size={32}
        style={{
          right: '15%',
          bottom: '30%',
          opacity: 0.15,
          animation: 'float 7s ease-in-out 2s infinite',
        }}
      />

      {/* ====== MAIN CONTENT ====== */}
      <div
        className="relative z-10 flex flex-col h-full w-full max-w-md mx-auto px-6 transition-all duration-700 ease-out"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(30px)',
        }}
      >
        {/* --- TOP: Step indicator + Title --- */}
        <div className="flex flex-col items-center pt-10 sm:pt-14 mb-2">
          {/* Logo / brand */}
          <div className="flex items-center gap-2 mb-5">
            <svg
              className="w-5 h-5 text-gold/60"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
              />
              <path
                d="M12 2a10 10 0 0 1 0 20 10 10 0 0 1 0-20zm0 2l2 3h3.5l1 3-2.5 2.5 1 3.5-3 1-2 3-2-3-3-1 1-3.5L4.5 10l1-3H9l2-3z"
                opacity="0.3"
              />
            </svg>
            <span
              className="text-xs font-bold uppercase tracking-[0.25em]"
              style={{
                background:
                  'linear-gradient(90deg, #D4AF37, #F5E6A3)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Juggle Challenge
            </span>
            <svg
              className="w-5 h-5 text-gold/60"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
              />
              <path
                d="M12 2a10 10 0 0 1 0 20 10 10 0 0 1 0-20zm0 2l2 3h3.5l1 3-2.5 2.5 1 3.5-3 1-2 3-2-3-3-1 1-3.5L4.5 10l1-3H9l2-3z"
                opacity="0.3"
              />
            </svg>
          </div>

          <StepDots current={step} total={3} />
        </div>

        {/* --- STEP CONTENT --- */}
        <div className="flex-1 flex flex-col justify-center overflow-hidden py-4">
          <div style={stepContentStyle}>
            {/* ======= STEP 1: ENTER NAME ======= */}
            {step === 0 && (
              <div className="flex flex-col items-center">
                {/* Big emoji */}
                <div
                  className="text-5xl mb-4"
                  style={{ animation: 'float 3s ease-in-out infinite' }}
                >
                  {'\u26BD'}
                </div>

                <h2
                  className="text-2xl sm:text-3xl font-black text-center mb-2"
                  style={{
                    background:
                      'linear-gradient(135deg, #FFFFFF 0%, rgba(255,255,255,0.7) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  What should we call you?
                </h2>
                <p className="text-sm text-white/35 text-center mb-8">
                  Pick a name for the pitch
                </p>

                {/* Input */}
                <div className="w-full max-w-xs">
                  <div
                    className="relative rounded-xl overflow-hidden"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: playerName.trim().length >= 2
                        ? '2px solid rgba(212,175,55,0.6)'
                        : '2px solid rgba(255,255,255,0.08)',
                      boxShadow: playerName.trim().length >= 2
                        ? '0 0 20px rgba(212,175,55,0.15), inset 0 0 20px rgba(212,175,55,0.03)'
                        : 'none',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => {
                        if (e.target.value.length <= 16) {
                          setPlayerName(e.target.value);
                        }
                      }}
                      placeholder="Your player name"
                      maxLength={16}
                      autoFocus
                      className="w-full bg-transparent text-white text-center text-lg font-semibold
                        py-4 px-4 outline-none placeholder:text-white/20"
                      style={{ caretColor: '#D4AF37' }}
                    />
                  </div>

                  {/* Character count */}
                  <div className="flex items-center justify-between mt-2.5 px-1">
                    <span className="text-[10px] text-white/25">
                      {playerName.trim().length < 2
                        ? 'At least 2 characters'
                        : ''}
                    </span>
                    <span
                      className="text-[11px] font-mono tabular-nums transition-colors duration-200"
                      style={{
                        color:
                          playerName.length >= 14
                            ? 'rgba(255,68,68,0.7)'
                            : playerName.length >= 2
                            ? 'rgba(212,175,55,0.5)'
                            : 'rgba(255,255,255,0.2)',
                      }}
                    >
                      {playerName.length}/16
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ======= STEP 2: CHOOSE AVATAR ======= */}
            {step === 1 && (
              <div className="flex flex-col items-center">
                {/* Preview of selected avatar */}
                <div
                  className="relative mb-4"
                  style={{ animation: 'float 3s ease-in-out infinite' }}
                >
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-4xl transition-all duration-300"
                    style={{
                      background:
                        selectedAvatar
                          ? 'linear-gradient(145deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))'
                          : 'rgba(255,255,255,0.03)',
                      border: selectedAvatar
                        ? '2px solid rgba(212,175,55,0.4)'
                        : '2px dashed rgba(255,255,255,0.1)',
                      boxShadow: selectedAvatar
                        ? '0 0 30px rgba(212,175,55,0.2)'
                        : 'none',
                    }}
                  >
                    {selectedAvatar ? selectedAvatar.emoji : '?'}
                  </div>
                </div>

                <h2
                  className="text-2xl sm:text-3xl font-black text-center mb-1"
                  style={{
                    background:
                      'linear-gradient(135deg, #FFFFFF 0%, rgba(255,255,255,0.7) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Pick your avatar
                </h2>
                <p className="text-sm text-white/35 text-center mb-6">
                  {selectedAvatar
                    ? selectedAvatar.label
                    : 'Choose your identity'}
                </p>

                {/* Avatar grid 4x3 */}
                <div className="grid grid-cols-4 gap-3 w-full max-w-xs">
                  {AVATARS.map((avatar) => {
                    const isSelected = avatarId === avatar.id;
                    return (
                      <button
                        key={avatar.id}
                        onClick={() => setAvatarId(avatar.id)}
                        className="relative aspect-square rounded-xl flex items-center justify-center text-2xl
                          transition-all duration-200 cursor-pointer active:scale-90"
                        style={{
                          background: isSelected
                            ? 'linear-gradient(145deg, rgba(212,175,55,0.2), rgba(212,175,55,0.08))'
                            : 'rgba(255,255,255,0.03)',
                          border: isSelected
                            ? '2px solid rgba(212,175,55,0.7)'
                            : '2px solid rgba(255,255,255,0.06)',
                          boxShadow: isSelected
                            ? '0 0 20px rgba(212,175,55,0.25), inset 0 0 15px rgba(212,175,55,0.05)'
                            : 'none',
                          animation: isSelected
                            ? 'pulse-gold 2s ease-in-out infinite'
                            : 'none',
                        }}
                      >
                        <span
                          className="transition-transform duration-200"
                          style={{
                            transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                          }}
                        >
                          {avatar.emoji}
                        </span>

                        {/* Selection checkmark */}
                        {isSelected && (
                          <div
                            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                            style={{
                              background:
                                'linear-gradient(135deg, #D4AF37, #F5E6A3)',
                              boxShadow: '0 2px 8px rgba(212,175,55,0.4)',
                            }}
                          >
                            <svg
                              className="w-3 h-3 text-navy"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ======= STEP 3: CHOOSE COUNTRY ======= */}
            {step === 2 && (
              <div className="flex flex-col items-center h-full">
                {/* Selected country preview */}
                <div
                  className="text-4xl mb-3"
                  style={{ animation: 'float 3s ease-in-out infinite' }}
                >
                  {countryCode
                    ? COUNTRIES.find((c) => c.code === countryCode)?.flag || '\uD83C\uDF0D'
                    : '\uD83C\uDF0D'}
                </div>

                <h2
                  className="text-2xl sm:text-3xl font-black text-center mb-1"
                  style={{
                    background:
                      'linear-gradient(135deg, #FFFFFF 0%, rgba(255,255,255,0.7) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Where are you from?
                </h2>
                <p className="text-sm text-white/35 text-center mb-5">
                  Represent your nation
                </p>

                {/* Search input */}
                <div className="w-full max-w-xs mb-3">
                  <div
                    className="relative rounded-lg overflow-hidden"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <svg
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      type="text"
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      placeholder="Search countries..."
                      className="w-full bg-transparent text-white text-sm py-2.5 pl-9 pr-4 outline-none placeholder:text-white/20"
                      style={{ caretColor: '#D4AF37' }}
                    />
                  </div>
                </div>

                {/* Scrollable country list */}
                <div
                  className="w-full max-w-xs flex-1 overflow-y-auto rounded-xl"
                  style={{
                    maxHeight: '240px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(212,175,55,0.2) transparent',
                  }}
                >
                  {filteredCountries.length === 0 && (
                    <div className="text-center py-8 text-white/25 text-sm">
                      No countries found
                    </div>
                  )}
                  {filteredCountries.map((country) => {
                    const isSelected = countryCode === country.code;
                    return (
                      <button
                        key={country.code}
                        onClick={() => setCountryCode(country.code)}
                        className="w-full flex items-center gap-3 px-4 py-3 transition-all duration-150 cursor-pointer
                          active:scale-[0.98]"
                        style={{
                          background: isSelected
                            ? 'linear-gradient(90deg, rgba(212,175,55,0.12), rgba(212,175,55,0.04))'
                            : 'transparent',
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                        }}
                      >
                        <span className="text-2xl leading-none">{country.flag}</span>
                        <span
                          className="text-sm font-medium flex-1 text-left transition-colors duration-150"
                          style={{
                            color: isSelected
                              ? '#D4AF37'
                              : 'rgba(255,255,255,0.6)',
                          }}
                        >
                          {country.name}
                        </span>
                        {isSelected && (
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{
                              background:
                                'linear-gradient(135deg, #D4AF37, #F5E6A3)',
                            }}
                          >
                            <svg
                              className="w-3 h-3 text-navy"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* --- BOTTOM: Navigation buttons --- */}
        <div className="pb-8 sm:pb-10 pt-4 flex flex-col items-center gap-3">
          {/* Next / Let's Go button */}
          <button
            onClick={handleNext}
            disabled={!isStepValid()}
            className="w-full max-w-xs py-3.5 rounded-xl font-bold text-base tracking-wide
              transition-all duration-300 cursor-pointer active:scale-[0.96]"
            style={{
              background: isStepValid()
                ? 'linear-gradient(90deg, #8B7425, #D4AF37, #F5E6A3)'
                : 'rgba(255,255,255,0.04)',
              color: isStepValid() ? '#1A1A2E' : 'rgba(255,255,255,0.15)',
              boxShadow: isStepValid()
                ? '0 0 25px rgba(212,175,55,0.35)'
                : 'none',
              cursor: isStepValid() ? 'pointer' : 'not-allowed',
            }}
          >
            {step === 2 ? (
              <span className="flex items-center justify-center gap-2">
                Let's Go!
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            ) : (
              'Next'
            )}
          </button>

          {/* Back button */}
          <button
            onClick={handleBack}
            className="text-sm font-medium transition-all duration-200 cursor-pointer py-2 px-4"
            style={{
              color:
                step > 0 ? 'rgba(255,255,255,0.4)' : 'transparent',
              pointerEvents: step > 0 ? 'auto' : 'none',
            }}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
