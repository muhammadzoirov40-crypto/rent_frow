import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Home, Search, PlusCircle, MessageSquare, User } from 'lucide-react'

interface MobileBottomNavProps {
  isAuthenticated: boolean
}

export default function MobileBottomNav({ isAuthenticated }: MobileBottomNavProps) {
  const { t } = useTranslation()
  const location = useLocation()

  const NAV_ITEMS = [
    { icon: Home, label: t('nav.home'), to: '/' },
    { icon: Search, label: t('nav.search'), to: '/search' },
    { icon: PlusCircle, label: t('nav.createListing'), to: '/create-listing', isPrimary: true },
    { icon: MessageSquare, label: t('nav.messages'), to: '/messages' },
    { icon: User, label: t('nav.profile'), to: '/profile' },
  ]

  const getTo = (item: typeof NAV_ITEMS[0]) => {
    if (item.to === '/profile' && !isAuthenticated) return '/login'
    return item.to
  }

  const isActive = (item: typeof NAV_ITEMS[0]) => {
    const to = getTo(item)
    if (to === '/') return location.pathname === '/'
    return location.pathname.startsWith(to)
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#1A1A2E] border-t border-gray-100 dark:border-white/10 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-around px-2 py-1">
        {NAV_ITEMS.map((item) => {
          const to = getTo(item)
          const active = isActive(item)
          const Icon = item.icon

          if (item.isPrimary) {
            return (
              <Link key={item.to} to={to} className="relative -mt-5">
                <div className="w-14 h-14 bg-[#FF6B35] rounded-full flex items-center justify-center shadow-lg shadow-[#FF6B35]/30 border-4 border-white dark:border-[#1A1A2E]">
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </Link>
            )
          }

          return (
            <Link
              key={item.to}
              to={to}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition ${
                active ? 'text-[#FF6B35]' : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
