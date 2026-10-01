import { useEffect, useState } from 'react';
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Calendar as CalendarIcon,
  BadgeCheck,
  Globe,
  Languages,
  Loader2,
  MessageSquare,
  Moon,
  Phone,
  Settings,
  Star,
  Sun,
  User as UserIcon,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { auth, listings, messages, reviews } from '../../api';
import AvailabilityCalendar from '../listings/AvailabilityCalendar';
import { useTheme } from '../../contexts/ThemeContext';
import { dashboardApi } from '../../api/dashboardApi';

const CHART_PERIODS = ['7days', '30days', 'thismonth', '6months', 'lastyear'] as const;
type ChartPeriod = (typeof CHART_PERIODS)[number];

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${rating}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}
        />
      ))}
    </span>
  );
}

export function CalendarSection() {
  const { t } = useTranslation();
  const { data: ownerListings } = useQuery({
    queryKey: ['owner-listings'],
    queryFn: () => listings.getMyListings(1, 100),
  });
  const items = ownerListings?.items ?? [];
  const [selected, setSelected] = useState<number | null>(null);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const activeId = selected ?? items[0]?.id ?? null;

  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 p-12 text-center" data-testid="calendar-section">
        <CalendarIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
        <p className="font-bold">{t('dashboard.listings.empty')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="calendar-section">
      <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <label className="text-sm font-semibold text-gray-600 dark:text-gray-300">{t('dashboard.sec.pickListing')}</label>
          <select
            value={activeId ?? ''}
            onChange={(e) => {
              setSelected(Number(e.target.value));
              setStart('');
              setEnd('');
            }}
            className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/5 border border-transparent focus:border-[#FF6B35]/50 text-sm outline-none cursor-pointer"
          >
            {items.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
        </div>
        {activeId && (
          <AvailabilityCalendar
            listingId={activeId}
            startDate={start}
            endDate={end}
            onChange={(s, e) => {
              setStart(s);
              setEnd(e);
            }}
          />
        )}
      </div>
    </div>
  );
}

export function MessagesSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: messages.getConversations,
  });

  return (
    <div className="space-y-4" data-testid="messages-section">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('dashboard.sec.convCount')}: <b>{conversations.length}</b>
        </p>
        <Link
          to="/messages"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-[#FF6B35] hover:bg-[#e55a2b] transition"
        >
          <MessageSquare className="w-4 h-4" />
          {t('dashboard.sec.openMessages')}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-[#FF6B35]" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 p-12 text-center">
          <MessageSquare className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="font-bold">{t('dashboard.sec.noConv')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => navigate(`/messages?conversation=${c.id}`)}
              className="w-full text-left rounded-2xl bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 p-4 flex items-center gap-3 hover:border-[#FF6B35]/40 transition"
            >
              <span className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1A1A2E] to-[#FF6B35] text-white flex items-center justify-center text-sm font-semibold overflow-hidden shrink-0">
                {c.other_user_avatar ? (
                  <img src={c.other_user_avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  (c.other_user_name || '?').charAt(0).toUpperCase()
                )}
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center justify-between gap-2">
                  <b className="truncate text-sm">{c.other_user_name || t('messages.user')}</b>
                  {c.unread_count > 0 && (
                    <span className="shrink-0 min-w-5 h-5 px-1 rounded-full bg-[#FF6B35] text-white text-xs font-bold flex items-center justify-center">
                      {c.unread_count}
                    </span>
                  )}
                </span>
                <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                  {c.last_message_content || t('dashboard.sec.noMessages')}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ReviewsSection() {
  const { t } = useTranslation();
  const { data: ownerListings, isLoading: listLoading } = useQuery({
    queryKey: ['owner-listings'],
    queryFn: () => listings.getMyListings(1, 100),
  });
  const items = ownerListings?.items ?? [];
  const ids = items.slice(0, 20).map((l) => l.id);
  const titleMap: Record<number, string> = {};
  items.forEach((l) => { titleMap[l.id] = l.title; });

  const reviewResults = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['reviews', id],
      queryFn: () => reviews.getReviews(id),
      staleTime: 5 * 60_000,
    })),
  });

  const loading = listLoading || reviewResults.some((q) => q.isLoading);
  const merged = reviewResults
    .flatMap((q, i) => (q.data || []).map((r) => ({ ...r, listTitle: titleMap[ids[i]] || `#${ids[i]}` })))
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

  const avg = merged.length
    ? merged.reduce((s, r) => s + r.rating, 0) / merged.length
    : 0;

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="reviews-section">
      <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 p-5 flex items-center gap-6">
        <div>
          <p className="text-3xl font-extrabold tabular-nums">{avg.toFixed(1)}</p>
          <Stars rating={avg} />
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {t('dashboard.sec.totalReviews')}: <b className="text-[#1A1A2E] dark:text-white">{merged.length}</b>
        </div>
      </div>

      {merged.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 p-12 text-center">
          <Star className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="font-bold">{t('dashboard.sec.noReviews')}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.sec.noReviewsHint')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {merged.map((r) => (
            <div
              key={`${r.listing_id}-${r.id}`}
              className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 p-4"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <Stars rating={r.rating} />
                  <b className="text-sm truncate">{r.customer_name || t('messages.user')}</b>
                </div>
                <span className="text-xs text-gray-400 tabular-nums">{(r.created_at || '').slice(0, 10)}</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{r.comment || '—'}</p>
              <Link
                to={`/listing/${r.listing_id}`}
                className="inline-block mt-2 text-xs font-semibold text-[#FF6B35] hover:underline truncate max-w-full"
              >
                {r.listTitle}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function EarningsSection() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<ChartPeriod>('30days');
  const [loading, setLoading] = useState(true);

  const { data: summary } = useQuery({
    queryKey: ['earnings-summary'],
    queryFn: () => dashboardApi.summary().then((r) => r.data.data),
  });

  const { data: chart, isLoading: chartLoading } = useQuery({
    queryKey: ['earnings-chart', period],
    queryFn: () => dashboardApi.revenueChart(period).then((r) => r.data.data),
  });

  useEffect(() => {
    if (summary || chart) setLoading(false);
  }, [summary, chart]);

  const som = (n: number) => `${Math.round(n).toLocaleString('ru-RU')} ${t('common.somoni')}`;

  if (loading || chartLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="earnings-section">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.overview.totalRevenue')}</p>
          <p className="text-2xl font-extrabold tabular-nums mt-1">{som(summary?.total_revenue ?? 0)}</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.overview.totalBookings')}</p>
          <p className="text-2xl font-extrabold tabular-nums mt-1">{summary?.total_bookings ?? 0}</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.overview.occupancy')}</p>
          <p className="text-2xl font-extrabold tabular-nums mt-1">{(summary?.occupancy_rate ?? 0).toFixed(1)}%</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="font-semibold">{t('dashboard.overview.revenueChart')}</h2>
          <div className="flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1 dark:bg-white/5">
            {CHART_PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  period === p
                    ? 'bg-white dark:bg-[#1a1d24] text-[#FF6B35] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {t(`dashboard.periods.${p}`)}
              </button>
            ))}
          </div>
        </div>
        {chart && chart.data.length > 0 ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart.data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#FF6B35" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} minTickGap={24} />
                <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={54} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px' }}
                  formatter={(v: any) => [som(Number(v)), t('dashboard.overview.totalRevenue')]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#FF6B35" strokeWidth={2} fill="url(#earnGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-center text-sm text-gray-400 py-10">{t('dashboard.overview.empty')}</p>
        )}
      </div>
    </div>
  );
}

export function ProfileSection() {
  const { t } = useTranslation();
  const { data: me, isLoading } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => auth.getMe(),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
      </div>
    );
  }

  const u = me;
  return (
    <div className="space-y-4" data-testid="profile-section">
      <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 p-6">
        <div className="flex items-center gap-4">
          <span className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1A1A2E] to-[#FF6B35] text-white flex items-center justify-center text-xl font-bold overflow-hidden">
            {u?.avatar_url ? (
              <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              (u?.display_name || u?.email || 'R').charAt(0).toUpperCase()
            )}
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold truncate">{u?.display_name || '—'}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate flex items-center gap-1.5">
              {u?.email}
              {u?.is_verified && <BadgeCheck className="w-4 h-4 text-emerald-500" />}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
          <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-4">
            <p className="text-xs text-gray-400 flex items-center gap-1.5 mb-1">
              <Phone className="w-3.5 h-3.5" /> {t('dashboard.sec.phone')}
            </p>
            <p className="font-semibold text-sm tabular-nums">{u?.phone || '—'}</p>
          </div>
          <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-4">
            <p className="text-xs text-gray-400 flex items-center gap-1.5 mb-1">
              <UserIcon className="w-3.5 h-3.5" /> {t('dashboard.sec.roleLabel')}
            </p>
            <p className="font-semibold text-sm">{t(`dashboard.sec.roles.${u?.role || 'CUSTOMER'}`)}</p>
          </div>
          <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-4">
            <p className="text-xs text-gray-400 flex items-center gap-1.5 mb-1">
              <Star className="w-3.5 h-3.5" /> {t('dashboard.sec.listings')}
            </p>
            <p className="font-semibold text-sm tabular-nums">{u?.listing_count ?? 0}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-5">
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#FF6B35]/10 text-[#FF6B35] hover:bg-[#FF6B35]/20 transition"
          >
            {t('dashboard.sec.openProfile')}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/create-listing"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition"
          >
            {t('dashboard.listings.create')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function SettingsSection() {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  const langs: { key: string; label: string }[] = [
    { key: 'tj', label: 'Тоҷикӣ' },
    { key: 'ru', label: 'Русский' },
    { key: 'en', label: 'English' },
  ];

  return (
    <div className="space-y-4" data-testid="settings-section">
      <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Languages className="w-4 h-4 text-[#FF6B35]" />
          {t('dashboard.sec.language')}
        </h2>
        <div className="flex flex-wrap gap-2">
          {langs.map((l) => (
            <button
              key={l.key}
              type="button"
              onClick={() => i18n.changeLanguage(l.key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                i18n.language === l.key
                  ? 'bg-[#FF6B35] text-white border-[#FF6B35]'
                  : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-[#FF6B35]/40'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#FF6B35]" />
          {t('dashboard.sec.appearance')}
        </h2>
        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {theme === 'dark' ? t('dashboard.themeLight') : t('dashboard.themeDark')}
        </button>
      </div>

      <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 p-5">
        <div className="flex flex-wrap gap-2">
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#FF6B35]/10 text-[#FF6B35] hover:bg-[#FF6B35]/20 transition"
          >
            <Settings className="w-4 h-4" />
            {t('dashboard.nav.settings')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
