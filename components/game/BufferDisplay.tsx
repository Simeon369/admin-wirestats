// components/game/BufferDisplay.tsx
"use client";

import React from "react";
import { BufferPhase, MatchConfig, Player } from "@/lib/gameState";
import { Jersey } from "@/components/ui/Jersey";

export type BufferState = "idle" | "building" | "team-selected" | "action-ready" | "error";

interface Props {
  bufferPhase: BufferPhase;
  state: BufferState;
  config: MatchConfig;
  activeA: Player[];
  activeB: Player[];
  hint?: string;
}

const stateStyles: Record<BufferState, string> = {
  idle: "border-slate-300 bg-slate-50 text-slate-400",
  building: "border-slate-900 bg-white text-slate-900",
  "team-selected": "border-blue-500 bg-blue-50 text-blue-900",
  "action-ready": "border-[#1b630a] bg-[#f0fde8] text-[#1b630a]",
  error: "border-red-500 bg-red-50 text-red-700 animate-shake",
};

export function BufferDisplay({ bufferPhase, state, config, activeA, activeB, hint }: Props) {
  const isIdle = bufferPhase.phase === "idle";
  const isBuilding = bufferPhase.phase === "jersey";

  const [animatingOut, setAnimatingOut] = React.useState<{ action: string } | null>(null);
  const prevPhase = React.useRef(bufferPhase);

  React.useEffect(() => {
    // If we transition from action/sub-out to idle, the action was accepted.
    const prev = prevPhase.current;
    if (bufferPhase.phase === "idle" && (prev.phase === "action" || prev.phase === "sub-out-jersey")) {
      const action = prev.phase === "action" ? prev.action : "x";
      setAnimatingOut({ action });
      setTimeout(() => setAnimatingOut(null), 1000);
    } else if (bufferPhase.phase !== "idle") {
      setAnimatingOut(null);
    }
    prevPhase.current = bufferPhase;
  }, [bufferPhase]);

  const prev = prevPhase.current;

  let player: Player | undefined;
  let colorHex = "#ccc";
  
  if (bufferPhase.phase !== "idle" && bufferPhase.phase !== "jersey") {
    const roster = bufferPhase.team === "A" ? config.teamA.players : config.teamB.players;
    player = roster.find(p => p.number === bufferPhase.jersey);
    colorHex = bufferPhase.team === "A" ? config.teamA.colorHex : config.teamB.colorHex;
  } else if (animatingOut && prev.phase !== "idle" && prev.phase !== "jersey") {
    // Keep the player rendered during the fade out animation
    const roster = prev.team === "A" ? config.teamA.players : config.teamB.players;
    player = roster.find(p => p.number === prev.jersey);
    colorHex = prev.team === "A" ? config.teamA.colorHex : config.teamB.colorHex;
  }

  let subOutPlayer: Player | undefined;
  if (bufferPhase.phase === "sub-out-jersey") {
    const roster = bufferPhase.team === "A" ? config.teamA.players : config.teamB.players;
    subOutPlayer = roster.find(p => p.number === bufferPhase.subOutJersey);
  } else if (animatingOut && animatingOut.action === "x" && prev.phase === "sub-out-jersey") {
    const roster = prev.team === "A" ? config.teamA.players : config.teamB.players;
    subOutPlayer = roster.find(p => p.number === prev.subOutJersey);
  }

  const renderActionElement = (action: string, isFadingOut: boolean) => {
    const animationClass = isFadingOut ? "animate-float-out" : "animate-float-in";
    return (
      <div className={`absolute top-2 -right-34 z-20 flex flex-col items-start w-32 ${animationClass}`}>
        {action === "2" && <span className="text-xl font-black text-orange-500" style={{ textShadow: "2px 2px 0 #000" }}>🏀2</span>}
        {action === "3" && <span className="text-xl font-black text-orange-500" style={{ textShadow: "2px 2px 0 #000" }}>🏀3</span>}
        {action === "f" && <span className="text-xl font-black text-red-500" style={{ textShadow: "2px 2px 0 #000" }}>🚨</span>}
        {action === "1" && <span className="text-xl font-black text-[#65d421]" style={{ textShadow: "2px 2px 0 #000" }}>🏀1</span>}
        {action === "x" && <span className="text-xl font-black text-blue-500" style={{ textShadow: "2px 2px 0 #000" }}>🔄</span>}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2 w-full h-full justify-center items-center">
      <div
        className={`flex flex-col items-center justify-center p-4 border-4 transition-all w-full h-full min-h-[160px] ${stateStyles[animatingOut ? "action-ready" : state]}`}
        style={{ boxShadow: (animatingOut ? "action-ready" : state) === "error" ? "4px 4px 0 #ef4444" : "4px 4px 0 #0f172a" }}
      >
        {isIdle && !animatingOut && (
          <span className="font-fredoka text-3xl font-black tracking-widest text-slate-300">
            READY
          </span>
        )}

        {isBuilding && (
          <span className="font-fredoka text-5xl font-black tracking-widest">
            #{bufferPhase.jersey}
          </span>
        )}

        {player && (
          <div className="relative flex items-center justify-center gap-6">
            <div className="relative">
              <Jersey
                number={player.number}
                name={player.name.split(" ")[0]}
                colorHex={colorHex}
                size="lg"
              />
              {/* Action Animations */}
              {state !== "error" && bufferPhase.phase === "action" && renderActionElement(bufferPhase.action, false)}
              {state !== "error" && animatingOut && renderActionElement(animatingOut.action, true)}
            </div>

            {/* Sub Out Rendering */}
            {(bufferPhase.phase === "sub-out-jersey" || (animatingOut && animatingOut.action === "x")) && (
              <>
                <span className="text-4xl font-black text-slate-400">🔄</span>
                {subOutPlayer ? (
                  <Jersey
                    number={subOutPlayer.number}
                    name={subOutPlayer.name.split(" ")[0]}
                    colorHex={colorHex}
                    size="lg"
                    dimmed
                  />
                ) : (
                  <div className="w-16 h-18 border-2 border-dashed border-slate-400 rounded-t-xl rounded-b-sm flex items-center justify-center">
                    <span className="font-fredoka text-2xl font-black text-slate-400">
                      #{bufferPhase.phase === "sub-out-jersey" ? bufferPhase.subOutJersey : ""}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        
        {hint && !animatingOut && (
          <span className="mt-4 font-nunito text-sm font-semibold opacity-70 text-center">{hint}</span>
        )}
      </div>
    </div>
  );
}
