import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ImagePlus, Loader2, MessageSquareQuote, Send, X } from 'lucide-react';
import { postApi } from '../api/postApi';

interface FeedbackDialogProps {
  open: boolean;
  onClose: () => void;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB — mirrors the backend limit

const errorDetail = (error: unknown): string | null => {
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof detail === 'string' ? detail : null;
};

/**
 * Client-side feedback form: creates a regular post (status PENDING), so the
 * note lands in Admin → Posts ("Модератсияи постҳо") for approve/reject —
 * no separate backend needed, moderation is already wired there.
 *
 * Images go through POST /posts/upload-image; the post stores the durable
 * `image_key` (the presigned `image_url` only lasts 24h and is re-signed on
 * every read by `_post_to_response`).
 */
export default function FeedbackDialog({ open, onClose }: FeedbackDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const resetImage = () => {
    setImgPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setImageKey(null);
  };

  const mutation = useMutation({
    mutationFn: (data: { title: string; content: string; image_url?: string }) => postApi.create(data),
    onSuccess: () => {
      toast.success(t('feedback.sent'));
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
      setTitle('');
      setContent('');
      resetImage();
      onClose();
    },
    onError: (error) => {
      toast.error(errorDetail(error) ?? t('feedback.error'));
    },
  });

  const handleImage = async (file: File) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error(t('feedback.imageTypeError'));
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error(t('feedback.imageTooLarge'));
      return;
    }
    const preview = URL.createObjectURL(file);
    resetImage(); // replace a previous pick (revokes its object URL)
    setImgPreview(preview);
    setUploading(true);
    try {
      const res = await postApi.uploadImage(file);
      setImageKey(res.data.data.image_key);
    } catch (error) {
      toast.error(errorDetail(error) ?? t('feedback.imageUploadError'));
      setImgPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setImageKey(null);
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  const canSubmit = title.trim().length > 0 && content.trim().length > 0 && !uploading && !mutation.isPending;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    mutation.mutate({
      title: title.trim(),
      content: content.trim(),
      ...(imageKey ? { image_url: imageKey } : {}),
    });
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

          {/* Optional photo: uploaded right away, stored as the durable key */}
          <div className="flex items-center gap-3">
            {!imgPreview && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-dashed border-gray-300 dark:border-white/15 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:border-[var(--accent)] hover:text-[var(--accent)] transition disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                {uploading ? t('feedback.imageUploading') : t('feedback.addImage')}
              </button>
            )}
            {imgPreview && (
              <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 shrink-0">
                <img src={imgPreview} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={resetImage}
                  aria-label={t('feedback.removeImage')}
                  disabled={uploading}
                  className="absolute top-0.5 right-0.5 p-1 rounded-md bg-black/60 text-white hover:bg-black/80 transition disabled:opacity-50"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {uploading && <span className="text-xs text-gray-400">{t('feedback.imageUploading')}</span>}
            <input
              ref={fileRef}
              type="file"
              accept={ALLOWED_IMAGE_TYPES.join(',')}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void handleImage(file);
              }}
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
                disabled={!canSubmit}
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
