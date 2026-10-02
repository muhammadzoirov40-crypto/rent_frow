import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import { ai, type AIMessageTurn } from '../../api';
import AIChatMessage, { type ChatMessage } from './AIChatMessage';

const STORAGE_KEY = 'rentthub_ai_chat';
/** How many past turns are echoed back to the agent as context. */
const HISTORY_LIMIT = 12;
/** Hard cap on what we keep in localStorage. */
const STORED_LIMIT = 40;

function loadMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(-STORED_LIMIT) as ChatMessage[];
  } catch {
    return [];
  }
}

function statusOf(err: unknown): number | undefined {
  const response = (err as { response?: { status?: number } } | null)?.response;
  return response?.status;
}

export default function AssistantWidget() {
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Fresh conversations open with a greeting.
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ role: 'assistant', content: t('assistant.welcome') }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-STORED_LIMIT)));
    } catch {
      /* storage full — conversation simply won't persist */
    }
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const suggestions = [
    'assistant.sugApartment',
    'assistant.sugCar',
    'assistant.sugCheapest',
    'assistant.sugExplore',
  ].map((key) => t(key));

  const fresh = messages.length <= 1;

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || busy) return;

    setInput('');
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setBusy(true);

    const history: AIMessageTurn[] = messages
      .slice(-HISTORY_LIMIT)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await ai.chat(text, history);
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply, listings: res.listings }]);
    } catch (err) {
      const status = statusOf(err);
      if (status === 503) setError(t('assistant.notConfigured'));
      else if (status === 502) setError(t('assistant.unavailable'));
      else if (status === 429) setError(t('assistant.rateLimited'));
      else setError(t('assistant.error'));
    } finally {
      setBusy(false);
    }
  };

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: t('assistant.welcome') }]);
    setError(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <>
      {/* Floating launcher */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('assistant.title')}
        className={`fixed z-50 right-4 sm:right-6 bottom-24 md:bottom-6 w-14 h-14 rounded-full flex items-center justify-center text-white transition-all duration-200 shadow-xl shadow-[rgb(var(--accent-rgb)/0.35)] hover:scale-105 active:scale-95 ${
          open ? 'bg-gray-700 dark:bg-white/15' : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)]'
        }`}
      >
        {open ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
        {!open && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0a0a1a]" />
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed z-50 right-3 sm:right-6 bottom-40 md:bottom-24 w-[calc(100vw-1.5rem)] sm:w-[400px] max-w-[400px] h-[min(560px,64vh)] flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-[#0f0f1e] border border-gray-200 dark:border-white/10 shadow-2xl shadow-black/30">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-white/10 bg-[rgb(var(--accent-rgb)/0.08)]">
            <div className="w-9 h-9 shrink-0 rounded-full bg-[var(--accent)] flex items-center justify-center shadow-md shadow-[rgb(var(--accent-rgb)/0.35)]">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#1A1A2E] dark:text-white truncate">
                {t('assistant.title')}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                {t('assistant.subtitle')}
              </p>
            </div>
            <button
              type="button"
              onClick={clearChat}
              aria-label={t('assistant.clear')}
              title={t('assistant.clear')}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-[var(--accent)] hover:bg-white dark:hover:bg-white/10 transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t('assistant.close')}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-white dark:hover:bg-white/10 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-4 scroll-smooth">
            {messages.map((m, i) => (
              <AIChatMessage key={`${i}-${m.role}`} message={m} />
            ))}

            {busy && (
              <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 pl-9">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce [animation-delay:300ms]" />
                </span>
                {t('assistant.thinking')}
              </div>
            )}

            {fresh && !busy && (
              <div className="flex flex-wrap gap-2 pt-1">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="text-xs px-3 py-1.5 rounded-full border border-[var(--accent)]/40 text-[var(--accent)] bg-[rgb(var(--accent-rgb)/0.07)] hover:bg-[var(--accent)] hover:text-white transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Error banner */}
          {error && (
            <div className="px-4 py-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-t border-red-100 dark:border-red-500/20">
              {error}
            </div>
          )}

          {/* Composer */}
          <div className="px-3 py-3 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={t('assistant.placeholder')}
                className="flex-1 resize-none max-h-24 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0a0a1a] px-3 py-2.5 text-sm text-[#1A1A2E] dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[var(--accent)] transition"
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={busy || !input.trim()}
                aria-label={t('assistant.send')}
                className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition shadow-md shadow-[rgb(var(--accent-rgb)/0.3)]"
              >
                {busy ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-gray-400 dark:text-gray-500 text-center">
              {t('assistant.disclaimer')}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
