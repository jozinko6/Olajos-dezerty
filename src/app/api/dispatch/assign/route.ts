import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { assignCourierSchema } from '@/lib/validation'
import { scoreCouriersForOrder } from '@/lib/courierScoring'
import { ok, fail, handleError, audit } from '@/lib/api'

// POST /api/dispatch/assign — manual or auto courier assignment.
// Auto: when courierId = "auto", picks top-scored courier.
export async function POST(req: NextRequest) {
  try {
    const s = await requireRole('ADMIN', 'STORE_MANAGER', 'DISPATCHER')
    const body = await req.json()
    let { orderId, courierId, override } = assignCourierSchema.parse(body)

    const order = await db.order.findUnique({ where: { id: orderId } })
    if (!order) return fail('Objednávka neexistuje.', 404)
    if (order.deliveryType !== 'DELIVERY') return fail('Táto objednávka je osobný odber.', 400)
    if (order.courierId && !override) return fail('Objednávka už má priradeného kuriéra.', 409)

    // Auto-assign: pick top-scored courier
    let score: number | undefined
    let reasons: string[] = []
    if (courierId === 'auto') {
      const ranked = await scoreCouriersForOrder(orderId)
      if (ranked.length === 0) return fail('Žiadny dostupný kuriér.', 409)
      courierId = ranked[0].courierId
      score = ranked[0].score
      reasons = ranked[0].reasons
    } else {
      // For manual assignment, still compute the score for explanation
      const ranked = await scoreCouriersForOrder(orderId)
      const match = ranked.find(r => r.courierId === courierId)
      if (match) { score = match.score; reasons = match.reasons }
    }

    // Validate courier is online & has capacity
    const courier = await db.courier.findUnique({
      where: { id: courierId },
      include: { user: { select: { isActive: true, fullName: true } }, assignments: { where: { status: 'ACCEPTED' } } },
    })
    if (!courier || !courier.user.isActive) return fail('Kuriér nie je aktívny.', 409)
    if (!courier.isOnline) return fail('Kuriér nie je online.', 409)
    if (courier.assignments.length >= courier.maxCapacity) return fail('Kuriér má naplnenú kapacitu.', 409)

    // Remove any previous active assignment for this order (idempotent)
    await db.courierAssignment.updateMany({
      where: { orderId, status: { in: ['OFFERED', 'ACCEPTED'] } },
      data: { status: 'EXPIRED' },
    })

    const assignment = await db.courierAssignment.create({
      data: {
        orderId,
        courierId,
        status: 'OFFERED',
        expiresAt: new Date(Date.now() + 60_000), // 60s offer timeout
        score,
        scoreReasons: JSON.stringify(reasons),
        assignedBy: s.sub,
      },
    })

    await db.order.update({ where: { id: orderId }, data: { courierId, status: 'COURIER_ASSIGNED' } })
    await db.orderStatusHistory.create({
      data: { orderId, fromStatus: 'COURIER_ASSIGNMENT', toStatus: 'COURIER_ASSIGNED', changedBy: s.sub, note: `assigned to ${courier.user.fullName}` },
    })

    await audit({ userId: s.sub, orderId, action: 'COURIER_ASSIGNED', detail: `courier ${courierId} score ${score ?? 'n/a'}` })
    return ok({ assignment, score, reasons })
  } catch (e) {
    return handleError(e)
  }
}
