"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChunkyButton } from "@/components/ui/ChunkyButton";
import { ChunkyInput } from "@/components/ui/ChunkyInput";
import { ChunkySelect } from "@/components/ui/ChunkySelect";
import { ColorPicker, TEAM_COLORS } from "@/components/ui/ColorPicker";
import { Jersey } from "@/components/ui/Jersey";
import { saveMatchConfig } from "@/lib/gameState";

type Player = { id: string; name: string; number: string };
type Team = { name: string; colorId: string; players: Player[] };

export default function MatchCreationDashboard() {
  const router = useRouter();
  const [teamA, setTeamA] = useState<Team>({ name: "", colorId: "red", players: [] });
  const [teamB, setTeamB] = useState<Team>({ name: "", colorId: "blue", players: [] });
  const [gameTime, setGameTime] = useState("10");
  const [customGameTime, setCustomGameTime] = useState("");
  const [periods, setPeriods] = useState("4 quarters");

  const [newPlayerA, setNewPlayerA] = useState({ name: "", number: "" });
  const [newPlayerB, setNewPlayerB] = useState({ name: "", number: "" });
  const [dupErrorA, setDupErrorA] = useState(false);
  const [dupErrorB, setDupErrorB] = useState(false);

  const numRefA = useRef<HTMLInputElement>(null);
  const nameRefA = useRef<HTMLInputElement>(null);
  const numRefB = useRef<HTMLInputElement>(null);
  const nameRefB = useRef<HTMLInputElement>(null);

  const handleAddPlayer = (team: "A" | "B") => {
    if (team === "A") {
      if (!newPlayerA.name || !newPlayerA.number) return;
      if (teamA.players.some(p => p.number === newPlayerA.number)) {
        setDupErrorA(true);
        return;
      }
      setDupErrorA(false);
      setTeamA({ ...teamA, players: [...teamA.players, { id: crypto.randomUUID(), ...newPlayerA }] });
      setNewPlayerA({ name: "", number: "" });
      setTimeout(() => numRefA.current?.focus(), 10);
    } else {
      if (!newPlayerB.name || !newPlayerB.number) return;
      if (teamB.players.some(p => p.number === newPlayerB.number)) {
        setDupErrorB(true);
        return;
      }
      setDupErrorB(false);
      setTeamB({ ...teamB, players: [...teamB.players, { id: crypto.randomUUID(), ...newPlayerB }] });
      setNewPlayerB({ name: "", number: "" });
      setTimeout(() => numRefB.current?.focus(), 10);
    }
  };

  const updatePlayer = (team: "A" | "B", id: string, field: "name" | "number", value: string) => {
    const updateFn = (t: Team) => ({
      ...t,
      players: t.players.map(p => p.id === id ? { ...p, [field]: value } : p)
    });
    team === "A" ? setTeamA(updateFn(teamA)) : setTeamB(updateFn(teamB));
  };

  const removePlayer = (team: "A" | "B", id: string) => {
    const filterFn = (t: Team) => ({
      ...t,
      players: t.players.filter(p => p.id !== id)
    });
    team === "A" ? setTeamA(filterFn(teamA)) : setTeamB(filterFn(teamB));
  };

  const handleStartMatch = () => {
    const finalGameTime = parseInt(gameTime === "custom" ? customGameTime : gameTime, 10) || 10;
    const totalPeriods = periods === "4 quarters" ? 4 : 2;

    const buildTeam = (team: Team) => ({
      ...team,
      colorHex: TEAM_COLORS.find(c => c.id === team.colorId)?.hex ?? '#ccc',
    });

    saveMatchConfig({
      teamA: buildTeam(teamA),
      teamB: buildTeam(teamB),
      gameTimeMinutes: finalGameTime,
      periods,
      totalPeriods,
    });

    router.push('/game');
  };

  const validationErrors: string[] = [];
  if (!teamA.name.trim()) validationErrors.push("Team A needs a name");
  if (!teamB.name.trim()) validationErrors.push("Team B needs a name");
  if (teamA.players.length < 5) validationErrors.push(`Team A needs ${5 - teamA.players.length} more player(s)`);
  if (teamB.players.length < 5) validationErrors.push(`Team B needs ${5 - teamB.players.length} more player(s)`);
  const canStart = validationErrors.length === 0;

  const renderTeamSection = (team: "A" | "B", teamData: Team, setTeamData: (t: Team) => void) => (
    <div className="flex flex-col gap-6 p-6 border-4 border-slate-900 bg-white shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
      <h2 className="font-fredoka text-3xl uppercase tracking-wider text-slate-900">
        Team {team}
      </h2>
      
      <ChunkyInput
        label="Team Name"
        placeholder="e.g. Wildcats"
        value={teamData.name}
        onChange={(e) => {
          const val = e.target.value.replace(/\b\w/g, (c) => c.toUpperCase());
          setTeamData({ ...teamData, name: val });
        }}
        fullWidth
      />

      <ColorPicker
        label="Team Color"
        selectedColorId={teamData.colorId}
        onChange={(colorId) => setTeamData({ ...teamData, colorId })}
      />

      <div className="mt-4 border-t-4 border-slate-900 pt-4">
        <h3 className="font-fredoka text-2xl uppercase text-slate-900 mb-3">Roster</h3>

        {(team === "A" ? dupErrorA : dupErrorB) && (
          <p className="font-nunito text-sm font-bold text-red-600">⚠ Jersey No. already taken</p>
        )}
        <div className="flex items-center gap-2 mb-6">
          <ChunkyInput
            ref={team === "A" ? numRefA : numRefB}
            placeholder="#"
            className="w-16 text-center h-[56px]"
            value={team === "A" ? newPlayerA.number : newPlayerB.number}
            error={team === "A" ? (dupErrorA ? "" : undefined) : (dupErrorB ? "" : undefined)}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              if (team === "A") { setDupErrorA(false); setNewPlayerA({ ...newPlayerA, number: val }); }
              else { setDupErrorB(false); setNewPlayerB({ ...newPlayerB, number: val }); }
            }}
            onKeyDown={(e) => {
              if (/^[a-zA-Z]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                const nameRef = team === "A" ? nameRefA : nameRefB;
                const setter = team === "A" ? setNewPlayerA : setNewPlayerB;
                const playerState = team === "A" ? newPlayerA : newPlayerB;
                nameRef.current?.focus();
                setter({ ...playerState, name: playerState.name + e.key.toUpperCase() });
              } else if (e.key === "Enter") {
                e.preventDefault();
                handleAddPlayer(team);
              }
            }}
          />
          <ChunkyInput
            ref={team === "A" ? nameRefA : nameRefB}
            placeholder="Player Name"
            className="flex-1 h-[56px]"
            value={team === "A" ? newPlayerA.name : newPlayerB.name}
            onChange={(e) => {
              const val = e.target.value.replace(/[0-9]/g, '').replace(/\b\w/g, (c) => c.toUpperCase());
              team === "A" ? setNewPlayerA({ ...newPlayerA, name: val }) : setNewPlayerB({ ...newPlayerB, name: val });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddPlayer(team);
              }
            }}
          />
          <ChunkyButton size="md" variant="primary" className="h-[56px]" onClick={() => handleAddPlayer(team)}>
            ADD
          </ChunkyButton>
        </div>

        {teamData.players.length === 0 ? (
          <p className="text-slate-500 font-nunito italic mb-4">No players added yet.</p>
        ) : (
          <div className="grid grid-cols-5 gap-3">
            {[...teamData.players].sort((a, b) => parseInt(a.number || '0') - parseInt(b.number || '0')).map((player) => {
              const colorHex = TEAM_COLORS.find(c => c.id === teamData.colorId)?.hex || '#ccc';
              return (
                <Jersey
                  key={player.id}
                  number={player.number}
                  name={player.name}
                  colorHex={colorHex}
                  size="md"
                  onRemove={() => removePlayer(team, player.id)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f1f5f9] p-8 pb-20">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        <header className="border-b-4 border-slate-900 pb-6 mb-4 flex items-end gap-2">
          <h1 className="font-fredoka text-6xl font-black tracking-widest text-[#1f1f1f]">
            Wire<span 
              className="text-[#65d421] ml-2"
              style={{
                textShadow: "1px 1px 0 #1b630a, 2px 2px 0 #1b630a, 3px 3px 0 #1b630a, 4px 4px 0 #1b630a, -1px -1px 0 #1b630a, 1px -1px 0 #1b630a, -1px 1px 0 #1b630a",
                WebkitTextStroke: "1px #1b630a"
              }}
            >
              Stats
            </span>
          </h1>
          <p className="font-nunito text-xl mb-1 ml-4 text-slate-700 font-bold uppercase tracking-wider">
            Admin Dashboard
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          {renderTeamSection("A", teamA, setTeamA)}
          {renderTeamSection("B", teamB, setTeamB)}
        </div>

        <div className="flex flex-col gap-6 p-6 border-4 border-slate-900 bg-white shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
          <h2 className="font-fredoka text-3xl uppercase tracking-wider text-slate-900">
            Game Settings
          </h2>
          <div className="grid md:grid-cols-2 gap-4 items-start">
            <div className="flex flex-col gap-2">
              <ChunkySelect
                label="Game Time (Minutes per period)"
                value={gameTime}
                onChange={setGameTime}
                options={[
                  { value: "5", label: "5 Minutes" },
                  { value: "10", label: "10 Minutes" },
                  { value: "12", label: "12 Minutes" },
                  { value: "15", label: "15 Minutes" },
                  { value: "20", label: "20 Minutes" },
                  { value: "custom", label: "Custom..." },
                ]}
                fullWidth
                direction="up"
              />
              {gameTime === "custom" && (
                <ChunkyInput
                  type="number"
                  placeholder="Enter custom minutes..."
                  value={customGameTime}
                  onChange={(e) => setCustomGameTime(e.target.value)}
                  fullWidth
                />
              )}
            </div>
            <ChunkySelect
              label="Periods"
              value={periods}
              onChange={setPeriods}
              options={[
                { value: "4 quarters", label: "4 Quarters" },
                { value: "2 halves", label: "2 Halves" },
              ]}
              fullWidth
              direction="up"
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 mt-8">
          {!canStart && (
            <ul className="flex flex-col items-center gap-1">
              {validationErrors.map((err, i) => (
                <li key={i} className="font-nunito text-sm font-semibold text-red-600 flex items-center gap-1">
                  <span>⚠</span> {err}
                </li>
              ))}
            </ul>
          )}
          <ChunkyButton
            size="lg"
            variant="primary"
            onClick={handleStartMatch}
            disabled={!canStart}
            className={`px-16 text-3xl transition-opacity ${!canStart ? 'opacity-40 cursor-not-allowed active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_#1b630a,2px_2px_0_#1b630a,3px_3px_0_#1b630a,4px_4px_0_#1b630a,5px_5px_0_#1b630a,6px_6px_0_#1b630a]' : ''}`}
          >
            START MATCH
          </ChunkyButton>
        </div>
      </div>
    </div>
  );
}
