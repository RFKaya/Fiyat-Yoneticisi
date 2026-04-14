import { cookies } from 'next/headers';
import crypto from 'crypto';

const SALT = "fiyat-yoneticisi-super-secret-salt-x95";

// Global state for rate limiting incorrect password attempts.
// This is shared across all requests in the Node.js process.
const globalAny: any = global;
if (!globalAny.authRateLimitUntil) {
  globalAny.authRateLimitUntil = 0;
}

export async function getServerPassword() {
  const pwd = process.env.ADMIN_PASSWORD;
  if (!pwd) {
    return 'admin'; // Fallback if no .env config
  }
  return pwd.trim();
}

export async function getPasswordHash() {
  const pwd = await getServerPassword();
  // Create a SHA-256 hash using the password and a static salt
  return crypto.createHash('sha256').update(pwd + SALT).digest('hex');
}

export async function verifyAuthCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get('app_auth_token')?.value;
  if (!token) return false;
  
  // Verify against the hash instead of the plaintext password
  const expectedHash = await getPasswordHash();
  if (token === expectedHash) {
    return true;
  }
  return false;
}
