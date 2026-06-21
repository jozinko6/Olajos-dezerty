import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handleError } from '@/lib/api'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const featured = searchParams.get('featured') === '1'
    const search = searchParams.get('q') || ''

    const products = await db.product.findMany({
      where: {
        isActive: true,
        ...(category ? { category: { slug: category } } : {}),
        ...(featured ? { isFeatured: true } : {}),
        ...(search ? { name: { contains: search } } : {}),
      },
      include: {
        category: true,
        variants: { where: { isActive: true } },
        optionGroups: { include: { options: { where: { isActive: true } } } },
        allergens: { include: { allergen: true } },
        inventory: { select: { quantity: true, reservedQty: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })

    const result = products.map(p => {
      const inv = p.inventory[0]
      const available = inv ? inv.quantity - inv.reservedQty : 0
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        longDescription: p.longDescription,
        imageUrl: p.imageUrl,
        basePrice: p.basePrice,
        isFeatured: p.isFeatured,
        productionLeadHours: p.productionLeadHours,
        minOrderQty: p.minOrderQty,
        maxOrderQty: p.maxOrderQty,
        taxRate: p.taxRate,
        category: { id: p.category.id, name: p.category.name, slug: p.category.slug },
        variants: p.variants.map(v => ({ id: v.id, name: v.name, priceDelta: v.priceDelta })),
        optionGroups: p.optionGroups.map(g => ({
          id: g.id, name: g.name, isRequired: g.isRequired, maxSelect: g.maxSelect,
          options: g.options.map(o => ({ id: o.id, name: o.name, priceDelta: o.priceDelta })),
        })),
        allergens: p.allergens.map(a => ({ code: a.allergen.code, name: a.allergen.name })),
        availableQty: available,
      }
    })

    return ok({ products: result })
  } catch (e) {
    return handleError(e)
  }
}
