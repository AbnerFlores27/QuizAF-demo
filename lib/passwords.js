// Password hashing with Node's built-in scrypt - no third-party libraries.
// The same functions are used for registration and for the admin seed script.
const crypto = require("node:crypto");

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LENGTH).toString("hex");
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return "scrypt:" + salt + ":" + hash;
}

function verifyPassword(password, stored) {
  try {
    const parts = stored.split(":");
    if (parts.length !== 3 || parts[0] !== "scrypt") return false;
    const candidate = crypto.scryptSync(password, parts[1], KEY_LENGTH);
    const expected = Buffer.from(parts[2], "hex");
    return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

module.exports = { hashPassword, verifyPassword };
