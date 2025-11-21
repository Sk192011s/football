import { User, Match, Bet } from "./types.ts";

const css = `
  body { background: #121212; color: #eee; font-family: sans-serif; padding: 0; margin: 0; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 20px; border-bottom: 1px solid #333; }
  .balance-box { background: #1e1e1e; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; border: 1px solid #333; }
  .balance-num { font-size: 28px; color: #4caf50; font-weight: bold; }
  
  .match-card { background: #1e1e1e; margin-bottom: 15px; border-radius: 8px; overflow: hidden; border: 1px solid #333; }
  .match-header { background: #2c2c2c; padding: 10px; font-size: 12px; color: #aaa; display: flex; justify-content: space-between; }
  .match-teams { padding: 15px; text-align: center; font-size: 18px; font-weight: bold; }
  .vs { color: #e91e63; margin: 0 10px; }
  
  .bet-options { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: #333; }
  .bet-btn { background: #1e1e1e; border: none; color: white; padding: 15px; cursor: pointer; font-size: 14px; }
  .bet-btn:hover { background: #333; }
  .bet-btn span { display: block; font-size: 12px; color: #aaa; margin-top: 4px; }

  input, select { width: 100%; padding: 12px; margin: 8px 0; background: #222; border: 1px solid #444; color: white; border-radius: 4px; box-sizing: border-box;}
  button.primary { width: 100%; padding: 12px; background: #2196f3; color: white; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; }
  .status-won { color: #4caf50; } .status-lost { color: #f44336; }
`;

const Layout = (content: string, title: string) => `
  <!DOCTYPE html>
  <html>
  <head><title>${title}</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head>
  <body><div class="container">${content}</div></body>
  </html>
`;

export const LoginPage = () => Layout(`
  <h2>Login</h2>
  <form method="POST" action="/login">
    <input name="username" placeholder="Username" required>
    <input type="password" name="password" placeholder="Password" required>
    <button class="primary">Login</button>
  </form>
  <p><a href="/register" style="color:#aaa">Create Account</a></p>
`, "Login");

export const RegisterPage = () => Layout(`
  <h2>Register</h2>
  <form method="POST" action="/register">
    <input name="username" placeholder="Username" required>
    <input type="password" name="password" placeholder="Password" required>
    <button class="primary">Sign Up</button>
  </form>
  <p><a href="/login" style="color:#aaa">Back to Login</a></p>
`, "Register");

export const Dashboard = (user: User, matches: Match[], history: Bet[]) => {
  const matchList = matches.map(m => `
    <div class="match-card">
      <div class="match-header"><span>${m.league}</span><span>${new Date(m.time).toLocaleTimeString()}</span></div>
      <div class="match-teams">${m.homeTeam} <span class="vs">vs</span> ${m.awayTeam}</div>
      <div class="bet-options">
        <form method="POST" action="/bet">
          <input type="hidden" name="matchId" value="${m.id}">
          <input type="hidden" name="selection" value="Home">
          <input type="hidden" name="odds" value="${m.homeOdds}">
          <button class="bet-btn">Home <span>${m.homeOdds} (H:${m.handicap})</span></button>
        </form>
        <form method="POST" action="/bet">
          <input type="hidden" name="matchId" value="${m.id}">
          <input type="hidden" name="selection" value="Away">
          <input type="hidden" name="odds" value="${m.awayOdds}">
          <button class="bet-btn">Away <span>${m.awayOdds}</span></button>
        </form>
        <form method="POST" action="/bet">
          <input type="hidden" name="matchId" value="${m.id}">
          <input type="hidden" name="selection" value="Over">
          <input type="hidden" name="odds" value="${m.overOdds}">
          <button class="bet-btn">Over ${m.goalTotal} <span>${m.overOdds}</span></button>
        </form>
        <form method="POST" action="/bet">
          <input type="hidden" name="matchId" value="${m.id}">
          <input type="hidden" name="selection" value="Under">
          <input type="hidden" name="odds" value="${m.underOdds}">
          <button class="bet-btn">Under ${m.goalTotal} <span>${m.underOdds}</span></button>
        </form>
      </div>
    </div>
  `).join("");

  const historyList = history.map(b => `
    <div style="border-bottom:1px solid #333; padding:10px 0; font-size:14px;">
       <div>${b.selection} @ ${b.odds} <span style="float:right; color:#aaa">${b.amount}</span></div>
       <div style="font-size:12px; color:#888; margin-top:5px;">
         Status: <span class="status-${b.status}">${b.status.toUpperCase()}</span>
         ${b.status === 'won' ? `(+${b.payout})` : ''}
       </div>
    </div>
  `).join("");

  return Layout(`
    <div class="header">
      <b>BetClub</b>
      <a href="/logout" style="color:#f44336; text-decoration:none;">Logout</a>
    </div>
    
    <div class="balance-box">
      <div style="color:#aaa; font-size:12px;">Available Balance</div>
      <div class="balance-num">${user.balance.toLocaleString()}</div>
    </div>

    ${user.isAdmin ? '<a href="/admin" style="display:block; text-align:center; background:#333; padding:10px; margin-bottom:20px; color:white; text-decoration:none; border-radius:4px;">Go to Admin Panel</a>' : ''}

    <h3>Upcoming Matches</h3>
    ${matchList.length ? matchList : '<p style="color:#666; text-align:center;">No matches available</p>'}

    <h3>My Bets</h3>
    ${historyList}
  `, "Dashboard");
};

export const AdminPanel = (users: User[], matches: Match[]) => {
    // Sort matches so 'open' ones are at top
    const sortedMatches = matches.sort((a,b) => (a.status === 'open' ? -1 : 1));
    
    const userRows = users.map(u => `
      <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #333;">
        <span>${u.username} (${u.balance})</span>
        <form action="/admin/wallet" method="POST" style="display:flex; gap:5px;">
            <input type="hidden" name="target" value="${u.username}">
            <input name="amount" type="number" placeholder="Amt" style="width:60px; margin:0; padding:5px;">
            <select name="type" style="width:60px; margin:0; padding:5px;">
                <option value="deposit">Dep</option>
                <option value="withdraw">Wdr</option>
            </select>
            <button style="width:auto; padding:5px 10px;">Go</button>
        </form>
      </div>
    `).join("");

    const matchRows = sortedMatches.map(m => `
        <div style="background:#222; padding:10px; margin-bottom:10px; border-radius:4px; border: 1px solid ${m.status === 'settled' ? '#444' : '#2196f3'};">
            <div style="color:#aaa; font-size:12px;">${m.league} | ${m.status.toUpperCase()}</div>
            <div style="font-weight:bold; margin:5px 0;">${m.homeTeam} vs ${m.awayTeam}</div>
            ${m.status === 'open' ? `
            <form action="/admin/settle" method="POST" style="margin-top:10px;">
                <input type="hidden" name="matchId" value="${m.id}">
                <div style="display:flex; gap:5px;">
                    <input name="hScore" type="number" placeholder="Home" required style="margin:0;">
                    <input name="aScore" type="number" placeholder="Away" required style="margin:0;">
                    <button style="width:auto; background:#e91e63;">Settle</button>
                </div>
            </form>
            ` : `<div style="color:#4caf50; font-size:12px;">Result: ${m.result?.home} - ${m.result?.away}</div>`}
        </div>
    `).join("");

    return Layout(`
        <h2>Admin Control</h2>
        <a href="/" style="color:#aaa;">Back to Site</a>
        
        <h3>1. Add Match</h3>
        <form action="/admin/add-match" method="POST" style="background:#222; padding:15px; border-radius:8px;">
            <input name="league" placeholder="League Name" required>
            <div style="display:flex; gap:5px;">
                <input name="home" placeholder="Home Team" required>
                <input name="away" placeholder="Away Team" required>
            </div>
            <input name="time" type="datetime-local" required>
            
            <h4 style="margin:10px 0 5px 0; color:#aaa;">Odds</h4>
            <div style="display:flex; gap:5px;">
                <input name="handicap" placeholder="Hdp (e.g 0.5)" required>
                <input name="hOdds" placeholder="Home Odds (0.96)" required>
                <input name="aOdds" placeholder="Away Odds (0.90)" required>
            </div>
            <div style="display:flex; gap:5px;">
                <input name="total" placeholder="Goal Total (2.5)" required>
                <input name="oOdds" placeholder="Over Odds" required>
                <input name="uOdds" placeholder="Under Odds" required>
            </div>
            <button class="primary" style="margin-top:10px;">Publish Match</button>
        </form>

        <h3>2. Settle Matches</h3>
        ${matchRows}

        <h3>3. Wallet Manager</h3>
        ${userRows}
    `, "Admin Panel");
};

export const BetConfirmPage = (match: Match, selection: string, odds: number) => Layout(`
    <h2>Confirm Bet</h2>
    <div style="background:#1e1e1e; padding:20px; border-radius:8px; text-align:center;">
        <div style="color:#aaa;">${match.homeTeam} vs ${match.awayTeam}</div>
        <h1 style="color:#2196f3; margin:10px 0;">${selection}</h1>
        <div style="font-size:20px;">Odds: ${odds}</div>
    </div>
    <form action="/bet/confirm" method="POST" style="margin-top:20px;">
        <input type="hidden" name="matchId" value="${match.id}">
        <input type="hidden" name="selection" value="${selection}">
        <input type="hidden" name="odds" value="${odds}">
        <label>Amount</label>
        <input name="amount" type="number" placeholder="Enter Amount" required min="100">
        <button class="primary">Place Bet</button>
    </form>
    <a href="/" style="display:block; text-align:center; margin-top:20px; color:#aaa;">Cancel</a>
`, "Confirm Bet");
