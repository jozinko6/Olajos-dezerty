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
import { Truck, MapPin, Award, User, ArrowRight, RefreshCw, Check } from 'lucide-react'
import { useAuth } from '@/lib/stores'

interface DispatchOrder {
  id: string
  orderNumber: string
  status: string
  total: number
  deliveryType: string
  deliveryCity: string | null
  deliveryPostalCode: string | null
  deliveryStreet: string | null
  createdAt: string
  items: { productName: string; quantity: number }[]
  courier: { id: string; user: { fullName: string | null } } | null
}

interface ScoredCourier {
  courierId: string
  courierName: string
  score: number
  reasons: string[]
}

export function DispatchView() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<DispatchOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [scoring, setScoring] = useState<Record<string, ScoredCourier[]>>({})
  const [assigning, setAssigning] = useState<string | null>(null)

  const load = () => {
    api.get<{ orders: DispatchOrder[] }>('/api/admin/orders?status=READY_FOR_PICKUP')
      .then(r => setOrders(r.orders.filter(o => o.deliveryType === 'DELIVERY')))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const scoreOrder = async (orderId: string) => {
    try {
      const r = await api.get<{ ranked: ScoredCourier[] }>(`/api/dispatch/score?orderId=${orderId}`)
      setScoring(prev => ({ ...prev, [orderId]: r.ranked }))
    } catch (e: any) {
      toast.error(e instanceof ApiError ? e.message : 'Chyba.')
    }
  }

  const assign = async (orderId: string, courierId: string) => {
    setAssigning(orderId)
    try {
      await api.post('/api/dispatch/assign', { orderId, courierId, override: false })
      toast.success('Kuriér priradený.')
      load()
      setScoring(prev => { const n = { ...prev }; delete n[orderId]; return n })
    } catch (e: any) {
      toast.error(e instanceof ApiError ? e.message : 'Chyba.')
    } finally {
      setAssigning(null)
    }
  }

  const assignAuto = async (orderId: string) => {
    setAssigning(orderId)
    try {
      const r = await api.post<{ assignment: any; score: number; reasons: string[] }>('/api/dispatch/assign', { orderId, courierId: 'auto', override: false })
      toast.success(`Automaticky priradený (skóre ${r.score}).`)
      load()
    } catch (e: any) {
      toast.error(e instanceof ApiError ? e.message : 'Chyba.')
    } finally {
      setAssigning(null)
    }
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-[var(--chocolate)] mb-2">Dispečing</h1>
          <p className="text-[var(--muted-foreground)]">Prideľovanie kuriérov pomocou vysvetliteľného scoring modelu. Prihlásený: {user?.email}</p>
        </div>
        <Button variant="outline" onClick={load} className="border-[var(--gold)] text-[var(--chocolate)]">
          <RefreshCw className="h-4 w-4 mr-1" /> Obnoviť
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}</div>
      ) : orders.length === 0 ? (
        <Card className="p-10 text-center bg-[var(--card)] border-[var(--border)]">
          <Truck className="h-12 w-12 mx-auto mb-3 text-[var(--muted-foreground)] opacity-30" />
          <p className="text-[var(--muted-foreground)]">Žiadne objednávky čakajúce na rozvoz.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map(o => (
            <Card key={o.id} className="p-5 bg-[var(--card)] border-[var(--border)]">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-[var(--chocolate)]">{o.orderNumber}</span>
                    <Badge variant="outline" className="border-[var(--gold)]/40 text-[var(--gold)]">{STATUS_LABELS[o.status as keyof typeof STATUS_LABELS]}</Badge>
                    <Badge variant="secondary" className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {o.deliveryPostalCode} {o.deliveryCity}</Badge>
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)]">{skDateTime(o.createdAt)} · {eur(o.total)}</div>
                  <div className="text-sm text-[var(--muted-foreground)] mt-1">{o.items.map(i => `${i.quantity}× ${i.productName}`).join(', ')}</div>
                </div>
                {o.courier && (
                  <Badge className="bg-[var(--gold)]/15 text-[var(--gold)]">
                    <User className="h-3 w-3 mr-1" /> {o.courier.user.fullName}
                  </Badge>
                )}
              </div>

              {!o.courier && (
                <div className="border-t border-[var(--border)] pt-3 space-y-3">
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => scoreOrder(o.id)} className="border-[var(--gold)] text-[var(--chocolate)]">
                      <Award className="h-3 w-3 mr-1" /> Vypočítať skóre kuriérov
                    </Button>
                    <Button size="sm" onClick={() => assignAuto(o.id)} disabled={assigning === o.id} className="bg-[var(--chocolate)] text-[var(--cream)] hover:bg-[var(--gold)] hover:text-[var(--chocolate)]">
                      Auto-prideliť najlepšieho <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>

                  {scoring[o.id] && (
                    <div className="space-y-2">
                      <div className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Najlepší kuriéri</div>
                      {scoring[o.id].length === 0 ? (
                        <p className="text-sm text-[var(--raspberry)]">Žiadny dostupný kuriér.</p>
                      ) : (
                        scoring[o.id].slice(0, 5).map((c, i) => (
                          <div key={c.courierId} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--secondary)]/30">
                            <div className="flex items-center gap-3 flex-1">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${i === 0 ? 'bg-[var(--gold)] text-[var(--gold-foreground)]' : 'bg-[var(--secondary)] text-[var(--chocolate)]'}`}>
                                {i + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-[var(--chocolate)]">{c.courierName}</div>
                                <div className="text-xs text-[var(--muted-foreground)] truncate">{c.reasons.join(' · ')}</div>
                              </div>
                              <Badge variant="outline" className="border-[var(--gold)]/40 text-[var(--gold)]">{c.score}</Badge>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => assign(o.id, c.courierId)} disabled={assigning === o.id} className="border-[var(--chocolate)] text-[var(--chocolate)]">
                              Priradiť <Check className="h-3 w-3 ml-1" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
