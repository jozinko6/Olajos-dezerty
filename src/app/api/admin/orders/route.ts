import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { ok, fail, handleError } from '@/lib/api'

export async function GET(req: NextRequest) {
  try {
    await requireRole('ADMIN', 'STORE_MANAGER', 'PRODUCTION', 'PACKING', 'DISPATCHER')
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200)

    const orders = await db.order.findMany({
      where: status ? { status } : {},
      include: {
        items: true,
        branch: { select: { name: true, city: true } },
        courier: { select: { id: true, user: { select: { fullName: true } } } },
        customer: { select: { email: true, fullName: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return ok({ orders })
  } catch (e) {
    return handleError(e)
  }
}
