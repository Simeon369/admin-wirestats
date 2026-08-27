import React, { useEffect } from "react";

interface Props {
  onClose: (neverShowAgain: boolean) => void;
}

export function InstructionsModal({ onClose }: Props) {
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <div className="bg-white border-4 border-slate-900 shadow-[8px_8px_0_#0f172a] p-6 sm:p-8 max-w-lg w-full flex flex-col gap-4 max-h-[90vh]">
        <h2 className="font-fredoka text-3xl font-black tracking-widest text-slate-900 border-b-4 border-slate-900 pb-2 shrink-0">
          Keyboard Shortcuts
        </h2>
        
        <div className="overflow-y-auto pr-2 sm:pr-4 -mr-2 sm:-mr-4 flex flex-col gap-6">
        
        <div className="bg-slate-100 rounded-lg p-4 border-2 border-slate-200">
          <h3 className="font-fredoka text-xl font-black text-slate-700 mb-2">How to record an event:</h3>
          <ol className="list-decimal list-inside font-nunito font-bold text-slate-600 space-y-1">
            <li>Type the player's <strong>jersey number</strong> (e.g. <kbd className="bg-slate-200 px-1 py-0.5 rounded border border-slate-300">12</kbd>)</li>
            <li>Press <kbd className="bg-slate-200 px-1 py-0.5 rounded border border-slate-300">←</kbd> or <kbd className="bg-slate-200 px-1 py-0.5 rounded border border-slate-300">→</kbd> to select their team</li>
            <li>Press the <strong>action key</strong> (<kbd className="bg-slate-200 px-1 py-0.5 rounded border border-slate-300">1</kbd>, <kbd className="bg-slate-200 px-1 py-0.5 rounded border border-slate-300">2</kbd>, <kbd className="bg-slate-200 px-1 py-0.5 rounded border border-slate-300">3</kbd>, <kbd className="bg-slate-200 px-1 py-0.5 rounded border border-slate-300">f</kbd>, <kbd className="bg-slate-200 px-1 py-0.5 rounded border border-slate-300">r</kbd>, <kbd className="bg-slate-200 px-1 py-0.5 rounded border border-slate-300">b</kbd>, <kbd className="bg-slate-200 px-1 py-0.5 rounded border border-slate-300">s</kbd>, or <kbd className="bg-slate-200 px-1 py-0.5 rounded border border-slate-300">a</kbd>)</li>
            <li>Press <kbd className="bg-slate-200 px-1 py-0.5 rounded border border-slate-300">Enter ↵</kbd> to commit to the scoreboard</li>
          </ol>
        </div>

        <div className="bg-slate-100 rounded-lg p-4 border-2 border-slate-200">
          <h3 className="font-fredoka text-xl font-black text-slate-700 mb-2">How to substitute a player:</h3>
          <ol className="list-decimal list-inside font-nunito font-bold text-slate-600 space-y-1">
            <li>Type the 1st player's <strong>jersey number</strong> (e.g. <kbd className="bg-slate-200 px-1 py-0.5 rounded border border-slate-300">12</kbd>)</li>
            <li>Press <kbd className="bg-slate-200 px-1 py-0.5 rounded border border-slate-300">←</kbd> or <kbd className="bg-slate-200 px-1 py-0.5 rounded border border-slate-300">→</kbd> to select their team</li>
            <li>Press <kbd className="bg-slate-200 px-1 py-0.5 rounded border border-slate-300">x</kbd> for substitution</li>
            <li>Type the 2nd player's <strong>jersey number</strong> (e.g. <kbd className="bg-slate-200 px-1 py-0.5 rounded border border-slate-300">5</kbd>)</li>
            <li>Press <kbd className="bg-slate-200 px-1 py-0.5 rounded border border-slate-300">Enter ↵</kbd> to commit to the scoreboard</li>
          </ol>
        </div>

        <ul className="font-nunito font-bold text-slate-600 space-y-3">
          <li className="flex justify-between border-b border-slate-200 pb-1">
            <span><kbd className="bg-slate-200 px-2 py-1 rounded text-slate-900 border border-slate-400">0-99</kbd></span>
            <span>Enter jersey number</span>
          </li>
          <li className="flex justify-between border-b border-slate-200 pb-1">
            <span><kbd className="bg-slate-200 px-2 py-1 rounded text-slate-900 border border-slate-400">←</kbd> / <kbd className="bg-slate-200 px-2 py-1 rounded text-slate-900 border border-slate-400">→</kbd></span>
            <span>Pick team (A / B)</span>
          </li>

          <li className="flex justify-between border-b border-slate-200 pb-1">
            <span><kbd className="bg-slate-200 px-2 py-1 rounded text-slate-900 border border-slate-400">2</kbd> / <kbd className="bg-slate-200 px-2 py-1 rounded text-slate-900 border border-slate-400">3</kbd></span>
            <span>Score 2-pt / 3-pt</span>
          </li>
          <li className="flex justify-between border-b border-slate-200 pb-1">
            <span><kbd className="bg-slate-200 px-2 py-1 rounded text-slate-900 border border-slate-400">f</kbd></span>
            <span>Record foul</span>
          </li>
          <li className="flex justify-between border-b border-slate-200 pb-1">
            <span><kbd className="bg-slate-200 px-2 py-1 rounded text-slate-900 border border-slate-400">r</kbd></span>
            <span>Record rebound</span>
          </li>
          <li className="flex justify-between border-b border-slate-200 pb-1">
            <span><kbd className="bg-slate-200 px-2 py-1 rounded text-slate-900 border border-slate-400">b</kbd></span>
            <span>Record block</span>
          </li>
          <li className="flex justify-between border-b border-slate-200 pb-1">
            <span><kbd className="bg-slate-200 px-2 py-1 rounded text-slate-900 border border-slate-400">s</kbd></span>
            <span>Record steal</span>
          </li>
          <li className="flex justify-between border-b border-slate-200 pb-1">
            <span><kbd className="bg-slate-200 px-2 py-1 rounded text-slate-900 border border-slate-400">a</kbd></span>
            <span>Record assist</span>
          </li>
          <li className="flex justify-between border-b border-slate-200 pb-1">
            <span><kbd className="bg-slate-200 px-2 py-1 rounded text-slate-900 border border-slate-400">1</kbd></span>
            <span>Free-throw (1 pt)</span>
          </li>
          <li className="flex justify-between border-b border-slate-200 pb-1">
            <span><kbd className="bg-slate-200 px-2 py-1 rounded text-slate-900 border border-slate-400">x</kbd></span>
            <span>Substitution (enter outgoing #)</span>
          </li>
          <li className="flex justify-between border-b border-slate-200 pb-1">
            <span><kbd className="bg-slate-200 px-2 py-1 rounded text-slate-900 border border-slate-400">Space</kbd></span>
            <span>Start / pause clock</span>
          </li>
          <li className="flex justify-between border-b border-slate-200 pb-1">
            <span><kbd className="bg-slate-200 px-2 py-1 rounded text-slate-900 border border-slate-400">Ctrl</kbd> + <kbd className="bg-slate-200 px-2 py-1 rounded text-slate-900 border border-slate-400">Z</kbd></span>
            <span>Undo last event</span>
          </li>
          <li className="flex justify-between border-b border-slate-200 pb-1">
            <span><kbd className="bg-slate-200 px-2 py-1 rounded text-slate-900 border border-slate-400">Esc</kbd></span>
            <span>Clear current buffer</span>
          </li>
          <li className="flex justify-between">
            <span><kbd className="bg-slate-200 px-2 py-1 rounded text-slate-900 border border-slate-400">Backspace</kbd></span>
            <span>Delete last digit</span>
          </li>
        </ul>
        </div>
        
        <div className="flex items-center justify-between mt-2 pt-4 border-t-2 border-slate-100 shrink-0">
          <label className="flex items-center gap-2 cursor-pointer text-slate-500 font-bold font-nunito hover:text-slate-700 select-none">
            <input
              type="checkbox"
              className="w-5 h-5 border-2 border-slate-400 rounded accent-slate-900 cursor-pointer"
              id="neverShowAgain"
            />
            Never show again
          </label>
          <button
            onClick={() => {
              const cb = document.getElementById("neverShowAgain") as HTMLInputElement;
              onClose(cb?.checked || false);
            }}
            className="bg-[#65d421] text-slate-900 font-fredoka font-black uppercase tracking-widest px-6 py-2 border-2 border-slate-900 shadow-[4px_4px_0_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0f172a] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
