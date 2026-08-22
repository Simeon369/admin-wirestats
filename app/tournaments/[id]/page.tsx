"use client";

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Tournament, GlobalPlayer } from "@/lib/types";
import { ColorPicker, TEAM_COLORS } from "@/components/ui/ColorPicker";
import { Jersey } from "@/components/ui/Jersey";

// ── Types ──────────────────────────────────────────────────────────
type DbTeam = { id: string; name: string; color: string };
type EnrolledTeam = { id: string; tournament_id: string; team_id: string; group_name: string | null; seed: number | null; wins: number; losses: number; teams: DbTeam };
type GameRow = { id: string; tournament_id: string; status: string; round_name: string | null; bracket_round: number; bracket_position: number; team_a_id: string | null; team_b_id: string | null; team_a_name: string; team_b_name: string; team_a_color: string; team_b_color: string; score_a: number | null; score_b: number | null; next_game_id: string | null; winner_slot: string | null; game_number: number | null; is_third_place: boolean; match_day: string | null; match_time: string | null };

type PlayerEntry = { id: string; name: string; number: string; globalId: string };
type TeamDraft = { name: string; colorId: string; players: PlayerEntry[] };

const POSITIONS = ["PG", "SG", "SF", "PF", "C"];

// Standard bracket seedings (0-indexed into sorted seeds array)
const BRACKET_SEEDS: Record<number, [number, number][]> = {
  2:  [[0, 1]],
  4:  [[0, 3], [1, 2]],
  8:  [[0, 7], [3, 4], [1, 6], [2, 5]],
  16: [[0, 15], [7, 8], [3, 12], [4, 11], [1, 14], [6, 9], [2, 13], [5, 10]],
};

function getRoundName(bracketRound: number, totalRounds: number): string {
  if (bracketRound === totalRounds) return "Final";
  if (bracketRound === totalRounds - 1) return "Semifinals";
  if (bracketRound === totalRounds - 2) return "Quarterfinals";
  return `Round of ${Math.pow(2, totalRounds - bracketRound + 1)}`;
}

// ── PlayerAutocomplete ─────────────────────────────────────────────
export type AutocompleteHandle = { focusAndAppend: (char: string) => void };
const PlayerAutocomplete = forwardRef<AutocompleteHandle, { globalPlayers: GlobalPlayer[]; onPlayerSelect: (p: GlobalPlayer) => void }>(
  ({ globalPlayers, onPlayerSelect }, ref) => {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [hi, setHi] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => ({ focusAndAppend: (char) => { setQuery(p => p + char); inputRef.current?.focus(); setOpen(true); } }));
    const filtered = query.trim() === "" ? [] : globalPlayers.filter(p => p.full_name.toLowerCase().includes(query.toLowerCase()) || p.jersey_name.toLowerCase().includes(query.toLowerCase())).slice(0, 5);
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!open || !filtered.length) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setHi(h => (h + 1) % filtered.length); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setHi(h => (h - 1 + filtered.length) % filtered.length); }
      else if (e.key === "Enter") { e.preventDefault(); onPlayerSelect(filtered[hi]); setQuery(""); setOpen(false); setHi(0); }
      else if (e.key === "Escape") setOpen(false);
    };
    return (
      <div className="relative flex-1">
        <input ref={inputRef} type="text" placeholder="Type player name..." value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setHi(0); }}
          onFocus={() => { if (query) setOpen(true); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          className="w-full bg-slate-900 border-2 border-slate-600 focus:border-[#65d421] outline-none text-white font-nunito font-bold px-3 py-2 text-sm placeholder:text-slate-600 transition-colors h-10" />
        {open && filtered.length > 0 && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-slate-800 border-2 border-slate-600 shadow-[4px_4px_0_#0f172a] max-h-60 overflow-y-auto">
            {filtered.map((p, i) => (
              <div key={p.id} onMouseDown={e => { e.preventDefault(); onPlayerSelect(p); setQuery(""); setOpen(false); }} onMouseEnter={() => setHi(i)}
                className={`px-3 py-2 cursor-pointer flex justify-between items-center ${hi === i ? "bg-slate-700" : "hover:bg-slate-700"}`}>
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
  }
);
PlayerAutocomplete.displayName = "PlayerAutocomplete";

// ── Quick Register Modal ───────────────────────────────────────────
function QuickRegisterModal({ onClose, onRegistered }: { onClose: () => void; onRegistered: (p: GlobalPlayer) => void }) {
  const [fullName, setFullName] = useState(""); const [jerseyName, setJerseyName] = useState(""); const [position, setPosition] = useState(""); const [gender, setGender] = useState(""); const [error, setError] = useState("");
  const submitRef = useRef<HTMLButtonElement>(null);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { setError("Full name is required."); return; }
    if (!jerseyName.trim()) { setError("Jersey name is required."); return; }
    if (!position) { setError("Please select a position."); return; }
    if (!gender) { setError("Please select a gender."); return; }
    setError("");
    const { data } = await supabase.from("players").insert([{ full_name: fullName.trim(), jersey_name: jerseyName.trim(), position, gender }]).select();
    if (data && data[0]) onRegistered(data[0] as GlobalPlayer);
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative z-10 bg-slate-800 border-4 border-slate-600 shadow-[8px_8px_0_#0f172a] p-6 max-w-sm w-full flex flex-col gap-4">
        <div className="flex justify-between items-center border-b-2 border-slate-700 pb-2">
          <h2 className="font-fredoka text-xl uppercase tracking-wider text-white">Quick Register</h2>
          <button type="button" onClick={onClose} className="font-bold text-slate-400 hover:text-white">✕</button>
        </div>
        <div className="flex flex-col gap-1"><label className="font-nunito text-xs font-bold uppercase tracking-widest text-slate-400">Full Name</label>
          <input autoFocus type="text" placeholder="e.g. John Doe" value={fullName} onChange={e => { const tc = e.target.value.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" "); setFullName(tc); setError(""); const first = tc.trim().split(" ")[0]; setJerseyName(first ? first.toUpperCase() : ""); }} className="bg-slate-900 border-2 border-slate-600 focus:border-[#65d421] outline-none text-white font-nunito font-bold px-3 py-2 text-sm transition-colors" />
        </div>
        <div className="flex flex-col gap-1"><label className="font-nunito text-xs font-bold uppercase tracking-widest text-slate-400">Jersey Name</label>
          <input type="text" placeholder="JOHN" value={jerseyName} onChange={e => { setJerseyName(e.target.value.toUpperCase()); setError(""); }} className="bg-slate-900 border-2 border-slate-600 focus:border-[#65d421] outline-none text-white font-nunito font-bold px-3 py-2 text-sm uppercase transition-colors" />
        </div>
        <div className="flex gap-4">
          <div className="flex-1 flex flex-col gap-2"><label className="font-nunito text-xs font-bold uppercase tracking-widest text-slate-400">Position</label>
            <div className="flex gap-1 flex-wrap">{POSITIONS.map(pos => (<button key={pos} type="button" onClick={() => { setPosition(pos); setError(""); }} className={`font-fredoka text-xs font-black px-2.5 py-1.5 border-2 transition-all ${position === pos ? "bg-[#65d421] border-[#1b630a] text-slate-900" : "bg-slate-900 border-slate-600 text-slate-400 hover:text-white"}`}>{pos}</button>))}</div>
          </div>
          <div className="flex-1 flex flex-col gap-2"><label className="font-nunito text-xs font-bold uppercase tracking-widest text-slate-400">Gender</label>
            <div className="flex gap-1 flex-wrap">{["Male", "Female", "Other"].map(g => (<button key={g} type="button" onClick={() => { setGender(g); setError(""); submitRef.current?.focus(); }} className={`font-fredoka text-xs font-black px-2.5 py-1.5 border-2 transition-all ${gender === g ? "bg-[#65d421] border-[#1b630a] text-slate-900" : "bg-slate-900 border-slate-600 text-slate-400 hover:text-white"}`}>{g.charAt(0)}</button>))}</div>
          </div>
        </div>
        {error && <p className="font-nunito text-sm font-bold text-red-400">⚠ {error}</p>}
        <div className="flex gap-2 mt-1">
          <button type="button" onClick={onClose} className="flex-1 font-fredoka text-sm font-black uppercase tracking-widest py-2 border-2 bg-slate-700 border-slate-600 text-slate-300 hover:text-white transition-colors">Cancel</button>
          <button ref={submitRef} type="submit" className="flex-1 font-fredoka text-sm font-black uppercase tracking-widest py-2 border-2 bg-[#65d421] border-[#1b630a] text-slate-900 hover:-translate-y-px transition-all">Register</button>
        </div>
      </form>
    </div>
  );
}

// ── Team Picker Modal ──────────────────────────────────────────────
function TeamPickerModal({ allDbTeams, enrolledIds, onClose, onAdd }: { allDbTeams: DbTeam[]; enrolledIds: string[]; onClose: () => void; onAdd: (ids: string[]) => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const available = allDbTeams.filter(t => !enrolledIds.includes(t.id) && t.name.toLowerCase().includes(search.toLowerCase()));
  const toggle = (id: string) => setSelected(s => { const ns = new Set(s); ns.has(id) ? ns.delete(id) : ns.add(id); return ns; });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-slate-800 border-4 border-slate-600 shadow-[12px_12px_0_#0f172a] w-full max-w-md flex flex-col max-h-[80vh]">
        <div className="flex justify-between items-center border-b-4 border-slate-700 p-5 pb-4 flex-shrink-0">
          <h2 className="font-fredoka text-2xl font-black uppercase tracking-widest text-white">Select Teams</h2>
          <button onClick={onClose} className="font-fredoka font-black text-slate-400 hover:text-white text-xl">✕</button>
        </div>
        <div className="p-4 flex-shrink-0">
          <input type="text" placeholder="Search teams..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-900 border-2 border-slate-600 focus:border-[#65d421] outline-none text-white font-nunito font-bold px-3 py-2.5 text-sm placeholder:text-slate-500 transition-colors" autoFocus />
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-2">
          {available.length === 0 ? (
            <p className="font-nunito font-bold text-slate-500 text-center py-8">No available teams found.</p>
          ) : available.map(t => (
            <button key={t.id} onClick={() => toggle(t.id)}
              className={`flex items-center gap-3 p-3 border-2 text-left transition-all ${selected.has(t.id) ? "border-[#65d421] bg-slate-700 shadow-[3px_3px_0_#1b630a]" : "border-slate-600 bg-slate-900 hover:border-slate-400"}`}>
              <div className={`w-5 h-5 border-2 flex-shrink-0 flex items-center justify-center transition-colors ${selected.has(t.id) ? "border-[#65d421] bg-[#65d421]" : "border-slate-500"}`}>
                {selected.has(t.id) && <span className="text-slate-900 text-xs font-black">✓</span>}
              </div>
              <div className="w-6 h-6 rounded-full border-2 border-slate-600 flex-shrink-0" style={{ backgroundColor: t.color }} />
              <span className="font-fredoka font-black text-white uppercase text-lg">{t.name}</span>
            </button>
          ))}
        </div>
        <div className="flex-shrink-0 border-t-4 border-slate-700 p-4 flex gap-3">
          <button onClick={onClose} className="flex-1 font-fredoka font-black uppercase tracking-widest py-3 border-2 border-slate-600 bg-slate-700 text-slate-300 hover:text-white transition-colors">Cancel</button>
          <button onClick={() => { if (selected.size > 0) onAdd(Array.from(selected)); }} disabled={selected.size === 0}
            className="flex-1 font-fredoka font-black uppercase tracking-widest py-3 border-2 border-[#1b630a] bg-[#65d421] text-slate-900 shadow-[4px_4px_0_#1b630a] hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            Add {selected.size > 0 ? `${selected.size} Team${selected.size > 1 ? "s" : ""}` : "Teams"} →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Team Form Modal (Create or Edit) ────────────────────────────────
function TeamFormModal({ onClose, onSaved, globalPlayers, onNewPlayer, teamToEditId }: { onClose: () => void; onSaved: (team: DbTeam) => void; globalPlayers: GlobalPlayer[]; onNewPlayer: (p: GlobalPlayer) => void; teamToEditId?: string }) {
  const [team, setTeam] = useState<TeamDraft>({ name: "", colorId: "red", players: [] });
  const [loading, setLoading] = useState(!!teamToEditId);
  const [newNumber, setNewNumber] = useState(""); const [dupError, setDupError] = useState(false); const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const [showQR, setShowQR] = useState(false);
  const numRef = useRef<HTMLInputElement>(null); const acRef = useRef<AutocompleteHandle>(null);
  const colorHex = TEAM_COLORS.find(c => c.id === team.colorId)?.hex ?? "#000";

  useEffect(() => {
    if (!teamToEditId) return;
    const fetchTeam = async () => {
      const { data: teamData } = await supabase.from("teams").select("*").eq("id", teamToEditId).single();
      const { data: roster } = await supabase.from("team_rosters").select("player_id, jersey_number, players(full_name, jersey_name, position)").eq("team_id", teamToEditId);
      if (teamData) {
        const colorId = TEAM_COLORS.find(c => c.hex === teamData.color)?.id ?? "red";
        const players = (roster || []).filter((r: any) => r.players).map((r: any) => ({
          id: crypto.randomUUID(),
          name: r.players.jersey_name,
          number: r.jersey_number != null ? String(r.jersey_number) : "",
          globalId: r.player_id,
        }));
        setTeam({ name: teamData.name, colorId, players });
      }
      setLoading(false);
    };
    fetchTeam();
  }, [teamToEditId]);

  const handleAddPlayer = (gp: GlobalPlayer) => {
    if (team.players.some(p => p.globalId === gp.id)) return; // already added
    // Use entered number, or auto-assign the next available number
    const usedNumbers = new Set(team.players.map(p => p.number));
    let num = newNumber;
    if (!num) {
      let n = team.players.length + 1;
      while (usedNumbers.has(String(n))) n++;
      num = String(n);
    } else if (team.players.some(p => p.number === num)) {
      setDupError(true); return;
    }
    setDupError(false);
    setTeam(t => ({ ...t, players: [...t.players, { id: crypto.randomUUID(), name: gp.jersey_name, number: num, globalId: gp.id }] }));
    setNewNumber(""); setTimeout(() => numRef.current?.focus(), 10);
  };
  const handleSave = async () => {
    if (!team.name.trim()) { setError("Team name is required."); return; }
    setSaving(true); setError("");

    let savedTeam: DbTeam | null = null;

    if (teamToEditId) {
      const { data, error } = await supabase.from("teams").update({ name: team.name.trim(), color: colorHex }).eq("id", teamToEditId).select().single();
      if (error || !data) { setError("Failed to update team."); setSaving(false); return; }
      savedTeam = data as DbTeam;
      // Replace roster
      await supabase.from("team_rosters").delete().eq("team_id", teamToEditId);
    } else {
      const { data, error } = await supabase.from("teams").insert([{ name: team.name.trim(), color: colorHex }]).select().single();
      if (error || !data) { setError("Failed to save team."); setSaving(false); return; }
      savedTeam = data as DbTeam;
    }

    if (team.players.length > 0) {
      await supabase.from("team_rosters").insert(team.players.map(p => ({ 
        team_id: savedTeam!.id, 
        player_id: p.globalId,
        jersey_number: p.number ? parseInt(p.number) : null
      })));
    }
    onSaved(savedTeam!);
  };
  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 bg-slate-800 border-4 border-slate-600 shadow-[12px_12px_0_#0f172a] w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center p-10">
              <div className="font-fredoka text-xl text-slate-400 animate-pulse uppercase tracking-widest">Loading...</div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center border-b-4 border-slate-700 p-6 pb-4 flex-shrink-0">
                <h2 className="font-fredoka text-3xl font-black uppercase tracking-widest text-white">{teamToEditId ? "Edit Team" : "New Team"}</h2>
                <button onClick={onClose} className="font-fredoka font-black text-slate-400 hover:text-white text-xl">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                <div className="flex flex-col gap-1"><label className="font-nunito text-xs font-bold uppercase tracking-widest text-slate-400">Team Name *</label>
                  <input autoFocus type="text" placeholder="e.g. Wildcats" value={team.name} onChange={e => { setTeam(t => ({ ...t, name: e.target.value.replace(/\b\w/g, c => c.toUpperCase()) })); setError(""); }}
                    className="bg-slate-900 border-2 border-slate-600 focus:border-[#65d421] outline-none text-white font-nunito font-bold px-3 py-2.5 text-sm placeholder:text-slate-500 transition-colors" />
                </div>
                <ColorPicker label="Jersey Color" selectedColorId={team.colorId} onChange={colorId => setTeam(t => ({ ...t, colorId }))} />
                <div className="border-t-2 border-slate-700 pt-4">
                  <h3 className="font-fredoka text-xl uppercase text-white mb-1">Roster <span className="text-slate-500 text-base">(Optional)</span></h3>
                  <p className="font-nunito text-xs text-slate-400 font-bold mb-3">Enter a jersey # (optional), then type and select a player name.</p>
                  {dupError && <p className="font-nunito text-xs font-bold text-red-400 mb-2">⚠ Jersey number already taken</p>}
                  <div className="flex gap-2 mb-2">
                    <input ref={numRef} type="text" placeholder="#" className="w-14 bg-slate-900 border-2 border-slate-600 focus:border-[#65d421] outline-none text-white font-nunito font-bold px-2 py-2 text-sm text-center placeholder:text-slate-600 transition-colors h-10" value={newNumber}
                      onChange={e => { const val = e.target.value; const letters = val.replace(/[^a-zA-Z]/g, ""); const numbers = val.replace(/\D/g, ""); setNewNumber(numbers); setDupError(false); if (letters.length > 0) acRef.current?.focusAndAppend(letters); }} />
                    <PlayerAutocomplete ref={acRef} globalPlayers={globalPlayers} onPlayerSelect={handleAddPlayer} />
                  </div>
                  <button type="button" className="text-xs font-nunito font-bold text-slate-400 self-start hover:text-[#65d421] transition-colors mb-4" onClick={() => setShowQR(true)}>+ Quick-Register Missing Player</button>
                  {team.players.length > 0 && (
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                      {[...team.players].sort((a, b) => parseInt(a.number || "0") - parseInt(b.number || "0")).map(player => (
                        <Jersey key={player.id} number={player.number} name={player.name} colorHex={colorHex} size="md" onRemove={() => setTeam(t => ({ ...t, players: t.players.filter(p => p.id !== player.id) }))} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0 border-t-4 border-slate-700 p-6 pt-4 flex flex-col gap-3">
                {error && <p className="font-nunito text-sm font-bold text-red-400">⚠ {error}</p>}
                <div className="flex gap-3">
                  <button onClick={onClose} className="flex-1 font-fredoka font-black uppercase tracking-widest py-3 border-2 border-slate-600 bg-slate-700 text-slate-300 hover:text-white transition-colors">Cancel</button>
                  <button onClick={handleSave} disabled={saving} className="flex-1 font-fredoka font-black uppercase tracking-widest py-3 border-2 border-[#1b630a] bg-[#65d421] text-slate-900 shadow-[4px_4px_0_#1b630a] hover:-translate-y-0.5 disabled:opacity-50 transition-all">{saving ? "Saving..." : "Create Team →"}</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      {showQR && <QuickRegisterModal onClose={() => setShowQR(false)} onRegistered={p => { onNewPlayer(p); setShowQR(false); }} />}
    </>
  );
}

// ── Game Card ──────────────────────────────────────────────────────
function GameCard({ game, onStart }: { game: GameRow; onStart: () => void }) {
  const isPending = game.status === "scheduled" && (!game.team_a_id || !game.team_b_id);
  const isScheduled = game.status === "scheduled" && !!(game.team_a_id && game.team_b_id);
  const isDone = game.status === "finished";

  const [matchDay, setMatchDay] = useState(game.match_day || "");
  const [matchTime, setMatchTime] = useState(game.match_time || "");

  const saveSchedule = async (day: string, time: string) => {
    await supabase.from("games").update({ match_day: day || null, match_time: time || null }).eq("id", game.id);
  };

  return (
    <div className={`bg-white border-4 border-slate-900 p-4 shadow-[6px_6px_0_#0f172a] flex flex-col gap-3 relative ${isPending ? "opacity-60" : ""}`}>
      {game.game_number && (
        <div className="absolute -top-3 -left-3 bg-slate-900 text-[#65d421] font-fredoka font-black px-2 py-1 border-2 border-white shadow-[2px_2px_0_#0f172a] text-xs uppercase tracking-wider">
          Game {game.game_number}
        </div>
      )}
      <div className="flex justify-between items-center font-fredoka font-black text-slate-900 text-lg mt-2">
        <div className="flex items-center gap-2">
          {game.team_a_color && game.team_a_id && <div className="w-5 h-5 rounded-full border-2 border-slate-900 flex-shrink-0" style={{ backgroundColor: game.team_a_color }} />}
          <span className="uppercase text-sm">{game.team_a_name || "TBD"}</span>
        </div>
        <span className="text-slate-400 text-sm font-black mx-2">VS</span>
        <div className="flex items-center gap-2">
          <span className="uppercase text-sm">{game.team_b_name || "TBD"}</span>
          {game.team_b_color && game.team_b_id && <div className="w-5 h-5 rounded-full border-2 border-slate-900 flex-shrink-0" style={{ backgroundColor: game.team_b_color }} />}
        </div>
      </div>

      {/* Schedule inputs */}
      {!isDone && (
        <div className="flex gap-2">
          <div className="flex flex-col gap-0.5 flex-1">
            <label className="font-nunito text-[10px] font-bold uppercase tracking-widest text-slate-400">Day</label>
            <input
              type="text"
              placeholder="e.g. Day 1"
              value={matchDay}
              onChange={e => setMatchDay(e.target.value)}
              onBlur={() => saveSchedule(matchDay, matchTime)}
              className="bg-slate-100 border-2 border-slate-300 focus:border-slate-900 outline-none font-nunito font-bold text-xs text-slate-700 px-2 py-1.5 placeholder:text-slate-400 w-full"
            />
          </div>
          <div className="flex flex-col gap-0.5 flex-1">
            <label className="font-nunito text-[10px] font-bold uppercase tracking-widest text-slate-400">Time</label>
            <input
              type="text"
              placeholder="e.g. 10:00 AM"
              value={matchTime}
              onChange={e => setMatchTime(e.target.value)}
              onBlur={() => saveSchedule(matchDay, matchTime)}
              className="bg-slate-100 border-2 border-slate-300 focus:border-slate-900 outline-none font-nunito font-bold text-xs text-slate-700 px-2 py-1.5 placeholder:text-slate-400 w-full"
            />
          </div>
        </div>
      )}

      {isDone ? (
        <div className="text-center font-fredoka font-black uppercase tracking-wider text-sm bg-slate-100 border-2 border-slate-300 py-2 text-slate-600">
          {game.score_a ?? "–"} – {game.score_b ?? "–"} · FINAL
        </div>
      ) : isScheduled ? (
        <button onClick={onStart} className="w-full font-fredoka font-black uppercase tracking-widest py-2 border-2 border-slate-900 bg-slate-900 text-[#65d421] hover:bg-slate-700 transition-colors text-sm">
          🏀 Start Match →
        </button>
      ) : (
        <div className="text-center font-nunito font-bold text-xs text-slate-400 bg-slate-100 border border-slate-200 py-2 uppercase tracking-wider">Awaiting Previous Rounds</div>
      )}
    </div>
  );
}

// ── Edit Tournament Modal ─────────────────────────────────────────
function EditTournamentModal({ tournament, onClose, onSaved }: { tournament: Tournament; onClose: () => void; onSaved: () => void }) {
  const AGE_GROUPS = ["U12", "U14", "U16", "U18", "Adult", "Custom"];
  const GENDERS = ["Boys", "Girls", "Men", "Women", "Mixed"];

  // Parse stored category back into age group + gender
  const parseCategory = (cat: string | null | undefined) => {
    if (!cat) return { ageGroup: "U18", gender: "Boys", custom: "" };
    for (const g of GENDERS) {
      if (cat.endsWith(" " + g)) {
        const age = cat.slice(0, -(g.length + 1));
        if (AGE_GROUPS.includes(age)) return { ageGroup: age, gender: g, custom: "" };
        return { ageGroup: "Custom", gender: g, custom: age };
      }
    }
    return { ageGroup: "Custom", gender: "Boys", custom: cat };
  };

  const parsed = parseCategory(tournament.category);

  const [name, setName] = useState(tournament.name);
  const [venue, setVenue] = useState(tournament.venue ?? "");
  const [startDate, setStartDate] = useState(tournament.start_date ?? "");
  const [durationDays, setDurationDays] = useState(tournament.duration_days ?? 1);
  const [periodType, setPeriodType] = useState<"QUARTER" | "HALF">(tournament.period_type);
  const [periodLength, setPeriodLength] = useState(String(tournament.period_length_mins));
  const [hasThirdPlace, setHasThirdPlace] = useState(tournament.has_third_place ?? false);
  const [ageCategory, setAgeCategory] = useState(parsed.ageGroup);
  const [customCategory, setCustomCategory] = useState(parsed.custom);
  const [gender, setGender] = useState(parsed.gender);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Tournament name is required."); return; }
    setSaving(true);
    setError("");

    const finalCategory = ageCategory === "Custom"
      ? `${customCategory} ${gender}`.trim()
      : `${ageCategory} ${gender}`.trim();

    const { error: dbErr } = await supabase.from("tournaments").update({
      name: name.trim(),
      venue: venue.trim() || null,
      start_date: startDate || null,
      duration_days: Number(durationDays) || 1,
      period_type: periodType,
      period_length_mins: parseInt(periodLength) || 10,
      has_third_place: hasThirdPlace,
      category: finalCategory,
    }).eq("id", tournament.id);

    if (dbErr) { setError("Failed to save. Please try again."); setSaving(false); return; }
    onSaved();
  };

  const inputCls = "bg-slate-900 border-2 border-slate-600 focus:border-[#65d421] outline-none text-white font-nunito font-bold px-3 py-2.5 text-sm placeholder:text-slate-500 transition-colors w-full";
  const labelCls = "font-nunito text-xs font-bold uppercase tracking-widest text-slate-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={handleSave} className="relative z-10 bg-slate-800 border-4 border-slate-600 shadow-[12px_12px_0_#0f172a] w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center border-b-4 border-slate-700 p-6 pb-4 flex-shrink-0">
          <h2 className="font-fredoka text-3xl font-black uppercase tracking-widest text-white">Edit Tournament</h2>
          <button type="button" onClick={onClose} className="font-fredoka font-black text-slate-400 hover:text-white text-xl transition-colors">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Tournament Name *</label>
            <input autoFocus type="text" value={name} onChange={e => { setName(e.target.value); setError(""); }} className={inputCls} />
          </div>

          {/* Format — read-only */}
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Format <span className="text-slate-600">(cannot change after creation)</span></label>
            <div className="bg-slate-900 border-2 border-slate-700 px-3 py-2.5 font-fredoka font-black text-slate-500 text-sm uppercase tracking-wider">
              {tournament.format.replace(/_/g, " ")}
            </div>
          </div>

          {/* Date + Duration + Venue */}
          <div className="flex flex-col gap-4">
            <div className="flex justify-between gap-2">
              <div className="flex flex-col flex-1 mr-4 gap-1">
                <label className={labelCls}>Start Date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
              </div>
              <div className="flex flex-col flex-1 gap-1">
                <label className={labelCls}>Days</label>
                <input type="number" min="1" value={durationDays} onChange={e => setDurationDays(parseInt(e.target.value) || 1)} className={inputCls} />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Venue</label>
              <input type="text" placeholder="e.g. City Sports Hall" value={venue} onChange={e => setVenue(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Third Place (Single Elim only) */}
          {tournament.format === "SINGLE_ELIMINATION" && (
            <div className="flex items-center gap-3">
              <input type="checkbox" id="editThirdPlace" checked={hasThirdPlace} onChange={e => setHasThirdPlace(e.target.checked)}
                className="w-5 h-5 border-2 border-slate-900 accent-[#65d421] cursor-pointer" />
              <label htmlFor="editThirdPlace" className={`${labelCls} cursor-pointer select-none`}>Include Third Place Game</label>
            </div>
          )}

          {/* Category */}
          <div className="flex flex-col gap-2 border-t-2 border-slate-700 pt-4">
            <label className={labelCls}>Category</label>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 flex flex-col gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Age Group</span>
                <div className="flex flex-wrap gap-1.5">
                  {AGE_GROUPS.map(age => (
                    <button key={age} type="button" onClick={() => setAgeCategory(age)}
                      className={`font-fredoka font-black text-xs uppercase px-2 py-1.5 border-2 transition-all ${ageCategory === age ? "bg-[#65d421] border-[#1b630a] text-slate-900" : "bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-400"}`}>
                      {age}
                    </button>
                  ))}
                </div>
                {ageCategory === "Custom" && (
                  <input type="text" value={customCategory} onChange={e => setCustomCategory(e.target.value)}
                    placeholder="e.g. Masters 35+" className={`${inputCls} mt-1`} />
                )}
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Gender</span>
                <div className="flex flex-wrap gap-1.5">
                  {GENDERS.map(g => (
                    <button key={g} type="button" onClick={() => setGender(g)}
                      className={`font-fredoka font-black text-xs uppercase px-2 py-1.5 border-2 transition-all ${gender === g ? "bg-[#65d421] border-[#1b630a] text-slate-900" : "bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-400"}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Period Rules */}
          <div className="grid grid-cols-2 gap-4 border-t-2 border-slate-700 pt-4">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Period Type</label>
              <div className="flex gap-2">
                {(["QUARTER", "HALF"] as const).map(p => (
                  <button key={p} type="button" onClick={() => setPeriodType(p)}
                    className={`flex-1 font-fredoka font-black text-sm uppercase tracking-wider px-3 py-2 border-2 transition-all ${periodType === p ? "bg-[#65d421] border-[#1b630a] text-slate-900" : "bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-400"}`}>
                    {p === "QUARTER" ? "Quarters" : "Halves"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Mins Per Period</label>
              <select value={periodLength} onChange={e => setPeriodLength(e.target.value)} className={inputCls}>
                {["5", "8", "10", "12", "15", "20"].map(m => (
                  <option key={m} value={m}>{m} min</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && <p className="font-nunito text-sm font-bold text-red-400 px-6">{error}</p>}

        <div className="flex gap-3 p-6 pt-4 border-t-4 border-slate-700 flex-shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 font-fredoka font-black uppercase tracking-widest py-3 border-2 border-slate-600 bg-slate-700 text-slate-300 hover:text-white transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 font-fredoka font-black uppercase tracking-widest py-3 border-2 border-[#1b630a] bg-[#65d421] text-slate-900 shadow-[4px_4px_0_#1b630a] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#1b630a] active:translate-y-0 active:shadow-none transition-all disabled:opacity-50">
            {saving ? "Saving..." : "Save Changes →"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────
export default function AdminTournamentManage() {
  const params = useParams(); const router = useRouter(); const id = params.id as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [enrolledTeams, setEnrolledTeams] = useState<EnrolledTeam[]>([]);
  const [allDbTeams, setAllDbTeams] = useState<DbTeam[]>([]);
  const [games, setGames] = useState<GameRow[]>([]);
  const [globalPlayers, setGlobalPlayers] = useState<GlobalPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showTeamPicker, setShowTeamPicker] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Single Elim seeding
  const [seeds, setSeeds] = useState<Record<string, number>>({});
  const [autoSeeded, setAutoSeeded] = useState(false);

  useEffect(() => { fetchAll(); }, [id]);

  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: tData }, { data: teamsData }, { data: gamesData }, { data: allTeamsData }, { data: playersData }] = await Promise.all([
      supabase.from("tournaments").select("*").eq("id", id).single(),
      supabase.from("tournament_teams").select("*, teams:team_id (id, name, color)").eq("tournament_id", id),
      supabase.from("games").select("*").eq("tournament_id", id).order("bracket_round").order("bracket_position"),
      supabase.from("teams").select("id, name, color").order("name"),
      supabase.from("players").select("*").order("created_at", { ascending: false }),
    ]);
    if (tData) setTournament(tData);
    const et = (teamsData || []) as EnrolledTeam[];
    setEnrolledTeams(et);
    // Init seeds from DB
    const seedMap: Record<string, number> = {};
    et.forEach((t, i) => { seedMap[t.team_id] = t.seed || i + 1; });
    setSeeds(seedMap);
    setGames((gamesData || []) as GameRow[]);
    setAllDbTeams((allTeamsData || []) as DbTeam[]);
    setGlobalPlayers((playersData || []) as GlobalPlayer[]);
    setLoading(false);
  };

  const handleAddTeamsFromDB = async (teamIds: string[]) => {
    const inserts = teamIds.map(tid => ({ tournament_id: id, team_id: tid }));
    await supabase.from("tournament_teams").insert(inserts);
    setShowTeamPicker(false);
    fetchAll();
  };

  const handleTeamCreated = async (team: DbTeam) => {
    await supabase.from("tournament_teams").insert([{ tournament_id: id, team_id: team.id }]);
    setShowCreateTeam(false);
    fetchAll();
  };

  const removeTeam = async (enrolledId: string) => {
    await supabase.from("tournament_teams").delete().eq("id", enrolledId);
    fetchAll();
  };

  const handleActivateTournament = async () => {
    if (!confirm("Are you sure you want to activate this tournament? This will make it visible to the public.")) return;
    await supabase.from("tournaments").update({ status: "ACTIVE" }).eq("id", id);
    fetchAll();
  };

  const handleAutoSeed = async () => {
    const shuffled = [...enrolledTeams].sort(() => 0.5 - Math.random());
    const newSeeds: Record<string, number> = {};
    for (let i = 0; i < shuffled.length; i++) {
      newSeeds[shuffled[i].team_id] = i + 1;
      await supabase.from("tournament_teams").update({ seed: i + 1 }).eq("id", shuffled[i].id);
    }
    setSeeds(newSeeds);
    setAutoSeeded(true);
  };

  const handleManualSeed = async (enrolledId: string, teamId: string, newSeed: number) => {
    const oldSeed = seeds[teamId];
    const otherTeam = enrolledTeams.find(t => seeds[t.team_id] === newSeed && t.team_id !== teamId);
    
    const updatedSeeds = { ...seeds };
    updatedSeeds[teamId] = newSeed;
    await supabase.from("tournament_teams").update({ seed: newSeed }).eq("id", enrolledId);
    
    if (otherTeam && oldSeed && oldSeed !== 99) {
      updatedSeeds[otherTeam.team_id] = oldSeed;
      await supabase.from("tournament_teams").update({ seed: oldSeed }).eq("id", otherTeam.id);
    }
    
    setSeeds(updatedSeeds);
    setAutoSeeded(true);
  };

  const generateRoundRobin = (group: EnrolledTeam[], roundLabel: string) => {
    const matches = [];
    for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) {
      matches.push({ tournament_id: id, team_a_id: group[i].team_id, team_b_id: group[j].team_id, team_a_name: group[i].teams?.name, team_b_name: group[j].teams?.name, team_a_color: group[i].teams?.color || "#000", team_b_color: group[j].teams?.color || "#000", status: "scheduled", round_name: roundLabel, bracket_round: 1, bracket_position: 0 });
    }
    return matches;
  };

  const handleGenerateRoundRobin = async () => {
    setGenerating(true);
    const matches = generateRoundRobin(enrolledTeams, "Group Stage");
    if (matches.length > 0) await supabase.from("games").insert(matches);
    await fetchAll();
    setGenerating(false);
  };

  const handleGenerateHybrid = async () => {
    setGenerating(true);
    const shuffled = [...enrolledTeams].sort(() => 0.5 - Math.random());
    const half = Math.ceil(shuffled.length / 2);
    const groupA = shuffled.slice(0, half); const groupB = shuffled.slice(half);
    for (const t of groupA) await supabase.from("tournament_teams").update({ group_name: "Group A" }).eq("id", t.id);
    for (const t of groupB) await supabase.from("tournament_teams").update({ group_name: "Group B" }).eq("id", t.id);
    const matches = [...generateRoundRobin(groupA, "Group A"), ...generateRoundRobin(groupB, "Group B")];
    if (matches.length > 0) await supabase.from("games").insert(matches);

    // Knockout placeholders
    await supabase.from("games").insert([
      { tournament_id: id, status: "scheduled", round_name: "Semifinals", bracket_round: 2, bracket_position: 1, team_a_name: "Group A #1", team_b_name: "Group B #2" },
      { tournament_id: id, status: "scheduled", round_name: "Semifinals", bracket_round: 2, bracket_position: 2, team_a_name: "Group B #1", team_b_name: "Group A #2" },
      { tournament_id: id, status: "scheduled", round_name: "Final", bracket_round: 3, bracket_position: 1, team_a_name: "Winner SF1", team_b_name: "Winner SF2" },
    ]);

    await fetchAll();
    setGenerating(false);
  };

  const handleGenerateSingleElim = async () => {
    const n = enrolledTeams.length;
    const rounds = Math.ceil(Math.log2(n));
    const bracketSize = Math.pow(2, rounds);
    if (!BRACKET_SEEDS[bracketSize]) { alert(`Single Elimination needs 2, 4, 8, or 16 teams. You have ${n}.`); return; }
    setGenerating(true);

    const seeded = [...enrolledTeams].sort((a, b) => (seeds[a.team_id] || 99) - (seeds[b.team_id] || 99));
    let prevRoundGames: any[] = [];
    
    const getGameNum = (r: number, p: number) => bracketSize - Math.pow(2, rounds - r + 1) + p;
    const getChildGameNums = (r: number, p: number) => {
      if (r === 1) return null;
      return {
        a: getGameNum(r - 1, p * 2 - 1),
        b: getGameNum(r - 1, p * 2)
      };
    };

    for (let r = rounds; r >= 1; r--) {
      const gamesInRound = bracketSize / Math.pow(2, r);
      const roundName = getRoundName(r, rounds);
      const newGames: any[] = [];

      const hasThirdPlace = (tournament as any).has_third_place;
      for (let pos = 1; pos <= gamesInRound; pos++) {
        let gameNum = getGameNum(r, pos);
        if (hasThirdPlace && r === rounds) {
          gameNum = bracketSize;
        }
        const children = getChildGameNums(r, pos);
        const nextGame = r < rounds ? prevRoundGames[Math.floor((pos - 1) / 2)] : null;
        const slot = (pos - 1) % 2 === 0 ? "A" : "B";
        
        let teamAName = children ? `Winner of Game ${children.a}` : "TBD";
        let teamBName = children ? `Winner of Game ${children.b}` : "TBD";
        let teamAId = null, teamBId = null, teamAColor = "#888", teamBColor = "#888";
        let status = "scheduled";

        if (r === 1) {
          const pairs = BRACKET_SEEDS[bracketSize];
          const [aIdx, bIdx] = pairs[pos - 1];
          const teamA = seeded[aIdx];
          const teamB = seeded[bIdx < seeded.length ? bIdx : -1];
          
          if (teamA) {
            teamAId = teamA.team_id; teamAName = teamA.teams?.name || "TBD"; teamAColor = teamA.teams?.color || "#888";
          }
          if (teamB) {
            teamBId = teamB.team_id; teamBName = teamB.teams?.name || "TBD"; teamBColor = teamB.teams?.color || "#888";
          }
        }

        const { data } = await supabase.from("games").insert({ 
          tournament_id: id, status, round_name: roundName, 
          bracket_round: r, bracket_position: pos, 
          team_a_id: teamAId, team_a_name: teamAName, team_a_color: teamAColor, 
          team_b_id: teamBId, team_b_name: teamBName, team_b_color: teamBColor, 
          next_game_id: nextGame?.id || null, winner_slot: slot,
          game_number: gameNum
        }).select().single();

        newGames.push(data);
      }
      prevRoundGames = newGames;
    }

    // Third place game if needed
    if ((tournament as any).has_third_place && rounds >= 2) {
      const semi1GameNum = getGameNum(rounds - 1, 1);
      const semi2GameNum = getGameNum(rounds - 1, 2);
      const thirdPlaceGameNum = bracketSize - 1;
      
      await supabase.from("games").insert({
        tournament_id: id, status: "scheduled", round_name: "Third Place",
        bracket_round: rounds, bracket_position: 2,
        team_a_name: `Loser of Game ${semi1GameNum}`,
        team_b_name: `Loser of Game ${semi2GameNum}`,
        team_a_color: "#888", team_b_color: "#888",
        game_number: thirdPlaceGameNum,
        is_third_place: true
      });
    }

    await fetchAll();
    setGenerating(false);
  };

  // Group games by round_name for display
  const gamesByRound = games.reduce<Record<string, GameRow[]>>((acc, g) => {
    const key = g.round_name || "Fixtures";
    if (!acc[key]) acc[key] = [];
    acc[key].push(g);
    return acc;
  }, {});

  const enrolledIds = enrolledTeams.map(t => t.team_id);
  const hasGames = games.length > 0;
  const canGenerate = enrolledTeams.length >= 2 && !hasGames;
  const isPowerOf2 = [2, 4, 8, 16].includes(enrolledTeams.length);

  if (loading) return <div className="min-h-screen bg-slate-900 text-white p-8 font-fredoka text-2xl animate-pulse">Loading...</div>;
  if (!tournament) return <div className="min-h-screen bg-slate-900 text-white p-8 font-fredoka text-2xl">Tournament Not Found</div>;

  const periodDisplay = `${tournament.period_length_mins} min ${tournament.period_type === "QUARTER" ? "quarters" : "halves"}`;
  const format = tournament.format;

  return (
    <div className="min-h-screen bg-slate-900 p-6 md:p-10 pb-24 font-nunito text-slate-100">
      <div className="max-w-5xl mx-auto flex flex-col gap-10">

        <Link href="/tournaments" className="inline-flex items-center text-slate-400 hover:text-white font-bold transition-colors text-sm">← Back to Tournaments</Link>

        {/* Header */}
        <header className="border-b-4 border-slate-700 pb-6">
          <div className="flex items-start justify-between gap-4">
            <h1 className="font-fredoka text-5xl md:text-6xl font-black tracking-widest text-white uppercase leading-none">{tournament.name}</h1>
            <button
              onClick={() => setShowEditModal(true)}
              className="flex-shrink-0 font-fredoka font-black uppercase tracking-widest px-4 py-2 border-2 border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-400 hover:text-white transition-all text-sm shadow-[3px_3px_0_#0f172a] mt-1"
            >
              ✏️ Edit
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-4 items-center">
            <span className="bg-slate-200 text-slate-700 px-3 py-1 font-bold uppercase tracking-wider border-2 border-slate-900 text-sm">{format.replace(/_/g, " ")}</span>
            <span className={`px-3 py-1 font-bold uppercase tracking-wider border-2 border-slate-900 text-sm ${tournament.status === "ACTIVE" ? "bg-[#65d421] text-slate-900" : "bg-amber-300 text-slate-900"}`}>{tournament.status}</span>
            <span className="bg-slate-700 text-slate-300 px-3 py-1 font-bold uppercase tracking-wider border-2 border-slate-700 text-sm">⏱ {periodDisplay}</span>
            {tournament.venue && <span className="bg-slate-700 text-slate-300 px-3 py-1 font-bold text-sm border-2 border-slate-700">📍 {tournament.venue}</span>}
            {tournament.start_date && <span className="bg-slate-700 text-slate-300 px-3 py-1 font-bold text-sm border-2 border-slate-700">📅 {new Date(tournament.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}</span>}
            {tournament.category && <span className="bg-slate-700 text-slate-300 px-3 py-1 font-bold text-sm border-2 border-slate-700">📋 {tournament.category}</span>}

            {tournament.status === "DRAFT" && (
              <button 
                onClick={handleActivateTournament}
                className="ml-2 font-fredoka font-black uppercase tracking-widest px-4 py-1.5 border-2 border-[#1b630a] bg-[#65d421] text-slate-900 hover:-translate-y-px transition-all text-sm shadow-[2px_2px_0_#1b630a]"
              >
                🚀 Activate Tournament
              </button>
            )}
          </div>
        </header>

        {/* Teams Section */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-fredoka text-3xl font-black uppercase tracking-widest text-white">Teams <span className="text-slate-500 text-xl">({enrolledTeams.length})</span></h2>
            {!hasGames && (
              <div className="flex gap-2">
                <button onClick={() => setShowTeamPicker(true)} className="font-fredoka font-black uppercase tracking-widest px-4 py-2 border-2 border-[#1b630a] bg-[#65d421] text-slate-900 shadow-[3px_3px_0_#1b630a] hover:-translate-y-0.5 transition-all text-sm">+ Add Teams</button>
                <button onClick={() => setShowCreateTeam(true)} className="font-fredoka font-black uppercase tracking-widest px-4 py-2 border-2 border-slate-600 bg-slate-700 text-white hover:bg-slate-600 transition-colors text-sm">+ New Team</button>
              </div>
            )}
          </div>

          {enrolledTeams.length === 0 ? (
            <div className="border-4 border-dashed border-slate-700 flex flex-col items-center justify-center gap-5 py-20">
              <span className="text-6xl">🏀</span>
              <p className="font-fredoka text-xl font-black text-slate-500 uppercase tracking-wider">No teams enrolled yet</p>
              <div className="flex gap-3">
                <button onClick={() => setShowTeamPicker(true)} className="font-fredoka font-black uppercase tracking-widest px-8 py-3 border-4 border-[#1b630a] bg-[#65d421] text-slate-900 shadow-[6px_6px_0_#1b630a] hover:-translate-y-1 transition-all text-lg">+ Add Teams from DB</button>
                <button onClick={() => setShowCreateTeam(true)} className="font-fredoka font-black uppercase tracking-widest px-6 py-3 border-4 border-slate-600 bg-slate-700 text-white hover:bg-slate-600 transition-colors text-lg">+ New Team</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {enrolledTeams.map(t => (
                <div key={t.id} onClick={() => setEditingTeamId(t.team_id)} className="bg-slate-800 border-2 border-slate-600 p-3 shadow-[4px_4px_0_#0f172a] flex items-center gap-3 cursor-pointer hover:border-slate-400 hover:shadow-[4px_4px_0_#334155] transition-all group">
                  <div className="w-8 h-8 flex-shrink-0 border-2 border-slate-900" style={{ backgroundColor: t.teams?.color || "#888" }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-fredoka font-black uppercase tracking-wider text-white text-sm truncate group-hover:text-[#65d421] transition-colors">{t.teams?.name || "Unknown"}</div>
                  </div>
                  {format === "SINGLE_ELIMINATION" && (
                    <div className="bg-slate-700 text-slate-300 font-black text-xs px-2 py-1 border border-slate-600">
                      #{seeds[t.team_id] || "?"}
                    </div>
                  )}
                  {!hasGames && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeTeam(t.id); }}
                      className="text-slate-500 hover:text-red-400 font-black px-2 ml-auto"
                      title="Remove from tournament"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Seeding Section (Single Elim only) */}
        {format === "SINGLE_ELIMINATION" && enrolledTeams.length >= 2 && !hasGames && (
          <section className="bg-slate-800 border-4 border-slate-700 p-6 shadow-[8px_8px_0_#0f172a]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-fredoka text-2xl font-black uppercase tracking-widest text-white">Seeds</h2>
              <button onClick={handleAutoSeed} className="font-fredoka font-black uppercase tracking-widest px-5 py-2 border-2 border-slate-600 bg-slate-700 text-white hover:bg-slate-600 transition-colors text-sm">
                🎲 Auto-Seed Randomly
              </button>
            </div>
            {!autoSeeded && <p className="font-nunito font-bold text-slate-400 text-sm mb-4">Click "Auto-Seed Randomly" to assign seeds before generating the bracket.</p>}
            {!isPowerOf2 && (
              <p className="font-nunito font-bold text-amber-400 text-sm">⚠ Single Elimination works best with 2, 4, 8, or 16 teams. You have {enrolledTeams.length}.</p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
              {[...enrolledTeams].sort((a, b) => (seeds[a.team_id] || 99) - (seeds[b.team_id] || 99)).map(t => (
                <div key={t.id} className="flex items-center gap-2 bg-slate-900 border-2 border-slate-700 p-2">
                  <select
                    value={seeds[t.team_id] || ""}
                    onChange={(e) => handleManualSeed(t.id, t.team_id, parseInt(e.target.value))}
                    className="bg-slate-800 border-2 border-slate-600 text-[#65d421] font-fredoka font-black outline-none px-1 py-1 cursor-pointer"
                  >
                    <option value="" disabled>?</option>
                    {Array.from({ length: enrolledTeams.length }, (_, i) => i + 1).map(num => (
                      <option key={num} value={num}>#{num}</option>
                    ))}
                  </select>
                  <div className="w-5 h-5 rounded-full border border-slate-600" style={{ backgroundColor: t.teams?.color }} />
                  <span className="font-fredoka font-black text-white uppercase text-sm truncate">{t.teams?.name}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Generate Section */}
        {canGenerate && (
          <section className="flex flex-col items-center gap-4 py-6 border-4 border-dashed border-slate-700">
            <p className="font-fredoka text-xl font-black text-slate-400 uppercase tracking-wider">{enrolledTeams.length} teams ready</p>
            {format === "ROUND_ROBIN" && (
              <button onClick={handleGenerateRoundRobin} disabled={generating} className="font-fredoka font-black uppercase tracking-widest px-10 py-4 border-4 border-[#1b630a] bg-[#65d421] text-slate-900 shadow-[6px_6px_0_#1b630a] hover:-translate-y-1 transition-all text-xl disabled:opacity-50">
                {generating ? "Generating..." : "⚡ Generate Round Robin"}
              </button>
            )}
            {format === "SINGLE_ELIMINATION" && (
              <button onClick={handleGenerateSingleElim} disabled={generating || !autoSeeded} className="font-fredoka font-black uppercase tracking-widest px-10 py-4 border-4 border-[#1b630a] bg-[#65d421] text-slate-900 shadow-[6px_6px_0_#1b630a] hover:-translate-y-1 transition-all text-xl disabled:opacity-50">
                {generating ? "Generating..." : "⚡ Generate Bracket"}
              </button>
            )}
            {format === "HYBRID" && (
              <button onClick={handleGenerateHybrid} disabled={generating} className="font-fredoka font-black uppercase tracking-widest px-10 py-4 border-4 border-[#1b630a] bg-[#65d421] text-slate-900 shadow-[6px_6px_0_#1b630a] hover:-translate-y-1 transition-all text-xl disabled:opacity-50">
                {generating ? "Generating..." : "⚡ Randomize Groups & Generate"}
              </button>
            )}
            {!autoSeeded && format === "SINGLE_ELIMINATION" && <p className="font-nunito font-bold text-amber-400 text-sm">Assign seeds first before generating the bracket.</p>}
          </section>
        )}

        {/* Fixtures Section */}
        {hasGames && (
          <section>
            <h2 className="font-fredoka text-3xl font-black uppercase tracking-widest text-white mb-6">Schedule</h2>
            <div className="flex flex-col gap-8">
              {Object.entries(gamesByRound)
                .sort(([a], [b]) => {
                  if (a === "Final" || a === "Finals") return 1;
                  if (b === "Final" || b === "Finals") return -1;
                  return 0;
                })
                .map(([roundName, roundGames]) => (
                <div key={roundName}>
                  <h3 className="font-fredoka text-xl font-black uppercase tracking-widest text-slate-400 mb-3 pb-2 border-b-2 border-slate-700">{roundName}</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {roundGames.map(g => (
                      <GameCard key={g.id} game={g} onStart={() => router.push(`/match/pregame?game=${g.id}`)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>

      {showEditModal && (
        <EditTournamentModal
          tournament={tournament}
          onClose={() => setShowEditModal(false)}
          onSaved={async () => { setShowEditModal(false); await fetchAll(); }}
        />
      )}
      {showTeamPicker && <TeamPickerModal allDbTeams={allDbTeams} enrolledIds={enrolledIds} onClose={() => setShowTeamPicker(false)} onAdd={handleAddTeamsFromDB} />}
      {showCreateTeam && (
        <TeamFormModal
          onClose={() => setShowCreateTeam(false)}
          onSaved={handleTeamCreated}
          globalPlayers={globalPlayers}
          onNewPlayer={p => setGlobalPlayers(prev => [p, ...prev])}
        />
      )}
      {editingTeamId && (
        <TeamFormModal
          teamToEditId={editingTeamId}
          onClose={() => setEditingTeamId(null)}
          onSaved={async () => {
            await fetchAll();
            setEditingTeamId(null);
          }}
          globalPlayers={globalPlayers}
          onNewPlayer={p => setGlobalPlayers(prev => [p, ...prev])}
        />
      )}
    </div>
  );
}
