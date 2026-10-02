import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, MessageSquare, Pin, X, Package, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { messages, upload, listings } from '../api';
import type { Conversation, Message } from '../api';
import useAuthStore from '../store/authStore';
import ChatHeader from '../components/chat/ChatHeader';
import ChatMessageList from '../components/chat/ChatMessageList';
import ChatInput from '../components/chat/ChatInput';
import Lightbox from '../components/chat/Lightbox';
import CallOverlay, { type CallType } from '../components/chat/CallOverlay';
import useChatSocket from '../components/chat/useChatSocket';
import { parseContent } from '../components/chat/messageContent';
import { timeAgo } from '../utils/timeAgo';

import { formatAmount } from '../utils/format';
function voiceExt(mimeType: string): string {
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4')) return 'm4a';
  if (mimeType.includes('wav')) return 'wav';
  return 'webm';
}

export default function MessagesPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [inputText, setInputText] = useState('');
  const [search, setSearch] = useState('');
  const [call, setCall] = useState<CallType | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [forwardMsg, setForwardMsg] = useState<Message | null>(null);
  const [translation, setTranslation] = useState<{ id: number; text: string } | null>(null);
  const [translatingId, setTranslatingId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading: convLoading } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: messages.getConversations,
    refetchInterval: 5000,
  });

  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const c = searchParams.get('conversation');
    if (!c) return;
    const id = Number(c);
    if (conversations.some((conv) => conv.id === id)) {
      setSelectedId(id);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, conversations, setSearchParams]);

  const { data: chatMessages = [], isLoading: msgLoading } = useQuery<Message[]>({
    queryKey: ['messages', selectedId],
    queryFn: () => messages.getMessages(selectedId!),
    enabled: !!selectedId,
    refetchInterval: selectedId ? 5000 : false,
  });

  const sendMutation = useMutation({
    mutationFn: ({ content, replyToId }: { content: string; replyToId?: number | null }) =>
      messages.sendMessage(selectedId!, content, { reply_to_id: replyToId ?? null }),
    onMutate: async ({ content }: { content: string; replyToId?: number | null }) => {
      const convId = selectedId!;
      await queryClient.cancelQueries({ queryKey: ['messages', convId] });
      const temp: Message = {
        id: -Date.now(),
        conversation_id: convId,
        sender_id: user?.id ?? 0,
        content,
        is_read: false,
        created_at: new Date().toISOString(),
        sender_name: null,
        sender_avatar: null,
      };
      queryClient.setQueryData<Message[]>(['messages', convId], (old) => (old ? [...old, temp] : [temp]));
      setInputText('');
      setReplyTo(null);
      return { convId };
    },
    onSuccess: (_data, _vars, ctx) => {
      if (ctx?.convId) {
        queryClient.invalidateQueries({ queryKey: ['messages', ctx.convId] });
      }
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.convId) {
        queryClient.setQueryData<Message[]>(['messages', ctx.convId], (old) =>
          old ? old.filter((m) => m.id > 0) : old,
        );
      }
      toast.error(t('messages.failedToSend'));
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) => messages.editMessage(id, content),
    onSuccess: () => {
      setEditing(null);
      setInputText('');
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast.success(t('messages.updated'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const reactMutation = useMutation({
    mutationFn: ({ id, emoji }: { id: number; emoji: string }) => messages.toggleReaction(id, emoji),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedId] });
      void vars;
    },
    onError: () => toast.error(t('common.error')),
  });

  const pinMutation = useMutation({
    mutationFn: ({ id, pinned }: { id: number; pinned: boolean }) => messages.pinMessage(id, pinned),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedId] });
    },
    onError: () => toast.error(t('common.error')),
  });

  const forwardMutation = useMutation({
    mutationFn: ({ targetId, content, fromName }: { targetId: number; content: string; fromName: string }) =>
      messages.sendMessage(targetId, content, { forwarded_from_name: fromName }),
    onSuccess: () => {
      setForwardMsg(null);
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success(t('messages.forwarded'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const markReadMutation = useMutation({
    mutationFn: (convId: number) => messages.markRead(convId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (messageId: number) => messages.deleteMessage(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success(t('messages.deleted'));
    },
    onError: () => {
      toast.error(t('common.error'));
    },
  });

  const handleDeleteMessage = (messageId: number) => {
    if (window.confirm(t('messages.deleteConfirm'))) {
      deleteMutation.mutate(messageId);
    }
  };

  const clearMutation = useMutation({
    mutationFn: (convId: number) => messages.clearConversation(convId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success(t('messages.cleared'));
    },
    onError: () => {
      toast.error(t('common.error'));
    },
  });

  const handleClearConversation = () => {
    if (!selectedId) return;
    if (window.confirm(t('messages.clearConfirm'))) {
      clearMutation.mutate(selectedId);
    }
  };

  useChatSocket((event) => {
    if (event.event === 'new_message' && event.message) {
      const convId = Number(event.conversation_id);
      const m = event.message as Record<string, unknown> & {
        id: number;
        conversation_id: number;
        sender_id: number;
        content: string;
        created_at: string;
      };
      if (convId) {
        queryClient.setQueryData<Message[]>(['messages', convId], (old) => {
          if (!old) return old;
          const cleaned = old.filter((x) => !(x.id < 0 && x.sender_id === m.sender_id && x.content === m.content));
          if (cleaned.some((x) => x.id === m.id)) return cleaned;
          return [
            ...cleaned,
            {
              id: m.id,
              conversation_id: m.conversation_id,
              sender_id: m.sender_id,
              content: m.content,
              created_at: m.created_at,
              is_read: false,
              sender_name: null,
              sender_avatar: null,
              reply_to_id: (m.reply_to_id as number | null) ?? null,
              reply_to_content: (m.reply_to_content as string | null) ?? null,
              reply_to_sender_name: (m.reply_to_sender_name as string | null) ?? null,
              edited_at: (m.edited_at as string | null) ?? null,
              pinned: Boolean(m.pinned),
              reactions: (m.reactions as Record<string, number[]>) || {},
              forwarded_from_name: (m.forwarded_from_name as string | null) ?? null,
            },
          ];
        });
      }
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      return;
    }
    if (event.event === 'message_updated' && event.message) {
      const m = event.message as { id: number; conversation_id: number };
      queryClient.setQueryData<Message[]>(['messages', Number(m.conversation_id)], (old) =>
        old ? old.map((x) => (x.id === m.id ? { ...x, ...(m as Partial<Message>) } : x)) : old,
      );
      return;
    }
    if (event.event === 'message_reaction') {
      const convId = Number(event.conversation_id);
      const msgId = Number(event.message_id);
      const reactions = event.reactions as Record<string, number[]>;
      queryClient.setQueryData<Message[]>(['messages', convId], (old) =>
        old ? old.map((x) => (x.id === msgId ? { ...x, reactions } : x)) : old,
      );
      return;
    }
    if (event.event === 'message_pinned') {
      const convId = Number(event.conversation_id);
      const msgId = Number(event.message_id);
      const pinned = Boolean(event.pinned);
      queryClient.setQueryData<Message[]>(['messages', convId], (old) =>
        old ? old.map((x) => ({ ...x, pinned: x.id === msgId ? pinned : false })) : old,
      );
      return;
    }
    if (event.event === 'message_deleted') {
      const convId = Number(event.conversation_id);
      const msgId = Number(event.message_id);
      queryClient.setQueryData<Message[]>(['messages', convId], (old) =>
        old ? old.filter((x) => x.id !== msgId) : old,
      );
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      return;
    }
    if (event.event === 'conversation_cleared') {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      return;
    }
    if (event.type === 'notification') {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    return conversations.filter((conv) => {
      return conv.other_user_name?.toLowerCase().includes(search.toLowerCase());
    });
  }, [conversations, search]);


  useEffect(() => {
    if (selectedId && chatMessages.length > 0) {
      markReadMutation.mutate(selectedId);
    }
  }, [selectedId, chatMessages.length]);

  useEffect(() => {
    if (selectedId) {
      markReadMutation.mutate(selectedId);
    }
    setReplyTo(null);
    setEditing(null);
    setInputText('');
    setTranslation(null);
    setForwardMsg(null);
  }, [selectedId]);

  const handleSend = () => {
    if (!selectedId) return;
    const text = inputText.trim();
    if (!text) return;
    if (editing) {
      editMutation.mutate({ id: editing.id, content: text });
      return;
    }
    sendMutation.mutate({ content: text, replyToId: replyTo?.id ?? null });
  };

  const handleReply = (msg: Message) => {
    setEditing(null);
    setReplyTo(msg);
  };

  const handleEdit = (msg: Message) => {
    setReplyTo(null);
    setEditing(msg);
    const parsed = parseContent(msg.content || '');
    setInputText(parsed.kind === 'text' ? parsed.text : msg.content);
  };

  const handleReact = (id: number, emoji: string) => {
    reactMutation.mutate({ id, emoji });
  };

  const handlePin = (msg: Message, pinned: boolean) => {
    pinMutation.mutate({ id: msg.id, pinned });
  };

  const handleTranslate = async (msg: Message) => {
    const parsed = parseContent(msg.content || '');
    if (parsed.kind !== 'text') return;
    const lang = (i18n.language || 'en').toLowerCase();
    const target = lang.startsWith('tj') ? 'tg' : lang.startsWith('ru') ? 'ru' : 'en';
    setTranslatingId(msg.id);
    setTranslation(null);
    try {
      const url =
        'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&dt=t&q=' +
        encodeURIComponent(parsed.text) +
        '&tl=' +
        target;
      const res = await fetch(url);
      const data = await res.json();
      const text = ((data?.[0] as unknown[]) || [])
        .map((seg) => (Array.isArray(seg) ? String(seg[0] ?? '') : ''))
        .join('')
        .trim();
      if (!text) throw new Error('empty');
      setTranslation({ id: msg.id, text });
    } catch {
      toast.error(t('messages.translateFailed'));
    } finally {
      setTranslatingId(null);
    }
  };

  const sendAttachment = async (file: File | Blob, kind: 'image' | 'file' | 'voice', duration?: number) => {
    if (!selectedId) return;
    try {
      let envelope: Record<string, unknown>;
      if (kind === 'image') {
        const res = await upload.uploadImage(file as File);
        envelope = { kind: 'image', url: res.image_url };
      } else if (kind === 'voice') {
        const voiceFile = new File([file], `voice-${Date.now()}.${voiceExt(file.type)}`, {
          type: file.type || 'audio/webm',
        });
        const res = await upload.uploadFile(voiceFile);
        envelope = { kind: 'voice', url: res.file_url, duration };
      } else {
        const res = await upload.uploadFile(file as File);
        envelope = { kind: 'file', url: res.file_url, name: res.name, size: res.size };
      }
      sendMutation.mutate({ content: JSON.stringify(envelope) });
    } catch {
      toast.error(t('messages.uploadFailed'));
    }
  };

  const getOtherUser = (conv: Conversation) => {
    return {
      display_name: conv.other_user_name,
      avatar_url: conv.other_user_avatar,
    };
  };

  const previewText = (content: string | null | undefined) => {
    if (!content) return '';
    const parsed = parseContent(content);
    if (parsed.kind === 'text') return parsed.text;
    if (parsed.kind === 'image') return t('messages.previewImage');
    if (parsed.kind === 'voice') return t('messages.previewVoice');
    return `📎 ${parsed.name || t('messages.previewFile')}`;
  };

  const selectedConversation = conversations.find((c) => c.id === selectedId);
  const pinnedMessage = selectedId ? chatMessages.find((m) => m.pinned) : undefined;
  const otherName = selectedConversation
    ? getOtherUser(selectedConversation)?.display_name || t('messages.user')
    : '';

  if (convLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh_-_var(--header-h))]">
        <div className="w-10 h-10 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-11rem)] md:h-[calc(100vh-6rem)] max-w-7xl mx-auto bg-white dark:bg-[#121418] rounded-3xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-2xl my-4">
      <div className={`w-80 flex-shrink-0 border-r border-gray-200 dark:border-white/10 flex flex-col bg-gray-50 dark:bg-[#1a1d24] ${selectedId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-200 dark:border-white/10">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{t('messages.title')}</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('messages.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100/80 dark:bg-white/5 border border-transparent rounded-full text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:bg-white dark:focus:bg-white/10 focus:ring-4 focus:ring-[rgb(var(--accent-rgb)/0.15)] focus:border-[rgb(var(--accent-rgb)/0.4)] transition"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <div className="w-14 h-14 bg-[rgb(var(--accent-rgb)/0.1)] rounded-full flex items-center justify-center mb-3">
                <MessageSquare className="w-7 h-7 text-[var(--accent)]" />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{t('messages.noConversations')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('messages.noConversationsHint')}</p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const other = getOtherUser(conv);
              const isActive = conv.id === selectedId;
              const unreadCount = conv.unread_count;

              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={`w-full text-left my-1 px-3 py-3 rounded-2xl transition ${
                    isActive
                      ? 'bg-gradient-to-r from-[rgb(var(--accent-rgb)/0.15)] to-[rgb(var(--accent-rgb)/0.05)] ring-1 ring-[rgb(var(--accent-rgb)/0.3)] shadow-sm'
                      : 'hover:bg-gray-100/70 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0">
                      {other?.avatar_url ? (
                        <img src={other.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover" />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[var(--accent)] to-[#1A1A2E] flex items-center justify-center text-white font-semibold text-sm shadow-md shadow-[rgb(var(--accent-rgb)/0.2)]">
                          {other?.display_name?.charAt(0) || '?'}
                        </div>
                      )}
                      {unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-[var(--accent)] rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-md shadow-[rgb(var(--accent-rgb)/0.4)]">
                          {unreadCount}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-sm truncate ${unreadCount > 0 ? 'font-bold text-gray-900 dark:text-white' : 'font-semibold text-gray-800 dark:text-gray-100'}`}>
                          {other?.display_name || t('messages.user')}
                        </span>
                        {conv.last_message_at && (
                          <span className={`text-[11px] flex-shrink-0 ml-2 ${unreadCount > 0 ? 'text-[var(--accent)] font-semibold' : 'text-gray-400'}`}>
                            {timeAgo(conv.last_message_at, t)}
                          </span>
                        )}
                      </div>
                      {conv.last_message_content && (
                        <p className={`text-xs truncate ${unreadCount > 0 ? 'text-gray-700 dark:text-gray-300 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                          {previewText(conv.last_message_content)}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className={`relative flex-1 min-w-0 flex flex-col bg-white dark:bg-[#121418] ${!selectedId ? 'hidden md:flex' : 'flex'}`}>
        {!selectedId ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-[rgb(var(--accent-rgb)/0.2)] to-[rgb(var(--accent-rgb)/0.05)] rounded-[32px] border border-[rgb(var(--accent-rgb)/0.15)] flex items-center justify-center mb-5 shadow-xl shadow-[rgb(var(--accent-rgb)/0.1)]">
              <MessageSquare className="w-11 h-11 text-[var(--accent)]" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('messages.selectConversation')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
              {t('messages.selectHint')}
            </p>
          </div>
        ) : (
          <>
            <ChatHeader
              name={otherName}
              avatar={selectedConversation ? getOtherUser(selectedConversation)?.avatar_url : null}
              onBack={() => setSelectedId(null)}
              onAudioCall={() => setCall('audio')}
              onVideoCall={() => setCall('video')}
              onClear={handleClearConversation}
            />

            {selectedConversation?.listing_id != null && (
              <ListingContextBar listingId={selectedConversation.listing_id} />
            )}

            {pinnedMessage && (
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[rgb(var(--accent-rgb)/0.15)] bg-gradient-to-r from-[rgb(var(--accent-rgb)/0.15)] via-[rgb(var(--accent-rgb)/0.07)] to-transparent backdrop-blur-sm">
                <span className="w-8 h-8 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shrink-0">
                  <Pin className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-[var(--accent)]">{t('messages.pinned')}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                    {previewText(pinnedMessage.content)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => pinMutation.mutate({ id: pinnedMessage.id, pinned: false })}
                  aria-label={t('messages.unpin')}
                  title={t('messages.unpin')}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <ChatMessageList
              messages={chatMessages}
              currentUserId={user?.id}
              loading={msgLoading}
              onOpenImage={setLightboxSrc}
              onDelete={handleDeleteMessage}
              canDeleteOthers={user?.role === 'ADMIN'}
              onReply={handleReply}
              onEdit={handleEdit}
              onForward={setForwardMsg}
              onReact={handleReact}
              onPin={handlePin}
              onTranslate={handleTranslate}
              translation={translation}
              translatingId={translatingId}
            />
            <div ref={messagesEndRef} className="hidden" />

            <ChatInput
              value={inputText}
              onChange={setInputText}
              onSend={handleSend}
              onAttach={(file, kind) => sendAttachment(file, kind)}
              onVoice={(blob, duration) => sendAttachment(blob, 'voice', duration)}
              sending={sendMutation.isPending}
              replyTo={replyTo}
              editing={editing}
              onCancelReply={() => setReplyTo(null)}
              onCancelEdit={() => {
                setEditing(null);
                setInputText('');
              }}
            />

            {forwardMsg && (
              <div
                className="absolute inset-0 z-40 bg-black/50 flex items-center justify-center p-4"
                onClick={() => setForwardMsg(null)}
              >
                <div
                  className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/10">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{t('messages.forwardTo')}</p>
                    <button
                      type="button"
                      onClick={() => setForwardMsg(null)}
                      aria-label={t('common.cancel')}
                      className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {conversations.map((conv) => (
                      <button
                        key={conv.id}
                        type="button"
                        disabled={forwardMutation.isPending}
                        onClick={() =>
                          forwardMutation.mutate({
                            targetId: conv.id,
                            content: forwardMsg.content,
                            fromName: otherName || t('messages.user'),
                          })
                        }
                        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-white/5 transition disabled:opacity-50"
                      >
                        <span className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--accent)] to-[#1A1A2E] text-white flex items-center justify-center text-sm font-semibold shrink-0">
                          {conv.other_user_name?.charAt(0) || '?'}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">
                            {conv.other_user_name || t('messages.user')}
                          </span>
                          <span className="block text-xs text-gray-400 truncate">
                            {previewText(conv.last_message_content)}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {call && selectedConversation && (
          <CallOverlay
            type={call}
            name={otherName}
            avatar={getOtherUser(selectedConversation)?.avatar_url}
            onClose={() => setCall(null)}
          />
        )}

        <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      </div>
    </div>
  );
}

function ListingContextBar({ listingId }: { listingId: number }) {
  const { t } = useTranslation();
  const { data: listing } = useQuery({
    queryKey: ['listing-mini-chat', listingId],
    queryFn: () => listings.getOne(listingId),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  if (!listing) return null;
  const img = listing.images?.[0]?.image_url ?? null;

  return (
    <Link
      to={`/listing/${listingId}`}
      data-testid="chat-listing-card"
      className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.03] hover:bg-gray-100 dark:hover:bg-white/5 transition"
    >
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 dark:bg-white/10 flex-shrink-0 flex items-center justify-center">
        {img ? (
          <img src={img} alt="" className="w-full h-full object-cover" />
        ) : (
          <Package className="w-5 h-5 text-gray-400 dark:text-gray-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#1A1A2E] dark:text-white truncate">{listing.title}</p>
        <p className="text-xs font-bold text-[var(--accent)]">
          {formatAmount(listing.price)} {t('common.somoni')} / {t(`listing.${listing.price_unit}`)}
        </p>
      </div>
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1 shrink-0">
        {t('booking.viewListing')}
        <ChevronRight className="w-3.5 h-3.5" />
      </span>
    </Link>
  );
}
