import { Link, useLocation } from 'react-router-dom'

interface NavbarProps {
  user: { id: number; email: string; role: string }
  onLogout: () => void
}

export default function Navbar({ user, onLogout }: NavbarProps) {
  const location = useLocation()

  const navLinks = [
    { path: '/', label: 'Equipment', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg> },
    { path: '/bookings', label: 'My Bookings', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
    { path: '/rentals', label: 'My Rentals', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> },
  ]

  return (
    <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-lg border-b border-gray-200/80 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Nav */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 bg-gradient-to-br from-brand-600 to-blue-500 rounded-xl flex items-center justify-center shadow-sm shadow-brand-500/30 group-hover:scale-105 transition">
                <span className="text-white font-bold text-base">R</span>
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-lg font-extrabold text-gray-900 tracking-tight leading-none group-hover:text-brand-600 transition">
                  RentFlow
                </span>
                <span className="text-[10px] font-medium text-gray-400 tracking-wider uppercase">
                  Equipment Rental
                </span>
              </div>
            </Link>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-1 bg-gray-100/70 p-1 rounded-xl">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg transition ${
                      isActive
                        ? 'bg-white text-brand-700 shadow-sm font-semibold'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                    }`}
                  >
                    {link.icon}
                    <span>{link.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Right: User */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5 bg-gray-50 border border-gray-200/80 px-3 py-2 rounded-xl">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                {user.email ? user.email[0].toUpperCase() : 'U'}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-800 max-w-[140px] truncate leading-tight">{user.email}</span>
                <span className="text-[10px] font-semibold text-brand-600 uppercase tracking-wider">{user.role}</span>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="text-xs font-medium text-gray-600 hover:text-red-600 bg-gray-100 hover:bg-red-50 px-3 py-2 rounded-lg transition"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
