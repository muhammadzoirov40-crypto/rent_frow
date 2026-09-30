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
          className="md:hidden p-2 -ml-1 rounded-full text-gray-500 hover:bg-orange-500/10 hover:text-[#FF6B35] dark:text-gray-400 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}

      <div className="relative shrink-0">
        <div className="w-11 h-11 rounded-full overflow-hidden bg-gradient-to-br from-[#FF6B35] to-[#ff9162] flex items-center justify-center text-white text-sm font-semibold ring-2 ring-[#FF6B35]/25 shadow-md shadow-orange-500/20">
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
          className="p-2.5 rounded-full text-gray-400 hover:text-[#FF6B35] hover:bg-orange-500/10 dark:hover:bg-orange-500/15 transition"
        >
          <Phone className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={onVideoCall}
          aria-label={t('messages.videoCall')}
          title={t('messages.videoCall')}
          className="p-2.5 rounded-full text-gray-400 hover:text-[#FF6B35] hover:bg-orange-500/10 dark:hover:bg-orange-500/15 transition"
        >
          <Video className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
