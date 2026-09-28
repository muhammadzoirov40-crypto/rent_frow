import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { formatDuration } from './messageContent';

interface VoicePlayerProps {
  url: string;
  duration?: number;
  mine: boolean;
}

export default function VoicePlayer({ url, duration, mine }: VoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(duration || 0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoaded = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setTotal(audio.duration);
      }
    };
    const onEnded = () => setPlaying(false);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('ended', onEnded);
    };
  }, [url]);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      try {
        await audio.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const track = trackRef.current;
    if (!audio || !track || !total) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * total;
    setCurrent(audio.currentTime);
  };

  const progress = total > 0 ? Math.min(100, (current / total) * 100) : 0;

  return (
    <div className="flex items-center gap-3 min-w-[220px] py-0.5">
      <audio ref={audioRef} src={url} preload="metadata" onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)} />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause' : 'Play'}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition ${
          mine
            ? 'bg-white/20 text-white hover:bg-white/30'
            : 'bg-[#FF6B35] text-white hover:bg-[#e55a2b]'
        }`}
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 translate-x-[1px]" />}
      </button>

      <div className="flex-1">
        <div
          ref={trackRef}
          onClick={seek}
          className={`h-1.5 rounded-full cursor-pointer ${mine ? 'bg-white/25' : 'bg-gray-200 dark:bg-white/15'}`}
        >
          <div
            className={`h-full rounded-full transition-[width] duration-150 ${mine ? 'bg-white' : 'bg-[#FF6B35]'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className={`text-[10px] mt-1 ${mine ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'}`}>
          {formatDuration(current)} / {formatDuration(total)}
        </p>
      </div>
    </div>
  );
}
