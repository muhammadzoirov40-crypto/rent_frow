const legend = [
  { label: 'Views', color: '#3b82f6' },
  { label: 'Engaged clicks', color: '#8b5cf6' },
  { label: 'Successful signups', color: '#10b981' },
]

export default function CampaignChart() {
  const performance = 88
  const r = 64
  const circumference = 2 * Math.PI * r

  const segments = [
    { color: '#3b82f6', pct: 40 },
    { color: '#8b5cf6', pct: 30 },
    { color: '#10b981', pct: 18 },
  ]

  let offset = 0

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-base font-bold text-gray-900">Discount Campaign</h3>
        <button className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" aria-label="More options">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="5" cy="12" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="19" cy="12" r="1.8" />
          </svg>
        </button>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-extrabold text-gray-900 tracking-tight">
          $7,820
          <span className="text-lg font-bold text-gray-400">.00</span>
        </span>
        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
          ↑ 4.9%
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center py-4">
        {/* Donut */}
        <div className="relative w-44 h-44 mb-5">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
            {segments.map((seg) => {
              const len = (seg.pct / 100) * circumference
              const gap = 6
              const dash = `${len - gap} ${circumference - len + gap}`
              const el = (
                <circle
                  key={seg.color}
                  cx="80"
                  cy="80"
                  r={r}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="18"
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                />
              )
              offset += len
              return el
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-extrabold text-gray-900">{performance}%</span>
            <span className="text-xs font-medium text-gray-500 mt-0.5">Performance</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {legend.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-xs font-medium text-gray-500">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
