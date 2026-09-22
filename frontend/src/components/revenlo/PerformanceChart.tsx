import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const monthlyData = [
  { name: 'Jan', revenue: 28000 },
  { name: 'Feb', revenue: 22000 },
  { name: 'Mar', revenue: 18000 },
  { name: 'Apr', revenue: 16500 },
  { name: 'May', revenue: 21000 },
  { name: 'Jun', revenue: 31000 },
  { name: 'Jul', revenue: 34000 },
  { name: 'Aug', revenue: 25000 },
  { name: 'Sep', revenue: 19500 },
  { name: 'Oct', revenue: 24000 },
  { name: 'Nov', revenue: 33000 },
  { name: 'Dec', revenue: 30000 },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-xl">
        <p className="text-xs font-medium text-gray-500 mb-0.5">{label}-Apr 2025</p>
        <p className="text-[11px] text-gray-400 mb-1">Total Revenue</p>
        <p className="text-sm font-bold text-gray-900">
          -${payload[0].value.toLocaleString()}
        </p>
      </div>
    )
  }
  return null
}

export default function PerformanceChart() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 h-full">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-2">
        <div>
          <h3 className="text-base font-bold text-gray-900">Performance Overview</h3>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              $8,435
              <span className="text-lg font-bold text-gray-400">.00</span>
            </span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
              -3.2%
            </span>
          </div>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-2">
          <select className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm text-gray-700 outline-none focus:border-blue-400 cursor-pointer shadow-sm">
            <option>Last year</option>
            <option>Last month</option>
            <option>Last 7 days</option>
          </select>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-xs font-medium text-gray-500">Total Revenue</span>
          </div>
        </div>
      </div>

      <div className="h-64 sm:h-72 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 4" stroke="rgba(148,163,184,0.15)" vertical={false} />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={36}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              domain={[0, 40000]}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeDasharray: '4 4' }} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
