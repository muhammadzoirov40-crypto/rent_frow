import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  to?: string;
  showWord?: boolean;
  hideWordOnMobile?: boolean;
  onClick?: () => void;
}

const SIZES = {
  sm: { img: 'h-8 sm:h-9 w-auto', word: 'text-xl sm:text-2xl' },
  md: { img: 'h-10 sm:h-11 w-auto', word: 'text-2xl sm:text-3xl' },
  lg: { img: 'h-12 sm:h-14 w-auto', word: 'text-3xl sm:text-4xl' },
  xl: { img: 'h-16 sm:h-18 w-auto', word: 'text-4xl sm:text-5xl' },
};

/**
 * Unified RentHub Concept #1 Emblem:
 * Integrates:
 * 1. House Profile (Roofline and interior portal)
 * 2. Location Pin Geometry (Finding & mapping rentals)
 * 3. Connection / Rental Loop (Exchange between renter & owner)
 * 4. The Monogram 'R'
 * Rendered with deep navy and modern electric blue gradient.
 */
export function LogoMark({ className = 'h-10 w-auto' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`${className} shrink-0`} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="rhUnifiedMark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00A2FF" />
          <stop offset="55%" stopColor="#0066FF" />
          <stop offset="100%" stopColor="#0044CC" />
        </linearGradient>
        <linearGradient id="rhUnifiedNode" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00F0FF" />
          <stop offset="100%" stopColor="#0066FF" />
        </linearGradient>
      </defs>

      {/* Unified Monogram: Pin + Roof + Rental Loop */}
      <path
        d="M 46 6
           C 50 6, 53 8, 56 11
           L 76 30
           C 83 37, 86 46, 83 55
           C 79 66, 68 72, 56 74
           L 78 88
           C 81 90, 79 94, 74 94
           L 59 94
           C 55 94, 51 91, 48 87
           L 32 67
           L 32 88
           C 32 92, 29 94, 25 94
           L 17 94
           C 13 94, 11 92, 11 88
           L 11 12
           C 11 8, 14 6, 18 6
           Z"
        fill="url(#rhUnifiedMark)"
      />

      {/* Negative Space Interior (House Portal & Inverted Pin Peak) */}
      <path
        d="M 27 20
           L 48 8
           C 50 7, 52 7, 54 8
           L 71 23
           C 76 28, 76 37, 71 43
           C 67 48, 60 50, 52 50
           L 27 50
           Z"
        fill="#FFFFFF"
      />

      {/* Central Hub Node (Connection Core) */}
      <circle cx="50" cy="30" r="7" fill="url(#rhUnifiedNode)" />
      <path d="M 50 37 V 45" stroke="url(#rhUnifiedNode)" strokeWidth="3" strokeLinecap="round" />
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
      className="flex items-center gap-2.5 sm:gap-3 group select-none transition-transform duration-150 active:scale-95 shrink-0"
      data-testid="logo"
    >
      {/* 1. Unified Concept #1 Emblem */}
      <LogoMark className={s.img} />

      {/* 2. Premium Wordmark: Rent (Deep Navy) + Hub (Electric Blue) */}
      {showWord && (
        <span
          className={`${s.word} font-black tracking-[-0.03em] leading-none transition-colors flex items-center ${
            hideWordOnMobile ? 'hidden sm:flex' : 'flex'
          }`}
          style={{ fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" }}
        >
          <span className="text-[#0B132B] dark:text-white">Rent</span>
          <span className="text-[#0066FF]">Hub</span>
        </span>
      )}
    </Link>
  );
}
