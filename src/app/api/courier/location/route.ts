import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { courierLocationSchema } from '@/lib/validation'
import { ok, fail, handleError } from '@/lib/api'

// POST — courier pushes current GPS location (from browser watchPosition)
export async function POST(req: NextRequest) {
  try {
    const s = await requireRole('COURIER')
    if (!s.courierId) return fail('Kuriérsky profil chýba.', 400)

    const body = await req.json()
    const data = courierLocationSchema.parse(body)

    const loc = await db.courierLocation.create({
      data: {
        courierId: s.courierId,
        latitude: data.latitude,
        longitude: data.longitude,
        heading: data.heading,
        speed: data.speed,
        accuracy: data.accuracy,
      },
    })

    return ok({ ok: true, recordedAt: loc.recordedAt })
  } catch (e) {
    return handleError(e)
  }
}

// GET — courier's latest location (for their own dashboard)
export async function GET(_req: NextRequest) {
  try {
    const s = await requireRole('COURIER')
    if (!s.courierId) return fail('Kuriérsky profil chýba.', 400)
    const latest = await db.courierLocation.findFirst({
      where: { courierId: s.courierId },
      orderBy: { recordedAt: 'desc' },
    })
    return ok({ location: latest })
  } catch (e) {
    return handleError(e)
  }
}
