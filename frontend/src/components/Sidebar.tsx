import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { UserProfile } from '../api/authApi'

interface SidebarProps {
  user: UserProfile
  onLogout?: () => void
  collapsed?: boolean
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

export default function Sidebar({ user, onLogout, collapsed = false }: SidebarProps) {
  const location = useLocation()
  const { t } = useTranslation()
  const initials = getInitials(user?.display_name || user?.email || '')
  const isCustomer = user?.role === 'CUSTOMER'
  const isOwner = user?.role === 'OWNER'
  const isAdmin = user?.role === 'ADMIN'
  const profilePath = isCustomer ? '/profile' : '/admin/profile'
  const [imgError, setImgError] = useState(false)

  const navLinks = [
    {
      path: '/',
      label: t('nav.dashboard'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      path: '/equipment',
      label: t('nav.equipment'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      ),
    },
    {
      path: '/bookings',
      label: t('nav.bookings'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      path: '/rentals',
      label: t('nav.rentals'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
  ]

  const bottomLinks = [
    {
      path: profilePath,
      label: t('nav.profile'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ]

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-white/5">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-gray-200 dark:border-white/5 shrink-0">
        <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
          <span className="text-white font-bold text-base">R</span>
        </div>
        <div className="flex flex-col">
          <span className="text-base font-extrabold text-gray-900 dark:text-white tracking-tight leading-none">
            {t('sidebar.brand')}
          </span>
          <span className="text-[10px] font-medium text-gray-400 dark:text-slate-500 tracking-wider uppercase">
            {t('sidebar.subtitle')}
          </span>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-600">
          {t('nav.main')}
        </p>
        {navLinks.map((link) => {
          const isActive = location.pathname === link.path
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-brand-600/15 text-brand-600 dark:text-brand-400 border border-brand-500/20 shadow-sm shadow-brand-500/5'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
              }`}
            >
              <span className={isActive ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 dark:text-slate-500'}>
                {link.icon}
              </span>
              {!collapsed && <span>{link.label}</span>}
            </Link>
          )
        })}

        <div className="pt-4 pb-2">
          <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-600">
            {t('nav.account')}
          </p>
        </div>
        {bottomLinks.map((link) => {
          const isActive = location.pathname === link.path
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-brand-600/15 text-brand-600 dark:text-brand-400 border border-brand-500/20 shadow-sm shadow-brand-500/5'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
              }`}
            >
              <span className={isActive ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 dark:text-slate-500'}>
                {link.icon}
              </span>
              {!collapsed && <span>{link.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User Card */}
      <div className="px-3 pb-4 shrink-0">
        <Link
          to={profilePath}
          className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 hover:bg-gray-200 dark:hover:bg-white/8 hover:border-gray-300 dark:hover:border-white/10 transition-all duration-200 group"
        >
          {user?.avatar_url && !imgError ? (
            <img
              src={cacheBust(user.avatar_url)}
              alt={user.display_name || user.email}
              className="w-9 h-9 rounded-lg object-cover border border-gray-300 dark:border-white/10"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-md shadow-brand-500/20">
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>
          )}
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {user?.display_name || user?.email}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-slate-500 truncate">{user?.email}</p>
            </div>
          )}
          {!collapsed && (
            <svg className="w-4 h-4 text-gray-400 dark:text-slate-600 group-hover:text-gray-600 dark:group-hover:text-slate-400 transition shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </Link>
      </div>
    </aside>
  )
}
