import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { ok, fail, handleError } from '@/lib/api'
import { getCourierCashBalance, recordCashHandover, createSettlement } from '@/lib/cashLedger'

// GET — courier's cash ledger & balance (cash orders only)
export async function GET(req: NextRequest) {
  try {
    const s = await requireRole('COURIER')
    if (!s.courierId) return fail('Kuriérsky profil chýba.', 400)

    const entries = await db.cashLedger.findMany({
      where: { courierId: s.courierId },
      include: { order: { select: { orderNumber: true, paymentMethod: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    const balance = await getCourierCashBalance(s.courierId)
    const settlements = await db.cashSettlement.findMany({
      where: { courierId: s.courierId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })
    return ok({ entries, balance, settlements })
  } catch (e) {
    return handleError(e)
  }
}

// POST — record a cash handover to operator or create a settlement
export async function POST(req: NextRequest) {
  try {
    const s = await requireRole('COURIER', 'ADMIN', 'STORE_MANAGER', 'DISPATCHER')
    const body = await req.json()
    const { action, amount, note } = body

    let courierId = s.courierId
    if (!courierId && (s.role === 'ADMIN' || s.role === 'DISPATCHER')) {
      courierId = body.courierId
    }
    if (!courierId) return fail('Chýba courierId.', 400)

    if (action === 'HANDOVER') {
      if (!amount || amount <= 0) return fail('Neplatná suma.', 400)
      await recordCashHandover(courierId, amount, note ?? 'odovzdanie hotovosti')
      return ok({ ok: true })
    }
    if (action === 'SETTLEMENT') {
      const settlement = await createSettlement(courierId, note ?? 'uzávierka')
      return ok({ settlement })
    }
    return fail('Neznáma akcia.', 400)
  } catch (e) {
    return handleError(e)
  }
}
