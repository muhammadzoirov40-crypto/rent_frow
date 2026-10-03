export type AttachmentKind = 'image' | 'file' | 'voice';

/**
 * Marker RentHub puts in front of its own lines in a chat (request sent,
 * accepted, rejected, cancelled). Mirrors `SYSTEM_PREFIX` in
 * `app/services/system_message.py` — keep both copies in sync.
 */
export const SYSTEM_PREFIX = '[system]';

export function isSystemMessage(content: string | null | undefined): boolean {
  return !!content && content.startsWith(SYSTEM_PREFIX);
}

export function stripSystemPrefix(content: string | null | undefined): string {
  if (!content) return '';
  return isSystemMessage(content) ? content.slice(SYSTEM_PREFIX.length).trimStart() : content;
}

export interface Attachment {
  kind: AttachmentKind;
  url: string;
  name?: string;
  size?: number;
  duration?: number;
}

export type ParsedContent = { kind: 'text'; text: string } | Attachment;

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|bmp|avif)(\?|$)/i;

export function parseContent(content: string): ParsedContent {
  const raw = (content || '').trim();
  if (!raw) return { kind: 'text', text: '' };

  if (raw.startsWith('{') || raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed === 'object' &&
        typeof parsed.url === 'string' &&
        ['image', 'file', 'voice'].includes(parsed.kind)
      ) {
        return {
          kind: parsed.kind,
          url: parsed.url,
          name: typeof parsed.name === 'string' ? parsed.name : undefined,
          size: typeof parsed.size === 'number' ? parsed.size : undefined,
          duration: typeof parsed.duration === 'number' ? parsed.duration : undefined,
        };
      }
    } catch {
      // not an envelope — fall through to plain text
    }
  }

  if (/^https?:\/\/\S+$/i.test(raw) && IMAGE_EXT.test(raw.split('?')[0])) {
    return { kind: 'image', url: raw };
  }

  return { kind: 'text', text: raw };
}

export function formatBytes(size?: number): string {
  if (!size || size <= 0) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
