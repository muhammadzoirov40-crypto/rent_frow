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
import { formatBytes, parseContent, isSystemMessage, stripSystemPrefix, type Attachment } from './messageContent';
import VoicePlayer from './VoicePlayer';
import { parseDate, formatDate } from '../../utils/dates';

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
}

const WALLPAPER = {
  backgroundImage:
    'radial-gradient(circle at 1px 1px, rgba(255,107,53,0.07) 1px, transparent 0)',
  backgroundSize: '26px 26px',
};

function dayKey(dateStr: string): string {
  const d = parseDate(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function Avatar({ name }: { name?: string | null }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent)] to-[#1A1A2E] flex items-center justify-center text-white text-[11px] font-bold shrink-0 shadow-sm">
      {initial}
    </div>
  );
}

function BubbleTime({ date, mine }: { date: string; mine: boolean }) {
  return (
    <span className={`text-[10px] leading-none ${mine ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'}`}>
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
          ? 'border-white/25 bg-white/15 hover:bg-white/20'
          : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10'
      }`}
    >
      <span className="w-9 h-9 rounded-lg bg-[rgb(var(--accent-rgb)/0.15)] text-[var(--accent)] flex items-center justify-center shrink-0">
        <FileText className="w-5 h-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">
          {parsed.name || t('messages.previewFile')}
        </span>
        <span className="block text-[11px] text-gray-400 dark:text-gray-500">{formatBytes(parsed.size)}</span>
      </span>
      <Download className={`w-4 h-4 shrink-0 ${mine ? 'text-white/70' : 'text-gray-400'}`} />
    </a>
  );
}

function ReplyQuote({ message, mine }: { message: Message; mine: boolean }) {
  const { t } = useTranslation();
  if (!message.reply_to_id) return null;
  return (
    <div
      className={`mb-1.5 rounded-lg rounded-l-none px-2.5 py-1.5 border-l-[3px] backdrop-blur-sm ${
        mine
          ? 'bg-black/15 border-white/80'
          : 'bg-black/[0.05] dark:bg-white/[0.08] border-[var(--accent)]'
      }`}
    >
      <p className={`text-[11px] font-bold truncate ${mine ? 'text-white' : 'text-[var(--accent)]'}`}>
        {message.reply_to_sender_name || t('messages.user')}
      </p>
      <p className={`text-xs truncate ${mine ? 'text-white/85' : 'text-gray-600 dark:text-gray-300'}`}>
        {message.reply_to_content}
      </p>
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
            className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] border shadow-sm transition hover:scale-110 active:scale-95 ${
              mineHas
                ? 'bg-[var(--accent)] border-[var(--accent)] text-white shadow-[rgb(var(--accent-rgb)/0.3)]'
                : mine
                  ? 'bg-white/20 border-white/30 text-white hover:bg-white/30'
                  : 'bg-white dark:bg-white/10 border-gray-200 dark:border-white/15 text-gray-700 dark:text-gray-200 hover:border-[rgb(var(--accent-rgb)/0.6)]'
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
  const atBottomRef = useRef(true);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    if (nearBottom || messages.length <= 1) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  // Re-pin to the newest message when the box or the content resizes after
  // the first scroll: the rental/listing bars and the composer load
  // asynchronously, and without this the last message stays half-hidden
  // behind the composer.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    const pin = () => {
      if (atBottomRef.current) el.scrollTop = el.scrollHeight;
    };
    const ro = new ResizeObserver(pin);
    ro.observe(el);
    const content = el.firstElementChild;
    if (content) ro.observe(content);
    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
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

  const openMenu = (msg: Message) => {
    setMenu({ msg });
  };

  const closeMenu = () => setMenu(null);

  const startPress = (msg: Message) => {
    window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => openMenu(msg), 450);
  };
  const cancelPress = () => window.clearTimeout(pressTimer.current);

  if (loading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-[#121418]" style={WALLPAPER}>
        <Loader2 className="w-6 h-6 text-[var(--accent)] animate-spin" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-[#121418] text-center px-6"
        style={WALLPAPER}
      >
        <div className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-[rgb(var(--accent-rgb)/0.2)] to-[rgb(var(--accent-rgb)/0.05)] border border-[rgb(var(--accent-rgb)/0.2)] flex items-center justify-center text-3xl mb-4 shadow-lg shadow-[rgb(var(--accent-rgb)/0.1)]">
          💬
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{t('messages.noMessages')}</p>
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
        className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 bg-white dark:bg-[#121418] chat-scroll"
        style={WALLPAPER}
      >
        <div>
          {messages.map((message, index) => {
            const mine = message.sender_id === currentUserId;
            const parsed = parseContent(message.content || '');
            const showTranslation = translation && translation.id === message.id;

            const prev = index > 0 ? messages[index - 1] : null;
            const next = index < messages.length - 1 ? messages[index + 1] : null;
            const newDay = !prev || dayKey(prev.created_at) !== dayKey(message.created_at);
            const sameSenderPrev =
              !!prev &&
              !newDay &&
              prev.sender_id === message.sender_id &&
              parseDate(message.created_at).getTime() - parseDate(prev.created_at).getTime() < 5 * 60 * 1000;
            const groupEnd = !next
              ? true
              : dayKey(next.created_at) !== dayKey(message.created_at) ||
                next.sender_id !== message.sender_id ||
                parseDate(next.created_at).getTime() - parseDate(message.created_at).getTime() > 5 * 60 * 1000;

            const dayDivider = newDay ? (
              <div className="flex justify-center my-4">
                <span className="px-3 py-1 rounded-full bg-gray-100/90 dark:bg-white/10 backdrop-blur text-[11px] font-semibold text-gray-500 dark:text-gray-300 border border-gray-200/70 dark:border-white/10 shadow-sm">
                  {formatDate(message.created_at)}
                </span>
              </div>
            ) : null;

            // RentHub's own line (request sent / accepted / rejected / …) is
            // not a person talking — it is rendered as a centred chip instead
            // of a left/right bubble from whoever triggered it.
            if (isSystemMessage(message.content)) {
              return (
                <div key={message.id}>
                  {dayDivider}
                  <div className="flex justify-center my-2.5" data-testid="chat-system-message">
                    <span className="max-w-[85%] px-3 py-1.5 rounded-xl bg-gray-100/90 dark:bg-white/10 backdrop-blur text-[11px] leading-relaxed text-gray-600 dark:text-gray-300 border border-gray-200/70 dark:border-white/10 text-center">
                      {stripSystemPrefix(message.content)}
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div key={message.id}>
                {dayDivider}

                <div
                  onClick={(e) => e.stopPropagation()}
                onContextMenu={(e) => {
                  if (message.id <= 0) return;
                  e.preventDefault();
                  openMenu(message);
                }}
                onTouchStart={() => {
                  if (message.id <= 0) return;
                  startPress(message);
                }}
                  onTouchMove={cancelPress}
                  onTouchEnd={cancelPress}
                  className={`group flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'} ${
                    sameSenderPrev ? 'mt-0.5' : 'mt-2.5'
                  }`}
                >
                  {!mine && (
                    <div className="w-8 shrink-0">{groupEnd ? <Avatar name={message.sender_name} /> : null}</div>
                  )}

                  <div className="relative max-w-[85%] sm:max-w-[72%]">
                    {message.id > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openMenu(message);
                        }}
                        title={t('common.more')}
                        aria-label={t('common.more')}
                        className={`absolute top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full flex items-center justify-center bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 text-gray-400 hover:text-[var(--accent)] hover:border-[rgb(var(--accent-rgb)/0.5)] transition group-hover:opacity-100 focus:opacity-100 ${
                          menu?.msg.id === message.id ? 'opacity-100' : 'opacity-0'
                        } shadow-md ${mine ? '-left-9' : '-right-9'}`}
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <div
                      className={`${
                        mine
                          ? 'rounded-[20px] rounded-br-[7px] bg-gradient-to-br from-[var(--accent)] to-[var(--accent-light)] text-white shadow-[0_3px_14px_-4px_rgba(255,107,53,0.55)]'
                          : 'rounded-[20px] rounded-bl-[7px] bg-white dark:bg-[#1a1f28] border border-gray-200/90 dark:border-white/[0.07] text-gray-900 dark:text-white shadow-[0_2px_10px_-4px_rgba(16,24,40,0.18)]'
                      }`}
                    >
                      {message.forwarded_from_name && (
                        <div
                          className={`px-3.5 pt-2.5 text-[11px] font-semibold flex items-center gap-1 ${
                            mine ? 'text-white/85' : 'text-[var(--accent)]'
                          }`}
                        >
                          <Forward className="w-3 h-3" />
                          {t('messages.forwardedFrom')}: {message.forwarded_from_name}
                        </div>
                      )}

                      {parsed.kind === 'text' && (
                        <div className="px-3.5 pt-2.5 pb-1.5">
                          <ReplyQuote message={message} mine={mine} />
                          <p className="text-[14.5px] leading-[1.45] whitespace-pre-wrap break-words">{parsed.text}</p>
                          <div className="flex justify-end items-center gap-1 mt-1 -mb-0.5">
                            {message.pinned && <Pin className="w-3 h-3 opacity-70" />}
                            {message.edited_at && (
                              <span className={`text-[10px] ${mine ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'}`}>
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
                          className="block p-1.5 group/img focus:outline-none"
                        >
                          <img
                            src={parsed.url}
                            alt=""
                            loading="lazy"
                            className="rounded-[15px] max-w-[260px] max-h-[260px] object-cover group-hover/img:brightness-95 transition"
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
                        className={`mt-1.5 rounded-xl px-3 py-2 text-xs border bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 shadow-sm ${
                          mine ? 'ml-auto' : ''
                        }`}
                      >
                        <span className="font-semibold text-[var(--accent)] mr-1">
                          {translatingId === message.id ? '…' : t('messages.translation')}
                        </span>
                        {translation?.text}
                      </div>
                    )}
                  </div>
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
            className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-60 rounded-3xl bg-white/95 dark:bg-[#1a1d24]/95 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-[0_24px_80px_-20px_rgba(16,24,40,0.55)] overflow-hidden p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center gap-1.5 px-1 pb-2 mb-1.5 border-b border-gray-100 dark:border-white/10">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onReact?.(menuMsg.id, emoji);
                    closeMenu();
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-lg leading-none bg-gray-50 dark:bg-white/[0.06] hover:bg-[rgb(var(--accent-rgb)/0.15)] hover:scale-[1.35] active:scale-95 transition shadow-sm"
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

            <div className="my-1.5 border-t border-gray-100 dark:border-white/10" />

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
      className={`group w-full flex items-center justify-center gap-2.5 px-3 py-2 rounded-2xl text-sm transition ${
        danger
          ? 'text-red-500 hover:bg-red-500/10'
          : 'text-gray-700 dark:text-gray-200 hover:bg-[rgb(var(--accent-rgb)/0.1)]'
      }`}
    >
      <span
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition ${
          danger
            ? 'bg-red-500/10 text-red-500 group-hover:bg-red-500 group-hover:text-white'
            : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 group-hover:bg-[var(--accent)] group-hover:text-white'
        }`}
      >
        {icon}
      </span>
      <span className="font-medium truncate">{label}</span>
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />}
    </button>
  );
}
