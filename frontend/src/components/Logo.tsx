import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  to?: string;
  showWord?: boolean;
  hideWordOnMobile?: boolean;
  onClick?: () => void;
}

const SIZES = {
  sm: { img: 'h-8 sm:h-9', word: 'text-xl sm:text-2xl' },
  md: { img: 'h-10 sm:h-11', word: 'text-2xl sm:text-3xl' },
  lg: { img: 'h-12 sm:h-14', word: 'text-3xl sm:text-4xl' },
  xl: { img: 'h-16 sm:h-18', word: 'text-4xl sm:text-5xl' },
};

/**
 * Exact Vector LogoMark matching user's requested identity:
 * - Royal Blue gradient Letter 'R'
 * - Negative space White House Roof cut into the R
 * - 4 Blue Window panes
 */
export function LogoMark({ className = 'h-10 w-auto' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`${className} shrink-0`} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="rBlueGradNative" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00A2FF" />
          <stop offset="45%" stopColor="#0066FF" />
          <stop offset="100%" stopColor="#0038FF" />
        </linearGradient>
      </defs>

      {/* Main R Body */}
      <path
        d="M 16 12 
           C 16 7, 20 4, 28 4 
           L 58 4 
           C 80 4, 90 16, 90 35 
           C 90 50, 78 60, 58 64 
           L 88 95 
           C 90 97, 88 100, 84 100 
           L 68 100 
           C 64 100, 60 97, 57 93 
           L 38 68 
           L 38 96 
           C 38 99, 35 100, 32 100 
           L 20 100 
           C 17 100, 16 98, 16 95 
           Z"
        fill="url(#rBlueGradNative)"
      />

      {/* Negative Space White Roof Overhang */}
      <path
        d="M 16 42 
           L 48 16 
           C 50 14, 53 14, 55 16 
           L 76 34 
           L 70 42 
           L 50 24 
           L 26 44 
           Z"
        fill="#FFFFFF"
      />

      {/* White House Body Cutout */}
      <path
        d="M 32 44 
           L 50 28 
           L 66 42 
           L 66 64 
           L 32 64 
           Z"
        fill="#FFFFFF"
      />

      {/* 4 Blue Windows inside the house */}
      <g fill="#0066FF">
        <rect x="38" y="44" width="8" height="8" rx="2" />
        <rect x="50" y="44" width="8" height="8" rx="2" />
        <rect x="38" y="55" width="8" height="8" rx="2" />
        <rect x="50" y="55" width="8" height="8" rx="2" />
      </g>
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
      {/* 1. Vector Logo Emblem */}
      <LogoMark className={s.img} />

      {/* 2. Exact Typography: ONLY 'RentHub' (NO SUBTITLE/SLOGAN) */}
      {showWord && (
        <span
          className={`${s.word} font-black tracking-[-0.03em] leading-none text-slate-900 dark:text-white transition-colors flex items-center ${
            hideWordOnMobile ? 'hidden sm:flex' : 'flex'
          }`}
          style={{ fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" }}
        >
          Rent<span className="text-[#0066FF]">Hub</span>
        </span>
      )}
    </Link>
  );
}
