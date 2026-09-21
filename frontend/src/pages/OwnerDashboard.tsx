import React, { useState, useEffect } from 'react';
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
import {
  dashboardApi,
  DashboardSummary,
  RevenueChartResponse,
  BookingPerformance,
  RecentBooking,
} from '../api/dashboardApi';

const REVENUE_PERIODS = ['7days', '30days', 'thismonth', '6months', 'lastyear'] as const;

type RevenuePeriod = (typeof REVENUE_PERIODS)[number];

const PERIOD_LABELS: Record<RevenuePeriod, string> = {
  '7days': '7 Days',
  '30days': '30 Days',
  thismonth: 'This Month',
  '6months': '6 Months',
  lastyear: 'Last Year',
};

const STATUS_COLORS: Record<string, string> = {
  Completed: '#10b981',
  Pending: '#f59e0b',
  Cancelled: '#ef4444',
  Confirmed: '#3b82f6',
  Rejected: '#6b7280',
};

const BOOKING_STATUS_VARIANTS: Record<string, string> = {
  Completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  Pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  Cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  Confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Rejected: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
    <svg className="mb-4 h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
    <p className="text-sm font-medium">No data available</p>
  </div>
);

const LoadingSpinner: React.FC = () => (
  <div className="flex min-h-[400px] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
  </div>
);

const ErrorState: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 py-16 text-center dark:border-red-900/30 dark:bg-red-900/10">
    <svg className="mb-4 h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126Z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15.75h.008v.008H12v-.008Z" />
    </svg>
    <p className="mb-4 max-w-sm text-sm text-red-700 dark:text-red-400">{message}</p>
    <button
      onClick={onRetry}
      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
    >
      Retry
    </button>
  </div>
);

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, icon }) => {
  const isPositive = change >= 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          <div className="mt-2 flex items-center gap-1">
            <span
              className={`inline-flex items-center text-sm font-semibold ${
                isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              }`}
            >
              {isPositive ? (
                <svg className="mr-0.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
                </svg>
              ) : (
                <svg className="mr-0.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
                </svg>
              )}
              {Math.abs(change).toFixed(1)}%
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">vs last period</span>
          </div>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-900/20 dark:text-brand-400">
          {icon}
        </div>
      </div>
    </div>
  );
};

const RevenueIcon: React.FC = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const BookingsIcon: React.FC = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
);

const RentalsIcon: React.FC = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016A3.001 3.001 0 0021 9.349" />
  </svg>
);

const OccupancyIcon: React.FC = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
  </svg>
);

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

const CustomTooltip: React.FC<{ active?: boolean; payload?: Array<{ value: number }>; label?: string }> = ({
  active,
  payload,
  label,
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <p className="mb-1 font-medium text-gray-700 dark:text-gray-300">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-brand-600 dark:text-brand-400">
          {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
};

export default function OwnerDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [revenueChart, setRevenueChart] = useState<RevenueChartResponse | null>(null);
  const [bookingPerf, setBookingPerf] = useState<BookingPerformance | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<RevenuePeriod>('30days');

  const fetchData = async (selectedPeriod: RevenuePeriod) => {
    setLoading(true);
    setError(null);
    try {
      const [summaryResult, revenueResult, bookingResult, recentResult] = await Promise.allSettled([
        dashboardApi.summary(),
        dashboardApi.revenueChart(selectedPeriod),
        dashboardApi.bookingPerformance(),
        dashboardApi.recentBookings(8),
      ]);

      const failures: string[] = [];

      if (summaryResult.status === 'fulfilled') {
        setSummary(summaryResult.value.data.data);
      } else {
        failures.push('summary');
      }

      if (revenueResult.status === 'fulfilled') {
        setRevenueChart(revenueResult.value.data.data);
      } else {
        failures.push('revenue chart');
      }

      if (bookingResult.status === 'fulfilled') {
        setBookingPerf(bookingResult.value.data.data);
      } else {
        failures.push('booking performance');
      }

      if (recentResult.status === 'fulfilled') {
        setRecentBookings(recentResult.value.data.data || []);
      } else {
        failures.push('recent bookings');
      }

      if (failures.length === 4) {
        setError('Failed to load dashboard data. Please try again.');
      } else if (failures.length > 0) {
        setError(`Partial load failure: ${failures.join(', ')}`);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(period);
  }, [period]);

  const handlePeriodChange = (newPeriod: RevenuePeriod) => {
    setPeriod(newPeriod);
  };

  if (loading && !summary) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <ErrorState message={error} onRetry={() => fetchData(period)} />
        </div>
      </div>
    );
  }

  const pieData = bookingPerf
    ? [
        { name: 'Completed', value: bookingPerf.completed },
        { name: 'Pending', value: bookingPerf.pending },
        { name: 'Cancelled', value: bookingPerf.cancelled },
        { name: 'Confirmed', value: bookingPerf.confirmed },
        { name: 'Rejected', value: bookingPerf.rejected },
      ]
    : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Owner Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Overview of your rental business</p>
          </div>
          {error && summary && (
            <button
              onClick={() => fetchData(period)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Refresh
            </button>
          )}
        </div>

        {error && summary && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-400">
            {error}
          </div>
        )}

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Revenue"
            value={summary ? formatCurrency(summary.total_revenue) : '$0'}
            change={summary?.revenue_change_pct ?? 0}
            icon={<RevenueIcon />}
          />
          <MetricCard
            title="Total Bookings"
            value={summary ? formatNumber(summary.total_bookings) : '0'}
            change={summary?.bookings_change_pct ?? 0}
            icon={<BookingsIcon />}
          />
          <MetricCard
            title="Active Rentals"
            value={summary ? formatNumber(summary.active_rentals) : '0'}
            change={summary?.active_rentals_change_pct ?? 0}
            icon={<RentalsIcon />}
          />
          <MetricCard
            title="Occupancy Rate"
            value={summary ? `${summary.occupancy_rate.toFixed(1)}%` : '0%'}
            change={summary?.occupancy_change_pct ?? 0}
            icon={<OccupancyIcon />}
          />
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 lg:col-span-2">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue Performance</h2>
              <div className="flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
                {REVENUE_PERIODS.map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePeriodChange(p)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                      period === p
                        ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    {PERIOD_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>
            {revenueChart && revenueChart.data.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueChart.data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fill="url(#revenueGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState />
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">Booking Performance</h2>
            {bookingPerf ? (
              <>
                <div className="flex h-52 items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? '#9ca3af'} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '13px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {pieData.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 rounded-full"
                          style={{ backgroundColor: STATUS_COLORS[entry.name] }}
                        />
                        <span className="text-gray-600 dark:text-gray-400">{entry.name}</span>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState />
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Bookings</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="whitespace-nowrap px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Booking ID</th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Customer</th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Equipment</th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Dates</th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Amount</th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {recentBookings.length > 0 ? (
                  recentBookings.map((booking) => (
                    <tr
                      key={booking.id}
                      className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="whitespace-nowrap px-6 py-4 font-medium text-brand-600 dark:text-brand-400">
                        #{booking.id}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{booking.customer_name}</p>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-700 dark:text-gray-300">
                        {booking.equipment_name}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-700 dark:text-gray-300">
                        {booking.start_date} — {booking.end_date}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {formatCurrency(booking.total_price)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            BOOKING_STATUS_VARIANTS[booking.status] ?? 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {booking.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">
                      No recent bookings found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
