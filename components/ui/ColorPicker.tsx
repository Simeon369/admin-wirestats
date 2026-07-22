import React from 'react';

export const TEAM_COLORS = [
  { id: 'red', name: 'Red', hex: '#ef4444' },
  { id: 'orange', name: 'Orange', hex: '#f97316' },
  { id: 'yellow', name: 'Yellow', hex: '#eab308' },
  { id: 'green', name: 'Green', hex: '#22c55e' },
  { id: 'cyan', name: 'Cyan', hex: '#06b6d4' },
  { id: 'blue', name: 'Blue', hex: '#3b82f6' },
  { id: 'purple', name: 'Purple', hex: '#a855f7' },
  { id: 'pink', name: 'Pink', hex: '#ec4899' },
  { id: 'brown', name: 'Brown', hex: '#92400e' },
  { id: 'gray', name: 'Gray', hex: '#64748b' },
  { id: 'black', name: 'Black', hex: '#1e293b' },
  { id: 'white', name: 'White', hex: '#ffffff' },
];

interface ColorPickerProps {
  label?: string;
  selectedColorId?: string;
  onChange: (colorId: string) => void;
  className?: string;
}

export function ColorPicker({ label, selectedColorId, onChange, className = '' }: ColorPickerProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label className="font-fredoka font-medium text-slate-900 tracking-wide text-lg">
          {label}
        </label>
      )}
      <div className="grid grid-cols-6 gap-3 w-full">
        {TEAM_COLORS.map((color) => {
          const isSelected = selectedColorId === color.id;
          return (
            <button
              key={color.id}
              type="button"
              onClick={() => onChange(color.id)}
              className={`
                relative w-12 h-12  border-2 border-slate-900 
                transition-transform active:scale-95
                ${isSelected 
                  ? 'shadow-[1px_1px_0_#0f172a,2px_2px_0_#0f172a,3px_3px_0_#0f172a,4px_4px_0_#0f172a,5px_5px_0_#0f172a,6px_6px_0_#0f172a] scale-110 z-10 -translate-y-1 -translate-x-1' 
                  : 'shadow-[1px_1px_0_#0f172a,2px_2px_0_#0f172a,3px_3px_0_#0f172a,4px_4px_0_#0f172a] hover:scale-105 active:shadow-[1px_1px_0_#0f172a,2px_2px_0_#0f172a] active:translate-y-px active:translate-x-px'}
              `}
              style={{ backgroundColor: color.hex }}
              title={color.name}
              aria-label={`Select ${color.name} color`}
            >
              {isSelected && (
                <span
                  className={`absolute inset-0 flex items-center justify-center ${color.id === 'white' ? 'text-black' : 'text-white'} text-2xl font-bold`}
                >
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
