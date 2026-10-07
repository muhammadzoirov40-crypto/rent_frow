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
 * 100% Transparent Vector LogoMark (Шаффоф / Бе ягон замина ё доғи сафед).
 * Uses true SVG compound path cutout (evenodd rule) so the inner house portal
 * is genuinely transparent and reveals whatever background is behind it (Dark or Light).
 */
export function LogoMark({ className = 'h-10 w-auto' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`${className} shrink-0 bg-transparent`} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="rhUnifiedMark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6C9BFF" />
          <stop offset="55%" stopColor="#2E63F5" />
          <stop offset="100%" stopColor="#143DB8" />
        </linearGradient>
        <linearGradient id="rhUnifiedNode" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5C93FF" />
          <stop offset="100%" stopColor="#2E63F5" />
        </linearGradient>
      </defs>

      {/* 
        Single compound path with fillRule="evenodd":
        Outer: Pin + Roof + Rental Loop
        Inner: House portal cutout (100% transparent through-hole)
      */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
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
           Z
           M 27 20
           L 48 8
           C 50 7, 52 7, 54 8
           L 71 23
           C 76 28, 76 37, 71 43
           C 67 48, 60 50, 52 50
           L 27 50
           Z"
        fill="url(#rhUnifiedMark)"
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
      className="flex items-center gap-2.5 sm:gap-3 group select-none transition-transform duration-150 active:scale-95 shrink-0 bg-transparent"
      data-testid="logo"
    >
      {/* 1. 100% Transparent Emblem */}
      <LogoMark className={s.img} />

      {/* 2. Wordmark: Rent (Navy/White) + Hub (Royal Blue) */}
      {showWord && (
        <span
          className={`${s.word} font-black tracking-[-0.03em] leading-none transition-colors flex items-center bg-transparent ${
            hideWordOnMobile ? 'hidden sm:flex' : 'flex'
          }`}
          style={{ fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" }}
        >
          <span className="text-[#0B132B] dark:text-white">Rent</span>
          <span className="text-[#2E63F5]">Hub</span>
        </span>
      )}
    </Link>
  );
}
