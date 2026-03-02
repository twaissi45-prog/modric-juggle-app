// ============================================
// HowItWorks — Modal overlay explaining the game
// Camera → AI Detection → Juggle → Score
// ============================================

import { useState, useEffect } from 'react';

const STEPS = [
  {
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
    title: 'Set Up Camera',
    desc: 'Position your phone so it can see your full body. Use a stand or lean it against something.',
    color: '#00B4FF',
  },
  {
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="3" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
        <line x1="12" y1="16" x2="8" y2="22" />
        <line x1="12" y1="16" x2="16" y2="22" />
      </svg>
    ),
    title: 'AI Tracks You',
    desc: 'MediaPipe AI detects your body pose in real-time — feet, thighs, and head are tracked as touch zones.',
    color: '#00FFD4',
  },
  {
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M12 2a10 10 0 0 1 0 20 10 10 0 0 1 0-20zm0 2l2 3h3.5l1 3-2.5 2.5 1 3.5-3 1-2 3-2-3-3-1 1-3.5L4.5 10l1-3H9l2-3z" opacity="0.4" />
      </svg>
    ),
    title: 'Ball Detection',
    desc: 'AI-powered COCO-SSD detects the football in real-time. Keep the ball visible to the camera.',
    color: '#D4AF37',
  },
  {
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C8 2 4 6 4 10c0 5 4 7 4 12h8c0-5 4-7 4-12 0-4-4-8-8-8z" />
      </svg>
    ),
    title: 'Juggle & Score',
    desc: 'Each time the ball touches a body zone, you score! Build combos for multiplied points. Don\'t let it drop!',
    color: '#00FF88',
  },
];

const TIPS = [
  { emoji: '💡', text: 'Good lighting makes tracking much better' },
  { emoji: '📏', text: 'Stand 2-3 meters from the camera' },
  { emoji: '⚽', text: 'Use a real football for best detection' },
  { emoji: '👕', text: 'Wear clothes that contrast with the ball' },
];

export default function HowItWorks({ onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 250);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-250"
        style={{ opacity: visible ? 1 : 0 }}
      />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-md max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl transition-all duration-300"
        style={{
          background: 'linear-gradient(180deg, rgba(26,26,46,0.98), rgba(10,10,26,0.99))',
          border: '1px solid rgba(212,175,55,0.12)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5), 0 0 60px rgba(212,175,55,0.04)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(40px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/15" />
        </div>

        {/* Header */}
        <div className="px-6 pt-4 pb-3 flex items-center justify-between">
          <div>
            <h2
              className="text-xl font-black tracking-tight"
              style={{
                background: 'linear-gradient(105deg, #D4AF37, #F5E6A3, #D4AF37)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              How It Works
            </h2>
            <p className="text-[11px] text-white/35 mt-0.5 tracking-wide">AI-powered juggling detection</p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center
              hover:bg-white/[0.12] active:scale-90 transition-all duration-200 cursor-pointer"
          >
            <svg className="w-4 h-4 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Steps */}
        <div className="px-6 pb-2">
          {STEPS.map((step, idx) => (
            <div
              key={idx}
              className="flex gap-4 mb-4 last:mb-2"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(16px)',
                transition: `opacity 0.4s ease-out ${150 + idx * 100}ms, transform 0.4s ease-out ${150 + idx * 100}ms`,
              }}
            >
              {/* Step number + icon */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center relative"
                  style={{
                    background: `${step.color}10`,
                    border: `1px solid ${step.color}25`,
                    color: step.color,
                  }}
                >
                  {step.icon}
                  <span
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center"
                    style={{
                      background: step.color,
                      color: '#0a0a1a',
                    }}
                  >
                    {idx + 1}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className="w-px h-6 mt-1"
                    style={{
                      background: `linear-gradient(to bottom, ${step.color}30, transparent)`,
                    }}
                  />
                )}
              </div>

              {/* Text */}
              <div className="pt-1.5 min-w-0">
                <h3 className="text-sm font-bold text-white/90 mb-0.5">{step.title}</h3>
                <p className="text-xs text-white/40 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="mx-6 mb-3">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/15" />
            <span className="text-[9px] text-gold/40 uppercase tracking-[0.2em] font-bold">Pro Tips</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/15" />
          </div>
        </div>

        {/* Tips */}
        <div className="px-6 pb-3">
          <div className="grid grid-cols-2 gap-2">
            {TIPS.map((tip, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  opacity: visible ? 1 : 0,
                  transition: `opacity 0.3s ease-out ${500 + idx * 80}ms`,
                }}
              >
                <span className="text-base flex-shrink-0">{tip.emoji}</span>
                <span className="text-[10px] text-white/45 leading-snug font-medium">{tip.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scoring section */}
        <div className="px-6 pb-4">
          <div
            className="rounded-xl px-4 py-3"
            style={{
              background: 'linear-gradient(135deg, rgba(212,175,55,0.06), rgba(0,255,136,0.03))',
              border: '1px solid rgba(212,175,55,0.12)',
            }}
          >
            <h4 className="text-xs font-bold text-gold/80 mb-2">Scoring</h4>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-white/50">Foot touch</span>
                <span className="text-[11px] font-bold text-white/70">+1 pt</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-white/50">Thigh touch</span>
                <span className="text-[11px] font-bold text-white/70">+1.5 pts</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-white/50">Head touch</span>
                <span className="text-[11px] font-bold text-white/70">+2 pts</span>
              </div>
              <div className="h-px bg-white/[0.06] my-1" />
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-gold/60">Combo multiplier</span>
                <span className="text-[11px] font-bold text-gold/80">up to 3x</span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="px-6 pb-6">
          <button
            onClick={handleClose}
            className="w-full py-3.5 rounded-xl font-bold text-sm tracking-wide text-black
              bg-gradient-to-r from-[#8B7425] via-[#D4AF37] to-[#F5E6A3]
              shadow-[0_0_25px_rgba(212,175,55,0.3)] hover:shadow-[0_0_40px_rgba(212,175,55,0.5)]
              active:scale-[0.96] transition-all duration-200 cursor-pointer"
          >
            Got It — Let's Play!
          </button>
        </div>
      </div>
    </div>
  );
}
