import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handleError } from '@/lib/api'

export async function GET(_req: NextRequest) {
  try {
    const branches = await db.branch.findMany({
      where: { isActive: true },
      include: {
        businessHours: { orderBy: { dayOfWeek: 'asc' } },
        deliveryZones: { where: { isActive: true } },
      },
    })
    return ok({ branches })
  } catch (e) {
    return handleError(e)
  }
}
