import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, handleError } from '@/lib/api'

export async function GET(_req: NextRequest) {
  try {
    const categories = await db.productCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })
    return ok({ categories })
  } catch (e) {
    return handleError(e)
  }
}

// dynamic product by slug — uses /api/catalog/product?slug=...
export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
