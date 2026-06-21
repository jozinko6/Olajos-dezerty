// src/lib/loyalty.ts
// Loyalty ledger. Points are earned ONLY on COMPLETED (never at order creation).
// Supports: EARN, REDEEM, REFUND, EXPIRE, MANUAL_ADJUSTMENT.
// One order cannot earn points twice (order.loyaltyAwarded flag).
// Refund subtracts earned points; cancel returns redeemed points.

import { db } from './db'

export async function awardLoyaltyPoints(orderId: string, customerId: string, points: number): Promise<boolean> {
  if (points <= 0) return false
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } })
    if (!order) throw new Error('Objednávka neexistuje.')
    if (order.loyaltyAwarded) return false // idempotent
    if (!customerId) throw new Error('Zákazník chýba.')

    const account = await tx.loyaltyAccount.findFirst({
      where: { customerProfile: { userId: customerId } },
    })
    if (!account) {
      // create account on-the-fly
      const profile = await tx.customerProfile.findUnique({ where: { userId: customerId } })
      if (!profile) throw new Error('Zákaznícky profil neexistuje.')
      const newAccount = await tx.loyaltyAccount.create({
        data: { customerProfileId: profile.id, points, lifetimePoints: points },
      })
      await tx.loyaltyTransaction.create({
        data: { accountId: newAccount.id, type: 'EARN', points, orderId, note: 'completed order' },
      })
    } else {
      await tx.loyaltyAccount.update({
        where: { id: account.id },
        data: { points: account.points + points, lifetimePoints: account.lifetimePoints + points },
      })
      await tx.loyaltyTransaction.create({
        data: { accountId: account.id, type: 'EARN', points, orderId, note: 'completed order' },
      })
    }
    await tx.order.update({ where: { id: orderId }, data: { loyaltyAwarded: true, loyaltyPointsEarned: points } })
    return true
  })
}

export async function redeemLoyaltyPoints(orderId: string, customerId: string, points: number): Promise<void> {
  if (points <= 0) return
  await db.$transaction(async (tx) => {
    const account = await tx.loyaltyAccount.findFirst({
      where: { customerProfile: { userId: customerId } },
    })
    if (!account) throw new Error('Vernostný účet neexistuje.')
    if (account.points < points) throw new Error('Nedostatok vernostných bodov.')
    await tx.loyaltyAccount.update({
      where: { id: account.id },
      data: { points: account.points - points },
    })
    await tx.loyaltyTransaction.create({
      data: { accountId: account.id, type: 'REDEEM', points: -points, orderId, note: 'checkout redemption' },
    })
  })
}

// On cancel: return redeemed points to the customer (idempotent via loyaltyReverted flag).
export async function revertRedeemedLoyaltyOnCancel(orderId: string): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } })
    if (!order) throw new Error('Objednávka neexistuje.')
    if (order.loyaltyReverted) return false
    if (order.loyaltyPointsRedeemed <= 0) {
      await tx.order.update({ where: { id: orderId }, data: { loyaltyReverted: true } })
      return false
    }
    const account = await tx.loyaltyAccount.findFirst({
      where: { customerProfile: { userId: order.customerId ?? undefined } },
    })
    if (account) {
      await tx.loyaltyAccount.update({
        where: { id: account.id },
        data: { points: account.points + order.loyaltyPointsRedeemed },
      })
      await tx.loyaltyTransaction.create({
        data: { accountId: account.id, type: 'REFUND', points: order.loyaltyPointsRedeemed, orderId, note: 'order cancelled — redeemed points returned' },
      })
    }
    await tx.order.update({ where: { id: orderId }, data: { loyaltyReverted: true } })
    return true
  })
}

// On refund of a COMPLETED order: subtract the earned points (if not yet reverted).
export async function revertEarnedLoyaltyOnRefund(orderId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } })
    if (!order) throw new Error('Objednávka neexistuje.')
    if (!order.loyaltyAwarded || order.loyaltyPointsEarned <= 0) return
    const account = await tx.loyaltyAccount.findFirst({
      where: { customerProfile: { userId: order.customerId ?? undefined } },
    })
    if (!account) return
    const toSubtract = Math.min(account.points, order.loyaltyPointsEarned)
    await tx.loyaltyAccount.update({
      where: { id: account.id },
      data: { points: Math.max(0, account.points - toSubtract) },
    })
    await tx.loyaltyTransaction.create({
      data: { accountId: account.id, type: 'REFUND', points: -toSubtract, orderId, note: 'order refunded — earned points subtracted' },
    })
    await tx.order.update({ where: { id: orderId }, data: { loyaltyAwarded: false } })
  })
}

export async function manualAdjustment(customerProfileId: string, points: number, note: string, adminId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    let account = await tx.loyaltyAccount.findUnique({ where: { customerProfileId } })
    if (!account) {
      account = await tx.loyaltyAccount.create({ data: { customerProfileId } })
    }
    const newBalance = Math.max(0, account.points + points)
    await tx.loyaltyAccount.update({
      where: { id: account.id },
      data: { points: newBalance, lifetimePoints: points > 0 ? account.lifetimePoints + points : account.lifetimePoints },
    })
    await tx.loyaltyTransaction.create({
      data: { accountId: account.id, type: 'MANUAL_ADJUSTMENT', points, note: `${note} (admin: ${adminId})` },
    })
  })
}
