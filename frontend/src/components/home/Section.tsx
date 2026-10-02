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
      <div className="flex items-end justify-between gap-4 mb-5">
        <div className="min-w-0">
          <Heading className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1A2E] dark:text-white">
            {title}
          </Heading>
          {hint && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{hint}</p>}
        </div>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="hidden sm:inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          >
            {actionLabel}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}
