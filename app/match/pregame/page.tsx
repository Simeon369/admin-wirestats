"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { saveMatchConfig, MatchConfig } from "@/lib/gameState";
import { TEAM_COLORS } from "@/components/ui/ColorPicker";
import { Jersey } from "@/components/ui/Jersey";

type RosterPlayer = {
  player_id: string;
  full_name: string;
  jersey_name: string;
  position: string;
};

type ActivePlayer = {
  id: string;         // local UUID for game state
  name: string;       // jersey_name
  number: string;     // jersey number entered on this screen
  globalId: string;   // player_id (Supabase players.id)
};

type TeamSetup = {
  id: string;
  name: string;
  color: string;
  colorId: string;
  roster: RosterPlayer[];
};

// ── Number + Active Toggle per player ────────────────────────────
function PlayerRosterRow({
  player,
  jerseyNumber,
  isActive,
  isStarter,
  teamColor,
  onNumberChange,
  onToggleActive,
  onToggleStarter,
}: {
  player: RosterPlayer;
  jerseyNumber: string;
  isActive: boolean;
  isStarter: boolean;
  teamColor: string;
  onNumberChange: (num: string) => void;
  onToggleActive: () => void;
  onToggleStarter: () => void;
}) {
  return (
    <div className={`flex items-center gap-3 p-3 border-2 transition-all ${
      isActive ? "border-slate-600 bg-slate-800" : "border-slate-700 bg-slate-900 opacity-40"
    }`}>
      {/* Active toggle */}
      <button
        type="button"
        onClick={onToggleActive}
        className={`w-6 h-6 border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
          isActive ? "border-[#65d421] bg-[#65d421]" : "border-slate-600"
        }`}
      >
        {isActive && <span className="text-slate-900 text-xs font-black">✓</span>}
      </button>

      {/* Jersey number input */}
      <input
        type="text"
        placeholder="#"
        value={jerseyNumber}
        onChange={e => onNumberChange(e.target.value.replace(/\D/g, "").slice(0, 2))}
        disabled={!isActive}
        className="w-12 text-center bg-slate-900 border-2 border-slate-600 focus:border-[#65d421] outline-none text-white font-fredoka font-black text-lg py-1 disabled:opacity-30 transition-colors"
      />

      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className="font-fredoka font-black text-white uppercase truncate">{player.jersey_name}</div>
        <div className="font-nunito text-xs text-slate-400 font-bold">{player.full_name} · {player.position}</div>
      </div>

      {/* Starter toggle */}
      {isActive && (
        <button
          type="button"
          onClick={onToggleStarter}
          className={`font-fredoka font-black text-xs uppercase tracking-widest px-3 py-1.5 border-2 transition-all flex-shrink-0 ${
            isStarter
              ? "border-amber-400 bg-amber-400 text-slate-900 shadow-[2px_2px_0_#92400e]"
              : "border-slate-600 text-slate-400 hover:border-slate-400"
          }`}
        >
          {isStarter ? "Starter ★" : "Bench"}
        </button>
      )}
    </div>
  );
}

// ── Main page (wrapped in Suspense) ───────────────────────────────
function PregameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = searchParams.get("game");

  const [teamA, setTeamA] = useState<TeamSetup | null>(null);
  const [teamB, setTeamB] = useState<TeamSetup | null>(null);
  const [tournament, setTournament] = useState<{ period_length_mins: number; period_type: string } | null>(null);
  const [gameInfo, setGameInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState("");

  // Player states: jersey numbers, active (playing), and starting 5
  const [numbersA, setNumbersA] = useState<Record<string, string>>({});
  const [numbersB, setNumbersB] = useState<Record<string, string>>({});
  const [activeA, setActiveA] = useState<Set<string>>(new Set());
  const [activeB, setActiveB] = useState<Set<string>>(new Set());
  const [startersA, setStartersA] = useState<Set<string>>(new Set());
  const [startersB, setStartersB] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (gameId) loadGameData();
  }, [gameId]);

  const loadGameData = async () => {
    setLoading(true);
    try {
      // 1. Load game info
      const { data: game } = await supabase
        .from("games")
        .select("*, tournament:tournament_id (period_length_mins, period_type)")
        .eq("id", gameId!)
        .single();

      if (!game) { setError("Game not found."); setLoading(false); return; }
      setGameInfo(game);
      if (game.tournament) setTournament(game.tournament);

      // 2. Load Team A roster
      if (game.team_a_id) {
        const { data: teamData } = await supabase.from("teams").select("id, name, color").eq("id", game.team_a_id).single();
        const { data: roster, error: rosterErr } = await supabase
          .from("team_rosters")
          .select("player_id, jersey_number, players(full_name, jersey_name, position)")
          .eq("team_id", game.team_a_id);

        if (rosterErr) console.error("Team A roster error:", rosterErr);

        if (teamData) {
          const rosterPlayers: RosterPlayer[] = (roster || []).filter((r: any) => r.players).map((r: any) => ({
            player_id: r.player_id,
            full_name: r.players.full_name,
            jersey_name: r.players.jersey_name,
            position: r.players.position,
          }));
          const colorId = TEAM_COLORS.find(c => c.hex === teamData.color)?.id ?? "blue";
          setTeamA({ id: teamData.id, name: teamData.name, color: teamData.color, colorId, roster: rosterPlayers });
          const ids = new Set(rosterPlayers.map(p => p.player_id));
          setActiveA(ids);
          
          const nums: Record<string, string> = {};
          (roster || []).forEach((r: any) => {
            if (r.jersey_number != null) nums[r.player_id] = String(r.jersey_number);
          });
          setNumbersA(nums);
        }
      }

      // 3. Load Team B roster
      if (game.team_b_id) {
        const { data: teamData } = await supabase.from("teams").select("id, name, color").eq("id", game.team_b_id).single();
        const { data: roster, error: rosterErr } = await supabase
          .from("team_rosters")
          .select("player_id, jersey_number, players(full_name, jersey_name, position)")
          .eq("team_id", game.team_b_id);

        if (rosterErr) console.error("Team B roster error:", rosterErr);

        if (teamData) {
          const rosterPlayers: RosterPlayer[] = (roster || []).filter((r: any) => r.players).map((r: any) => ({
            player_id: r.player_id,
            full_name: r.players.full_name,
            jersey_name: r.players.jersey_name,
            position: r.players.position,
          }));
          const colorId = TEAM_COLORS.find(c => c.hex === teamData.color)?.id ?? "red";
          setTeamB({ id: teamData.id, name: teamData.name, color: teamData.color, colorId, roster: rosterPlayers });
          const ids = new Set(rosterPlayers.map(p => p.player_id));
          setActiveB(ids);

          const nums: Record<string, string> = {};
          (roster || []).forEach((r: any) => {
            if (r.jersey_number != null) nums[r.player_id] = String(r.jersey_number);
          });
          setNumbersB(nums);
        }
      }
    } catch (e) {
      setError("Failed to load game data.");
    } finally {
      setLoading(false);
    }
  };

  const toggleStarter = (team: "A" | "B", playerId: string) => {
    const set = team === "A" ? startersA : startersB;
    const setFn = team === "A" ? setStartersA : setStartersB;
    const newSet = new Set(set);
    if (newSet.has(playerId)) {
      newSet.delete(playerId);
    } else if (newSet.size < 5) {
      newSet.add(playerId);
    }
    setFn(newSet);
  };

  const toggleActive = (team: "A" | "B", playerId: string) => {
    const active = team === "A" ? activeA : activeB;
    const setActive = team === "A" ? setActiveA : setActiveB;
    const starters = team === "A" ? startersA : startersB;
    const setStarters = team === "A" ? setStartersA : setStartersB;
    const newActive = new Set(active);
    if (newActive.has(playerId)) {
      newActive.delete(playerId);
      // Remove from starters too if deactivated
      const newStarters = new Set(starters);
      newStarters.delete(playerId);
      setStarters(newStarters);
    } else {
      newActive.add(playerId);
    }
    setActive(newActive);
  };

  const handleLaunch = async () => {
    if (!teamA || !teamB || !gameInfo) return;
    setError("");

    // Validate
    const activeAPlayers = teamA.roster.filter(p => activeA.has(p.player_id));
    const activeBPlayers = teamB.roster.filter(p => activeB.has(p.player_id));

    if (activeAPlayers.some(p => !numbersA[p.player_id])) { setError(`All active ${teamA.name} players need jersey numbers.`); return; }
    if (activeBPlayers.some(p => !numbersB[p.player_id])) { setError(`All active ${teamB.name} players need jersey numbers.`); return; }
    if (startersA.size !== 5) { setError(`Select exactly 5 starters for ${teamA.name} (${startersA.size}/5).`); return; }
    if (startersB.size !== 5) { setError(`Select exactly 5 starters for ${teamB.name} (${startersB.size}/5).`); return; }

    setLaunching(true);

    const buildPlayers = (team: TeamSetup, active: Set<string>, numbers: Record<string, string>) =>
      team.roster.filter(p => active.has(p.player_id)).map(p => ({
        id: crypto.randomUUID(),
        name: p.jersey_name,
        number: numbers[p.player_id] || "0",
        globalId: p.player_id,
      }));

    const playersA = buildPlayers(teamA, activeA, numbersA);
    const playersB = buildPlayers(teamB, activeB, numbersB);

    const periodMins = tournament?.period_length_mins ?? 10;
    const isHalf = tournament?.period_type === "HALF";

    const config: MatchConfig = {
      teamA: { name: teamA.name, colorId: teamA.colorId, colorHex: teamA.color, players: playersA },
      teamB: { name: teamB.name, colorId: teamB.colorId, colorHex: teamB.color, players: playersB },
      gameTimeMinutes: periodMins,
      periods: isHalf ? "2 halves" : "4 quarters",
      totalPeriods: isHalf ? 2 : 4,
    };
    saveMatchConfig(config);

    // Update game record in Supabase (it already exists — just activate it)
    const starterAIds = new Set([...startersA].map(pid => playersA.find(p => p.globalId === pid)?.id).filter(Boolean));
    const starterBIds = new Set([...startersB].map(pid => playersB.find(p => p.globalId === pid)?.id).filter(Boolean));
    const startingA = playersA.filter(p => starterAIds.has(p.id));
    const startingB = playersB.filter(p => starterBIds.has(p.id));
    const benchA = playersA.filter(p => !starterAIds.has(p.id));
    const benchB = playersB.filter(p => !starterBIds.has(p.id));

    await supabase.from("games").update({
      status: "active",
      team_a_color: teamA.color,
      team_b_color: teamB.color,
      score_a: 0, score_b: 0, fouls_a: 0, fouls_b: 0,
      roster_active_a: startingA,
      roster_active_b: startingB,
      roster_bench_a: benchA,
      roster_bench_b: benchB,
      period: 1,
      clock_seconds: periodMins * 60,
      is_running: false,
      game_time_minutes: periodMins,
      periods: config.periods,
      total_periods: config.totalPeriods,
    }).eq("id", gameId!);

    // Insert game_rosters
    const rosterRows = [
      ...playersA.map(p => ({ game_id: gameId, player_id: p.globalId, team: "A", jersey_number: parseInt(p.number, 10) || 0, is_starting_five: starterAIds.has(p.id) })),
      ...playersB.map(p => ({ game_id: gameId, player_id: p.globalId, team: "B", jersey_number: parseInt(p.number, 10) || 0, is_starting_five: starterBIds.has(p.id) })),
    ];
    if (rosterRows.length > 0) await supabase.from("game_rosters").insert(rosterRows);

    // Store game ID so game page can resume it
    localStorage.setItem("wirestats_active_game_id", gameId!);

    router.push("/game");
  };

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center font-fredoka text-2xl text-slate-400 uppercase tracking-widest animate-pulse">Loading Rosters...</div>;
  if (error && !teamA && !teamB) return <div className="min-h-screen bg-slate-900 flex items-center justify-center font-fredoka text-2xl text-red-400">{error}</div>;

  const renderTeamPanel = (
    team: TeamSetup,
    side: "A" | "B",
    active: Set<string>,
    starters: Set<string>,
    numbers: Record<string, string>,
    setNumbers: (fn: (prev: Record<string, string>) => Record<string, string>) => void
  ) => {
    const activePlayers = team.roster.filter(p => active.has(p.player_id));
    return (
      <div className="flex flex-col gap-4 bg-slate-800 border-4 border-slate-700 p-5 shadow-[6px_6px_0_#0f172a]">
        <div className="flex items-center gap-3 border-b-2 border-slate-700 pb-4">
          <div className="w-10 h-10 rounded-full border-4 border-slate-900 shadow-[3px_3px_0_#0f172a]" style={{ backgroundColor: team.color }} />
          <div>
            <h2 className="font-fredoka text-2xl font-black uppercase tracking-widest text-white">{team.name}</h2>
            <p className="font-nunito text-xs font-bold text-slate-400 uppercase tracking-wider">
              {activePlayers.length} active · {starters.size}/5 starters selected
            </p>
          </div>
        </div>

        {team.roster.length === 0 ? (
          <p className="font-nunito font-bold text-slate-500 text-sm text-center py-4">No roster found for this team.</p>
        ) : (
          <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-1">
            {team.roster.map(player => (
              <PlayerRosterRow
                key={player.player_id}
                player={player}
                jerseyNumber={numbers[player.player_id] ?? ""}
                isActive={active.has(player.player_id)}
                isStarter={starters.has(player.player_id)}
                teamColor={team.color}
                onNumberChange={num => setNumbers(prev => ({ ...prev, [player.player_id]: num }))}
                onToggleActive={() => toggleActive(side, player.player_id)}
                onToggleStarter={() => toggleStarter(side, player.player_id)}
              />
            ))}
          </div>
        )}

        {/* Starting 5 visual */}
        {starters.size > 0 && (
          <div className="border-t-2 border-slate-700 pt-4">
            <p className="font-nunito text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Starting 5</p>
            <div className="flex flex-wrap gap-2">
              {team.roster.filter(p => starters.has(p.player_id)).map(p => (
                <Jersey
                  key={p.player_id}
                  number={numbers[p.player_id] || "?"}
                  name={p.jersey_name}
                  colorHex={team.color}
                  size="md"
                />
              ))}
              {Array.from({ length: 5 - starters.size }).map((_, i) => (
                <div key={i} className="w-14 h-16 border-4 border-dashed border-slate-600 flex items-center justify-center">
                  <span className="text-slate-600 font-fredoka font-black text-xl">?</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const readyToLaunch = startersA.size === 5 && startersB.size === 5;

  return (
    <div className="min-h-screen bg-slate-900 font-nunito pb-32">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-4 border-b-4 border-slate-700">
        <button onClick={() => router.back()} className="font-fredoka text-sm font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">← Back</button>
        <div className="h-6 w-px bg-slate-600" />
        <h1 className="font-fredoka text-2xl font-black tracking-widest text-white">
          Wire<span className="text-[#65d421]" style={{ textShadow: "1px 1px 0 #1b630a,2px 2px 0 #1b630a" }}>Stats</span>
          <span className="text-slate-500 ml-3 text-lg font-bold uppercase tracking-wider">/ Pre-Game</span>
        </h1>
        {gameInfo?.round_name && (
          <span className="ml-auto font-fredoka font-black text-sm uppercase tracking-widest bg-slate-700 text-slate-300 px-3 py-1 border-2 border-slate-600">
            {gameInfo.round_name}
          </span>
        )}
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">
        <div className="text-center">
          <p className="font-fredoka text-3xl font-black text-white uppercase tracking-widest">
            {gameInfo?.team_a_name} <span className="text-slate-500">vs</span> {gameInfo?.team_b_name}
          </p>
          <p className="font-nunito font-bold text-slate-400 mt-1">
            Toggle active players, assign jersey numbers, then select your Starting 5.
          </p>
        </div>

        {/* Team Panels */}
        <div className="grid md:grid-cols-2 gap-6">
          {teamA && renderTeamPanel(teamA, "A", activeA, startersA, numbersA, setNumbersA)}
          {teamB && renderTeamPanel(teamB, "B", activeB, startersB, numbersB, setNumbersB)}
        </div>

        {/* Launch Button */}
        <div className="flex flex-col items-center gap-3 mt-4">
          {error && (
            <p className="font-nunito font-bold text-red-400 text-center">⚠ {error}</p>
          )}
          {!readyToLaunch && (
            <p className="font-nunito font-bold text-slate-500 text-sm text-center">
              Select 5 starters for each team to launch the game.
            </p>
          )}
          <button
            onClick={handleLaunch}
            disabled={!readyToLaunch || launching}
            className={`font-fredoka text-2xl font-black uppercase tracking-widest px-16 py-5 border-4 transition-all ${
              readyToLaunch && !launching
                ? "bg-[#65d421] border-[#1b630a] text-slate-900 shadow-[6px_6px_0_#1b630a] hover:-translate-y-1 hover:shadow-[8px_8px_0_#1b630a] active:translate-y-0 active:shadow-none"
                : "bg-slate-700 border-slate-600 text-slate-500 cursor-not-allowed"
            }`}
          >
            {launching ? "Launching..." : "🏀 LAUNCH GAME"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PregamePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center font-fredoka text-2xl text-slate-400 animate-pulse">Loading...</div>}>
      <PregameContent />
    </Suspense>
  );
}
