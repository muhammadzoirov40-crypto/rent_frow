import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  to?: string;
  onClick?: () => void;
}

const SIZES = {
  sm: 'h-10 sm:h-11 w-auto',
  md: 'h-12 w-auto',
  lg: 'h-14 sm:h-16 w-auto',
  xl: 'h-20 sm:h-24 w-auto',
};

const FONT = "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";

/** Four-point sparkle: the star tapers to a point on every arm. */
const SPARKLE =
  'M 0 -1 C 0.09 -0.33 0.33 -0.09 1 0 C 0.33 0.09 0.09 0.33 0 1 C -0.09 0.33 -0.33 0.09 -1 0 C -0.33 -0.09 -0.09 -0.33 0 -1 Z';

function Sparkle({
  x,
  y,
  r,
  fill = 'url(#rhSparkleGrad)',
}: {
  x: number;
  y: number;
  r: number;
  fill?: string;
}) {
  return <path d={SPARKLE} transform={`translate(${x} ${y}) scale(${r})`} fill={fill} />;
}

/**
 * Full circular emblem, one self-contained mark: a bright green rim around a
 * dark green disc, the white R with the green H, sparkles above, an orbit
 * swoosh that sweeps under the letters (white on the left, green on the
 * right) and ends in a leaf, then the RentHub wordmark, the tagline and the
 * smile — everything the favicon carries, so the tab and the header agree.
 */
export function LogoMark({ className = 'h-10 w-auto' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={`${className} shrink-0 bg-transparent`} role="img" aria-label="RentHub">
      <defs>
        <linearGradient id="rhRingGrad" x1="10%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%" stopColor="#A9E633" />
          <stop offset="45%" stopColor="#79C814" />
          <stop offset="100%" stopColor="#4C9A07" />
        </linearGradient>
        <radialGradient id="rhDiscGrad" cx="36%" cy="24%" r="88%">
          <stop offset="0%" stopColor="#2E7D17" />
          <stop offset="55%" stopColor="#124A0D" />
          <stop offset="100%" stopColor="#07290A" />
        </radialGradient>
        {/* One user-space gradient for the whole design, so the H, the Hub
            word and the leaf always share the same green. */}
        <linearGradient id="rhGreenGrad" gradientUnits="userSpaceOnUse" x1="70" y1="20" x2="155" y2="175">
          <stop offset="0%" stopColor="#B7F03F" />
          <stop offset="55%" stopColor="#7CC50F" />
          <stop offset="100%" stopColor="#4C9B08" />
        </linearGradient>
        <linearGradient id="rhSwooshGrad" gradientUnits="userSpaceOnUse" x1="30" y1="100" x2="172" y2="88">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="38%" stopColor="#F6FCE8" />
          <stop offset="62%" stopColor="#A8E02C" />
          <stop offset="100%" stopColor="#59A80C" />
        </linearGradient>
        <linearGradient id="rhSparkleGrad" gradientUnits="userSpaceOnUse" x1="90" y1="14" x2="130" y2="45">
          <stop offset="0%" stopColor="#DFFF73" />
          <stop offset="100%" stopColor="#85CC10" />
        </linearGradient>
      </defs>

      {/* Rim + disc */}
      <circle cx="100" cy="100" r="99" fill="url(#rhRingGrad)" />
      <circle cx="100" cy="100" r="91.5" fill="url(#rhDiscGrad)" />
      {/* Leaf sliver tucked inside the rim, upper-left */}
      <path
        d="M 19.9 66 A 87 87 0 0 1 73.1 17.3 A 80 80 0 0 0 26.3 68.9 Z"
        fill="#2F8A1A"
        opacity="0.75"
      />

      {/* Sparkles above the monogram */}
      <Sparkle x={95} y={32} r={10} />
      <Sparkle x={114} y={21} r={5.5} />
      <Sparkle x={128} y={32} r={3.5} />

      {/* RH monogram: white R, green H */}
      <text x="77" y="116" textAnchor="middle" fontFamily={FONT} fontWeight="800" fontSize="82" letterSpacing="-2" fill="#FFFFFF">
        R
      </text>
      <text x="128" y="116" textAnchor="middle" fontFamily={FONT} fontWeight="800" fontSize="82" letterSpacing="-2" fill="url(#rhGreenGrad)">
        H
      </text>

      {/* Orbit swoosh: crosses the R's foot in white and turns green on the
          right, exactly as it wraps the letters in the brand mark */}
      <path
        d="M 32 86 Q 100 162 168 82"
        stroke="url(#rhSwooshGrad)"
        strokeWidth="11"
        fill="none"
        strokeLinecap="round"
      />
      {/* Leaf growing off the swoosh's green end */}
      <path d="M 150 104 Q 172 104 178 124 Q 154 124 150 104 Z" fill="url(#rhGreenGrad)" />

      {/* Wordmark, inside the disc */}
      <text x="100" y="152" textAnchor="middle" fontFamily={FONT} fontWeight="800" fontSize="32" letterSpacing="-0.5">
        <tspan fill="#FFFFFF">Rent</tspan>
        <tspan fill="url(#rhGreenGrad)">Hub</tspan>
      </text>

      {/* Tagline with its dashes */}
      <line x1="38" y1="164.5" x2="54" y2="164.5" stroke="url(#rhGreenGrad)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="146" y1="164.5" x2="162" y2="164.5" stroke="url(#rhGreenGrad)" strokeWidth="2.5" strokeLinecap="round" />
      <text x="100" y="168" textAnchor="middle" fontFamily={FONT} fontWeight="600" fontSize="10.5" letterSpacing="0.8" fill="#FFFFFF">
        Happy Fun Mood
      </text>

      {/* Smile */}
      <path d="M 78 173 Q 100 186 122 173" stroke="#E4F7C2" strokeWidth="4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({ size = 'md', to = '/', onClick }: LogoProps) {
  const s = SIZES[size];

  return (
    <Link
      to={to}
      onClick={onClick}
      aria-label="RentHub"
      className="flex items-center gap-2.5 sm:gap-3 group select-none transition-transform duration-150 active:scale-95 shrink-0 bg-transparent"
      data-testid="logo"
    >
      {/* The emblem carries the wordmark, the tagline and the smile — the
          whole brand in one circle, so no separate word is needed beside it. */}
      <LogoMark className={s} />
    </Link>
  );
}
