import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

const metrics = [
  { label: 'Views', value: '12.5K', color: '#8b5cf6' },
  { label: 'Engaged clicks', value: '8.2K', color: '#06b6d4' },
  { label: 'Successful signups', value: '3.4K', color: '#10b981' },
]

export default function CampaignChart() {
  const performance = 88
  const circumference = 2 * Math.PI * 70
  const dashoffset = circumference - (performance / 100) * circumference

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-white/5 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Discount Campaign</h3>
        <button className="text-xs font-medium text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white transition-colors">
          View all
        </button>
      </div>

      <div className="flex flex-col items-center">
        {/* Circular Progress */}
        <div className="relative w-44 h-44 mb-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
            {/* Background circle */}
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              className="text-gray-100 dark:text-white/5"
            />
            {/* Progress circle */}
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="url(#campaignGradient)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashoffset}
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="campaignGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">{performance}%</span>
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Performance</span>
          </div>
        </div>

        {/* Metrics List */}
        <div className="w-full space-y-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: metric.color }} />
                <span className="text-sm font-medium text-gray-600 dark:text-slate-300">{metric.label}</span>
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{metric.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
