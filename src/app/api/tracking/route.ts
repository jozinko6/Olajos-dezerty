import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, handleError } from '@/lib/api'
import { maskPhone, maskEmail, maskName, skDateTime } from '@/lib/format'

// Public tracking by token — masks all sensitive data.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    if (!token) return fail('Chýba tracking token.', 400)

    const order = await db.order.findUnique({
      where: { trackingToken: token },
      include: {
        items: true,
        branch: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        courier: {
          include: {
            locations: { orderBy: { recordedAt: 'desc' }, take: 1 },
            user: { select: { fullName: true } },
          },
        },
      },
    })
    if (!order) return fail('Objednávka nebola nájdená.', 404)

    // Only share courier location when OUT_FOR_DELIVERY or ARRIVING
    const shareLocation = ['OUT_FOR_DELIVERY', 'ARRIVING'].includes(order.status)

    return ok({
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        createdAt: order.createdAt,
        scheduledFor: order.scheduledFor,
        deliveryType: order.deliveryType,
        // masked customer data
        customerName: maskName(order.customerName),
        customerPhone: maskPhone(order.customerPhone),
        customerEmail: maskEmail(order.customerEmail),
        // delivery address (city + postal only, no street number)
        deliveryCity: order.deliveryCity,
        deliveryPostalCode: order.deliveryPostalCode,
        // totals (safe to share)
        total: order.total,
        deliveryFee: order.deliveryFee,
        // items
        items: order.items.map(i => ({
          productName: i.productName,
          variantName: i.variantName,
          quantity: i.quantity,
          lineTotal: i.lineTotal,
        })),
        // branch (pickup)
        branch: { name: order.branch.name, city: order.branch.city, street: order.branch.street },
        // status timeline
        timeline: order.statusHistory.map(h => ({
          status: h.toStatus,
          note: h.note,
          at: skDateTime(h.createdAt),
        })),
        // courier (limited)
        courier: order.courier && shareLocation ? {
          name: maskName(order.courier.user.fullName ?? ''),
          location: order.courier.locations[0] ? {
            latitude: order.courier.locations[0].latitude,
            longitude: order.courier.locations[0].longitude,
            recordedAt: order.courier.locations[0].recordedAt,
          } : null,
        } : null,
        shareLocation,
      },
    })
  } catch (e) {
    return handleError(e)
  }
}
