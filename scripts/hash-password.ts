/**
 * Prints an APP_PASSWORD_HASH value for your .env file.
 * Usage: npm run hash-password -- "your password"
 */
import { hashPassword } from "../src/lib/auth/password";

const password = process.argv[2];
if (!password) {
  console.error('Usage: npm run hash-password -- "your password"');
  process.exit(1);
}
if (password.length < 8) {
  console.error("Use at least 8 characters.");
  process.exit(1);
}
console.log(`APP_PASSWORD_HASH='${hashPassword(password)}'`);
