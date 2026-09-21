import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, MessageSquare, Star, CheckCircle, AlertTriangle, Info, CheckCheck, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { notifications } from '../api';
import type { Notification } from '../api';

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return 'только что';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} мин. назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч. назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} дн. назад`;
  return new Date(dateStr).toLocaleDateString('ru-RU');
}

const typeConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  message: {
    icon: <MessageSquare className="w-5 h-5" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  review: {
    icon: <Star className="w-5 h-5" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  rental_request: {
    icon: <CheckCircle className="w-5 h-5" />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
  },
  listing_approved: {
    icon: <CheckCircle className="w-5 h-5" />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
  },
  listing_rejected: {
    icon: <AlertTriangle className="w-5 h-5" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  system: {
    icon: <Info className="w-5 h-5" />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
  },
  default: {
    icon: <Bell className="w-5 h-5" />,
    color: 'text-[#FF6B35]',
    bgColor: 'bg-[#FF6B35]/10',
  },
};

function getNotificationRoute(notif: Notification): string | null {
  switch (notif.type) {
    case 'message':
      return '/messages';
    case 'review':
    case 'listing_approved':
    case 'listing_rejected':
      return '/favorites';
    case 'rental_request':
      return '/rental-requests';
    default:
      return null;
  }
}

export default function NotificationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: allNotifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: notifications.getNotifications,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notifications.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: notifications.markAllRead,
    onSuccess: () => {
      toast.success(t('notifications.markAllReadSuccess'));
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
    onError: () => {
      toast.error(t('notifications.failedToUpdate'));
    },
  });

  const handleClick = (notif: Notification) => {
    if (!notif.is_read) {
      markReadMutation.mutate(notif.id);
    }
    const route = getNotificationRoute(notif);
    if (route) {
      navigate(route);
    }
  };

  const unreadCount = allNotifications.filter((n) => !n.is_read).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="w-10 h-10 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-[#0a0a1a] py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('notifications.title')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {unreadCount > 0 ? t('notifications.unread', { count: unreadCount }) : t('notifications.allRead')}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              className="flex items-center gap-2 text-sm font-semibold text-[#FF6B35] hover:text-[#e55a2b] bg-[#FF6B35]/10 hover:bg-[#FF6B35]/15 px-4 py-2.5 rounded-xl transition disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4" />
              {t('notifications.markAllRead')}
            </button>
          )}
        </div>

        {allNotifications.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-200 dark:border-white/10 p-8">
            <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{t('notifications.empty')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('notifications.emptyHint')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {allNotifications.map((notif) => {
              const config = typeConfig[notif.type] || typeConfig.default;
              return (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`w-full text-left bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-200 dark:border-white/10 p-4 hover:shadow-md transition flex items-start gap-4 ${
                    !notif.is_read ? 'border-l-4 border-l-[#FF6B35] bg-[#FF6B35]/[0.02]' : ''
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl ${config.bgColor} flex items-center justify-center flex-shrink-0 ${config.color}`}>
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white leading-snug">
                        {notif.title}
                      </p>
                      {!notif.is_read && (
                        <div className="w-2.5 h-2.5 bg-[#FF6B35] rounded-full flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                      {notif.message}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeAgo(notif.created_at)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
