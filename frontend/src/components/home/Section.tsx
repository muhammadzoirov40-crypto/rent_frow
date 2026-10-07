import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

interface SectionProps {
  id?: string;
  title: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
  className?: string;
  headingAs?: 'h2' | 'h3';
}

/** Shared page section: title + optional hint + optional "view all" action. */
export default function Section({
  id,
  title,
  hint,
  actionLabel,
  onAction,
  children,
  className = '',
  headingAs: Heading = 'h2',
}: SectionProps) {
  return (
    <section id={id} className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${className}`}>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div className="min-w-0">
          <Heading className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0f172a] dark:text-white">
            {title}
          </Heading>
          {hint && (
            <p className="mt-1.5 text-sm sm:text-base text-gray-500 dark:text-gray-400 leading-relaxed max-w-2xl">
              {hint}
            </p>
          )}
        </div>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="group inline-flex shrink-0 items-center gap-1.5 text-sm sm:text-[15px] font-bold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-all cursor-pointer"
          >
            <span>{actionLabel}</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}
