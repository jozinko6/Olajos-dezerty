// src/lib/courierScoring.ts
// Explainable scoring model for automatic courier assignment.
// Returns ranked candidates with score + human-readable reasons.

import { db } from './db'

export interface ScoredCourier {
  courierId: string
  courierName: string
  score: number
  reasons: string[]
}

export async function scoreCouriersForOrder(orderId: string): Promise<ScoredCourier[]> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      branch: true,
      items: true,
      courier: true,
    },
  })
  if (!order) throw new Error('Objednávka neexistuje.')
  if (order.deliveryType !== 'DELIVERY') return []

  // Active, online couriers with an active shift or simply online flag
  const couriers = await db.courier.findMany({
    where: { isOnline: true, user: { isActive: true } },
    include: {
      user: true,
      shifts: { where: { endTime: null }, orderBy: { startTime: 'desc' }, take: 1 },
      assignments: { where: { status: 'ACCEPTED' } },
      locations: { orderBy: { recordedAt: 'desc' }, take: 1 },
    },
  })

  const branchLat = order.branch.latitude ?? 48.4336
  const branchLng = order.branch.longitude ?? 17.7967

  const results: ScoredCourier[] = []
  for (const c of couriers) {
    const reasons: string[] = []
    let score = 50 // base

    // 1. Distance from branch
    const lat = c.locations[0]?.latitude ?? c.baseLatitude ?? branchLat
    const lng = c.locations[0]?.longitude ?? c.baseLongitude ?? branchLng
    const distKm = haversine(branchLat, branchLng, lat, lng)
    if (distKm <= 2) { score += 25; reasons.push(`${distKm.toFixed(1)} km od prevádzky`) }
    else if (distKm <= 5) { score += 15; reasons.push(`${distKm.toFixed(1)} km od prevádzky`) }
    else if (distKm <= 10) { score += 5; reasons.push(`${distKm.toFixed(1)} km od prevádzky`) }
    else { score -= 10; reasons.push(`ďaleko (${distKm.toFixed(1)} km)`) }

    // 2. Active load
    const activeCount = c.assignments.length
    if (activeCount === 0) { score += 20; reasons.push('žiadna aktívna objednávka') }
    else if (activeCount < c.maxCapacity) { score += 5; reasons.push(`${activeCount}/${c.maxCapacity} aktívnych`) }
    else { score -= 40; reasons.push('kapacita naplnená') }

    // 3. Vehicle & cooler
    const hasColdItems = order.items.some(i => i.productionNotes?.toLowerCase().includes('chladen'))
    if (hasColdItems && !c.hasCooler) { score -= 30; reasons.push('bez chladiaceho boxu') }
    else if (c.hasCooler) { score += 8; reasons.push('chladiaci box') }
    if (c.vehicleType === 'CAR') { score += 5; reasons.push('auto') }
    else if (c.vehicleType === 'SCOOTER') { score += 3; reasons.push('skúter') }

    // 4. Rating
    if (c.rating >= 4.7) { score += 8; reasons.push(`hodnotenie ${c.rating.toFixed(1)}`) }
    else if (c.rating < 4.0) { score -= 8; reasons.push(`nižšie hodnotenie ${c.rating.toFixed(1)}`) }

    // 5. End of shift soon? (penalize if shift ends within 30 min)
    const shift = c.shifts[0]
    if (shift?.startTime) {
      const elapsed = (Date.now() - shift.startTime.getTime()) / 3600000
      if (elapsed > 7) { score -= 10; reasons.push('dlhá smena') }
    }

    score = Math.max(0, Math.min(100, score))
    results.push({
      courierId: c.id,
      courierName: c.user.fullName ?? c.user.email,
      score: Math.round(score * 10) / 10,
      reasons,
    })
  }

  return results.sort((a, b) => b.score - a.score)
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}
