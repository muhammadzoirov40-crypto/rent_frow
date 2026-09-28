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
import { formatDuration } from './messageContent';

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
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  onAttach,
  onVoice,
  disabled = false,
  sending = false,
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

  const [emojiOpen, setEmojiOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
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
        const duration = seconds;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (blob.size > 0 && duration > 0) onVoice(blob, duration);
      };

      recorder.start();
      setSeconds(0);
      setRecording(true);
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
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
      setSeconds(0);
      return;
    }
    recorder?.stop();
    setSeconds(0);
  };

  const canSend = Boolean(value.trim()) && !sending && !disabled;

  return (
    <div className="relative px-3 sm:px-4 py-3 bg-white dark:bg-[#1a1d24] border-t border-gray-200 dark:border-white/10">
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
            className="p-2.5 rounded-xl bg-[#FF6B35] text-white hover:bg-[#e55a2b] transition shadow-lg shadow-orange-500/25"
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
            className="p-2.5 rounded-xl text-gray-500 hover:text-[#FF6B35] hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10 transition disabled:opacity-40"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => pickFile('image')}
            disabled={disabled}
            aria-label={t('messages.attachImage')}
            title={t('messages.attachImage')}
            className="p-2.5 rounded-xl text-gray-500 hover:text-[#FF6B35] hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10 transition disabled:opacity-40"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setEmojiOpen((o) => !o)}
            disabled={disabled}
            aria-label={t('messages.emoji')}
            title={t('messages.emoji')}
            className={`p-2.5 rounded-xl transition disabled:opacity-40 ${
              emojiOpen
                ? 'text-[#FF6B35] bg-orange-500/10'
                : 'text-gray-500 hover:text-[#FF6B35] hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10'
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
            className="flex-1 min-w-0 resize-none max-h-[150px] rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-[#FF6B35]/60 focus:ring-2 focus:ring-[#FF6B35]/15 transition"
          />

          <button
            type="button"
            onClick={startRecording}
            disabled={disabled}
            aria-label={t('messages.recordVoice')}
            title={t('messages.recordVoice')}
            className="p-2.5 rounded-xl text-gray-500 hover:text-[#FF6B35] hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10 transition disabled:opacity-40"
          >
            <Mic className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onSend}
            disabled={!canSend}
            aria-label={t('messages.send')}
            title={t('messages.send')}
            className="p-2.5 rounded-xl bg-[#FF6B35] text-white hover:bg-[#e55a2b] transition shadow-lg shadow-orange-500/25 disabled:opacity-40 disabled:shadow-none"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
