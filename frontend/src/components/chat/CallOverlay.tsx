import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, MicOff, PhoneOff, Video, VideoOff, Volume2, VolumeX } from 'lucide-react';
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
  const [speaker, setSpeaker] = useState(true);

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
    <div className="fixed inset-0 z-[95] flex flex-col bg-gradient-to-b from-[#121418] via-[#15171d] to-[#0d0e12]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[480px] h-[480px] rounded-full bg-[#FF6B35]/15 blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[420px] h-[240px] rounded-full bg-[#FF6B35]/10 blur-[100px]" />
      </div>

      <div className="relative flex items-center justify-between px-5 sm:px-8 h-16 shrink-0">
        <span className="flex items-center gap-2 text-sm font-semibold text-white/90">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#FF6B35] to-[#ff9162] text-white text-xs font-bold flex items-center justify-center">
            R
          </span>
          RentHub
        </span>
        <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-white/10 text-white/70 border border-white/10">
          {type === 'video' ? t('messages.videoCall') : t('messages.audioCall')}
        </span>
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="relative w-36 h-36 sm:w-44 sm:h-44">
          {!connected && (
            <span className="absolute inset-0 rounded-full bg-[#FF6B35]/30 animate-ping" />
          )}
          <span
            className={`absolute inset-2 rounded-full overflow-hidden bg-gradient-to-br from-[#FF6B35] to-[#ff9162] flex items-center justify-center text-white text-5xl sm:text-6xl font-bold ring-4 ring-[#FF6B35]/40 shadow-2xl shadow-orange-500/20 ${
              connected ? '' : 'animate-pulse'
            }`}
          >
            {avatar ? <img src={avatar} alt={name} className="w-full h-full object-cover" /> : initials || '?'}
          </span>
        </div>

        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">{name}</h2>
          <p className={`mt-2 text-base font-medium ${connected ? 'text-emerald-400' : 'text-gray-400'}`}>
            {connected ? formatDuration(seconds) : t('messages.connecting')}
          </p>
        </div>
      </div>

      <div className="relative pb-14 sm:pb-16 px-6 shrink-0">
        <div className="flex items-center justify-center gap-5 sm:gap-7">
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label={t('messages.mute')}
            title={t('messages.mute')}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition ${
              muted
                ? 'bg-white text-[#121418] hover:bg-white/90'
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
            }`}
          >
            {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          <button
            type="button"
            onClick={() => setVideoOn((v) => !v)}
            aria-label={t('messages.videoCall')}
            title={t('messages.videoCall')}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition ${
              videoOn
                ? 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                : 'bg-white text-[#121418] hover:bg-white/90'
            }`}
          >
            {videoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label={t('messages.endCall')}
            title={t('messages.endCall')}
            className="w-[68px] h-[68px] rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition shadow-xl shadow-red-500/40 active:scale-95"
          >
            <PhoneOff className="w-7 h-7" />
          </button>

          <button
            type="button"
            onClick={() => setSpeaker((s) => !s)}
            aria-label={t('messages.speaker')}
            title={t('messages.speaker')}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition ${
              speaker
                ? 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                : 'bg-white text-[#121418] hover:bg-white/90'
            }`}
          >
            {speaker ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </div>
  );
}
