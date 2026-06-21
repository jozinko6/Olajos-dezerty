'use client'

import { useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api-client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { skDateTime } from '@/lib/format'
import { STATUS_LABELS } from '@/lib/orderStateMachine'
import { toast } from 'sonner'
import { Package, ArrowRight, Check, Gift, Box } from 'lucide-react'
import { useAuth } from '@/lib/stores'

interface PackOrder {
  id: string
  orderNumber: string
  status: string
  createdAt: string
  giftPackaging: boolean
  giftCardText: string | null
  deliveryType: string
  items: { id: string; productName: string; variantName: string | null; quantity: number }[]
}

export function PackingView() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<PackOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [checked, setChecked] = useState<Record<string, Set<string>>>({})

  const load = () => {
    Promise.all([
      api.get<{ orders: PackOrder[] }>('/api/admin/orders?status=READY_FOR_PACKING'),
      api.get<{ orders: PackOrder[] }>('/api/admin/orders?status=PACKING'),
    ]).then(([a, b]) => setOrders([...a.orders, ...b.orders]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const toggleCheck = (orderId: string, itemId: string) => {
    setChecked(prev => {
      const next = { ...prev }
      const set = new Set(next[orderId] ?? [])
      if (set.has(itemId)) set.delete(itemId); else set.add(itemId)
      next[orderId] = set
      return next
    })
  }

  const allChecked = (o: PackOrder) => o.items.every(i => (checked[o.id] ?? new Set()).has(i.id))

  const advance = async (orderId: string, to: string) => {
    try {
      await api.patch(`/api/orders/detail?id=${orderId}`, { toStatus: to })
      toast.success(`Stav zmenený.`)
      load()
    } catch (e: any) {
      toast.error(e instanceof ApiError ? e.message : 'Chyba.')
    }
  }

  const complete = async (o: PackOrder) => {
    if (!allChecked(o)) {
      toast.error('Najprv potvrďte všetky položky v checkliste.')
      return
    }
    const to = o.deliveryType === 'PICKUP' ? 'READY_FOR_PICKUP' : 'READY_FOR_PICKUP'
    advance(o.id, to)
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-[var(--chocolate)] mb-2">Balenie</h1>
        <p className="text-[var(--muted-foreground)]">Checklist pre balenie objednávok. Prihlásený: {user?.email}</p>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}</div>
      ) : orders.length === 0 ? (
        <Card className="p-10 text-center bg-[var(--card)] border-[var(--border)]">
          <Package className="h-12 w-12 mx-auto mb-3 text-[var(--muted-foreground)] opacity-30" />
          <p className="text-[var(--muted-foreground)]">Žiadne objednávky na balenie.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <Card key={o.id} className="p-5 bg-[var(--card)] border-[var(--border)]">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-[var(--chocolate)]">{o.orderNumber}</span>
                    <Badge variant="outline" className="border-[var(--gold)]/40 text-[var(--gold)]">{STATUS_LABELS[o.status as keyof typeof STATUS_LABELS]}</Badge>
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)]">{skDateTime(o.createdAt)} · {o.deliveryType === 'DELIVERY' ? 'Doručenie' : 'Osobný odber'}</div>
                </div>
                {o.giftPackaging && <Badge className="bg-[var(--raspberry)]/15 text-[var(--raspberry)]"><Gift className="h-3 w-3 mr-1" /> Darčekové balenie</Badge>}
              </div>

              {o.giftCardText && (
                <div className="mb-3 p-2 rounded bg-[var(--gold)]/10 border border-[var(--gold)]/30 text-sm text-[var(--chocolate)]">
                  <span className="font-medium">Kartička:</span> {o.giftCardText}
                </div>
              )}

              <div className="space-y-2 mb-3">
                <div className="text-xs uppercase tracking-wide text-[var(--muted-foreground)] mb-1">Baliaci checklist</div>
                {o.items.map(i => {
                  const isChecked = (checked[o.id] ?? new Set()).has(i.id)
                  return (
                    <label key={i.id} className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-[var(--secondary)]/50">
                      <Checkbox checked={isChecked} onCheckedChange={() => toggleCheck(o.id, i.id)} />
                      <span className={`text-sm flex-1 ${isChecked ? 'line-through text-[var(--muted-foreground)]' : 'text-[var(--chocolate)]'}`}>
                        {i.quantity}× {i.productName}{i.variantName ? ` (${i.variantName})` : ''}
                      </span>
                      {isChecked && <Check className="h-4 w-4 text-[var(--gold)]" />}
                    </label>
                  )
                })}
                <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-[var(--secondary)]/50">
                  <Checkbox
                    checked={(checked[o.id] ?? new Set()).has(`box-${o.id}`)}
                    onCheckedChange={() => toggleCheck(o.id, `box-${o.id}`)}
                  />
                  <span className="text-sm flex-1 text-[var(--chocolate)]">Darčeková krabica / obal pripravená</span>
                  <Box className="h-4 w-4 text-[var(--gold)]" />
                </label>
              </div>

              <div className="flex gap-2">
                {o.status === 'READY_FOR_PACKING' && (
                  <Button size="sm" variant="outline" onClick={() => advance(o.id, 'PACKING')} className="border-[var(--gold)] text-[var(--chocolate)]">
                    Začať baliť <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
                <Button size="sm" onClick={() => complete(o)} disabled={!allChecked(o)} className="bg-[var(--chocolate)] text-[var(--cream)] hover:bg-[var(--gold)] hover:text-[var(--chocolate)]">
                  Dokončené balenie <Check className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
