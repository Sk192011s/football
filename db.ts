import { User, Match, Bet } from "./types.ts";

export const kv = await Deno.openKv();

// --- User & Wallet ---

export async function getUser(username: string): Promise<User | null> {
  const res = await kv.get<User>(["users", username]);
  return res.value;
}

export async function createUser(user: User): Promise<boolean> {
  const existing = await getUser(user.username);
  if (existing) return false;
  await kv.set(["users", user.username], user);
  return true;
}

export async function updateUserBalance(username: string, amount: number, type: "deposit" | "withdraw"): Promise<boolean> {
  const userRes = await kv.get<User>(["users", username]);
  if (!userRes.value) return false;

  let newBalance = userRes.value.balance;
  if (type === "deposit") newBalance += amount;
  if (type === "withdraw") newBalance -= amount;
  if (newBalance < 0) return false;

  const res = await kv.atomic()
    .check(userRes)
    .set(["users", username], { ...userRes.value, balance: newBalance })
    .commit();
  return res.ok;
}

export async function getAllUsers(): Promise<User[]> {
  const iter = kv.list<User>({ prefix: ["users"] });
  const users: User[] = [];
  for await (const res of iter) users.push(res.value);
  return users;
}

// --- Matches ---

export async function addMatch(match: Match) {
  await kv.set(["matches", match.id], match);
}

export async function getActiveMatches(): Promise<Match[]> {
  const iter = kv.list<Match>({ prefix: ["matches"] });
  const matches: Match[] = [];
  for await (const res of iter) {
    if (res.value.status === "open") matches.push(res.value);
  }
  return matches.sort((a, b) => a.time.localeCompare(b.time)); // Sort by time
}

export async function getMatch(id: string): Promise<Match | null> {
  const res = await kv.get<Match>(["matches", id]);
  return res.value;
}

// --- Betting ---

export async function placeBet(username: string, matchId: string, selection: string, amount: number, odds: number): Promise<{ success: boolean; msg: string }> {
  const userKey = ["users", username];
  const userRes = await kv.get<User>(userKey);
  
  if (!userRes.value) return { success: false, msg: "User not found" };
  if (userRes.value.balance < amount) return { success: false, msg: "Insufficient Balance" };

  const betId = crypto.randomUUID();
  const newBet: Bet = {
    id: betId,
    username,
    matchId,
    selection: selection as any,
    amount,
    odds,
    status: "pending",
    payout: 0
  };

  // Atomic: Deduct Money + Save Bet
  const tx = await kv.atomic()
    .check(userRes)
    .set(userKey, { ...userRes.value, balance: userRes.value.balance - amount })
    .set(["bets", matchId, betId], newBet)
    .set(["user_bets", username, betId], newBet) // Index for user history
    .commit();

  return tx.ok ? { success: true, msg: "Bet Placed" } : { success: false, msg: "Transaction Failed" };
}

export async function getUserBets(username: string): Promise<Bet[]> {
  const iter = kv.list<Bet>({ prefix: ["user_bets", username] });
  const bets: Bet[] = [];
  for await (const res of iter) bets.push(res.value);
  return bets.reverse(); // Newest first
}

// --- Settlement (The Logic) ---

export async function settleMatch(matchId: string, homeScore: number, awayScore: number) {
  const matchRes = await kv.get<Match>(["matches", matchId]);
  if (!matchRes.value) return;

  const match = matchRes.value;
  
  // Update Match Status
  match.status = "settled";
  match.result = { home: homeScore, away: awayScore };
  await kv.set(["matches", matchId], match);

  // Process Bets
  const iter = kv.list<Bet>({ prefix: ["bets", matchId] });
  const totalGoals = homeScore + awayScore;

  for await (const entry of iter) {
    const bet = entry.value;
    if (bet.status !== "pending") continue;

    let won = false;

    // --- SIMPLE WIN LOGIC (Standard) ---
    // Note: For complex Asian Handicap (0.25, 0.75), more math is needed here.
    // This currently supports standard Win/Loss based on the selection.
    
    if (bet.selection === "Home" && homeScore > awayScore) won = true;
    else if (bet.selection === "Away" && awayScore > homeScore) won = true;
    else if (bet.selection === "Over" && totalGoals > match.goalTotal) won = true;
    else if (bet.selection === "Under" && totalGoals < match.goalTotal) won = true;

    if (won) {
      const profit = bet.amount * bet.odds;
      const totalReturn = bet.amount + profit;
      
      // Update Bet Status
      bet.status = "won";
      bet.payout = totalReturn;

      // Refund Money to User (Atomic)
      const userKey = ["users", bet.username];
      const userRes = await kv.get<User>(userKey);
      if (userRes.value) {
        await kv.atomic()
          .set(entry.key, bet)
          .set(["user_bets", bet.username, bet.id], bet)
          .set(userKey, { ...userRes.value, balance: userRes.value.balance + totalReturn })
          .commit();
      }
    } else {
      // Update Bet Status only
      bet.status = "lost";
      bet.payout = 0;
      await kv.atomic()
        .set(entry.key, bet)
        .set(["user_bets", bet.username, bet.id], bet)
        .commit();
    }
  }
}
