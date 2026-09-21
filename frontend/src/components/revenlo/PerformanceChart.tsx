import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const monthlyData = [
  { name: 'Jan', revenue: 4200, lastYear: 3100 },
  { name: 'Feb', revenue: 5100, lastYear: 3800 },
  { name: 'Mar', revenue: 4800, lastYear: 4200 },
  { name: 'Apr', revenue: 6200, lastYear: 4500 },
  { name: 'May', revenue: 7100, lastYear: 5200 },
  { name: 'Jun', revenue: 6800, lastYear: 5800 },
  { name: 'Jul', revenue: 8435, lastYear: 6100 },
  { name: 'Aug', revenue: 7900, lastYear: 6400 },
  { name: 'Sep', revenue: 8200, lastYear: 6900 },
  { name: 'Oct', revenue: 9100, lastYear: 7200 },
  { name: 'Nov', revenue: 8700, lastYear: 7800 },
  { name: 'Dec', revenue: 9500, lastYear: 8100 },
]

const timeRanges = ['Last 7 days', 'Last month', 'Last year', 'All time']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 shadow-xl">
        <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-bold" style={{ color: entry.color }}>
            ${entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function PerformanceChart() {
  const [selectedRange, setSelectedRange] = useState('Last year')

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-white/5 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Performance Overview</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Monthly revenue{' '}
            <span className="font-bold text-gray-900 dark:text-white">$8,435.00</span>
          </p>
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-white/5 rounded-xl p-1">
          {timeRanges.map((range) => (
            <button
              key={range}
              onClick={() => setSelectedRange(range)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                selectedRange === range
                  ? 'bg-white dark:bg-violet-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="lastYearGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="lastYear"
              stroke="#94a3b8"
              strokeWidth={2}
              fill="url(#lastYearGradient)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#8b5cf6"
              strokeWidth={2.5}
              fill="url(#revenueGradient)"
              dot={false}
              activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-violet-500" />
          <span className="text-xs font-medium text-gray-500 dark:text-slate-400">This year</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-400" />
          <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Last year</span>
        </div>
      </div>
    </div>
  )
}
