import { useTranslation } from 'react-i18next'
import Header from './Header'
import Footer from './Footer'
import MobileBottomNav from './MobileBottomNav'
import useAuthStore from '../../store/authStore'
import { useAuth } from '../../hooks/useAuth'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuthStore()
  const { isLoading } = useAuth()

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
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a1a] flex flex-col">
      <Header />
      <main className="flex-1 pt-16 pb-20 md:pb-0">
        {children}
      </main>
      <Footer />
      <MobileBottomNav isAuthenticated={isAuthenticated} />
    </div>
  )
}
