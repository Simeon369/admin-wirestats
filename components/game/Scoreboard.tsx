import React from "react";
import { MatchConfig, Player, formatClock } from "@/lib/gameState";
import { Jersey } from "@/components/ui/Jersey";

interface Props {
  config: MatchConfig;
  scoreA: number;
  scoreB: number;
  clockSeconds: number;
  period: number;
  isRunning: boolean;
  activeA: Player[];
  activeB: Player[];
  onClockToggle: () => void;
}

function ActiveRoster({ players, color, align }: { players: Player[]; color: string; align: "left" | "right" }) {
  const sorted = [...players].sort((a, b) => parseInt(a.number) - parseInt(b.number));
  return (
    <div className={`flex gap-2 ${align === "right" ? "justify-end" : "justify-start"}`}>
      {sorted.map(p => (
        <Jersey
          key={p.id}
          number={p.number}
          name={p.name.split(" ")[0]}
          colorHex={color}
          size="sm"
        />
      ))}
    </div>
  );
}

export function Scoreboard({ config, scoreA, scoreB, clockSeconds, period, isRunning, activeA, activeB, onClockToggle }: Props) {
  const periodLabel = config.totalPeriods === 4 ? "Q" : "H";

  return (
    <div className="w-full border-4 border-slate-900 bg-white p-6" style={{ boxShadow: "6px 6px 0 #0f172a" }}>
      {/* Period + Clock */}
      <div className="flex items-center justify-center gap-6 mb-6">
        <span className="font-fredoka text-xl font-black uppercase tracking-widest text-slate-500">
          {periodLabel}{period}
        </span>
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
        <span className="font-nunito text-sm font-bold text-slate-400 uppercase tracking-widest">
          {isRunning ? "▶ LIVE" : "⏸ PAUSED"}
        </span>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-3 items-center gap-4 mb-6">
        <div className="flex flex-col items-start">
          <span
            className="font-fredoka text-2xl font-black uppercase tracking-widest px-3 py-1 text-white border-2 border-slate-900"
            style={{ backgroundColor: config.teamA.colorHex }}
          >
            {config.teamA.name}
          </span>
          <span className="font-fredoka text-7xl font-black text-slate-900 leading-none mt-2">
            {scoreA}
          </span>
        </div>

        <div className="flex flex-col items-center">
          <span className="font-fredoka text-4xl font-black text-slate-300">—</span>
        </div>

        <div className="flex flex-col items-end">
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

      {/* Active Rosters */}
      <div className="grid grid-cols-2 gap-4 border-t-2 border-slate-200 pt-4">
        <ActiveRoster players={activeA} color={config.teamA.colorHex} align="left" />
        <ActiveRoster players={activeB} color={config.teamB.colorHex} align="right" />
      </div>
    </div>
  );
}
