"use client";

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ColorPicker, TEAM_COLORS } from "@/components/ui/ColorPicker";
import { Jersey } from "@/components/ui/Jersey";
import { saveMatchConfig } from "@/lib/gameState";
import { supabase } from "@/lib/supabase";
import { GlobalPlayer } from "@/lib/types";

type Player = { id: string; name: string; number: string; globalId: string };
type Team = { name: string; colorId: string; players: Player[] };

const POSITIONS = ["PG", "SG", "SF", "PF", "C"];

export type AutocompleteHandle = {
  focusAndAppend: (char: string) => void;
};

// ── Player Autocomplete ──────────────────────────────────────────
const PlayerAutocomplete = forwardRef<
  AutocompleteHandle,
  {
    globalPlayers: GlobalPlayer[];
    onPlayerSelect: (player: GlobalPlayer) => void;
  }
>(({ globalPlayers, onPlayerSelect }, ref) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  
  useImperativeHandle(ref, () => ({
    focusAndAppend: (char: string) => {
      setQuery(prev => prev + char);
      inputRef.current?.focus();
      setOpen(true);
    }
  }));

  const filtered = query.trim() === "" 
    ? [] 
    : globalPlayers.filter(p => p.full_name.toLowerCase().includes(query.toLowerCase()) || p.jersey_name.toLowerCase().includes(query.toLowerCase())).slice(0, 5);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || filtered.length === 0) return;
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      onPlayerSelect(filtered[highlightedIndex]);
      setQuery("");
      setOpen(false);
      setHighlightedIndex(0);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative flex-1">
      <input 
        ref={inputRef}
        type="text" 
        placeholder="Type player name..."
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlightedIndex(0);
        }}
        onFocus={() => { if(query) setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        className="w-full bg-slate-900 border-2 border-slate-600 focus:border-[#65d421] outline-none text-white font-nunito font-bold px-3 py-2 text-sm placeholder:text-slate-600 transition-colors h-10"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-slate-800 border-2 border-slate-600 shadow-[4px_4px_0_#0f172a] max-h-60 overflow-y-auto">
          {filtered.map((p, i) => (
            <div 
              key={p.id}
              onMouseDown={(e) => {
                e.preventDefault(); // prevent blur
                onPlayerSelect(p);
                setQuery("");
                setOpen(false);
              }}
              onMouseEnter={() => setHighlightedIndex(i)}
              className={`px-3 py-2 cursor-pointer flex justify-between items-center transition-colors ${highlightedIndex === i ? 'bg-slate-700' : 'hover:bg-slate-700'}`}
            >
              <div className="flex flex-col">
                <span className="font-fredoka text-sm font-black text-white">{p.full_name}</span>
                <span className="font-nunito text-[10px] text-slate-400 font-bold uppercase">{p.jersey_name}</span>
              </div>
              <span className="font-fredoka text-xs font-black text-slate-400 bg-slate-900 px-1.5 py-0.5 border border-slate-700">{p.position}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});


export default function MatchSetup() {
  const router = useRouter();

  const [globalPlayers, setGlobalPlayers] = useState<GlobalPlayer[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);

  const [teamA, setTeamA] = useState<Team>({ name: "", colorId: "red", players: [] });
  const [teamB, setTeamB] = useState<Team>({ name: "", colorId: "blue", players: [] });
  
  const [gameTime, setGameTime] = useState("10");
  const [customGameTime, setCustomGameTime] = useState("");
  const [periods, setPeriods] = useState("4 quarters");

  const [newPlayerNumberA, setNewPlayerNumberA] = useState("");
  const [newPlayerNumberB, setNewPlayerNumberB] = useState("");
  const [dupErrorA, setDupErrorA] = useState(false);
  const [dupErrorB, setDupErrorB] = useState(false);

  const numInputARef = useRef<HTMLInputElement>(null);
  const numInputBRef = useRef<HTMLInputElement>(null);
  const autocompleteARef = useRef<AutocompleteHandle>(null);
  const autocompleteBRef = useRef<AutocompleteHandle>(null);

  // Quick Register Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [qrFullName, setQrFullName] = useState("");
  const [qrJerseyName, setQrJerseyName] = useState("");
  const [qrPosition, setQrPosition] = useState("");
  const [qrGender, setQrGender] = useState("");
  const [qrAge, setQrAge] = useState<number | "">("");
  const [qrFormError, setQrFormError] = useState("");
  const [targetTeamForQR, setTargetTeamForQR] = useState<"A" | "B" | null>(null);
  
  const qrSubmitBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    setLoadingPlayers(true);
    const { data } = await supabase.from("players").select("*").order("created_at", { ascending: false });
    if (data) {
      setGlobalPlayers(data as GlobalPlayer[]);
    }
    setLoadingPlayers(false);
  };

  const handleAddPlayer = (team: "A" | "B", globalPlayer: GlobalPlayer) => {
    const number = team === "A" ? newPlayerNumberA : newPlayerNumberB;
    
    if (!number) return;

    const targetTeam = team === "A" ? teamA : teamB;
    const setTargetTeam = team === "A" ? setTeamA : setTeamB;
    const setDupError = team === "A" ? setDupErrorA : setDupErrorB;

    if (targetTeam.players.some(p => p.number === number)) {
      setDupError(true);
      return;
    }
    
    if (targetTeam.players.some(p => p.globalId === globalPlayer.id)) {
      return;
    }

    setDupError(false);
    setTargetTeam({
      ...targetTeam,
      players: [
        ...targetTeam.players,
        { id: crypto.randomUUID(), name: globalPlayer.jersey_name, number, globalId: globalPlayer.id }
      ]
    });


    if (team === "A") {
      setNewPlayerNumberA("");
      // setTimeout to ensure it happens after React state updates clear the input and UI
      setTimeout(() => numInputARef.current?.focus(), 10);
    } else {
      setNewPlayerNumberB("");
      setTimeout(() => numInputBRef.current?.focus(), 10);
    }
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
      players: team.players.map(p => ({
        id: p.id,
        name: p.name,
        number: p.number,
        globalId: p.globalId,
      })),
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

  const handleQuickRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrFullName.trim()) {
      setQrFormError("Please enter the player's full name.");
      return;
    }
    if (!qrJerseyName.trim()) {
      setQrFormError("Please enter the player's jersey name.");
      return;
    }
    if (!qrPosition) {
      setQrFormError("Please select a position for the player.");
      return;
    }

    if (!qrGender) {
      setQrFormError("Please select a gender for the player.");
      return;
    }

    if (!qrAge) {
      setQrFormError("Please enter an age for the player.");
      return;
    }

    setQrFormError("");
    
    const { data } = await supabase.from("players").insert([
      { full_name: qrFullName.trim(), jersey_name: qrJerseyName.trim(), position: qrPosition, gender: qrGender, age: Number(qrAge) }
    ]).select();

    if (data && data.length > 0) {
      const newPlayer = data[0] as GlobalPlayer;
      setGlobalPlayers([newPlayer, ...globalPlayers]);
      
      setIsModalOpen(false);
      setQrFullName("");
      setQrJerseyName("");
      setQrPosition("");
      setQrGender("");
      setQrAge("");
    }
  };

  const validationErrors: string[] = [];
  if (!teamA.name.trim()) validationErrors.push("Team A needs a name");
  if (!teamB.name.trim()) validationErrors.push("Team B needs a name");
  if (teamA.players.length < 5) validationErrors.push(`Team A needs ${5 - teamA.players.length} more player(s)`);
  if (teamB.players.length < 5) validationErrors.push(`Team B needs ${5 - teamB.players.length} more player(s)`);
  const canStart = validationErrors.length === 0;

  const renderTeamSection = (team: "A" | "B", teamData: Team, setTeamData: (t: Team) => void) => (
    <div className="flex flex-col gap-5 p-5 border-4 border-slate-700 bg-slate-800 shadow-[6px_6px_0_#0f172a]">
      <h2 className="font-fredoka text-2xl uppercase tracking-wider text-white">
        Team {team}
      </h2>
      
      <div className="flex flex-col gap-1">
        <label className="font-nunito text-xs font-bold uppercase tracking-widest text-slate-400">
          Team Name
        </label>
        <input
          type="text"
          placeholder="e.g. Wildcats"
          value={teamData.name}
          onChange={(e) => {
            const val = e.target.value.replace(/\b\w/g, (c) => c.toUpperCase());
            setTeamData({ ...teamData, name: val });
          }}
          className="bg-slate-900 border-2 border-slate-600 focus:border-[#65d421] outline-none text-white font-nunito font-bold px-3 py-2.5 text-sm placeholder:text-slate-600 transition-colors"
        />
      </div>

      <ColorPicker
        label="Team Color"
        selectedColorId={teamData.colorId}
        onChange={(colorId) => setTeamData({ ...teamData, colorId })}
      />

      <div className="mt-2 border-t-2 border-slate-700 pt-4">
        <h3 className="font-fredoka text-xl uppercase text-white mb-2">Roster</h3>

        {(team === "A" ? dupErrorA : dupErrorB) && (
          <p className="font-nunito text-xs font-bold text-red-400 mb-2">⚠ Jersey No. already taken</p>
        )}
        
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex gap-2">
            <input
              ref={team === "A" ? numInputARef : numInputBRef}
              type="text"
              placeholder="#"
              className="w-14 bg-slate-900 border-2 border-slate-600 focus:border-[#65d421] outline-none text-white font-nunito font-bold px-2 py-2 text-sm text-center placeholder:text-slate-600 transition-colors h-10"
              value={team === "A" ? newPlayerNumberA : newPlayerNumberB}
              onChange={(e) => {
                const val = e.target.value;
                const letters = val.replace(/[^a-zA-Z]/g, '');
                const numbers = val.replace(/\D/g, '');
                
                team === "A" ? setNewPlayerNumberA(numbers) : setNewPlayerNumberB(numbers);
                team === "A" ? setDupErrorA(false) : setDupErrorB(false);

                if (letters.length > 0) {
                  team === "A" 
                    ? autocompleteARef.current?.focusAndAppend(letters)
                    : autocompleteBRef.current?.focusAndAppend(letters);
                }
              }}
            />
            <PlayerAutocomplete 
              ref={team === "A" ? autocompleteARef : autocompleteBRef}
              globalPlayers={globalPlayers} 
              onPlayerSelect={(player) => handleAddPlayer(team, player)}
            />
          </div>
          <button 
            type="button"
            className="text-xs font-nunito font-bold text-slate-400 self-start hover:text-[#65d421] transition-colors"
            onClick={() => {
              setTargetTeamForQR(team);
              setIsModalOpen(true);
            }}
          >
            + Quick-Register Missing Player
          </button>
        </div>

        {teamData.players.length === 0 ? (
          <p className="text-slate-500 font-nunito text-sm italic mb-2">No players added yet.</p>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
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
    <div className="min-h-screen bg-slate-900">
      <header className="flex items-center gap-4 px-4 sm:px-8 py-4 border-b-4 border-slate-700">
        <Link
          href="/"
          className="font-fredoka text-sm font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
        >
          ← Back
        </Link>
        <div className="h-6 w-px bg-slate-600" />
        <h1 className="font-fredoka text-2xl sm:text-3xl font-black tracking-widest text-white">
          Wire<span
            className="text-[#65d421]"
            style={{ textShadow: "1px 1px 0 #1b630a,2px 2px 0 #1b630a", WebkitTextStroke: "1px #1b630a" }}
          >Stats</span>
          <span className="text-slate-500 ml-3 text-lg sm:text-xl font-bold uppercase tracking-wider">/ Match Setup</span>
        </h1>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">

        <div className="grid md:grid-cols-2 gap-6">
          {renderTeamSection("A", teamA, setTeamA)}
          {renderTeamSection("B", teamB, setTeamB)}
        </div>

        <div className="flex flex-col gap-5 p-5 border-4 border-slate-700 bg-slate-800 shadow-[6px_6px_0_#0f172a]">
          <h2 className="font-fredoka text-2xl uppercase tracking-wider text-white">
            Game Settings
          </h2>
          <div className="grid md:grid-cols-2 gap-4 items-start">
            <div className="flex flex-col gap-1">
              <label className="font-nunito text-xs font-bold uppercase tracking-widest text-slate-400">Game Time</label>
              <select
                value={gameTime}
                onChange={e => setGameTime(e.target.value)}
                className="bg-slate-900 border-2 border-slate-600 focus:border-[#65d421] outline-none text-white font-nunito font-bold px-3 py-2.5 text-sm transition-colors"
              >
                <option value="5">5 Minutes</option>
                <option value="10">10 Minutes</option>
                <option value="12">12 Minutes</option>
                <option value="15">15 Minutes</option>
                <option value="20">20 Minutes</option>
                <option value="custom">Custom...</option>
              </select>
              {gameTime === "custom" && (
                <input
                  type="number"
                  placeholder="Enter custom minutes..."
                  value={customGameTime}
                  onChange={(e) => setCustomGameTime(e.target.value)}
                  className="mt-2 bg-slate-900 border-2 border-slate-600 focus:border-[#65d421] outline-none text-white font-nunito font-bold px-3 py-2 text-sm transition-colors"
                />
              )}
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="font-nunito text-xs font-bold uppercase tracking-widest text-slate-400">Periods</label>
              <select
                value={periods}
                onChange={e => setPeriods(e.target.value)}
                className="bg-slate-900 border-2 border-slate-600 focus:border-[#65d421] outline-none text-white font-nunito font-bold px-3 py-2.5 text-sm transition-colors"
              >
                <option value="4 quarters">4 Quarters</option>
                <option value="2 halves">2 Halves</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 mt-4">
          {!canStart && (
            <ul className="flex flex-col items-center gap-1">
              {validationErrors.map((err, i) => (
                <li key={i} className="font-nunito text-sm font-bold text-red-400 flex items-center gap-1">
                  <span>⚠</span> {err}
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={handleStartMatch}
            disabled={!canStart}
            className={`font-fredoka text-2xl font-black uppercase tracking-widest px-12 py-4 border-4 transition-all ${
              canStart
                ? "bg-[#65d421] border-[#1b630a] text-slate-900 shadow-[6px_6px_0_#1b630a] hover:-translate-y-1 hover:shadow-[8px_8px_0_#1b630a] active:translate-y-0 active:shadow-[2px_2px_0_#1b630a]"
                : "bg-slate-700 border-slate-600 text-slate-500 cursor-not-allowed"
            }`}
          >
            START MATCH
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80" onClick={() => setIsModalOpen(false)} />
          <form 
            onSubmit={handleQuickRegister}
            className="relative z-10 bg-slate-800 border-4 border-slate-600 shadow-[8px_8px_0_#0f172a] p-6 max-w-sm w-full flex flex-col gap-4"
          >
            <div className="flex justify-between items-center border-b-2 border-slate-700 pb-2">
              <h2 className="font-fredoka text-xl uppercase tracking-wider text-white">Quick Register</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="font-bold text-slate-400 hover:text-white">X</button>
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="font-nunito text-xs font-bold uppercase tracking-widest text-slate-400">Full Name</label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={qrFullName}
                onChange={(e) => {
                  const val = e.target.value;
                  const titleCased = val
                    .split(" ")
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(" ");
                  setQrFullName(titleCased);
                  setQrFormError("");
                  const first = titleCased.trim().split(" ")[0];
                  setQrJerseyName(first ? first.toUpperCase() : "");
                }}
                className="bg-slate-900 border-2 border-slate-600 focus:border-[#65d421] outline-none text-white font-nunito font-bold px-3 py-2 text-sm transition-colors"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-nunito text-xs font-bold uppercase tracking-widest text-slate-400">Jersey Name</label>
              <input
                type="text"
                placeholder="JOHN"
                value={qrJerseyName}
                onChange={(e) => {
                  setQrJerseyName(e.target.value.toUpperCase());
                  setQrFormError("");
                }}
                className="bg-slate-900 border-2 border-slate-600 focus:border-[#65d421] outline-none text-white font-nunito font-bold px-3 py-2 text-sm uppercase transition-colors"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1 flex flex-col gap-1">
                <label className="font-nunito text-xs font-bold uppercase tracking-widest text-slate-400">Position</label>
                <div className="flex gap-1 flex-wrap">
                  {POSITIONS.map(pos => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => {
                        setQrPosition(pos);
                        setQrFormError("");
                      }}
                      className={`font-fredoka text-xs font-black px-2.5 py-1 border-2 transition-all ${
                        qrPosition === pos
                          ? "bg-[#65d421] border-[#1b630a] text-slate-900"
                          : "bg-slate-900 border-slate-600 text-slate-400 hover:text-white"
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <label className="font-nunito text-xs font-bold uppercase tracking-widest text-slate-400">Gender</label>
                <div className="flex gap-1 flex-wrap">
                  {["Male", "Female", "Other"].map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        setQrGender(g);
                        setQrFormError("");
                        qrSubmitBtnRef.current?.focus();
                      }}
                      className={`font-fredoka text-xs font-black px-2.5 py-1 border-2 transition-all ${
                        qrGender === g
                          ? "bg-[#65d421] border-[#1b630a] text-slate-900"
                          : "bg-slate-900 border-slate-600 text-slate-400 hover:text-white"
                      }`}
                    >
                      {g.charAt(0)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-nunito text-xs font-bold uppercase tracking-widest text-slate-400">Age</label>
              <input
                type="number"
                placeholder="e.g. 24"
                value={qrAge}
                onChange={e => {
                  setQrAge(e.target.value === "" ? "" : Number(e.target.value));
                  setQrFormError("");
                }}
                className="bg-slate-900 border-2 border-slate-600 focus:border-[#65d421] outline-none text-white font-nunito font-bold px-3 py-2 text-sm transition-colors"
                min={1}
                max={99}
              />
            </div>

            {qrFormError && (
              <p className="font-nunito text-sm font-bold text-red-400 mt-1 mb-1">⚠ {qrFormError}</p>
            )}

            <div className="flex gap-2 mt-2">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 font-fredoka text-sm font-black uppercase tracking-widest py-2 border-2 bg-slate-700 border-slate-600 text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                ref={qrSubmitBtnRef}
                type="submit" 
                className="flex-1 font-fredoka text-sm font-black uppercase tracking-widest py-2 border-2 bg-[#65d421] border-[#1b630a] text-slate-900 hover:-translate-y-px transition-all"
              >
                Register
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
