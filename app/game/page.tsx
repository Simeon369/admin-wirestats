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
  BufferPhase,
} from "@/lib/gameState";
import { StartingFiveSelector } from "@/components/game/StartingFiveSelector";
import { Scoreboard } from "@/components/game/Scoreboard";
import { BufferDisplay, BufferState } from "@/components/game/BufferDisplay";
import { EventLog } from "@/components/game/EventLog";
import { UndoModal } from "@/components/game/UndoModal";
import { InstructionsModal } from "@/components/game/InstructionsModal";

// ──────────────────────────────────────────────────────────────────────────────
// Buffer parsing types moved to lib/gameState.ts
// ──────────────────────────────────────────────────────────────────────────────

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
  const [bufferErrorMsg, setBufferErrorMsg] = useState<string | null>(null);

  // ── Undo modal ────────────────────────────────────────────────────────────
  const [undoTarget, setUndoTarget] = useState<GameEvent | null>(null);

  // ── Instructions modal ────────────────────────────────────────────────────
  const [showInstructions, setShowInstructions] = useState(false);
  const [hideInstructionsForever, setHideInstructionsForever] = useState(false);

  // ── Match Ended modal ─────────────────────────────────────────────────────
  const [matchEnded, setMatchEnded] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hide = localStorage.getItem("hideInstructions") === "true";
      setHideInstructionsForever(hide);
    }
  }, []);

  const closeInstructions = (neverShowAgain: boolean) => {
    if (neverShowAgain) {
      localStorage.setItem("hideInstructions", "true");
      setHideInstructionsForever(true);
    }
    setShowInstructions(false);
  };

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
  const flashError = useCallback((keepBuffer = false, msg?: string) => {
    setBufferState("error");
    setBufferError(true);
    if (msg) setBufferErrorMsg(msg);
    setTimeout(() => {
      if (!keepBuffer) {
        setBufferPhase({ phase: "idle" });
      }
      setBufferState("idle");
      setBufferError(false);
      setBufferErrorMsg(null);
    }, keepBuffer ? 2000 : 700);
  }, []);

  const getBufferDisplay = useCallback((): string => {
    switch (bufferPhase.phase) {
      case "idle": return "";
      case "jersey": return `#${bufferPhase.jersey}`;
      case "team": return `#${bufferPhase.jersey} ${bufferPhase.team === "A" ? "← A" : "B →"}`;
      case "action": {
        const actionLabel: Record<string, string> = { "2": "2PT", "3": "3PT", f: "FOUL", ft: "FT", x: "SUB" };
        return `#${bufferPhase.jersey} ${bufferPhase.team === "A" ? "← A" : "B →"} · ${actionLabel[bufferPhase.action]}`;
      }
      case "sub-out-jersey":
        return `#${bufferPhase.jersey} ${bufferPhase.team === "A" ? "← A" : "B →"} SUB ← #${bufferPhase.subOutJersey}`;
      default: return "";
    }
  }, [bufferPhase]);

  const getBufferHint = useCallback((): string => {
    if (bufferErrorMsg) return bufferErrorMsg;
    switch (bufferPhase.phase) {
      case "idle": return "Type jersey #...";
      case "jersey": return "Press ← or → to pick team";
      case "team": return "Press 2, 3, f (foul), or x (sub)";
      case "action":
        if (bufferPhase.action === "x") {
          const active = bufferPhase.team === "A" ? activeA : activeB;
          const isFirstActive = active.some(p => p.number === bufferPhase.jersey);
          return isFirstActive ? "Type incoming jersey #" : "Type outgoing jersey #";
        }
        if (bufferPhase.action === "f") return "Enter = FOUL · T = Free Throw";
        return "Press Enter to commit";
      case "sub-out-jersey": return "Press Enter to commit sub";
      default: return "";
    }
  }, [bufferPhase, bufferErrorMsg, activeA, activeB]);

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

        const prev = bufferPhase;
        if (prev.phase !== "action" && prev.phase !== "sub-out-jersey") {
          flashError();
          return;
        }

        const active = prev.team === "A" ? activeA : activeB;
        const roster = prev.team === "A" ? cfg.teamA.players : cfg.teamB.players;
        const player = roster.find(p => p.number === prev.jersey);

        if (!player) { flashError(); return; }

        if (prev.phase === "action") {
          if (prev.action === "x") { flashError(); return; }

          // Ensure player is active (cannot score/foul if not active)
          const isActive = active.some(p => p.id === player.id);
          if (!isActive) {
            // Show error, keep jersey/team in buffer, remove action
            flashError(true, "Bench player cannot score or foul");
            setBufferPhase({ phase: "team", jersey: prev.jersey, team: prev.team });
            return;
          }
          const actionToType: Record<"2" | "3" | "f" | "ft", StatType> = {
            "2": "2PT",
            "3": "3PT",
            "f": "FOUL",
            "ft": "FT",
          };
          const eventType = actionToType[prev.action as "2" | "3" | "f" | "ft"];
          const pts = prev.action === "2" ? 2 : prev.action === "3" ? 3 : prev.action === "ft" ? 1 : 0;
          commitEvent({
            id: crypto.randomUUID(),
            period,
            clockSnapshot: formatClock(clockSeconds),
            team: prev.team,
            player,
            type: eventType,
            points: pts,
          });
          setBufferPhase({ phase: "idle" });
          return;
        }

        if (prev.phase === "sub-out-jersey") {
          const player2 = roster.find(p => p.number === prev.subOutJersey);
          if (!player2) { flashError(true, "Player not found"); return; }
          
          const p1IsActive = active.some(p => p.id === player.id);
          const p2IsActive = active.some(p => p.id === player2.id);

          if (p1IsActive && p2IsActive) {
            flashError(true, "Cannot sub active for active");
            return;
          }
          if (!p1IsActive && !p2IsActive) {
            flashError(true, "Cannot sub bench for bench");
            return;
          }

          const inPlayer = p1IsActive ? player2 : player;
          const outPlayer = p1IsActive ? player : player2;

          commitEvent({
            id: crypto.randomUUID(),
            period,
            clockSnapshot: formatClock(clockSeconds),
            team: prev.team,
            player: inPlayer,
            type: "SUB",
            playerOut: outPlayer,
          });
          setBufferPhase({ phase: "idle" });
          return;
        }

        return;
      }

      // ── Arrow keys: pick team ─────────────────────────────────────────────
      if (key === "ArrowLeft" || key === "ArrowRight") {
        e.preventDefault();
        const team = key === "ArrowLeft" ? "A" : "B";
        
        if (bufferPhase.phase !== "jersey" || bufferPhase.jersey.length === 0) return;
        
        const roster = team === "A" ? cfg.teamA.players : cfg.teamB.players;
        const playerExists = roster.some(p => p.number === bufferPhase.jersey);
        
        if (!playerExists) {
          flashError(false, "Player not found");
          return;
        }

        setBufferPhase({ phase: "team", jersey: bufferPhase.jersey, team });
        return;
      }

      // ── Action keys (only valid in team phase) ────────────────────────────
      if (bufferPhase.phase === "team" && (key === "2" || key === "3" || key.toLowerCase() === "f" || key.toLowerCase() === "x")) {
        const action = key === "2" ? "2" : key === "3" ? "3" : key.toLowerCase() === "f" ? "f" : "x";
        setBufferPhase({ phase: "action", jersey: bufferPhase.jersey, team: bufferPhase.team, action: action as "2" | "3" | "f" | "ft" | "x" });
        return;
      }

      // ── T key: promote foul → free throw ─────────────────────────────────
      if (key.toLowerCase() === "t" && bufferPhase.phase === "action" && bufferPhase.action === "f") {
        setBufferPhase({ phase: "action", jersey: bufferPhase.jersey, team: bufferPhase.team, action: "ft" });
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
  }, [phase, bufferPhase, activeA, activeB, period, clockSeconds, flashError, commitEvent]);

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
    if (!hideInstructionsForever) {
      setShowInstructions(true);
    }
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

  const handlePrevPeriod = useCallback(() => {
    if (!config) return;
    setPeriod(p => Math.max(1, p - 1));
    setClockSeconds(config.gameTimeMinutes * 60);
    setIsRunning(false);
  }, [config]);

  const handleNextPeriod = useCallback(() => {
    if (!config) return;
    setPeriod(p => p + 1);
    setClockSeconds(config.gameTimeMinutes * 60);
    setIsRunning(false);
  }, [config]);

  const handleTimeAdjust = useCallback((amountSeconds: number) => {
    if (isRunning) return;
    setClockSeconds(s => {
      let newTime = s + amountSeconds;
      if (newTime < 0) newTime = 0;
      if (newTime > 59 * 60) newTime = 59 * 60;
      return newTime;
    });
  }, [isRunning]);

  const handleEndPeriod = useCallback(() => {
    if (!config) return;
    if (period >= config.totalPeriods) {
      if (scoreA === scoreB) {
        setPeriod(p => p + 1);
        setClockSeconds(config.gameTimeMinutes * 60);
      } else {
        setMatchEnded(true);
      }
    } else {
      setPeriod(p => p + 1);
      setClockSeconds(config.gameTimeMinutes * 60);
    }
  }, [config, period, scoreA, scoreB]);

  if (!config) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
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
      <div className="min-h-screen bg-slate-900 p-8 pb-20">
        <div className="max-w-5xl mx-auto flex flex-col gap-8">

          <header className="border-b-4 border-slate-700 pb-6 mb-4 flex items-end gap-2">
            <h1 className="font-fredoka text-6xl font-black tracking-widest text-white">
              Wire<span
                className="text-[#65d421] ml-2"
                style={{
                  textShadow: "1px 1px 0 #1b630a,2px 2px 0 #1b630a,3px 3px 0 #1b630a,4px 4px 0 #1b630a",
                  WebkitTextStroke: "1px #1b630a",
                }}
              >Stats</span>
            </h1>
            <p className="font-nunito text-xl mb-1 ml-4 text-slate-400 font-bold uppercase tracking-wider">
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
              <p className="font-nunito text-sm font-bold text-slate-400">
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
              TIPOFF
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LIVE GAME SCREEN
  // ═══════════════════════════════════════════════════════════════════════════
  const foulsA = events.filter(e => e.period === period && e.team === "A" && e.type === "FOUL").length;
  const foulsB = events.filter(e => e.period === period && e.team === "B" && e.type === "FOUL").length;

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
              onClick={() => setShowInstructions(true)}
              className="font-nunito text-sm font-bold text-slate-400 border border-slate-600 px-3 py-1 hover:text-white hover:border-slate-400 transition-colors"
            >
              Instructions
            </button>
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
          benchA={config.teamA.players.filter(p => !activeA.find(a => a.id === p.id))}
          benchB={config.teamB.players.filter(p => !activeB.find(a => a.id === p.id))}
          bufferPhase={bufferPhase}
          bufferState={getBufferUIState()}
          bufferHint={getBufferHint()}
          foulsA={foulsA}
          foulsB={foulsB}
          onClockToggle={() => setIsRunning(r => !r)}
          onPrevPeriod={handlePrevPeriod}
          onNextPeriod={handleNextPeriod}
          onTimeAdjust={handleTimeAdjust}
          onEndPeriod={handleEndPeriod}
        />

        {/* Instructions */}
        <div className="flex gap-3 flex-wrap justify-center font-nunito text-xs text-slate-500 font-semibold p-4">
          <span className="px-2 py-1 bg-slate-800 text-slate-300 border border-slate-700">
            <kbd className="font-mono text-white">←/→</kbd> Team
          </span>
          <span className="px-2 py-1 bg-slate-800 text-slate-300 border border-slate-700">
            <kbd className="font-mono text-white">2</kbd>/<kbd className="font-mono text-white">3</kbd>/<kbd className="font-mono text-white">f</kbd>/<kbd className="font-mono text-white">t</kbd> Action
          </span>
          <span className="px-2 py-1 bg-slate-800 text-slate-300 border border-slate-700">
            <kbd className="font-mono text-white">x</kbd> Sub
          </span>
          <span className="px-2 py-1 bg-slate-800 text-slate-300 border border-slate-700">
            <kbd className="font-mono text-white">↵ Enter</kbd> Commit
          </span>
          <span className="px-2 py-1 bg-slate-800 text-slate-300 border border-slate-700">
            <kbd className="font-mono text-white">Space</kbd> Clock
          </span>
          <span className="px-2 py-1 bg-slate-800 text-slate-300 border border-slate-700">
            <kbd className="font-mono text-white">Esc</kbd> Clear
          </span>
          <span className="px-2 py-1 bg-slate-800 text-slate-300 border border-slate-700">
            <kbd className="font-mono text-white">Ctrl+Z</kbd> Undo
          </span>
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

      {/* Instructions Modal */}
      {showInstructions && (
        <InstructionsModal onClose={closeInstructions} />
      )}

      {/* End Match Modal */}
      {matchEnded && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white border-4 border-slate-900 p-8 max-w-lg w-full shadow-[12px_12px_0_#0f172a] flex flex-col gap-6 text-center animate-in zoom-in-95 duration-200">
            <h2 className="font-fredoka text-5xl font-black uppercase tracking-widest text-slate-900">
              Match Ended
            </h2>
            
            <div className="flex items-center justify-between gap-4 py-6 border-y-4 border-slate-100">
              <div className="flex flex-col items-center flex-1">
                <span className="font-fredoka text-xl font-black uppercase truncate w-full" style={{ color: config.teamA.colorHex }}>{config.teamA.name}</span>
                <span className="font-fredoka text-6xl font-black text-slate-900 mt-2">{scoreA}</span>
              </div>
              <span className="font-fredoka text-3xl font-black text-slate-300">-</span>
              <div className="flex flex-col items-center flex-1">
                <span className="font-fredoka text-xl font-black uppercase truncate w-full" style={{ color: config.teamB.colorHex }}>{config.teamB.name}</span>
                <span className="font-fredoka text-6xl font-black text-slate-900 mt-2">{scoreB}</span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 mb-4">
              <span className="font-nunito text-lg font-bold text-slate-500 uppercase tracking-widest">Winner</span>
              <span className="font-fredoka text-4xl font-black uppercase px-6 py-2 border-4 border-slate-900" 
                style={{ 
                  backgroundColor: scoreA > scoreB ? config.teamA.colorHex : config.teamB.colorHex, 
                  color: (scoreA > scoreB ? config.teamA.colorHex : config.teamB.colorHex).toLowerCase() === '#ffffff' ? '#0f172a' : '#ffffff' 
                }}>
                {scoreA > scoreB ? config.teamA.name : config.teamB.name}
              </span>
            </div>

            <div className="flex gap-4 mt-2">
              <button
                onClick={() => setMatchEnded(false)}
                className="flex-1 font-fredoka text-xl font-black uppercase tracking-widest px-6 py-4 border-4 border-slate-900 bg-slate-200 hover:bg-slate-300 text-slate-900 transition-all active:translate-y-1"
              >
                BACK
              </button>
              <button
                onClick={() => router.push("/")}
                className="flex-1 font-fredoka text-xl font-black uppercase tracking-widest px-6 py-4 border-4 border-[#1b630a] bg-[#65d421] hover:bg-[#7ced38] text-white transition-all shadow-[4px_4px_0_#1b630a] active:shadow-none active:translate-x-1 active:translate-y-1"
              >
                HOME
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
