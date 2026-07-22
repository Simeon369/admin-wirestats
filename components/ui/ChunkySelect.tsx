import React, { useState, useRef, useEffect } from 'react';

interface ChunkySelectProps {
  label?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  fullWidth?: boolean;
  direction?: 'up' | 'down';
}

export function ChunkySelect({ label, value, options, onChange, fullWidth = false, direction = 'down' }: ChunkySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find(o => o.value === value)?.label || 'Select...';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`flex flex-col gap-1 relative ${fullWidth ? 'w-full' : ''}`} ref={containerRef}>
      {label && (
        <label className="font-fredoka font-medium text-slate-900 tracking-wide text-lg">
          {label}
        </label>
      )}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between
          border-2 border-slate-900 
          shadow-[1px_1px_0_#0f172a,2px_2px_0_#0f172a,3px_3px_0_#0f172a,4px_4px_0_#0f172a,5px_5px_0_#0f172a,6px_6px_0_#0f172a]
          px-4 py-3 
          font-nunito text-lg font-medium text-slate-900 bg-white
          focus:outline-none focus:bg-slate-50
          transition-colors text-left
        `}
      >
        <span>{selectedLabel}</span>
        <span className="font-bold text-sm ml-2">▼</span>
      </button>

      {isOpen && (
        <div className={`absolute ${direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'} w-full z-50 bg-white border-2 border-slate-900 shadow-[1px_1px_0_#0f172a,2px_2px_0_#0f172a,3px_3px_0_#0f172a,4px_4px_0_#0f172a,5px_5px_0_#0f172a,6px_6px_0_#0f172a] flex flex-col max-h-60 overflow-y-auto`}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`
                text-left px-4 py-3 font-nunito text-lg font-medium text-slate-900
                hover:bg-slate-100 transition-colors border-b-2 border-slate-100 last:border-b-0
                ${value === option.value ? 'bg-slate-200 hover:bg-slate-200' : ''}
              `}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
