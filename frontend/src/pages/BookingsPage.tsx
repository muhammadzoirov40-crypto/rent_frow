import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { bookingApi, paymentApi, equipmentApi, type Booking, type Equipment } from '../api/dataApi'

export default function BookingsPage() {
  const [items, setItems] = useState<Booking[]>([])
  const [equipmentMap, setEquipmentMap] = useState<Record<number, Equipment>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [payingBooking, setPayingBooking] = useState<Booking | null>(null)
  const [paymentType, setPaymentType] = useState('BOOKING')
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [paymentSuccess, setPaymentSuccess] = useState('')

  useEffect(() => {
    loadBookings()
  }, [])

  const loadBookings = async () => {
    setLoading(true)
    try {
      const res = await bookingApi.list()
      const bookings = res.data.data.data || []
      setItems(bookings)

      const equipmentIds = [...new Set(bookings.map((b) => b.equipment_id))]
      const eqRes = await equipmentApi.list({ limit: 100 })
      const allEq = eqRes.data.data.data || []
      const map: Record<number, Equipment> = {}
      allEq.forEach((eq) => { map[eq.id] = eq })
      setEquipmentMap(map)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (id: number) => {
    if (!confirm('Cancel this booking?')) return
    try {
      await bookingApi.cancel(id)
      loadBookings()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to cancel booking')
    }
  }

  const openPaymentModal = (b: Booking) => {
    setPayingBooking(b)
    setPaymentType('BOOKING')
    setPaymentError('')
    setPaymentSuccess('')
  }

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!payingBooking) return
    setPaymentLoading(true)
    setPaymentError('')
    setPaymentSuccess('')

    try {
      await paymentApi.create({
        booking_id: payingBooking.id,
        amount: payingBooking.total_price,
        payment_type: paymentType,
      })
      setPaymentSuccess('Payment successful! Your rental is ready for pickup.')
      loadBookings()
    } catch (err: any) {
      setPaymentError(err.response?.data?.detail || 'Payment failed. Please try again.')
    } finally {
      setPaymentLoading(false)
    }
  }

  const statusStyle = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-50 text-amber-700 border border-amber-200'
      case 'CONFIRMED': return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      case 'CANCELLED': return 'bg-red-50 text-red-700 border border-red-200'
      case 'COMPLETED': return 'bg-blue-50 text-blue-700 border border-blue-200'
      case 'REJECTED': return 'bg-gray-100 text-gray-600 border border-gray-200'
      default: return 'bg-gray-100 text-gray-700 border border-gray-200'
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track and manage your equipment reservations</p>
        </div>
        <button onClick={loadBookings} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-3.5 py-1.5 rounded-lg transition">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-xl p-4 border border-red-200 mb-4">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading bookings...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 p-8">
          <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No bookings yet</h3>
          <p className="text-sm text-gray-500 mb-4">Start browsing equipment and make your first booking.</p>
          <Link to="/" className="inline-flex items-center gap-2 bg-brand-600 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-brand-700 transition shadow-md shadow-brand-500/20">
            Browse Equipment
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((b) => {
            const eq = equipmentMap[b.equipment_id]
            return (
              <div key={b.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition">
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
                      <h3 className="font-semibold text-gray-900">{eq?.name || `Equipment #${b.equipment_id}`}</h3>
                      <span className="text-xs font-mono text-gray-400">Booking #{b.id}</span>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyle(b.status)}`}>
                    {b.status}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Dates</span>
                    <span className="font-medium text-gray-800">{b.start_date} → {b.end_date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Deposit</span>
                    <span className="font-medium text-gray-800">${b.deposit_amount}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-gray-200">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="font-bold text-brand-600">${b.total_price}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
                    <>
                      <button
                        onClick={() => openPaymentModal(b)}
                        className="flex-1 bg-brand-600 text-white hover:bg-brand-700 font-semibold px-4 py-2 rounded-xl text-sm transition shadow-sm"
                      >
                        Pay ${b.total_price}
                      </button>
                      <button
                        onClick={() => handleCancel(b.id)}
                        className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {b.status === 'COMPLETED' && (
                    <Link to="/rentals" className="text-sm text-brand-600 hover:text-brand-800 font-medium">
                      View in Rentals →
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Payment Modal */}
      {payingBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setPayingBooking(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-gray-900">Payment</h2>
              <button onClick={() => setPayingBooking(null)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {paymentSuccess ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-emerald-700 font-medium mb-6">{paymentSuccess}</p>
                <div className="flex gap-3">
                  <Link to="/rentals" className="flex-1 bg-brand-600 text-white py-2.5 rounded-xl font-medium text-center hover:bg-brand-700 text-sm transition">
                    Go to My Rentals
                  </Link>
                  <button onClick={() => setPayingBooking(null)} className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition">
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleProcessPayment} className="space-y-4">
                {paymentError && (
                  <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">{paymentError}</div>
                )}

                <div className="bg-gray-50 p-4 rounded-xl space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Booking</span>
                    <span className="font-semibold text-gray-800">#{payingBooking.id}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Dates</span>
                    <span className="font-semibold text-gray-800">{payingBooking.start_date} to {payingBooking.end_date}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Deposit (refundable)</span>
                    <span className="font-semibold text-gray-800">${payingBooking.deposit_amount}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="font-bold text-lg text-brand-600">${payingBooking.total_price}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setPaymentType('BOOKING')} className={`p-3 rounded-xl border text-sm font-medium text-center transition ${paymentType === 'BOOKING' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}>
                      Rental Fee
                    </button>
                    <button type="button" onClick={() => setPaymentType('DEPOSIT')} className={`p-3 rounded-xl border text-sm font-medium text-center transition ${paymentType === 'DEPOSIT' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}>
                      Deposit
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setPayingBooking(null)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                    Cancel
                  </button>
                  <button type="submit" disabled={paymentLoading} className="flex-1 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition shadow-md shadow-brand-500/20">
                    {paymentLoading ? 'Processing...' : `Pay $${payingBooking.total_price}`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
