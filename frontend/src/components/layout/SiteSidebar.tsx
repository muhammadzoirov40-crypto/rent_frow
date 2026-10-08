import { useState } from 'react';
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
  MessageSquareQuote,
  PanelLeft,
  PanelLeftClose,
  Search,
  Settings,
  Shield,
  User,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import FeedbackDialog from '../FeedbackDialog';
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
  const [feedbackOpen, setFeedbackOpen] = useState(false);

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
        ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] text-white shadow-lg shadow-[rgb(var(--accent-rgb)/0.35)] border border-[rgb(var(--accent-rgb)/0.35)]'
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
    <>
    <aside
      className={`hidden md:flex flex-col shrink-0 sticky top-[var(--header-h)] h-[calc(100vh_-_var(--header-h))] overflow-y-auto
        bg-white/50 dark:bg-[#0b0f19]/65 backdrop-blur-2xl
        border-r border-gray-200/60 dark:border-white/10
        transition-[width] duration-300 ease-out ${collapsed ? 'w-[76px]' : 'w-64'}`}
    >
      <div className={collapsed ? 'p-3 flex flex-col h-full' : 'p-4 flex flex-col h-full'}>
        {/* Sidebar toggle — kept alive from the removed user card */}
        <div className={`mb-1 flex ${collapsed ? 'justify-center' : 'justify-end'}`}>
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
            title={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
            className="rounded-lg p-1.5 text-gray-500 dark:text-gray-400 hover:text-[var(--accent)] hover:bg-[rgb(var(--accent-rgb)/0.14)] transition-colors"
          >
            {collapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
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

          {/* Feedback — sent as a pending post, moderated in Admin → Постҳо */}
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => setFeedbackOpen(true)}
              title={collapsed ? t('feedback.title') : undefined}
              className={`w-full flex items-center rounded-xl text-sm font-semibold transition-all duration-200 ${
                collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'
              } text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-transparent hover:bg-white/50 dark:hover:bg-white/[0.06] border border-transparent hover:border-gray-200/50 dark:hover:border-white/10 backdrop-blur-sm`}
            >
              <span className="shrink-0">
                <MessageSquareQuote className="w-5 h-5" />
              </span>
              {!collapsed && <span className="truncate">{t('feedback.title')}</span>}
            </button>
          )}
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
      <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  );
}
