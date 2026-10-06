import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  to?: string;
  showWord?: boolean;
  hideWordOnMobile?: boolean;
  onClick?: () => void;
}

const SIZES = {
  sm: { img: 'h-9 w-9', word: 'text-lg' },
  md: { img: 'h-10 w-10', word: 'text-xl' },
  lg: { img: 'h-12 w-12', word: 'text-2xl' },
  xl: { img: 'h-16 w-16', word: 'text-3xl' },
};

/**
 * Option 1 Logo Emblem (The Integrated 'R' with keyhole & city)
 */
export function LogoMark({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      alt="RentHub"
      className={`${className} object-cover rounded-xl shadow-md border border-white/10 shrink-0 transition-transform duration-200 group-hover:scale-105`}
      loading="eager"
    />
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
      className="flex items-center gap-2.5 group select-none transition-opacity hover:opacity-95"
      data-testid="logo"
    >
      <img
        src="/logo.png"
        alt="RentHub Logo"
        className={`${s.img} object-cover rounded-xl shadow-md border border-white/10 shrink-0 group-hover:scale-105 transition-transform duration-200`}
        loading="eager"
      />

      {showWord && (
        <span
          className={`${s.word} font-black tracking-tight leading-none text-slate-900 dark:text-white transition-colors flex items-center ${
            hideWordOnMobile ? 'hidden sm:flex' : 'flex'
          }`}
          style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
        >
          Rent<span className="text-[#FF6B35]">Hub</span>
        </span>
      )}
    </Link>
  );
}
