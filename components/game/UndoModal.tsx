// components/game/UndoModal.tsx
"use client";

import React from "react";
import { GameEvent, MatchConfig } from "@/lib/gameState";

interface Props {
  event: GameEvent;
  config: MatchConfig;
  onConfirm: () => void;
  onCancel: () => void;
}

const typeLabel: Record<string, string> = {
  "2PT": "2-Point Field Goal",
  "3PT": "3-Point Field Goal",
  "FT":  "Free Throw",
  "FOUL":"Personal Foul",
  "SUB": "Substitution",
};

export function UndoModal({ event, config, onConfirm, onCancel }: Props) {
  const teamName = event.team === "A" ? config.teamA.name : config.teamB.name;
  const periodLabel = config.totalPeriods === 4 ? "Q" : "H";
  const isSub = event.type === "SUB";

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white border-4 border-slate-900 p-8 max-w-sm w-full flex flex-col gap-6"
        style={{ boxShadow: "8px 8px 0 #0f172a" }}
      >
        <h2 className="font-fredoka text-3xl uppercase tracking-wider text-slate-900">
          Undo Last Event?
        </h2>

        <div className="border-2 border-slate-200 p-4 bg-slate-50 flex flex-col gap-1">
          <p className="font-nunito text-sm text-slate-500 font-semibold uppercase tracking-wide">
            {periodLabel}{event.period} · {event.clockSnapshot}
          </p>
          <p className="font-nunito text-base font-bold text-slate-900">
            {isSub
              ? `${teamName}: #${event.player.number} ${event.player.name} IN / #${event.playerOut?.number} ${event.playerOut?.name} OUT`
              : `#${event.player.number} ${event.player.name} (${teamName}) — ${typeLabel[event.type]}`
            }
          </p>
        </div>

        <p className="font-nunito text-sm text-slate-500">
          This will reverse the score, foul count, or lineup change for this event.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 font-fredoka text-lg font-black uppercase tracking-wider py-3 bg-red-500 text-white border-2 border-slate-900 hover:bg-red-400 transition-colors"
            style={{ boxShadow: "4px 4px 0 #0f172a" }}
          >
            Yes, Undo
          </button>
          <button
            onClick={onCancel}
            className="flex-1 font-fredoka text-lg font-black uppercase tracking-wider py-3 bg-white text-slate-900 border-2 border-slate-900 hover:bg-slate-50 transition-colors"
            style={{ boxShadow: "4px 4px 0 #0f172a" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
