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
  // Each recording owns its own decision object, created when the mic opens.
  // stopRecording only mutates that object, so the onstop of a discarded
  // recording can never read the send flag of the recording after it — the
  // stale-flag bug that made "delete" send the previous note instead.
  const decisionRef = useRef<{ send: boolean }>({ send: false });

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

  // Ctrl+V with an image in the clipboard sends it as an attachment, the same
  // path the paperclip button uses; text pastes are untouched.
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (disabled) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          onAttach(file, 'image');
          return;
        }
      }
    }
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
      const decision = { send: false };
      decisionRef.current = decision;

      recorder.onstop = () => {
        const duration = secondsRef.current;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        secondsRef.current = 0;
        // decision.send is this recording's own flag, set at click time — a
        // late onstop can never pick up the choice of the next recording.
        // The trash path relies on this guard: it stops the tracks, which
        // makes MediaRecorder fire this same callback, and without the guard
        // "delete" would send the voice note instead of dropping it.
        if (decision.send && blob.size > 0) onVoice(blob, Math.max(duration, 1));
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
    // Mutate this recording's own decision object before stopping, so the
    // onstop that follows knows whether to hand the audio over or drop it.
    decisionRef.current.send = send;
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
    <div className="relative px-3 sm:px-5 py-3 glass-section border-t border-[color:var(--glass-border)]">
      {emojiOpen && (
        <div
          ref={emojiRef}
          className="absolute bottom-full left-3 sm:left-4 mb-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl glass-popover border border-[color:var(--glass-border)] p-3 z-20"
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
        <div className="flex items-center gap-1 sm:gap-2 sm:items-end">
          {/* Phone: one WhatsApp-style pill — emoji inside left, the field in
              the middle, attach + photo inside right — with a single accent
              round button beside it that swaps mic↔send as text appears.
              `sm:contents` dissolves the pill at ≥640 so the flat row
              (paperclip, photo, emoji, field, mic, send) renders exactly as
              before: a contents box contributes no box of its own, and the
              children's `sm:order-*` puts them back in the original sequence. */}
          <div className="flex items-center flex-1 min-w-0 rounded-full glass-input p-1 sm:contents">
            <button
              type="button"
              onClick={() => setEmojiOpen((o) => !o)}
              disabled={disabled}
              aria-label={t('messages.emoji')}
              title={t('messages.emoji')}
              className={`order-1 sm:order-3 p-1 rounded-full transition disabled:opacity-40 sm:p-2.5 ${
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
              onPaste={handlePaste}
              placeholder={t('messages.typeMessage')}
              disabled={disabled}
              className="order-2 sm:order-4 flex-1 min-w-0 resize-none max-h-[150px] rounded-[22px] glass-input px-2.5 py-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none transition max-sm:rounded-none max-sm:border-0 max-sm:bg-transparent max-sm:px-2 max-sm:py-1.5 max-sm:focus:shadow-none sm:px-4 sm:focus:border-[rgb(var(--accent-rgb)/0.4)] sm:focus:ring-4 sm:focus:ring-[rgb(var(--accent-rgb)/0.1)]"
            />

            <button
              type="button"
              onClick={() => pickFile('file')}
              disabled={disabled}
              aria-label={t('messages.attachFile')}
              title={t('messages.attachFile')}
              className="order-3 sm:order-1 p-1 sm:p-2.5 rounded-full text-gray-400 hover:text-[var(--accent)] hover:bg-[rgb(var(--accent-rgb)/0.1)] dark:hover:bg-[rgb(var(--accent-rgb)/0.15)] transition disabled:opacity-40"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => pickFile('image')}
              disabled={disabled}
              aria-label={t('messages.attachImage')}
              title={t('messages.attachImage')}
              className="order-4 sm:order-2 p-1 sm:p-2.5 rounded-full text-gray-400 hover:text-[var(--accent)] hover:bg-[rgb(var(--accent-rgb)/0.1)] dark:hover:bg-[rgb(var(--accent-rgb)/0.15)] transition disabled:opacity-40"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
          </div>

          {/* ≥640 keeps the two separate buttons exactly as before. */}
          <button
            type="button"
            onClick={startRecording}
            disabled={disabled}
            aria-label={t('messages.recordVoice')}
            title={t('messages.recordVoice')}
            className="hidden sm:block p-2.5 rounded-full text-gray-400 hover:text-[var(--accent)] hover:bg-[rgb(var(--accent-rgb)/0.1)] dark:hover:bg-[rgb(var(--accent-rgb)/0.15)] transition disabled:opacity-40"
          >
            <Mic className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onSend}
            disabled={!canSend}
            aria-label={t('messages.send')}
            title={t('messages.send')}
            className="hidden sm:block p-3 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-light)] text-white shadow-lg shadow-[rgb(var(--accent-rgb)/0.3)] hover:scale-105 hover:shadow-[rgb(var(--accent-rgb)/0.4)] active:scale-95 transition disabled:opacity-40 disabled:shadow-none disabled:scale-100"
          >
            <Send className="w-5 h-5" />
          </button>

          {/* Phone: a single WhatsApp-style accent circle — mic while the
              field is empty, send once there is text. */}
          <button
            type="button"
            onClick={value.trim() ? onSend : startRecording}
            disabled={value.trim() ? !canSend : disabled}
            aria-label={value.trim() ? t('messages.send') : t('messages.recordVoice')}
            title={value.trim() ? t('messages.send') : t('messages.recordVoice')}
            className="sm:hidden p-2 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-light)] text-white shadow-lg shadow-[rgb(var(--accent-rgb)/0.3)] active:scale-95 transition disabled:opacity-40 disabled:shadow-none disabled:scale-100"
          >
            {value.trim() ? <Send className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
        </div>
      )}
    </div>
  );
}
