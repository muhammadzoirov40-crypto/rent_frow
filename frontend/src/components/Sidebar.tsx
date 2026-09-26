import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Search,
  Heart,
  MessageSquare,
  Bell,
  PlusCircle,
  User,
  Settings,
  LogOut,
  LogIn,
  Sun,
  Moon,
  PanelLeftClose,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import useAuthStore from '../store/authStore'
import useUiStore from '../store/uiStore'
import { useTheme } from '../contexts/ThemeContext'
import { notifications as notificationsApi } from '../api/index'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
  authOnly?: boolean
  badge?: number
}

const iconBtn =
  'p-2.5 rounded-xl text-gray-500 dark:text-slate-400 hover:text-[#FF6B35] hover:bg-gray-100 dark:hover:bg-white/5 transition flex items-center justify-center shrink-0'

export default function Sidebar() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, user, logout } = useAuthStore()
  const { sidebarOpen, toggleSidebar } = useUiStore()
  const { theme, toggleTheme } = useTheme()
  const [query, setQuery] = useState('')
  const [imgError, setImgError] = useState(false)

  const open = sidebarOpen

  const { data: unreadData } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  })
  const unread = unreadData?.count || 0

  const profilePath = '/profile'
  const initials = (user?.display_name || user?.email || 'R').replace(/[^a-zA-Zа-яА-Я]/g, '').slice(0, 2).toUpperCase() || 'R'

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)

  const items: NavItem[] = [
    { to: '/', label: t('nav.dashboard'), icon: <LayoutDashboard className="w-5 h-5" /> },
    { to: '/search', label: t('nav.search'), icon: <Search className="w-5 h-5" /> },
    { to: '/favorites', label: t('nav.favorites'), icon: <Heart className="w-5 h-5" />, authOnly: true },
    { to: '/messages', label: t('nav.messages'), icon: <MessageSquare className="w-5 h-5" />, authOnly: true },
    { to: '/notifications', label: t('nav.notifications'), icon: <Bell className="w-5 h-5" />, authOnly: true, badge: unread },
    { to: '/create-listing', label: t('nav.createListing'), icon: <PlusCircle className="w-5 h-5" />, authOnly: true },
    { to: profilePath, label: t('nav.profile'), icon: <User className="w-5 h-5" />, authOnly: true },
    { to: '/settings', label: t('nav.settings'), icon: <Settings className="w-5 h-5" />, authOnly: true },
  ]

  const visibleItems = items.filter((item) => !item.authOnly || isAuthenticated)

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`)
      setQuery('')
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const renderItem = (item: NavItem) => {
    const active = isActive(item.to)
    const hasBadge = item.badge != null && item.badge > 0
    return (
      <Link
        key={item.to}
        to={item.to}
        title={open ? undefined : item.label}
        className={`relative flex items-center rounded-xl text-sm font-medium transition-colors duration-200 ${
          open ? 'gap-3 px-3 py-2.5' : 'justify-center px-0 py-2.5'
        } ${
          active
            ? 'bg-[#FF6B35]/10 text-[#FF6B35]'
            : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
        }`}
      >
        <span className="relative shrink-0">
          {item.icon}
          {hasBadge && !open && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#FF6B35] ring-2 ring-white dark:ring-[#12122a]" />
          )}
        </span>
        {open && <span className="flex-1 truncate">{item.label}</span>}
        {open && hasBadge && (
          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#FF6B35] text-white text-[10px] font-bold flex items-center justify-center">
            {item.badge}
          </span>
        )}
      </Link>
    )
  }

  return (
    <aside
      className={`hidden md:flex fixed left-3 top-20 bottom-4 z-40 flex-col rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#12122a] shadow-xl shadow-black/5 dark:shadow-black/40 overflow-hidden transition-all duration-300 ease-out ${
        open ? 'w-[248px] p-3' : 'w-[76px] p-2.5'
      }`}
    >
      {/* Profile / toggle */}
      <div className={`flex items-center gap-2.5 shrink-0 ${open ? 'justify-between px-1' : 'justify-center px-0'} pb-2`}>
        <Link to={isAuthenticated ? profilePath : '/'} className="flex items-center gap-2.5 min-w-0" title={open ? undefined : t('nav.profile')}>
          {user?.avatar_url && !imgError ? (
            <img
              src={user.avatar_url}
              alt=""
              className="w-9 h-9 rounded-full object-cover border border-gray-200 dark:border-white/10 shrink-0"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#e55a2b] flex items-center justify-center shadow-md shadow-[#FF6B35]/20 shrink-0">
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>
          )}
          {open && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate leading-tight">
                {user?.display_name || user?.email || t('sidebar.brand')}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-slate-500 truncate leading-tight">
                {user?.role ? user.role.toLowerCase() : t('sidebar.subtitle')}
              </p>
            </div>
          )}
        </Link>
        {open && (
          <button onClick={toggleSidebar} aria-label="Collapse sidebar" className={iconBtn}>
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search */}
      {open ? (
        <form onSubmit={handleSearch} className="shrink-0 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('header.searchPlaceholder')}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35] transition"
            />
          </div>
        </form>
      ) : (
        <Link
          to="/search"
          aria-label={t('nav.search')}
          className="flex items-center justify-center py-2.5 mx-auto w-full rounded-xl text-gray-500 dark:text-slate-400 hover:text-[#FF6B35] hover:bg-gray-100 dark:hover:bg-white/5 transition shrink-0"
        >
          <Search className="w-5 h-5" />
        </Link>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-1 space-y-1">
        {open && (
          <p className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-600">
            {t('nav.main')}
          </p>
        )}
        {visibleItems.map(renderItem)}
      </nav>

      {/* Bottom actions */}
      <div
        className={`shrink-0 pt-2 mt-2 border-t border-gray-100 dark:border-white/10 ${
          open ? 'flex items-center justify-between px-1' : 'flex flex-col items-center gap-1'
        }`}
      >
        <button onClick={toggleTheme} aria-label={theme === 'dark' ? t('theme.light') : t('theme.dark')} className={iconBtn}>
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        {isAuthenticated ? (
          <button onClick={handleLogout} aria-label={t('header.signOut')} className={`${iconBtn} hover:text-red-500`}>
            <LogOut className="w-5 h-5" />
          </button>
        ) : (
          <Link to="/login" aria-label={t('header.login')} className={iconBtn}>
            <LogIn className="w-5 h-5" />
          </Link>
        )}
      </div>
    </aside>
  )
}
