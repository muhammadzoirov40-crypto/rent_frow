import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  to?: string;
  showWord?: boolean;
  hideWordOnMobile?: boolean;
  onClick?: () => void;
}

const SIZES = {
  sm: { tile: 'w-8 h-8 rounded-xl', word: 'text-lg' },
  md: { tile: 'w-9 h-9 rounded-xl', word: 'text-lg' },
  lg: { tile: 'w-11 h-11 rounded-2xl', word: 'text-xl' },
};

function Mark({ className }: { className: string }) {
  return (
    <span
      className={`${className} shrink-0 flex items-center justify-center bg-gradient-to-br from-[#FF6B35] via-[#ff7f4d] to-[#ff9162] shadow-lg shadow-orange-500/30 ring-1 ring-inset ring-white/20`}
    >
      <svg viewBox="0 0 64 64" className="w-[64%] h-[64%]" aria-hidden="true">
        <path
          d="M20 48V16h14.5c6.9 0 11.5 4.2 11.5 10.4 0 4.4-2.4 7.8-6.3 9.3L48 48h-7.8l-7.4-11.2H27V48h-7zm7-17.6h7.1c3.3 0 5.4-1.7 5.4-4.4s-2.1-4.4-5.4-4.4H27v8.8z"
          fill="#fff"
        />
      </svg>
    </span>
  );
}

export default function Logo({ size = 'md', to = '/', showWord = true, hideWordOnMobile = false, onClick }: LogoProps) {
  const s = SIZES[size];
  return (
    <Link to={to} onClick={onClick} className="flex items-center gap-2.5" data-testid="logo">
      <Mark className={s.tile} />
      {showWord && (
        <span
          className={`${s.word} font-extrabold tracking-tight ${hideWordOnMobile ? 'hidden sm:block' : ''}`}
        >
          <span className="text-[#1A1A2E] dark:text-white">Rent</span>
          <span className="text-[#FF6B35]">Hub</span>
        </span>
      )}
    </Link>
  );
}
