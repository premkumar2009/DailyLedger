import { cookies } from 'next/headers';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { db } from './db';

const COOKIE = 'ledger_session';
const secret = () => process.env.SESSION_SECRET || 'development-only-change-me';

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, expected] = stored.split(':');
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'));
}

function sign(userId: string) {
  return `${userId}.${createHmac('sha256', secret()).update(userId).digest('hex')}`;
}

function verify(value?: string) {
  if (!value) return null;
  const [userId, signature] = value.split('.');
  if (!userId || !signature) return null;
  const expected = createHmac('sha256', secret()).update(userId).digest('hex');
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  return userId;
}

export async function createSession(userId: string) {
  const store = await cookies();
  store.set(COOKIE, sign(userId), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 30, path: '/' });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getCurrentUser() {
  const userId = verify((await cookies()).get(COOKIE)?.value);
  return userId ? db.user.findUnique({ where: { id: userId }, select: { id: true, email: true } }) : null;
}
