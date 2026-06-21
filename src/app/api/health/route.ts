import { NextRequest } from 'next/server'
import { ok } from '@/lib/api'
import { isProductionPayment } from '@/lib/payments'
import { isProductionMap } from '@/lib/maps'

export async function GET(_req: NextRequest) {
  return ok({
    status: 'ok',
    time: new Date().toISOString(),
    paymentProvider: process.env.PAYMENT_PROVIDER || 'mock',
    mapProvider: process.env.MAP_PROVIDER || 'mock',
    productionPayment: isProductionPayment(),
    productionMap: isProductionMap(),
    jwtSecretSet: !!process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32,
  })
}
