import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowDownRight, ArrowUpRight, CalendarCheck, DollarSign, Home, LayoutGrid, Percent, Ticket } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import DashboardLayout, { type DashboardSection } from '../components/dashboard/DashboardLayout';
import useAuthStore from '../store/authStore';
import {
  dashboardApi,
  type DashboardSummary,
  type RevenueChartResponse,
  type BookingPerformance,
  type RecentBooking,
} from '../api/dashboardApi';

const REVENUE_PERIODS = ['7days', '30days', 'thismonth', '6months', 'lastyear'] as const;
type RevenuePeriod = (typeof REVENUE_PERIODS)[number];

const STATUS_COLORS: Record<string, string> = {
  completed: '#10b981',
  confirmed: '#3b82f6',
  pending: '#f59e0b',
  cancelled: '#ef4444',
  rejected: '#6b7280',
};

const STATUS_LABEL_KEYS: Record<string, string> = {
  COMPLETED: 'booking.completed',
  CONFIRMED: 'booking.confirmed',
  PENDING: 'booking.pending',
  CANCELLED: 'booking.cancelled',
  REJECTED: 'booking.rejected',
};

function statusKey(status: string): string {
  const s = (status || '').toUpperCase();
  return STATUS_LABEL_KEYS[s] ? s : 'PENDING';
}

function statusClasses(status: string): string {
  switch (statusKey(status)) {
    case 'COMPLETED':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    case 'CONFIRMED':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    case 'CANCELLED':
      return 'bg-red-500/10 text-red-500 border-red-500/20';
    case 'REJECTED':
      return 'bg-gray-500/10 text-gray-500 dark:text-gray-400 border-gray-500/20';
    default:
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
  }
}

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: ReactNode;
}

function MetricCard({ title, value, change, icon }: MetricCardProps) {
  const { t } = useTranslation();
  const up = change >= 0;
  return (
    <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 p-5 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <span className="w-10 h-10 rounded-xl bg-[#FF6B35]/10 text-[#FF6B35] flex items-center justify-center">
          {icon}
        </span>
        <span
          className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-lg border ${
            up
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-red-500/10 text-red-500 border-red-500/20'
          }`}
        >
          {up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
          {Math.abs(change).toFixed(1)}%
        </span>
      </div>
      <p className="text-2xl font-bold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {title}
        <span className="text-gray-400 dark:text-gray-600"> · {t('dashboard.overview.vsPrev')}</span>
      </p>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  const { t } = useTranslation();
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <p className="mb-1 font-medium text-gray-700 dark:text-gray-300">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-[#FF6B35] font-semibold tabular-nums">
          {Math.round(entry.value).toLocaleString('ru-RU')} {t('common.somoni')}
        </p>
      ))}
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-gray-400 dark:text-gray-500 text-sm">
      <LayoutGrid className="mb-3 h-10 w-10 opacity-50" />
      <p>{text}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isOwnerLike = !!user && (user.role === 'OWNER' || user.role === 'ADMIN');

  const [active, setActive] = useState<DashboardSection>('dashboard');
  const [period, setPeriod] = useState<RevenuePeriod>('30days');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [revenue, setRevenue] = useState<RevenueChartResponse | null>(null);
  const [perf, setPerf] = useState<BookingPerformance | null>(null);
  const [recent, setRecent] = useState<RecentBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOwnerLike) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [s, r, p, b] = await Promise.allSettled([
          dashboardApi.summary(),
          dashboardApi.revenueChart(period),
          dashboardApi.bookingPerformance(),
          dashboardApi.recentBookings(8),
        ]);
        if (cancelled) return;
        const fails: string[] = [];
        if (s.status === 'fulfilled') setSummary(s.value.data.data);
        else fails.push('summary');
        if (r.status === 'fulfilled') setRevenue(r.value.data.data);
        else fails.push('revenue');
        if (p.status === 'fulfilled') setPerf(p.value.data.data);
        else fails.push('performance');
        if (b.status === 'fulfilled') setRecent(b.value.data.data || []);
        else fails.push('bookings');
        setError(fails.length ? t('dashboard.overview.error') : null);
      } catch {
        if (!cancelled) setError(t('dashboard.overview.error'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOwnerLike, period, t]);

  const som = (n: number) => `${Math.round(n).toLocaleString('ru-RU')} ${t('common.somoni')}`;

  const pieData = perf
    ? [
        { key: 'completed', name: t('booking.completed'), value: perf.completed },
        { key: 'confirmed', name: t('booking.confirmed'), value: perf.confirmed },
        { key: 'pending', name: t('booking.pending'), value: perf.pending },
        { key: 'cancelled', name: t('booking.cancelled'), value: perf.cancelled },
        { key: 'rejected', name: t('booking.rejected'), value: perf.rejected },
      ].filter((d) => d.value > 0)
    : [];

  const renderOverview = () => {
    if (!isOwnerLike) {
      return (
        <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 p-10 text-center" data-testid="owner-only">
          <AlertCircle className="w-12 h-12 mx-auto text-[#FF6B35] mb-4" />
          <h2 className="text-lg font-bold mb-1">{t('dashboard.overview.ownerOnly')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 max-w-md mx-auto">{t('dashboard.overview.ownerOnlyHint')}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B35] text-white text-sm font-semibold hover:bg-[#e55a2b] transition"
          >
            <Home className="w-4 h-4" />
            {t('dashboard.overview.goHome')}
          </Link>
        </div>
      );
    }

    if (loading && !summary) {
      return (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#FF6B35] border-t-transparent" />
        </div>
      );
    }

    if (error && !summary) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center dark:border-red-900/30 dark:bg-red-900/10">
          <AlertCircle className="w-10 h-10 mx-auto text-red-500 mb-3" />
          <p className="text-sm text-red-700 dark:text-red-400 mb-4">{error}</p>
        </div>
      );
    }

    return (
      <div className="space-y-6" data-testid="overview">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard
            title={t('dashboard.overview.totalRevenue')}
            value={som(summary?.total_revenue ?? 0)}
            change={summary?.revenue_change_pct ?? 0}
            icon={<DollarSign className="w-5 h-5" />}
          />
          <MetricCard
            title={t('dashboard.overview.totalBookings')}
            value={String(summary?.total_bookings ?? 0)}
            change={summary?.bookings_change_pct ?? 0}
            icon={<Ticket className="w-5 h-5" />}
          />
          <MetricCard
            title={t('dashboard.overview.activeRentals')}
            value={String(summary?.active_rentals ?? 0)}
            change={summary?.active_rentals_change_pct ?? 0}
            icon={<CalendarCheck className="w-5 h-5" />}
          />
          <MetricCard
            title={t('dashboard.overview.occupancy')}
            value={`${(summary?.occupancy_rate ?? 0).toFixed(1)}%`}
            change={summary?.occupancy_change_pct ?? 0}
            icon={<Percent className="w-5 h-5" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
              <h2 className="font-semibold">{t('dashboard.overview.revenueChart')}</h2>
              <div className="flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1 dark:bg-white/5">
                {REVENUE_PERIODS.map((p) => (
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
            {revenue && revenue.data.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenue.data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#FF6B35" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} minTickGap={24} />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                      width={54}
                      tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="revenue" stroke="#FF6B35" strokeWidth={2} fill="url(#revGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyBox text={t('dashboard.overview.empty')} />
            )}
          </div>

          <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 p-5">
            <h2 className="font-semibold mb-4">{t('dashboard.overview.bookingPerformance')}</h2>
            {perf && pieData.length > 0 ? (
              <>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none">
                        {pieData.map((entry) => (
                          <Cell key={entry.key} fill={STATUS_COLORS[entry.key] ?? '#9ca3af'} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 space-y-2">
                  {pieData.map((entry) => (
                    <div key={entry.key} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[entry.key] }} />
                        <span className="text-gray-600 dark:text-gray-400">{t(`booking.${entry.key}`)}</span>
                      </div>
                      <span className="font-semibold tabular-nums">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyBox text={t('dashboard.overview.empty')} />
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-white/10">
            <h2 className="font-semibold">{t('dashboard.overview.recentBookings')}</h2>
            <button
              type="button"
              onClick={() => setActive('bookings')}
              className="text-xs font-semibold text-[#FF6B35] hover:underline"
            >
              {t('dashboard.overview.viewAll')}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  <th className="px-5 py-3 font-medium">{t('dashboard.overview.bookingId')}</th>
                  <th className="px-5 py-3 font-medium">{t('dashboard.overview.customer')}</th>
                  <th className="px-5 py-3 font-medium">{t('dashboard.overview.equipment')}</th>
                  <th className="px-5 py-3 font-medium">{t('dashboard.overview.dates')}</th>
                  <th className="px-5 py-3 font-medium text-right">{t('dashboard.overview.amount')}</th>
                  <th className="px-5 py-3 font-medium">{t('dashboard.overview.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {recent.length > 0 ? (
                  recent.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-[#FF6B35] tabular-nums">#{b.id}</td>
                      <td className="px-5 py-3.5 font-medium">{b.customer_name}</td>
                      <td className="px-5 py-3.5 text-gray-600 dark:text-gray-300 max-w-[220px] truncate">{b.equipment_name}</td>
                      <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 whitespace-nowrap tabular-nums">
                        {b.start_date} — {b.end_date}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold tabular-nums">{som(b.total_price)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium border ${statusClasses(b.status)}`}>
                          {t(`booking.${statusKey(b.status).toLowerCase()}`)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-gray-400 dark:text-gray-500">
                      {t('dashboard.overview.noBookings')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderSection = () => {
    if (active === 'dashboard') return renderOverview();
    return (
      <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 p-10 text-center" data-testid={`section-${active}`}>
        <h2 className="text-lg font-bold mb-1">{t(`dashboard.nav.${active}`)}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.overview.empty')}</p>
      </div>
    );
  };

  return (
    <DashboardLayout active={active} onNavigate={setActive}>
      {renderSection()}
    </DashboardLayout>
  );
}
