// src/lib/cashLedger.ts
// Cash ledger: only created for cash orders (CASH_ON_DELIVERY, CASH_ON_PICKUP).
// Card orders never enter the courier's cash ledger.
// Supports: collect (courier takes cash), handover (to operator), settlement.

import { db } from './db'

export async function recordCashCollection(orderId: string, courierId: string, expectedAmount: number, collectedAmount: number, changeGiven: number): Promise<void> {
  const order = await db.order.findUnique({ where: { id: orderId } })
  if (!order) throw new Error('Objednávka neexistuje.')
  if (order.paymentMethod !== 'CASH_ON_DELIVERY' && order.paymentMethod !== 'CASH_ON_PICKUP') {
    throw new Error('Hotovostná účtosť sa vzťahuje len na hotovostné objednávky.')
  }
  await db.cashLedger.create({
    data: {
      orderId,
      courierId,
      entryType: 'COLLECT',
      amount: collectedAmount,
      expectedAmount,
      changeGiven,
      note: `inkaso za objednávku ${order.orderNumber}`,
    },
  })
}

export async function recordCashHandover(courierId: string, amount: number, note: string): Promise<void> {
  await db.cashLedger.create({
    data: {
      courierId,
      entryType: 'HANDOVER',
      amount: -amount,
      note,
    },
  })
}

export async function getCourierCashBalance(courierId: string): Promise<{ collected: number; handedOver: number; balance: number }> {
  const entries = await db.cashLedger.findMany({ where: { courierId } })
  let collected = 0
  let handedOver = 0
  for (const e of entries) {
    if (e.entryType === 'COLLECT') collected += e.amount
    else if (e.entryType === 'HANDOVER') handedOver += -e.amount
    else if (e.entryType === 'ADJUST') collected += e.amount
  }
  return { collected: round2(collected), handedOver: round2(handedOver), balance: round2(collected - handedOver) }
}

export async function createSettlement(courierId: string, note: string): Promise<{ id: string; totalCollected: number; totalHandedOver: number; difference: number }> {
  const bal = await getCourierCashBalance(courierId)
  const settlement = await db.cashSettlement.create({
    data: {
      courierId,
      totalCollected: bal.collected,
      totalHandedOver: bal.handedOver,
      difference: bal.balance,
      note,
    },
  })
  // Reset ledger by creating an ADJUST entry that zeros the balance
  if (bal.balance !== 0) {
    await db.cashLedger.create({
      data: {
        courierId,
        entryType: 'SETTLEMENT',
        amount: -bal.balance,
        note: `uzávierka ${settlement.id}`,
      },
    })
  }
  return { id: settlement.id, ...bal }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
