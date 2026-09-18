import { Link } from 'react-router-dom'
import { UserProfile } from '../api/authApi'

interface TopbarProps {
  user: UserProfile
  onLogout: () => void
}

function getInitials(nameOrEmail: string): string {
  if (!nameOrEmail) return 'AD'
  const parts = nameOrEmail.split(/[\s@]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return nameOrEmail.slice(0, 2).toUpperCase()
}

function cacheBust(url: string): string {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}t=${Date.now()}`
}

export default function Topbar({ user, onLogout }: TopbarProps) {
  const initials = getInitials(user?.display_name || user?.email || '')

  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-900/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6">
      {/* Left spacer / page title area */}
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-slate-300">{user?.role === 'ADMIN' ? 'Admin Dashboard' : 'RentFlow'}</h2>
      </div>

      {/* Right: User info + Logout */}
      <div className="flex items-center gap-4">
        {/* Notifications bell */}
        <button className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full ring-2 ring-slate-900" />
        </button>

        {/* User Card */}
        <Link
          to="/admin/profile"
          className="flex items-center gap-3 pl-3 pr-1 py-1.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/8 hover:border-white/10 transition-all duration-200"
        >
          <div className="flex flex-col items-end">
            <span className="text-sm font-semibold text-white leading-tight max-w-[140px] truncate">
              {user?.display_name || 'Admin'}
            </span>
            <span className="text-[10px] font-bold text-brand-400 uppercase tracking-wider">
              {user?.role}
            </span>
          </div>
          {user?.avatar_url ? (
            <img
              src={cacheBust(user.avatar_url)}
              alt={user.display_name || user.email}
              className="w-9 h-9 rounded-lg object-cover border border-white/10"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-md shadow-brand-500/20">
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>
          )}
        </Link>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
          title="Sign out"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  )
}
