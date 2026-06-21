import { NextRequest } from 'next/server'
import { getPaymentProvider, handlePaymentWebhook } from '@/lib/payments'
import { ok, fail, handleError } from '@/lib/api'

// Webhook receiver — verifies signature & is idempotent.
export async function POST(req: NextRequest) {
  try {
    const provider = getPaymentProvider()
    const rawBody = await req.text()
    const headers: Record<string, string> = {}
    req.headers.forEach((v, k) => { headers[k] = v })

    let verified
    try {
      verified = await provider.verifyWebhook(headers, rawBody)
    } catch (e) {
      return fail(`Webhook verifikácia zlyhala: ${(e as Error).message}`, 400)
    }
    if (!verified.verified) return fail('Neplatný podpis webhooku.', 401)

    const result = await handlePaymentWebhook(verified.providerPaymentId, verified.amount, verified.currency, verified.eventType)
    return ok({ ok: true, alreadyProcessed: result.alreadyProcessed })
  } catch (e) {
    return handleError(e)
  }
}
