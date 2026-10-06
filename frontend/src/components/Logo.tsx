import { Link } from 'react-router-dom';
import { useId } from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  to?: string;
  showWord?: boolean;
  hideWordOnMobile?: boolean;
  onClick?: () => void;
}

const SIZES = {
  sm: { mark: 'w-8 h-8', word: 'text-lg' },
  md: { mark: 'w-9 h-9', word: 'text-lg' },
  lg: { mark: 'w-11 h-11', word: 'text-xl' },
};

/* The mark is a skyline over a pin wrapped in ripples: a city, and a place in
 * it — the two things a rental listing is. It is drawn inline (no raster
 * asset) so it stays crisp at every size the header uses.
 *
 * Colour: the gradient runs from `var(--accent)` to a fixed cyan. With the
 * default accent that is exactly the brand orange -> cyan; picking another
 * accent in the theme moves the warm end with it, so the mark never fights
 * the rest of the page. A standalone copy (the favicon) cannot see the page's
 * CSS variables, so `public/favicon.svg` spells the same two colours out
 * literally.
 */
export function LogoMark({ className = '' }: { className?: string }) {
  const raw = useId();
  const grad = `rentHubGrad${raw.replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <svg
      viewBox="0 0 64 64"
      className={`${className} shrink-0`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={grad} x1="2" y1="60" x2="62" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: 'var(--accent, #FF6B35)' }} />
          <stop offset="1" style={{ stopColor: '#22D3EE' }} />
        </linearGradient>
      </defs>

      <g
        fill="none"
        stroke={`url(#${grad})`}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* skyline — seven towers standing on one ground line */}
        <path d="M4 17h8v7h-8z" />
        <path d="M12 9h8v15h-8z" />
        <path d="M20 14h8v10h-8z" />
        <path d="M28 4h8v20h-8z" />
        <path d="M36 14h8v10h-8z" />
        <path d="M44 9h8v15h-8z" />
        <path d="M52 17h8v7h-8z" />

        {/* windows */}
        <g strokeWidth="1.1" strokeOpacity="0.8">
          <path d="M6.5 19.5h3" />
          <path d="M14.5 12h3M14.5 15.5h3M14.5 19h3" />
          <path d="M22.5 17h3M22.5 20.5h3" />
          <path d="M30.5 7h3M30.5 10.5h3M30.5 14h3M30.5 17.5h3" />
          <path d="M38.5 17h3M38.5 20.5h3" />
          <path d="M46.5 12h3M46.5 15.5h3M46.5 19h3" />
          <path d="M54.5 19.5h3" />
        </g>

        {/* the two outer towers' walls drop past the mark and cut inward,
            which is what turns a skyline into a frame */}
        <path d="M4 24v24l9.5 9" />
        <path d="M60 24v24l-9.5 9" />

        {/* ripples around the pin */}
        <circle cx="32" cy="43" r="15" />
        <circle cx="32" cy="43" r="11" />
        <circle cx="32" cy="43" r="7" />

        {/* pin — evenodd so the hole shows whatever is behind the logo */}
        <path
          fill={`url(#${grad})`}
          fillRule="evenodd"
          stroke="none"
          d="M32 47.2C31.2 46.4 28.8 44.6 28.8 41.8a3.2 3.2 0 1 1 6.4 0c0 2.8-2.4 4.6-3.2 5.4zM30.4 41.8a1.6 1.6 0 1 0 3.2 0 1.6 1.6 0 1 0-3.2 0z"
        />
      </g>
    </svg>
  );
}

export default function Logo({ size = 'md', to = '/', showWord = true, hideWordOnMobile = false, onClick }: LogoProps) {
  const s = SIZES[size];
  return (
    <Link to={to} onClick={onClick} aria-label="RentHub" className="flex items-center gap-2.5" data-testid="logo">
      <LogoMark className={s.mark} />
      {showWord && (
        <span
          className={`${s.word} font-extrabold tracking-tight ${hideWordOnMobile ? 'hidden sm:block' : ''}`}
        >
          <span className="text-[#1A1A2E] dark:text-white">Rent</span>
          <span className="text-[var(--accent)]">Hub</span>
        </span>
      )}
    </Link>
  );
}
