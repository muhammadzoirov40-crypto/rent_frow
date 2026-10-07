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
import { useQuery } from '@tanstack/react-query';
import { notifications as notificationsApi } from '../../api/index';

interface SiteSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function SiteSidebar({ collapsed, onToggle }: SiteSidebarProps) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();

  const { data: unreadNotifData } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });
  const unreadNotifs = unreadNotifData?.count || 0;

  const isActive = (to: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to));

  const linkClass = (to: string) =>
    `w-full flex items-center rounded-xl text-sm font-semibold transition-all duration-200 ${
      collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'
    } ${
      isActive(to)
        ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] text-white shadow-lg shadow-[rgb(var(--accent-rgb)/0.35)] border border-emerald-400/30'
        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-transparent hover:bg-white/50 dark:hover:bg-white/[0.06] border border-transparent hover:border-gray-200/50 dark:hover:border-white/10 backdrop-blur-sm'
    }`;

  // Core navigation items as specified
  const coreNavItems = [
    { to: '/', label: t('nav.home'), icon: Home },
    { to: '/search', label: t('nav.search'), icon: Search },
    { to: '/favorites', label: t('nav.favorites'), icon: Heart },
    { to: '/messages', label: t('nav.messages'), icon: MessageSquare },
    { to: '/notifications', label: t('nav.notifications'), icon: Bell, badge: unreadNotifs },
    { to: '/rental-requests', label: t('nav.rentalRequests'), icon: ClipboardList },
  ];

  const userItems = [
    { to: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard, show: isAuthenticated },
    { to: '/profile', label: t('nav.profile'), icon: User, show: isAuthenticated },
    { to: '/settings', label: t('nav.settings'), icon: Settings, show: isAuthenticated },
    { to: '/admin', label: t('nav.adminDashboard'), icon: Shield, show: user?.role === 'ADMIN' },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 sticky top-[var(--header-h)] h-[calc(100vh_-_var(--header-h))] overflow-y-auto
        bg-white/50 dark:bg-[#0b0f19]/65 backdrop-blur-2xl
        border-r border-gray-200/60 dark:border-white/10
        transition-[width] duration-300 ease-out ${collapsed ? 'w-[76px]' : 'w-64'}`}
    >
      <div className={collapsed ? 'p-3 flex flex-col h-full' : 'p-4 flex flex-col h-full'}>
        {/* User Card */}
        <div
          className={`relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-white/10 bg-white/40 dark:bg-white/[0.04] backdrop-blur-md mb-4 ${
            collapsed ? 'p-2.5 flex flex-col items-center gap-3' : 'p-3.5 flex items-center gap-3'
          }`}
        >
          <div className="pointer-events-none absolute -top-10 -right-8 w-28 h-28 bg-[rgb(var(--accent-rgb)/0.2)] rounded-full blur-2xl" />
          {isAuthenticated ? (
            <Link
              to="/profile"
              className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#0b2447] to-[var(--accent)] text-white text-sm font-bold flex items-center justify-center shrink-0 shadow-md shadow-[rgb(var(--accent-rgb)/0.25)] border border-emerald-400/20"
            >
              {(user?.display_name || user?.email || '?').charAt(0).toUpperCase()}
            </Link>
          ) : (
            <Link
              to="/login"
              className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#0b2447] to-[var(--accent)] text-white flex items-center justify-center shrink-0 shadow-md shadow-[rgb(var(--accent-rgb)/0.25)] border border-emerald-400/20"
            >
              <User className="w-5 h-5 text-white" />
            </Link>
          )}
          {!collapsed && (
            <div className="relative flex-1 min-w-0">
              <h2 className="font-extrabold text-[14px] text-gray-900 dark:text-white truncate">
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
            className={`relative p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:text-[var(--accent)] hover:bg-[rgb(var(--accent-rgb)/0.1)] transition ${
              collapsed ? '' : 'shrink-0'
            }`}
          >
            {collapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
        </div>

        {/* Primary Action Button: Эълон додан */}
        <div className="mb-4">
          <Link
            to="/create-listing"
            title={collapsed ? t('nav.createListing') : undefined}
            className={`w-full flex items-center justify-center font-bold text-sm text-white rounded-xl shadow-lg transition-all duration-200 active:scale-[0.98] ${
              collapsed ? 'p-3' : 'gap-2.5 px-4 py-3'
            } bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] hover:from-[var(--accent-hover)] hover:to-[var(--accent-dark)] shadow-[rgb(var(--accent-rgb)/0.35)] border border-emerald-400/30 hover:-translate-y-0.5`}
          >
            <PlusCircle className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="truncate">{t('nav.createListing')}</span>}
          </Link>
        </div>

        {/* Navigation list */}
        <nav className="space-y-1.5 flex-1">
          {!collapsed && (
            <p className="px-4 pb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500">
              {t('admin.menu')}
            </p>
          )}

          {/* Core items */}
          {coreNavItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={linkClass(item.to)}
            >
              <span className="relative shrink-0">
                <item.icon className="w-5 h-5" />
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center shadow">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                ) : null}
              </span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          ))}

          {/* Secondary items for authenticated users */}
          {userItems.some((i) => i.show) && !collapsed && (
            <div className="pt-3 pb-1">
              <p className="px-4 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500">
                {t('nav.account')}
              </p>
            </div>
          )}

          {userItems
            .filter((item) => item.show)
            .map((item) => (
              <Link
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={linkClass(item.to)}
              >
                <span className="shrink-0">
                  <item.icon className="w-5 h-5" />
                </span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            ))}
        </nav>

        {/* Sign out */}
        {isAuthenticated && (
          <div className="pt-2 border-t border-gray-200/50 dark:border-white/10 mt-auto">
            <button
              type="button"
              onClick={() => logout()}
              title={collapsed ? t('common.signOut') : undefined}
              className={`w-full flex items-center rounded-xl text-sm font-semibold text-red-500 hover:bg-red-500/10 transition-all duration-200 ${
                collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'
              }`}
            >
              <span className="shrink-0">
                <LogOut className="w-5 h-5" />
              </span>
              {!collapsed && <span>{t('common.signOut')}</span>}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
