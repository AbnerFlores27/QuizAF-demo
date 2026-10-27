// Account reset: deletes EVERY account and EVERY login session.
// This is a console-only tool (NOT a website route!) so the only person
// who can ever run it is someone typing commands in the Replit shell.
// Use it when the accounts are a mess (like forgotten passwords) and you
// want a clean slate. Next step after this: npm run fresh-start (brings
// the admin accounts back from the Replit Secrets + reloads the questions).
const { pool } = require("./index");
const { ensureSchema } = require("./setup");

async function resetAccounts() {
  await ensureSchema();

  // 1) Log everyone out (all sessions die).
  const sessions = await pool.query('DELETE FROM "session"');

  // 2) Wipe every account.
  const users = await pool.query("DELETE FROM users");

  // 3) Old audit rows belong to accounts that no longer exist - clear too.
  const logs = await pool.query("DELETE FROM admin_access_log");

  const { rows } = await pool.query("SELECT COUNT(*)::int AS users FROM users");
  console.log("Accounts wiped:");
  console.log("  - sessions deleted: " + sessions.rowCount);
  console.log("  - accounts deleted: " + users.rowCount);
  console.log("  - old access-log rows deleted: " + logs.rowCount);
  console.log("  - users left: " + rows[0].users);
  console.log("");
  console.log('NEXT: run "npm run fresh-start" - the one-command setup.');
  console.log("(It re-seeds the admin accounts from the ADMIN_PASSWORD secret and");
  console.log(" reloads the 50 quiz questions. Or run 'npm run seed' alone for admins only.)");
  console.log("Quiz questions are NOT touched by this reset.");

  await pool.end();
}

resetAccounts().catch(async (error) => {
  console.error("Reset failed:", error.message);
  await pool.end().catch(() => {});
  process.exit(1);
});
