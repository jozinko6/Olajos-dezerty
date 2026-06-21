// src/lib/orderStateMachine.ts
// Central definition of allowed order status transitions.

export const ORDER_STATUSES = [
  'AWAITING_PAYMENT',
  'PAYMENT_FAILED',
  'PAID',
  'NEW',
  'CONFIRMED',
  'IN_PRODUCTION',
  'READY_FOR_PACKING',
  'PACKING',
  'READY_FOR_PICKUP',
  'COURIER_ASSIGNMENT',
  'COURIER_ASSIGNED',
  'COURIER_TO_STORE',
  'PICKED_UP',
  'OUT_FOR_DELIVERY',
  'ARRIVING',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
  'DELIVERY_PROBLEM',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

// Allowed transitions
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  AWAITING_PAYMENT: ['PAID', 'PAYMENT_FAILED', 'CANCELLED'],
  PAYMENT_FAILED: ['AWAITING_PAYMENT', 'CANCELLED'],
  PAID: ['NEW', 'CANCELLED', 'REFUNDED'],
  NEW: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['IN_PRODUCTION', 'CANCELLED'],
  IN_PRODUCTION: ['READY_FOR_PACKING', 'DELIVERY_PROBLEM'],
  READY_FOR_PACKING: ['PACKING'],
  PACKING: ['READY_FOR_PICKUP'],
  READY_FOR_PICKUP: ['COURIER_ASSIGNMENT', 'COMPLETED'], // pickup orders can complete here
  COURIER_ASSIGNMENT: ['COURIER_ASSIGNED', 'READY_FOR_PICKUP'],
  COURIER_ASSIGNED: ['COURIER_TO_STORE', 'CANCELLED'],
  COURIER_TO_STORE: ['PICKED_UP', 'DELIVERY_PROBLEM'],
  PICKED_UP: ['OUT_FOR_DELIVERY', 'DELIVERY_PROBLEM'],
  OUT_FOR_DELIVERY: ['ARRIVING', 'DELIVERED', 'DELIVERY_PROBLEM'],
  ARRIVING: ['DELIVERED', 'DELIVERY_PROBLEM'],
  DELIVERED: ['COMPLETED'],
  COMPLETED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
  DELIVERY_PROBLEM: ['COURIER_TO_STORE', 'PICKED_UP', 'CANCELLED'],
}

// Who can perform which transition
const ROLE_PERMISSIONS: Partial<Record<OrderStatus, string[]>> = {
  AWAITING_PAYMENT: ['SYSTEM', 'ADMIN', 'STORE_MANAGER'],
  PAYMENT_FAILED: ['SYSTEM', 'ADMIN', 'STORE_MANAGER'],
  PAID: ['SYSTEM', 'ADMIN', 'STORE_MANAGER'],
  NEW: ['ADMIN', 'STORE_MANAGER'],
  CONFIRMED: ['ADMIN', 'STORE_MANAGER', 'PRODUCTION'],
  IN_PRODUCTION: ['ADMIN', 'STORE_MANAGER', 'PRODUCTION'],
  READY_FOR_PACKING: ['ADMIN', 'STORE_MANAGER', 'PRODUCTION'],
  PACKING: ['ADMIN', 'STORE_MANAGER', 'PACKING'],
  READY_FOR_PICKUP: ['ADMIN', 'STORE_MANAGER', 'PACKING'],
  COURIER_ASSIGNMENT: ['ADMIN', 'STORE_MANAGER', 'DISPATCHER'],
  COURIER_ASSIGNED: ['ADMIN', 'STORE_MANAGER', 'DISPATCHER'],
  COURIER_TO_STORE: ['ADMIN', 'STORE_MANAGER', 'DISPATCHER', 'COURIER'],
  PICKED_UP: ['ADMIN', 'STORE_MANAGER', 'DISPATCHER', 'COURIER'],
  OUT_FOR_DELIVERY: ['ADMIN', 'STORE_MANAGER', 'DISPATCHER', 'COURIER'],
  ARRIVING: ['ADMIN', 'STORE_MANAGER', 'DISPATCHER', 'COURIER'],
  DELIVERED: ['ADMIN', 'STORE_MANAGER', 'DISPATCHER', 'COURIER'],
  COMPLETED: ['SYSTEM', 'ADMIN', 'STORE_MANAGER'],
  CANCELLED: ['ADMIN', 'STORE_MANAGER', 'CUSTOMER'],
  REFUNDED: ['ADMIN'],
  DELIVERY_PROBLEM: ['ADMIN', 'STORE_MANAGER', 'DISPATCHER', 'COURIER'],
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return (TRANSITIONS[from] ?? []).includes(to)
}

export function canRoleTransition(role: string, to: OrderStatus): boolean {
  const allowed = ROLE_PERMISSIONS[to] ?? []
  return allowed.includes(role) || role === 'ADMIN'
}

export function isTerminal(status: OrderStatus): boolean {
  return status === 'COMPLETED' || status === 'CANCELLED' || status === 'REFUNDED'
}

export function isPaid(status: OrderStatus): boolean {
  return !['AWAITING_PAYMENT', 'PAYMENT_FAILED', 'CANCELLED'].includes(status)
}

// Validate a transition request and throw with a meaningful Slovak message.
export function assertTransition(from: string, to: string, role: string): { from: OrderStatus; to: OrderStatus } {
  const fromStatus = from as OrderStatus
  const toStatus = to as OrderStatus
  if (!ORDER_STATUSES.includes(toStatus)) {
    throw new StateMachineError(`Neznámy stav: ${to}.`, 400)
  }
  if (from === to) {
    throw new StateMachineError('Objednávka už je v tomto stave.', 409)
  }
  if (!canTransition(fromStatus, toStatus)) {
    throw new StateMachineError(`Prechod zo stavu ${from} do ${to} nie je povolený.`, 409)
  }
  if (!canRoleTransition(role, toStatus)) {
    throw new StateMachineError('Vaša rola nemá oprávnenie na tento prechod.', 403)
  }
  // Card orders cannot enter production before PAID
  if (['NEW', 'CONFIRMED', 'IN_PRODUCTION'].includes(toStatus) && fromStatus === 'AWAITING_PAYMENT') {
    throw new StateMachineError('Kartová objednávka nemôže prejsť do výroby pred úhradou.', 409)
  }
  return { from: fromStatus, to: toStatus }
}

export class StateMachineError extends Error {
  statusCode: number
  constructor(message: string, statusCode = 400) {
    super(message)
    this.statusCode = statusCode
  }
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: 'Čaká na platbu',
  PAYMENT_FAILED: 'Platba zlyhala',
  PAID: 'Zaplatené',
  NEW: 'Nová',
  CONFIRMED: 'Potvrdená',
  IN_PRODUCTION: 'Vo výrobe',
  READY_FOR_PACKING: 'Pripravená na balenie',
  PACKING: 'Balí sa',
  READY_FOR_PICKUP: 'Pripravená na odber',
  COURIER_ASSIGNMENT: 'Priraďuje sa kuriér',
  COURIER_ASSIGNED: 'Kuriér priradený',
  COURIER_TO_STORE: 'Kuriér cestuje',
  PICKED_UP: 'Prevzaté kuriérom',
  OUT_FOR_DELIVERY: 'Na ceste k vám',
  ARRIVING: 'Blíži sa',
  DELIVERED: 'Doručené',
  COMPLETED: 'Dokončené',
  CANCELLED: 'Zrušené',
  REFUNDED: 'Vrátené',
  DELIVERY_PROBLEM: 'Problém s doručením',
}
