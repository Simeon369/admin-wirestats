"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ChunkyButton } from "@/components/ui/ChunkyButton";
import { ChunkyInput } from "@/components/ui/ChunkyInput";
import { ChunkySelect } from "@/components/ui/ChunkySelect";
import { Tournament } from "@/lib/types";

type Step = 1 | 2 | 3;

export default function CreateTournamentPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 State
  const [name, setName] = useState("");
  const [format, setFormat] = useState<Tournament['format']>('ROUND_ROBIN');
  const [hasThirdPlace, setHasThirdPlace] = useState(false);
  const [ageCategory, setAgeCategory] = useState("U18");
  const [customCategory, setCustomCategory] = useState("");
  const [gender, setGender] = useState("Boys");
  const [startDate, setStartDate] = useState("");
  const [durationDays, setDurationDays] = useState(1);

  // Step 2 State - Teams
  const [teams, setTeams] = useState<{name: string, color: string}[]>([
    { name: 'Team Alpha', color: '#ff0000' },
    { name: 'Team Beta', color: '#0000ff' }
  ]);

  const handleNext = async () => {
    if (step === 1) {
      if (!name) {
        setError("Tournament name is required.");
        return;
      }
      setError(null);
      setStep(2);
    } else if (step === 2) {
      if (teams.length < 2) {
        setError("At least 2 teams are required.");
        return;
      }
      setError(null);
      setStep(3);
    } else if (step === 3) {
      // Finalize and Create
      setLoading(true);
      setError(null);
      try {
        // 1. Create Tournament
        const finalCategory = ageCategory === "Custom" 
          ? `${customCategory} ${gender}`.trim() 
          : `${ageCategory} ${gender}`.trim();

        const { data: tData, error: tError } = await supabase
          .from("tournaments")
          .insert({
            name,
            format,
            status: "DRAFT",
            has_third_place: hasThirdPlace,
            category: finalCategory,
            start_date: startDate || null,
            duration_days: durationDays || 1
          })
          .select()
          .single();

        if (tError) throw tError;
        const tournamentId = tData.id;

        // 2. Create Teams and Junctions
        for (const team of teams) {
          const { data: teamData, error: teamError } = await supabase
            .from("teams")
            .insert({
              name: team.name,
              color: team.color
            })
            .select()
            .single();
          
          if (teamError) throw teamError;

          const { error: junctionError } = await supabase
            .from("tournament_teams")
            .insert({
              tournament_id: tournamentId,
              team_id: teamData.id,
              group_name: "Group A" // Defaulting for simple hybrid
            });
            
          if (junctionError) throw junctionError;
        }

        router.push("/tournaments");
      } catch (err: any) {
        setError(err.message || "Failed to create tournament");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAddTeam = () => {
    setTeams([...teams, { name: `Team ${teams.length + 1}`, color: '#000000' }]);
  };

  const handleUpdateTeam = (index: number, field: 'name' | 'color', value: string) => {
    const newTeams = [...teams];
    newTeams[index][field] = value;
    setTeams(newTeams);
  };

  const handleRemoveTeam = (index: number) => {
    const newTeams = [...teams];
    newTeams.splice(index, 1);
    setTeams(newTeams);
  };

  return (
    <div className="min-h-screen bg-slate-900 p-8 pb-20 font-nunito">
      <div className="max-w-3xl mx-auto flex flex-col gap-8 bg-white border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] p-8">
        <header className="border-b-4 border-slate-900 pb-4 flex justify-between items-center">
          <h1 className="font-fredoka text-4xl font-black uppercase text-slate-900 tracking-wide">
            Create Tournament
          </h1>
          <div className="text-xl font-bold bg-slate-200 border-2 border-slate-900 px-4 py-1">
            Step {step} of 3
          </div>
        </header>

        {error && (
          <div className="bg-red-400 border-4 border-slate-900 p-4 text-slate-900 font-bold">
            {error}
          </div>
        )}

        {/* STEP 1: Basic Details */}
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <h2 className="text-2xl font-bold uppercase tracking-wider text-slate-900">1. Basic Details</h2>
            <div className="flex flex-col gap-2">
              <label className="font-bold text-slate-700 uppercase tracking-wider text-sm">Tournament Name</label>
              <ChunkyInput 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="e.g., BYL Summer Tournament" 
                className="text-xl"
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="font-bold text-slate-700 uppercase tracking-wider text-sm">Format</label>
              <ChunkySelect 
                value={format} 
                onChange={(val) => setFormat(val as any)}
                options={[
                  { value: 'ROUND_ROBIN', label: 'Round Robin' },
                  { value: 'SINGLE_ELIMINATION', label: 'Single Elimination' },
                  { value: 'HYBRID', label: 'Hybrid (Groups + Knockout)' }
                ]}
              />
            </div>

            {format === 'SINGLE_ELIMINATION' && (
              <div className="flex items-center gap-3 mt-2">
                <input 
                  type="checkbox" 
                  id="thirdPlace"
                  checked={hasThirdPlace}
                  onChange={(e) => setHasThirdPlace(e.target.checked)}
                  className="w-6 h-6 border-2 border-slate-900 accent-[#65d421] cursor-pointer"
                />
                <label htmlFor="thirdPlace" className="font-bold text-slate-700 uppercase tracking-wider text-sm cursor-pointer select-none">
                  Include Third Place Game
                </label>
              </div>
            )}

            <div className="flex flex-col gap-4 mt-2">
              <label className="font-bold text-slate-700 uppercase tracking-wider text-sm">Category</label>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 flex flex-col gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">Age Group</span>
                  <div className="flex flex-wrap gap-2">
                    {["U12", "U14", "U16", "U18", "Adult", "Custom"].map(age => (
                      <button
                        key={age}
                        onClick={() => setAgeCategory(age)}
                        className={`px-4 py-2 font-bold uppercase tracking-wider border-2 transition-colors ${ageCategory === age ? "bg-[#65d421] border-[#1b630a] text-slate-900" : "bg-white border-slate-300 text-slate-500 hover:border-slate-500"}`}
                      >
                        {age}
                      </button>
                    ))}
                  </div>
                  {ageCategory === "Custom" && (
                    <ChunkyInput 
                      value={customCategory} 
                      onChange={(e) => setCustomCategory(e.target.value)} 
                      placeholder="e.g. Masters 35+" 
                      className="mt-2"
                    />
                  )}
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">Gender</span>
                  <div className="flex flex-wrap gap-2">
                    {["Boys", "Girls", "Men", "Women", "Mixed"].map(g => (
                      <button
                        key={g}
                        onClick={() => setGender(g)}
                        className={`px-4 py-2 font-bold uppercase tracking-wider border-2 transition-colors ${gender === g ? "bg-[#65d421] border-[#1b630a] text-slate-900" : "bg-white border-slate-300 text-slate-500 hover:border-slate-500"}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 mt-2">
              <div className="flex-1 flex flex-col gap-2">
                <label className="font-bold text-slate-700 uppercase tracking-wider text-sm">Start Date</label>
                <ChunkyInput 
                  type="date"
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                />
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <label className="font-bold text-slate-700 uppercase tracking-wider text-sm">Duration (Days)</label>
                <ChunkyInput 
                  type="number"
                  min="1"
                  value={durationDays.toString()} 
                  onChange={(e) => setDurationDays(parseInt(e.target.value) || 1)} 
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Teams Enrollment */}
        {step === 2 && (
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold uppercase tracking-wider text-slate-900">2. Teams Enrollment</h2>
              <ChunkyButton onClick={handleAddTeam} size="sm">Add Team</ChunkyButton>
            </div>
            
            <div className="flex flex-col gap-4">
              {teams.map((team, index) => (
                <div key={index} className="flex gap-4 items-center bg-slate-100 p-4 border-2 border-slate-900">
                  <div className="font-bold text-xl w-8">{index + 1}.</div>
                  <ChunkyInput 
                    value={team.name} 
                    onChange={(e) => handleUpdateTeam(index, 'name', e.target.value)} 
                    placeholder="Team Name" 
                    className="flex-1"
                  />
                  <input 
                    type="color" 
                    value={team.color} 
                    onChange={(e) => handleUpdateTeam(index, 'color', e.target.value)}
                    className="w-12 h-12 border-2 border-slate-900 cursor-pointer p-0"
                  />
                  <ChunkyButton variant="danger" onClick={() => handleRemoveTeam(index)}>X</ChunkyButton>
                </div>
              ))}
            </div>
            <p className="text-sm font-bold text-slate-500 italic">
              Note: You will assign players to these teams in the tournament dashboard.
            </p>
          </div>
        )}

        {/* STEP 3: Fixture Generation */}
        {step === 3 && (
          <div className="flex flex-col gap-6">
            <h2 className="text-2xl font-bold uppercase tracking-wider text-slate-900">3. Fixture Generation</h2>
            <p className="text-lg font-bold text-slate-700">
              The system will automatically generate a hybrid schedule for the <span className="text-[#65d421] bg-slate-900 px-2 py-1 mx-1">{name}</span> tournament with {teams.length} teams.
            </p>
            <div className="bg-amber-200 border-4 border-slate-900 p-4 font-bold text-slate-900 mt-4 shadow-[4px_4px_0_#0f172a]">
              Games will be assigned to Group A and Group B automatically. You can manually adjust the schedule from the tournament dashboard later.
            </div>
          </div>
        )}

        <div className="flex justify-between mt-8 pt-6 border-t-4 border-slate-900">
          {step > 1 ? (
            <ChunkyButton variant="secondary" onClick={() => setStep((s) => s - 1 as Step)} disabled={loading}>
              Back
            </ChunkyButton>
          ) : (
            <div></div> // Spacer
          )}
          <ChunkyButton onClick={handleNext} disabled={loading}>
            {loading ? "Saving..." : (step === 3 ? "Generate & Create" : "Next Step")}
          </ChunkyButton>
        </div>
      </div>
    </div>
  );
}
