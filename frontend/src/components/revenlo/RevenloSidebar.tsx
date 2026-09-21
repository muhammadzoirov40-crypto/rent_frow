import { Link, useLocation } from 'react-router-dom'

interface RevenloSidebarProps {
  collapsed?: boolean
}

const menuItems = [
  {
    group: 'Menu',
    items: [
      { path: '/revenlo', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
      { path: '/revenlo/revenue', label: 'Revenue', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
      { path: '/revenlo/user-activity', label: 'User Activity', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
      { path: '/revenlo/payouts', label: 'Payouts', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
      { path: '/revenlo/referral', label: 'Referral', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
    ],
  },
  {
    group: 'Settings',
    items: [
      { path: '/revenlo/campaign-controls', label: 'Campaign Controls', icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4' },
      { path: '/revenlo/integrations', label: 'Integrations', icon: 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z' },
      { path: '/revenlo/api-keys', label: 'API Keys', icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' },
      { path: '/revenlo/subscription', label: 'Subscription', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    ],
  },
]

export default function RevenloSidebar({ collapsed = false }: RevenloSidebarProps) {
  const location = useLocation()

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-white/5">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-gray-200 dark:border-white/5 shrink-0">
        <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
          <span className="text-white font-bold text-base">R</span>
        </div>
        <div className="flex flex-col">
          <span className="text-base font-extrabold text-gray-900 dark:text-white tracking-tight leading-none">
            Revenlo
          </span>
          <span className="text-[10px] font-medium text-gray-400 dark:text-slate-500 tracking-wider uppercase">
            Affiliate Panel
          </span>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {menuItems.map((group) => (
          <div key={group.group}>
            <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-600">
              {group.group}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-violet-600/15 text-violet-600 dark:text-violet-400 border border-violet-500/20 shadow-sm shadow-violet-500/5'
                        : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <span className={isActive ? 'text-violet-600 dark:text-violet-400' : 'text-gray-400 dark:text-slate-500'}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                      </svg>
                    </span>
                    {!collapsed && <span className="truncate min-w-0">{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Upgrade Plan Card */}
      <div className="px-3 pb-4 shrink-0">
        <div className="rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-600/10 border border-violet-500/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">Current Plan: Basic</span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-slate-400 mb-3">
            24 credits remaining this month
          </p>
          <button className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-violet-500/25 transition-all duration-200 hover:shadow-violet-500/40">
            Upgrade Pro Account
          </button>
        </div>
      </div>
    </aside>
  )
}
