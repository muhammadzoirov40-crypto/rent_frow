import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  LayoutGrid,
  CalendarCheck,
  Calendar,
  MessageSquare,
  Star,
  Wallet,
  User,
  Settings,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sun,
  X,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import useAuthStore from '../../store/authStore';

export type DashboardSection =
  | 'dashboard'
  | 'listings'
  | 'bookings'
  | 'calendar'
  | 'messages'
  | 'reviews'
  | 'earnings'
  | 'profile'
  | 'settings';

interface NavItem {
  key: DashboardSection;
  label: string;
  icon: ReactNode;
}

interface DashboardLayoutProps {
  children: ReactNode;
  active: DashboardSection;
  onNavigate: (section: DashboardSection) => void;
}

export default function DashboardLayout({ children, active, onNavigate }: DashboardLayoutProps) {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');

  const displayName = user?.display_name || user?.email || '—';
  const initial = (displayName || 'R').trim().charAt(0).toUpperCase();

  const navItems: NavItem[] = [
    { key: 'dashboard', label: t('dashboard.nav.dashboard'), icon: <LayoutDashboard className="w-5 h-5" /> },
    { key: 'listings', label: t('dashboard.nav.listings'), icon: <LayoutGrid className="w-5 h-5" /> },
    { key: 'bookings', label: t('dashboard.nav.bookings'), icon: <CalendarCheck className="w-5 h-5" /> },
    { key: 'calendar', label: t('dashboard.nav.calendar'), icon: <Calendar className="w-5 h-5" /> },
    { key: 'messages', label: t('dashboard.nav.messages'), icon: <MessageSquare className="w-5 h-5" /> },
    { key: 'reviews', label: t('dashboard.nav.reviews'), icon: <Star className="w-5 h-5" /> },
    { key: 'earnings', label: t('dashboard.nav.earnings'), icon: <Wallet className="w-5 h-5" /> },
    { key: 'profile', label: t('dashboard.nav.profile'), icon: <User className="w-5 h-5" /> },
    { key: 'settings', label: t('dashboard.nav.settings'), icon: <Settings className="w-5 h-5" /> },
  ];

  const visibleItems = navItems.filter((item) =>
    !query.trim() ? true : item.label.toLowerCase().includes(query.trim().toLowerCase())
  );

  const asideWidth = collapsed ? 'md:w-[76px]' : 'md:w-[264px]';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121418] text-gray-900 dark:text-white transition-colors duration-300">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-[264px] ${asideWidth}
          bg-white dark:bg-[#1a1d24] border-r border-gray-200 dark:border-white/10
          transition-[transform,width] duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        <div className={`flex items-center gap-3 h-16 px-4 border-b border-gray-200 dark:border-white/10 shrink-0 ${collapsed ? 'md:justify-center md:px-2' : ''}`}>
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#ff9162] text-white flex items-center justify-center font-bold shadow-lg shadow-orange-500/25 shrink-0">
            R
          </span>
          <span className={`font-bold text-lg tracking-tight transition-opacity duration-200 ${collapsed ? 'md:hidden' : ''}`}>
            RentHub
          </span>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="ml-auto md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={`px-4 pt-4 pb-2 shrink-0 ${collapsed ? 'md:px-2' : ''}`}>
          <div className={`flex items-center gap-3 ${collapsed ? 'md:justify-center' : ''}`}>
            <span className="relative shrink-0">
              <span className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1A1A2E] to-[#FF6B35] text-white text-sm font-semibold flex items-center justify-center overflow-hidden">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  initial
                )}
              </span>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#1a1d24]" />
            </span>
            <span className={`min-w-0 transition-opacity duration-200 ${collapsed ? 'md:hidden' : ''}`}>
              <span className="block text-sm font-semibold truncate">{displayName}</span>
              <span className="block text-xs text-gray-400 dark:text-gray-500 truncate">{user?.email || ''}</span>
            </span>
          </div>

          <div className={`mt-3 ${collapsed ? 'md:hidden' : ''}`}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('dashboard.searchPlaceholder')}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-gray-100 dark:bg-white/5 border border-transparent focus:border-[#FF6B35]/50 focus:bg-white dark:focus:bg-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none transition"
              />
            </div>
          </div>
        </div>

        <nav className={`flex-1 overflow-y-auto px-3 py-2 space-y-1 ${collapsed ? 'md:px-2' : ''}`}>
          <p className={`px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 transition-opacity duration-200 ${collapsed ? 'md:hidden' : ''}`}>
            {t('dashboard.menu')}
          </p>
          {visibleItems.map((item) => {
            const isActive = active === item.key;
            return (
              <button
                key={item.key}
                type="button"
                title={item.label}
                data-nav={item.key}
                onClick={() => {
                  onNavigate(item.key);
                  setMobileOpen(false);
                }}
                className={`relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition
                  ${collapsed ? 'md:justify-center md:px-0' : ''}
                  ${
                    isActive
                      ? 'bg-gradient-to-r from-[#FF6B35] to-[#ff8552] text-white shadow-lg shadow-orange-500/25'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <span className="shrink-0">{item.icon}</span>
                <span className={`truncate transition-opacity duration-200 ${collapsed ? 'md:hidden' : ''}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        <div className={`border-t border-gray-200 dark:border-white/10 p-3 shrink-0 ${collapsed ? 'md:px-2' : ''}`}>
          <div className={`flex items-center gap-1.5 ${collapsed ? 'md:grid md:grid-cols-2 md:gap-1.5' : 'justify-between'}`}>
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'dark' ? t('dashboard.themeLight') : t('dashboard.themeDark')}
              aria-label={theme === 'dark' ? t('dashboard.themeLight') : t('dashboard.themeDark')}
              className="flex-1 md:flex-none p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:text-[#FF6B35] hover:bg-gray-100 dark:hover:bg-white/10 transition"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              type="button"
              title={t('dashboard.collapse')}
              aria-label={collapsed ? t('dashboard.expand') : t('dashboard.collapse')}
              onClick={() => setCollapsed((c) => !c)}
              className="flex-1 md:flex-none p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:text-[#FF6B35] hover:bg-gray-100 dark:hover:bg-white/10 transition hidden md:block"
            >
              {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </aside>

      <div className={`flex flex-col min-h-screen transition-[padding] duration-300 ease-in-out ${collapsed ? 'md:pl-[76px]' : 'md:pl-[264px]'}`}>
        <header className="sticky top-0 z-30 h-16 flex items-center gap-3 px-4 sm:px-6 bg-white/80 dark:bg-[#121418]/80 backdrop-blur border-b border-gray-200 dark:border-white/10 transition-colors duration-300">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label={t('dashboard.menu')}
            className="md:hidden p-2 -ml-1 rounded-xl text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10 transition"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold truncate">{t(`dashboard.nav.${active}`)}</h1>
            <p className="hidden sm:block text-xs text-gray-400 dark:text-gray-500 truncate">
              {t('dashboard.greeting')}, {displayName}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? t('dashboard.themeLight') : t('dashboard.themeDark')}
              className="p-2.5 rounded-xl text-gray-500 hover:text-[#FF6B35] dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <span className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1A1A2E] to-[#FF6B35] text-white text-sm font-semibold flex items-center justify-center overflow-hidden">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </span>
          </div>
        </header>

        <main
          className={`flex-1 transition-all duration-300 ${
            collapsed ? 'p-4 sm:p-5 lg:p-6' : 'p-4 sm:p-6 lg:p-8'
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
