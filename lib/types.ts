export type GlobalPlayer = {
  id: string;
  full_name: string;
  jersey_name: string;
  position: 'PG' | 'SG' | 'SF' | 'PF' | 'C';
  created_at?: string;
};

export type GameRoster = {
  id: string;
  game_id: string;
  player_id: string;
  team: 'A' | 'B';
  jersey_number: number;
  is_starting_five: boolean;
};

export type PlayerStatsSummary = {
  player_id: string;
  full_name: string;
  jersey_name: string;
  position: 'PG' | 'SG' | 'SF' | 'PF' | 'C';
  games_played: number;
  total_points: number;
  three_pointers_made: number;
  total_fouls: number;
};
