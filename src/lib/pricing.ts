// src/lib/pricing.ts
// SERVER-SIDE ONLY. The client never sends prices; the server computes them.

import { db } from './db'

export interface PriceInput {
  items: Array<{
    productId: string
    variantId?: string
    optionIds: string[]
    quantity: number
  }>
  giftPackaging: boolean
  giftCardText?: string
  deliveryType: 'DELIVERY' | 'PICKUP'
  branchId: string
  deliveryPostalCode?: string
  deliveryCity?: string
  promoCode?: string
  redeemLoyaltyPoints?: number
  customerId?: string
}

export interface PriceLine {
  productId: string
  productName: string
  variantName?: string
  unitPrice: number
  quantity: number
  lineTotal: number
  optionsSnapshot: Array<{ name: string; groupName: string; priceDelta: number }>
  taxRate: number
}

export interface PriceBreakdown {
  lines: PriceLine[]
  subtotal: number
  giftPackagingFee: number
  cardFee: number
  discountAmount: number
  loyaltyDiscount: number
  deliveryFee: number
  taxAmount: number
  total: number
  loyaltyPointsEarned: number
  loyaltyPointsRedeemed: number
  deliveryZoneName?: string
  warnings: string[]
}

const LOYALTY_RATE = 0.05 // 5% of subtotal = points earned (1 point = 1 cent)
const LOYALTY_REDEMPTION_RATE = 0.01 // 1 point = 0.01 EUR
const GIFT_PACKAGING_FEE = 3.50
const GIFT_CARD_FEE = 1.50

export async function computePrice(input: PriceInput): Promise<PriceBreakdown> {
  const warnings: string[] = []
  const lines: PriceLine[] = []
  let subtotal = 0
  let taxAmount = 0

  // --- 1. Resolve product lines (server prices only) ---
  for (const item of input.items) {
    const product = await db.product.findUnique({
      where: { id: item.productId },
      include: {
        variants: true,
        optionGroups: { include: { options: true } },
      },
    })
    if (!product || !product.isActive) {
      throw new PricingError(`Produkt "${item.productId}" nie je dostupný.`)
    }
    // quantity limits
    if (item.quantity < product.minOrderQty) {
      throw new PricingError(`Minimálne množstvo pre ${product.name} je ${product.minOrderQty}.`)
    }
    if (item.quantity > product.maxOrderQty) {
      throw new PricingError(`Maximálne množstvo pre ${product.name} je ${product.maxOrderQty}.`)
    }

    let unitPrice = product.basePrice
    let variantName: string | undefined
    if (item.variantId) {
      const variant = product.variants.find(v => v.id === item.variantId && v.isActive)
      if (!variant) throw new PricingError('Vybraná varianta nie je dostupná.')
      unitPrice += variant.priceDelta
      variantName = variant.name
    }

    const optionsSnapshot: PriceLine['optionsSnapshot'] = []
    for (const optId of item.optionIds) {
      let found: { name: string; groupName: string; priceDelta: number } | null = null
      for (const g of product.optionGroups) {
        const opt = g.options.find(o => o.id === optId && o.isActive)
        if (opt) {
          found = { name: opt.name, groupName: g.name, priceDelta: opt.priceDelta }
          break
        }
      }
      if (!found) throw new PricingError('Vybraná možnosť nie je dostupná.')
      optionsSnapshot.push(found)
      unitPrice += found.priceDelta
    }

    const lineTotal = round2(unitPrice * item.quantity)
    lines.push({
      productId: product.id,
      productName: product.name,
      variantName,
      unitPrice: round2(unitPrice),
      quantity: item.quantity,
      lineTotal,
      optionsSnapshot,
      taxRate: product.taxRate,
    })
    subtotal += lineTotal
    taxAmount += lineTotal * product.taxRate
  }

  subtotal = round2(subtotal)

  // --- 2. Gift packaging & card ---
  const giftPackagingFee = input.giftPackaging ? GIFT_PACKAGING_FEE : 0
  const cardFee = input.giftCardText && input.giftCardText.trim() ? GIFT_CARD_FEE : 0
  if (giftPackagingFee || cardFee) {
    taxAmount += (giftPackagingFee + cardFee) * 0.20
  }

  // --- 3. Promo code (server-validated) ---
  let discountAmount = 0
  let deliveryZoneName: string | undefined
  if (input.promoCode) {
    const promo = await db.promoCode.findUnique({ where: { code: input.promoCode.toUpperCase() } })
    if (!promo || !promo.isActive) {
      throw new PricingError('Promo kód nie je platný.')
    }
    const now = new Date()
    if (promo.validFrom && now < promo.validFrom) throw new PricingError('Promo kód ešte nie je aktívny.')
    if (promo.validTo && now > promo.validTo) throw new PricingError('Promo kód expiroval.')
    if (promo.usageLimit && promo.usedCount >= promo.usageLimit) throw new PricingError('Promo kód bol už použitý.')
    if (promo.minOrderAmount && subtotal < promo.minOrderAmount) {
      throw new PricingError(`Minimálna objednávka pre promo kód je ${promo.minOrderAmount} €.`)
    }
    if (promo.discountType === 'PERCENT') {
      discountAmount = round2(subtotal * (promo.discountValue / 100))
      if (promo.maxDiscountAmount) discountAmount = Math.min(discountAmount, promo.maxDiscountAmount)
    } else {
      discountAmount = Math.min(round2(promo.discountValue), subtotal)
    }
  }

  // --- 4. Loyalty redemption ---
  let loyaltyDiscount = 0
  let loyaltyPointsRedeemed = 0
  if (input.redeemLoyaltyPoints && input.redeemLoyaltyPoints > 0) {
    if (!input.customerId) throw new PricingError('Pre uplatnenie vernostných bodov sa prihláste.')
    const account = await db.loyaltyAccount.findFirst({
      where: { customerProfile: { userId: input.customerId } },
    })
    if (!account || account.points < input.redeemLoyaltyPoints) {
      throw new PricingError('Nemáte dostatok vernostných bodov.')
    }
    loyaltyPointsRedeemed = input.redeemLoyaltyPoints
    loyaltyDiscount = round2(loyaltyPointsRedeemed * LOYALTY_REDEMPTION_RATE)
    const maxDiscount = subtotal - discountAmount
    if (loyaltyDiscount > maxDiscount) {
      loyaltyDiscount = maxDiscount
      loyaltyPointsRedeemed = Math.floor(maxDiscount / LOYALTY_REDEMPTION_RATE)
    }
  }

  // --- 5. Delivery fee (server-side zone lookup) ---
  let deliveryFee = 0
  if (input.deliveryType === 'DELIVERY') {
    const zones = await db.deliveryZone.findMany({
      where: { branchId: input.branchId, isActive: true },
    })
    let matched: typeof zones[number] | null = null
    if (input.deliveryPostalCode) {
      matched = zones.find(z => z.postalCodes.split(',').map(s => s.trim()).includes(input.deliveryPostalCode!)) ?? null
    }
    if (!matched && input.deliveryCity) {
      matched = zones.find(z => z.cities.split(',').map(s => s.trim().toLowerCase()).includes(input.deliveryCity!.toLowerCase())) ?? null
    }
    if (!matched) {
      throw new PricingError('Vaša adresa nie je v doručovacej zóne. Vyberte si osobný odber.')
    }
    deliveryZoneName = matched.name
    deliveryFee = matched.baseFee
    const afterDiscounts = subtotal - discountAmount - loyaltyDiscount
    if (matched.freeFromAmount && afterDiscounts >= matched.freeFromAmount) {
      deliveryFee = 0
      warnings.push('Doručenie zadarmo.')
    }
    if (matched.minOrderAmount && subtotal < matched.minOrderAmount) {
      throw new PricingError(`Minimálna objednávka pre zónu ${matched.name} je ${matched.minOrderAmount} €.`)
    }
    taxAmount += deliveryFee * 0.20
  }

  // --- 6. Loyalty points earned (5% of subtotal, before redemption) ---
  const loyaltyPointsEarned = Math.floor(subtotal * LOYALTY_RATE * 100) / 100 // points as float cents-like
  // Store as integer points (1 point per 20 cents spent -> simpler). We'll use 1 point per 1 EUR = 5% back.
  const loyaltyPointsEarnedInt = Math.floor(subtotal * 0.05)

  // --- 7. Totals ---
  const total = round2(
    Math.max(0, subtotal - discountAmount - loyaltyDiscount) + giftPackagingFee + cardFee + deliveryFee
  )
  taxAmount = round2(taxAmount)

  return {
    lines,
    subtotal,
    giftPackagingFee,
    cardFee,
    discountAmount,
    loyaltyDiscount,
    deliveryFee,
    taxAmount,
    total,
    loyaltyPointsEarned: loyaltyPointsEarnedInt,
    loyaltyPointsRedeemed,
    deliveryZoneName,
    warnings,
  }
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export class PricingError extends Error {
  constructor(message: string) {
    super(message)
  }
}
