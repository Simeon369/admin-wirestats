// components/game/BufferDisplay.tsx
"use client";

import React from "react";

export type BufferState = "idle" | "building" | "team-selected" | "action-ready" | "error";

interface Props {
  buffer: string;
  state: BufferState;
  hint?: string;
}

const stateStyles: Record<BufferState, string> = {
  idle: "border-slate-300 bg-slate-50 text-slate-400",
  building: "border-slate-900 bg-white text-slate-900",
  "team-selected": "border-blue-500 bg-blue-50 text-blue-900",
  "action-ready": "border-[#1b630a] bg-[#f0fde8] text-[#1b630a]",
  error: "border-red-500 bg-red-50 text-red-700 animate-shake",
};

export function BufferDisplay({ buffer, state, hint }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className={`flex items-center gap-3 px-6 py-4 border-4 transition-all font-mono ${stateStyles[state]}`}
        style={{ boxShadow: state === "error" ? "4px 4px 0 #ef4444" : "4px 4px 0 #0f172a" }}
      >
        <span className="font-fredoka text-lg font-bold uppercase tracking-wider opacity-50">⌨</span>
        <span className="font-fredoka text-3xl font-black tracking-widest min-w-[6ch]">
          {buffer || (state === "idle" ? "READY" : "...")}
        </span>
        {hint && (
          <span className="ml-auto font-nunito text-sm font-semibold opacity-70">{hint}</span>
        )}
      </div>

      <div className="flex gap-3 flex-wrap font-nunito text-xs text-slate-500 font-semibold">
        <span className="px-2 py-1 bg-slate-100 border border-slate-300">
          <kbd className="font-mono">←/→</kbd> Team
        </span>
        <span className="px-2 py-1 bg-slate-100 border border-slate-300">
          <kbd className="font-mono">2</kbd>/<kbd className="font-mono">3</kbd>/<kbd className="font-mono">f</kbd> Score/Foul
        </span>
        <span className="px-2 py-1 bg-slate-100 border border-slate-300">
          <kbd className="font-mono">x</kbd> Sub
        </span>
        <span className="px-2 py-1 bg-slate-100 border border-slate-300">
          <kbd className="font-mono">↵ Enter</kbd> Commit
        </span>
        <span className="px-2 py-1 bg-slate-100 border border-slate-300">
          <kbd className="font-mono">Space</kbd> Clock
        </span>
        <span className="px-2 py-1 bg-slate-100 border border-slate-300">
          <kbd className="font-mono">Esc</kbd> Clear
        </span>
        <span className="px-2 py-1 bg-slate-100 border border-slate-300">
          <kbd className="font-mono">Ctrl+Z</kbd> Undo
        </span>
      </div>
    </div>
  );
}
