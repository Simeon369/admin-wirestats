"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminDashboard() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined" && supabase) {
      supabase
        .from("games")
        .select("id")
        .eq("status", "active")
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (data && data.id) {
            localStorage.setItem("wirestats_active_game_id", data.id);
            router.push("/game");
          }
        });
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-900 p-8 pb-20">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        <header className="border-b-4 border-slate-700 pb-6 mb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-end gap-2">
            <h1 className="font-fredoka text-6xl font-black tracking-widest text-white">
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
            <p className="font-nunito text-xl mb-1 ml-4 text-slate-400 font-bold uppercase tracking-wider">
              Control Center
            </p>
          </div>
        </header>

        <div className="grid md:grid-cols-3 gap-8 mt-8">
          <Link href="/match/setup" className="group">
            <div className="h-full flex flex-col items-center justify-center gap-6 p-8 border-4 border-slate-900 bg-white shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] transition-transform group-hover:-translate-y-2 group-hover:shadow-[12px_12px_0px_0px_rgba(15,23,42,1)] cursor-pointer">
              <div className="w-20 h-20 bg-[#65d421] border-4 border-slate-900 flex items-center justify-center rounded-full text-slate-900 shadow-[4px_4px_0_#1b630a]">
                <svg xmlns="http://www.w3.org/O/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-10 h-10">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <h2 className="font-fredoka text-2xl uppercase tracking-wider text-slate-900 font-bold text-center">
                Create Match
              </h2>
              <p className="font-nunito text-slate-600 text-center font-bold">Spin up a single game session.</p>
            </div>
          </Link>

          <Link href="/players" className="group">
            <div className="h-full flex flex-col items-center justify-center gap-6 p-8 border-4 border-slate-900 bg-white shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] transition-transform group-hover:-translate-y-2 group-hover:shadow-[12px_12px_0px_0px_rgba(15,23,42,1)] cursor-pointer">
              <div className="w-20 h-20 bg-[#3b82f6] border-4 border-slate-900 flex items-center justify-center rounded-full text-white shadow-[4px_4px_0_#1e3a8a]">
                <svg xmlns="http://www.w3.org/O/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-10 h-10">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              </div>
              <h2 className="font-fredoka text-2xl uppercase tracking-wider text-slate-900 font-bold text-center">
                Register Player
              </h2>
              <p className="font-nunito text-slate-600 text-center font-bold">Manage global player profiles.</p>
            </div>
          </Link>

          <div className="h-full flex flex-col items-center justify-center gap-6 p-8 border-4 border-slate-900 bg-slate-200 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] opacity-70">
            <div className="w-20 h-20 bg-slate-400 border-4 border-slate-900 flex items-center justify-center rounded-full text-slate-700 shadow-[4px_4px_0_#475569]">
              <svg xmlns="http://www.w3.org/O/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-10 h-10">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.29 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
              </svg>
            </div>
            <h2 className="font-fredoka text-2xl uppercase tracking-wider text-slate-900 font-bold text-center">
              Create Tournament
            </h2>
            <p className="font-nunito text-slate-600 text-center font-bold">Coming Soon in V2</p>
          </div>
        </div>
      </div>
    </div>
  );
}
