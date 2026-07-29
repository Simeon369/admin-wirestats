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
import { EndGameModal } from "@/components/game/EndGameModal";
import { supabase } from "@/lib/supabase";
import { enqueue, flushQueue, getQueueLength } from "@/lib/offlineQueue";

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
  const [foulsA, setFoulsA] = useState(0);
  const [foulsB, setFoulsB] = useState(0);
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
  const [showEndGameModal, setShowEndGameModal] = useState(false);

  // ── Network & Offline Queue ───────────────────────────────────────────────
  const [isOffline, setIsOffline] = useState(false);
  const [queueLength, setQueueLength] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hide = localStorage.getItem("hideInstructions") === "true";
      setHideInstructionsForever(hide);

      // Init network state
      setIsOffline(!navigator.onLine);
      setQueueLength(getQueueLength());

      const handleOnline = () => {
        setIsOffline(false);
        if (supabase) {
          flushQueue(supabase).then(() => setQueueLength(getQueueLength()));
        }
      };
      const handleOffline = () => setIsOffline(true);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  const closeInstructions = (neverShowAgain: boolean) => {
    if (neverShowAgain) {
      localStorage.setItem("hideInstructions", "true");
      setHideInstructionsForever(true);
    }
    setShowInstructions(false);
  };

  const handleEndGame = async () => {
    if (gameIdRef.current && supabase) {
      // Mark game as finished in Supabase
      supabase.from("games").update({ status: "finished" }).eq("id", gameIdRef.current).then();
    }
    // Clear active game
    localStorage.removeItem("wirestats_active_game_id");
    router.push("/");
  };

  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const configRef = useRef<MatchConfig | null>(null);
  const gameIdRef = useRef<string | null>(null);  // Supabase game row ID
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load config + resume ongoing game ─────────────────────────────────────
  useEffect(() => {
    if (!supabase) return;

    // Try to resume the active game directly from the database
    supabase
      .from("games")
      .select("*")
      .eq("status", "active")
      .limit(1)
      .maybeSingle()
      .then(async ({ data: game, error }) => {
        let cfg = loadMatchConfig();

        if (error || !game) {
          // Game not found or already finished
          if (!cfg) {
            router.push("/");
            return;
          }
          // No active game, but we have config to start a new one
          setConfig(cfg);
          configRef.current = cfg;
          setClockSeconds(cfg.gameTimeMinutes * 60);
          return;
        }

        // Active game exists!
        // Reconstruct config from DB if it was lost (e.g. new tab or cleared session storage)
        if (!cfg) {
          cfg = {
            teamA: {
              name: game.team_a_name ?? "Team A",
              colorHex: game.team_a_color ?? "#ef4444",
              colorId: game.team_a_color === '#3b82f6' ? 'blue' : 'red',
              players: [...(game.roster_active_a ?? []), ...(game.roster_bench_a ?? [])] as Player[],
            },
            teamB: {
              name: game.team_b_name ?? "Team B",
              colorHex: game.team_b_color ?? "#3b82f6",
              colorId: game.team_b_color === '#ef4444' ? 'red' : 'blue',
              players: [...(game.roster_active_b ?? []), ...(game.roster_bench_b ?? [])] as Player[],
            },
            gameTimeMinutes: game.game_time_minutes ?? 10,
            periods: game.periods ?? "4 quarters",
            totalPeriods: game.total_periods ?? 4,
          };
        }

        setConfig(cfg);
        configRef.current = cfg;

        // Set the active game id in local storage for other checks if needed, though we rely on db
        localStorage.setItem("wirestats_active_game_id", game.id);

        // Restore all game state from the database row
        gameIdRef.current = game.id;
        setScoreA(game.score_a ?? 0);
        setScoreB(game.score_b ?? 0);
        setFoulsA(game.fouls_a ?? 0);
        setFoulsB(game.fouls_b ?? 0);
        setPeriod(game.period ?? 1);
        setClockSeconds(game.clock_seconds ?? cfg.gameTimeMinutes * 60);
        setIsRunning(false); // always start paused on resume

        const activeA = (game.roster_active_a ?? []) as Player[];
        const activeB = (game.roster_active_b ?? []) as Player[];
        setActiveA(activeA);
        setActiveB(activeB);

        // Load recent events for the event log
        const { data: evData } = await supabase
          .from("stat_events")
          .select("id, event_type, period, clock_snapshot, team, player_name, player_number, player_out_name, player_out_number, points")
          .eq("game_id", game.id)
          .order("created_at", { ascending: true });

        if (evData) {
          // Reconstruct local GameEvent objects from DB rows for the EventLog
          const reconstituted = evData.map((row: Record<string, unknown>) => ({
            id: row.id as string,
            period: row.period as number,
            clockSnapshot: (row.clock_snapshot as string) ?? "",
            team: (row.team as "A" | "B"),
            player: { id: `${row.team}-${row.player_number}`, name: (row.player_name as string) ?? "", number: (row.player_number as string) ?? "" },
            type: ({ "2pt": "2PT", "3pt": "3PT", "ft": "FT", "foul": "FOUL", "sub": "SUB" }[row.event_type as string] ?? row.event_type) as "2PT" | "3PT" | "FT" | "FOUL" | "SUB",
            playerOut: row.player_out_number ? { id: `${row.team}-${row.player_out_number}`, name: (row.player_out_name as string) ?? "", number: (row.player_out_number as string) ?? "" } : undefined,
            points: (row.points as number) ?? 0,
          }));
          setEvents(reconstituted);
        }

        // Jump straight to the live game screen
        setPhase("live");
        console.log("Resumed game:", game.id);
      });
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

  // ── Block refresh/close when clock is running ─────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ""; // required for Chrome to show the dialog
    };
    if (isRunning) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
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
      case "team": return "Press 1 (FT), 2, 3, f (foul), or x (sub)";
      case "action":
        if (bufferPhase.action === "x") {
          const active = bufferPhase.team === "A" ? activeA : activeB;
          const isFirstActive = active.some(p => p.number === bufferPhase.jersey);
          return isFirstActive ? "Type incoming jersey #" : "Type outgoing jersey #";
        }
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
    let newScoreA = scoreA;
    let newScoreB = scoreB;
    let newFoulsA = foulsA;
    let newFoulsB = foulsB;
    let newActiveA = activeA;
    let newActiveB = activeB;

    if (event.type === "2PT") {
      event.team === "A" ? setScoreA(s => { newScoreA = s + 2; return newScoreA; }) : setScoreB(s => { newScoreB = s + 2; return newScoreB; });
      event.team === "A" ? (newScoreA = scoreA + 2) : (newScoreB = scoreB + 2);
    } else if (event.type === "3PT") {
      event.team === "A" ? setScoreA(s => { newScoreA = s + 3; return newScoreA; }) : setScoreB(s => { newScoreB = s + 3; return newScoreB; });
      event.team === "A" ? (newScoreA = scoreA + 3) : (newScoreB = scoreB + 3);
    } else if (event.type === "FT") {
      event.team === "A" ? setScoreA(s => { newScoreA = s + 1; return newScoreA; }) : setScoreB(s => { newScoreB = s + 1; return newScoreB; });
      event.team === "A" ? (newScoreA = scoreA + 1) : (newScoreB = scoreB + 1);
    } else if (event.type === "FOUL") {
      if (event.team === "A") { setFoulsA(f => { newFoulsA = f + 1; return newFoulsA; }); newFoulsA = foulsA + 1; }
      else { setFoulsB(f => { newFoulsB = f + 1; return newFoulsB; }); newFoulsB = foulsB + 1; }
    } else if (event.type === "SUB" && event.playerOut) {
      const inPlayer = event.player;
      const outPlayer = event.playerOut;
      if (event.team === "A") {
        newActiveA = activeA.map(p => p.id === outPlayer.id ? inPlayer : p);
        setActiveA(newActiveA);
      } else {
        newActiveB = activeB.map(p => p.id === outPlayer.id ? inPlayer : p);
        setActiveB(newActiveB);
      }
    }
    setBufferPhase({ phase: "idle" });
    setBufferState("idle");

    // ── Push event to Supabase ────────────────────────────────────────────
    if (gameIdRef.current) {
      const eventTypeMap: Record<string, string> = {
        "2PT": "2pt", "3PT": "3pt", "FT": "ft", "FOUL": "foul", "SUB": "sub"
      };
      const eventPayload = {
        game_id: gameIdRef.current,
        event_type: eventTypeMap[event.type] ?? event.type.toLowerCase(),
        points: event.points ?? 0,
        period: event.period,
        clock_snapshot: event.clockSnapshot,
        team: event.team,
        player_name: event.player.name,
        player_number: event.player.number,
        player_out_name: event.playerOut?.name ?? null,
        player_out_number: event.playerOut?.number ?? null,
      };

      supabase.from("stat_events").insert(eventPayload).then(
        ({ error }) => {
          if (error) {
            console.error("Event sync error (queueing):", error);
            enqueue({ type: "insert_event", payload: eventPayload });
            setQueueLength(getQueueLength());
          }
        },
        (err) => {
          console.error("Event sync exception (queueing):", err);
          enqueue({ type: "insert_event", payload: eventPayload });
          setQueueLength(getQueueLength());
        }
      );

      const newBenchA = configRef.current?.teamA.players.filter(p => !newActiveA.some(a => a.id === p.id)) ?? [];
      const newBenchB = configRef.current?.teamB.players.filter(p => !newActiveB.some(a => a.id === p.id)) ?? [];

      const updatePayload = {
        score_a: newScoreA,
        score_b: newScoreB,
        fouls_a: newFoulsA,
        fouls_b: newFoulsB,
        roster_active_a: newActiveA,
        roster_active_b: newActiveB,
        roster_bench_a: newBenchA,
        roster_bench_b: newBenchB,
      };

      // Update score in games table
      supabase.from("games").update(updatePayload).eq("id", gameIdRef.current).then(
        ({ error }) => {
          if (error) {
            console.error("Score sync error (queueing):", error);
            enqueue({ type: "update_game", payload: updatePayload, gameId: gameIdRef.current! });
            setQueueLength(getQueueLength());
          }
        },
        (err) => {
          console.error("Score sync exception (queueing):", err);
          enqueue({ type: "update_game", payload: updatePayload, gameId: gameIdRef.current! });
          setQueueLength(getQueueLength());
        }
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoreA, scoreB, foulsA, foulsB, activeA, activeB]);

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
      if (bufferPhase.phase === "team" && (key === "1" || key === "2" || key === "3" || key.toLowerCase() === "f" || key.toLowerCase() === "x")) {
        const action = key === "1" ? "ft" : key === "2" ? "2" : key === "3" ? "3" : key.toLowerCase() === "f" ? "f" : "x";
        setBufferPhase({ phase: "action", jersey: bufferPhase.jersey, team: bufferPhase.team, action: action as "2" | "3" | "f" | "ft" | "x" });
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
  const handleStartGame = async () => {
    if (startingA.length !== 5 || startingB.length !== 5) return;
    const cfg = configRef.current;
    if (!cfg) return;

    setActiveA(startingA);
    setActiveB(startingB);
    setPhase("live");
    if (!hideInstructionsForever) {
      setShowInstructions(true);
    }

    // Create game row in Supabase
    const initialBenchA = cfg.teamA.players.filter(p => !startingA.some(s => s.id === p.id));
    const initialBenchB = cfg.teamB.players.filter(p => !startingB.some(s => s.id === p.id));
    const { data, error } = await supabase.from("games").insert({
      status: "active",
      team_a_name: cfg.teamA.name,
      team_b_name: cfg.teamB.name,
      team_a_color: cfg.teamA.colorHex,
      team_b_color: cfg.teamB.colorHex,
      score_a: 0,
      score_b: 0,
      fouls_a: 0,
      fouls_b: 0,
      roster_active_a: startingA,
      roster_active_b: startingB,
      roster_bench_a: initialBenchA,
      roster_bench_b: initialBenchB,
      period: 1,
      clock_seconds: cfg.gameTimeMinutes * 60,
      is_running: false,
      game_time_minutes: cfg.gameTimeMinutes,
      periods: cfg.periods,
      total_periods: cfg.totalPeriods,
    }).select("id").single();

    if (error) {
      console.error("Failed to create game in Supabase:", error);
      window.alert(`Database Error: ${error.message}\n\nDid you forget to run the 00004 SQL migration? The game will not sync to the viewer until the database schema is updated.`);
    } else if (data) {
      gameIdRef.current = data.id;
      localStorage.setItem("wirestats_active_game_id", data.id);
      console.log("Game created in Supabase:", data.id);
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
    setFoulsA(0);
    setFoulsB(0);
    if (gameIdRef.current) {
      supabase.from("games").update({ fouls_a: 0, fouls_b: 0 })
        .eq("id", gameIdRef.current)
        .then(({ error }) => { if (error) console.error("Foul reset sync error:", error); });
    }
  }, [config]);

  const handleNextPeriod = useCallback(() => {
    if (!config) return;
    setPeriod(p => p + 1);
    setClockSeconds(config.gameTimeMinutes * 60);
    setIsRunning(false);
    setFoulsA(0);
    setFoulsB(0);
    if (gameIdRef.current) {
      supabase.from("games").update({ fouls_a: 0, fouls_b: 0 })
        .eq("id", gameIdRef.current)
        .then(({ error }) => { if (error) console.error("Foul reset sync error:", error); });
    }
  }, [config]);

  const handleTimeAdjust = useCallback((amountSeconds: number) => {
    if (isRunning) return;
    setClockSeconds(s => {
      let newTime = s + amountSeconds;
      if (newTime < 0) newTime = 0;
      if (newTime > 59 * 60) newTime = 59 * 60;
      
      // Sync manual adjustments directly
      if (gameIdRef.current) {
        supabase.from("games").update({ clock_seconds: newTime })
          .eq("id", gameIdRef.current)
          .then(({ error }) => { if (error) console.error("Manual clock sync error:", error); });
      }
      return newTime;
    });
  }, [isRunning]);

  const latestClockRef = useRef(clockSeconds);
  useEffect(() => {
    latestClockRef.current = clockSeconds;
  }, [clockSeconds]);

  // ── Clock/period/isRunning sync to Supabase ───────────────────
  useEffect(() => {
    if (!gameIdRef.current) return;
    
    // Sync immediately on play/pause or period change
    supabase.from("games").update({
      clock_seconds: latestClockRef.current,
      period,
      is_running: isRunning,
    }).eq("id", gameIdRef.current)
      .then(({ error }) => { if (error) console.error("Clock sync error:", error); });

    // If running, set an interval to sync every 5 seconds
    if (isRunning) {
      const interval = setInterval(() => {
        if (!gameIdRef.current) return;
        supabase.from("games").update({
          clock_seconds: latestClockRef.current,
        }).eq("id", gameIdRef.current)
          .then(({ error }) => { if (error) console.error("Interval clock sync error:", error); });
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isRunning, period]);

  const handleEndPeriod = useCallback(() => {
    if (!config) return;
    if (period >= config.totalPeriods) {
      if (scoreA === scoreB) {
        setPeriod(p => p + 1);
        setClockSeconds(config.gameTimeMinutes * 60);
        setFoulsA(0);
        setFoulsB(0);
        if (gameIdRef.current) {
          supabase.from("games").update({ fouls_a: 0, fouls_b: 0 })
            .eq("id", gameIdRef.current)
            .then(({ error }) => { if (error) console.error("Foul reset sync error:", error); });
        }
      } else {
        setMatchEnded(true);
        localStorage.removeItem("wirestats_active_game_id");
        // Mark game as finished in Supabase
        if (gameIdRef.current) {
          supabase.from("games").update({ status: "finished" })
            .eq("id", gameIdRef.current)
            .then(({ error }) => { if (error) console.error("Game finish sync error:", error); });
        }
      }
    } else {
      setPeriod(p => p + 1);
      setClockSeconds(config.gameTimeMinutes * 60);
      setFoulsA(0);
      setFoulsB(0);
      if (gameIdRef.current) {
        supabase.from("games").update({ fouls_a: 0, fouls_b: 0 })
          .eq("id", gameIdRef.current)
          .then(({ error }) => { if (error) console.error("Foul reset sync error:", error); });
      }
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
            {isOffline && (
              <span className="font-nunito text-sm font-bold text-red-400 border border-red-900 px-3 py-1 flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Offline {queueLength > 0 ? `(${queueLength})` : ""}
              </span>
            )}
            {!isOffline && queueLength > 0 && (
              <span className="font-nunito text-sm font-bold text-yellow-400 border border-yellow-900 px-3 py-1 animate-pulse">
                Syncing {queueLength}...
              </span>
            )}
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
            <button
              onClick={() => setShowEndGameModal(true)}
              className="font-nunito text-sm font-bold text-red-400 border border-red-900 bg-red-950/30 px-3 py-1 hover:text-white hover:bg-red-900 hover:border-red-500 transition-colors"
            >
              End Game
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

      {/* Modals */}
      {undoTarget && (
        <UndoModal
          event={undoTarget}
          config={config}
          onConfirm={confirmUndo}
          onCancel={() => setUndoTarget(null)}
        />
      )}

      {showInstructions && (
        <InstructionsModal onClose={closeInstructions} />
      )}

      {showEndGameModal && (
        <EndGameModal
          onConfirm={handleEndGame}
          onCancel={() => setShowEndGameModal(false)}
        />
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
