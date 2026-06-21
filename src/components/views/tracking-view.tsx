'use client'

import { useEffect, useState } from 'react'
import { useView } from '@/lib/stores'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { eur, skDateTime } from '@/lib/format'
import { STATUS_LABELS } from '@/lib/orderStateMachine'
import { Cake, Search, MapPin, Package, CheckCircle2, Truck, Clock, ArrowRight } from 'lucide-react'

interface TrackingData {
  order: {
    orderNumber: string
    status: string
    createdAt: string
    scheduledFor: string | null
    deliveryType: string
    customerName: string
    customerPhone: string
    customerEmail: string
    deliveryCity: string | null
    deliveryPostalCode: string | null
    total: number
    deliveryFee: number
    items: { productName: string; variantName: string | null; quantity: number; lineTotal: number }[]
    branch: { name: string; city: string; street: string }
    timeline: { status: string; note: string | null; at: string }[]
    courier: { name: string; location: { latitude: number; longitude: number; recordedAt: string } | null } | null
    shareLocation: boolean
  }
}

const STATUS_ICONS: Record<string, any> = {
  AWAITING_PAYMENT: Clock,
  PAID: CheckCircle2,
  NEW: Package,
  CONFIRMED: CheckCircle2,
  IN_PRODUCTION: Cake,
  READY_FOR_PACKING: Package,
  PACKING: Package,
  READY_FOR_PICKUP: Package,
  COURIER_ASSIGNED: Truck,
  COURIER_TO_STORE: Truck,
  PICKED_UP: Truck,
  OUT_FOR_DELIVERY: Truck,
  ARRIVING: MapPin,
  DELIVERED: CheckCircle2,
  COMPLETED: CheckCircle2,
  CANCELLED: Clock,
}

export function TrackingView() {
  const { params, navigate } = useView()
  const [token, setToken] = useState(params.token || '')
  const [data, setData] = useState<TrackingData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const lookup = async (t: string) => {
    if (!t) return
    setLoading(true)
    setError('')
    try {
      const res = await api.get<TrackingData>(`/api/tracking?token=${t}`)
      setData(res)
    } catch (e: any) {
      setError(e.message || 'Objednávka nebola nájdená.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (params.token) lookup(params.token)
  }, [params.token])

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <div className="olajos-divider mb-4">
          <span className="font-display text-sm uppercase tracking-widest">Sledovanie</span>
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-[var(--chocolate)] mb-2">Sledovanie objednávky</h1>
        <p className="text-[var(--muted-foreground)]">Zadajte tracking token z e-mailu alebo z potvrdenia objednávky.</p>
      </div>

      <div className="max-w-xl mx-auto mb-8">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
            <Input
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="tracking token..."
              className="pl-9 bg-[var(--card)] border-[var(--border)]"
              onKeyDown={e => { if (e.key === 'Enter') lookup(token) }}
            />
          </div>
          <Button onClick={() => lookup(token)} className="bg-[var(--chocolate)] text-[var(--cream)] hover:bg-[var(--gold)] hover:text-[var(--chocolate)]">
            Hľadať
          </Button>
        </div>
        {error && <p className="text-sm text-[var(--raspberry)] mt-2">{error}</p>}
      </div>

      {loading && (
        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {data && (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Status hero */}
          <Card className="p-6 bg-gradient-to-br from-[var(--card)] to-[var(--cream)] border-[var(--gold)]/30">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-[var(--gold)] uppercase tracking-wide mb-1">{data.order.orderNumber}</div>
                <h2 className="font-display text-2xl font-bold text-[var(--chocolate)]">
                  {STATUS_LABELS[data.order.status as keyof typeof STATUS_LABELS] || data.order.status}
                </h2>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">
                  Objednané {skDateTime(data.order.createdAt)}
                </p>
              </div>
              {(() => {
                const Icon = STATUS_ICONS[data.order.status] || Package
                return (
                  <div className="h-14 w-14 rounded-full bg-[var(--gold)]/15 flex items-center justify-center">
                    <Icon className="h-7 w-7 text-[var(--gold)]" />
                  </div>
                )
              })()}
            </div>
            {data.order.shareLocation && data.order.courier?.location && (
              <div className="mt-4 p-3 rounded-lg bg-[var(--gold)]/10 border border-[var(--gold)]/30">
                <div className="flex items-center gap-2 text-sm text-[var(--chocolate)]">
                  <MapPin className="h-4 w-4 text-[var(--gold)]" />
                  <span>Kuriér je na ceste · posledná aktualizácia {skDateTime(data.order.courier.location.recordedAt)}</span>
                </div>
                <div className="text-xs text-[var(--muted-foreground)] mt-1">
                  GPS: {data.order.courier.location.latitude.toFixed(4)}, {data.order.courier.location.longitude.toFixed(4)}
                </div>
              </div>
            )}
          </Card>

          {/* Timeline */}
          <Card className="p-6 bg-[var(--card)] border-[var(--border)]">
            <h3 className="font-display text-lg font-semibold text-[var(--chocolate)] mb-4">Priebeh objednávky</h3>
            <div className="space-y-3">
              {data.order.timeline.map((t, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`h-3 w-3 rounded-full ${i === data.order.timeline.length - 1 ? 'bg-[var(--gold)]' : 'bg-[var(--gold)]/40'}`} />
                    {i < data.order.timeline.length - 1 && <div className="w-0.5 flex-1 bg-[var(--gold)]/20" />}
                  </div>
                  <div className="flex-1 pb-3">
                    <div className="font-medium text-sm text-[var(--chocolate)]">
                      {STATUS_LABELS[t.status as keyof typeof STATUS_LABELS] || t.status}
                    </div>
                    {t.note && <div className="text-xs text-[var(--muted-foreground)]">{t.note}</div>}
                    <div className="text-xs text-[var(--muted-foreground)]">{t.at}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Items */}
          <Card className="p-6 bg-[var(--card)] border-[var(--border)]">
            <h3 className="font-display text-lg font-semibold text-[var(--chocolate)] mb-4">Položky</h3>
            <div className="space-y-2">
              {data.order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <div>
                    <span className="font-medium text-[var(--chocolate)]">{item.quantity}× {item.productName}</span>
                    {item.variantName && <span className="text-[var(--muted-foreground)]"> · {item.variantName}</span>}
                  </div>
                  <span className="text-[var(--gold)]">{eur(item.lineTotal)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-[var(--border)] mt-4 pt-3 space-y-1 text-sm">
              <div className="flex justify-between text-[var(--muted-foreground)]">
                <span>Doručenie</span>
                <span>{eur(data.order.deliveryFee)}</span>
              </div>
              <div className="flex justify-between font-semibold text-[var(--chocolate)]">
                <span>Celkom</span>
                <span>{eur(data.order.total)}</span>
              </div>
            </div>
          </Card>

          {/* Delivery info (masked) */}
          <Card className="p-6 bg-[var(--card)] border-[var(--border)]">
            <h3 className="font-display text-lg font-semibold text-[var(--chocolate)] mb-3">Doručenie</h3>
            <div className="text-sm space-y-1 text-[var(--muted-foreground)]">
              <div>Zákazník: <span className="text-[var(--chocolate)]">{data.order.customerName}</span></div>
              <div>Telefón: <span className="text-[var(--chocolate)]">{data.order.customerPhone}</span></div>
              <div>E-mail: <span className="text-[var(--chocolate)]">{data.order.customerEmail}</span></div>
              {data.order.deliveryType === 'DELIVERY' ? (
                <div>Doručenie do: <span className="text-[var(--chocolate)]">{data.order.deliveryPostalCode} {data.order.deliveryCity}</span></div>
              ) : (
                <div>Osobný odber: <span className="text-[var(--chocolate)]">{data.order.branch.name}, {data.order.branch.city}</span></div>
              )}
            </div>
            <div className="mt-3 p-2 rounded bg-[var(--secondary)]/40 text-xs text-[var(--muted-foreground)]">
              Z dôvodu ochrany súkromia sú osobné údaje na tejto stránke maskované.
            </div>
          </Card>

          <div className="text-center">
            <Button variant="outline" onClick={() => navigate('home')} className="border-[var(--chocolate)] text-[var(--chocolate)]">
              Späť domov <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
