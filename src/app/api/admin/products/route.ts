import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { productCreateSchema } from '@/lib/validation'
import { ok, fail, handleError, audit } from '@/lib/api'

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

// GET (list all, including inactive) — ADMIN/STORE_MANAGER
export async function GET(_req: NextRequest) {
  try {
    await requireRole('ADMIN', 'STORE_MANAGER')
    const products = await db.product.findMany({
      include: {
        category: true,
        variants: true,
        inventory: { include: { branch: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return ok({ products })
  } catch (e) {
    return handleError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const s = await requireRole('ADMIN', 'STORE_MANAGER')
    const body = await req.json()
    const data = productCreateSchema.parse(body)

    const slug = data.slug || slugify(data.name)
    const exists = await db.product.findUnique({ where: { slug } })
    if (exists) return fail('Produkt s týmto slugom už existuje.', 409)

    const product = await db.product.create({
      data: {
        name: data.name,
        slug,
        description: data.description || null,
        longDescription: data.longDescription || null,
        categoryId: data.categoryId,
        basePrice: data.basePrice,
        imageUrl: data.imageUrl || null,
        productionLeadHours: data.productionLeadHours,
        taxRate: data.taxRate,
        minOrderQty: data.minOrderQty,
        maxOrderQty: data.maxOrderQty,
        isFeatured: data.isFeatured,
        isActive: data.isActive,
      },
    })
    await audit({ userId: s.sub, action: 'PRODUCT_CREATED', detail: `${product.name} (${product.id})` })
    return ok({ product })
  } catch (e) {
    return handleError(e)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const s = await requireRole('ADMIN', 'STORE_MANAGER')
    const body = await req.json()
    const { id, ...updates } = body
    if (!id) return fail('Chýba id.', 400)
    const allowed = ['name', 'description', 'longDescription', 'basePrice', 'categoryId', 'imageUrl', 'isFeatured', 'isActive', 'productionLeadHours', 'minOrderQty', 'maxOrderQty', 'taxRate']
    const data: any = {}
    for (const k of allowed) if (k in updates) data[k] = updates[k]
    const product = await db.product.update({ where: { id }, data })
    await audit({ userId: s.sub, action: 'PRODUCT_UPDATED', detail: `${product.name} (${product.id})` })
    return ok({ product })
  } catch (e) {
    return handleError(e)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const s = await requireRole('ADMIN')
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return fail('Chýba id.', 400)
    // soft delete — deactivate
    const product = await db.product.update({ where: { id }, data: { isActive: false } })
    await audit({ userId: s.sub, action: 'PRODUCT_DEACTIVATED', detail: `${product.name} (${product.id})` })
    return ok({ ok: true })
  } catch (e) {
    return handleError(e)
  }
}
