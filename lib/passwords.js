// Password hashing with scrypt. We never store a real password -
// only a salt plus a hash made from it, and we verify the same way.

const crypto = require("crypto");

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, hash) => {
      if (err) return reject(err);
      resolve(salt + ":" + hash.toString("hex"));
    });
  });
}

function verifyPassword(password, stored) {
  return new Promise((resolve) => {
    if (!stored || stored.indexOf(":") === -1) return resolve(false);
    const parts = stored.split(":");
    const salt = parts[0];
    const hash = parts[1];
    crypto.scrypt(password, salt, 64, (err, test) => {
      if (err) return resolve(false);
      const a = Buffer.from(hash, "hex");
      if (a.length !== test.length) return resolve(false);
      resolve(crypto.timingSafeEqual(a, test));
    });
  });
}

module.exports = { hashPassword, verifyPassword };
