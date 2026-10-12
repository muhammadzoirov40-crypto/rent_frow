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

/** Four-point sparkle: the star tapers to a point on every arm. */
const SPARKLE =
  'M 0 -1 C 0.09 -0.33 0.33 -0.09 1 0 C 0.33 0.09 0.09 0.33 0 1 C -0.09 0.33 -0.33 0.09 -1 0 C -0.33 -0.09 -0.09 -0.33 0 -1 Z';

function Sparkle({ x, y, r, fill = '#A3E635' }: { x: number; y: number; r: number; fill?: string }) {
  return <path d={SPARKLE} transform={`translate(${x} ${y}) scale(${r})`} fill={fill} />;
}

/**
 * RH emblem: a dark-green badge carrying the white RH monogram, lime
 * sparkles above it, and an orbit that runs behind the badge at the crown
 * and crosses in front of it as a white crescent at the bottom — the same
 * mark as the favicon, so the tab and the header never disagree.
 */
export function LogoMark({ className = 'h-10 w-auto' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={`${className} shrink-0 bg-transparent`} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="rhBadgeGrad" x1="12%" y1="0%" x2="88%" y2="100%">
          <stop offset="0%" stopColor="#1C6B3B" />
          <stop offset="45%" stopColor="#11502B" />
          <stop offset="100%" stopColor="#06301A" />
        </linearGradient>
        {/* One gradient in user space for the whole orbit, so the half drawn
            in front of the badge matches the half drawn behind it exactly. */}
        <linearGradient id="rhOrbitGrad" gradientUnits="userSpaceOnUse" x1="60" y1="24" x2="60" y2="104">
          <stop offset="0%" stopColor="#A3E635" />
          <stop offset="45%" stopColor="#D9F99D" />
          <stop offset="78%" stopColor="#F7FEE7" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>
      </defs>

      {/* Sparkles above the badge */}
      <Sparkle x={30} y={16} r={7.5} />
      <Sparkle x={63} y={7} r={4.5} />
      <Sparkle x={95} y={19} r={3.5} />

      {/* Orbit: behind the badge… */}
      <ellipse
        cx="60"
        cy="64"
        rx="57"
        ry="37"
        transform="rotate(-16 60 64)"
        stroke="url(#rhOrbitGrad)"
        strokeWidth="5"
      />

      {/* Badge with the RH monogram */}
      <circle cx="60" cy="64" r="38" fill="url(#rhBadgeGrad)" />

      {/* …and in front of it: the white crescent at the bottom */}
      <path
        d="M 3 64 A 57 37 0 0 0 117 64"
        transform="rotate(-16 60 64)"
        stroke="url(#rhOrbitGrad)"
        strokeWidth="5"
        fill="none"
      />

      <text
        x="60"
        y="80"
        textAnchor="middle"
        fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
        fontWeight="800"
        fontSize="44"
        letterSpacing="-1.5"
        fill="#FFFFFF"
      >
        RH
      </text>
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
      {/* 1. RH emblem */}
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
          <span className="text-[var(--accent)]">Hub</span>
        </span>
      )}
    </Link>
  );
}
