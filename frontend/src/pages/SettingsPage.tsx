import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  User,
  ShieldCheck,
  Bell,
  Lock,
  CreditCard,
  Store,
  Globe,
  Palette,
  LifeBuoy,
  FileText,
  AlertTriangle,
  ChevronLeft,
  Camera,
  Save,
  Loader2,
  LogOut,
  Mail,
  Phone,
  Star,
  Calendar,
  Check,
  X,
  Edit2,
  ChevronRight,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { auth, notifications, payments } from '../api';
import type { PaymentRecord } from '../api';
import useAuthStore from '../store/authStore';
import Toast from '../components/Toast';
import BackButton from '../components/ui/BackButton';
import { formatDate } from '../utils/dates';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
  { code: 'tj', label: 'Тоҷикӣ' },
];

const SECTIONS = [
  { id: 'personal', icon: User },
  { id: 'security', icon: ShieldCheck },
  { id: 'notifications', icon: Bell },
  { id: 'privacy', icon: Lock },
  { id: 'payments', icon: CreditCard },
  { id: 'rental', icon: Store },
  { id: 'language', icon: Globe },
  { id: 'appearance', icon: Palette },
  { id: 'help', icon: LifeBuoy },
  { id: 'legal', icon: FileText },
  { id: 'account', icon: AlertTriangle },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

const PAYMENT_STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  REFUNDED: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
};

const CARD =
  'bg-white dark:bg-white/[0.03] backdrop-blur-xl border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6 shadow-xl shadow-black/10';

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isDesktop;
}

function SectionHeading({ icon: Icon, title, desc }: { icon: any; title: string; desc?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#e85d2c] flex items-center justify-center shadow-lg shadow-[#FF6B35]/20">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
        {desc && <p className="text-gray-500 dark:text-slate-400 text-xs">{desc}</p>}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, updateUser, logout } = useAuthStore();
  const isDesktop = useIsDesktop();

  const [active, setActive] = useState<SectionId>('personal');
  const [mobileList, setMobileList] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ['me'],
    queryFn: auth.getMe,
  });

  const meUser = me || user;

  const { data: unreadData } = useQuery({
    queryKey: ['settings', 'unread-count'],
    queryFn: notifications.getUnreadCount,
    staleTime: 30_000,
  });

  const openSection: SectionId | null = isDesktop ? active : mobileList ? null : active;
  const paymentsEnabled = openSection === 'payments';

  const { data: paymentsData, isLoading: paymentsLoading, isError: paymentsError } = useQuery({
    queryKey: ['settings', 'payments'],
    queryFn: () => payments.listMine(0, 50),
    enabled: paymentsEnabled,
    retry: false,
  });

  const updateProfileMutation = useMutation({
    mutationFn: auth.updateProfile,
    onSuccess: (data) => {
      updateUser(data as any);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setEditing(false);
      setToast({ message: t('settings.personal.saved'), type: 'success' });
    },
    onError: () => setToast({ message: t('settings.personal.failed'), type: 'error' }),
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: auth.uploadAvatar,
    onSuccess: (data) => {
      updateUser({ avatar_url: data.avatar_url });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setToast({ message: t('settings.personal.avatarSaved'), type: 'success' });
    },
    onError: () => setToast({ message: t('settings.personal.failed'), type: 'error' }),
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadAvatarMutation.mutate(file);
    e.target.value = '';
  };

  const handleSaveName = () => {
    const name = editName.trim();
    if (!name) return;
    updateProfileMutation.mutate({ display_name: name });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setToast({ message: t('settings.languageChanged'), type: 'success' });
  };

  const openSectionById = (id: SectionId) => {
    setActive(id);
    setMobileList(false);
  };

  /* ---------------- section renderers ---------------- */

  const renderPersonal = () => {
    if (meLoading || !meUser) {
      return (
        <div className="flex min-h-[240px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
        </div>
      );
    }
    return (
      <div className={CARD} data-testid="section-personal">
        <SectionHeading icon={User} title={t('settings.nav.personal')} desc={t('settings.personal.desc')} />

        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="relative group w-fit">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="relative block"
              data-testid="avatar-btn"
              aria-label={t('settings.personal.changePhoto')}
            >
              {meUser.avatar_url ? (
                <img
                  src={meUser.avatar_url}
                  alt={meUser.display_name ?? ''}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-gray-200 dark:border-white/10 shadow-lg"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FF6B35] to-[#e85d2c] flex items-center justify-center shadow-lg">
                  <span className="text-white text-2xl font-bold">
                    {(meUser.display_name || meUser.email || 'U')[0].toUpperCase()}
                  </span>
                </div>
              )}
              <span className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                {uploadAvatarMutation.isPending ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-white" />
                )}
              </span>
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleAvatarChange}
              className="hidden"
              data-testid="avatar-input"
            />
          </div>

          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-xl font-bold text-gray-900 dark:text-white border-b-2 border-[#FF6B35] outline-none bg-transparent w-full max-w-sm"
                placeholder={t('settings.personal.fullName')}
                data-testid="edit-name-input"
              />
            ) : (
              <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate" data-testid="personal-name">
                {meUser.display_name || t('settings.personal.notSet')}
              </h3>
            )}
            <p className="text-sm text-gray-500 dark:text-slate-400 flex items-center gap-1.5 mt-1 truncate">
              <Mail className="w-3.5 h-3.5 shrink-0" />
              {meUser.email}
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
              <Phone className="w-3.5 h-3.5 shrink-0" />
              {meUser.phone || t('settings.personal.notSet')}
            </p>
          </div>

          <div className="flex gap-2 shrink-0">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={updateProfileMutation.isPending || !editName.trim()}
                  className="flex items-center gap-1.5 bg-[#FF6B35] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#e85d2c] transition disabled:opacity-50"
                  data-testid="save-profile-btn"
                >
                  {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {t('settings.personal.save')}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition"
                >
                  {t('settings.personal.cancel')}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditName(meUser.display_name || '');
                  setEditing(true);
                }}
                className="flex items-center gap-1.5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-white/5 transition"
                data-testid="edit-profile-btn"
              >
                <Edit2 className="w-4 h-4" />
                {t('settings.personal.editProfile')}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
          <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-4">
            <p className="text-xs text-gray-400 mb-1">{t('settings.personal.verification')}</p>
            <p
              className={`text-sm font-semibold flex items-center gap-1.5 ${meUser.is_verified ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}
              data-testid="verification-status"
            >
              {meUser.is_verified ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              {meUser.is_verified ? t('settings.personal.verified') : t('settings.personal.notVerified')}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-4">
            <p className="text-xs text-gray-400 mb-1">{t('settings.personal.memberSince')}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              {formatDate(meUser.created_at)}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-4">
            <p className="text-xs text-gray-400 mb-1">{t('settings.personal.rating')}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              {meUser.rating_count > 0
                ? `${(meUser.rating_sum / meUser.rating_count).toFixed(1)} (${meUser.rating_count})`
                : t('settings.personal.noRating')}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-4">
            <p className="text-xs text-gray-400 mb-1">{t('settings.personal.role')}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {t(`settings.personal.roles.${meUser.role}`)}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderSecurity = () => (
    <div className={CARD} data-testid="section-security">
      <SectionHeading icon={ShieldCheck} title={t('settings.nav.security')} desc={t('settings.security.desc')} />
      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{t('settings.security.loginMethod')}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">{t('settings.security.loginMethodDesc')}</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
            {t('settings.security.otp')}
          </span>
        </div>
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{t('settings.security.accountStatus')}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">{t('settings.security.accountStatusDesc')}</p>
          </div>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${meUser?.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400'}`}
            data-testid="account-status"
          >
            {meUser?.is_active ? t('settings.security.active') : t('settings.security.inactive')}
          </span>
        </div>
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{t('settings.personal.verification')}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">{t('settings.security.verificationDesc')}</p>
          </div>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${meUser?.is_verified ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' : 'bg-gray-200 text-gray-600 dark:bg-white/10 dark:text-gray-400'}`}
          >
            {meUser?.is_verified ? t('settings.personal.verified') : t('settings.personal.notVerified')}
          </span>
        </div>
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{t('settings.security.lastUpdated')}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">{t('settings.security.lastUpdatedDesc')}</p>
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-300 tabular-nums">
            {meUser?.updated_at ? formatDate(meUser.updated_at) : '—'}
          </span>
        </div>
      </div>
    </div>
  );

  const renderNotifications = () => {
    const unread = unreadData?.count ?? 0;
    return (
      <div className={CARD} data-testid="section-notifications">
        <SectionHeading icon={Bell} title={t('settings.nav.notifications')} desc={t('settings.notificationsDesc')} />
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${unread > 0 ? 'bg-[#FF6B35]' : 'bg-gray-300 dark:bg-slate-600'}`} />
            <span className="text-sm font-medium text-gray-900 dark:text-white">{t('settings.notifications.unread')}</span>
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums" data-testid="unread-count">
            {unread}
          </span>
        </div>
        <Link
          to="/notifications"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#FF6B35] text-white hover:bg-[#e85d2c] transition"
          data-testid="open-notifications"
        >
          <Bell className="w-4 h-4" />
          {t('settings.notifications.open')}
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    );
  };

  const renderPrivacy = () => (
    <div className={CARD} data-testid="section-privacy">
      <SectionHeading icon={Lock} title={t('settings.nav.privacy')} desc={t('settings.privacy.desc')} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-4 border border-gray-200 dark:border-white/10">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('settings.privacy.publicTitle')}</p>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-slate-400">
            <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />{t('settings.privacy.publicName')}</li>
            <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />{t('settings.privacy.publicAvatar')}</li>
            <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />{t('settings.privacy.publicListings')}</li>
            <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />{t('settings.privacy.publicRating')}</li>
          </ul>
        </div>
        <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-4 border border-gray-200 dark:border-white/10">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('settings.privacy.privateTitle')}</p>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-slate-400">
            <li className="flex items-center gap-2"><Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />{t('settings.privacy.privateBookings')}</li>
            <li className="flex items-center gap-2"><Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />{t('settings.privacy.privateMessages')}</li>
            <li className="flex items-center gap-2"><Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />{t('settings.privacy.privateEmail')}</li>
            <li className="flex items-center gap-2"><Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />{t('settings.privacy.privatePhone')}</li>
          </ul>
        </div>
      </div>
      <p className="text-xs text-gray-400 dark:text-slate-500 mt-4">{t('settings.privacy.hint')}</p>
    </div>
  );

  const renderPayments = () => (
    <div className={CARD} data-testid="section-payments">
      <SectionHeading icon={CreditCard} title={t('settings.nav.payments')} desc={t('settings.payments.desc')} />
      {paymentsLoading ? (
        <div className="flex min-h-[180px] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-[#FF6B35]" />
        </div>
      ) : paymentsError ? (
        <div className="text-center py-10">
          <CreditCard className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{t('settings.payments.customerOnly')}</p>
          <p className="text-xs text-gray-400 mt-1">{t('settings.payments.customerOnlyHint')}</p>
        </div>
      ) : !paymentsData || paymentsData.items.length === 0 ? (
        <div className="text-center py-10">
          <CreditCard className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{t('settings.payments.empty')}</p>
          <p className="text-xs text-gray-400 mt-1">{t('settings.payments.emptyHint')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="hidden sm:flex items-center gap-4 px-3 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            <span className="flex-1">{t('settings.payments.typeLabel')}</span>
            <span className="w-24">{t('settings.payments.statusLabel')}</span>
            <span className="w-24 text-right">{t('settings.payments.amount')}</span>
            <span className="w-28 text-right">{t('settings.payments.date')}</span>
          </div>
          {paymentsData.items.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center gap-3 px-3 py-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 text-sm"
              data-testid="payment-row"
            >
              <span className="flex-1 min-w-[140px] text-gray-900 dark:text-white font-medium">
                {t(`settings.payments.types.${p.payment_type}`)}
                <span className="block text-xs text-gray-400">#{p.booking_id}</span>
              </span>
              <span className={`w-24 text-xs font-semibold px-2 py-1 rounded-full text-center ${PAYMENT_STATUS_STYLE[p.status] || 'bg-gray-100 text-gray-600'}`}>
                {t(`settings.payments.statuses.${p.status}`)}
              </span>
              <span className="w-24 text-right font-bold text-[#FF6B35] tabular-nums">
                {Math.round(p.amount).toLocaleString('ru-RU')} {t('common.somoni')}
              </span>
              <span className="w-28 text-right text-xs text-gray-400 tabular-nums">{formatDate(p.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderRental = () => {
    const links: { to: string; label: string; icon: any }[] = [
      { to: '/dashboard', label: t('settings.rental.dashboard'), icon: Store },
      { to: '/create-listing', label: t('settings.rental.createListing'), icon: Edit2 },
      { to: '/rental-requests', label: t('settings.rental.requests'), icon: Bell },
      { to: '/messages', label: t('settings.rental.messages'), icon: ChevronRight },
    ];
    return (
      <div className={CARD} data-testid="section-rental">
        <SectionHeading icon={Store} title={t('settings.nav.rental')} desc={t('settings.rental.desc')} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 hover:border-[#FF6B35]/40 transition text-sm font-medium text-gray-900 dark:text-white"
            >
              <l.icon className="w-4 h-4 text-[#FF6B35]" />
              {l.label}
              <ChevronRight className="w-4 h-4 ml-auto text-gray-400" />
            </Link>
          ))}
        </div>
      </div>
    );
  };

  const renderLanguage = () => (
    <div className={CARD} data-testid="section-language">
      <SectionHeading icon={Globe} title={t('settings.language')} desc={t('settings.languageDesc')} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            type="button"
            onClick={() => changeLanguage(lang.code)}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all border ${
              i18n.language === lang.code
                ? 'bg-[#FF6B35] text-white border-[#FF6B35] shadow-lg shadow-[#FF6B35]/25'
                : 'bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-white/10 hover:border-[#FF6B35]/40'
            }`}
            data-testid={`lang-${lang.code}`}
          >
            {lang.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderAppearance = () => (
    <div className={CARD} data-testid="section-appearance">
      <SectionHeading icon={Palette} title={t('settings.appearance')} desc={t('settings.appearanceDesc')} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => { if (theme !== 'light') toggleTheme(); }}
          className={`flex items-center justify-center gap-3 px-4 py-4 rounded-xl text-sm font-semibold transition-all border ${
            theme === 'light'
              ? 'bg-[#FF6B35] text-white border-[#FF6B35] shadow-lg shadow-[#FF6B35]/25'
              : 'bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-white/10 hover:border-[#FF6B35]/40'
          }`}
          data-testid="theme-light"
        >
          {t('theme.light')}
        </button>
        <button
          type="button"
          onClick={() => { if (theme !== 'dark') toggleTheme(); }}
          className={`flex items-center justify-center gap-3 px-4 py-4 rounded-xl text-sm font-semibold transition-all border ${
            theme === 'dark'
              ? 'bg-[#FF6B35] text-white border-[#FF6B35] shadow-lg shadow-[#FF6B35]/25'
              : 'bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-white/10 hover:border-[#FF6B35]/40'
          }`}
          data-testid="theme-dark"
        >
          {t('theme.dark')}
        </button>
      </div>
    </div>
  );

  const renderHelp = () => {
    const faq = [
      { q: t('settings.help.q1'), a: t('settings.help.a1') },
      { q: t('settings.help.q2'), a: t('settings.help.a2') },
      { q: t('settings.help.q3'), a: t('settings.help.a3') },
    ];
    return (
      <div className={CARD} data-testid="section-help">
        <SectionHeading icon={LifeBuoy} title={t('settings.nav.help')} desc={t('settings.help.desc')} />
        <div className="space-y-3">
          {faq.map((item) => (
            <div key={item.q} className="rounded-xl bg-gray-50 dark:bg-white/5 p-4 border border-gray-200 dark:border-white/10">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{item.q}</p>
              <p className="text-sm text-gray-600 dark:text-slate-400">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderLegal = () => (
    <div className={CARD} data-testid="section-legal">
      <SectionHeading icon={FileText} title={t('settings.nav.legal')} desc={t('settings.legal.desc')} />
      <div className="space-y-4">
        <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-4 border border-gray-200 dark:border-white/10">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{t('settings.legal.termsTitle')}</p>
          <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">{t('settings.legal.termsBody')}</p>
        </div>
        <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-4 border border-gray-200 dark:border-white/10">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{t('settings.legal.privacyTitle')}</p>
          <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">{t('settings.legal.privacyBody')}</p>
        </div>
      </div>
    </div>
  );

  const renderAccount = () => (
    <div className={CARD} data-testid="section-account">
      <SectionHeading icon={AlertTriangle} title={t('settings.nav.account')} desc={t('settings.account.desc')} />
      <div className="space-y-2 mb-5">
        <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-white/5 rounded-xl">
          <span className="text-sm text-gray-500 dark:text-slate-400">{t('settings.account.email')}</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate ml-3">{meUser?.email}</span>
        </div>
        <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-white/5 rounded-xl">
          <span className="text-sm text-gray-500 dark:text-slate-400">{t('settings.account.role')}</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {meUser ? t(`settings.personal.roles.${meUser.role}`) : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-white/5 rounded-xl">
          <span className="text-sm text-gray-500 dark:text-slate-400">{t('settings.account.listings')}</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white tabular-nums">{meUser?.listing_count ?? 0}</span>
        </div>
        <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-white/5 rounded-xl">
          <span className="text-sm text-gray-500 dark:text-slate-400">{t('settings.account.memberSince')}</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white tabular-nums">
            {meUser?.created_at ? formatDate(meUser.created_at) : '—'}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 border-2 border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-50 dark:hover:bg-red-500/10 transition"
        data-testid="sign-out-btn"
      >
        <LogOut className="w-4 h-4" />
        {t('settings.account.signOut')}
      </button>
    </div>
  );

  const renderSection = (id: SectionId) => {
    switch (id) {
      case 'personal': return renderPersonal();
      case 'security': return renderSecurity();
      case 'notifications': return renderNotifications();
      case 'privacy': return renderPrivacy();
      case 'payments': return renderPayments();
      case 'rental': return renderRental();
      case 'language': return renderLanguage();
      case 'appearance': return renderAppearance();
      case 'help': return renderHelp();
      case 'legal': return renderLegal();
      case 'account': return renderAccount();
    }
  };

  /* ---------------- layout ---------------- */

  const header = (
    <div className="mb-6">
      <BackButton className="mb-4" />
      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
        {t('settings.title')}
      </h1>
      <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm">{t('settings.subtitle')}</p>
    </div>
  );

  const navButton = (id: SectionId, icon: any, label: string, mobile = false) => {
    const isActive = active === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => (mobile ? openSectionById(id) : setActive(id))}
        className={`w-full flex items-center gap-3 ${mobile ? 'px-4 py-3.5' : 'px-4 py-2.5'} rounded-xl text-sm font-semibold transition-all ${
          isActive && !mobile
            ? 'bg-[#FF6B35] text-white shadow-lg shadow-[#FF6B35]/25'
            : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/[0.06]'
        }`}
        data-nav={id}
        data-testid={`nav-${id}`}
      >
        {icon && <icon className="w-4 h-4 shrink-0" />}
        <span className="truncate">{label}</span>
      </button>
    );
  };

  const content = (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {isDesktop ? (
        <div className="flex gap-6 items-start" data-testid="settings-desktop">
          <nav className="w-64 shrink-0 sticky top-6 space-y-1 p-3 rounded-2xl bg-white dark:bg-white/[0.03] backdrop-blur-xl border border-gray-200 dark:border-white/[0.06] shadow-xl shadow-black/10" data-testid="settings-nav">
            {SECTIONS.map((s) => navButton(s.id, s.icon, t(`settings.nav.${s.id}`)))}
          </nav>
          <div className="flex-1 min-w-0" data-testid="settings-panel">{renderSection(active)}</div>
        </div>
      ) : mobileList ? (
        <div className="space-y-1 p-3 rounded-2xl bg-white dark:bg-white/[0.03] backdrop-blur-xl border border-gray-200 dark:border-white/[0.06] shadow-xl shadow-black/10" data-testid="settings-mobile-list">
          {SECTIONS.map((s) => navButton(s.id, s.icon, t(`settings.nav.${s.id}`), true))}
        </div>
      ) : (
        <div data-testid="settings-mobile-detail">
          <button
            type="button"
            onClick={() => setMobileList(true)}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 dark:text-slate-300 hover:text-[#FF6B35] transition mb-4 px-2 py-1.5 -ml-2 rounded-lg"
            data-testid="settings-back"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('settings.backToList')}
          </button>
          {renderSection(active)}
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a1a] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {header}
        {content}
      </div>
    </div>
  );
}
