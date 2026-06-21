import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { cateringInquirySchema } from '@/lib/validation'
import { ok, fail, handleError, rateLimit, clientIp, audit } from '@/lib/api'

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req)
    const rl = rateLimit(`catering:${ip}`, 3, 60_000)
    if (!rl.ok) return fail('Príliš veľa dopytov. Skúste to neskôr.', 429)

    const body = await req.json()
    const data = cateringInquirySchema.parse(body)

    const session = await getSession()
    const inquiry = await db.cateringInquiry.create({
      data: {
        customerId: session?.sub ?? null,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        eventType: data.eventType,
        eventDate: new Date(data.eventDate),
        eventLocation: data.eventLocation,
        guestCount: data.guestCount,
        services: data.services ?? '',
        budgetFrom: data.budgetFrom ?? null,
        budgetTo: data.budgetTo ?? null,
        message: data.message,
        gdprConsent: true,
        contactConsent: true,
      },
    })

    await audit({ userId: session?.sub, action: 'CATERING_INQUIRY', detail: inquiry.id, ipAddress: ip })
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
    const inquiries = await db.cateringInquiry.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
    return ok({ inquiries })
  } catch (e) {
    return handleError(e)
  }
}
