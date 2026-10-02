import { useTranslation } from 'react-i18next';
import { FileText, ShieldCheck } from 'lucide-react';
import BackButton from '../components/ui/BackButton';

type LegalKind = 'terms' | 'privacy';

const SECTIONS = [1, 2, 3, 4, 5, 6] as const;

/**
 * Shared renderer for /terms and /privacy — the two links the footer has always
 * shown but which previously had no route behind them.
 */
export default function LegalPage({ kind }: { kind: LegalKind }) {
  const { t } = useTranslation();
  const Icon = kind === 'terms' ? FileText : ShieldCheck;
  const ns: LegalKind = kind;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a1a] py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-3xl mx-auto">
        <BackButton className="mb-5" />

        <div className="flex items-center gap-3 mb-1">
          <span className="w-11 h-11 shrink-0 rounded-xl bg-[rgb(var(--accent-rgb)/0.1)] flex items-center justify-center">
            <Icon className="w-5 h-5 text-[var(--accent)]" />
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A2E] dark:text-white">
            {t(`${ns}.title`)}
          </h1>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">{t(`${ns}.updated`)}</p>

        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
          {t(`${ns}.intro`)}
        </p>

        <div className="space-y-4">
          {SECTIONS.map((n) => (
            <section
              key={n}
              className="bg-white dark:bg-[#12121f] border border-gray-100 dark:border-white/10 rounded-2xl p-5 sm:p-6"
            >
              <h2 className="text-base font-semibold text-[#1A1A2E] dark:text-white mb-2">
                {t(`${ns}.s${n}h`)}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {t(`${ns}.s${n}b`)}
              </p>
            </section>
          ))}
        </div>

        <p className="mt-8 text-sm text-gray-500 dark:text-gray-400">
          {t('footer.contact')}:{' '}
          <a
            href="mailto:support@renthub.tj"
            className="text-[var(--accent)] font-medium hover:underline"
          >
            support@renthub.tj
          </a>
        </p>
      </div>
    </div>
  );
}
