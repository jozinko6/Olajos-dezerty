// src/lib/payments.ts
// Payment provider abstraction. A mock provider is included for development.
// Stripe / GoPay adapters are stubbed and clearly marked as requiring real keys.

import { db } from './db'

export interface PaymentProvider {
  name: string
  createPayment(opts: { amount: number; currency: string; orderId: string; idempotencyKey?: string }): Promise<{ providerPaymentId: string; status: string; redirectUrl?: string }>
  verifyWebhook(headers: Record<string, string>, rawBody: string): Promise<{ verified: boolean; eventType: string; providerPaymentId: string; amount: number; currency: string }>
  getPaymentStatus(providerPaymentId: string): Promise<{ status: string }>
  refundPayment(providerPaymentId: string, amount: number, reason: string): Promise<{ status: string; refundId: string }>
}

class MockPaymentProvider implements PaymentProvider {
  name = 'mock'
  async createPayment(opts: { amount: number; currency: string; orderId: string; idempotencyKey?: string }) {
    // In dev, payment is "authorized" immediately. Real providers return a redirect URL.
    const id = `mock_${opts.orderId}_${Date.now()}`
    return { providerPaymentId: id, status: 'AUTHORIZED', redirectUrl: undefined }
  }
  async verifyWebhook() {
    return { verified: true, eventType: 'payment.succeeded', providerPaymentId: 'mock', amount: 0, currency: 'EUR' }
  }
  async getPaymentStatus(providerPaymentId: string) {
    // mock payments are always PAID after create
    return { status: 'PAID' }
  }
  async refundPayment(providerPaymentId: string, amount: number) {
    return { status: 'COMPLETED', refundId: `mock_refund_${Date.now()}` }
  }
}

class StripePaymentProvider implements PaymentProvider {
  name = 'stripe'
  async createPayment(opts: { amount: number; currency: string; orderId: string; idempotencyKey?: string }) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY chýba. Nastavte ho v .env pre produkčnú prevádzku.')
    // Real implementation would call stripe.paymentIntents.create(...)
    throw new Error('Stripe adapter vyžaduje reálne volanie API. Implementujte po dodaní kľúčov.')
  }
  async verifyWebhook(headers: Record<string, string>, rawBody: string) {
    if (!process.env.STRIPE_WEBHOOK_SECRET) throw new Error('STRIPE_WEBHOOK_SECRET chýba.')
    throw new Error('Stripe webhook verifikácia vyžaduje reálne volanie API.')
  }
  async getPaymentStatus() { throw new Error('Stripe adapter nie je nakonfigurovaný.') }
  async refundPayment() { throw new Error('Stripe adapter nie je nakonfigurovaný.') }
}

class GoPayPaymentProvider implements PaymentProvider {
  name = 'gopay'
  async createPayment() {
    if (!process.env.GOPAY_CLIENT_ID) throw new Error('GOPAY_CLIENT_ID chýba.')
    throw new Error('GoPay adapter vyžaduje reálne volanie API. Implementujte po dodaní kľúčov.')
  }
  async verifyWebhook() { throw new Error('GoPay adapter nie je nakonfigurovaný.') }
  async getPaymentStatus() { throw new Error('GoPay adapter nie je nakonfigurovaný.') }
  async refundPayment() { throw new Error('GoPay adapter nie je nakonfigurovaný.') }
}

export function getPaymentProvider(): PaymentProvider {
  const provider = (process.env.PAYMENT_PROVIDER || 'mock').toLowerCase()
  switch (provider) {
    case 'stripe': return new StripePaymentProvider()
    case 'gopay': return new GoPayPaymentProvider()
    case 'mock':
    default:
      return new MockPaymentProvider()
  }
}

export function isProductionPayment(): boolean {
  return (process.env.PAYMENT_PROVIDER || 'mock').toLowerCase() !== 'mock'
}

// Idempotent webhook handler: never create a second payment for the same webhook.
export async function handlePaymentWebhook(providerPaymentId: string, amount: number, currency: string, eventType: string): Promise<{ ok: boolean; alreadyProcessed: boolean }> {
  const existing = await db.paymentEvent.findFirst({
    where: { eventType: 'WEBHOOK_RECEIVED', payload: { contains: providerPaymentId } },
  })
  if (existing) return { ok: true, alreadyProcessed: true }

  const payment = await db.payment.findFirst({ where: { providerPaymentId } })
  if (!payment) return { ok: false, alreadyProcessed: false }

  await db.$transaction(async (tx) => {
    if (eventType === 'payment.succeeded' || eventType === 'payment.captured') {
      await tx.payment.update({ where: { id: payment.id }, data: { status: 'PAID' } })
      await tx.order.update({ where: { id: payment.orderId }, data: { status: 'PAID' } })
      await tx.orderStatusHistory.create({
        data: { orderId: payment.orderId, fromStatus: 'AWAITING_PAYMENT', toStatus: 'PAID', note: 'webhook' },
      })
    } else if (eventType === 'payment.failed') {
      await tx.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } })
      await tx.order.update({ where: { id: payment.orderId }, data: { status: 'PAYMENT_FAILED' } })
      await tx.orderStatusHistory.create({
        data: { orderId: payment.orderId, fromStatus: 'AWAITING_PAYMENT', toStatus: 'PAYMENT_FAILED', note: 'webhook' },
      })
    }
    await tx.paymentEvent.create({
      data: { paymentId: payment.id, eventType: 'WEBHOOK_RECEIVED', payload: JSON.stringify({ providerPaymentId, amount, currency, eventType }) },
    })
  })
  return { ok: true, alreadyProcessed: false }
}
