import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { MessageSquareQuote, Send, X } from 'lucide-react';
import { postApi } from '../api/postApi';

interface FeedbackDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Client-side feedback form: creates a regular post (status PENDING), so the
 * note lands in Admin → Posts ("Модератсияи постҳо") for approve/reject —
 * no separate backend needed, moderation is already wired there.
 */
export default function FeedbackDialog({ open, onClose }: FeedbackDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const mutation = useMutation({
    mutationFn: (data: { title: string; content: string }) => postApi.create(data),
    onSuccess: () => {
      toast.success(t('feedback.sent'));
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
      setTitle('');
      setContent('');
      onClose();
    },
    onError: (error) => {
      const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : t('feedback.error'));
    },
  });

  if (!open) return null;

  const canSubmit = title.trim().length > 0 && content.trim().length > 0;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit || mutation.isPending) return;
    mutation.mutate({ title: title.trim(), content: content.trim() });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('feedback.dialogTitle')}
        className="relative w-full max-w-lg bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden"
      >
        <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/10">
          <span className="w-9 h-9 rounded-xl bg-[rgb(var(--accent-rgb)/0.12)] text-[var(--accent)] flex items-center justify-center shrink-0">
            <MessageSquareQuote className="w-5 h-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              {t('feedback.dialogTitle')}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {t('feedback.dialogSubtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div>
            <label
              htmlFor="feedback-title"
              className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5"
            >
              {t('feedback.titleLabel')}
            </label>
            <input
              id="feedback-title"
              type="text"
              maxLength={255}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('feedback.titlePlaceholder')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition"
            />
          </div>

          <div>
            <label
              htmlFor="feedback-content"
              className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5"
            >
              {t('feedback.contentLabel')}
            </label>
            <textarea
              id="feedback-content"
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('feedback.contentPlaceholder')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition resize-none"
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-snug">
              {t('feedback.hint')}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition"
              >
                {t('feedback.cancel')}
              </button>
              <button
                type="submit"
                disabled={!canSubmit || mutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[rgb(var(--accent-rgb)/0.25)] transition"
              >
                <Send className="w-4 h-4" />
                {mutation.isPending ? t('feedback.sending') : t('feedback.send')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
