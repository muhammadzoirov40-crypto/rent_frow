import { useState } from 'react'
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
    change: -3.2,
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    title: 'Total Clicks',
    value: '7847',
    change: -12,
    icon: 'M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122',
  },
  {
    title: 'Total Referrals',
    value: '65',
    change: 51,
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  },
  {
    title: 'Total Payment',
    value: '$87.987',
    change: 3.2,
    icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
  },
]

export default function RevenloDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#b4c9e8] via-[#c9d8ef] to-[#dde6f5] relative overflow-x-hidden">
      {/* Decorative diagonal stripes */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-24 -left-32 w-[420px] h-10 bg-white/70 rotate-45 rounded-full blur-[1px]" />
        <div className="absolute top-40 -left-40 w-[500px] h-6 bg-white/50 rotate-45 rounded-full" />
        <div className="absolute -bottom-20 -right-24 w-[380px] h-8 bg-white/60 -rotate-45 rounded-full" />
        <div className="absolute bottom-40 -right-32 w-[300px] h-5 bg-white/40 -rotate-45 rounded-full" />
      </div>

      {/* Brand row */}
      <div className="relative z-10 flex items-center justify-between px-5 sm:px-8 pt-5 pb-4">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 shadow-lg shadow-orange-500/30 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13 2L4.09 12.69a1 1 0 00.77 1.64H11l-1 7.61L19.91 11a1 1 0 00-.77-1.64H13l1-7.37z" />
          </svg>
        </div>
        <span className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">Oripio</span>
      </div>

      {/* Dashboard card */}
      <div className="relative z-10 px-3 sm:px-6 pb-6">
        <div className="mx-auto max-w-[1440px] bg-white rounded-[28px] shadow-[0_24px_70px_-20px_rgba(30,50,100,0.35)] overflow-hidden flex min-h-[calc(100vh-7.5rem)]">
          <RevenloSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <div className="flex-1 flex flex-col min-w-0">
            <RevenloHeader onMenuClick={() => setSidebarOpen(true)} />

            <main className="p-4 sm:p-6 lg:p-7 space-y-6 flex-1">
              {/* Page header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                    Analytics Activity- This month
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Stay updated with your latest affiliate performance.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <select className="px-3.5 py-2.5 rounded-xl bg-white border border-gray-200 text-sm text-gray-700 outline-none focus:border-blue-500/50 transition-all cursor-pointer shadow-sm">
                    <option value="month">Month</option>
                    <option value="week">Week</option>
                    <option value="day">Day</option>
                  </select>
                  <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-500/25 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Invite Affiliate
                  </button>
                </div>
              </div>

              {/* Metric cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                {metrics.map((metric) => (
                  <MetricCard key={metric.title} {...metric} />
                ))}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <PerformanceChart />
                </div>
                <div className="lg:col-span-1">
                  <CampaignChart />
                </div>
              </div>

              {/* Payments */}
              <PaymentsTable />
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
