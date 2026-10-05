import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { equipmentApi, categoryApi, bookingApi, type Equipment, type Category } from '../api/dataApi'

const CATEGORY_ICONS: Record<string, string> = {
  'Power Tools': '🔧',
  'Camping & Outdoor': '⛺',
  'Photography': '📸',
  'Audio & Party': '🔊',
  'Garden & Lawn': '🌿',
  'Construction': '🏗️',
  'Electronics': '💻',
  'Sports & Fitness': '🏋️',
}

const CONDITION_COLORS: Record<string, string> = {
  NEW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  GOOD: 'bg-blue-50 text-blue-700 border-blue-200',
  FAIR: 'bg-amber-50 text-amber-700 border-amber-200',
  POOR: 'bg-red-50 text-red-700 border-red-200',
}

export default function EquipmentPage() {
  const [items, setItems] = useState<Equipment[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)

  // Booking Modal State
  const [selectedItem, setSelectedItem] = useState<Equipment | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [bookingSuccess, setBookingSuccess] = useState('')

  useEffect(() => {
    loadCategories()
    loadEquipment()
  }, [])

  const loadCategories = async () => {
    try {
      const res = await categoryApi.list()
      setCategories(res.data.data.data || [])
    } catch {}
  }

  const loadEquipment = async () => {
    setLoading(true)
    try {
      const res = await equipmentApi.list({ limit: 100 })
      setItems(res.data.data.data || [])
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load equipment')
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.category_name && item.category_name.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesCategory = selectedCategory === null || item.category_id === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [items, searchQuery, selectedCategory])

  const openBookingModal = (item: Equipment) => {
    setSelectedItem(item)
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
    setStartDate(today)
    setEndDate(tomorrow)
    setBookingError('')
    setBookingSuccess('')
  }

  const closeBookingModal = () => {
    setSelectedItem(null)
    setBookingError('')
    setBookingSuccess('')
  }

  const calculateDays = () => {
    if (!startDate || !endDate) return 1
    const diff = new Date(endDate).getTime() - new Date(startDate).getTime()
    const days = Math.ceil(diff / (1000 * 3600 * 24))
    return days > 0 ? days : 1
  }

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem) return
    setBookingLoading(true)
    setBookingError('')
    setBookingSuccess('')

    try {
      await bookingApi.create({
        equipment_id: selectedItem.id,
        start_date: startDate,
        end_date: endDate,
      })
      setBookingSuccess('Booking request created! Check My Bookings to proceed.')
      loadEquipment()
    } catch (err: any) {
      setBookingError(err.response?.data?.detail || 'Failed to create booking')
    } finally {
      setBookingLoading(false)
    }
  }

  const daysCount = calculateDays()
  const rentalPrice = selectedItem ? daysCount * selectedItem.price_per_day : 0
  const totalPrice = selectedItem ? rentalPrice + selectedItem.deposit_amount : 0

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 via-brand-700 to-blue-600 text-white p-8 md:p-10 shadow-xl shadow-brand-900/20">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 backdrop-blur-md text-white/90 border border-white/20 mb-4">
            Smart Equipment & Tool Sharing
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
            Don't buy it for 1 day — <span className="text-brand-200 underline decoration-brand-300 decoration-2">Rent it!</span>
          </h1>
          <p className="mt-3 text-brand-100 text-sm md:text-base leading-relaxed">
            Save money on power tools, party speakers, camping gear, and electronics. Rent from 1 day with zero hassle.
          </p>

          {/* Search Bar */}
          <div className="mt-6 flex items-center bg-white rounded-2xl p-1.5 shadow-lg max-w-lg focus-within:ring-2 focus-within:ring-brand-300 transition">
            <svg className="w-5 h-5 text-gray-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search tools, drills, cameras, tents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 bg-transparent outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-3 text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Decorative */}
        <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute right-20 top-4 w-40 h-40 bg-blue-400/20 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition ${
            selectedCategory === null
              ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25'
              : 'bg-white text-gray-600 border border-gray-200 hover:border-brand-300 hover:text-brand-600'
          }`}
        >
          All Equipment
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition ${
              selectedCategory === cat.id
                ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-brand-300 hover:text-brand-600'
            }`}
          >
            <span>{CATEGORY_ICONS[cat.name] || '📦'}</span>
            {cat.name}
          </button>
        ))}
      </div>

      {/* Catalog Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Available Equipment</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} ready for instant booking
          </p>
        </div>
        <button
          onClick={loadEquipment}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-3.5 py-1.5 rounded-lg transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-xl p-4 border border-red-200">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading available items...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 p-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-800">No equipment found</h3>
          <p className="text-sm text-gray-500 mt-1">Try a different search or category filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
            >
              {/* Image */}
              <div className="relative h-48 bg-gray-100 overflow-hidden">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100">
                    <span className="text-5xl">{CATEGORY_ICONS[item.category_name || ''] || '📦'}</span>
                  </div>
                )}
                <div className="absolute top-3 left-3">
                  {item.status === 'AVAILABLE' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-lg">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                      Available
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gray-800/70 text-white backdrop-blur-sm">
                      {item.status === 'RENTED' ? 'In Rent' : item.status === 'RESERVED' ? 'Reserved' : item.status === 'MAINTENANCE' ? 'Maintenance' : item.status}
                    </span>
                  )}
                </div>
                <div className="absolute top-3 right-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${CONDITION_COLORS[item.condition] || 'bg-gray-50 text-gray-600'}`}>
                    {item.condition}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs text-brand-600 font-semibold">{item.category_name || 'Uncategorized'}</span>
                </div>
                <h3 className="font-bold text-gray-900 text-lg leading-snug group-hover:text-brand-600 transition">
                  {item.name}
                </h3>
                {item.description && (
                  <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed flex-1">
                    {item.description}
                  </p>
                )}

                {/* Pricing */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-2xl font-extrabold text-brand-600">${item.price_per_day}</span>
                      <span className="text-xs text-gray-400 ml-1">/ day</span>
                    </div>
                    <span className="text-xs text-gray-500">Deposit: ${item.deposit_amount}</span>
                  </div>
                </div>

                {/* Book Button */}
                <button
                  disabled={item.status !== 'AVAILABLE'}
                  onClick={() => openBookingModal(item)}
                  className={`mt-4 w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    item.status === 'AVAILABLE'
                      ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-md shadow-brand-500/20 active:scale-[0.98]'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {item.status === 'AVAILABLE' ? 'Book Now' : 'Currently Unavailable'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeBookingModal}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-gray-900">Rent {selectedItem.name}</h2>
              <button onClick={closeBookingModal} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {bookingSuccess ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-emerald-700 font-medium mb-6">{bookingSuccess}</p>
                <div className="flex gap-3">
                  <Link
                    to="/bookings"
                    className="flex-1 bg-brand-600 text-white py-2.5 px-4 rounded-xl font-medium text-center hover:bg-brand-700 text-sm transition"
                  >
                    Go to My Bookings
                  </Link>
                  <button
                    onClick={closeBookingModal}
                    className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateBooking} className="space-y-4">
                {bookingError && (
                  <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">{bookingError}</div>
                )}

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      required
                      min={startDate || new Date().toISOString().split('T')[0]}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
                    />
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Duration</span>
                    <span className="font-semibold text-gray-800">{daysCount} day{daysCount > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Rental ({daysCount} × ${selectedItem.price_per_day}/day)</span>
                    <span className="font-semibold text-gray-800">${rentalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Refundable Deposit</span>
                    <span className="font-semibold text-gray-800">${selectedItem.deposit_amount}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2.5 flex justify-between">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="font-bold text-lg text-brand-600">${totalPrice.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={closeBookingModal}
                    className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bookingLoading}
                    className="flex-1 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition shadow-md shadow-brand-500/20"
                  >
                    {bookingLoading ? 'Booking...' : 'Confirm Booking'}
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
