"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { GlobalPlayer } from "@/lib/types";

const POSITIONS = ["PG", "SG", "SF", "PF", "C"];
const POSITION_FILTERS = ["ALL", ...POSITIONS];

// ── Delete confirmation modal ────────────────────────────
function DeleteModal({
  player,
  onCancel,
  onConfirm,
}: {
  player: GlobalPlayer;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  const handleConfirm = async () => {
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80" />
      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-sm bg-slate-800 border-4 border-slate-600 shadow-[8px_8px_0_#0f172a] p-6 flex flex-col gap-5"
        onClick={e => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center bg-red-600/20 border-2 border-red-800 text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193v-.443A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="font-fredoka text-lg font-black text-white uppercase tracking-wider">Delete Player?</h3>
            <p className="font-nunito text-xs font-bold text-slate-400">{player.full_name}</p>
          </div>
        </div>
        <p className="font-nunito text-sm font-bold text-slate-400">
          This will permanently remove <span className="text-white">{player.full_name}</span> from the global registry. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 font-fredoka text-sm font-black uppercase tracking-widest py-2.5 border-2 bg-slate-700 border-slate-600 text-slate-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            className="flex-1 font-fredoka text-sm font-black uppercase tracking-widest py-2.5 border-4 bg-red-600 border-red-800 text-white shadow-[3px_3px_0_#7f1d1d] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#7f1d1d] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Inline-editable player row ───────────────────────────
function PlayerRow({
  player,
  index,
  onUpdate,
  onDeleteRequest,
}: {
  player: GlobalPlayer;
  index: number;
  onUpdate: (updated: GlobalPlayer) => void;
  onDeleteRequest: (player: GlobalPlayer) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editName, setEditName] = useState(player.full_name);
  const [editJersey, setEditJersey] = useState(player.jersey_name);
  const [editPos, setEditPos] = useState(player.position);

  const editNameRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setEditName(player.full_name);
    setEditJersey(player.jersey_name);
    setEditPos(player.position);
    setEditing(true);
    setTimeout(() => editNameRef.current?.focus(), 20);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const saveEdit = async () => {
    if (!editName.trim() || !editJersey.trim()) return;
    setSaving(true);
    const { data } = await supabase
      .from("players")
      .update({ full_name: editName.trim(), jersey_name: editJersey.trim(), position: editPos })
      .eq("id", player.id)
      .select();
    if (data && data.length > 0) {
      onUpdate(data[0] as GlobalPlayer);
      setEditing(false);
    }
    setSaving(false);
  };



  // ── Edit mode ──────────────────────────────────────────
  if (editing) {
    return (
      <div className="flex flex-col gap-2 px-4 py-3 bg-slate-700 border-2 border-[#65d421]">
        <div className="flex gap-2">
          <input
            ref={editNameRef}
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); saveEdit(); } if (e.key === "Escape") cancelEdit(); }}
            placeholder="Full Name"
            className="flex-1 bg-slate-900 border-2 border-slate-600 focus:border-[#65d421] outline-none text-white font-nunito font-bold px-3 py-2 text-sm placeholder:text-slate-600 transition-colors"
          />
          <input
            value={editJersey}
            onChange={e => setEditJersey(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); saveEdit(); } if (e.key === "Escape") cancelEdit(); }}
            placeholder="JERSEY"
            className="w-24 bg-slate-900 border-2 border-slate-600 focus:border-[#65d421] outline-none text-white font-nunito font-bold px-3 py-2 text-sm uppercase placeholder:text-slate-600 transition-colors"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          {/* Position pills */}
          <div className="flex gap-1.5">
            {POSITIONS.map(pos => (
              <button
                key={pos}
                type="button"
                onClick={() => setEditPos(pos as GlobalPlayer["position"])}
                className={`font-fredoka text-xs font-black px-2.5 py-1 border-2 transition-all ${
                  editPos === pos
                    ? "bg-[#65d421] border-[#1b630a] text-slate-900"
                    : "bg-slate-900 border-slate-600 text-slate-400 hover:text-white"
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
          {/* Action buttons */}
          <div className="flex gap-2 shrink-0">
            <button
              onClick={cancelEdit}
              className="font-fredoka text-xs font-black px-3 py-1.5 border-2 bg-slate-800 border-slate-600 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveEdit}
              disabled={saving || !editName.trim() || !editJersey.trim()}
              className="font-fredoka text-xs font-black px-3 py-1.5 border-2 bg-[#65d421] border-[#1b630a] text-slate-900 shadow-[2px_2px_0_#1b630a] hover:-translate-y-px transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal row ─────────────────────────────────────────
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-slate-800 border-2 border-slate-700 hover:border-slate-500 transition-colors group">
      {/* Index */}
      <span className="font-fredoka text-sm font-black text-slate-600 w-5 shrink-0 text-right">
        {index + 1}
      </span>

      {/* Position badge */}
      <span className="font-fredoka text-xs font-black px-2 py-1 bg-slate-700 text-slate-300 border border-slate-600 shrink-0 w-9 text-center">
        {player.position}
      </span>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <span className="font-fredoka text-base sm:text-lg font-black text-white truncate block">{player.full_name}</span>
      </div>

      {/* Jersey name */}
      <span className="font-nunito text-xs font-bold text-slate-500 uppercase tracking-widest shrink-0 hidden sm:block">
        {player.jersey_name}
      </span>

      {/* Actions — appear on hover */}
      <div className="flex gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Edit */}
        <button
          onClick={startEdit}
          title="Edit player"
          className="w-7 h-7 flex items-center justify-center border-2 border-slate-600 bg-slate-700 text-slate-400 hover:text-white hover:border-slate-400 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
          </svg>
        </button>
        {/* Delete → opens modal */}
        <button
          onClick={() => onDeleteRequest(player)}
          title="Delete player"
          className="w-7 h-7 flex items-center justify-center border-2 border-slate-600 bg-slate-700 text-slate-400 hover:text-red-400 hover:border-red-800 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193v-.443A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────
export default function PlayersManagement() {
  const [players, setPlayers] = useState<GlobalPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [jerseyName, setJerseyName] = useState("");
  const [position, setPosition] = useState("");
  const [formError, setFormError] = useState("");

  // Directory state
  const [search, setSearch] = useState("");
  const [filterPos, setFilterPos] = useState("ALL");

  // Delete modal state
  const [playerToDelete, setPlayerToDelete] = useState<GlobalPlayer | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    fetchPlayers();
    nameInputRef.current?.focus();
  }, []);

  const fetchPlayers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("players")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setPlayers(data as GlobalPlayer[]);
    setLoading(false);
  };

  const handleFullNameChange = (val: string) => {
    // Title case each word
    const titleCased = val
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
    
    setFullName(titleCased);
    setFormError("");
    const first = titleCased.trim().split(" ")[0];
    setJerseyName(first ? first.toUpperCase() : "");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    if (!fullName.trim()) {
      setFormError("Please enter the player's full name.");
      return;
    }
    if (!jerseyName.trim()) {
      setFormError("Please enter the player's jersey name.");
      return;
    }
    if (!position) {
      setFormError("Please select a position for the player.");
      return;
    }

    setSaving(true);
    setFormError("");
    
    const { data } = await supabase
      .from("players")
      .insert([{ full_name: fullName.trim(), jersey_name: jerseyName.trim(), position }])
      .select();
    if (data && data.length > 0) {
      setPlayers([data[0] as GlobalPlayer, ...players]);
      setFullName("");
      setJerseyName("");
      setPosition("");
      nameInputRef.current?.focus();
    }
    setSaving(false);
  };

  const handleUpdate = (updated: GlobalPlayer) => {
    setPlayers(prev => prev.map(p => (p.id === updated.id ? updated : p)));
  };

  const handleDeleteConfirmed = async () => {
    if (!playerToDelete) return;
    await supabase.from("players").delete().eq("id", playerToDelete.id);
    setPlayers(prev => prev.filter(p => p.id !== playerToDelete.id));
    setPlayerToDelete(null);
  };

  // Searching or filtering? Show full filtered list. Otherwise show latest 5.
  const isSearching = search.trim().length > 0 || filterPos !== "ALL";

  const filteredPlayers = players.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.full_name.toLowerCase().includes(q) || p.jersey_name.toLowerCase().includes(q);
    const matchPos = filterPos === "ALL" || p.position === filterPos;
    return matchSearch && matchPos;
  });

  const displayedPlayers = isSearching ? filteredPlayers : players.slice(0, 5);

  return (
    <>
    <div className="min-h-screen bg-slate-900">
      {/* ── Nav ─────────────────────────────────────────── */}
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
          <span className="text-slate-500 ml-3 text-lg sm:text-xl font-bold uppercase tracking-wider">/ Players</span>
        </h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col gap-6">

        {/* ── Register Form ────────────────────────────── */}
        <form
          onSubmit={handleRegister}
          className="bg-slate-800 border-4 border-slate-700 p-5 sm:p-6 flex flex-col gap-4"
        >
          <h2 className="font-fredoka text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
            Register Player
          </h2>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex flex-col gap-1">
              <label className="font-nunito text-xs font-bold uppercase tracking-widest text-slate-400">Full Name</label>
              <input
                ref={nameInputRef}
                type="text"
                placeholder="e.g. Simeon Ogunyinka"
                value={fullName}
                onChange={e => handleFullNameChange(e.target.value)}
                className="bg-slate-900 border-2 border-slate-600 focus:border-[#65d421] outline-none text-white font-nunito font-bold px-3 py-2.5 text-sm placeholder:text-slate-600 transition-colors"
              />
            </div>
            <div className="sm:w-36 flex flex-col gap-1">
              <label className="font-nunito text-xs font-bold uppercase tracking-widest text-slate-400">Jersey Name</label>
              <input
                type="text"
                placeholder="SIMEON"
                value={jerseyName}
                onChange={e => {
                  setJerseyName(e.target.value.toUpperCase());
                  setFormError("");
                }}
                className="bg-slate-900 border-2 border-slate-600 focus:border-[#65d421] outline-none text-white font-nunito font-bold px-3 py-2.5 text-sm uppercase placeholder:text-slate-600 transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-nunito text-xs font-bold uppercase tracking-widest text-slate-400">Position</label>
            <div className="flex gap-2">
              {POSITIONS.map(pos => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => {
                    setPosition(pos);
                    setFormError("");
                    submitBtnRef.current?.focus();
                  }}
                  className={`font-fredoka text-sm font-black px-4 py-2 border-2 transition-all ${
                    position === pos
                      ? "bg-[#65d421] border-[#1b630a] text-slate-900 shadow-[2px_2px_0_#1b630a]"
                      : "bg-slate-900 border-slate-600 text-slate-400 hover:border-slate-400 hover:text-white"
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          {formError && (
            <p className="font-nunito text-sm font-bold text-red-400 mt-1">⚠ {formError}</p>
          )}

          <button
            ref={submitBtnRef}
            type="submit"
            disabled={saving}
            className={`font-fredoka text-base font-black uppercase tracking-widest py-3 border-4 transition-all ${
              !saving
                ? "bg-[#65d421] border-[#1b630a] text-slate-900 shadow-[4px_4px_0_#1b630a] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#1b630a] active:translate-y-0 active:shadow-[2px_2px_0_#1b630a]"
                : "bg-slate-700 border-slate-600 text-slate-500 cursor-not-allowed"
            }`}
          >
            {saving ? "Registering…" : "Register Player"}
          </button>
        </form>

        {/* ── Directory ────────────────────────────────── */}
        <div className="flex flex-col gap-3">

          {/* Header */}
          <div className="flex items-baseline justify-between">
            <h2 className="font-fredoka text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
              Directory
            </h2>
            <span className="font-nunito text-xs font-bold text-slate-500 uppercase tracking-widest">
              {players.length} total player{players.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Search + filters */}
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Search to see all results…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-800 border-2 border-slate-600 focus:border-[#65d421] outline-none text-white font-nunito font-bold px-3 py-2.5 text-sm placeholder:text-slate-600 transition-colors"
            />
            <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
              {POSITION_FILTERS.map(pos => (
                <button
                  key={pos}
                  onClick={() => setFilterPos(pos)}
                  className={`font-fredoka text-xs font-black px-3 py-1.5 border-2 shrink-0 transition-all ${
                    filterPos === pos
                      ? "bg-white border-slate-900 text-slate-900 shadow-[2px_2px_0_#0f172a]"
                      : "bg-slate-800 border-slate-600 text-slate-400 hover:text-white hover:border-slate-400"
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          {/* Context label */}
          {/* {!isSearching && !loading && players.length > 5 && (
            // <p className="font-nunito text-xs font-bold text-slate-600 uppercase tracking-widest">
            //   Showing 5 most recent · Search to see all {players.length}
            // </p>
          )} */}
          {isSearching && (
            <p className="font-nunito text-xs font-bold text-slate-500 uppercase tracking-widest">
              {filteredPlayers.length} result{filteredPlayers.length !== 1 ? "s" : ""}
            </p>
          )}

          {/* Player rows */}
          <div className="flex flex-col gap-2">
            {loading ? (
              <p className="font-nunito text-sm font-bold text-slate-500 py-6 text-center">Loading…</p>
            ) : displayedPlayers.length === 0 ? (
              <p className="font-nunito text-sm font-bold text-slate-500 py-6 text-center">No players found.</p>
            ) : (
              displayedPlayers.map((p, i) => (
                <PlayerRow
                  key={p.id}
                  player={p}
                  index={i}
                  onUpdate={handleUpdate}
                  onDeleteRequest={setPlayerToDelete}
                />
              ))
            )}
          </div>
        </div>

      </div>
    </div>

    {/* ── Delete modal ──────────────────────────────── */}
    {playerToDelete && (
      <DeleteModal
        player={playerToDelete}
        onCancel={() => setPlayerToDelete(null)}
        onConfirm={handleDeleteConfirmed}
      />
    )}
    </>
  );
}
