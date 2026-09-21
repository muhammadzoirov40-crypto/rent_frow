import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../contexts/ThemeContext'
import Toast from '../components/Toast'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
  { code: 'tj', label: 'Тоҷикӣ' },
]

export default function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [notifications, setNotifications] = useState(() => {
    return localStorage.getItem('notifications') !== 'false'
  })

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
    localStorage.setItem('language', lng)
    setToast({ message: t('settings.languageChanged'), type: 'success' })
  }

  const toggleNotifications = () => {
    const newValue = !notifications
    setNotifications(newValue)
    localStorage.setItem('notifications', String(newValue))
    setToast({ message: newValue ? t('settings.notificationsEnabled') : t('settings.notificationsDisabled'), type: 'success' })
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{t('settings.title')}</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm">{t('settings.subtitle')}</p>
        </div>

        <div className="space-y-6">
          {/* Language */}
          <div className="bg-white dark:bg-white/[0.03] backdrop-blur-xl border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6 shadow-xl shadow-black/10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('settings.language')}</h2>
                <p className="text-gray-500 dark:text-slate-400 text-xs">{t('settings.languageDesc')}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 border ${
                    i18n.language === lang.code
                      ? 'bg-brand-600 text-white border-brand-600 shadow-lg shadow-brand-600/25'
                      : 'bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-white/10 hover:border-brand-300 dark:hover:border-brand-500/50 hover:bg-gray-100 dark:hover:bg-white/[0.08]'
                  }`}
                >
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div className="bg-white dark:bg-white/[0.03] backdrop-blur-xl border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6 shadow-xl shadow-black/10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('settings.theme')}</h2>
                <p className="text-gray-500 dark:text-slate-400 text-xs">{t('settings.themeDesc')}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => { if (theme !== 'light') toggleTheme() }}
                className={`flex items-center justify-center gap-3 px-4 py-4 rounded-xl text-sm font-semibold transition-all duration-200 border ${
                  theme === 'light'
                    ? 'bg-brand-600 text-white border-brand-600 shadow-lg shadow-brand-600/25'
                    : 'bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-white/10 hover:border-brand-300 dark:hover:border-brand-500/50 hover:bg-gray-100 dark:hover:bg-white/[0.08]'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span>{t('theme.light')}</span>
              </button>
              <button
                onClick={() => { if (theme !== 'dark') toggleTheme() }}
                className={`flex items-center justify-center gap-3 px-4 py-4 rounded-xl text-sm font-semibold transition-all duration-200 border ${
                  theme === 'dark'
                    ? 'bg-brand-600 text-white border-brand-600 shadow-lg shadow-brand-600/25'
                    : 'bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-white/10 hover:border-brand-300 dark:hover:border-brand-500/50 hover:bg-gray-100 dark:hover:bg-white/[0.08]'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                <span>{t('theme.dark')}</span>
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white dark:bg-white/[0.03] backdrop-blur-xl border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6 shadow-xl shadow-black/10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('settings.notifications')}</h2>
                <p className="text-gray-500 dark:text-slate-400 text-xs">{t('settings.notificationsDesc')}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${notifications ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600'}`} />
                <span className="text-sm font-medium text-gray-900 dark:text-white">{t('settings.enableNotifications')}</span>
              </div>
              <button
                onClick={toggleNotifications}
                className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
                  notifications ? 'bg-brand-600' : 'bg-gray-300 dark:bg-slate-600'
                }`}
              >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 flex items-center justify-center ${
                  notifications ? 'translate-x-6' : 'translate-x-0'
                }`}>
                  {notifications ? (
                    <svg className="w-3 h-3 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
