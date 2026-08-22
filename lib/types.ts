export type GlobalPlayer = {
  id: string;
  full_name: string;
  jersey_name: string;
  position: 'PG' | 'SG' | 'SF' | 'PF' | 'C';
  gender?: string | null;
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

export type Tournament = {
  id: string;
  created_at: string;
  name: string;
  format: 'ROUND_ROBIN' | 'SINGLE_ELIMINATION' | 'HYBRID';
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED';
  period_type: 'QUARTER' | 'HALF';
  period_length_mins: number;
  foul_limit: number;
  start_date?: string | null;
  duration_days?: number | null;
  venue?: string | null;
  category?: string | null;
  has_third_place?: boolean;
};

export type TournamentTeam = {
  id: string;
  tournament_id: string;
  team_id: string;
  group_name: string;
  wins: number;
  losses: number;
  points_for: number;
  points_against: number;
  point_differential: number;
};

export type TournamentPlayerLeaderboard = {
  player_id: string;
  full_name: string;
  jersey_name: string;
  position: 'PG' | 'SG' | 'SF' | 'PF' | 'C';
  team_id: string;
  tournament_id: string;
  games_played: number;
  total_points: number;
  three_pointers_made: number;
  total_fouls: number;
};
