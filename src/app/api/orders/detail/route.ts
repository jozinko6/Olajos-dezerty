import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, AuthError } from '@/lib/auth'
import { assertTransition, STATUS_LABELS } from '@/lib/orderStateMachine'
import { returnStockOnCancel, commitStock } from '@/lib/inventory'
import { awardLoyaltyPoints, revertRedeemedLoyaltyOnCancel } from '@/lib/loyalty'
import { ok, fail, handleError, audit } from '@/lib/api'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return fail('Chýba id.', 400)
    const session = await requireAuth()

    const order = await db.order.findUnique({
      where: { id },
      include: {
        items: true,
        branch: true,
        courier: { include: { user: { select: { fullName: true } } } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        payments: { include: { events: true, refunds: true } },
      },
    })
    if (!order) return fail('Objednávka neexistuje.', 404)

    // RBAC: customer sees only own orders; courier sees assigned; staff see all in workflow
    if (session.role === 'CUSTOMER' && order.customerId !== session.sub) {
      return fail('Nemáte prístup k tejto objednávke.', 403)
    }
    if (session.role === 'COURIER' && order.courierId !== session.courierId) {
      return fail('Nemáte prístup k tejto objednávke.', 403)
    }

    return ok({ order, statusLabels: STATUS_LABELS })
  } catch (e) {
    return handleError(e)
  }
}

// PATCH /api/orders/detail?id=... — transition order status (RBAC enforced)
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return fail('Chýba id.', 400)
    const session = await requireAuth()

    const body = await req.json()
    const { toStatus, note } = body

    const order = await db.order.findUnique({ where: { id }, include: { items: true } })
    if (!order) return fail('Objednávka neexistuje.', 404)

    // RBAC: customer can only cancel their own
    if (session.role === 'CUSTOMER') {
      if (order.customerId !== session.sub) return fail('Nemáte prístup.', 403)
      if (toStatus !== 'CANCELLED') return fail('Zákazník môže iba zrušiť objednávku.', 403)
    }
    if (session.role === 'COURIER' && order.courierId !== session.courierId) {
      return fail('Nemáte prístup k tejto objednávke.', 403)
    }

    const { from, to } = assertTransition(order.status, toStatus, session.role)

    await db.$transaction(async (tx) => {
      await tx.order.update({ where: { id }, data: { status: to } })
      await tx.orderStatusHistory.create({
        data: { orderId: id, fromStatus: from, toStatus: to, note: note ?? null, changedBy: session.sub },
      })
    })

    // Side effects of specific transitions
    if (to === 'CANCELLED') {
      // idempotent stock return + loyalty revert
      await returnStockOnCancel(id)
      await revertRedeemedLoyaltyOnCancel(id)
    }
    if (to === 'COMPLETED') {
      // award loyalty points (idempotent)
      if (order.customerId) {
        await awardLoyaltyPoints(id, order.customerId, Math.floor(order.subtotal * 0.05))
      }
    }

    await audit({ userId: session.sub, orderId: id, action: 'STATUS_CHANGE', detail: `${from} → ${to}` })
    return ok({ ok: true, from, to })
  } catch (e) {
    return handleError(e)
  }
}
