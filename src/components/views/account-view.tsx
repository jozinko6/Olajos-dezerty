'use client'

import { useEffect, useState } from 'react'
import { useView, useAuth } from '@/lib/stores'
import { api } from '@/lib/api-client'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { eur, skDateTime } from '@/lib/format'
import { STATUS_LABELS } from '@/lib/orderStateMachine'
import { Award, Package, Cake, LogIn } from 'lucide-react'

interface OrderListItem {
  id: string
  orderNumber: string
  trackingToken: string
  status: string
  total: number
  createdAt: string
  deliveryType: string
  items: { productName: string; quantity: number }[]
}

export function AccountView() {
  const { navigate } = useView()
  const { user, loading: authLoading } = useAuth()
  const [orders, setOrders] = useState<OrderListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      if (!authLoading) navigate('login')
      return
    }
    api.get<{ orders: OrderListItem[] }>('/api/orders')
      .then(r => setOrders(r.orders))
      .finally(() => setLoading(false))
  }, [user, authLoading, navigate])

  if (authLoading || !user) {
    return (
      <div className="container mx-auto px-4 py-20">
        <Skeleton className="h-40 w-full max-w-2xl mx-auto" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-[var(--chocolate)] mb-2">Môj účet</h1>
          <p className="text-[var(--muted-foreground)]">{user.email}</p>
        </div>

        {/* Loyalty */}
        {user.role === 'CUSTOMER' && (
          <Card className="p-6 bg-gradient-to-br from-[var(--chocolate)] to-[var(--chocolate)]/90 text-[var(--cream)] border-[var(--gold)]/30 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-[var(--gold)]/20 flex items-center justify-center">
                  <Award className="h-7 w-7 text-[var(--gold)]" />
                </div>
                <div>
                  <div className="text-sm text-[var(--cream)]/70">Vernostné body</div>
                  <div className="font-display text-3xl font-bold text-[var(--gold)]">{user.loyalty?.points ?? 0}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-[var(--cream)]/70">Celkom nadobudnuté</div>
                <div className="font-display text-2xl text-[var(--cream)]">{user.loyalty?.lifetimePoints ?? 0}</div>
              </div>
            </div>
            <p className="text-xs text-[var(--cream)]/60 mt-4">
              Body získavate za každú dokončenú objednávku (5 % z hodnoty). 1 bod = 0,01 € na uplatnenie pri ďalšej objednávke.
            </p>
          </Card>
        )}

        {/* Orders */}
        <h2 className="font-display text-2xl font-semibold text-[var(--chocolate)] mb-4">Moje objednávky</h2>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
          </div>
        ) : orders.length === 0 ? (
          <Card className="p-10 text-center bg-[var(--card)] border-[var(--border)]">
            <Package className="h-12 w-12 mx-auto mb-3 text-[var(--muted-foreground)] opacity-30" />
            <p className="text-[var(--muted-foreground)] mb-4">Zatiaľ nemáte žiadne objednávky.</p>
            <Button onClick={() => navigate('catalog')} className="bg-[var(--chocolate)] text-[var(--cream)] hover:bg-[var(--gold)] hover:text-[var(--chocolate)]">
              Prejsť na ponuku
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {orders.map(o => (
              <Card key={o.id} className="p-4 bg-[var(--card)] border-[var(--border)] cursor-pointer hover:border-[var(--gold)] transition-colors" onClick={() => navigate('tracking', { token: o.trackingToken })}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-[var(--chocolate)]">{o.orderNumber}</span>
                      <Badge variant="outline" className="border-[var(--gold)]/40 text-[var(--gold)]">
                        {STATUS_LABELS[o.status as keyof typeof STATUS_LABELS] || o.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)] mb-2">{skDateTime(o.createdAt)} · {o.deliveryType === 'DELIVERY' ? 'Doručenie' : 'Osobný odber'}</div>
                    <div className="text-sm text-[var(--muted-foreground)] truncate">
                      {o.items.map(i => `${i.quantity}× ${i.productName}`).join(', ')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[var(--gold)]">{eur(o.total)}</div>
                    <div className="text-xs text-[var(--muted-foreground)]">Sledovať →</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
