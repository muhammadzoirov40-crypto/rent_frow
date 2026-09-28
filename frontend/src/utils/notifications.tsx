import React from 'react';
import {
  AlertTriangle,
  Bell,
  CalendarX,
  CheckCircle,
  EyeOff,
  FileText,
  Heart,
  MessageCircle,
  MessageSquare,
  Star,
  XCircle,
} from 'lucide-react';

export type NotificationData =
  | Record<string, string | number | boolean | null>
  | null
  | undefined;

export interface NotificationLike {
  id: number;
  type: string;
  title: string;
  message: string;
  data?: NotificationData;
  reference_id: number | null;
  reference_type: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationDetail {
  label: string;
  value: string;
  stars?: boolean;
}

export interface FormattedNotification {
  title: string;
  body: string | null;
  details: NotificationDetail[];
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

interface TypeMeta {
  titleKey: string;
  bodyKey?: string;
  detailKeys?: [string, string][];
}

const TYPE_META: Record<string, TypeMeta> = {
  new_message: {
    titleKey: 'notifications.types.new_message.title',
    detailKeys: [
      ['actor_name', 'notifications.labels.from'],
      ['message_preview', 'notifications.labels.message'],
    ],
  },
  rental_request: {
    titleKey: 'notifications.types.rental_request.title',
    detailKeys: [
      ['actor_name', 'notifications.labels.from'],
      ['listing_title', 'notifications.labels.listing'],
      ['request_message', 'notifications.labels.message'],
    ],
  },
  rental_accepted: {
    titleKey: 'notifications.types.rental_accepted.title',
    bodyKey: 'notifications.types.rental_accepted.body',
  },
  rental_rejected: {
    titleKey: 'notifications.types.rental_rejected.title',
    bodyKey: 'notifications.types.rental_rejected.body',
    detailKeys: [['reason', 'notifications.labels.reason']],
  },
  rental_cancelled: {
    titleKey: 'notifications.types.rental_cancelled.title',
    bodyKey: 'notifications.types.rental_cancelled.body',
    detailKeys: [['actor_name', 'notifications.labels.from']],
  },
  rental_completed: {
    titleKey: 'notifications.types.rental_completed.title',
    bodyKey: 'notifications.types.rental_completed.body',
  },
  new_favorite: {
    titleKey: 'notifications.types.new_favorite.title',
    detailKeys: [
      ['actor_name', 'notifications.labels.from'],
      ['listing_title', 'notifications.labels.listing'],
    ],
  },
  new_comment: {
    titleKey: 'notifications.types.new_comment.title',
    detailKeys: [
      ['actor_name', 'notifications.labels.user'],
      ['comment', 'notifications.labels.comment'],
    ],
  },
  new_review: {
    titleKey: 'notifications.types.new_review.title',
    detailKeys: [
      ['actor_name', 'notifications.labels.user'],
      ['rating', 'notifications.labels.rating'],
      ['comment', 'notifications.labels.comment'],
    ],
  },
  listing_approved: {
    titleKey: 'notifications.types.listing_approved.title',
    bodyKey: 'notifications.types.listing_approved.body',
  },
  listing_rejected: {
    titleKey: 'notifications.types.listing_rejected.title',
    bodyKey: 'notifications.types.listing_rejected.body',
    detailKeys: [['reason', 'notifications.labels.reason']],
  },
  listing_expired: {
    titleKey: 'notifications.types.listing_expired.title',
    bodyKey: 'notifications.types.listing_expired.body',
  },
  listing_deactivated: {
    titleKey: 'notifications.types.listing_deactivated.title',
    bodyKey: 'notifications.types.listing_deactivated.body',
    detailKeys: [['reason', 'notifications.labels.reason']],
  },
  listing_request_info: {
    titleKey: 'notifications.types.listing_request_info.title',
    bodyKey: 'notifications.types.listing_request_info.body',
  },
};

interface TypeStyle {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

export const NOTIFICATION_TYPE_STYLE: Record<string, TypeStyle> = {
  new_message: {
    icon: <MessageSquare className="w-5 h-5" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  rental_request: {
    icon: <FileText className="w-5 h-5" />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
  },
  rental_accepted: {
    icon: <CheckCircle className="w-5 h-5" />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
  },
  rental_rejected: {
    icon: <XCircle className="w-5 h-5" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  rental_cancelled: {
    icon: <XCircle className="w-5 h-5" />,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  rental_completed: {
    icon: <CheckCircle className="w-5 h-5" />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
  },
  new_favorite: {
    icon: <Heart className="w-5 h-5" />,
    color: 'text-rose-600',
    bgColor: 'bg-rose-100',
  },
  new_comment: {
    icon: <MessageCircle className="w-5 h-5" />,
    color: 'text-violet-600',
    bgColor: 'bg-violet-100',
  },
  new_review: {
    icon: <Star className="w-5 h-5" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
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
  listing_expired: {
    icon: <CalendarX className="w-5 h-5" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  listing_deactivated: {
    icon: <EyeOff className="w-5 h-5" />,
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
  },
  listing_request_info: {
    icon: <Bell className="w-5 h-5" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  default: {
    icon: <Bell className="w-5 h-5" />,
    color: 'text-[#FF6B35]',
    bgColor: 'bg-[#FF6B35]/10',
  },
};

export function getTypeStyle(type: string): TypeStyle {
  return NOTIFICATION_TYPE_STYLE[type] || NOTIFICATION_TYPE_STYLE.default;
}

function readString(data: NotificationData, key: string): string {
  if (!data) return '';
  const value = data[key];
  if (value === null || value === undefined) return '';
  return String(value);
}

function toStars(raw: string): string | null {
  const rating = Number(raw);
  if (!raw || Number.isNaN(rating) || rating < 1 || rating > 5) return null;
  return '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
}

export function formatNotification(
  t: Translate,
  notification: NotificationLike,
): FormattedNotification {
  const meta = TYPE_META[notification.type];
  const data = notification.data ?? null;
  const title = meta
    ? t(meta.titleKey, { defaultValue: notification.title })
    : notification.title;

  const details: NotificationDetail[] = [];
  if (meta?.detailKeys && data) {
    for (const [dataKey, labelKey] of meta.detailKeys) {
      const raw = readString(data, dataKey);
      if (!raw) continue;
      const label = t(labelKey);
      if (dataKey === 'rating') {
        const stars = toStars(raw);
        if (stars) details.push({ label, value: stars, stars: true });
        else details.push({ label, value: raw });
        continue;
      }
      if (dataKey === 'reason') {
        details.push({
          label,
          value: t(`notifications.reasons.${raw}`, { defaultValue: raw }),
        });
        continue;
      }
      details.push({ label, value: raw });
    }
  }

  let body: string | null = null;
  if (meta?.bodyKey && data) {
    body = t(meta.bodyKey, {
      listing: readString(data, 'listing_title'),
      defaultValue: notification.message,
    });
  } else if (details.length === 0) {
    body = notification.message;
  }

  return { title, body, details };
}

export function notificationSummary(
  t: Translate,
  notification: NotificationLike,
): string {
  const formatted = formatNotification(t, notification);
  if (formatted.body) return formatted.body;
  if (formatted.details.length > 0) {
    return formatted.details.map((d) => `${d.label}: ${d.value}`).join('  ·  ');
  }
  return notification.message;
}

export function getNotificationRoute(notification: NotificationLike): string | null {
  const data = notification.data ?? null;
  const dataListingId = data && typeof data.listing_id === 'number' ? data.listing_id : null;
  const listingId =
    dataListingId ??
    (notification.reference_type === 'listing' ? notification.reference_id : null);

  switch (notification.type) {
    case 'message':
    case 'new_message':
      return '/messages';
    case 'rental_request':
    case 'rental_accepted':
    case 'rental_rejected':
    case 'rental_cancelled':
    case 'rental_completed':
      return '/rental-requests';
    case 'new_favorite':
      return notification.reference_id ? `/listing/${notification.reference_id}` : '/search';
    case 'new_review':
      return listingId ? `/listing/${listingId}` : null;
    case 'new_comment':
      return null;
    case 'listing_approved':
    case 'listing_rejected':
    case 'listing_expired':
    case 'listing_request_info':
      return listingId ? `/listing/${listingId}` : null;
    case 'listing_deactivated':
      return '/profile';
    default:
      return null;
  }
}
