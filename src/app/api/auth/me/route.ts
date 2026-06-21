import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { ok, fail } from '@/lib/api'

export async function GET(_req: NextRequest) {
  const s = await getSession()
  if (!s) return ok({ user: null })
  const user = await db.user.findUnique({
    where: { id: s.sub },
    select: { id: true, email: true, fullName: true, phone: true, role: true, emailVerified: true },
  })
  if (!user) return ok({ user: null })

  let courierId: string | undefined
  if (user.role === 'COURIER') {
    const courier = await db.courier.findUnique({ where: { userId: user.id } })
    courierId = courier?.id
  }
  let loyalty: { points: number; lifetimePoints: number } | undefined
  if (user.role === 'CUSTOMER') {
    const acc = await db.loyaltyAccount.findFirst({ where: { customerProfile: { userId: user.id } } })
    loyalty = acc ? { points: acc.points, lifetimePoints: acc.lifetimePoints } : { points: 0, lifetimePoints: 0 }
  }

  return ok({ user: { ...user, courierId, loyalty } })
}
