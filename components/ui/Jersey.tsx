// components/ui/Jersey.tsx
import React from "react";

interface JerseyProps {
  number: string;
  colorHex: string;
  name?: string;
  size?: "sm" | "md" | "lg";
  selected?: boolean;   // shows a ✓ badge (for Starting 5 selector)
  dimmed?: boolean;     // reduced opacity (for unselected/inactive)
  onRemove?: () => void; // shows X button on hover (for roster builder)
  onClick?: () => void;
  className?: string;
}

const sizeMap = {
  sm: {
    jersey:  "w-10 h-11",
    collar:  "w-4 h-1.5",
    number:  "text-sm",
    name:    "text-[9px] max-w-[40px]",
    shadow:  "shadow-[1px_1px_0_#0f172a,2px_2px_0_#0f172a]",
    badge:   "w-3.5 h-3.5 text-[8px]",
  },
  md: {
    jersey:  "w-12 h-14",
    collar:  "w-5 h-2",
    number:  "text-lg",
    name:    "text-xs max-w-[48px]",
    shadow:  "shadow-[1px_1px_0_#0f172a,2px_2px_0_#0f172a,3px_3px_0_#0f172a,4px_4px_0_#0f172a]",
    badge:   "w-4 h-4 text-[9px]",
  },
  lg: {
    jersey:  "w-16 h-18",
    collar:  "w-6 h-2.5",
    number:  "text-2xl",
    name:    "text-sm max-w-[64px]",
    shadow:  "shadow-[1px_1px_0_#0f172a,2px_2px_0_#0f172a,3px_3px_0_#0f172a,4px_4px_0_#0f172a,5px_5px_0_#0f172a,6px_6px_0_#0f172a]",
    badge:   "w-5 h-5 text-xs",
  },
};

export function Jersey({
  number,
  colorHex,
  name,
  size = "md",
  selected,
  dimmed,
  onRemove,
  onClick,
  className = "",
}: JerseyProps) {
  const s = sizeMap[size];
  const isClickable = !!onClick || !!onRemove;

  return (
    <div
      className={`flex flex-col items-center group relative ${dimmed ? "opacity-40" : ""} ${className}`}
      onClick={onClick}
      style={isClickable ? { cursor: "pointer" } : undefined}
    >
      {/* Remove button */}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full border-2 border-slate-900 font-bold opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center justify-center text-xs"
          title="Remove Player"
        >
          ✕
        </button>
      )}

      {/* Selected badge */}
      {selected && (
        <span
          className={`absolute -top-1 -right-1 ${s.badge} bg-[#65d421] border border-slate-900 rounded-full flex items-center justify-center font-black text-white z-10`}
        >
          ✓
        </span>
      )}

      {/* Jersey body */}
      <div
        className={`
          ${s.jersey} ${s.shadow}
          rounded-t-xl rounded-b-sm border-2 border-slate-900
          flex items-center justify-center relative overflow-hidden
          transition-transform
          ${onClick ? "hover:scale-105 active:scale-95" : ""}
          ${selected ? "scale-110" : ""}
        `}
        style={{ backgroundColor: colorHex }}
      >
        {/* Collar notch */}
        <div
          className={`absolute top-0 ${s.collar} bg-white rounded-b-full border-b-2 border-l-2 border-r-2 border-slate-900`}
        />
        {/* Number */}
        <span
          className={`font-fredoka font-black text-white ${s.number} z-10`}
          style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
        >
          {number}
        </span>
      </div>

      {/* Name label */}
      {name !== undefined && (
        <span
          className={`font-nunito font-bold text-slate-800 text-center leading-tight truncate w-full px-1 mt-1 ${s.name}`}
        >
          {name}
        </span>
      )}
    </div>
  );
}
