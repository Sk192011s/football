import { User } from "./types.ts";

const css = `
  body { font-family: sans-serif; background: #121212; color: white; padding: 20px; }
  input, select { display: block; width: 100%; padding: 10px; margin: 10px 0; box-sizing: border-box; }
  button { width: 100%; padding: 10px; background: #2196f3; color: white; border: none; cursor: pointer; }
  .card { background: #1e1e1e; padding: 20px; border-radius: 10px; text-align: center; margin-top: 20px; }
  .balance { font-size: 32px; color: #ffeb3b; font-weight: bold; margin: 10px 0; }
  table { width: 100%; border-collapse: collapse; background: white; color: black; margin-top: 20px; }
  th, td { border: 1px solid #ddd; padding: 8px; }
`;

export const Layout = (content: string, title: string) => `
  <!DOCTYPE html>
  <html>
  <head>
    <title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>${css}</style>
  </head>
  <body>${content}</body>
  </html>
`;

export const LoginPage = () => Layout(`
  <h2>Login</h2>
  <form method="POST" action="/login">
    <input type="text" name="username" placeholder="Username" required>
    <input type="password" name="password" placeholder="Password" required>
    <button type="submit">Login</button>
  </form>
  <p><a href="/register" style="color: #aaa">Create Account</a></p>
`, "Login");

export const RegisterPage = () => Layout(`
  <h2>Register</h2>
  <form method="POST" action="/register">
    <input type="text" name="username" placeholder="Username" required>
    <input type="password" name="password" placeholder="Password" required>
    <button type="submit">Register</button>
  </form>
  <p><a href="/login" style="color: #aaa">Back to Login</a></p>
`, "Register");

export const DashboardPage = (user: User) => Layout(`
  <h2>Hello, ${user.username}</h2>
  <div class="card">
    <div>Your Balance</div>
    <div class="balance">${user.balance.toLocaleString()} MMK</div>
  </div>
  <br>
  <a href="/logout" style="color: red;">Logout</a>
  ${user.isAdmin ? '<br><br><a href="/admin" style="color: cyan;">Go to Admin Panel</a>' : ''}
`, "Dashboard");

export const AdminPage = (users: User[]) => {
  const rows = users.map(u => `
    <tr>
      <td>${u.username}</td>
      <td>${u.balance.toLocaleString()}</td>
      <td>
        <form action="/admin/transaction" method="POST" style="display:flex; gap:5px;">
          <input type="hidden" name="targetUser" value="${u.username}">
          <input type="number" name="amount" placeholder="Amt" style="width: 60px;">
          <select name="type" style="width: 70px;">
            <option value="deposit">Dep (+)</option>
            <option value="withdraw">Wdr (-)</option>
          </select>
          <button type="submit" style="width: auto;">OK</button>
        </form>
      </td>
    </tr>
  `).join("");

  return Layout(`
    <h2>Admin Panel</h2>
    <a href="/" style="color: #aaa">Back to Dashboard</a>
    <table>
      <thead><tr><th>User</th><th>Bal</th><th>Action</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `, "Admin");
};
