// components/game/EventLog.tsx
"use client";

import React from "react";
import { GameEvent, MatchConfig, formatClock } from "@/lib/gameState";

interface Props {
  events: GameEvent[];
  config: MatchConfig;
  onUndo: () => void;
}

const typeColors: Record<string, string> = {
  "2PT": "bg-blue-100 text-blue-800 border-blue-300",
  "3PT": "bg-purple-100 text-purple-800 border-purple-300",
  "FT":  "bg-cyan-100 text-cyan-800 border-cyan-300",
  "FOUL":"bg-red-100 text-red-800 border-red-300",
  "SUB": "bg-slate-100 text-slate-700 border-slate-300",
};

const typeLabel: Record<string, string> = {
  "2PT": "+2",
  "3PT": "+3",
  "FT":  "+1 FT",
  "FOUL":"FOUL",
  "SUB": "SUB",
};

export function EventLog({ events, config, onUndo }: Props) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-fredoka text-xl uppercase tracking-wider text-slate-900">Event Log</h3>
        </div>
        <p className="font-nunito text-slate-400 italic text-sm">No events yet. Start logging plays!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-fredoka text-xl uppercase tracking-wider text-slate-900">
          Event Log <span className="text-slate-400 text-base font-normal">({events.length})</span>
        </h3>
        <button
          onClick={onUndo}
          className="font-nunito text-sm font-bold text-red-600 border-2 border-red-400 px-3 py-1 hover:bg-red-50 transition-colors"
        >
          ↩ Undo Last
        </button>
      </div>

      <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
        {[...events].reverse().map((event, i) => {
          const teamName = event.team === "A" ? config.teamA.name : config.teamB.name;
          const teamColor = event.team === "A" ? config.teamA.colorHex : config.teamB.colorHex;
          const periodLabel = config.totalPeriods === 4 ? "Q" : "H";
          const isSub = event.type === "SUB";
          const badge = typeColors[event.type] ?? "bg-slate-100 text-slate-700 border-slate-300";

          return (
            <div
              key={event.id}
              className={`flex items-center gap-3 px-4 py-2 border-2 border-slate-900 bg-white ${i === 0 ? "shadow-[3px_3px_0_#0f172a]" : ""}`}
            >
              {/* Period + clock */}
              <span className="font-nunito text-xs text-slate-400 w-16 shrink-0">
                {periodLabel}{event.period} {event.clockSnapshot}
              </span>

              {/* Team dot */}
              <span
                className="w-3 h-3 rounded-full border border-slate-900 shrink-0"
                style={{ backgroundColor: teamColor }}
              />

              {/* Description */}
              <span className="font-nunito text-sm font-semibold text-slate-800 flex-1">
                {isSub
                  ? <>
                      <span className="text-slate-500">{teamName}:</span> #{event.player.number} {event.player.name}{" "}
                      <span className="text-green-600">IN</span> / #{event.playerOut?.number} {event.playerOut?.name}{" "}
                      <span className="text-red-500">OUT</span>
                    </>
                  : <>#{ event.player.number} {event.player.name} <span className="text-slate-400">({teamName})</span></>
                }
              </span>

              {/* Type badge */}
              <span className={`font-fredoka text-xs font-bold px-2 py-0.5 border ${badge}`}>
                {typeLabel[event.type]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
