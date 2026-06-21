import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { scoreCouriersForOrder } from '@/lib/courierScoring'
import { ok, fail, handleError } from '@/lib/api'

// GET /api/dispatch/score?orderId=...
export async function GET(req: NextRequest) {
  try {
    await requireRole('ADMIN', 'STORE_MANAGER', 'DISPATCHER')
    const { searchParams } = new URL(req.url)
    const orderId = searchParams.get('orderId')
    if (!orderId) return fail('Chýba orderId.', 400)
    const ranked = await scoreCouriersForOrder(orderId)
    return ok({ ranked })
  } catch (e) {
    return handleError(e)
  }
}
