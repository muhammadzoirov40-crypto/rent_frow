import { useEffect, useMemo, useState } from 'react'
import client from '../../api/client'

/**
 * Every top-up across all users, straight from `GET /api/v1/admin/topups`.
 * The backend joins the person on each `topup_intents` row, so this is the
 * admin's "who transferred money" view — replacing the old hardcoded sample.
 *
 * `amount` is what the checkout link asked for, not what arrived. The proof
 * of money is `status === 'PAID'` plus `settled_via` — which says whether the
 * provider's callback closed it or an operator did by hand — and the raw
 * callback payload kept verbatim in `raw_response`, viewable per row so the
 * admin can check it against DC City's own statement.
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
  settled_via: 'webhook' | 'admin' | null
  raw_response: string | null
  promotion_id: number | null
  payment_id: number | null
}

/**
 * Sums the backend computes over the *whole* table — deliberately not the
 * page in view, so a small page can never understate what was actually paid.
 */
interface AdminTopupTotals {
  paid_total: number
  paid_count: number
  pending_total: number
  pending_count: number
  failed_total: number
  failed_count: number
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

/**
 * Who vouched for the money. "Admin" is not a lesser kind of paid — the
 * operator checked it against the statement by hand — but it is a different
 * kind, and the admin should be able to see at a glance which settlements
 * were automatic and which someone is personally accountable for.
 */
const VIA_LABEL: Record<NonNullable<AdminTopup['settled_via']>, string> = {
  webhook: 'Webhook',
  admin: 'Admin',
}

const viaColors: Record<NonNullable<AdminTopup['settled_via']>, string> = {
  webhook: 'bg-sky-50 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-200/70 dark:border-sky-500/30',
  admin: 'bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-200/70 dark:border-violet-500/30',
}

/**
 * Where the money landed, so "100 TJS" is never ambiguous about whose
 * 100 TJS it became. NULL with NULL means a plain balance top-up.
 */
function destination(p: AdminTopup): string {
  if (p.promotion_id != null) return `TOP promo #${p.promotion_id}`
  if (p.payment_id != null) return `Rental payment #${p.payment_id}`
  return 'Wallet balance'
}

const checkboxClass =
  'w-4 h-4 rounded border-gray-300 dark:border-white/20 bg-white dark:bg-white/10 text-blue-600 focus:ring-blue-500/30 focus:ring-2 cursor-pointer accent-blue-600'

/**
 * Both dates, both labelled. Before this the table showed one date that
 * silently swapped meaning — `paid_at` if settled, `created_at` otherwise —
 * so a Pending row read as though it had been paid on the day the link was
 * opened. Showing them apart is the point: opened and settled are different
 * facts and a top-up that never settled should never look settled.
 */
function formatDateTime(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

/** Money as the admin reads it — TJS, two decimals, grouped thousands. */
function money(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function PaymentsTable() {
  const [rows, setRows] = useState<AdminTopup[]>([])
  const [totals, setTotals] = useState<AdminTopupTotals | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [inspect, setInspect] = useState<AdminTopup | null>(null)

  useEffect(() => {
    let alive = true
    client
      .get('/admin/topups', { params: { limit: 200 } })
      .then((r) => {
        if (!alive) return
        setRows(r.data?.data ?? [])
        setTotals({
          paid_total: r.data?.paid_total ?? 0,
          paid_count: r.data?.paid_count ?? 0,
          pending_total: r.data?.pending_total ?? 0,
          pending_count: r.data?.pending_count ?? 0,
          failed_total: r.data?.failed_total ?? 0,
          failed_count: r.data?.failed_count ?? 0,
        })
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

  // Escape closes the raw-payload dialog — the natural exit for something
  // opened by a click, and the only one available without a visible close
  // control.
  useEffect(() => {
    if (!inspect) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setInspect(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [inspect])

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

        {/*
          The three numbers that make the amount column honest. Pending money is
          shown *separately* and never folded into Paid: it is a request the
          provider has not confirmed, and summing the two would present intent as
          revenue. Totals come from the backend over the whole table, so they do
          not shrink when a page or a filter does.
        */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div className="glass-card rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Paid</p>
            <p className="mt-1.5 text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {money(totals?.paid_total ?? 0)}
              <span className="ml-1 text-xs font-normal text-gray-400 dark:text-gray-500">TJS</span>
            </p>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              {totals?.paid_count ?? 0} settled
            </p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Pending</p>
            <p className="mt-1.5 text-lg font-bold text-amber-600 dark:text-amber-400">
              {money(totals?.pending_total ?? 0)}
              <span className="ml-1 text-xs font-normal text-gray-400 dark:text-gray-500">TJS</span>
            </p>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              {totals?.pending_count ?? 0} awaiting provider
            </p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Failed</p>
            <p className="mt-1.5 text-lg font-bold text-red-600 dark:text-red-400">
              {money(totals?.failed_total ?? 0)}
              <span className="ml-1 text-xs font-normal text-gray-400 dark:text-gray-500">TJS</span>
            </p>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              {totals?.failed_count ?? 0} declined
            </p>
          </div>
        </div>

        {error && (
          <div className="py-8 text-center text-sm text-red-500 dark:text-red-400">{error}</div>
        )}

        {!error && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
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
                  <th className="text-left px-4 py-3.5 text-sm font-medium text-gray-500 dark:text-gray-400">Opened</th>
                  <th className="text-left px-4 py-3.5 text-sm font-medium text-gray-500 dark:text-gray-400">Paid at</th>
                  <th className="text-left px-4 py-3.5 text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="text-left px-4 py-3.5 text-sm font-medium text-gray-500 dark:text-gray-400">Via</th>
                  <th className="text-left px-4 py-3.5 text-sm font-medium text-gray-500 dark:text-gray-400">Callback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {loading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`sk-${i}`}>
                      <td colSpan={10} className="px-4 py-4">
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
                        {/*
                          Where the money goes is only ever knowable from the ids,
                          and a 100 TJS that buys a TOP window is not the same
                          100 TJS as one that lands in a balance. Saying so under
                          the amount stops the column being read as one kind of
                          money when it is three.
                        */}
                        <span className="block mt-0.5 text-[11px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
                          → {destination(payment)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatDateTime(payment.created_at)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {/*
                          Paid at is its own column now. Previously one cell
                          showed paid_at falling back to created_at, which made
                          an unsettled row read as though it had been paid on the
                          day the link was opened — the dash is the honest answer.
                        */}
                        {formatDateTime(payment.paid_at)}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-semibold border ${statusColors[payment.status]}`}>
                          {STATUS_LABEL[payment.status] ?? payment.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {payment.settled_via ? (
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold border ${viaColors[payment.settled_via]}`}
                            title={
                              payment.settled_via === 'admin'
                                ? 'Confirmed by an operator against the statement'
                                : 'Settled by the provider callback'
                            }
                          >
                            {VIA_LABEL[payment.settled_via]}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {payment.raw_response ? (
                          <button
                            type="button"
                            onClick={() => setInspect(payment)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 border border-blue-200/70 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors cursor-pointer"
                            aria-label={`View callback payload for reference ${payment.reference}`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                        )}
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

      {/*
        The callback payload, shown verbatim. It is the one artefact the admin
        can hold against DC City's own statement, so it is deliberately not
        summarised or reformatted — the point is that it is the record, not a
        reading of the record.
      */}
      {inspect && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Callback payload for ${inspect.reference}`}
          onClick={() => setInspect(null)}
        >
          <div
            className="glass-section rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 p-5 border-b border-[color:var(--glass-border)]">
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Callback payload</h4>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 font-mono break-all">
                  {inspect.reference}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspect(null)}
                className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 overflow-y-auto">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Amount requested</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">
                    {money(inspect.amount)} TJS
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Status</dt>
                  <dd className="mt-0.5">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${statusColors[inspect.status]}`}>
                      {STATUS_LABEL[inspect.status] ?? inspect.status}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Opened</dt>
                  <dd className="mt-0.5 text-sm text-gray-700 dark:text-gray-300">
                    {formatDateTime(inspect.created_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Paid at</dt>
                  <dd className="mt-0.5 text-sm text-gray-700 dark:text-gray-300">
                    {formatDateTime(inspect.paid_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Settled via</dt>
                  <dd className="mt-0.5 text-sm text-gray-700 dark:text-gray-300">
                    {inspect.settled_via ? VIA_LABEL[inspect.settled_via] : 'Not settled'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Destination</dt>
                  <dd className="mt-0.5 text-sm text-gray-700 dark:text-gray-300">
                    {destination(inspect)}
                  </dd>
                </div>
              </dl>

              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                Raw response (verbatim)
              </p>
              <pre className="text-xs font-mono leading-relaxed text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-white/5 border border-[color:var(--glass-border)] rounded-xl p-4 overflow-x-auto whitespace-pre-wrap break-words">
                {inspect.raw_response}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
