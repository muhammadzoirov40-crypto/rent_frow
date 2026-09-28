import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  ClipboardList,
  Heart,
  Home,
  LogOut,
  MessageSquare,
  Moon,
  PlusCircle,
  Search,
  Settings,
  Shield,
  Sun,
  User,
  X,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { useTheme } from '../../contexts/ThemeContext';

const LANGUAGES = [
  { code: 'tj', label: 'Тоҷикӣ', flag: '🇹🇯' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('language', code);
  };

  const isActive = (to: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to));

  const linkClass = (to: string) =>
    `w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
      isActive(to)
        ? 'bg-gradient-to-r from-[#FF6B35] to-[#ff8552] text-white shadow-lg shadow-orange-500/25'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
    }`;

  const iconClass = (to: string) =>
    isActive(to) ? 'text-white' : 'text-gray-400 dark:text-gray-500';

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
    <>
      <div
        className={`fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        aria-hidden={!open}
        className={`fixed inset-y-0 left-0 z-[61] w-[280px] max-w-[85vw] flex flex-col
          bg-white dark:bg-[#1a1d24] border-r border-gray-200 dark:border-white/10
          shadow-2xl transition-transform duration-300 ease-in-out md:hidden
          ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-white/10 shrink-0">
          <Link to="/" onClick={onClose} className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#ff9162] text-white flex items-center justify-center font-bold shadow-lg shadow-orange-500/25">
              R
            </span>
            <span className="font-bold text-lg tracking-tight text-gray-900 dark:text-white">RentHub</span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 pt-4 pb-2 shrink-0">
          {isAuthenticated ? (
            <Link to="/profile" onClick={onClose} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 hover:border-[#FF6B35]/40 transition">
              <span className="relative shrink-0">
                <span className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1A1A2E] to-[#FF6B35] text-white text-sm font-semibold flex items-center justify-center">
                  {(user?.display_name || user?.email || '?').charAt(0).toUpperCase()}
                </span>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#1a1d24]" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {user?.display_name || user?.email}
                </span>
                <span className="block text-xs text-gray-400 dark:text-gray-500 truncate">
                  {user?.email}
                </span>
              </span>
            </Link>
          ) : (
            <div className="space-y-2">
              <Link
                to="/login"
                onClick={onClose}
                className="block w-full text-center px-4 py-2.5 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition"
              >
                {t('header.login')}
              </Link>
              <Link
                to="/register"
                onClick={onClose}
                className="block w-full text-center px-4 py-2.5 bg-[#FF6B35] text-white text-sm font-semibold rounded-xl shadow-lg shadow-orange-500/25 hover:bg-[#e55a2b] transition"
              >
                {t('header.register')}
              </Link>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <p className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {t('dashboard.menu')}
          </p>
          {items
            .filter((item) => item.show)
            .map((item) => (
              <Link key={item.to} to={item.to} onClick={onClose} className={linkClass(item.to)}>
                <span className={iconClass(item.to)}>
                  <item.icon className="w-5 h-5" />
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            ))}
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => {
                logout();
                onClose();
              }}
              className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-500/10 transition"
            >
              <LogOut className="w-5 h-5" />
              <span>{t('common.signOut')}</span>
            </button>
          )}
        </nav>

        <div className="border-t border-gray-200 dark:border-white/10 p-3 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? t('theme.light') : t('theme.dark')}
              className="p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:text-[#FF6B35] hover:bg-gray-100 dark:hover:bg-white/10 transition"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-1">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => changeLanguage(lang.code)}
                  aria-label={lang.label}
                  className={`px-2 py-1.5 rounded-lg text-sm transition ${
                    i18n.language === lang.code
                      ? 'bg-[#FF6B35] text-white shadow shadow-orange-500/30'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
                  }`}
                >
                  {lang.flag}
                </button>
              ))}
            </div>

            <Link
              to="/create-listing"
              onClick={onClose}
              aria-label={t('nav.createListing')}
              className="p-2.5 rounded-xl bg-[#FF6B35] text-white hover:bg-[#e55a2b] shadow-lg shadow-orange-500/25 transition"
            >
              <PlusCircle className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
