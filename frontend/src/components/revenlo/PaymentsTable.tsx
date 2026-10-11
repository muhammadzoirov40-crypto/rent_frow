import { useEffect, useMemo, useState } from 'react'
import client from '../../api/client'

/**
 * Every top-up across all users, straight from `GET /api/v1/admin/topups`.
 * The backend joins the person on each `topup_intents` row, so this is the
 * admin's "who transferred money" view — replacing the old hardcoded sample.
 */
interface AdminTopup {
  id: number
  user_id: number
  user_name: string
  user_email: string
  amount: number
  reference: string
  status: 'PAID' | 'PENDING' | 'FAILED'
  provider: string
  created_at: string
  paid_at: string | null
}

const STATUS_LABEL: Record<AdminTopup['status'], string> = {
  PAID: 'Paid',
  PENDING: 'Pending',
  FAILED: 'Failed',
}

const statusColors: Record<AdminTopup['status'], string> = {
  PAID: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-200/70 dark:border-emerald-500/30',
  PENDING: 'bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-200/70 dark:border-amber-500/30',
  FAILED: 'bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 border-red-200/70 dark:border-red-500/30',
}

const checkboxClass =
  'w-4 h-4 rounded border-gray-300 dark:border-white/20 bg-white dark:bg-white/10 text-blue-600 focus:ring-blue-500/30 focus:ring-2 cursor-pointer accent-blue-600'

function formatDate(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

export default function PaymentsTable() {
  const [rows, setRows] = useState<AdminTopup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [selected, setSelected] = useState<Set<number>>(new Set())

  useEffect(() => {
    let alive = true
    client
      .get('/admin/topups', { params: { limit: 200 } })
      .then((r) => {
        if (alive) setRows(r.data?.data ?? [])
      })
      .catch(() => {
        if (alive) setError('Failed to load payments')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const filtered = useMemo(
    () =>
      rows.filter((p) => {
        const q = search.toLowerCase()
        const matchesSearch =
          p.user_name.toLowerCase().includes(q) ||
          p.user_email.toLowerCase().includes(q) ||
          p.reference.toLowerCase().includes(q)
        const matchesStatus = statusFilter === 'All' || p.status === statusFilter
        return matchesSearch && matchesStatus
      }),
    [rows, search, statusFilter]
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

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const paidCount = rows.filter((p) => p.status === 'PAID').length

  return (
    <div className="glass-section rounded-2xl">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Payments</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {loading
                ? 'Loading top-ups…'
                : `${rows.length} top-up${rows.length === 1 ? '' : 's'} · ${paidCount} paid`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="glass-input w-40 sm:w-48 pl-9 pr-3 py-2.5 rounded-xl text-sm transition-all"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="glass-input px-3.5 py-2.5 rounded-xl text-sm cursor-pointer transition-all"
            >
              <option value="All">All</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="py-8 text-center text-sm text-red-500 dark:text-red-400">{error}</div>
        )}

        {!error && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead>
                <tr className="border-b border-[color:var(--glass-border)]">
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
                  <th className="text-left px-4 py-3.5 text-sm font-medium text-gray-500 dark:text-gray-400">User</th>
                  <th className="text-left px-4 py-3.5 text-sm font-medium text-gray-500 dark:text-gray-400">Email</th>
                  <th className="text-left px-4 py-3.5 text-sm font-medium text-gray-500 dark:text-gray-400">Reference</th>
                  <th className="text-left px-4 py-3.5 text-sm font-medium text-gray-500 dark:text-gray-400">Amount</th>
                  <th className="text-left px-4 py-3.5 text-sm font-medium text-gray-500 dark:text-gray-400">Date</th>
                  <th className="text-left px-4 py-3.5 text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {loading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`sk-${i}`}>
                      <td colSpan={7} className="px-4 py-4">
                        <div className="h-4 w-full rounded bg-gray-100 dark:bg-white/10 animate-pulse" />
                      </td>
                    </tr>
                  ))}

                {!loading &&
                  filtered.map((payment) => (
                    <tr
                      key={payment.id}
                      className={`hover:bg-gray-50/70 dark:hover:bg-white/5 transition-colors ${
                        selected.has(payment.id) ? 'bg-blue-50/50 dark:bg-blue-500/10' : ''
                      }`}
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selected.has(payment.id)}
                          onChange={() => toggleOne(payment.id)}
                          className={checkboxClass}
                          aria-label={`Select ${payment.user_name}`}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                          {payment.user_name}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{payment.user_email}</td>
                      <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap font-mono">
                        {payment.reference}
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                          {payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          <span className="ml-1 text-xs font-normal text-gray-400">TJS</span>
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatDate(payment.paid_at ?? payment.created_at)}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-semibold border ${statusColors[payment.status]}`}>
                          {STATUS_LABEL[payment.status] ?? payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">No payments found</p>
          </div>
        )}
      </div>
    </div>
  )
}
