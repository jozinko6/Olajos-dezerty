// src/lib/inventory.ts
// Transactional inventory operations using Prisma $transaction.
// Supports: reserve, commit, release, cancel-return (idempotent).
// Stock can never go negative (check enforced inside tx).

import { db } from './db'
import { Prisma } from '@prisma/client'

export interface ReserveItem {
  productId: string
  branchId: string
  quantity: number
}

// Atomically reserve stock for a set of items. Throws if insufficient stock.
// Returns nothing — caller creates the order in the same outer flow.
export async function reserveStock(items: ReserveItem[], orderId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    for (const item of items) {
      const inv = await tx.inventory.findUnique({
        where: { productId_branchId: { productId: item.productId, branchId: item.branchId } },
      })
      if (!inv) {
        throw new InventoryError(`Produkt nie je v sklade pobočky.`, 409)
      }
      const available = inv.quantity - inv.reservedQty
      if (available < item.quantity) {
        throw new InventoryError(`Nedostatok skladu. Dostupné: ${available}, potrebné: ${item.quantity}.`, 409)
      }
      await tx.inventory.update({
        where: { id: inv.id },
        data: { reservedQty: inv.reservedQty + item.quantity },
      })
      await tx.inventoryMovement.create({
        data: {
          productId: item.productId,
          branchId: item.branchId,
          changeType: 'RESERVE',
          delta: -item.quantity,
          reason: 'reserve at checkout',
          orderId,
        },
      })
    }
  })
}

// Commit reserved stock (deduct from quantity, reduce reservedQty) after payment.
export async function commitStock(items: ReserveItem[], orderId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    for (const item of items) {
      const inv = await tx.inventory.findUnique({
        where: { productId_branchId: { productId: item.productId, branchId: item.branchId } },
      })
      if (!inv) continue
      const newQty = Math.max(0, inv.quantity - item.quantity)
      const newReserved = Math.max(0, inv.reservedQty - item.quantity)
      await tx.inventory.update({
        where: { id: inv.id },
        data: { quantity: newQty, reservedQty: newReserved },
      })
      await tx.inventoryMovement.create({
        data: {
          productId: item.productId,
          branchId: item.branchId,
          changeType: 'COMMIT',
          delta: -item.quantity,
          reason: 'payment confirmed',
          orderId,
        },
      })
    }
  })
}

// Release reservation without deducting (payment failed or order cancelled before commit).
export async function releaseStock(items: ReserveItem[], orderId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    for (const item of items) {
      const inv = await tx.inventory.findUnique({
        where: { productId_branchId: { productId: item.productId, branchId: item.branchId } },
      })
      if (!inv) continue
      const newReserved = Math.max(0, inv.reservedQty - item.quantity)
      await tx.inventory.update({
        where: { id: inv.id },
        data: { reservedQty: newReserved },
      })
      await tx.inventoryMovement.create({
        data: {
          productId: item.productId,
          branchId: item.branchId,
          changeType: 'RELEASE',
          delta: item.quantity,
          reason: 'reservation released',
          orderId,
        },
      })
    }
  })
}

// Idempotent stock return on cancel. Uses order.stockReturned flag to ensure
// the stock is returned at most once per order.
export async function returnStockOnCancel(orderId: string): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    })
    if (!order) throw new InventoryError('Objednávka neexistuje.', 404)
    if (order.stockReturned) return false // already returned — idempotent no-op

    for (const item of order.items) {
      const inv = await tx.inventory.findUnique({
        where: { productId_branchId: { productId: item.productId, branchId: order.branchId } },
      })
      if (!inv) continue
      await tx.inventory.update({
        where: { id: inv.id },
        data: { quantity: inv.quantity + item.quantity },
      })
      await tx.inventoryMovement.create({
        data: {
          productId: item.productId,
          branchId: order.branchId,
          changeType: 'CANCEL_RETURN',
          delta: item.quantity,
          reason: 'order cancelled — stock returned',
          orderId,
        },
      })
    }
    await tx.order.update({
      where: { id: orderId },
      data: { stockReturned: true },
    })
    return true
  }).catch((e) => {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      // a unique constraint somewhere — treat as already-returned
      return false
    }
    throw e
  })
}

// Admin manual adjustment with movement log.
export async function adjustInventory(productId: string, branchId: string, newQuantity: number, reason: string, userId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const inv = await tx.inventory.findUnique({
      where: { productId_branchId: { productId, branchId } },
    })
    if (!inv) throw new InventoryError('Skladová položka neexistuje.', 404)
    const delta = newQuantity - inv.quantity
    await tx.inventory.update({
      where: { id: inv.id },
      data: { quantity: newQuantity },
    })
    await tx.inventoryMovement.create({
      data: {
        productId,
        branchId,
        changeType: 'ADJUST',
        delta,
        reason: reason || 'manual adjust',
        createdBy: userId,
      },
    })
  })
}

export class InventoryError extends Error {
  statusCode: number
  constructor(message: string, statusCode = 400) {
    super(message)
    this.statusCode = statusCode
  }
}
