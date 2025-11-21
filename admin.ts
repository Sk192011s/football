import { Hono } from "https://deno.land/x/hono@v3.11.7/mod.ts";
import { getAllUsers, updateUserBalance } from "./db.ts";
import { AdminPage } from "./ui.ts";

const adminApp = new Hono();

adminApp.get("/", async (c) => {
  const users = await getAllUsers();
  return c.html(AdminPage(users));
});

adminApp.post("/transaction", async (c) => {
  const body = await c.req.parseBody();
  const targetUser = body.targetUser as string;
  const amount = parseFloat(body.amount as string);
  const type = body.type as "deposit" | "withdraw";

  if (!targetUser || isNaN(amount)) return c.text("Invalid Data", 400);

  const success = await updateUserBalance(targetUser, amount, type);
  
  if (success) {
    return c.redirect("/admin");
  } else {
    return c.text("Transaction Failed (Insufficient balance or User not found)", 400);
  }
});

export default adminApp;
