"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Tournament } from "@/lib/types";
import { ChunkyButton } from "@/components/ui/ChunkyButton";

// ── Create Tournament Modal ──────────────────────────────────────────
function CreateTournamentModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [durationDays, setDurationDays] = useState(1);
  const [venue, setVenue] = useState("");
  const [format, setFormat] = useState<"ROUND_ROBIN" | "SINGLE_ELIMINATION" | "HYBRID">("ROUND_ROBIN");
  const [periodType, setPeriodType] = useState<"QUARTER" | "HALF">("QUARTER");
  const [periodLength, setPeriodLength] = useState("10");
  const [hasThirdPlace, setHasThirdPlace] = useState(false);
  const [ageCategory, setAgeCategory] = useState("U18");
  const [customCategory, setCustomCategory] = useState("");
  const [gender, setGender] = useState("Boys");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Tournament name is required."); return; }
    setSaving(true);
    setError("");

    const finalCategory = ageCategory === "Custom"
      ? `${customCategory} ${gender}`.trim()
      : `${ageCategory} ${gender}`.trim();

    const { data, error: dbErr } = await supabase.from("tournaments").insert([{
      name: name.trim(),
      date: date || null,
      start_date: date || null,
      duration_days: durationDays || 1,
      venue: venue.trim() || null,
      format,
      period_type: periodType,
      period_length_mins: parseInt(periodLength) || 10,
      has_third_place: hasThirdPlace,
      category: finalCategory,
    }]).select().single();

    if (dbErr || !data) {
      setError("Failed to create tournament. Please try again.");
      setSaving(false);
      return;
    }

    onCreated(data.id);
  };

  const inputCls = "bg-slate-900 border-2 border-slate-600 focus:border-[#65d421] outline-none text-white font-nunito font-bold px-3 py-2.5 text-sm placeholder:text-slate-500 transition-colors w-full";
  const labelCls = "font-nunito text-xs font-bold uppercase tracking-widest text-slate-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 bg-slate-800 border-4 border-slate-600 shadow-[12px_12px_0_#0f172a] w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden"
      >
        <div className="flex justify-between items-center border-b-4 border-slate-700 p-6 md:p-8 pb-4 flex-shrink-0">
          <h2 className="font-fredoka text-3xl font-black uppercase tracking-widest text-white">New Tournament</h2>
          <button type="button" onClick={onClose} className="font-fredoka font-black text-slate-400 hover:text-white text-xl transition-colors">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col gap-5">
          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Tournament Name *</label>
            <input autoFocus type="text" placeholder="e.g. Summer Classic 2026" value={name}
              onChange={e => { setName(e.target.value); setError(""); }} className={inputCls} />
          </div>

          {/* Date + Duration + Venue */}
          <div className="flex flex-col gap-4">
            <div className="flex justify-between gap-2">
              <div className="flex flex-col flex-1 mr-4 gap-1">
                <label className={labelCls}>Start Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
              </div>
              <div className="flex flex-col flex-1 gap-1">
                <label className={labelCls}>Days</label>
                <input type="number" min="1" value={durationDays} onChange={e => setDurationDays(parseInt(e.target.value) || 1)} className={inputCls} />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelCls}>Venue (Optional)</label>
              <input type="text" placeholder="e.g. City Sports Hall" value={venue}
                onChange={e => setVenue(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Format */}
          <div className="flex flex-col gap-2">
            <label className={labelCls}>Format *</label>
            <div className="flex gap-2 flex-wrap">
              {([
                { val: "ROUND_ROBIN", label: "Round Robin" },
                { val: "SINGLE_ELIMINATION", label: "Single Elim." },
                { val: "HYBRID", label: "Hybrid" }
              ] as const).map(opt => (
                <button key={opt.val} type="button" onClick={() => setFormat(opt.val)}
                  className={`font-fredoka font-black text-sm uppercase tracking-widest px-4 py-2 border-2 transition-all ${format === opt.val
                      ? "bg-[#65d421] border-[#1b630a] text-slate-900 shadow-[3px_3px_0_#1b630a]"
                      : "bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-400"
                    }`}
                >{opt.label}</button>
              ))}
            </div>
          </div>

          {format === 'SINGLE_ELIMINATION' && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="thirdPlace"
                checked={hasThirdPlace}
                onChange={(e) => setHasThirdPlace(e.target.checked)}
                className="w-5 h-5 border-2 border-slate-900 accent-[#65d421] cursor-pointer"
              />
              <label htmlFor="thirdPlace" className={`${labelCls} cursor-pointer select-none`}>
                Include Third Place Game
              </label>
            </div>
          )}

          {/* Category */}
          <div className="flex flex-col gap-2 border-t-2 border-slate-700 pt-4">
            <label className={labelCls}>Category</label>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 flex flex-col gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Age Group</span>
                <div className="flex flex-wrap gap-1.5">
                  {["U12", "U14", "U16", "U18", "Adult", "Custom"].map(age => (
                    <button
                      key={age} type="button"
                      onClick={() => setAgeCategory(age)}
                      className={`font-fredoka font-black text-xs uppercase px-2 py-1.5 border-2 transition-all ${ageCategory === age ? "bg-[#65d421] border-[#1b630a] text-slate-900" : "bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-400"}`}
                    >
                      {age}
                    </button>
                  ))}
                </div>
                {ageCategory === "Custom" && (
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="e.g. Masters 35+"
                    className={`${inputCls} mt-1`}
                  />
                )}
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Gender</span>
                <div className="flex flex-wrap gap-1.5">
                  {["Boys", "Girls", "Men", "Women", "Mixed"].map(g => (
                    <button
                      key={g} type="button"
                      onClick={() => setGender(g)}
                      className={`font-fredoka font-black text-xs uppercase px-2 py-1.5 border-2 transition-all ${gender === g ? "bg-[#65d421] border-[#1b630a] text-slate-900" : "bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-400"}`}
                    >
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
                    className={`flex-1 font-fredoka font-black text-sm uppercase tracking-wider px-3 py-2 border-2 transition-all ${periodType === p
                        ? "bg-[#65d421] border-[#1b630a] text-slate-900"
                        : "bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-400"
                      }`}
                  >{p === "QUARTER" ? "Quarters" : "Halves"}</button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Mins Per Period</label>
              <select value={periodLength} onChange={e => setPeriodLength(e.target.value)}
                className={inputCls}>
                {["5", "8", "10", "12", "15", "20"].map(m => (
                  <option key={m} value={m}>{m} min</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        {error && <p className="font-nunito text-sm font-bold text-red-400 mt-2 px-6 md:px-8">⚠ {error}</p>}

        <div className="flex gap-3 p-6 md:p-8 pt-4 border-t-4 border-slate-700 flex-shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 font-fredoka font-black uppercase tracking-widest py-3 border-2 border-slate-600 bg-slate-700 text-slate-300 hover:text-white transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 font-fredoka font-black uppercase tracking-widest py-3 border-2 border-[#1b630a] bg-[#65d421] text-slate-900 shadow-[4px_4px_0_#1b630a] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#1b630a] active:translate-y-0 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? "Creating..." : "Create →"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────
export default function TournamentsDashboard() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => { fetchTournaments(); }, []);

  const fetchTournaments = async () => {
    const { data } = await supabase
      .from("tournaments")
      .select("*")
      .order("created_at", { ascending: false });
    setTournaments(data || []);
    setLoading(false);
  };

  const handleCreated = (id: string) => {
    router.push(`/tournaments/${id}`);
  };

  const statusColor = (status: string) =>
    status === "ACTIVE" ? "bg-[#65d421] text-slate-900" :
      status === "COMPLETED" ? "bg-slate-200 text-slate-700" :
        "bg-amber-300 text-slate-900";

  return (
    <div className="min-h-screen bg-slate-900 p-6 md:p-10 pb-20 font-nunito">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">

        <Link href="/" className="inline-flex items-center text-slate-400 hover:text-white font-bold transition-colors text-sm">
          ← Back to Dashboard
        </Link>

        <header className="border-b-4 border-slate-700 pb-6 flex justify-between items-end gap-4">
          <div>
            <h1 className="font-fredoka text-5xl md:text-6xl font-black tracking-widest text-white uppercase">
              Tournaments
            </h1>
            <p className="font-nunito text-lg mt-1 text-slate-400 font-bold uppercase tracking-wider">
              Manage leagues & brackets
            </p>
          </div>
          <button onClick={() => setShowCreateModal(true)}
            className="font-fredoka font-black uppercase tracking-widest px-6 py-3 border-4 border-[#1b630a] bg-[#65d421] text-slate-900 shadow-[6px_6px_0_#1b630a] hover:-translate-y-1 hover:shadow-[8px_8px_0_#1b630a] active:translate-y-0 active:shadow-none transition-all text-lg whitespace-nowrap">
            + New Tournament
          </button>
        </header>

        {loading ? (
          <div className="text-white text-xl font-bold font-fredoka animate-pulse">Loading...</div>
        ) : tournaments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-6 py-24 border-4 border-dashed border-slate-700">
            <div className="font-fredoka text-7xl">🏆</div>
            <p className="font-fredoka text-2xl font-black text-slate-500 uppercase tracking-wider">No tournaments yet</p>
            <button onClick={() => setShowCreateModal(true)}
              className="font-fredoka font-black uppercase tracking-widest px-8 py-3 border-4 border-[#1b630a] bg-[#65d421] text-slate-900 shadow-[6px_6px_0_#1b630a] hover:-translate-y-1 transition-all text-xl">
              Create First Tournament
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((t) => (
              <div key={t.id} className="bg-slate-800 border-4 border-slate-700 flex flex-col shadow-[6px_6px_0_#0f172a] hover:-translate-y-1 hover:shadow-[10px_10px_0_#0f172a] transition-all group">
                {/* Status bar */}
                <div className={`h-1.5 w-full ${t.status === "ACTIVE" ? "bg-[#65d421]" : t.status === "COMPLETED" ? "bg-slate-400" : "bg-amber-300"}`} />

                <div className="p-5 flex flex-col gap-4 flex-1">
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-fredoka text-2xl font-black uppercase tracking-wider text-white leading-tight group-hover:text-[#65d421] transition-colors">
                      {t.name}
                    </h2>
                    <span className={`flex-shrink-0 font-fredoka font-black text-xs uppercase tracking-widest px-2 py-1 border-2 border-slate-900 ${statusColor(t.status)}`}>
                      {t.status}
                    </span>
                  </div>

                  {/* Info rows */}
                  <div className="flex flex-col gap-1.5 text-sm font-nunito font-bold">
                    {t.venue && (
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="text-base leading-none">📍</span>
                        <span>{t.venue}</span>
                      </div>
                    )}
                    {t.start_date && (
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="text-base leading-none">📅</span>
                        <span>
                          {new Date(t.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
                          {t.duration_days && t.duration_days > 1 && (
                            <span className="text-slate-500 ml-1">· {t.duration_days} days</span>
                          )}
                        </span>
                      </div>
                    )}
                    {t.category && (
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="text-base leading-none">📋</span>
                        <span>{t.category}</span>
                      </div>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mt-auto">
                    <span className="font-fredoka font-black text-xs uppercase tracking-widest px-2 py-1 bg-slate-900 border-2 border-slate-600 text-slate-300">
                      {t.format.replace(/_/g, " ")}
                    </span>
                    <span className="font-fredoka font-black text-xs uppercase tracking-widest px-2 py-1 bg-slate-900 border-2 border-slate-600 text-slate-300">
                      ⏱ {t.period_length_mins}min {t.period_type === "QUARTER" ? "QTR" : "HALF"}
                    </span>
                  </div>
                </div>

                {/* Manage button */}
                <div className="border-t-2 border-slate-700 p-4">
                  <Link href={`/tournaments/${t.id}`}>
                    <button className="w-full font-fredoka font-black uppercase tracking-widest py-2.5 border-2 border-[#1b630a] bg-[#65d421] text-slate-900 shadow-[3px_3px_0_#1b630a] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1b630a] active:translate-y-0 active:shadow-none transition-all text-sm">
                      Manage →
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {showCreateModal && (
        <CreateTournamentModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
