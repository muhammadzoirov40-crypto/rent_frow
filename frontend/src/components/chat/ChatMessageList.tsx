import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileText, Loader2 } from 'lucide-react';
import type { Message } from '../../api';
import { formatBytes, parseContent, type Attachment } from './messageContent';
import VoicePlayer from './VoicePlayer';
import { parseDate } from '../../utils/dates';

interface ChatMessageListProps {
  messages: Message[];
  currentUserId?: number;
  loading?: boolean;
  onOpenImage: (src: string) => void;
}

function BubbleTime({ date, mine }: { date: string; mine: boolean }) {
  return (
    <span className={`text-[10px] ${mine ? 'text-white/60' : 'text-gray-400 dark:text-gray-500'}`}>
      {parseDate(date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
    </span>
  );
}

function FileCard({ parsed, mine }: { parsed: Attachment; mine: boolean }) {
  const { t } = useTranslation();
  if (parsed.kind === 'voice') {
    return <VoicePlayer url={parsed.url} duration={parsed.duration} mine={mine} />;
  }
  return (
    <a
      href={parsed.url}
      target="_blank"
      rel="noreferrer"
      download={parsed.name || 'file'}
      className={`flex items-center gap-3 min-w-[200px] max-w-[280px] px-3 py-2.5 rounded-xl border transition ${
        mine
          ? 'border-white/20 bg-white/10 hover:bg-white/15'
          : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10'
      }`}
    >
      <span className="w-9 h-9 rounded-lg bg-[#FF6B35]/15 text-[#FF6B35] flex items-center justify-center shrink-0">
        <FileText className="w-5 h-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">
          {parsed.name || t('messages.previewFile')}
        </span>
        <span className="block text-[11px] text-gray-400 dark:text-gray-500">{formatBytes(parsed.size)}</span>
      </span>
      <Download className={`w-4 h-4 shrink-0 ${mine ? 'text-white/60' : 'text-gray-400'}`} />
    </a>
  );
}

export default function ChatMessageList({ messages, currentUserId, loading, onOpenImage }: ChatMessageListProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    if (nearBottom || messages.length <= 1) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  if (loading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#121418]">
        <Loader2 className="w-6 h-6 text-[#FF6B35] animate-spin" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#121418] text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl mb-4">
          💬
        </div>
        <p className="text-gray-400 text-sm">{t('messages.noMessages')}</p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 bg-[#121418] chat-scroll">
      <div className="space-y-3">
        {messages.map((message) => {
          const mine = message.sender_id === currentUserId;
          const parsed = parseContent(message.content || '');

          return (
            <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] sm:max-w-[75%] ${
                  mine
                    ? 'rounded-2xl rounded-br-md bg-[#FF6B35] text-white'
                    : 'rounded-2xl rounded-bl-md bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white'
                } shadow-sm`}
              >
                {parsed.kind === 'text' && (
                  <div className="px-3.5 py-2.5">
                    <p className="text-sm whitespace-pre-wrap break-words">{parsed.text}</p>
                    <div className="flex justify-end mt-1">
                      <BubbleTime date={message.created_at} mine={mine} />
                    </div>
                  </div>
                )}

                {parsed.kind === 'image' && (
                  <button
                    type="button"
                    onClick={() => onOpenImage(parsed.url)}
                    className="block p-1.5 group focus:outline-none"
                  >
                    <img
                      src={parsed.url}
                      alt=""
                      loading="lazy"
                      className="rounded-xl max-w-[260px] max-h-[260px] object-cover group-hover:brightness-95 transition"
                    />
                    <div className="flex justify-end mt-1 px-0.5">
                      <BubbleTime date={message.created_at} mine={mine} />
                    </div>
                  </button>
                )}

                {(parsed.kind === 'file' || parsed.kind === 'voice') && (
                  <div className="p-2.5">
                    <FileCard parsed={parsed} mine={mine} />
                    <div className="flex justify-end mt-1 px-0.5">
                      <BubbleTime date={message.created_at} mine={mine} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
