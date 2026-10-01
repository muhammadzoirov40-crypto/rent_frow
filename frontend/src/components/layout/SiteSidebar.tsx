import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  ClipboardList,
  Heart,
  Home,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  PanelLeft,
  PanelLeftClose,
  PlusCircle,
  Search,
  Settings,
  Shield,
  User,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';

interface SiteSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function SiteSidebar({ collapsed, onToggle }: SiteSidebarProps) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();

  const isActive = (to: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to));

  const linkClass = (to: string) =>
    `w-full flex items-center rounded-2xl text-sm font-semibold transition-all duration-200 ${
      collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'
    } ${
      isActive(to)
        ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-light)] text-white shadow-lg shadow-[rgb(var(--accent-rgb)/0.3)]'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
    }`;

  const items = [
    { to: '/', label: t('nav.home'), icon: Home, show: true },
    { to: '/search', label: t('nav.search'), icon: Search, show: true },
    { to: '/favorites', label: t('nav.favorites'), icon: Heart, show: isAuthenticated },
    { to: '/messages', label: t('nav.messages'), icon: MessageSquare, show: isAuthenticated },
    { to: '/notifications', label: t('nav.notifications'), icon: Bell, show: isAuthenticated },
    { to: '/rental-requests', label: t('nav.rentalRequests'), icon: ClipboardList, show: isAuthenticated },
    { to: '/create-listing', label: t('nav.createListing'), icon: PlusCircle, show: isAuthenticated },
    { to: '/profile', label: t('nav.profile'), icon: User, show: isAuthenticated },
    { to: '/settings', label: t('nav.settings'), icon: Settings, show: isAuthenticated },
    { to: '/admin', label: t('nav.adminDashboard'), icon: Shield, show: user?.role === 'ADMIN' },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto
        bg-white dark:bg-gradient-to-b dark:from-[#1A1A2E] dark:via-[#171730] dark:to-[#12122a]
        border-r border-gray-200 dark:border-white/10
        transition-[width] duration-300 ease-out ${collapsed ? 'w-[76px]' : 'w-64'}`}
    >
      <div className={collapsed ? 'p-3' : 'p-4'}>
        <div
          className={`relative overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] mb-5 ${
            collapsed ? 'p-2.5 flex flex-col items-center gap-3' : 'p-4 flex items-center gap-3'
          }`}
        >
          <div className="pointer-events-none absolute -top-10 -right-8 w-28 h-28 bg-[rgb(var(--accent-rgb)/0.2)] rounded-full blur-2xl" />
          {isAuthenticated ? (
            <Link to="/profile" className="relative w-10 h-10 rounded-full bg-gradient-to-br from-[#1A1A2E] to-[var(--accent)] text-white text-sm font-semibold flex items-center justify-center shrink-0 shadow-lg shadow-[rgb(var(--accent-rgb)/0.25)]">
              {(user?.display_name || user?.email || '?').charAt(0).toUpperCase()}
            </Link>
          ) : (
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[#ff9a66] flex items-center justify-center shrink-0 shadow-lg shadow-[rgb(var(--accent-rgb)/0.3)]">
              <User className="w-5 h-5 text-white" />
            </div>
          )}
          {!collapsed && (
            <div className="relative flex-1 min-w-0">
              <h2 className="font-extrabold text-[15px] text-gray-900 dark:text-white truncate">
                {isAuthenticated ? user?.display_name || user?.email : t('header.login')}
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                {isAuthenticated ? user?.email : t('nav.menuSubtitle')}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
            title={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
            className={`relative p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:text-[var(--accent)] hover:bg-orange-50 dark:hover:bg-white/10 transition ${
              collapsed ? '' : 'shrink-0'
            }`}
          >
            {collapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
        </div>

        <nav className="space-y-1.5">
          {!collapsed && (
            <p className="px-4 pb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500">
              {t('admin.menu')}
            </p>
          )}
          {isAuthenticated && (user?.role === 'OWNER' || user?.role === 'ADMIN') && (
            <Link
              to="/dashboard"
              title={collapsed ? t('nav.dashboard') : undefined}
              className={`w-full flex items-center rounded-2xl text-sm font-semibold transition-all duration-200 ${
                collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'
              } ${
                isActive('/dashboard')
                  ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-light)] text-white shadow-lg shadow-[rgb(var(--accent-rgb)/0.3)]'
                  : 'text-[var(--accent)] hover:bg-orange-50 dark:hover:bg-[rgb(var(--accent-rgb)/0.1)]'
              }`}
            >
              <span className="shrink-0">
                <LayoutDashboard className="w-5 h-5" />
              </span>
              {!collapsed && <span className="truncate">{t('nav.dashboard')}</span>}
            </Link>
          )}
          {items
            .filter((item) => item.show)
            .map((item) => (
              <Link key={item.to} to={item.to} title={collapsed ? item.label : undefined} className={linkClass(item.to)}>
                <span className="shrink-0">
                  <item.icon className="w-5 h-5" />
                </span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            ))}
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => logout()}
              title={collapsed ? t('common.signOut') : undefined}
              className={`w-full flex items-center rounded-2xl text-sm font-semibold text-red-500 hover:bg-red-500/10 transition-all duration-200 ${
                collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'
              }`}
            >
              <span className="shrink-0">
                <LogOut className="w-5 h-5" />
              </span>
              {!collapsed && <span>{t('common.signOut')}</span>}
            </button>
          )}
        </nav>

      </div>
    </aside>
  );
}
