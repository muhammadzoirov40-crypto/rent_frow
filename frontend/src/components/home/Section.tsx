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
      {/* On a phone the action button drops onto its own line under the
          heading instead of squeezing it into half the screen — the title
          keeps the full width and stays on one line. sm and up keeps the
          original title-left / action-right row. */}
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4 mb-6">
        <div className="min-w-0">
          <Heading className="text-xl sm:text-3xl font-extrabold tracking-tight text-[#0f172a] dark:text-white">
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
