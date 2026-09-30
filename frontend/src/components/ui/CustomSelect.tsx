import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  buttonClassName?: string;
}

const DEFAULT_BUTTON_CLS = `w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm text-left transition
          border border-gray-200 dark:border-[#FF6B35]/30 bg-white dark:bg-[#2A2A3E] text-gray-900 dark:text-white
          hover:border-[#FF6B35]/60 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50
          disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 dark:disabled:bg-white/5`;

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  buttonClassName,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label || placeholder || '';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative w-full min-w-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`${buttonClassName ?? DEFAULT_BUTTON_CLS} ${
          isOpen ? 'border-[#FF6B35] ring-2 ring-[#FF6B35]/40' : ''
        }`}
      >
        <span className={`truncate ${!value ? 'text-gray-400 dark:text-gray-500' : ''}`}>{selectedLabel}</span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full min-w-[11rem] mt-1.5 p-1.5 bg-white dark:bg-[#1e222b] border border-gray-200/80 dark:border-white/10 rounded-2xl shadow-[0_20px_60px_-15px_rgba(16,24,40,0.4)] max-h-60 overflow-y-auto">
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 text-left px-3.5 py-2.5 rounded-xl text-sm transition ${
                  active
                    ? 'bg-gradient-to-r from-[#FF6B35] to-[#ff8a5b] text-white font-semibold shadow-sm shadow-orange-500/30'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-[#FF6B35]/10 dark:hover:bg-[#FF6B35]/15 hover:text-[#FF6B35] dark:hover:text-white'
                }`}
              >
                <span className="truncate">{option.label}</span>
                {active && <Check className="w-4 h-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
