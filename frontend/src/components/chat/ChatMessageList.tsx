import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CornerUpLeft,
  Download,
  FileText,
  Forward,
  Languages,
  Loader2,
  MoreVertical,
  PenLine,
  Pin,
  PinOff,
  Copy,
  Trash2,
} from 'lucide-react';
import type { Message } from '../../api';
import { formatBytes, parseContent, type Attachment } from './messageContent';
import VoicePlayer from './VoicePlayer';
import { parseDate } from '../../utils/dates';

interface ChatMessageListProps {
  messages: Message[];
  currentUserId?: number;
  loading?: boolean;
  onOpenImage: (src: string) => void;
  onDelete?: (messageId: number) => void;
  canDeleteOthers?: boolean;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onForward?: (message: Message) => void;
  onReact?: (messageId: number, emoji: string) => void;
  onPin?: (message: Message, pinned: boolean) => void;
  onTranslate?: (message: Message) => void;
  translation?: { id: number; text: string } | null;
  translatingId?: number | null;
}

const QUICK_REACTIONS = ['👍', '🔥', '❤️', '😂', '👀', '👎'];

interface MenuState {
  msg: Message;
  x: number;
  y: number;
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

function ReplyQuote({ message, mine }: { message: Message; mine: boolean }) {
  const { t } = useTranslation();
  if (!message.reply_to_id) return null;
  return (
    <div
      className={`mb-1.5 flex items-stretch gap-2 rounded-lg px-2 py-1 text-xs border-l-2 ${
        mine
          ? 'bg-white/15 border-white/70 text-white/90'
          : 'bg-black/5 dark:bg-white/10 border-[#FF6B35] text-gray-700 dark:text-gray-200'
      }`}
    >
      <div className="min-w-0">
        <p className="font-semibold truncate text-[11px]">
          {message.reply_to_sender_name || t('messages.user')}
        </p>
        <p className="truncate opacity-80">{message.reply_to_content}</p>
      </div>
    </div>
  );
}

function ReactionPills({
  message,
  currentUserId,
  onReact,
  mine,
}: {
  message: Message;
  currentUserId?: number;
  onReact?: (messageId: number, emoji: string) => void;
  mine: boolean;
}) {
  const entries = Object.entries(message.reactions || {}).filter(([, users]) => users.length > 0);
  if (entries.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-1 mt-1 ${mine ? 'justify-end' : 'justify-start'}`}>
      {entries.map(([emoji, users]) => {
        const mineHas = currentUserId != null && users.includes(currentUserId);
        return (
          <button
            key={emoji}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReact?.(message.id, emoji);
            }}
            className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] border transition ${
              mineHas
                ? 'bg-[#FF6B35]/20 border-[#FF6B35]/50 text-[#FF6B35]'
                : mine
                  ? 'bg-white/15 border-white/25 text-white/90 hover:bg-white/25'
                  : 'bg-gray-100 dark:bg-white/10 border-gray-200 dark:border-white/15 text-gray-700 dark:text-gray-200 hover:border-[#FF6B35]/50'
            }`}
            title={users.length > 1 ? String(users.length) : undefined}
          >
            <span className="text-xs leading-none">{emoji}</span>
            {users.length > 1 && <span>{users.length}</span>}
          </button>
        );
      })}
    </div>
  );
}

export default function ChatMessageList({
  messages,
  currentUserId,
  loading,
  onOpenImage,
  onDelete,
  canDeleteOthers,
  onReply,
  onEdit,
  onForward,
  onReact,
  onPin,
  onTranslate,
  translation,
  translatingId,
}: ChatMessageListProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const pressTimer = useRef<number | undefined>(undefined);
  const [menu, setMenu] = useState<MenuState | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    if (nearBottom || messages.length <= 1) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [menu]);

  const openMenu = (msg: Message, clientX: number, clientY: number) => {
    const W = 236;
    const H = 430;
    const x = Math.max(8, Math.min(clientX, window.innerWidth - W - 8));
    const y = Math.max(8, Math.min(clientY, window.innerHeight - H - 8));
    setMenu({ msg, x, y });
  };

  const closeMenu = () => setMenu(null);

  const startPress = (msg: Message, x: number, y: number) => {
    window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => openMenu(msg, x, y), 450);
  };
  const cancelPress = () => window.clearTimeout(pressTimer.current);

  if (loading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-[#121418]">
        <Loader2 className="w-6 h-6 text-[#FF6B35] animate-spin" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-[#121418] text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 border border-gray-200 dark:bg-white/5 dark:border-white/10 flex items-center justify-center text-2xl mb-4">
          💬
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">{t('messages.noMessages')}</p>
      </div>
    );
  }

  const menuMsg = menu?.msg ?? null;
  const menuMine = menuMsg ? menuMsg.sender_id === currentUserId : false;
  const menuParsed = menuMsg ? parseContent(menuMsg.content || '') : null;
  const canEdit = Boolean(menuMine && menuParsed && menuParsed.kind === 'text');

  return (
    <>
      <div
        ref={scrollRef}
        onClick={() => setMenu(null)}
        className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 bg-white dark:bg-[#121418] chat-scroll"
      >
        <div className="space-y-3">
          {messages.map((message) => {
            const mine = message.sender_id === currentUserId;
            const parsed = parseContent(message.content || '');
            const showTranslation = translation && translation.id === message.id;

            return (
              <div
                key={message.id}
                onClick={(e) => e.stopPropagation()}
                onContextMenu={(e) => {
                  if (message.id <= 0) return;
                  e.preventDefault();
                  openMenu(message, e.clientX, e.clientY);
                }}
                onTouchStart={() => {
                  if (message.id <= 0) return;
                  startPress(message, window.innerWidth / 2, window.innerHeight / 2);
                }}
                onTouchMove={cancelPress}
                onTouchEnd={cancelPress}
                className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
              >
                <div className="relative max-w-[85%] sm:max-w-[75%]">
                  {message.id > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        openMenu(message, rect.left - 200, rect.top);
                      }}
                      title={t('common.more')}
                      aria-label={t('common.more')}
                      className={`absolute top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full flex items-center justify-center bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 text-gray-400 hover:text-[#FF6B35] hover:border-[#FF6B35]/50 transition ${
                        menu?.msg.id === message.id ? 'opacity-100' : 'opacity-0'
                      } shadow-sm ${mine ? '-left-9' : '-right-9'}`}
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div
                    className={`${
                      mine
                        ? 'rounded-2xl rounded-br-md bg-[#FF6B35] text-white'
                        : 'rounded-2xl rounded-bl-md bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white'
                    } shadow-sm`}
                  >
                    {message.forwarded_from_name && (
                      <div
                        className={`px-3.5 pt-2 text-[11px] font-medium flex items-center gap-1 ${
                          mine ? 'text-white/85' : 'text-[#FF6B35]'
                        }`}
                      >
                        <Forward className="w-3 h-3" />
                        {t('messages.forwardedFrom')}: {message.forwarded_from_name}
                      </div>
                    )}

                    {parsed.kind === 'text' && (
                      <div className="px-3.5 py-2.5">
                        <ReplyQuote message={message} mine={mine} />
                        <p className="text-sm whitespace-pre-wrap break-words">{parsed.text}</p>
                        <div className="flex justify-end items-center gap-1 mt-1">
                          {message.pinned && <Pin className="w-3 h-3 opacity-70" />}
                          {message.edited_at && (
                            <span className={`text-[10px] ${mine ? 'text-white/60' : 'text-gray-400 dark:text-gray-500'}`}>
                              {t('messages.edited')}
                            </span>
                          )}
                          <BubbleTime date={message.created_at} mine={mine} />
                        </div>
                      </div>
                    )}

                    {parsed.kind === 'image' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenImage(parsed.url);
                        }}
                        className="block p-1.5 group focus:outline-none"
                      >
                        <img
                          src={parsed.url}
                          alt=""
                          loading="lazy"
                          className="rounded-xl max-w-[260px] max-h-[260px] object-cover group-hover:brightness-95 transition"
                        />
                        <div className="px-0.5">
                          <ReplyQuote message={message} mine={mine} />
                        </div>
                        <div className="flex justify-end items-center gap-1 mt-1 px-0.5">
                          {message.pinned && <Pin className="w-3 h-3 opacity-70" />}
                          <BubbleTime date={message.created_at} mine={mine} />
                        </div>
                      </button>
                    )}

                    {(parsed.kind === 'file' || parsed.kind === 'voice') && (
                      <div className="p-2.5">
                        <ReplyQuote message={message} mine={mine} />
                        <FileCard parsed={parsed} mine={mine} />
                        <div className="flex justify-end items-center gap-1 mt-1 px-0.5">
                          {message.pinned && <Pin className="w-3 h-3 opacity-70" />}
                          <BubbleTime date={message.created_at} mine={mine} />
                        </div>
                      </div>
                    )}
                  </div>

                  <ReactionPills
                    message={message}
                    currentUserId={currentUserId}
                    onReact={onReact}
                    mine={mine}
                  />

                  {showTranslation && (
                    <div
                      className={`mt-1 rounded-xl px-3 py-2 text-xs border bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 ${
                        mine ? 'ml-auto' : ''
                      }`}
                    >
                      <span className="font-semibold text-[#FF6B35] mr-1">
                        {translatingId === message.id ? '…' : t('messages.translation')}
                      </span>
                      {translation?.text}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {menu && menuMsg && (
        <div
          className="fixed inset-0 z-40"
          onClick={closeMenu}
          onContextMenu={(e) => {
            e.preventDefault();
            closeMenu();
          }}
        >
          <div
            className="fixed z-50 w-56 rounded-2xl bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden py-1.5"
            style={{ left: menu.x, top: menu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 pb-2 mb-1 border-b border-gray-100 dark:border-white/10">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onReact?.(menuMsg.id, emoji);
                    closeMenu();
                  }}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-lg leading-none hover:bg-gray-100 dark:hover:bg-white/10 transition"
                >
                  {emoji}
                </button>
              ))}
            </div>

            <MenuButton
              icon={<CornerUpLeft className="w-4 h-4" />}
              label={t('messages.reply')}
              onClick={() => {
                onReply?.(menuMsg);
                closeMenu();
              }}
            />
            {canEdit && (
              <MenuButton
                icon={<PenLine className="w-4 h-4" />}
                label={t('messages.edit')}
                onClick={() => {
                  onEdit?.(menuMsg);
                  closeMenu();
                }}
              />
            )}
            <MenuButton
              icon={
                menuMsg.pinned ? (
                  <PinOff className="w-4 h-4" />
                ) : (
                  <Pin className="w-4 h-4" />
                )
              }
              label={menuMsg.pinned ? t('messages.unpin') : t('messages.pin')}
              onClick={() => {
                onPin?.(menuMsg, !menuMsg.pinned);
                closeMenu();
              }}
            />
            <MenuButton
              icon={<Forward className="w-4 h-4" />}
              label={t('messages.forward')}
              onClick={() => {
                onForward?.(menuMsg);
                closeMenu();
              }}
            />
            {(menuMine || canDeleteOthers) && (
              <MenuButton
                icon={<Trash2 className="w-4 h-4" />}
                label={t('common.delete')}
                danger
                onClick={() => {
                  onDelete?.(menuMsg.id);
                  closeMenu();
                }}
              />
            )}
            <MenuButton
              icon={<Copy className="w-4 h-4" />}
              label={t('messages.copy')}
              onClick={() => {
                const text = menuParsed && menuParsed.kind === 'text' ? menuParsed.text : menuMsg.content;
                navigator.clipboard?.writeText(text).then(
                  () => {
                    import('react-hot-toast').then((m) => m.default.success(t('messages.copied')));
                  },
                  () => undefined,
                );
                closeMenu();
              }}
            />
            {menuParsed && menuParsed.kind === 'text' && (
              <MenuButton
                icon={<Languages className="w-4 h-4" />}
                label={t('messages.translate')}
                loading={translatingId === menuMsg.id}
                onClick={() => {
                  onTranslate?.(menuMsg);
                  closeMenu();
                }}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

function MenuButton({
  icon,
  label,
  onClick,
  danger,
  loading,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition ${
        danger
          ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10'
          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10'
      }`}
    >
      <span className={`shrink-0 ${danger ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>{icon}</span>
      <span className="truncate">{label}</span>
      {loading && <Loader2 className="w-3.5 h-3.5 ml-auto animate-spin text-[#FF6B35]" />}
    </button>
  );
}
