import React from "react";
import { MatchConfig, Player, formatClock, BufferPhase } from "@/lib/gameState";
import { Jersey } from "@/components/ui/Jersey";
import { BufferDisplay, BufferState } from "@/components/game/BufferDisplay";

interface Props {
  config: MatchConfig;
  scoreA: number;
  scoreB: number;
  clockSeconds: number;
  period: number;
  isRunning: boolean;
  activeA: Player[];
  activeB: Player[];
  benchA: Player[];
  benchB: Player[];
  bufferPhase: BufferPhase;
  bufferState: BufferState;
  bufferHint?: string;
  foulsA: number;
  foulsB: number;
  onClockToggle: () => void;
  onPrevPeriod?: () => void;
  onNextPeriod?: () => void;
  onTimeAdjust?: (amountSeconds: number) => void;
  onEndPeriod?: () => void;
}

function Roster({ players, color, align, dimmed }: { players: Player[]; color: string; align: "left" | "right", dimmed?: boolean }) {
  const sorted = [...players].sort((a, b) => parseInt(a.number) - parseInt(b.number));
  return (
    <div className={`flex flex-wrap gap-2 ${align === "right" ? "justify-end" : "justify-start"}`}>
      {sorted.map(p => (
        <Jersey
          key={p.id}
          number={p.number}
          name={p.name.split(" ")[0]}
          colorHex={color}
          size="sm"
          dimmed={dimmed}
        />
      ))}
    </div>
  );
}

export function Scoreboard({ 
  config, scoreA, scoreB, clockSeconds, period, isRunning, 
  activeA, activeB, benchA, benchB, 
  bufferPhase, bufferState, bufferHint,
  foulsA, foulsB,
  onClockToggle,
  onPrevPeriod,
  onNextPeriod,
  onTimeAdjust,
  onEndPeriod
}: Props) {
  let periodDisplay = "";
  if (period > config.totalPeriods) {
    periodDisplay = `OT${period - config.totalPeriods}`;
  } else {
    periodDisplay = `${config.totalPeriods === 4 ? "Q" : "H"}${period}`;
  }

  return (
    <div className=" border-4 border-slate-900 bg-white p-6" style={{ boxShadow: "6px 6px 0 #0f172a" }}>
      {/* Period + Clock */}
      <div className="grid grid-cols-3 items-center gap-6 mb-6">
        <div className="flex flex-col items-center gap-2 justify-start">
          <span className="font-fredoka text-xl font-black uppercase tracking-widest text-slate-500 text-center w-12">
            {periodDisplay}
          </span>
          {clockSeconds === 0 && !isRunning && onEndPeriod && (
            <button onClick={onEndPeriod} className="bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs px-2 py-1 uppercase border-2 border-amber-700 active:translate-y-px">
              End Period
            </button>
          )}
        </div>
        <div className="flex items-center justify-center gap-2 mx-auto">
          {!isRunning && onTimeAdjust && (
            <div className="flex flex-col gap-1">
              <button onClick={() => onTimeAdjust(60)} className="text-slate-300 hover:text-slate-500 px-2 leading-none text-2xl active:translate-y-px">▲</button>
              <button onClick={() => onTimeAdjust(-60)} className="text-slate-300 hover:text-slate-500 px-2 leading-none text-2xl active:translate-y-px">▼</button>
            </div>
          )}
          <button
            onClick={onClockToggle}
            className={`font-fredoka text-5xl font-black tracking-widest px-6 py-2 border-4 border-slate-900 transition-all
              ${isRunning
                ? "bg-slate-900 text-[#65d421] shadow-[4px_4px_0_#65d421]"
                : "bg-[#65d421] text-slate-900 shadow-[4px_4px_0_#0f172a]"
              }`}
          >
            {formatClock(clockSeconds)}
          </button>
          {!isRunning && onTimeAdjust && (
            <div className="flex flex-col gap-1">
              <button onClick={() => onTimeAdjust(1)} className="text-slate-300 hover:text-slate-500 px-2 leading-none text-2xl active:translate-y-px">▲</button>
              <button onClick={() => onTimeAdjust(-1)} className="text-slate-300 hover:text-slate-500 px-2 leading-none text-2xl active:translate-y-px">▼</button>
            </div>
          )}
        </div>
        <span className="font-nunito text-sm font-bold text-slate-400 uppercase tracking-widest text-right">
          {isRunning ? "▶ LIVE" : "⏸ PAUSED"}
        </span>
      </div>

      {/* Scores and Buffer */}
      <div className="grid grid-cols-3 items-center gap-4 mb-6">
        <div className="flex flex-col items-start">
          <div className="flex gap-1 mb-1 h-6">
            {Array.from({ length: Math.min(foulsA, 5) }).map((_, i) => (
              <span key={i} className="text-lg leading-none">🚨</span>
            ))}
          </div>
          <span
            className={`font-fredoka text-2xl font-black uppercase tracking-widest px-3 py-1 text-${config.teamA.colorHex == '#ffffff' ? 'black' : 'white'} border-2 border-slate-900`}
            style={{ backgroundColor: config.teamA.colorHex }}
          >
            {config.teamA.name}
          </span>
          <span className="font-fredoka text-7xl font-black text-slate-900 leading-none mt-2">
            {scoreA}
          </span>
        </div>

        <div className="flex flex-col items-center w-full min-h-[160px]">
          <BufferDisplay 
            bufferPhase={bufferPhase} 
            state={bufferState} 
            config={config} 
            activeA={activeA} 
            activeB={activeB}
            hint={bufferHint}
          />
        </div>

        <div className="flex flex-col items-end">
          <div className="flex gap-1 mb-1 h-6 justify-end">
            {Array.from({ length: Math.min(foulsB, 5) }).map((_, i) => (
              <span key={i} className="text-lg leading-none">🚨</span>
            ))}
          </div>
          <span
            className="font-fredoka text-2xl font-black uppercase tracking-widest px-3 py-1 text-white border-2 border-slate-900"
            style={{ backgroundColor: config.teamB.colorHex }}
          >
            {config.teamB.name}
          </span>
          <span className="font-fredoka text-7xl font-black text-slate-900 leading-none mt-2 text-right">
            {scoreB}
          </span>
        </div>
      </div>

      {/* Rosters */}
      <div className="grid grid-cols-2 gap-4 border-t-2 border-slate-200 pt-4">
        <div className="flex flex-col gap-2">
          <Roster players={activeA} color={config.teamA.colorHex} align="left" />
          <Roster players={benchA} color={config.teamA.colorHex} align="left" dimmed />
        </div>
        <div className="flex flex-col gap-2">
          <Roster players={activeB} color={config.teamB.colorHex} align="right" />
          <Roster players={benchB} color={config.teamB.colorHex} align="right" dimmed />
        </div>
      </div>
    </div>
  );
}
