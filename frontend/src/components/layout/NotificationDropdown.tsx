import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Check, Info, AlertTriangle, MessageSquare } from 'lucide-react'

interface Notification {
  id: number
  type: 'info' | 'success' | 'warning' | 'message'
  title: string
  message: string
  time: string
  read: boolean
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 1,
    type: 'message',
    title: 'Новое сообщение',
    message: 'Андрей: "Здравствуйте! интересует ваш товар..."',
    time: '5 мин назад',
    read: false,
  },
  {
    id: 2,
    type: 'success',
    title: 'Заявка одобрена',
    message: 'Ваша заявка на аренду "iPhone 15 Pro" одобрена владельцем',
    time: '1 час назад',
    read: false,
  },
  {
    id: 3,
    type: 'warning',
    title: 'Срок аренды',
    message: 'Аренда "MacBook Pro" заканчивается завтра. Продлите или верните.',
    time: '3 часа назад',
    read: true,
  },
  {
    id: 4,
    type: 'info',
    title: 'Новый отклик',
    message: 'Марат откликнулся на ваше объявление "Квартира 2-комнатная"',
    time: '5 часов назад',
    read: true,
  },
]

function getIcon(type: Notification['type']) {
  switch (type) {
    case 'message':
      return <MessageSquare className="w-4 h-4" />
    case 'success':
      return <Check className="w-4 h-4" />
    case 'warning':
      return <AlertTriangle className="w-4 h-4" />
    case 'info':
      return <Info className="w-4 h-4" />
  }
}

function getIconBg(type: Notification['type']) {
  switch (type) {
    case 'message':
      return 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400'
    case 'success':
      return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
    case 'warning':
      return 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400'
    case 'info':
      return 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-slate-400'
  }
}

interface NotificationDropdownProps {
  isOpen: boolean
  onClose: () => void
}

export default function NotificationDropdown({ isOpen, onClose }: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS)
  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const markRead = (id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  if (!isOpen) return null

  return (
    <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-[#1A1A2E] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-gray-400 dark:text-slate-400" />
          <h3 className="text-sm font-semibold text-gray-900">Уведомления</h3>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 bg-brand-500 text-white text-[10px] font-bold rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-brand-500 hover:text-brand-600 font-medium transition"
          >
            Прочитать все
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-white/5">
        {notifications.map((n) => (
          <button
            key={n.id}
            onClick={() => markRead(n.id)}
            className={`w-full text-left px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/5 transition ${
              !n.read ? 'bg-brand-50/20 dark:bg-brand-500/10' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${getIconBg(n.type)}`}>
                {getIcon(n.type)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{n.title}</p>
                  {!n.read && <div className="w-1.5 h-1.5 bg-brand-500 rounded-full shrink-0" />}
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">{n.time}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Footer */}
      <Link
        to="/notifications"
        onClick={onClose}
        className="block px-5 py-3 text-center text-sm font-medium text-brand-500 hover:bg-brand-50 dark:hover:bg-white/5 transition border-t border-gray-100 dark:border-white/10"
      >
        Смотреть все уведомления
      </Link>
    </div>
  )
}
