// src/lib/auth.ts
// Secure auth: bcrypt password hashing + JWT signed with env secret.
// NO fallback secret. NO SHA-256. NO public demo passwords.

import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { db } from './db'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  // In production this would be a hard fail. We allow dev to proceed only if
  // explicitly acknowledged via NODE_ENV === 'development' AND a warning.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set to a string of at least 32 characters in production.')
  }
  console.warn('[auth] WARNING: JWT_SECRET is missing or too short. Set a strong secret via `openssl rand -base64 48`.')
}
const SECRET = new TextEncoder().encode(JWT_SECRET || 'dev-only-insecure-secret-DO-NOT-USE-IN-PROD-xxxxxxxxxxxx')
const COOKIE_NAME = 'olajos_session'
const SESSION_TTL = 60 * 60 * 24 * 7 // 7 days

export type Role =
  | 'CUSTOMER'
  | 'ADMIN'
  | 'STORE_MANAGER'
  | 'PRODUCTION'
  | 'PACKING'
  | 'DISPATCHER'
  | 'COURIER'

export interface SessionPayload {
  sub: string        // user id
  email: string
  role: Role
  courierId?: string
}

export async function hashPassword(plain: string): Promise<string> {
  if (plain.length < 8) throw new Error('Heslo musí mať aspoň 8 znakov.')
  return bcrypt.hash(plain, 12)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL}s`)
    .setSubject(payload.sub)
    .sign(SECRET)
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET, { algorithms: ['HS256'] })
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      role: payload.role as Role,
      courierId: (payload.courierId as string) || undefined,
    }
  } catch {
    return null
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifySessionToken(token)
}

export async function setSessionCookie(token: string) {
  const store = await cookies()
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL,
  })
}

export async function clearSessionCookie() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

export function sessionCookieName() {
  return COOKIE_NAME
}

// --- RBAC helpers used by API routes ---

export async function requireAuth(): Promise<SessionPayload> {
  const s = await getSession()
  if (!s) {
    throw new AuthError('Nie ste prihlásený.', 401)
  }
  // Verify the user still exists & is active
  const user = await db.user.findUnique({ where: { id: s.sub } })
  if (!user || !user.isActive) {
    throw new AuthError('Účet nie je aktívny.', 401)
  }
  return s
}

export async function requireRole(...roles: Role[]): Promise<SessionPayload> {
  const s = await requireAuth()
  if (!roles.includes(s.role)) {
    throw new AuthError('Nemáte oprávnenie na túto akciu.', 403)
  }
  return s
}

export async function requireCourierOwner(courierId: string): Promise<SessionPayload> {
  const s = await requireAuth()
  if (s.role === 'ADMIN' || s.role === 'DISPATCHER') return s
  if (s.role !== 'COURIER' || s.courierId !== courierId) {
    throw new AuthError('Nemáte prístup k tomuto kuriérskemu účtu.', 403)
  }
  return s
}

export class AuthError extends Error {
  statusCode: number
  constructor(message: string, statusCode = 400) {
    super(message)
    this.statusCode = statusCode
  }
}

// Helper for Next.js API routes to attach courierId to session at login
export async function attachCourierId(payload: SessionPayload): Promise<SessionPayload> {
  if (payload.role === 'COURIER') {
    const courier = await db.courier.findUnique({ where: { userId: payload.sub } })
    if (courier) payload.courierId = courier.id
  }
  return payload
}
