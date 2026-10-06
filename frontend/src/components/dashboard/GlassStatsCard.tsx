import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface GlassStatsCardProps {
  title: string;
  value: string;
  change?: number;
  icon?: LucideIcon;
  gradient?: string;
  subtitle?: string;
}

/**
 * Premium Glass Stats Card matching Code.xr Dashboard V10
 * Glassmorphic blurred dark background, subtle border glow, and interactive hover
 */
export const GlassStatsCard: React.FC<GlassStatsCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  gradient = 'from-[#FF6B35]/20 to-transparent',
  subtitle,
}) => {
  const hasChange = typeof change === 'number' && !Number.isNaN(change);
  const isPositive = hasChange && change >= 0;

  return (
    <motion.div
      whileHover={{ y: -5, transition: { duration: 0.2, ease: 'easeOut' } }}
      className="glass-card glass-card-hover p-5 sm:p-6 rounded-2xl relative overflow-hidden group cursor-pointer"
    >
      {/* Background radial gradient accent */}
      <div
        className={`absolute -top-10 -right-10 w-28 h-28 bg-gradient-to-br ${gradient} rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500`}
      />

      <div className="flex items-center justify-between mb-3 relative z-10">
        <div>
          <p className="text-xs sm:text-sm font-medium text-white/60 tracking-wide uppercase">
            {title}
          </p>
        </div>

        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[var(--accent,#FF6B35)] group-hover:border-[var(--accent,#FF6B35)]/40 transition-colors shadow-inner">
            <Icon size={18} />
          </div>
        )}
      </div>

      <div className="relative z-10">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight tabular-nums">
          {value}
        </h2>

        <div className="flex items-center gap-2 mt-2">
          {hasChange && (
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-lg border ${
                isPositive
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              }`}
            >
              {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {Math.abs(change).toFixed(1)}%
            </span>
          )}

          {subtitle && (
            <span className="text-[11px] text-white/40 truncate">
              {subtitle}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default GlassStatsCard;
