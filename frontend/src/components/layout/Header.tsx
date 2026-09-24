import { useState, useRef, useEffect, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Search,
  Heart,
  MessageSquare,
  Bell,
  PlusCircle,
  Menu,
  X,
  User,
  Home,
  LogOut,
  ChevronDown,
  List,
  Send,
  Sun,
  Moon,
  Globe,
  Settings,
  Shield,
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import { useTheme } from '../../contexts/ThemeContext'
import { useQuery } from '@tanstack/react-query'
import { notifications as notificationsApi } from '../../api/index'

const LANGUAGES = [
  { code: 'tj', label: 'Тоҷикӣ', flag: '🇹🇯' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
]

export default function Header() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuthStore()
  const { theme, toggleTheme } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)

  const notifRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const langRef = useRef<HTMLDivElement>(null)

  const { data: unreadData } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  })

  const unreadCount = unreadData?.count || 0

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false)
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
      setMobileMenuOpen(false)
    }
  }

  const handleLogout = () => {
    logout()
    setUserMenuOpen(false)
    navigate('/')
  }

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
    localStorage.setItem('language', lng)
    setLangOpen(false)
  }

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0]

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-[#1A1A2E] shadow-sm border-b border-gray-100 dark:border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-[#FF6B35] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <span className="text-xl font-bold text-[#FF6B35] hidden sm:block">RentFlow</span>
          </Link>

          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('header.searchPlaceholder')}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35] transition"
              />
            </div>
          </form>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:text-[#FF6B35] hover:bg-orange-50 dark:hover:bg-white/5 transition"
              aria-label={theme === 'dark' ? t('theme.light') : t('theme.dark')}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="relative" ref={langRef}>
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-gray-500 dark:text-gray-400 hover:text-[#FF6B35] hover:bg-orange-50 dark:hover:bg-white/5 transition text-sm font-medium"
              >
                <Globe className="w-4 h-4" />
                <span>{currentLang.code.toUpperCase()}</span>
              </button>
              {langOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-[#1A1A2E] rounded-xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden z-50">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => changeLanguage(lang.code)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition ${
                        i18n.language === lang.code
                          ? 'bg-[#FF6B35]/10 text-[#FF6B35] font-semibold'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                      }`}
                    >
                      <span className="text-lg">{lang.flag}</span>
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {isAuthenticated && user ? (
              <>
                <Link
                  to="/favorites"
                  className="relative p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:text-[#FF6B35] hover:bg-orange-50 dark:hover:bg-white/5 transition hidden sm:flex"
                >
                  <Heart className="w-5 h-5" />
                </Link>

                <Link
                  to="/messages"
                  className="relative p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:text-[#FF6B35] hover:bg-orange-50 dark:hover:bg-white/5 transition hidden sm:flex"
                >
                  <MessageSquare className="w-5 h-5" />
                </Link>

                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => { setNotifOpen(!notifOpen); setUserMenuOpen(false) }}
                    className="relative p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:text-[#FF6B35] hover:bg-orange-50 dark:hover:bg-white/5 transition hidden sm:flex"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#1A1A2E] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden z-50">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/10">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('header.notifications')}</h3>
                        <Link to="/notifications" onClick={() => setNotifOpen(false)} className="text-xs text-[#FF6B35] hover:text-[#e55a2b] font-medium">
                          {t('header.all')}
                        </Link>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        <div className="px-4 py-6 text-center text-sm text-gray-400">
                          {t('header.noNotifications')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Link
                  to="/create-listing"
                  className="hidden sm:flex items-center gap-1.5 px-4 py-2.5 bg-[#FF6B35] hover:bg-[#e55a2b] text-white text-sm font-semibold rounded-xl transition shadow-sm shadow-[#FF6B35]/20"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{t('nav.createListing')}</span>
                </Link>

                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => { setUserMenuOpen(!userMenuOpen); setNotifOpen(false) }}
                    className="flex items-center gap-2 p-1.5 pr-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition"
                  >
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6B35] to-[#e55a2b] flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {(user.display_name || user.email || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1A1A2E] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden z-50">
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-white/10">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.display_name || user.email}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                      </div>
                      <div className="py-1">
                        <Link to="/profile" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition">
                          <User className="w-4 h-4 text-gray-400" />
                          {t('header.profile')}
                        </Link>
                        <Link to="/profile" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition">
                          <List className="w-4 h-4 text-gray-400" />
                          {t('header.myListings')}
                        </Link>
                        <Link to="/rental-requests" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition">
                          <Send className="w-4 h-4 text-gray-400" />
                          {t('header.rentalRequests')}
                        </Link>
                        <Link to="/settings" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition">
                          <Settings className="w-4 h-4 text-gray-400" />
                          {t('header.settings')}
                        </Link>
                        {user?.role === 'ADMIN' && (
                          <Link to="/admin" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#FF6B35] font-semibold hover:bg-orange-50 dark:hover:bg-[#FF6B35]/10 transition">
                            <Shield className="w-4 h-4" />
                            {t('nav.adminDashboard')}
                          </Link>
                        )}
                      </div>
                      <div className="border-t border-gray-100 dark:border-white/10 py-1">
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                        >
                          <LogOut className="w-4 h-4" />
                          {t('header.signOut')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition"
                >
                  {t('header.login')}
                </Link>
                <Link
                  to="/register"
                >
                  {t('header.register')}
                </Link>
              </>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition md:hidden"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <form onSubmit={handleSearch} className="md:hidden pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('header.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35] transition"
            />
          </div>
        </form>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-[#1A1A2E] border-t border-gray-100 dark:border-white/10 shadow-lg">
          <div className="px-4 py-3 space-y-1">
            <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition">
              <Home className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium">{t('nav.home')}</span>
            </Link>
            <Link to="/search" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition">
              <Search className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium">{t('nav.search')}</span>
            </Link>
            {isAuthenticated && (
              <>
                <Link to="/favorites" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition">
                  <Heart className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-medium">{t('nav.favorites')}</span>
                </Link>
                <Link to="/messages" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition">
                  <MessageSquare className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-medium">{t('nav.messages')}</span>
                </Link>
                <Link to="/create-listing" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-[#FF6B35] bg-orange-50 dark:bg-[#FF6B35]/10 font-semibold transition">
                  <PlusCircle className="w-5 h-5" />
                  <span className="text-sm">{t('nav.createListing')}</span>
                </Link>
              </>
            )}
            <div className="flex items-center gap-2 px-3 py-2 pt-2">
              <button onClick={toggleTheme} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition">
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {theme === 'dark' ? t('theme.light') : t('theme.dark')}
              </button>
              <div className="flex items-center gap-1">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code)}
                    className={`px-2 py-1 rounded-lg text-xs font-medium transition ${
                      i18n.language === lang.code
                        ? 'bg-[#FF6B35] text-white'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                  >
                    {lang.flag}
                  </button>
                ))}
              </div>
            </div>
            {!isAuthenticated && (
              <div className="pt-2 border-t border-gray-100 dark:border-white/10 space-y-2">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="block w-full text-center px-4 py-3 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl">
                  {t('header.login')}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
