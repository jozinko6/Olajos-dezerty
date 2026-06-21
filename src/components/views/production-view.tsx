'use client'

import { useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api-client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { eur, skDateTime } from '@/lib/format'
import { STATUS_LABELS } from '@/lib/orderStateMachine'
import { toast } from 'sonner'
import { Cake, ArrowRight, Clock } from 'lucide-react'
import { useAuth } from '@/lib/stores'

interface ProdOrder {
  id: string
  orderNumber: string
  status: string
  scheduledFor: string | null
  createdAt: string
  deliveryType: string
  items: { id: string; productName: string; variantName: string | null; quantity: number; productionNotes: string | null; optionsSnapshot: string }[]
}

export function ProductionView() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<ProdOrder[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    api.get<{ orders: ProdOrder[] }>('/api/admin/orders?status=CONFIRMED')
      .then(r => setOrders(r.orders))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const advance = async (orderId: string, to: string) => {
    try {
      await api.patch(`/api/orders/detail?id=${orderId}`, { toStatus: to })
      toast.success(`Stav zmenený: ${STATUS_LABELS[to as keyof typeof STATUS_LABELS]}`)
      load()
    } catch (e: any) {
      toast.error(e instanceof ApiError ? e.message : 'Chyba.')
    }
  }

  // Aggregate product quantities for production list
  const aggregate = () => {
    const map = new Map<string, { name: string; qty: number }>()
    for (const o of orders) {
      for (const i of o.items) {
        const key = i.productName + (i.variantName ? ` (${i.variantName})` : '')
        const existing = map.get(key) ?? { name: key, qty: 0 }
        existing.qty += i.quantity
        map.set(key, existing)
      }
    }
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty)
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-[var(--chocolate)] mb-2">Výroba</h1>
        <p className="text-[var(--muted-foreground)]">Objednávky čakajúce na výrobu. Prihlásený: {user?.email}</p>
      </div>

      {/* Aggregated production list */}
      <Card className="p-5 mb-6 bg-[var(--chocolate)] text-[var(--cream)] border-[var(--gold)]/30">
        <h2 className="font-display text-lg font-semibold text-[var(--gold)] mb-3">Agregovaný výrobný zoznam</h2>
        {aggregate().length === 0 ? (
          <p className="text-sm text-[var(--cream)]/70">Žiadne položky na výrobu.</p>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {aggregate().map((a, i) => (
              <div key={i} className="flex items-center justify-between bg-[var(--cream)]/10 rounded-md p-2">
                <span className="text-sm">{a.name}</span>
                <Badge className="bg-[var(--gold)] text-[var(--gold-foreground)]">{a.qty}×</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : orders.length === 0 ? (
        <Card className="p-10 text-center bg-[var(--card)] border-[var(--border)]">
          <Cake className="h-12 w-12 mx-auto mb-3 text-[var(--muted-foreground)] opacity-30" />
          <p className="text-[var(--muted-foreground)]">Žiadne objednávky na výrobu.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <Card key={o.id} className="p-4 bg-[var(--card)] border-[var(--border)]">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-[var(--chocolate)]">{o.orderNumber}</span>
                    <Badge variant="outline" className="border-[var(--gold)]/40 text-[var(--gold)]">{STATUS_LABELS[o.status as keyof typeof STATUS_LABELS]}</Badge>
                    {o.scheduledFor && <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" /> {skDateTime(o.scheduledFor)}</Badge>}
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)]">{skDateTime(o.createdAt)} · {o.deliveryType === 'DELIVERY' ? 'Doručenie' : 'Osobný odber'}</div>
                </div>
              </div>
              <div className="space-y-1 mb-3">
                {o.items.map(i => (
                  <div key={i.id} className="text-sm flex justify-between">
                    <span className="text-[var(--chocolate)]">{i.quantity}× {i.productName}{i.variantName ? ` (${i.variantName})` : ''}</span>
                    {i.productionNotes && <span className="text-[var(--raspberry)] text-xs">poznámka</span>}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => advance(o.id, 'IN_PRODUCTION')} className="bg-[var(--chocolate)] text-[var(--cream)] hover:bg-[var(--gold)] hover:text-[var(--chocolate)]">
                  Spustiť výrobu <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
