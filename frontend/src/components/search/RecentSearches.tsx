import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { History, X } from 'lucide-react';
import { getRecentSearches, forgetSearch, clearRecentSearches } from '../../utils/recentSearches';

/**
 * Shown under the search bar while the query is empty, so a returning user can
 * re-run a previous search in one click. Terms come from local storage only —
 * no backend call.
 */
export default function RecentSearches({
  onSelect,
  visible,
}: {
  onSelect: (term: string) => void;
  visible: boolean;
}) {
  const { t } = useTranslation();
  const [items, setItems] = useState<string[]>(() => getRecentSearches());

  if (!visible || items.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-3">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400 dark:text-gray-500">
        <History className="w-3.5 h-3.5" />
        {t('search.recentSearches')}
      </span>

      {items.map((term) => (
        <span
          key={term}
          className="inline-flex items-center gap-1 pl-3 pr-1.5 py-1.5 rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:border-[rgb(var(--accent-rgb)/0.45)] hover:text-[var(--accent)] transition cursor-pointer"
        >
          <button type="button" onClick={() => onSelect(term)} className="max-w-[14rem] truncate">
            {term}
          </button>
          <button
            type="button"
            aria-label={`${t('search.removeFilter')}: ${term}`}
            onClick={() => setItems(forgetSearch(term))}
            className="w-5 h-5 inline-flex items-center justify-center rounded-full hover:bg-[var(--accent)] hover:text-white transition"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={() => {
          clearRecentSearches();
          setItems([]);
        }}
        className="text-xs font-semibold text-gray-400 dark:text-gray-500 hover:text-[var(--accent)] transition"
      >
        {t('search.clearRecent')}
      </button>
    </div>
  );
}
