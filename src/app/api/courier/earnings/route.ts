import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { ok, fail, handleError } from '@/lib/api'

// GET — courier earnings (real sum, not fake length * 4.70)
export async function GET(_req: NextRequest) {
  try {
    const s = await requireRole('COURIER')
    if (!s.courierId) return fail('Kuriérsky profil chýba.', 400)

    const earnings = await db.courierEarning.findMany({
      where: { courierId: s.courierId },
      include: { order: { select: { orderNumber: true, status: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    const totals = earnings.reduce(
      (acc, e) => {
        acc.baseFee += e.baseFee
        acc.distanceFee += e.distanceFee
        acc.waitingFee += e.waitingFee
        acc.bonusFee += e.bonusFee
        acc.weekendBonus += e.weekendBonus
        acc.deductions += e.deductions
        acc.total += e.total
        return acc
      },
      { baseFee: 0, distanceFee: 0, waitingFee: 0, bonusFee: 0, weekendBonus: 0, deductions: 0, total: 0 },
    )

    return ok({ earnings, totals: { ...totals, total: Math.round(totals.total * 100) / 100 } })
  } catch (e) {
    return handleError(e)
  }
}

// POST — admin/dispatcher records an earning for a courier after delivery
export async function POST(req: NextRequest) {
  try {
    const s = await requireRole('ADMIN', 'STORE_MANAGER', 'DISPATCHER')
    const body = await req.json()
    const { orderId, courierId, baseFee = 3.50, distanceFee = 0, waitingFee = 0, bonusFee = 0, weekendBonus = 0, deductions = 0 } = body
    if (!orderId || !courierId) return fail('Chýba orderId alebo courierId.', 400)

    // Idempotent: one earning per order
    const existing = await db.courierEarning.findFirst({ where: { orderId } })
    if (existing) return fail('Odmena pre túto objednávku už existuje.', 409)

    const total = Math.round((baseFee + distanceFee + waitingFee + bonusFee + weekendBonus - deductions) * 100) / 100
    const earning = await db.courierEarning.create({
      data: { courierId, orderId, baseFee, distanceFee, waitingFee, bonusFee, weekendBonus, deductions, total },
    })
    return ok({ earning })
  } catch (e) {
    return handleError(e)
  }
}
