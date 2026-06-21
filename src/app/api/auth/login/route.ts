import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createSessionToken, setSessionCookie, attachCourierId } from '@/lib/auth'
import { loginSchema } from '@/lib/validation'
import { ok, fail, handleError, rateLimit, clientIp, audit } from '@/lib/api'

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req)
    const rl = rateLimit(`login:${ip}`, 10, 60_000)
    if (!rl.ok) return fail('Príliš veľa pokusov o prihlásenie. Skúste to neskôr.', 429)

    const body = await req.json()
    const data = loginSchema.parse(body)

    const user = await db.user.findUnique({ where: { email: data.email.toLowerCase() } })
    if (!user) return fail('Nesprávny e-mail alebo heslo.', 401)
    if (!user.isActive) return fail('Účet je deaktivovaný.', 403)

    const valid = await verifyPassword(data.password, user.passwordHash)
    if (!valid) {
      await audit({ userId: user.id, action: 'LOGIN_FAILED', ipAddress: ip })
      return fail('Nesprávny e-mail alebo heslo.', 401)
    }

    const payload = await attachCourierId({ sub: user.id, email: user.email, role: user.role as any })
    const token = await createSessionToken(payload)
    await setSessionCookie(token)

    await audit({ userId: user.id, action: 'LOGIN', ipAddress: ip })
    return ok({ user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, courierId: payload.courierId } })
  } catch (e) {
    return handleError(e)
  }
}
