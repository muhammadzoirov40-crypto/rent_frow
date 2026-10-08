import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  Image as ImageIcon,
  Mic,
  Paperclip,
  Send,
  Smile,
  Trash2,
} from 'lucide-react';
import { formatDuration, parseContent } from './messageContent';
import type { Message } from '../../api';
import { X } from 'lucide-react';

const EMOJIS = [
  '😀', '😂', '😅', '😊', '😍', '😘', '😎', '🤩',
  '🤔', '😏', '😢', '😭', '😡', '🥳', '😴', '🤗',
  '👍', '👎', '👏', '🙏', '💪', '🤝', '👌', '✌️',
  '❤️', '🔥', '⭐', '🎉', '💯', '✅', '📷', '🚗',
  '🔑', '📦', '📍', '💰', '🛒', '⚡', '🌟', '🟧',
];

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onAttach: (file: File, kind: 'image' | 'file') => void;
  onVoice: (blob: Blob, duration: number) => void;
  disabled?: boolean;
  sending?: boolean;
  replyTo?: Message | null;
  editing?: Message | null;
  onCancelReply?: () => void;
  onCancelEdit?: () => void;
}

function stripPreview(content: string): string {
  try {
    const parsed = parseContent(content || '');
    if (parsed.kind === 'text') return parsed.text;
    if (parsed.kind === 'image') return '📷';
    if (parsed.kind === 'voice') return '🎤';
    return `📎 ${parsed.name || ''}`.trim();
  } catch {
    return content;
  }
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  onAttach,
  onVoice,
  disabled = false,
  sending = false,
  replyTo = null,
  editing = null,
  onCancelReply,
  onCancelEdit,
}: ChatInputProps) {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | undefined>(undefined);
  const secondsRef = useRef(0);

  const [emojiOpen, setEmojiOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    // border-box: the inline height must also cover the 1px border on each
    // side — otherwise the content overflows by 2px and a phantom
    // scrollbar sliver shows inside the field.
    const border = el.offsetHeight - el.clientHeight;
    el.style.height = `${Math.min(el.scrollHeight + border, 150)}px`;
  }, [value]);

  useEffect(() => {
    if (!emojiOpen) return;
    const onClick = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setEmojiOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [emojiOpen]);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!value.trim() || sending || disabled) return;
      onSend();
    }
  };

  const pickFile = (kind: 'image' | 'file') => {
    if (disabled) return;
    if (kind === 'image') imageInputRef.current?.click();
    else documentInputRef.current?.click();
  };

  const onFilePicked = (kind: 'image' | 'file') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onAttach(file, kind);
  };

  const startRecording = async () => {
    if (disabled || recording) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast.error(t('messages.voiceUnsupported'));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const duration = secondsRef.current;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        secondsRef.current = 0;
        if (blob.size > 0) onVoice(blob, Math.max(duration, 1));
      };

      recorder.start();
      secondsRef.current = 0;
      setSeconds(0);
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        secondsRef.current += 1;
        setSeconds(secondsRef.current);
      }, 1000);
    } catch {
      toast.error(t('messages.voiceUnsupported'));
    }
  };

  const stopRecording = (send: boolean) => {
    if (!recording) return;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = undefined;
    const recorder = mediaRecorderRef.current;
    setRecording(false);
    if (!send) {
      chunksRef.current = [];
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      secondsRef.current = 0;
      setSeconds(0);
      return;
    }
    recorder?.stop();
    setSeconds(0);
  };

  const canSend = Boolean(value.trim()) && !sending && !disabled;

  return (
    <div className="relative px-3 sm:px-5 py-3 bg-white/95 dark:bg-[#1a1d24]/95 backdrop-blur border-t border-gray-200/70 dark:border-white/10">
      {emojiOpen && (
        <div
          ref={emojiRef}
          className="absolute bottom-full left-3 sm:left-4 mb-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 shadow-2xl p-3 z-20"
        >
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2">{t('messages.emoji')}</p>
          <div className="grid grid-cols-8 gap-1">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onChange(value + emoji);
                  textareaRef.current?.focus();
                }}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-lg leading-none transition"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      <input
        ref={documentInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.rtf,.zip,.rar"
        onChange={onFilePicked('file')}
      />
      <input
        ref={imageInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={onFilePicked('image')}
      />

      {(replyTo || editing) && (
        <div className="mb-2 flex items-start gap-3 pl-3 pr-2 py-2.5 rounded-2xl bg-[rgb(var(--accent-rgb)/0.07)] dark:bg-[rgb(var(--accent-rgb)/0.1)] border border-[rgb(var(--accent-rgb)/0.25)] shadow-sm">
          <span className="w-1 self-stretch rounded-full bg-gradient-to-b from-[var(--accent)] to-[var(--accent-light)] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[var(--accent)]">
              {editing ? t('messages.editing') : t('messages.replyingTo')}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
              <span className="font-semibold text-gray-800 dark:text-white">{(editing || replyTo)?.sender_name || ''}</span>
              {': '}
              {stripPreview((editing || replyTo)?.content || '')}
            </p>
          </div>
          <button
            type="button"
            onClick={editing ? onCancelEdit : onCancelReply}
            aria-label={t('common.cancel')}
            title={t('common.cancel')}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {recording ? (
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            {formatDuration(seconds)}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">
            {t('messages.recording')}
          </span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => stopRecording(false)}
            aria-label={t('common.cancel')}
            className="p-2.5 rounded-xl text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10 transition"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => stopRecording(true)}
            aria-label={t('messages.send')}
            className="p-2.5 rounded-xl bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition shadow-lg shadow-[rgb(var(--accent-rgb)/0.25)]"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <div className="flex items-end gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => pickFile('file')}
            disabled={disabled}
            aria-label={t('messages.attachFile')}
            title={t('messages.attachFile')}
            className="p-2.5 rounded-full text-gray-400 hover:text-[var(--accent)] hover:bg-[rgb(var(--accent-rgb)/0.1)] dark:hover:bg-[rgb(var(--accent-rgb)/0.15)] transition disabled:opacity-40"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => pickFile('image')}
            disabled={disabled}
            aria-label={t('messages.attachImage')}
            title={t('messages.attachImage')}
            className="p-2.5 rounded-full text-gray-400 hover:text-[var(--accent)] hover:bg-[rgb(var(--accent-rgb)/0.1)] dark:hover:bg-[rgb(var(--accent-rgb)/0.15)] transition disabled:opacity-40"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setEmojiOpen((o) => !o)}
            disabled={disabled}
            aria-label={t('messages.emoji')}
            title={t('messages.emoji')}
            className={`p-2.5 rounded-full transition disabled:opacity-40 ${
              emojiOpen
                ? 'text-[var(--accent)] bg-[rgb(var(--accent-rgb)/0.15)]'
                : 'text-gray-400 hover:text-[var(--accent)] hover:bg-[rgb(var(--accent-rgb)/0.1)] dark:hover:bg-[rgb(var(--accent-rgb)/0.15)]'
            }`}
          >
            <Smile className="w-5 h-5" />
          </button>

          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('messages.typeMessage')}
            disabled={disabled}
            className="flex-1 min-w-0 resize-none max-h-[150px] rounded-[22px] border border-transparent bg-gray-100/90 dark:bg-white/[0.06] px-4 py-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.4)] focus:bg-white dark:focus:bg-white/[0.09] focus:ring-4 focus:ring-[rgb(var(--accent-rgb)/0.1)] transition"
          />

          <button
            type="button"
            onClick={startRecording}
            disabled={disabled}
            aria-label={t('messages.recordVoice')}
            title={t('messages.recordVoice')}
            className="p-2.5 rounded-full text-gray-400 hover:text-[var(--accent)] hover:bg-[rgb(var(--accent-rgb)/0.1)] dark:hover:bg-[rgb(var(--accent-rgb)/0.15)] transition disabled:opacity-40"
          >
            <Mic className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onSend}
            disabled={!canSend}
            aria-label={t('messages.send')}
            title={t('messages.send')}
            className="p-3 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-light)] text-white shadow-lg shadow-[rgb(var(--accent-rgb)/0.3)] hover:scale-105 hover:shadow-[rgb(var(--accent-rgb)/0.4)] active:scale-95 transition disabled:opacity-40 disabled:shadow-none disabled:scale-100"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
