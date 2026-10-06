import { Link } from 'react-router-dom';

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

/**
 * House + handshake mark (The true native identity of https://renthub.qobus.tj/).
 * Drawn inline so it dynamically reacts to theme variables (--accent), stays razor sharp,
 * and maintains 100% brand authenticity on desktop and mobile.
 */
export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={`${className} shrink-0 text-[var(--accent,#FF6B35)]`}
      aria-hidden="true"
      focusable="false"
    >
      {/* House walls */}
      <path
        d="M11.5 26V57h41V26"
        fill="none"
        stroke="currentColor"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Roof with overhang */}
      <path
        d="M4 31 32 7l28 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Window */}
      <g fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
        <rect x="37.5" y="22" width="11" height="11" rx="1.5" />
        <path d="M43 22v11M37.5 27.5h11" />
      </g>
      {/* Handshake: sleeves */}
      <g fill="none" stroke="currentColor" strokeOpacity="0.6" strokeWidth="9" strokeLinecap="round">
        <path d="M16 53 26 46" />
        <path d="M48 53 38 46" />
      </g>
      {/* Clasped hands */}
      <rect x="22" y="40" width="20" height="13" rx="6" fill="currentColor" />
      {/* Thumb grip */}
      <rect x="24" y="36" width="10" height="9" rx="4.5" fill="currentColor" />
      {/* Grip line */}
      <path
        d="M33 50.5 39.5 44"
        fill="none"
        stroke="#fff"
        strokeOpacity="0.7"
        strokeWidth="1.7"
        strokeLinecap="round"
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
      className="flex items-center gap-2.5 transition-opacity hover:opacity-95"
      data-testid="logo"
    >
      <LogoMark className={s.mark} />
      {showWord && (
        <span
          className={`${s.word} font-extrabold tracking-tight ${
            hideWordOnMobile ? 'hidden sm:block' : ''
          }`}
        >
          <span className="text-[#1A1A2E] dark:text-white">Rent</span>
          <span className="text-[var(--accent,#FF6B35)]">Hub</span>
        </span>
      )}
    </Link>
  );
}
