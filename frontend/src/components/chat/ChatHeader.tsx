import { useTranslation } from 'react-i18next';
import { ArrowLeft, Eraser, Phone, Video } from 'lucide-react';

interface ChatHeaderProps {
  name: string;
  avatar?: string | null;
  online?: boolean;
  onBack?: () => void;
  onAudioCall: () => void;
  onVideoCall: () => void;
  onClear?: () => void;
}

export default function ChatHeader({ name, avatar, online, onBack, onAudioCall, onVideoCall, onClear }: ChatHeaderProps) {
  const { t } = useTranslation();

  const initials = name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white/95 dark:bg-[#1a1d24]/95 backdrop-blur border-b border-gray-200/70 dark:border-white/10">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label={t('common.back')}
          className="p-2 -ml-1 rounded-full text-gray-500 hover:bg-[rgb(var(--accent-rgb)/0.1)] hover:text-[var(--accent)] dark:text-gray-400 transition shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}

      <div className="relative shrink-0">
        <div className="w-11 h-11 rounded-full overflow-hidden bg-gradient-to-br from-[var(--accent)] to-[var(--accent-light)] flex items-center justify-center text-white text-sm font-semibold ring-2 ring-[rgb(var(--accent-rgb)/0.25)] shadow-md shadow-[rgb(var(--accent-rgb)/0.2)]">
          {avatar ? <img src={avatar} alt={name} className="w-full h-full object-cover" /> : initials || '?'}
        </div>
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#1a1d24] ${
            online ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-gray-900 dark:text-white truncate">{name}</p>
        {online && <p className="text-xs font-medium text-emerald-500">{t('messages.online')}</p>}
      </div>

      <div className="flex items-center gap-1.5">
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            aria-label={t('messages.clearChat')}
            title={t('messages.clearChat')}
            className="p-2.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition"
          >
            <Eraser className="w-5 h-5" />
          </button>
        )}
        <button
          type="button"
          onClick={onAudioCall}
          aria-label={t('messages.audioCall')}
          title={t('messages.audioCall')}
          className="p-2.5 rounded-full text-gray-400 hover:text-[var(--accent)] hover:bg-[rgb(var(--accent-rgb)/0.1)] dark:hover:bg-[rgb(var(--accent-rgb)/0.15)] transition"
        >
          <Phone className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={onVideoCall}
          aria-label={t('messages.videoCall')}
          title={t('messages.videoCall')}
          className="p-2.5 rounded-full text-gray-400 hover:text-[var(--accent)] hover:bg-[rgb(var(--accent-rgb)/0.1)] dark:hover:bg-[rgb(var(--accent-rgb)/0.15)] transition"
        >
          <Video className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
