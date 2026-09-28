import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react';
import { formatDuration } from './messageContent';

export type CallType = 'audio' | 'video';

interface CallOverlayProps {
  type: CallType;
  name: string;
  avatar?: string | null;
  onClose: () => void;
}

export default function CallOverlay({ type, name, avatar, onClose }: CallOverlayProps) {
  const { t } = useTranslation();
  const [connected, setConnected] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [videoOn, setVideoOn] = useState(type === 'video');

  useEffect(() => {
    const connectTimer = window.setTimeout(() => setConnected(true), 1500);
    return () => window.clearTimeout(connectTimer);
  }, []);

  useEffect(() => {
    if (!connected) return;
    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [connected]);

  const initials = name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-[95] bg-[#121418]/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-3xl bg-[#1a1d24] border border-white/10 shadow-2xl p-8 text-center">
        <div className="relative mx-auto w-28 h-28">
          <div
            className={`absolute inset-0 rounded-full bg-[#FF6B35]/30 ${connected ? '' : 'animate-ping'}`}
          />
          <div className="absolute inset-1 rounded-full overflow-hidden bg-gradient-to-br from-[#FF6B35] to-[#ff9162] flex items-center justify-center text-white text-3xl font-bold ring-4 ring-[#FF6B35]/40">
            {avatar ? <img src={avatar} alt={name} className="w-full h-full object-cover" /> : initials || '?'}
          </div>
        </div>

        <h3 className="mt-5 text-white text-xl font-semibold">{name}</h3>
        <p className={`mt-1 text-sm ${connected ? 'text-emerald-400' : 'text-gray-400'}`}>
          {connected ? formatDuration(seconds) : t('messages.connecting')}
        </p>

        <div className="mt-7 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label={t('messages.mute')}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition ${
              muted ? 'bg-white/20 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label={t('messages.endCall')}
            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition shadow-lg shadow-red-500/30"
          >
            <PhoneOff className="w-6 h-6" />
          </button>

          <button
            type="button"
            onClick={() => setVideoOn((v) => !v)}
            aria-label={t('messages.videoCall')}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition ${
              videoOn ? 'bg-white/20 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            {videoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>
        </div>

        <p className="mt-6 text-xs text-gray-500">
          {type === 'video' ? t('messages.videoCall') : t('messages.audioCall')}
        </p>
      </div>
    </div>
  );
}
