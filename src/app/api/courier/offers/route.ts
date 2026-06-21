import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { offerResponseSchema } from '@/lib/validation'
import { ok, fail, handleError, audit } from '@/lib/api'

// GET — list offers/assignments for the logged-in courier
export async function GET(req: NextRequest) {
  try {
    const s = await requireRole('COURIER')
    const courier = await db.courier.findUnique({ where: { userId: s.sub } })
    if (!courier) return fail('Kuriérsky profil neexistuje.', 404)

    const assignments = await db.courierAssignment.findMany({
      where: { courierId: courier.id, status: { in: ['OFFERED', 'ACCEPTED', 'EXPIRED', 'REJECTED', 'MANUAL'] } },
      include: {
        order: {
          include: {
            items: true,
            branch: { select: { name: true, latitude: true, longitude: true, street: true, city: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })

    // Expire stale offers
    const now = new Date()
    for (const a of assignments) {
      if (a.status === 'OFFERED' && a.expiresAt && a.expiresAt < now) {
        await db.courierAssignment.update({ where: { id: a.id }, data: { status: 'EXPIRED' } })
      }
    }

    return ok({ assignments })
  } catch (e) {
    return handleError(e)
  }
}

// POST — courier accepts or rejects an offer
export async function POST(req: NextRequest) {
  try {
    const s = await requireRole('COURIER')
    const body = await req.json()
    const { assignmentId, accept, reason } = offerResponseSchema.parse(body)

    const assignment = await db.courierAssignment.findUnique({
      where: { id: assignmentId },
      include: { order: true },
    })
    if (!assignment) return fail('Ponuka neexistuje.', 404)
    if (assignment.courierId !== s.courierId) return fail('Toto nie je vaša ponuka.', 403)
    if (assignment.status !== 'OFFERED') return fail('Ponuka už nie je aktívna.', 409)

    const now = new Date()
    if (assignment.expiresAt && assignment.expiresAt < now) {
      await db.courierAssignment.update({ where: { id: assignmentId }, data: { status: 'EXPIRED', respondedAt: now } })
      return fail('Ponuka expirovala.', 410)
    }

    if (accept) {
      await db.courierAssignment.update({
        where: { id: assignmentId },
        data: { status: 'ACCEPTED', respondedAt: now },
      })
      await db.order.update({
        where: { id: assignment.orderId },
        data: { status: 'COURIER_TO_STORE' },
      })
      await db.orderStatusHistory.create({
        data: { orderId: assignment.orderId, fromStatus: 'COURIER_ASSIGNED', toStatus: 'COURIER_TO_STORE', changedBy: s.sub },
      })
      await audit({ userId: s.sub, orderId: assignment.orderId, action: 'OFFER_ACCEPTED' })
      return ok({ ok: true, status: 'ACCEPTED' })
    } else {
      await db.courierAssignment.update({
        where: { id: assignmentId },
        data: { status: 'REJECTED', respondedAt: now, rejectReason: reason ?? null },
      })
      await audit({ userId: s.sub, orderId: assignment.orderId, action: 'OFFER_REJECTED', detail: reason ?? '' })
      return ok({ ok: true, status: 'REJECTED' })
    }
  } catch (e) {
    return handleError(e)
  }
}
