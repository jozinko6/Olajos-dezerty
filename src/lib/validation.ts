// src/lib/validation.ts
// Zod schemas for all server inputs. Never trust client-supplied IDs,
// prices, totals, role, courier_id.

import { z } from 'zod'

export const emailSchema = z.string().email('Neplatný e-mail.').max(254)
export const phoneSchema = z.string().regex(/^\+?[0-9\s\-()]{6,20}$/, 'Neplatné telefónne číslo.')
export const postalCodeSchema = z.string().regex(/^[0-9]{3}\s?[0-9]{2}$/, 'Neplatné PSČ.')

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Zadajte heslo.').max(200),
})

export const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Heslo musí mať aspoň 8 znakov.').max(200),
  fullName: z.string().min(2, 'Zadajte meno.').max(120),
  phone: phoneSchema.optional().or(z.literal('')),
})

export const addressSchema = z.object({
  label: z.string().max(60).optional(),
  street: z.string().min(2, 'Zadajte ulicu.').max(120),
  streetNumber: z.string().min(1, 'Zadajte číslo.').max(20),
  city: z.string().min(2, 'Zadajte mesto.').max(80),
  postalCode: postalCodeSchema,
  country: z.string().max(80).default('Slovensko'),
  deliveryNote: z.string().max(500).optional(),
  bell: z.string().max(40).optional(),
  floor: z.string().max(20).optional(),
  company: z.string().max(120).optional(),
})

// Cart item — only product_id, variant_id, options, quantity from client.
// NEVER unit_price / total / discount.
export const cartItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).optional(),
  optionIds: z.array(z.string()).default([]),
  quantity: z.number().int().min(1).max(999),
})

export const checkoutSchema = z.object({
  items: z.array(cartItemSchema).min(1, 'Košík je prázdny.'),
  deliveryType: z.enum(['DELIVERY', 'PICKUP']),
  branchId: z.string().min(1),
  deliveryAddress: addressSchema.optional(),
  scheduledFor: z.string().datetime().optional(),
  promoCode: z.string().max(40).optional().or(z.literal('')),
  redeemLoyaltyPoints: z.number().int().min(0).default(0),
  giftPackaging: z.boolean().default(false),
  giftCardText: z.string().max(300).optional().or(z.literal('')),
  paymentMethod: z.enum(['CARD_ONLINE', 'CASH_ON_DELIVERY', 'CASH_ON_PICKUP']),
  customerName: z.string().min(2, 'Zadajte meno.').max(120),
  customerPhone: phoneSchema,
  customerEmail: emailSchema,
  notes: z.string().max(1000).optional().or(z.literal('')),
  idempotencyKey: z.string().max(120).optional(),
})

export const productCreateSchema = z.object({
  name: z.string().min(2).max(160),
  slug: z.string().min(2).max(160).optional(),
  description: z.string().max(500).optional().or(z.literal('')),
  longDescription: z.string().max(5000).optional().or(z.literal('')),
  categoryId: z.string().min(1),
  basePrice: z.number().min(0).max(10000),
  imageUrl: z.string().max(500).optional().or(z.literal('')),
  productionLeadHours: z.number().int().min(0).max(720).default(24),
  taxRate: z.number().min(0).max(1).default(0.20),
  minOrderQty: z.number().int().min(1).max(999).default(1),
  maxOrderQty: z.number().int().min(1).max(9999).default(100),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
})

export const inventoryAdjustSchema = z.object({
  productId: z.string().min(1),
  branchId: z.string().min(1),
  newQuantity: z.number().int().min(0),
  reason: z.string().max(300).optional().or(z.literal('')),
})

export const orderStatusUpdateSchema = z.object({
  toStatus: z.string().min(1),
  note: z.string().max(500).optional().or(z.literal('')),
})

export const courierLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().min(0).optional(),
  accuracy: z.number().min(0).optional(),
})

export const customCakeInquirySchema = z.object({
  contactName: z.string().min(2).max(120),
  contactEmail: emailSchema,
  contactPhone: phoneSchema,
  eventType: z.string().min(2).max(80),
  eventDate: z.string().datetime(),
  guestCount: z.number().int().min(1).max(2000),
  budgetFrom: z.number().min(0).optional(),
  budgetTo: z.number().min(0).optional(),
  flavors: z.string().max(1000).optional().or(z.literal('')),
  message: z.string().min(5, 'Opíšte vašu predstavu.').max(3000),
  deliveryType: z.enum(['DELIVERY', 'PICKUP']),
  deliveryCity: z.string().max(120).optional().or(z.literal('')),
  deliveryAddress: z.string().max(300).optional().or(z.literal('')),
  referenceImageUrls: z.array(z.string().max(500)).max(5).default([]),
  gdprConsent: z.literal(true),
  contactConsent: z.literal(true),
})

export const cateringInquirySchema = z.object({
  contactName: z.string().min(2).max(120),
  contactEmail: emailSchema,
  contactPhone: phoneSchema,
  eventType: z.string().min(2).max(80),
  eventDate: z.string().datetime(),
  eventLocation: z.string().min(2).max(200),
  guestCount: z.number().int().min(1).max(5000),
  services: z.string().max(1000).optional().or(z.literal('')),
  budgetFrom: z.number().min(0).optional(),
  budgetTo: z.number().min(0).optional(),
  message: z.string().min(5, 'Opíšte vašu predstavu.').max(3000),
  gdprConsent: z.literal(true),
  contactConsent: z.literal(true),
})

export const assignCourierSchema = z.object({
  orderId: z.string().min(1),
  courierId: z.string().min(1),
  override: z.boolean().default(false),
})

export const offerResponseSchema = z.object({
  assignmentId: z.string().min(1),
  accept: z.boolean(),
  reason: z.string().max(300).optional().or(z.literal('')),
})

export const refundSchema = z.object({
  amount: z.number().min(0.01),
  reason: z.string().min(2).max(500),
})

export const promoCodeSchema = z.object({
  code: z.string().min(2).max(40),
  subtotal: z.number().min(0),
})

// Sanitization helper for free text — strips control chars
export function sanitizeText(s: string | undefined | null, max = 1000): string {
  if (!s) return ''
  return s.replace(/[\u0000-\u001F\u007F]/g, '').slice(0, max)
}
