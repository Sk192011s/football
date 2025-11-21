import { Hono } from "https://deno.land/x/hono@v3.11.7/mod.ts";
import { getCookie, setCookie } from "https://deno.land/x/hono@v3.11.7/helper.ts";
import { getUser, createUser } from "./db.ts";
import { LoginPage, RegisterPage, DashboardPage } from "./ui.ts";
import adminApp from "./admin.ts";

const app = new Hono();

// Mount Admin Routes
app.route("/admin", adminApp);

// Middleware: Auth Check
async function authMiddleware(c: any, next: any) {
  const username = getCookie(c, "user_session");
  if (c.req.path === "/login" || c.req.path === "/register") {
    return await next();
  }
  if (!username) return c.redirect("/login");
  
  const user = await getUser(username);
  if (!user) return c.redirect("/login");
  
  c.set("user", user);
  return await next();
}

app.use("*", authMiddleware);

// --- Routes ---

app.get("/", (c) => {
  const user = c.get("user");
  return c.html(DashboardPage(user));
});

app.get("/login", (c) => c.html(LoginPage()));

app.post("/login", async (c) => {
  const body = await c.req.parseBody();
  const user = await getUser(body.username as string);
  
  if (user && user.password === body.password as string) {
    setCookie(c, "user_session", user.username);
    return c.redirect("/");
  }
  return c.text("Invalid Credentials", 401);
});

app.get("/register", (c) => c.html(RegisterPage()));

app.post("/register", async (c) => {
  const body = await c.req.parseBody();
  const username = body.username as string;
  
  const success = await createUser({
    username: username,
    password: body.password as string,
    balance: 0,
    isAdmin: username === "admin"
  });

  if (success) {
    setCookie(c, "user_session", username);
    return c.redirect("/");
  }
  return c.text("Username already exists", 400);
});

app.get("/logout", (c) => {
  setCookie(c, "user_session", "", { maxAge: 0 });
  return c.redirect("/login");
});

Deno.serve(app.fetch);
