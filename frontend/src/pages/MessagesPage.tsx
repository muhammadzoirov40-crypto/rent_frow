import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { messages, upload } from '../api';
import type { Conversation, Message } from '../api';
import useAuthStore from '../store/authStore';
import ChatHeader from '../components/chat/ChatHeader';
import ChatMessageList from '../components/chat/ChatMessageList';
import ChatInput from '../components/chat/ChatInput';
import Lightbox from '../components/chat/Lightbox';
import CallOverlay, { type CallType } from '../components/chat/CallOverlay';
import useChatSocket from '../components/chat/useChatSocket';
import { parseContent } from '../components/chat/messageContent';

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

function voiceExt(mimeType: string): string {
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4')) return 'm4a';
  if (mimeType.includes('wav')) return 'wav';
  return 'webm';
}

export default function MessagesPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [inputText, setInputText] = useState('');
  const [search, setSearch] = useState('');
  const [call, setCall] = useState<CallType | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading: convLoading } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: messages.getConversations,
    refetchInterval: 5000,
  });

  const { data: chatMessages = [], isLoading: msgLoading } = useQuery<Message[]>({
    queryKey: ['messages', selectedId],
    queryFn: () => messages.getMessages(selectedId!),
    enabled: !!selectedId,
    refetchInterval: selectedId ? 5000 : false,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) => messages.sendMessage(selectedId!, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setInputText('');
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    },
    onError: () => {
      toast.error(t('messages.failedToSend'));
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (convId: number) => messages.markRead(convId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  useChatSocket((event) => {
    if (event.event === 'new_message' || event.type === 'message') {
      const convId = Number(event.conversation_id);
      if (selectedId && convId === selectedId) {
        queryClient.invalidateQueries({ queryKey: ['messages', selectedId] });
      }
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (selectedId) {
      markReadMutation.mutate(selectedId);
    }
  }, [selectedId, chatMessages.length]);

  const handleSend = () => {
    if (!inputText.trim() || !selectedId) return;
    sendMutation.mutate(inputText.trim());
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
      sendMutation.mutate(JSON.stringify(envelope));
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
  const otherName = selectedConversation
    ? getOtherUser(selectedConversation)?.display_name || t('messages.user')
    : '';

  if (convLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="w-10 h-10 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] max-w-7xl mx-auto bg-white dark:bg-[#121418] rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-xl my-4">
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
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent transition"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <div className="w-14 h-14 bg-[#FF6B35]/10 rounded-full flex items-center justify-center mb-3">
                <MessageSquare className="w-7 h-7 text-[#FF6B35]" />
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
                  className={`w-full text-left p-4 border-b border-gray-200 dark:border-white/5 transition hover:bg-white dark:hover:bg-white/5 ${
                    isActive ? 'bg-white dark:bg-white/10 border-l-2 border-l-[#FF6B35]' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0">
                      {other?.avatar_url ? (
                        <img src={other.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover" />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#1A1A2E] flex items-center justify-center text-white font-semibold text-sm">
                          {other?.display_name?.charAt(0) || '?'}
                        </div>
                      )}
                      {unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF6B35] rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                          {unreadCount}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                          {other?.display_name || t('messages.user')}
                        </span>
                        {conv.last_message_at && (
                          <span className="text-[11px] text-gray-400 flex-shrink-0 ml-2">
                            {timeAgo(conv.last_message_at)}
                          </span>
                        )}
                      </div>
                      {conv.last_message_content && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
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

      <div className={`flex-1 min-w-0 flex flex-col bg-[#121418] ${!selectedId ? 'hidden md:flex' : 'flex'}`}>
        {!selectedId ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-[#FF6B35]/10 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-10 h-10 text-[#FF6B35]" />
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
            />

            <ChatMessageList
              messages={chatMessages}
              currentUserId={user?.id}
              loading={msgLoading}
              onOpenImage={setLightboxSrc}
            />
            <div ref={messagesEndRef} className="hidden" />

            <ChatInput
              value={inputText}
              onChange={setInputText}
              onSend={handleSend}
              onAttach={(file, kind) => sendAttachment(file, kind)}
              onVoice={(blob, duration) => sendAttachment(blob, 'voice', duration)}
              sending={sendMutation.isPending}
            />
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
