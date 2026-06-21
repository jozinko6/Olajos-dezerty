import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { refundSchema } from '@/lib/validation'
import { getPaymentProvider } from '@/lib/payments'
import { revertEarnedLoyaltyOnRefund } from '@/lib/loyalty'
import { assertTransition } from '@/lib/orderStateMachine'
import { ok, fail, handleError, audit } from '@/lib/api'

// POST /api/payments/refund?orderId=...
export async function POST(req: NextRequest) {
  try {
    const s = await requireRole('ADMIN')
    const { searchParams } = new URL(req.url)
    const orderId = searchParams.get('orderId')
    if (!orderId) return fail('Chýba orderId.', 400)

    const body = await req.json()
    const { amount, reason } = refundSchema.parse(body)

    const order = await db.order.findUnique({ where: { id: orderId }, include: { payments: true } })
    if (!order) return fail('Objednávka neexistuje.', 404)

    // Only paid, non-refunded orders can be refunded
    assertTransition(order.status, 'REFUNDED', s.role)
    if (!['PAID', 'COMPLETED', 'DELIVERED'].includes(order.status)) {
      return fail('Iba zaplatené objednávky možno refundovať.', 409)
    }
    const payment = order.payments.find(p => p.status === 'PAID')
    if (!payment) return fail('Platba nebola nájdená alebo nie je zaplatená.', 404)
    if (amount > payment.amount) return fail('Suma refundácie presahuje platbu.', 422)

    const provider = getPaymentProvider()
    let refund
    try {
      refund = await provider.refundPayment(payment.providerPaymentId ?? payment.id, amount, reason)
    } catch (e) {
      return fail(`Refundácia zlyhala: ${(e as Error).message}`, 502)
    }

    await db.$transaction(async (tx) => {
      await tx.refund.create({
        data: { paymentId: payment.id, amount, reason, status: refund.status },
      })
      await tx.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } })
      await tx.order.update({ where: { id: orderId }, data: { status: 'REFUNDED' } })
      await tx.orderStatusHistory.create({
        data: { orderId, fromStatus: order.status, toStatus: 'REFUNDED', changedBy: s.sub, note: reason },
      })
    })

    // Revert loyalty points if they were earned
    await revertEarnedLoyaltyOnRefund(orderId)

    await audit({ userId: s.sub, orderId, action: 'REFUND', detail: `${amount} EUR — ${reason}` })
    return ok({ ok: true, refundId: refund.refundId, status: refund.status })
  } catch (e) {
    return handleError(e)
  }
}
