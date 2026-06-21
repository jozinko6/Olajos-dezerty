import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { checkoutSchema } from '@/lib/validation'
import { computePrice, PricingError } from '@/lib/pricing'
import { reserveStock, commitStock, releaseStock } from '@/lib/inventory'
import { redeemLoyaltyPoints } from '@/lib/loyalty'
import { getPaymentProvider, isProductionPayment } from '@/lib/payments'
import { generateTrackingToken, generateOrderNumber, generateIdempotencyKey } from '@/lib/token'
import { getMapProvider } from '@/lib/maps'
import { ok, fail, handleError, rateLimit, clientIp, audit } from '@/lib/api'

// POST /api/checkout — create an order with server-side price calculation.
export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req)
    const rl = rateLimit(`checkout:${ip}`, 5, 60_000)
    if (!rl.ok) return fail('Príliš veľa objednávok. Skúste to neskôr.', 429)

    const body = await req.json()
    const data = checkoutSchema.parse(body)

    const session = await getSession()
    const customerId = session?.sub

    // Idempotency: if idempotencyKey provided, check existing order
    if (data.idempotencyKey && customerId) {
      const existing = await db.order.findFirst({
        where: { notes: { contains: `idem:${data.idempotencyKey}` } },
      })
      if (existing) {
        return ok({ order: { id: existing.id, orderNumber: existing.orderNumber, trackingToken: existing.trackingToken, total: existing.total }, idempotent: true })
      }
    }

    // --- 1. Server-side price calculation ---
    let breakdown
    try {
      breakdown = await computePrice({
        items: data.items,
        giftPackaging: data.giftPackaging,
        giftCardText: data.giftCardText,
        deliveryType: data.deliveryType,
        branchId: data.branchId,
        deliveryPostalCode: data.deliveryAddress?.postalCode,
        deliveryCity: data.deliveryAddress?.city,
        promoCode: data.promoCode || undefined,
        redeemLoyaltyPoints: data.redeemLoyaltyPoints || 0,
        customerId,
      })
    } catch (e) {
      if (e instanceof PricingError) return fail(e.message, 422)
      throw e
    }

    // --- 2. Reserve stock transactionally ---
    const reserveItems = breakdown.lines.map(l => ({ productId: l.productId, branchId: data.branchId, quantity: l.quantity }))
    const tempOrderId = generateIdempotencyKey()
    try {
      await reserveStock(reserveItems, tempOrderId)
    } catch (e) {
      return fail((e as Error).message, 409)
    }

    // --- 3. Geocode delivery address ---
    let deliveryLat: number | undefined
    let deliveryLng: number | undefined
    if (data.deliveryType === 'DELIVERY' && data.deliveryAddress) {
      try {
        const map = getMapProvider()
        const geo = await map.geocodeAddress(
          `${data.deliveryAddress.street} ${data.deliveryAddress.streetNumber}`,
          data.deliveryAddress.city,
          data.deliveryAddress.postalCode,
          data.deliveryAddress.country,
        )
        deliveryLat = geo.latitude
        deliveryLng = geo.longitude
      } catch {
        // soft fail — order can still be created without precise coords
      }
    }

    // --- 4. Redeem loyalty points (if requested) ---
    if (data.redeemLoyaltyPoints && data.redeemLoyaltyPoints > 0 && customerId) {
      try {
        await redeemLoyaltyPoints(tempOrderId, customerId, data.redeemLoyaltyPoints)
      } catch (e) {
        // release stock & bail
        await releaseStock(reserveItems, tempOrderId)
        return fail((e as Error).message, 422)
      }
    }

    // --- 5. Create the order (with immutable snapshots) ---
    const order = await db.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        trackingToken: generateTrackingToken(),
        customerId: customerId ?? null,
        branchId: data.branchId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        deliveryType: data.deliveryType,
        deliveryStreet: data.deliveryAddress?.street ?? null,
        deliveryStreetNumber: data.deliveryAddress?.streetNumber ?? null,
        deliveryCity: data.deliveryAddress?.city ?? null,
        deliveryPostalCode: data.deliveryAddress?.postalCode ?? null,
        deliveryCountry: data.deliveryAddress?.country ?? 'Slovensko',
        deliveryLatitude: deliveryLat ?? null,
        deliveryLongitude: deliveryLng ?? null,
        deliveryNote: data.deliveryAddress?.deliveryNote ?? null,
        deliveryBell: data.deliveryAddress?.bell ?? null,
        deliveryFloor: data.deliveryAddress?.floor ?? null,
        deliveryCompany: data.deliveryAddress?.company ?? null,
        deliveryFee: breakdown.deliveryFee,
        subtotal: breakdown.subtotal,
        discountAmount: breakdown.discountAmount,
        giftPackagingFee: breakdown.giftPackagingFee,
        cardFee: breakdown.cardFee,
        taxAmount: breakdown.taxAmount,
        total: breakdown.total,
        paymentMethod: data.paymentMethod,
        status: data.paymentMethod === 'CARD_ONLINE' ? 'AWAITING_PAYMENT' : 'NEW',
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
        giftPackaging: data.giftPackaging,
        giftCardText: data.giftCardText ?? null,
        notes: `${data.notes ?? ''}${data.idempotencyKey ? ` idem:${data.idempotencyKey}` : ''}`.trim() || null,
        loyaltyPointsRedeemed: breakdown.loyaltyPointsRedeemed,
        items: {
          create: breakdown.lines.map(l => ({
            productId: l.productId,
            productName: l.productName,
            variantName: l.variantName ?? null,
            unitPrice: l.unitPrice,
            quantity: l.quantity,
            lineTotal: l.lineTotal,
            optionsSnapshot: JSON.stringify(l.optionsSnapshot),
            taxRate: l.taxRate,
          })),
        },
        statusHistory: {
          create: { toStatus: data.paymentMethod === 'CARD_ONLINE' ? 'AWAITING_PAYMENT' : 'NEW', note: 'order created' },
        },
      },
      include: { items: true },
    })

    // --- 6. Create payment record ---
    const provider = getPaymentProvider()
    const payment = await db.payment.create({
      data: {
        orderId: order.id,
        provider: provider.name,
        amount: breakdown.total,
        currency: 'EUR',
        status: 'PENDING',
        idempotencyKey: data.idempotencyKey ?? null,
      },
    })
    await db.paymentEvent.create({
      data: { paymentId: payment.id, eventType: 'CREATED', payload: JSON.stringify({ amount: breakdown.total }) },
    })

    // --- 7. For CARD_ONLINE: call provider, then commit/release based on result ---
    let redirectUrl: string | undefined
    if (data.paymentMethod === 'CARD_ONLINE') {
      try {
        const pi = await provider.createPayment({
          amount: breakdown.total,
          currency: 'EUR',
          orderId: order.id,
          idempotencyKey: data.idempotencyKey,
        })
        await db.payment.update({
          where: { id: payment.id },
          data: { providerPaymentId: pi.providerPaymentId, status: pi.status },
        })
        redirectUrl = pi.redirectUrl
        // Mock provider returns AUTHORIZED immediately → commit stock & mark PAID
        if (pi.status === 'AUTHORIZED' && !isProductionPayment()) {
          await commitStock(reserveItems, order.id)
          await db.payment.update({ where: { id: payment.id }, data: { status: 'PAID' } })
          await db.order.update({ where: { id: order.id }, data: { status: 'PAID' } })
          await db.orderStatusHistory.create({ data: { orderId: order.id, fromStatus: 'AWAITING_PAYMENT', toStatus: 'PAID', note: 'mock payment authorized' } })
        }
      } catch (e) {
        // provider failed → release stock, mark PAYMENT_FAILED
        await releaseStock(reserveItems, order.id)
        await db.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } })
        await db.order.update({ where: { id: order.id }, data: { status: 'PAYMENT_FAILED' } })
        await db.orderStatusHistory.create({ data: { orderId: order.id, fromStatus: 'AWAITING_PAYMENT', toStatus: 'PAYMENT_FAILED' } })
        return fail(`Platba zlyhala: ${(e as Error).message}`, 402)
      }
    } else {
      // Cash on delivery/pickup: commit stock immediately (reserved at checkout)
      await commitStock(reserveItems, order.id)
    }

    // --- 8. Increment promo usage ---
    if (data.promoCode) {
      await db.promoCode.updateMany({
        where: { code: data.promoCode.toUpperCase() },
        data: { usedCount: { increment: 1 } },
      })
    }

    await audit({ userId: customerId, orderId: order.id, action: 'ORDER_CREATED', detail: `total ${breakdown.total} EUR, method ${data.paymentMethod}`, ipAddress: ip })

    return ok({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        trackingToken: order.trackingToken,
        total: order.total,
        status: order.status,
      },
      breakdown,
      redirectUrl,
      paymentProvider: provider.name,
      productionPayment: isProductionPayment(),
    })
  } catch (e) {
    return handleError(e)
  }
}
