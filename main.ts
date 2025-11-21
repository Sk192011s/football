import { Hono } from "https://deno.land/x/hono@v3.11.7/mod.ts";
import { getCookie, setCookie } from "https://deno.land/x/hono@v3.11.7/helper.ts";
import { 
  getUser, createUser, updateUserBalance, getAllUsers,
  addMatch, getActiveMatches, getMatch, placeBet, getUserBets, settleMatch, kv 
} from "./db.ts";
import { LoginPage, RegisterPage, Dashboard, AdminPanel, BetConfirmPage } from "./ui.ts";
import { Match } from "./types.ts";

const app = new Hono();

// --- Middleware ---
app.use("*", async (c, next) => {
  const path = c.req.path;
  if (path === "/login" || path === "/register" || path.startsWith("/assets")) return await next();
  
  const username = getCookie(c, "session");
  if (!username) return c.redirect("/login");
  
  const user = await getUser(username);
  if (!user) return c.redirect("/login");
  
  c.set("user", user);
  await next();
});

// --- Auth Routes ---
app.get("/login", (c) => c.html(LoginPage()));
app.get("/register", (c) => c.html(RegisterPage()));

app.post("/login", async (c) => {
  const body = await c.req.parseBody();
  const user = await getUser(body.username as string);
  if (user && user.password === body.password) {
    setCookie(c, "session", user.username);
    return c.redirect("/");
  }
  return c.text("Invalid Login", 401);
});

app.post("/register", async (c) => {
  const body = await c.req.parseBody();
  const success = await createUser({
    username: body.username as string,
    password: body.password as string,
    balance: 0,
    isAdmin: (body.username as string) === "admin"
  });
  if (success) return c.redirect("/login");
  return c.text("Username taken");
});

app.get("/logout", (c) => {
  setCookie(c, "session", "", { maxAge: 0 });
  return c.redirect("/login");
});

// --- User Routes ---
app.get("/", async (c) => {
  const user = c.get("user");
  const matches = await getActiveMatches();
  const history = await getUserBets(user.username);
  return c.html(Dashboard(user, matches, history));
});

app.post("/bet", async (c) => {
  const body = await c.req.parseBody();
  const match = await getMatch(body.matchId as string);
  if (!match) return c.redirect("/");
  return c.html(BetConfirmPage(match, body.selection as string, parseFloat(body.odds as string)));
});

app.post("/bet/confirm", async (c) => {
  const user = c.get("user");
  const body = await c.req.parseBody();
  const amount = parseFloat(body.amount as string);
  
  if (isNaN(amount) || amount <= 0) return c.text("Invalid Amount");

  const result = await placeBet(
    user.username, 
    body.matchId as string, 
    body.selection as string, 
    amount, 
    parseFloat(body.odds as string)
  );

  if (result.success) return c.redirect("/");
  return c.text(`Error: ${result.msg}`);
});

// --- Admin Routes ---
const admin = new Hono();

admin.use("*", (c, next) => {
  const user = c.get("user");
  if (!user.isAdmin) return c.text("Unauthorized", 403);
  return next();
});

admin.get("/", async (c) => {
  const users = await getAllUsers();
  // Need to fetch all matches (even settled ones) for admin view
  // Ideally db should have getAllMatches, but using list prefix here
  const iter = kv.list<Match>({ prefix: ["matches"] });
  const allMatches = [];
  for await (const res of iter) allMatches.push(res.value);
  
  return c.html(AdminPanel(users, allMatches));
});

admin.post("/add-match", async (c) => {
  const body = await c.req.parseBody();
  const id = crypto.randomUUID();
  
  const match: Match = {
    id,
    league: body.league as string,
    homeTeam: body.home as string,
    awayTeam: body.away as string,
    time: body.time as string,
    handicap: body.handicap as string,
    homeOdds: parseFloat(body.hOdds as string),
    awayOdds: parseFloat(body.aOdds as string),
    goalTotal: parseFloat(body.total as string),
    overOdds: parseFloat(body.oOdds as string),
    underOdds: parseFloat(body.uOdds as string),
    status: "open"
  };
  
  await addMatch(match);
  return c.redirect("/admin");
});

admin.post("/wallet", async (c) => {
  const body = await c.req.parseBody();
  await updateUserBalance(
    body.target as string, 
    parseFloat(body.amount as string), 
    body.type as "deposit" | "withdraw"
  );
  return c.redirect("/admin");
});

admin.post("/settle", async (c) => {
  const body = await c.req.parseBody();
  await settleMatch(
    body.matchId as string, 
    parseInt(body.hScore as string), 
    parseInt(body.aScore as string)
  );
  return c.redirect("/admin");
});

app.route("/admin", admin);

Deno.serve(app.fetch);
