import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { assertTransition } from '@/lib/orderStateMachine'
import { recordCashCollection } from '@/lib/cashLedger'
import { ok, fail, handleError, audit } from '@/lib/api'

// GET — orders assigned to this courier
export async function GET(_req: NextRequest) {
  try {
    const s = await requireRole('COURIER')
    if (!s.courierId) return fail('Kuriérsky profil chýba.', 400)

    const orders = await db.order.findMany({
      where: { courierId: s.courierId },
      include: {
        items: true,
        branch: { select: { name: true, street: true, city: true, latitude: true, longitude: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })
    return ok({ orders })
  } catch (e) {
    return handleError(e)
  }
}

// PATCH — courier advances order status (PICKED_UP, OUT_FOR_DELIVERY, ARRIVING, DELIVERED)
// and records cash collection on DELIVERED for cash orders.
export async function PATCH(req: NextRequest) {
  try {
    const s = await requireRole('COURIER')
    if (!s.courierId) return fail('Kuriérsky profil chýba.', 400)
    const body = await req.json()
    const { orderId, toStatus, collectedCash, expectedCash, changeGiven } = body

    const order = await db.order.findUnique({ where: { id: orderId } })
    if (!order) return fail('Objednávka neexistuje.', 404)
    if (order.courierId !== s.courierId) return fail('Toto nie je vaša objednávka.', 403)

    const { from, to } = assertTransition(order.status, toStatus, s.role)

    await db.$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: { status: to } })
      await tx.orderStatusHistory.create({
        data: { orderId, fromStatus: from, toStatus: to, changedBy: s.sub },
      })
    })

    // On DELIVERED with cash → record cash collection
    if (to === 'DELIVERED' && (order.paymentMethod === 'CASH_ON_DELIVERY' || order.paymentMethod === 'CASH_ON_PICKUP')) {
      const expected = expectedCash ?? order.total
      const collected = collectedCash ?? order.total
      const change = changeGiven ?? Math.max(0, collected - expected)
      await recordCashCollection(orderId, s.courierId, expected, collected, change)
    }

    await audit({ userId: s.sub, orderId, action: 'COURIER_STATUS', detail: `${from} → ${to}` })
    return ok({ ok: true, from, to })
  } catch (e) {
    return handleError(e)
  }
}
