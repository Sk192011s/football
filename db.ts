import { User } from "./types.ts";

export const kv = await Deno.openKv();

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

  const result = await kv.atomic()
    .check(userRes)
    .set(["users", username], { ...userRes.value, balance: newBalance })
    .commit();

  return result.ok;
}

export async function getAllUsers(): Promise<User[]> {
  const iter = kv.list<User>({ prefix: ["users"] });
  const users: User[] = [];
  for await (const res of iter) users.push(res.value);
  return users;
}
