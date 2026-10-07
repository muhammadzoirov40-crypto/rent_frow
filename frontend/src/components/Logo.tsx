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
 * Concept #1 — one symbol, not a collage.
 *
 * A map pin (location / hub) whose interior is carved away into a gable-roofed
 * house (home / property) by a single even-odd path, so the house is true
 * negative space and adapts to whatever sits behind the mark. Standing in that
 * opening is an arched doorway (rental entry — where renter and owner meet):
 * it sits on the floor line and shares its axis with the pin's point, so the
 * eye travels point -> door -> roof as one movement.
 *
 * The doorway is deliberately a single solid arch. A two-leaf split was built
 * and measured: at 32px and 36px the 2u seam rasterises to 44-50% alpha, i.e.
 * a soft stripe through the door at exactly favicon and header size. A third
 * feature does not survive those sizes, so it is left out rather than shipped
 * mushy.
 *
 * Colours come from the brand tokens in index.css (--logo-grad-a/b,
 * --logo-blue), which already swap to a lighter ramp under `.dark`.
 */
export function LogoMark({ className = 'h-10 w-auto' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={`${className} shrink-0`}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id="rhMarkGrad"
          x1="8"
          y1="4"
          x2="56"
          y2="60"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="var(--logo-grad-a, #0b2447)" />
          <stop offset="0.55" stopColor="var(--logo-grad-b, #123f86)" />
          <stop offset="1" stopColor="var(--logo-blue, #1b6ef3)" />
        </linearGradient>
      </defs>

      {/* Pin with the house cut out of it. Even-odd: pin (1) + house (2) = open. */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill="url(#rhMarkGrad)"
        d="M32 61 C36 54.5 55.6 41 55.6 27.2 A23.6 23.6 0 0 0 8.4 27.2 C8.4 41 28 54.5 32 61 Z
           M32 12.6 L46.4 22.8 Q47.5 23.6 47.5 24.9 L47.5 34 Q47.5 36.5 45 36.5 L19 36.5
           Q16.5 36.5 16.5 34 L16.5 24.9 Q16.5 23.6 17.6 22.8 Z"
      />

      {/* The doorway: drawn over the opening and 1u past the floor line so its
          base fuses with the solid pin instead of meeting it on a shared edge. */}
      <path
        fill="url(#rhMarkGrad)"
        d="M27.5 37.5 L27.5 30.5 A4.5 4.5 0 0 1 36.5 30.5 L36.5 37.5 Z"
      />
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

      {/* 2. Wordmark: “Rent” deep navy, “Hub” electric blue (theme-aware). */}
      {showWord && (
        <span
          className={`${s.word} font-black tracking-[-0.03em] leading-none text-[var(--logo-word)] transition-colors flex items-center ${
            hideWordOnMobile ? 'hidden sm:flex' : 'flex'
          }`}
          style={{ fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" }}
        >
          Rent<span className="text-[var(--logo-blue)]">Hub</span>
        </span>
      )}
    </Link>
  );
}
