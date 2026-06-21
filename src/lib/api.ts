// src/lib/api.ts
// Helpers for Next.js App Router route handlers: error handling, JSON responses,
// rate limiting (in-memory), audit logging.

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { AuthError } from './auth'
import { PricingError } from './pricing'
import { StateMachineError } from './orderStateMachine'
import { InventoryError } from './inventory'
import { db } from './db'

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status })
}

export function handleError(e: unknown) {
  if (e instanceof ZodError) {
    return fail('Neplatné údaje.', 422, e.issues.map(i => ({ path: i.path.join('.'), message: i.message })))
  }
  if (e instanceof AuthError) return fail(e.message, e.statusCode)
  if (e instanceof PricingError) return fail(e.message, 422)
  if (e instanceof StateMachineError) return fail(e.message, e.statusCode)
  if (e instanceof InventoryError) return fail(e.message, e.statusCode)
  if (e instanceof Error) {
    console.error('[api error]', e)
    return fail(e.message || 'Neočakávaná chyba.', 500)
  }
  console.error('[api unknown]', e)
  return fail('Neočakávaná chyba servera.', 500)
}

// In-memory rate limiter (per IP). Suitable for single-instance dev.
const buckets = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(key: string, max: number, windowMs: number): { ok: boolean; retryAfterMs: number } {
  const now = Date.now()
  const entry = buckets.get(key)
  if (!entry || entry.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfterMs: 0 }
  }
  if (entry.count >= max) {
    return { ok: false, retryAfterMs: entry.resetAt - now }
  }
  entry.count += 1
  return { ok: true, retryAfterMs: 0 }
}

export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return 'unknown'
}

export async function audit(opts: { userId?: string; orderId?: string; action: string; detail?: string; ipAddress?: string }) {
  try {
    await db.auditLog.create({
      data: {
        userId: opts.userId,
        orderId: opts.orderId,
        action: opts.action,
        detail: opts.detail ?? '',
        ipAddress: opts.ipAddress,
      },
    })
  } catch (e) {
    console.error('[audit] failed', e)
  }
}
