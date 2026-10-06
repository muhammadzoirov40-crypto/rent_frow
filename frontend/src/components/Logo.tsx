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
  sm: { icon: 'w-7 h-7', word: 'text-lg' },
  md: { icon: 'w-8 h-8', word: 'text-xl' },
  lg: { icon: 'w-10 h-10', word: 'text-2xl' },
  xl: { icon: 'w-12 h-12', word: 'text-3xl' },
};

/**
 * RentHub symbol — one mark, five meanings:
 *
 *   LOCATION  the outer silhouette is a map pin
 *   HOME      the pin's core is carved away into a house (negative space)
 *   RENTAL    a house inside a pin is the universal "place to rent" gesture
 *   HUB       two linked nodes — renter and owner — meeting under one roof
 *   TRUST     one continuous geometric shape, rounded but precise
 *
 * Colors are theme-aware tokens (index.css): deep navy + electric blue.
 */
export function LogoMark({ className = 'w-8 h-8' }: { className?: string }) {
  const raw = useId();
  const gid = `rh${raw.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <svg
      viewBox="0 0 64 64"
      className={`${className} shrink-0`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gid} x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--logo-grad-a, #0B2447)" />
          <stop offset="0.5" stopColor="var(--logo-grad-b, #123F86)" />
          <stop offset="1" stopColor="var(--logo-blue, #1B6EF3)" />
        </linearGradient>
      </defs>

      {/* Pin with the house cut out of it (single path, evenodd) */}
      <path
        fill={`url(#${gid})`}
        fillRule="evenodd"
        d="M32 4 C18.7 4 8 14.7 8 28
           C8 41.8 22.5 54.4 28.6 58.9
           A4.7 4.7 0 0 0 35.4 58.9
           C41.5 54.4 56 41.8 56 28
           C56 14.7 45.3 4 32 4 Z
           M32 14.6 L47.4 26.6
           Q48.8 27.7 48.8 29.4
           L48.8 37.3
           Q48.8 40 46.1 40
           L17.9 40
           Q15.2 40 15.2 37.3
           L15.2 29.4
           Q15.2 27.7 16.6 26.6 Z"
      />

      {/* The hub: two connected nodes (renter + owner) */}
      <circle cx="27.7" cy="32.4" r="5.4" fill="var(--logo-node, #0B2447)" />
      <circle cx="36.3" cy="32.4" r="5.4" fill="var(--logo-blue, #1B6EF3)" fillOpacity="0.94" />
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
      className="flex items-center gap-2.5 group select-none transition-transform duration-200 active:scale-95"
      data-testid="logo"
    >
      <LogoMark className={s.icon} />

      {showWord && (
        <div className={`flex flex-col justify-center ${hideWordOnMobile ? 'hidden sm:flex' : ''}`}>
          <span
            className={`${s.word} font-black tracking-[-0.03em] leading-none transition-colors`}
            style={{ fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" }}
          >
            <span className="text-[var(--logo-word,#0B2447)] dark:text-white">Rent</span>
            <span className="text-[var(--logo-blue,#1B6EF3)]">Hub</span>
          </span>
        </div>
      )}
    </Link>
  );
}
