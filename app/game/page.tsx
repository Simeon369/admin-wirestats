// app/game/page.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  loadMatchConfig,
  MatchConfig,
  Player,
  GameEvent,
  StatType,
  formatClock,
} from "@/lib/gameState";
import { StartingFiveSelector } from "@/components/game/StartingFiveSelector";
import { Scoreboard } from "@/components/game/Scoreboard";
import { BufferDisplay, BufferState } from "@/components/game/BufferDisplay";
import { EventLog } from "@/components/game/EventLog";
import { UndoModal } from "@/components/game/UndoModal";

// ──────────────────────────────────────────────────────────────────────────────
// Buffer parsing types
// ──────────────────────────────────────────────────────────────────────────────
type BufferPhase =
  | { phase: "idle" }
  | { phase: "jersey"; jersey: string }
  | { phase: "team"; jersey: string; team: "A" | "B" }
  | { phase: "action"; jersey: string; team: "A" | "B"; action: "2" | "3" | "f" | "x" }
  | { phase: "sub-out-jersey"; jersey: string; team: "A" | "B"; subOutJersey: string };

export default function GamePage() {
  const router = useRouter();
  const [config, setConfig] = useState<MatchConfig | null>(null);

  // ── Phase: Starting 5 selection ──────────────────────────────────────────
  const [phase, setPhase] = useState<"select-starters" | "live">("select-starters");
  const [startingA, setStartingA] = useState<Player[]>([]);
  const [startingB, setStartingB] = useState<Player[]>([]);

  // ── Live game state ───────────────────────────────────────────────────────
  const [activeA, setActiveA] = useState<Player[]>([]);
  const [activeB, setActiveB] = useState<Player[]>([]);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [period, setPeriod] = useState(1);
  const [clockSeconds, setClockSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [events, setEvents] = useState<GameEvent[]>([]);

  // ── Buffer ────────────────────────────────────────────────────────────────
  const [bufferPhase, setBufferPhase] = useState<BufferPhase>({ phase: "idle" });
  const [bufferState, setBufferState] = useState<BufferState>("idle");
  const [bufferError, setBufferError] = useState(false);

  // ── Undo modal ────────────────────────────────────────────────────────────
  const [undoTarget, setUndoTarget] = useState<GameEvent | null>(null);

  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const configRef = useRef<MatchConfig | null>(null);

  // ── Load config ───────────────────────────────────────────────────────────
  useEffect(() => {
    const cfg = loadMatchConfig();
    if (!cfg) { router.push("/"); return; }
    setConfig(cfg);
    configRef.current = cfg;
    setClockSeconds(cfg.gameTimeMinutes * 60);
  }, [router]);

  // ── Clock tick ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isRunning) {
      clockRef.current = setInterval(() => {
        setClockSeconds(s => {
          if (s <= 1) {
            setIsRunning(false);
            clearInterval(clockRef.current!);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (clockRef.current) clearInterval(clockRef.current);
    }
    return () => { if (clockRef.current) clearInterval(clockRef.current); };
  }, [isRunning]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const flashError = useCallback(() => {
    setBufferState("error");
    setBufferError(true);
    setTimeout(() => {
      setBufferPhase({ phase: "idle" });
      setBufferState("idle");
      setBufferError(false);
    }, 700);
  }, []);

  const getBufferDisplay = useCallback((): string => {
    switch (bufferPhase.phase) {
      case "idle": return "";
      case "jersey": return `#${bufferPhase.jersey}`;
      case "team": return `#${bufferPhase.jersey} ${bufferPhase.team === "A" ? "← A" : "B →"}`;
      case "action": {
        const actionLabel: Record<string, string> = { "2": "2PT", "3": "3PT", f: "FT/FOUL", x: "SUB" };
        return `#${bufferPhase.jersey} ${bufferPhase.team === "A" ? "← A" : "B →"} · ${actionLabel[bufferPhase.action]}`;
      }
      case "sub-out-jersey":
        return `#${bufferPhase.jersey} ${bufferPhase.team === "A" ? "← A" : "B →"} SUB ← #${bufferPhase.subOutJersey}`;
      default: return "";
    }
  }, [bufferPhase]);

  const getBufferHint = useCallback((): string => {
    switch (bufferPhase.phase) {
      case "idle": return "Type jersey #...";
      case "jersey": return "Press ← or → to pick team";
      case "team": return "Press 2, 3, f, or x";
      case "action":
        return bufferPhase.action === "x" ? "Type outgoing jersey #" : "Press Enter to commit";
      case "sub-out-jersey": return "Press Enter to commit sub";
      default: return "";
    }
  }, [bufferPhase]);

  const getBufferUIState = useCallback((): BufferState => {
    if (bufferError) return "error";
    switch (bufferPhase.phase) {
      case "idle": return "idle";
      case "jersey": return "building";
      case "team": return "team-selected";
      case "action":
      case "sub-out-jersey": return "action-ready";
      default: return "idle";
    }
  }, [bufferPhase, bufferError]);

  const commitEvent = useCallback((event: GameEvent) => {
    setEvents(prev => [...prev, event]);
    if (event.type === "2PT") {
      event.team === "A" ? setScoreA(s => s + 2) : setScoreB(s => s + 2);
    } else if (event.type === "3PT") {
      event.team === "A" ? setScoreA(s => s + 3) : setScoreB(s => s + 3);
    } else if (event.type === "FT") {
      event.team === "A" ? setScoreA(s => s + 1) : setScoreB(s => s + 1);
    } else if (event.type === "SUB" && event.playerOut) {
      const inPlayer = event.player;
      const outPlayer = event.playerOut;
      if (event.team === "A") {
        setActiveA(prev => prev.map(p => p.id === outPlayer.id ? inPlayer : p));
      } else {
        setActiveB(prev => prev.map(p => p.id === outPlayer.id ? inPlayer : p));
      }
    }
    setBufferPhase({ phase: "idle" });
    setBufferState("idle");
  }, []);

  // ── Keyboard engine ───────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "live") return;

    const handleKey = (e: KeyboardEvent) => {
      const cfg = configRef.current;
      if (!cfg) return;

      // Never hijack text inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) return;

      const key = e.key;

      // ── Undo ──────────────────────────────────────────────────────────────
      if ((e.ctrlKey || e.metaKey) && key === "z") {
        e.preventDefault();
        setEvents(prev => {
          if (prev.length === 0) return prev;
          setUndoTarget(prev[prev.length - 1]);
          return prev;
        });
        return;
      }

      // ── Space: clock toggle ───────────────────────────────────────────────
      if (key === " ") {
        e.preventDefault();
        setIsRunning(r => !r);
        return;
      }

      // ── Escape: clear buffer ──────────────────────────────────────────────
      if (key === "Escape") {
        setBufferPhase({ phase: "idle" });
        setBufferState("idle");
        return;
      }

      // ── Backspace ─────────────────────────────────────────────────────────
      if (key === "Backspace") {
        e.preventDefault();
        setBufferPhase(prev => {
          if (prev.phase === "jersey") {
            const trimmed = prev.jersey.slice(0, -1);
            return trimmed.length === 0 ? { phase: "idle" } : { phase: "jersey", jersey: trimmed };
          }
          if (prev.phase === "sub-out-jersey") {
            const trimmed = prev.subOutJersey.slice(0, -1);
            if (trimmed.length === 0) return { phase: "action", jersey: prev.jersey, team: prev.team, action: "x" };
            return { ...prev, subOutJersey: trimmed };
          }
          return { phase: "idle" };
        });
        return;
      }

      // ── Enter: commit ─────────────────────────────────────────────────────
      if (key === "Enter") {
        e.preventDefault();
        setBufferPhase(prev => {
          if (prev.phase !== "action" && prev.phase !== "sub-out-jersey") {
            flashError();
            return prev;
          }

          const active = prev.team === "A" ? activeA : activeB;
          const roster = prev.team === "A" ? cfg.teamA.players : cfg.teamB.players;
          const player = roster.find(p => p.number === prev.jersey);

          if (!player) { flashError(); return prev; }

          if (prev.phase === "action") {
            const actionToType: Record<"2" | "3" | "f", StatType> = {
              "2": "2PT",
              "3": "3PT",
              "f": "FT",
            };
            if (prev.action === "x") { flashError(); return prev; } // sub needs out jersey

            const eventType = actionToType[prev.action as "2" | "3" | "f"];
            commitEvent({
              id: crypto.randomUUID(),
              period,
              clockSnapshot: formatClock(clockSeconds),
              team: prev.team,
              player,
              type: eventType,
              points: prev.action === "2" ? 2 : prev.action === "3" ? 3 : 1,
            });
            return { phase: "idle" };
          }

          if (prev.phase === "sub-out-jersey") {
            const outPlayer = active.find(p => p.number === prev.subOutJersey);
            if (!outPlayer) { flashError(); return prev; }
            commitEvent({
              id: crypto.randomUUID(),
              period,
              clockSnapshot: formatClock(clockSeconds),
              team: prev.team,
              player,
              type: "SUB",
              playerOut: outPlayer,
            });
            return { phase: "idle" };
          }

          return prev;
        });
        return;
      }

      // ── Arrow keys: pick team ─────────────────────────────────────────────
      if (key === "ArrowLeft" || key === "ArrowRight") {
        e.preventDefault();
        const team = key === "ArrowLeft" ? "A" : "B";
        setBufferPhase(prev => {
          if (prev.phase !== "jersey" || prev.jersey.length === 0) return prev;
          return { phase: "team", jersey: prev.jersey, team };
        });
        return;
      }

      // ── Action keys ───────────────────────────────────────────────────────
      if (key === "2" || key === "3" || key.toLowerCase() === "f" || key.toLowerCase() === "x") {
        setBufferPhase(prev => {
          if (prev.phase !== "team") return prev;
          const action = key === "2" ? "2" : key === "3" ? "3" : key.toLowerCase() === "f" ? "f" : "x";
          if (action === "x") {
            return { phase: "action", jersey: prev.jersey, team: prev.team, action: "x" };
          }
          return { phase: "action", jersey: prev.jersey, team: prev.team, action: action as "2" | "3" | "f" };
        });
        return;
      }

      // ── Digits ────────────────────────────────────────────────────────────
      if (/^\d$/.test(key)) {
        setBufferPhase(prev => {
          if (prev.phase === "idle" || prev.phase === "jersey") {
            const jersey = (prev.phase === "jersey" ? prev.jersey : "") + key;
            return { phase: "jersey", jersey };
          }
          if (prev.phase === "action" && prev.action === "x") {
            return { phase: "sub-out-jersey", jersey: prev.jersey, team: prev.team, subOutJersey: key };
          }
          if (prev.phase === "sub-out-jersey") {
            return { ...prev, subOutJersey: prev.subOutJersey + key };
          }
          return prev;
        });
        return;
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [phase, activeA, activeB, period, clockSeconds, flashError, commitEvent]);

  // ── Undo handler ──────────────────────────────────────────────────────────
  const confirmUndo = useCallback(() => {
    if (!undoTarget) return;
    setEvents(prev => prev.filter(e => e.id !== undoTarget.id));
    // Reverse score
    if (undoTarget.type === "2PT") {
      undoTarget.team === "A" ? setScoreA(s => s - 2) : setScoreB(s => s - 2);
    } else if (undoTarget.type === "3PT") {
      undoTarget.team === "A" ? setScoreA(s => s - 3) : setScoreB(s => s - 3);
    } else if (undoTarget.type === "FT") {
      undoTarget.team === "A" ? setScoreA(s => s - 1) : setScoreB(s => s - 1);
    } else if (undoTarget.type === "SUB" && undoTarget.playerOut) {
      const inPlayer = undoTarget.player;
      const outPlayer = undoTarget.playerOut;
      if (undoTarget.team === "A") {
        setActiveA(prev => prev.map(p => p.id === inPlayer.id ? outPlayer : p));
      } else {
        setActiveB(prev => prev.map(p => p.id === inPlayer.id ? outPlayer : p));
      }
    }
    setUndoTarget(null);
  }, [undoTarget]);

  // ── Start game ────────────────────────────────────────────────────────────
  const handleStartGame = () => {
    if (startingA.length !== 5 || startingB.length !== 5) return;
    setActiveA(startingA);
    setActiveB(startingB);
    setPhase("live");
  };

  const toggleStarter = (team: "A" | "B", player: Player) => {
    if (team === "A") {
      setStartingA(prev =>
        prev.find(p => p.id === player.id)
          ? prev.filter(p => p.id !== player.id)
          : prev.length < 5 ? [...prev, player] : prev
      );
    } else {
      setStartingB(prev =>
        prev.find(p => p.id === player.id)
          ? prev.filter(p => p.id !== player.id)
          : prev.length < 5 ? [...prev, player] : prev
      );
    }
  };

  if (!config) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center">
        <p className="font-fredoka text-2xl text-slate-400 uppercase tracking-widest animate-pulse">Loading...</p>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STARTING 5 SELECTION SCREEN
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === "select-starters") {
    const ready = startingA.length === 5 && startingB.length === 5;
    return (
      <div className="min-h-screen bg-[#f1f5f9] p-8 pb-20">
        <div className="max-w-5xl mx-auto flex flex-col gap-8">

          <header className="border-b-4 border-slate-900 pb-6 mb-4 flex items-end gap-2">
            <h1 className="font-fredoka text-6xl font-black tracking-widest text-[#1f1f1f]">
              Wire<span
                className="text-[#65d421] ml-2"
                style={{
                  textShadow: "1px 1px 0 #1b630a,2px 2px 0 #1b630a,3px 3px 0 #1b630a,4px 4px 0 #1b630a",
                  WebkitTextStroke: "1px #1b630a",
                }}
              >Stats</span>
            </h1>
            <p className="font-nunito text-xl mb-1 ml-4 text-slate-700 font-bold uppercase tracking-wider">
              Select Starting 5
            </p>
          </header>

          <div className="grid md:grid-cols-2 gap-6">
            <StartingFiveSelector
              team="A"
              config={config.teamA}
              selected={startingA}
              onToggle={p => toggleStarter("A", p)}
            />
            <StartingFiveSelector
              team="B"
              config={config.teamB}
              selected={startingB}
              onToggle={p => toggleStarter("B", p)}
            />
          </div>

          <div className="flex flex-col items-center gap-3">
            {!ready && (
              <p className="font-nunito text-sm font-bold text-slate-500">
                Select 5 starters per team to begin
              </p>
            )}
            <button
              onClick={handleStartGame}
              disabled={!ready}
              className={`font-fredoka text-3xl font-black uppercase tracking-widest px-16 py-4 border-2 transition-all
                ${ready
                  ? "bg-[#65d421] text-white border-[#1b630a] hover:bg-[#7ced38] shadow-[1px_1px_0_#1b630a,2px_2px_0_#1b630a,3px_3px_0_#1b630a,4px_4px_0_#1b630a,5px_5px_0_#1b630a,6px_6px_0_#1b630a] active:shadow-none active:translate-x-1 active:translate-y-1"
                  : "bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed opacity-50"
                }`}
            >
              TIPOFF 🏀
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LIVE GAME SCREEN
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-slate-900 p-6 pb-20">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <header className="flex items-center justify-between border-b-4 border-slate-700 pb-4">
          <h1 className="font-fredoka text-4xl font-black tracking-widest text-white">
            Wire<span
              className="text-[#65d421] ml-1"
              style={{
                textShadow: "1px 1px 0 #1b630a,2px 2px 0 #1b630a,3px 3px 0 #1b630a",
                WebkitTextStroke: "1px #1b630a",
              }}
            >Stats</span>
          </h1>
          <div className="flex items-center gap-3">
            <span className="font-nunito text-sm font-bold text-slate-400 uppercase tracking-widest">
              {config.periods} · {config.gameTimeMinutes} min
            </span>
            <button
              onClick={() => router.push("/")}
              className="font-nunito text-sm font-bold text-slate-400 border border-slate-600 px-3 py-1 hover:text-white hover:border-slate-400 transition-colors"
            >
              ← Exit
            </button>
          </div>
        </header>

        {/* Scoreboard */}
        <Scoreboard
          config={config}
          scoreA={scoreA}
          scoreB={scoreB}
          clockSeconds={clockSeconds}
          period={period}
          isRunning={isRunning}
          activeA={activeA}
          activeB={activeB}
          onClockToggle={() => setIsRunning(r => !r)}
        />

        {/* Buffer */}
        <div className="border-4 border-slate-700 bg-slate-800 p-5" style={{ boxShadow: "6px 6px 0 #0f172a" }}>
          <BufferDisplay
            buffer={getBufferDisplay()}
            state={getBufferUIState()}
            hint={getBufferHint()}
          />
        </div>

        {/* Event Log */}
        <div className="border-4 border-slate-700 bg-white p-6" style={{ boxShadow: "6px 6px 0 #0f172a" }}>
          <EventLog
            events={events}
            config={config}
            onUndo={() => {
              if (events.length > 0) setUndoTarget(events[events.length - 1]);
            }}
          />
        </div>
      </div>

      {/* Undo modal */}
      {undoTarget && (
        <UndoModal
          event={undoTarget}
          config={config}
          onConfirm={confirmUndo}
          onCancel={() => setUndoTarget(null)}
        />
      )}
    </div>
  );
}
