import api from './client'

export interface DashboardSummary {
  total_revenue: number
  revenue_change_pct: number
  total_bookings: number
  bookings_change_pct: number
  active_rentals: number
  active_rentals_change_pct: number
  occupancy_rate: number
  occupancy_change_pct: number
}

export interface RevenueChartPoint {
  label: string
  revenue: number
  previous_revenue: number
}

export interface RevenueChartResponse {
  total_revenue: number
  revenue_change_pct: number
  data: RevenueChartPoint[]
}

export interface BookingPerformance {
  completed: number
  pending: number
  cancelled: number
  rejected: number
  confirmed: number
  total: number
  completion_pct: number
}

export interface RecentBooking {
  id: number
  customer_name: string
  equipment_name: string
  start_date: string
  end_date: string
  total_price: number
  status: string
  created_at: string
}

export const dashboardApi = {
  summary: () => api.get<{ data: DashboardSummary }>('/dashboard/summary'),
  revenueChart: (period: string = '6months') =>
    api.get<{ data: RevenueChartResponse }>('/dashboard/revenue-chart', { params: { period } }),
  bookingPerformance: () => api.get<{ data: BookingPerformance }>('/dashboard/booking-performance'),
  recentBookings: (limit: number = 10) =>
    api.get<{ data: RecentBooking[] }>('/dashboard/recent-bookings', { params: { limit } }),
}
