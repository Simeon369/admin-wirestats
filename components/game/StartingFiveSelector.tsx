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

  return (
    <div
      className="flex flex-col gap-4 p-6 border-4 border-slate-900 bg-white"
      style={{ boxShadow: "6px 6px 0 #0f172a" }}
    >
      <div className="flex items-center justify-between">
        <h2 className="font-fredoka text-2xl uppercase tracking-wider text-slate-900">
          Team {team} — {config.name}
        </h2>
        <span
          className={`font-fredoka text-lg font-bold px-3 py-1 border-2 border-slate-900 ${
            selected.length === 5
              ? "bg-[#65d421] text-white"
              : "bg-yellow-300 text-slate-900"
          }`}
        >
          {selected.length} / 5
        </span>
      </div>

      <p className="font-nunito text-sm text-slate-500">
        {selected.length < 5
          ? `Select ${5 - selected.length} more player(s) to start`
          : "Starting lineup ready! ✓"}
      </p>

      <div className="grid grid-cols-5 gap-3">
        {sorted.map(player => {
          const isActive = selectedIds.has(player.id);
          const isDisabled = !isActive && selected.length >= 5;

          return (
            <Jersey
              key={player.id}
              number={player.number}
              name={player.name.split(" ")[0]}
              colorHex={config.colorHex}
              size="md"
              selected={isActive}
              dimmed={isDisabled}
              onClick={() => !isDisabled && onToggle(player)}
            />
          );
        })}
      </div>
    </div>
  );
}
