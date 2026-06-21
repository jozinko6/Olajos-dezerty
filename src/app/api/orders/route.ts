import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { ok, fail, handleError } from '@/lib/api'

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    const where: any = {}
    if (session.role === 'CUSTOMER') {
      where.customerId = session.sub
    } else if (session.role === 'COURIER') {
      const courier = await db.courier.findUnique({ where: { userId: session.sub } })
      where.courierId = courier?.id
    } else if (session.role === 'DISPATCHER') {
      // dispatcher sees all delivery orders
      where.deliveryType = 'DELIVERY'
    } else if (['PRODUCTION', 'PACKING'].includes(session.role)) {
      // staff see orders in their workflow
    } else if (session.role === 'ADMIN' || session.role === 'STORE_MANAGER') {
      // see all
    } else {
      return fail('Neoprávnený prístup.', 403)
    }
    if (status) where.status = status

    const orders = await db.order.findMany({
      where,
      include: {
        items: true,
        branch: { select: { name: true, slug: true } },
        courier: { select: { id: true, user: { select: { fullName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return ok({ orders })
  } catch (e) {
    return handleError(e)
  }
}
