import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import MobileBottomNav from './MobileBottomNav'
import Sidebar from '../Sidebar'
import useAuthStore from '../../store/authStore'
import useUiStore from '../../store/uiStore'
import { useAuth } from '../../hooks/useAuth'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuthStore()
  const { isLoading } = useAuth()
  const { pathname } = useLocation()
  const { sidebarOpen } = useUiStore()

  const showSidebar =
    !pathname.startsWith('/admin') &&
    !pathname.startsWith('/revenlo') &&
    pathname !== '/login' &&
    pathname !== '/register'

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a1a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`min-h-screen bg-gray-50 dark:bg-[#0a0a1a] flex flex-col transition-[padding] duration-300 ease-out ${
        showSidebar ? (sidebarOpen ? 'md:pl-[264px]' : 'md:pl-[96px]') : ''
      }`}
    >
      <Header />
      <main className="flex-1 pt-16 pb-20 md:pb-0">
        {children}
      </main>
      <Footer />
      <MobileBottomNav isAuthenticated={isAuthenticated} />
      {showSidebar && <Sidebar />}
    </div>
  )
}
