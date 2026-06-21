// src/lib/token.ts
// Cryptographically secure tracking tokens & order numbers.

import { randomBytes, randomInt } from 'crypto'

export function generateTrackingToken(): string {
  // 16 bytes = 32 hex chars, URL-safe, unguessable
  return randomBytes(16).toString('hex')
}

export function generateOrderNumber(): string {
  const y = new Date().getFullYear()
  const m = String(new Date().getMonth() + 1).padStart(2, '0')
  const rand = randomInt(1000, 9999)
  return `OD-${y}${m}-${rand}`
}

export function generateIdempotencyKey(): string {
  return randomBytes(12).toString('hex')
}
