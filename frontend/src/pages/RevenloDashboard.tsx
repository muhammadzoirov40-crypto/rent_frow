import RevenloSidebar from '../components/revenlo/RevenloSidebar'
import RevenloHeader from '../components/revenlo/RevenloHeader'
import MetricCard from '../components/revenlo/MetricCard'
import PerformanceChart from '../components/revenlo/PerformanceChart'
import CampaignChart from '../components/revenlo/CampaignChart'
import PaymentsTable from '../components/revenlo/PaymentsTable'

const metrics = [
  {
    title: 'Total Revenue',
    value: '$23.75K',
    change: 12.5,
    changeLabel: 'vs last month',
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    iconBg: 'bg-violet-100 dark:bg-violet-500/10',
    iconColor: 'text-violet-600 dark:text-violet-400',
  },
  {
    title: 'Total Clicks',
    value: '7,847',
    change: 8.2,
    changeLabel: 'vs last month',
    icon: 'M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122',
    iconBg: 'bg-cyan-100 dark:bg-cyan-500/10',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
  },
  {
    title: 'Total Referrals',
    value: '65',
    change: -3.1,
    changeLabel: 'vs last month',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/10',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    title: 'Total Payment',
    value: '$87.987',
    change: 15.3,
    changeLabel: 'vs last month',
    icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
    iconBg: 'bg-amber-100 dark:bg-amber-500/10',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
]

export default function RevenloDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <RevenloSidebar />
      <div className="pl-64">
        <RevenloHeader />
        <main className="p-6 space-y-6">
          {/* Analytics Activity Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Analytics Activity - This month
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                Track your affiliate performance and revenue metrics
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select className="px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 text-sm text-gray-700 dark:text-slate-300 outline-none focus:border-violet-500/50 transition-all duration-200 cursor-pointer">
                <option value="month">Month</option>
                <option value="week">Week</option>
                <option value="day">Day</option>
              </select>
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold shadow-lg shadow-violet-500/25 transition-all duration-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Invite Affiliate
              </button>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {metrics.map((metric) => (
              <MetricCard key={metric.title} {...metric} />
            ))}
          </div>

          {/* Performance + Campaign */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <PerformanceChart />
            </div>
            <div className="lg:col-span-1">
              <CampaignChart />
            </div>
          </div>

          {/* Payments Table */}
          <PaymentsTable />
        </main>
      </div>
    </div>
  )
}
