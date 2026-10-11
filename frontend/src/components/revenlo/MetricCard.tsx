interface MetricCardProps {
  title: string
  value: string
  change: number
  icon: string
}

export default function MetricCard({ title, value, change, icon }: MetricCardProps) {
  const isPositive = change >= 0

  return (
    <div className="group glass-card glass-card-hover rounded-2xl p-5 transition-all duration-300">
      <div className="flex items-start gap-3.5">
        <div className="bg-[rgb(var(--accent-rgb)/0.1)] border border-[color:var(--glass-border)] group-hover:border-[rgb(var(--accent-rgb)/0.35)] w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors">
          <svg className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d={icon} />
          </svg>
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</h3>
            <span
              className={`text-xs font-semibold ${
                isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
              }`}
            >
              {isPositive ? '+' : ''}{change}%
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{title}</p>
        </div>
      </div>

      <div className="mt-4 pt-3.5 border-t border-[color:var(--glass-border)]">
        <button className="flex items-center justify-between w-full text-[13px] font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          View details
          <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </button>
      </div>
    </div>
  )
}
