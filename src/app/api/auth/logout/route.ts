import { NextRequest } from 'next/server'
import { clearSessionCookie } from '@/lib/auth'
import { ok } from '@/lib/api'

export async function POST(_req: NextRequest) {
  await clearSessionCookie()
  return ok({ ok: true })
}
