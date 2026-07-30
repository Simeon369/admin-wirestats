import React from "react";
import { TeamConfig, Player } from "@/lib/gameState";
import { Jersey } from "@/components/ui/Jersey";

interface Props {
  team: "A" | "B";
  config: TeamConfig;
  selected: Player[];
  onToggle: (player: Player) => void;
}

export function StartingFiveSelector({ team, config, selected, onToggle }: Props) {
  const selectedIds = new Set(selected.map(p => p.id));
  const sorted = [...config.players].sort((a, b) => parseInt(a.number) - parseInt(b.number));
  const count = selected.length;

  return (
    <div className="flex flex-col gap-5 p-5 border-4 border-slate-700 bg-slate-800 shadow-[6px_6px_0_#0f172a]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-fredoka text-2xl font-black uppercase tracking-wider text-white leading-tight">
            Team {team}
          </h2>
          <p className="font-nunito text-sm font-bold text-slate-400 uppercase tracking-widest">
            {config.name}
          </p>
        </div>

        {/* Counter badge */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 border-4 font-fredoka font-black text-lg transition-all ${
            count === 5
              ? "bg-[#65d421] border-[#1b630a] text-slate-900 shadow-[3px_3px_0_#1b630a]"
              : "bg-slate-900 border-slate-600 text-slate-400"
          }`}
        >
          <span>{count}</span>
          <span className="text-current opacity-50">/</span>
          <span>5</span>
        </div>
      </div>

      {/* Status hint */}
      <p className={`font-nunito text-xs font-bold uppercase tracking-widest ${count === 5 ? "text-[#65d421]" : "text-slate-500"}`}>
        {count < 5
          ? `Select ${5 - count} more player${5 - count !== 1 ? "s" : ""} to start`
          : "✓ Starting lineup ready"}
      </p>

      {/* Colour indicator bar */}
      <div
        className="h-1 w-full border border-slate-900"
        style={{ backgroundColor: config.colorHex }}
      />

      {/* Jersey grid */}
      <div className="grid grid-cols-5 gap-3">
        {sorted.map(player => {
          const isActive = selectedIds.has(player.id);
          const isDisabled = !isActive && count >= 5;

          return (
            <div
              key={player.id}
              onClick={() => !isDisabled && onToggle(player)}
              className={`flex flex-col items-center cursor-pointer transition-all ${
                isDisabled ? "opacity-30 cursor-not-allowed" : "hover:-translate-y-1"
              } ${isActive ? "scale-105" : ""}`}
            >
              <Jersey
                number={player.number}
                name={player.name}
                colorHex={config.colorHex}
                size="md"
                selected={isActive}
                dimmed={isDisabled}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
