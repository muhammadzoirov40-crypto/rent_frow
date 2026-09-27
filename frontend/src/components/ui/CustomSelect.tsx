import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

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
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
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
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm text-left transition
          border border-gray-200 dark:border-[#FF6B35]/30 bg-white dark:bg-[#2A2A3E] text-gray-900 dark:text-white
          hover:border-[#FF6B35]/60 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50
          disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 dark:disabled:bg-white/5
          ${isOpen ? 'border-[#FF6B35] ring-2 ring-[#FF6B35]/50' : ''}`}
      >
        <span className={!value ? 'text-gray-400' : ''}>{selectedLabel}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[#2A2A3E] border border-gray-200 dark:border-[#FF6B35]/30 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3.5 py-2.5 text-sm transition
                ${option.value === value
                  ? 'bg-[#FF6B35] text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-[#FF6B35]/10 dark:hover:bg-[#FF6B35]/20 hover:text-[#FF6B35] dark:hover:text-white'
                }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
