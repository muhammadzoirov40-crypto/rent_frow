import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { rentalApi, equipmentApi, type Rental, type Equipment } from '../api/dataApi'

export default function RentalsPage() {
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
      setError(err.response?.data?.detail || 'Failed to load rentals')
    } finally {
      setLoading(false)
    }
  }

  const handleRequestReturn = async (rentalId: number) => {
    if (!confirm('Are you sure you want to request return for this equipment?')) return
    setActionLoading(rentalId)
    setError('')
    setSuccessMessage('')
    try {
      await rentalApi.requestReturn(rentalId)
      setSuccessMessage('Return requested! Please drop off the equipment for final inspection.')
      loadRentals()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to request return')
    } finally {
      setActionLoading(null)
    }
  }

  const statusStyle = (status: string) => {
    switch (status) {
      case 'RESERVED': return 'bg-blue-50 text-blue-700 border border-blue-200'
      case 'PICKED_UP': return 'bg-purple-50 text-purple-700 border border-purple-200'
      case 'ACTIVE': return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      case 'RETURN_REQUESTED': return 'bg-amber-50 text-amber-700 border border-amber-200'
      case 'RETURNED': return 'bg-gray-100 text-gray-700 border border-gray-200'
      case 'INSPECTING': return 'bg-cyan-50 text-cyan-700 border border-cyan-200'
      case 'COMPLETED': return 'bg-emerald-50 text-emerald-600 border border-emerald-200'
      default: return 'bg-gray-100 text-gray-700 border border-gray-200'
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Rentals</h1>
          <p className="text-sm text-gray-500 mt-0.5">View your active rentals and request returns</p>
        </div>
        <button onClick={loadRentals} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-3.5 py-1.5 rounded-lg transition">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-xl p-4 border border-red-200 mb-4">{error}</div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 text-emerald-700 text-sm rounded-xl p-4 border border-emerald-200 mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {successMessage}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading rentals...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 p-8">
          <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No active rentals</h3>
          <p className="text-sm text-gray-500 mb-4">You haven't rented any equipment yet.</p>
          <Link to="/" className="inline-flex items-center gap-2 bg-brand-600 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-brand-700 transition shadow-md shadow-brand-500/20">
            Browse Available Equipment
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((r) => {
            const eq = equipmentMap[r.equipment_id]
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {eq?.image_url ? (
                        <img src={eq.image_url} alt={eq.name} className="w-12 h-12 rounded-xl object-cover" />
                      ) : (
                        <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center text-lg">
                          📦
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900">{eq?.name || `Equipment #${r.equipment_id}`}</h3>
                        <span className="text-xs font-mono text-gray-400">Rental #{r.id}</span>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyle(r.status)}`}>
                      {r.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Booking</span>
                      <span className="font-mono text-gray-800">#{r.booking_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Picked Up</span>
                      <span className="font-medium text-gray-800">
                        {r.pickup_at ? new Date(r.pickup_at).toLocaleDateString() : 'Pending'}
                      </span>
                    </div>
                    {r.returned_at && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Returned</span>
                        <span className="font-medium text-gray-800">
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
                      {actionLoading === r.id ? 'Requesting...' : 'Request Return'}
                    </button>
                  )}
                  {r.status === 'RETURN_REQUESTED' && (
                    <div className="text-center py-2.5 px-3 bg-amber-50 text-amber-700 text-sm rounded-xl font-medium border border-amber-200">
                      Return pending inspection
                    </div>
                  )}
                  {r.status === 'RETURNED' && (
                    <div className="text-center py-2.5 px-3 bg-gray-100 text-gray-600 text-sm rounded-xl font-medium">
                      Equipment returned & deposit processed
                    </div>
                  )}
                  {r.status === 'COMPLETED' && (
                    <div className="text-center py-2.5 px-3 bg-emerald-50 text-emerald-600 text-sm rounded-xl font-medium border border-emerald-200">
                      Rental completed
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
