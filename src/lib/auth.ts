import { cookies } from 'next/headers';
import { promises as fs } from 'fs';
import path from 'path';

const passwordFilePath = path.join(process.cwd(), 'src/data/password.txt');

// Global state for rate limiting incorrect password attempts.
// This is shared across all requests in the Node.js process.
const globalAny: any = global;
if (!globalAny.authRateLimitUntil) {
  globalAny.authRateLimitUntil = 0;
}

export async function getServerPassword() {
  try {
    const pwd = await fs.readFile(passwordFilePath, 'utf8');
    return pwd.trim();
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      const defaultPwd = 'admin'; // Default password
      await fs.mkdir(path.dirname(passwordFilePath), { recursive: true });
      await fs.writeFile(passwordFilePath, defaultPwd, 'utf8');
      return defaultPwd;
    }
    throw error;
  }
}

export async function verifyAuthCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get('app_auth_token')?.value;
  if (!token) return false;
  
  const actualPassword = await getServerPassword();
  if (token === actualPassword) {
    return true;
  }
  return false;
}
