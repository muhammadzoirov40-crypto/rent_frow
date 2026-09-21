import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { UserProfile } from '../api/authApi'
import { useTheme } from '../contexts/ThemeContext'

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

const LANGUAGES = [
  { code: 'en', label: 'EN', fullLabel: 'English' },
  { code: 'ru', label: 'RU', fullLabel: 'Русский' },
  { code: 'tj', label: 'TJ', fullLabel: 'Тоҷикӣ' },
]

export default function Topbar({ user, onLogout }: TopbarProps) {
  const { t, i18n } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const initials = getInitials(user?.display_name || user?.email || '')
  const [langOpen, setLangOpen] = useState(false)
  const [imgError, setImgError] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)
  const isCustomer = user?.role === 'CUSTOMER'

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
    setLangOpen(false)
  }

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0]

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/5 flex items-center justify-between px-6">
      {/* Left */}
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300">
          {user?.role === 'ADMIN' ? t('nav.adminDashboard') : t('nav.myRentals')}
        </h2>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Language Switcher */}
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <span className="text-xs font-bold">{currentLang.label}</span>
            <svg className={`w-3 h-3 transition-transform ${langOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {langOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl shadow-xl py-1 z-50">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition ${
                    i18n.language === lang.code
                      ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400 font-semibold'
                      : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                >
                  <span className="text-xs font-bold w-6">{lang.label}</span>
                  <span>{lang.fullLabel}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 border border-gray-200 dark:border-white/10 hover:border-brand-300 dark:hover:border-brand-500/50 hover:shadow-md"
          title={theme === 'dark' ? t('theme.light') : t('theme.dark')}
        >
          <div className="relative w-10 h-5 bg-gray-300 dark:bg-brand-600 rounded-full transition-colors duration-300">
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 flex items-center justify-center ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0'}`}>
              {theme === 'dark' ? (
                <svg className="w-2.5 h-2.5 text-brand-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-2.5 h-2.5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-gray-600 dark:text-slate-300 hidden sm:inline">{theme === 'dark' ? t('theme.dark') : t('theme.light')}</span>
        </button>

        {/* Notifications bell */}
        <button className="relative p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
        </button>

        {/* User Card */}
        <Link
          to={isCustomer ? '/profile' : '/admin/profile'}
          className="flex items-center gap-3 pl-3 pr-1 py-1.5 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 hover:bg-gray-200 dark:hover:bg-white/8 hover:border-gray-300 dark:hover:border-white/10 transition-all duration-200"
        >
          <div className="flex flex-col items-end">
            <span className="text-sm font-semibold text-gray-900 dark:text-white leading-tight max-w-[140px] truncate">
              {user?.display_name || user?.email}
            </span>
            <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
              {user?.role}
            </span>
          </div>
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
        </Link>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
          title={t('common.signOut')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  )
}
