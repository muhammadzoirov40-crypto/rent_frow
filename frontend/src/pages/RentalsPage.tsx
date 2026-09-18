import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { rentalApi, equipmentApi, type Rental, type Equipment } from '../api/dataApi'

export default function RentalsPage() {
  const { t } = useTranslation()
  const [items, setItems] = useState<Rental[]>([])
  const [equipmentMap, setEquipmentMap] = useState<Record<number, Equipment>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    loadRentals()
  }, [])

  const loadRentals = async () => {
    setLoading(true)
    setError('')
    setSuccessMessage('')
    try {
      const res = await rentalApi.list()
      const rentals = res.data.data.data || []
      setItems(rentals)

      const eqRes = await equipmentApi.list({ limit: 100 })
      const allEq = eqRes.data.data.data || []
      const map: Record<number, Equipment> = {}
      allEq.forEach((eq) => { map[eq.id] = eq })
      setEquipmentMap(map)
    } catch (err: any) {
      setError(err.response?.data?.detail || t('rentals.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }

  const handleRequestReturn = async (rentalId: number) => {
    if (!confirm(t('rentals.returnConfirm'))) return
    setActionLoading(rentalId)
    setError('')
    setSuccessMessage('')
    try {
      await rentalApi.requestReturn(rentalId)
      setSuccessMessage(t('rentals.returnSuccess'))
      loadRentals()
    } catch (err: any) {
      setError(err.response?.data?.detail || t('rentals.failedToReturn'))
    } finally {
      setActionLoading(null)
    }
  }

  const statusStyle = (status: string) => {
    switch (status) {
      case 'RESERVED': return 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20'
      case 'PICKED_UP': return 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20'
      case 'ACTIVE': return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
      case 'RETURN_REQUESTED': return 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
      case 'RETURNED': return 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-white/10'
      case 'INSPECTING': return 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20'
      case 'COMPLETED': return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
      default: return 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-white/10'
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('rentals.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{t('rentals.subtitle')}</p>
        </div>
        <button onClick={loadRentals} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 hover:bg-brand-100 dark:hover:bg-brand-500/20 px-3.5 py-1.5 rounded-lg transition">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {t('common.refresh')}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm rounded-xl p-4 border border-red-200 dark:border-red-500/20 mb-4">{error}</div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-sm rounded-xl p-4 border border-emerald-200 dark:border-emerald-500/20 mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {successMessage}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-slate-400">{t('common.loading')}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-white/5 p-8">
          <div className="w-16 h-16 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{t('rentals.noRentals')}</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">{t('rentals.noRentalsHint')}</p>
          <Link to="/" className="inline-flex items-center gap-2 bg-brand-600 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-brand-700 transition shadow-md shadow-brand-500/20">
            {t('rentals.browseAvailable')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((r) => {
            const eq = equipmentMap[r.equipment_id]
            return (
              <div key={r.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-white/5 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {eq?.image_url ? (
                        <img src={eq.image_url} alt={eq.name} className="w-12 h-12 rounded-xl object-cover" />
                      ) : (
                        <div className="w-12 h-12 bg-brand-50 dark:bg-brand-500/10 rounded-xl flex items-center justify-center text-lg">
                          📦
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{eq?.name || `Equipment #${r.equipment_id}`}</h3>
                        <span className="text-xs font-mono text-gray-400 dark:text-slate-500">{t('rentals.rental', { id: r.id })}</span>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyle(r.status)}`}>
                      {r.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-sm text-gray-600 dark:text-slate-400 bg-gray-50 dark:bg-white/5 p-3 rounded-xl">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-slate-500">{t('rentals.booking')}</span>
                      <span className="font-mono text-gray-800 dark:text-white">#{r.booking_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-slate-500">{t('rentals.pickedUp')}</span>
                      <span className="font-medium text-gray-800 dark:text-white">
                        {r.pickup_at ? new Date(r.pickup_at).toLocaleDateString() : t('rentals.pending')}
                      </span>
                    </div>
                    {r.returned_at && (
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-slate-500">{t('rentals.returned')}</span>
                        <span className="font-medium text-gray-800 dark:text-white">
                          {new Date(r.returned_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  {r.status === 'ACTIVE' && (
                    <button
                      disabled={actionLoading === r.id}
                      onClick={() => handleRequestReturn(r.id)}
                      className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition disabled:opacity-50 shadow-md shadow-brand-500/20"
                    >
                      {actionLoading === r.id ? t('rentals.requesting') : t('rentals.requestReturn')}
                    </button>
                  )}
                  {r.status === 'RETURN_REQUESTED' && (
                    <div className="text-center py-2.5 px-3 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm rounded-xl font-medium border border-amber-200 dark:border-amber-500/20">
                      {t('rentals.returnPending')}
                    </div>
                  )}
                  {r.status === 'RETURNED' && (
                    <div className="text-center py-2.5 px-3 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-slate-400 text-sm rounded-xl font-medium">
                      {t('rentals.equipmentReturned')}
                    </div>
                  )}
                  {r.status === 'COMPLETED' && (
                    <div className="text-center py-2.5 px-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm rounded-xl font-medium border border-emerald-200 dark:border-emerald-500/20">
                      {t('rentals.rentalCompleted')}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
