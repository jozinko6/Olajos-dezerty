import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { inventoryAdjustSchema } from '@/lib/validation'
import { adjustInventory } from '@/lib/inventory'
import { ok, fail, handleError } from '@/lib/api'

export async function GET(_req: NextRequest) {
  try {
    await requireRole('ADMIN', 'STORE_MANAGER')
    const items = await db.inventory.findMany({
      include: { product: { select: { id: true, name: true, slug: true } }, branch: { select: { id: true, name: true } } },
      orderBy: { updatedAt: 'desc' },
    })
    const lowStock = items.filter(i => i.quantity - i.reservedQty <= i.minThreshold)
    return ok({ items, lowStock })
  } catch (e) {
    return handleError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const s = await requireRole('ADMIN', 'STORE_MANAGER')
    const body = await req.json()
    const data = inventoryAdjustSchema.parse(body)
    await adjustInventory(data.productId, data.branchId, data.newQuantity, data.reason, s.sub)
    return ok({ ok: true })
  } catch (e) {
    return handleError(e)
  }
}
