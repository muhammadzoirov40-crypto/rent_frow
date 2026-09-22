import { useMemo, useState } from 'react'

interface Payment {
  id: string
  affiliateName: string
  email: string
  referredBy: string
  method: string
  amount: number
  status: 'Done' | 'Pending'
}

const paymentsData: Payment[] = [
  { id: '1', affiliateName: 'Aiden Cooper', email: 'aiden@cpmail.com', referredBy: 'Mia Logan', method: 'Stripe', amount: 64.12, status: 'Pending' },
  { id: '2', affiliateName: 'Elena Brooks', email: 'elena@brooksy.net', referredBy: 'Tristan Hale', method: 'PayPal', amount: 81.76, status: 'Done' },
  { id: '3', affiliateName: 'Noah Bennett', email: 'noah@bennett.io', referredBy: 'Ava Reed', method: 'Stripe', amount: 124.50, status: 'Done' },
  { id: '4', affiliateName: 'Sophia Carter', email: 'sophia@carter.co', referredBy: 'Liam Fox', method: 'PayPal', amount: 49.90, status: 'Pending' },
  { id: '5', affiliateName: 'Lucas Grant', email: 'lucas@grantly.com', referredBy: 'Emma Stone', method: 'Bank Transfer', amount: 210.00, status: 'Done' },
  { id: '6', affiliateName: 'Mia Sullivan', email: 'mia@sullivan.app', referredBy: 'Ethan Cole', method: 'Stripe', amount: 95.35, status: 'Pending' },
]

const statusColors = {
  Done: 'bg-emerald-50 text-emerald-600 border-emerald-200/70',
  Pending: 'bg-amber-50 text-amber-600 border-amber-200/70',
}

const checkboxClass =
  'w-4 h-4 rounded border-gray-300 bg-white text-blue-600 focus:ring-blue-500/30 focus:ring-2 cursor-pointer accent-blue-600'

export default function PaymentsTable() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const filtered = useMemo(
    () =>
      paymentsData.filter((p) => {
        const matchesSearch =
          p.affiliateName.toLowerCase().includes(search.toLowerCase()) ||
          p.email.toLowerCase().includes(search.toLowerCase())
        const matchesStatus = statusFilter === 'All' || p.status === statusFilter
        return matchesSearch && matchesStatus
      }),
    [search, statusFilter]
  )

  const filteredIds = filtered.map((p) => p.id)
  const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selected.has(id))
  const someSelected = filteredIds.some((id) => selected.has(id))

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        filteredIds.forEach((id) => next.delete(id))
      } else {
        filteredIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">Payments</h3>
            <p className="text-sm text-gray-500 mt-1">You processed 19 payouts this cycle.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-40 sm:w-48 pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
            <button className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-all">
              Filter
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-white border border-gray-200 text-sm text-gray-600 outline-none focus:border-blue-400 cursor-pointer hover:border-gray-300 transition-all"
            >
              <option value="All">Monthly</option>
              <option value="Done">Done</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3.5 w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = !allSelected && someSelected
                    }}
                    onChange={toggleAll}
                    className={checkboxClass}
                    aria-label="Select all payments"
                  />
                </th>
                <th className="text-left px-4 py-3.5 text-sm font-medium text-gray-500">Affiliate Name</th>
                <th className="text-left px-4 py-3.5 text-sm font-medium text-gray-500">Email</th>
                <th className="text-left px-4 py-3.5 text-sm font-medium text-gray-500">Referred By</th>
                <th className="text-left px-4 py-3.5 text-sm font-medium text-gray-500">Method</th>
                <th className="text-left px-4 py-3.5 text-sm font-medium text-gray-500">Payment</th>
                <th className="text-left px-4 py-3.5 text-sm font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((payment) => (
                <tr
                  key={payment.id}
                  className={`hover:bg-gray-50/70 transition-colors ${
                    selected.has(payment.id) ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selected.has(payment.id)}
                      onChange={() => toggleOne(payment.id)}
                      className={checkboxClass}
                      aria-label={`Select ${payment.affiliateName}`}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {payment.affiliateName}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500 whitespace-nowrap">{payment.email}</td>
                  <td className="px-4 py-4 text-sm text-gray-500 whitespace-nowrap">{payment.referredBy}</td>
                  <td className="px-4 py-4">
                    <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{payment.method}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                      ${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-semibold border ${statusColors[payment.status]}`}>
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
            <p className="text-sm text-gray-500">No payments found</p>
          </div>
        )}
      </div>
    </div>
  )
}
