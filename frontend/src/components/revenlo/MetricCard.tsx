interface MetricCardProps {
  title: string
  value: string
  change: number
  changeLabel: string
  icon: string
  iconBg: string
  iconColor: string
}

export default function MetricCard({ title, value, change, changeLabel, icon, iconBg, iconColor }: MetricCardProps) {
  const isPositive = change >= 0

  return (
    <div className="group bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-white/5 p-5 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-violet-500/5 hover:border-gray-300 dark:hover:border-white/10 transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center`}>
          <svg className={`w-5 h-5 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
          </svg>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
          isPositive
            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
        }`}>
          <svg className={`w-3 h-3 ${isPositive ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          {isPositive ? '+' : ''}{change}%
        </div>
      </div>

      <div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{value}</h3>
        <p className="text-sm text-gray-500 dark:text-slate-400">{title}</p>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
        <button className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors">
          View details →
        </button>
      </div>
    </div>
  )
}
