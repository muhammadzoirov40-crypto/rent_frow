import { useState } from 'react'

interface Payment {
  id: string
  affiliateName: string
  email: string
  referredBy: string
  method: string
  amount: number
  status: 'Active' | 'Done' | 'Pending'
}

const paymentsData: Payment[] = [
  { id: '1', affiliateName: 'Sarah Johnson', email: 'sarah@example.com', referredBy: 'Mike Chen', method: 'PayPal', amount: 1250.00, status: 'Done' },
  { id: '2', affiliateName: 'Alex Rivera', email: 'alex@example.com', referredBy: 'Emma Wilson', method: 'Stripe', amount: 890.50, status: 'Active' },
  { id: '3', affiliateName: 'Jordan Lee', email: 'jordan@example.com', referredBy: 'Chris Park', method: 'Bank Transfer', amount: 2100.00, status: 'Done' },
  { id: '4', affiliateName: 'Taylor Swift', email: 'taylor@example.com', referredBy: 'Sarah Johnson', method: 'PayPal', amount: 450.75, status: 'Pending' },
  { id: '5', affiliateName: 'Morgan Davis', email: 'morgan@example.com', referredBy: 'Alex Rivera', method: 'Stripe', amount: 1680.25, status: 'Active' },
  { id: '6', affiliateName: 'Casey Brown', email: 'casey@example.com', referredBy: 'Jordan Lee', method: 'Crypto', amount: 3200.00, status: 'Done' },
  { id: '7', affiliateName: 'Riley Martinez', email: 'riley@example.com', referredBy: 'Taylor Swift', method: 'PayPal', amount: 720.00, status: 'Active' },
  { id: '8', affiliateName: 'Quinn Adams', email: 'quinn@example.com', referredBy: 'Morgan Davis', method: 'Bank Transfer', amount: 1950.50, status: 'Done' },
]

const statusColors = {
  Active: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
  Done: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
  Pending: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
}

export default function PaymentsTable() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')

  const filtered = paymentsData.filter((p) => {
    const matchesSearch =
      p.affiliateName.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-white/5">
      <div className="p-6 border-b border-gray-100 dark:border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Payments</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Recent affiliate transactions</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold shadow-lg shadow-violet-500/25 transition-all duration-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Export CSV
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search affiliates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-700 dark:text-slate-300 placeholder-gray-400 dark:placeholder-slate-500 outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 transition-all duration-200"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-700 dark:text-slate-300 outline-none focus:border-violet-500/50 transition-all duration-200 cursor-pointer"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Done">Done</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-white/5">
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                Affiliate Name
              </th>
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                Email
              </th>
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                Referred By
              </th>
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                Method
              </th>
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                Payment
              </th>
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/5">
            {filtered.map((payment) => (
              <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                      {payment.affiliateName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{payment.affiliateName}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{payment.email}</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{payment.referredBy}</td>
                <td className="px-6 py-4">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-300">{payment.method}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold border ${statusColors[payment.status]}`}>
                    {payment.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-gray-500 dark:text-slate-400">No payments found</p>
        </div>
      )}

      <div className="p-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
        <p className="text-xs text-gray-500 dark:text-slate-400">
          Showing {filtered.length} of {paymentsData.length} payments
        </p>
        <div className="flex items-center gap-1">
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-600 text-white">1</button>
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-white/5">2</button>
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-white/5">3</button>
        </div>
      </div>
    </div>
  )
}
