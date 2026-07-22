// lib/gameState.ts
// Shared types and sessionStorage helpers for passing match config to the game screen

export type Player = { id: string; name: string; number: string };

export type TeamConfig = {
  name: string;
  colorId: string;
  colorHex: string;
  players: Player[];
};

export type MatchConfig = {
  teamA: TeamConfig;
  teamB: TeamConfig;
  gameTimeMinutes: number; // minutes per period
  periods: string;         // "4 quarters" | "2 halves"
  totalPeriods: number;    // 4 or 2
};

export type StatType = '2PT' | '3PT' | 'FT' | 'FOUL';

export type GameEvent = {
  id: string;
  period: number;
  clockSnapshot: string; // e.g. "08:45"
  team: 'A' | 'B';
  player: Player;
  type: StatType | 'SUB';
  // For SUB events
  playerOut?: Player;
  // For scoring: points awarded
  points?: number;
};

const STORAGE_KEY = 'wirestats_match_config';

export function saveMatchConfig(config: MatchConfig): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function loadMatchConfig(): MatchConfig | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MatchConfig;
  } catch {
    return null;
  }
}

export function clearMatchConfig(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
