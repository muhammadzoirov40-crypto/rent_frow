import { useEffect, useRef, useState } from 'react';
import useAuthStore from '../../store/authStore';

export interface ChatSocketEvent {
  type?: string;
  event?: string;
  [key: string]: unknown;
}

/**
 * WebSocket realtime hook for the chat.
 * Connects to /api/v1/ws/{user_id}?token=..., auto-reconnects with backoff
 * and dispatches parsed events to the given handler (kept in a ref so the
 * consumer can use fresh closures without re-establishing the socket).
 */
export function useChatSocket(onEvent: (event: ChatSocketEvent) => void) {
  const { user, token } = useAuthStore();
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user?.id || !token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/api/v1/ws/${user.id}?token=${encodeURIComponent(token)}`;

    let ws: WebSocket | null = null;
    let closed = false;
    let retryTimer: number | undefined;
    let retryDelay = 2000;

    const connect = () => {
      if (closed) return;
      try {
        ws = new WebSocket(url);
      } catch {
        retryTimer = window.setTimeout(connect, retryDelay);
        return;
      }

      ws.onopen = () => {
        retryDelay = 2000;
        setConnected(true);
      };
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data as string);
          handlerRef.current(data);
        } catch {
          // ignore malformed frames
        }
      };
      ws.onerror = () => ws?.close();
      ws.onclose = () => {
        setConnected(false);
        if (!closed) {
          retryTimer = window.setTimeout(connect, retryDelay);
          retryDelay = Math.min(retryDelay * 2, 15000);
        }
      };
    };

    connect();
    return () => {
      closed = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      ws?.close();
    };
  }, [user?.id, token]);

  return connected;
}

export default useChatSocket;
