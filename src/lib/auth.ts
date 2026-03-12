/**
 * Auth helpers — HMAC-based token and scrypt password hashing.
 * Server-side only.
 */

import crypto from 'crypto';

const TOKEN_SECRET = process.env.NULLLINE_SECRET ?? 'change-this-in-production';

/** Hash password with scrypt. Returns "hash:salt" hex string. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${hash}:${salt}`;
}

/** Verify a stored "hash:salt" against a candidate password. */
export async function verifyPassword(candidate: string, stored: string): Promise<boolean> {
  const [hash, salt] = stored.split(':');
  if (!hash || !salt) return false;
  const candidateHash = crypto.scryptSync(candidate, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidateHash, 'hex'));
}

/** Issue a signed token: base64url(payload) + '.' + hmac */
export function issueToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ userId, iat: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

/** Verify and decode a token. Returns userId or null. */
export function verifyToken(token: string): string | null {
  if (!token || typeof token !== 'string') return null;
  const dot = token.lastIndexOf('.');
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const { userId } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    return typeof userId === 'string' ? userId : null;
  } catch {
    return null;
  }
}
