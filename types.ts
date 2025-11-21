export interface User {
  username: string;
  password: string;
  balance: number;
  isAdmin: boolean;
}

export interface Match {
  id: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  time: string;
  // Simple Handicap / Odds
  handicap: string; // e.g. "0.5" or "1+50"
  homeOdds: number; // e.g. 0.95
  awayOdds: number; // e.g. 0.90
  
  // Goal Total
  goalTotal: number; // e.g. 2.5
  overOdds: number;
  underOdds: number;
  
  status: "open" | "settled";
  result?: { home: number; away: number };
}

export interface Bet {
  id: string;
  username: string;
  matchId: string;
  selection: "Home" | "Away" | "Over" | "Under";
  amount: number;
  odds: number;
  status: "pending" | "won" | "lost";
  payout: number;
}
