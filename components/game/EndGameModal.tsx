import React, { useEffect } from "react";

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

export function EndGameModal({ onConfirm, onCancel }: Props) {
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <div className="bg-white border-4 border-slate-900 shadow-[8px_8px_0_#0f172a] p-6 sm:p-8 max-w-sm w-full flex flex-col gap-4">
        <h2 className="font-fredoka text-3xl font-black tracking-widest text-slate-900 border-b-4 border-slate-900 pb-2">
          End Game?
        </h2>
        
        <p className="font-nunito font-bold text-slate-600 text-lg">
          Are you sure you want to end this game? This will mark the game as finished and return you to the dashboard.
        </p>
        
        <div className="flex items-center justify-end gap-4 mt-4 pt-4 border-t-2 border-slate-100">
          <button
            onClick={onCancel}
            className="font-fredoka font-black uppercase tracking-widest px-6 py-2 border-2 border-slate-900 text-slate-900 bg-slate-200 shadow-[4px_4px_0_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0f172a] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="font-fredoka font-black uppercase tracking-widest px-6 py-2 border-2 border-slate-900 bg-red-500 text-white shadow-[4px_4px_0_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0f172a] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
          >
            End Game
          </button>
        </div>
      </div>
    </div>
  );
}
