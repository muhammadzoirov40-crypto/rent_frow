import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Header from './Header'
import Footer from './Footer'
import MobileBottomNav from './MobileBottomNav'
import SiteSidebar from './SiteSidebar'
import AssistantWidget from '../ai/AssistantWidget'
import { useLocation } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import { useAuth } from '../../hooks/useAuth'

interface LayoutProps {
  children: React.ReactNode
}

// The left rail is the site's navigation: it goes on every page that wears
// the site chrome, the marketing pages included. Only the auth screens keep
// the whole width (there is nothing to navigate to before signing in), and
// the full-screen dashboards sit outside this layout entirely.

export default function Layout({ children }: LayoutProps) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const isAuthPage = pathname === '/login' || pathname === '/register'
  const showSidebar = !isAuthPage
  const { isAuthenticated } = useAuthStore()
  const { isLoading } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem('siteSidebarCollapsed') === '1'
  )

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      localStorage.setItem('siteSidebarCollapsed', prev ? '0' : '1')
      return !prev
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="assistant-shift min-h-screen bg-transparent flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        {showSidebar && <SiteSidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />}
        <div className="flex-1 min-w-0 flex flex-col">
          <main className={`flex-1 pt-[var(--header-h)] ${isAuthPage ? '' : 'pb-20'} md:pb-0`}>
            {children}
          </main>
          {pathname === '/' && <Footer />}
        </div>
      </div>
      {!isAuthPage && <MobileBottomNav isAuthenticated={isAuthenticated} />}
      {/* The chat owns the bottom-right corner: the floating assistant would sit
          on top of the composer there, so it stays off the messages route. */}
      {!isAuthPage && pathname !== '/messages' && <AssistantWidget />}
    </div>
  )
}
