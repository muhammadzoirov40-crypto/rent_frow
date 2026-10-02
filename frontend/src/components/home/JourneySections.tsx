import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  CalendarCheck,
  CalendarRange,
  CreditCard,
  MessageSquare,
  RotateCcw,
  Store,
  ShoppingBag,
  ArrowRight,
} from 'lucide-react';
import Section from './Section';

const STEPS = [
  { icon: Search, titleKey: 'home.flow1Title', descKey: 'home.flow1Desc' },
  { icon: CalendarCheck, titleKey: 'home.flow2Title', descKey: 'home.flow2Desc' },
  { icon: CalendarRange, titleKey: 'home.flow3Title', descKey: 'home.flow3Desc' },
  { icon: CreditCard, titleKey: 'home.flow4Title', descKey: 'home.flow4Desc' },
  { icon: MessageSquare, titleKey: 'home.flow5Title', descKey: 'home.flow5Desc' },
  { icon: RotateCcw, titleKey: 'home.flow6Title', descKey: 'home.flow6Desc' },
];

/** The full rental journey, end to end. */
export function HowItWorksSection() {
  const { t } = useTranslation();

  return (
    <Section id="how" title={t('home.howItWorks')} hint={t('home.step1Desc')}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {STEPS.map((step, idx) => (
          <div
            key={step.titleKey}
            className="rounded-xl bg-white dark:bg-[#12141a] border border-gray-200 dark:border-white/10 p-5 hover:border-[rgb(var(--accent-rgb)/0.4)] transition"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="w-10 h-10 rounded-lg bg-[rgb(var(--accent-rgb)/0.1)] flex items-center justify-center">
                <step.icon className="w-5 h-5 text-[var(--accent)]" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                {t('home.step')} {idx + 1}
              </span>
            </div>
            <h3 className="font-bold text-sm text-[#1A1A2E] dark:text-white mb-1.5">
              {t(step.titleKey)}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              {t(step.descKey)}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/** Two clear paths: list and earn, or browse and rent. */
export function BecomeSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const cards = [
    {
      icon: Store,
      title: t('home.becomeOwner'),
      text: t('home.becomeOwnerText'),
      cta: t('home.becomeOwnerBtn'),
      to: '/create-listing',
      primary: true,
    },
    {
      icon: ShoppingBag,
      title: t('home.becomeRenter'),
      text: t('home.becomeRenterText'),
      cta: t('home.becomeRenterBtn'),
      to: '/search',
      primary: false,
    },
  ];

  return (
    <Section title={t('home.ctaTitle')} hint={t('home.ctaText')}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((card) => (
          <div
            key={card.to}
            className={`rounded-2xl border p-6 flex flex-col gap-4 ${
              card.primary
                ? 'bg-[#1A1A2E] dark:bg-[#12141a] border-gray-800 dark:border-white/10'
                : 'bg-white dark:bg-[#12141a] border-gray-200 dark:border-white/10'
            }`}
          >
            <span
              className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                card.primary
                  ? 'bg-[rgb(var(--accent-rgb)/0.18)]'
                  : 'bg-[rgb(var(--accent-rgb)/0.1)]'
              }`}
            >
              <card.icon className="w-5 h-5 text-[var(--accent)]" />
            </span>
            <div className="flex-1">
              <h3
                className={`font-extrabold text-lg ${
                  card.primary ? 'text-white' : 'text-[#1A1A2E] dark:text-white'
                }`}
              >
                {card.title}
              </h3>
              <p
                className={`mt-1.5 text-sm leading-relaxed ${
                  card.primary ? 'text-gray-300' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {card.text}
              </p>
            </div>
            <button
              onClick={() => navigate(card.to)}
              className={`self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition ${
                card.primary
                  ? 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-lg shadow-[rgb(var(--accent-rgb)/0.3)]'
                  : 'border border-[rgb(var(--accent-rgb)/0.4)] bg-[rgb(var(--accent-rgb)/0.08)] text-[var(--accent)] hover:bg-[rgb(var(--accent-rgb)/0.16)]'
              }`}
            >
              {card.cta}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </Section>
  );
}
