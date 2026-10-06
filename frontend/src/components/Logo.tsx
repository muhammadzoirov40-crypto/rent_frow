import { Link } from 'react-router-dom';
import { useId } from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  to?: string;
  showWord?: boolean;
  hideWordOnMobile?: boolean;
  onClick?: () => void;
}

const SIZES = {
  sm: { mark: 'w-8 h-8', word: 'text-base' },
  md: { mark: 'w-10 h-10', word: 'text-lg' },
  lg: { mark: 'w-12 h-12', word: 'text-xl' },
  xl: { mark: 'w-16 h-16', word: 'text-2xl' },
};

/**
 * RentHub Option 1 Logo:
 * Premium Monogram 'R' merging a City Skyline, a Keyhole Portal, and a dynamic Forward Arrow.
 */
export function LogoMark({ className = '' }: { className?: string }) {
  const raw = useId();
  const gradPrimary = `rhGradP${raw.replace(/[^a-zA-Z0-9]/g, '')}`;
  const gradCool = `rhGradC${raw.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <svg
      viewBox="0 0 100 100"
      className={`${className} shrink-0`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Warm Orange Gradient (Brand Accent) */}
        <linearGradient id={gradPrimary} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'var(--accent, #FF6B35)' }} />
          <stop offset="100%" style={{ stopColor: '#FF4500' }} />
        </linearGradient>

        {/* Cool Cyan / Electric Blue Gradient */}
        <linearGradient id={gradCool} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#00F0FF' }} />
          <stop offset="100%" style={{ stopColor: '#0284C7' }} />
        </linearGradient>
      </defs>

      {/* --- City Skyline Silhouette atop the R --- */}
      <g fill="none" stroke={`url(#${gradCool})`} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.9">
        {/* Left tower */}
        <path d="M 38 32 L 38 20 L 48 20 L 48 32" />
        {/* Center skyscraper with spire */}
        <path d="M 50 32 L 50 12 L 62 12 L 62 32" />
        <path d="M 56 12 L 56 6" />
        {/* Right building */}
        <path d="M 64 32 L 64 22 L 74 22 L 74 34" />
        {/* Window accents */}
        <path d="M 43 24 h 1 M 56 17 h 1 M 56 22 h 1 M 69 26 h 1" stroke="#FFFFFF" strokeWidth="2.5" />
      </g>

      {/* --- Main Monogram 'R' Structure --- */}
      {/* 1. Left Vertical Pillar (Orange Gradient) */}
      <path
        d="M 28 32 L 28 86"
        stroke={`url(#${gradPrimary})`}
        strokeWidth="11"
        strokeLinecap="round"
      />

      {/* 2. Keyhole Arch & Upper Bowl of 'R' */}
      <path
        d="M 28 32 C 28 17, 78 17, 78 48 C 78 64, 52 64, 40 64"
        fill="none"
        stroke={`url(#${gradPrimary})`}
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 3. Dynamic Diagonal Leg / Arrow of 'R' (Cyan to Electric Blue) */}
      <path
        d="M 55 58 L 82 86"
        stroke={`url(#${gradCool})`}
        strokeWidth="11"
        strokeLinecap="round"
      />

      {/* 4. Center Keyhole Core (Representing Security & Rental Access) */}
      <circle cx="53" cy="45" r="5" fill="#FFFFFF" />
      <polygon points="50.5,46 55.5,46 57,56 49,56" fill="#FFFFFF" />
    </svg>
  );
}

export default function Logo({
  size = 'md',
  to = '/',
  showWord = true,
  hideWordOnMobile = false,
  onClick,
}: LogoProps) {
  const s = SIZES[size];
  return (
    <Link
      to={to}
      onClick={onClick}
      aria-label="RentHub"
      className="flex items-center gap-3 group"
      data-testid="logo"
    >
      <div className="p-1 rounded-xl bg-slate-900/40 border border-slate-700/40 group-hover:border-[var(--accent,#FF6B35)]/50 transition-colors shadow-sm">
        <LogoMark className={s.mark} />
      </div>
      {showWord && (
        <div className={`flex flex-col ${hideWordOnMobile ? 'hidden sm:flex' : ''}`}>
          <span className={`${s.word} font-black tracking-tight leading-none`}>
            <span className="text-slate-900 dark:text-white">Rent</span>
            <span className="text-[var(--accent,#FF6B35)]">Hub</span>
          </span>
          <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase mt-1">
            Аренда & Прокат
          </span>
        </div>
      )}
    </Link>
  );
}
