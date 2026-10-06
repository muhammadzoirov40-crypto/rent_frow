import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  to?: string;
  showWord?: boolean;
  hideWordOnMobile?: boolean;
  onClick?: () => void;
}

const SIZES = {
  sm: { icon: 'w-7 h-7 text-xs', word: 'text-lg', dot: 'w-1.5 h-1.5' },
  md: { icon: 'w-8 h-8 text-sm', word: 'text-xl', dot: 'w-2 h-2' },
  lg: { icon: 'w-10 h-10 text-base', word: 'text-2xl', dot: 'w-2.5 h-2.5' },
  xl: { icon: 'w-12 h-12 text-lg', word: 'text-3xl', dot: 'w-3 h-3' },
};

/**
 * RentHub Modern Minimalist Wordmark + Luxury Emblem
 * Designed specifically for renthub.qobus.tj:
 * - A refined luxury geometric 'R' tile with golden-amber accent
 * - Pure, ultra-clean Plus Jakarta Sans typography
 * - Dynamic accent 'Hub' that seamlessly blends with the site's dark/light modes
 */
export function LogoMark({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <div
      className={`${className} shrink-0 rounded-xl bg-gradient-to-br from-[#1E2433] via-[#111624] to-[#0A0D14] border border-white/10 shadow-lg flex items-center justify-center relative overflow-hidden group-hover:border-[var(--accent,#FF6B35)]/60 transition-all duration-300`}
    >
      {/* Subtle top inner glow */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      
      {/* Precision Vector 'R' */}
      <svg viewBox="0 0 40 40" className="w-[62%] h-[62%]" fill="none">
        <defs>
          <linearGradient id="rWordmarkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="var(--accent, #FF6B35)" />
            <stop offset="100%" stopColor="#FFA14A" />
          </linearGradient>
        </defs>
        {/* Modern streamlined 'R' */}
        <path
          d="M 11 8 V 32"
          stroke="url(#rWordmarkGrad)"
          strokeWidth="4.2"
          strokeLinecap="round"
        />
        <path
          d="M 11 8 H 22 C 28.5 8, 28.5 20, 22 20 H 11"
          stroke="url(#rWordmarkGrad)"
          strokeWidth="4.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 19 20 L 28.5 32"
          stroke="var(--accent, #FF6B35)"
          strokeWidth="4.2"
          strokeLinecap="round"
        />
        {/* Subtle center keyhole dot */}
        <circle cx="18" cy="14" r="1.8" fill="#FFFFFF" opacity="0.9" />
      </svg>
    </div>
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
      {/* Sleek Emblem */}
      <LogoMark className={s.icon} />

      {/* Clean Premium Wordmark */}
      {showWord && (
        <div className={`flex flex-col justify-center ${hideWordOnMobile ? 'hidden sm:flex' : ''}`}>
          <div className="flex items-center">
            <span
              className={`${s.word} font-black tracking-[-0.03em] leading-none text-slate-900 dark:text-white transition-colors`}
              style={{ fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" }}
            >
              Rent<span className="text-[var(--accent,#FF6B35)]">Hub</span>
            </span>
            {/* Minimalist dot indicator */}
            <span
              className={`${s.dot} rounded-full bg-[var(--accent,#FF6B35)] ml-1 shadow-[0_0_8px_rgba(255,107,53,0.6)] animate-pulse`}
              style={{ animationDuration: '3s' }}
            />
          </div>
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-[0.16em] uppercase mt-0.5 leading-none">
            Аренда & Прокат
          </span>
        </div>
      )}
    </Link>
  );
}
