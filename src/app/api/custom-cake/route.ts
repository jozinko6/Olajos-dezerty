import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { customCakeInquirySchema } from '@/lib/validation'
import { ok, fail, handleError, rateLimit, clientIp, audit } from '@/lib/api'

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req)
    const rl = rateLimit(`cake:${ip}`, 3, 60_000)
    if (!rl.ok) return fail('Príliš veľa dopytov. Skúste to neskôr.', 429)

    const body = await req.json()
    const data = customCakeInquirySchema.parse(body)

    const session = await getSession()
    const inquiry = await db.customCakeInquiry.create({
      data: {
        customerId: session?.sub ?? null,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        eventType: data.eventType,
        eventDate: new Date(data.eventDate),
        guestCount: data.guestCount,
        budgetFrom: data.budgetFrom ?? null,
        budgetTo: data.budgetTo ?? null,
        flavors: data.flavors ?? '',
        message: data.message,
        deliveryType: data.deliveryType,
        deliveryCity: data.deliveryCity ?? null,
        deliveryAddress: data.deliveryAddress ?? null,
        referenceImageUrls: data.referenceImageUrls.join(','),
        gdprConsent: true,
        contactConsent: true,
      },
    })

    await audit({ userId: session?.sub, action: 'CAKE_INQUIRY', detail: inquiry.id, ipAddress: ip })
    return ok({ inquiry: { id: inquiry.id, status: inquiry.status } })
  } catch (e) {
    return handleError(e)
  }
}

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !['ADMIN', 'STORE_MANAGER'].includes(session.role as any)) {
      return fail('Nemáte oprávnenie.', 403)
    }
    const inquiries = await db.customCakeInquiry.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
    return ok({ inquiries })
  } catch (e) {
    return handleError(e)
  }
}
