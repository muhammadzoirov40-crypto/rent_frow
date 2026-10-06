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
 * RentHub Luxury Hexagon Monogram 'R' (Option 1):
 * Dual-tone 3D faceted hexagon with embedded Letter 'R'
 * Left side: Gold/Orange glow, Right side: Cyan/Electric Blue glow.
 */
export function LogoMark({ className = '' }: { className?: string }) {
  const raw = useId();
  const gradOrange = `hexO${raw.replace(/[^a-zA-Z0-9]/g, '')}`;
  const gradCyan = `hexC${raw.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <svg
      viewBox="0 0 100 100"
      className={`${className} shrink-0`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Left Orange/Gold Gradient */}
        <linearGradient id={gradOrange} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFB300" />
          <stop offset="60%" stopColor="#FF6B35" />
          <stop offset="100%" stopColor="#E63900" />
        </linearGradient>

        {/* Right Cyan Neon Gradient */}
        <linearGradient id={gradCyan} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00F0FF" />
          <stop offset="60%" stopColor="#00B4D8" />
          <stop offset="100%" stopColor="#0077B6" />
        </linearGradient>
      </defs>

      {/* Hexagon Outer Frame */}
      {/* Left Orange Half */}
      <path
        d="M 50 6 L 12 28 L 12 72 L 50 94 Z"
        fill="currentColor"
        fillOpacity="0.06"
        stroke={`url(#${gradOrange})`}
        strokeWidth="4.5"
        strokeLinejoin="round"
      />

      {/* Right Cyan Half */}
      <path
        d="M 50 6 L 88 28 L 88 72 L 50 94 Z"
        fill="currentColor"
        fillOpacity="0.06"
        stroke={`url(#${gradCyan})`}
        strokeWidth="4.5"
        strokeLinejoin="round"
      />

      {/* 3D Facet Bevel Lines */}
      <path d="M 12 28 L 26 36 L 26 64 L 12 72" fill="none" stroke={`url(#${gradOrange})`} strokeWidth="2.5" opacity="0.6" />
      <path d="M 88 28 L 74 36 L 74 64 L 88 72" fill="none" stroke={`url(#${gradCyan})`} strokeWidth="2.5" opacity="0.6" />
      <path d="M 50 6 L 50 20 M 50 80 L 50 94" stroke="#FFFFFF" strokeWidth="2" opacity="0.4" />

      {/* Central Integrated Stylized Monogram "R" */}
      {/* Left Vertical Stem (Orange) */}
      <path
        d="M 34 26 L 34 74 L 44 74 L 44 26 Z"
        fill={`url(#${gradOrange})`}
      />

      {/* Top Loop/Bowl of R (Cyan) */}
      <path
        d="M 44 26 L 58 26 C 70 26, 74 34, 74 44 C 74 54, 68 58, 54 58 L 44 58 Z"
        fill={`url(#${gradCyan})`}
      />

      {/* Inner Loop Cutout */}
      <path
        d="M 44 35 L 56 35 C 62 35, 63 39, 63 44 C 63 49, 60 49, 54 49 L 44 49 Z"
        fill="#090D16"
      />

      {/* Dynamic Diagonal Kick / Leg of R (Cyan) */}
      <path
        d="M 50 56 L 72 78 L 82 78 L 58 54 Z"
        fill={`url(#${gradCyan})`}
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
      className="flex items-center gap-3 group"
      data-testid="logo"
    >
      <div className="p-1 rounded-xl bg-slate-900/40 border border-slate-700/40 group-hover:border-[#FF6B35]/50 transition-colors shadow-sm">
        <LogoMark className={s.mark} />
      </div>
      {showWord && (
        <div className={`flex flex-col ${hideWordOnMobile ? 'hidden sm:flex' : ''}`}>
          <span className={`${s.word} font-black tracking-tight leading-none`}>
            <span className="text-[#FF8A00]">Rent</span>
            <span className="text-[#00F0FF]">Hub</span>
          </span>
          <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase mt-1">
            Аренда & Прокат
          </span>
        </div>
      )}
    </Link>
  );
}
