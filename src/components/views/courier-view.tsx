'use client'

import { useEffect, useState, useRef } from 'react'
import { api, ApiError } from '@/lib/api-client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { eur, skDateTime } from '@/lib/format'
import { STATUS_LABELS } from '@/lib/orderStateMachine'
import { toast } from 'sonner'
import { Truck, MapPin, Euro, Wallet, Navigation, Check, X, RefreshCw, Package } from 'lucide-react'
import { useAuth } from '@/lib/stores'

interface CourierAssignment {
  id: string
  status: string
  score: number | null
  scoreReasons: string
  expiresAt: string | null
  order: {
    id: string
    orderNumber: string
    status: string
    total: number
    paymentMethod: string
    deliveryType: string
    deliveryStreet: string | null
    deliveryCity: string | null
    deliveryPostalCode: string | null
    deliveryLatitude: number | null
    deliveryLongitude: number | null
    branch: { name: string; street: string; city: string; latitude: number | null; longitude: number | null }
    items: { productName: string; variantName: string | null; quantity: number }[]
  }
}
interface Earning {
  id: string
  baseFee: number
  distanceFee: number
  waitingFee: number
  bonusFee: number
  weekendBonus: number
  deductions: number
  total: number
  createdAt: string
  order: { orderNumber: string; status: string } | null
}
interface CashEntry {
  id: string
  entryType: string
  amount: number
  expectedAmount: number | null
  changeGiven: number | null
  note: string | null
  createdAt: string
  order: { orderNumber: string; paymentMethod: string } | null
}

export function CourierView() {
  const { user } = useAuth()
  const [tab, setTab] = useState('offers')

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-[var(--chocolate)] mb-2">Kuriérsky panel</h1>
        <p className="text-[var(--muted-foreground)]">Prihlásený: {user?.email}</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-[var(--secondary)]">
          <TabsTrigger value="offers" className="data-[state=active]:bg-[var(--chocolate)] data-[state=active]:text-[var(--cream)]"><Package className="h-4 w-4 mr-1" /> Ponuky</TabsTrigger>
          <TabsTrigger value="orders" className="data-[state=active]:bg-[var(--chocolate)] data-[state=active]:text-[var(--cream)]"><Truck className="h-4 w-4 mr-1" /> Aktívne</TabsTrigger>
          <TabsTrigger value="gps" className="data-[state=active]:bg-[var(--chocolate)] data-[state=active]:text-[var(--cream)]"><Navigation className="h-4 w-4 mr-1" /> GPS</TabsTrigger>
          <TabsTrigger value="earnings" className="data-[state=active]:bg-[var(--chocolate)] data-[state=active]:text-[var(--cream)]"><Euro className="h-4 w-4 mr-1" /> Odmeny</TabsTrigger>
          <TabsTrigger value="cash" className="data-[state=active]:bg-[var(--chocolate)] data-[state=active]:text-[var(--cream)]"><Wallet className="h-4 w-4 mr-1" /> Hotovosť</TabsTrigger>
        </TabsList>

        <TabsContent value="offers" className="mt-6"><OffersTab /></TabsContent>
        <TabsContent value="orders" className="mt-6"><OrdersTab /></TabsContent>
        <TabsContent value="gps" className="mt-6"><GpsTab /></TabsContent>
        <TabsContent value="earnings" className="mt-6"><EarningsTab /></TabsContent>
        <TabsContent value="cash" className="mt-6"><CashTab /></TabsContent>
      </Tabs>
    </div>
  )
}

function OffersTab() {
  const [assignments, setAssignments] = useState<CourierAssignment[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    api.get<{ assignments: CourierAssignment[] }>('/api/courier/offers')
      .then(r => setAssignments(r.assignments))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load(); const i = setInterval(load, 15000); return () => clearInterval(i) }, [])

  const respond = async (assignmentId: string, accept: boolean) => {
    try {
      await api.post('/api/courier/offers', { assignmentId, accept })
      toast.success(accept ? 'Ponuka prijatá.' : 'Ponuka odmietnutá.')
      load()
    } catch (e: any) {
      toast.error(e instanceof ApiError ? e.message : 'Chyba.')
    }
  }

  const offered = assignments.filter(a => a.status === 'OFFERED')
  const history = assignments.filter(a => a.status !== 'OFFERED')

  if (loading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold text-[var(--chocolate)] mb-3">Aktívne ponuky ({offered.length})</h2>
        {offered.length === 0 ? (
          <Card className="p-8 text-center bg-[var(--card)] border-[var(--border)]">
            <Package className="h-10 w-10 mx-auto mb-3 text-[var(--muted-foreground)] opacity-30" />
            <p className="text-[var(--muted-foreground)]">Žiadne nové ponuky.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {offered.map(a => {
              const reasons: string[] = (() => { try { return JSON.parse(a.scoreReasons) } catch { return [] } })()
              return (
                <Card key={a.id} className="p-5 bg-[var(--card)] border-[var(--gold)]/30">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-[var(--chocolate)]">{a.order.orderNumber}</span>
                        {a.score && <Badge className="bg-[var(--gold)]/15 text-[var(--gold)]">Skóre {a.score}</Badge>}
                      </div>
                      <div className="text-sm text-[var(--muted-foreground)]">{a.order.items.map(i => `${i.quantity}× ${i.productName}`).join(', ')}</div>
                      <div className="text-xs text-[var(--muted-foreground)] mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {a.order.branch.name} → {a.order.deliveryPostalCode} {a.order.deliveryCity}
                      </div>
                      <div className="text-xs text-[var(--chocolate)] mt-1">Suma na inkaso: {eur(a.order.total)} ({a.order.paymentMethod === 'CASH_ON_DELIVERY' ? 'hotovosť' : 'karta'})</div>
                    </div>
                    {a.expiresAt && (
                      <Badge variant="outline" className="border-[var(--raspberry)]/40 text-[var(--raspberry)]">
                        expiruje {skDateTime(a.expiresAt)}
                      </Badge>
                    )}
                  </div>
                  {reasons.length > 0 && (
                    <div className="mb-3 p-2 rounded bg-[var(--secondary)]/40 text-xs text-[var(--muted-foreground)]">
                      Dôvody pridelenia: {reasons.join(' · ')}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => respond(a.id, true)} className="bg-[var(--chocolate)] text-[var(--cream)] hover:bg-[var(--gold)] hover:text-[var(--chocolate)]">
                      <Check className="h-3 w-3 mr-1" /> Prijať
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => respond(a.id, false)} className="border-[var(--raspberry)] text-[var(--raspberry)]">
                      <X className="h-3 w-3 mr-1" /> Odmietnuť
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div>
          <h3 className="font-display text-lg font-semibold text-[var(--chocolate)] mb-2">História</h3>
          <div className="space-y-2">
            {history.slice(0, 10).map(a => (
              <Card key={a.id} className="p-3 bg-[var(--card)] border-[var(--border)] flex items-center justify-between">
                <span className="text-sm text-[var(--chocolate)]">{a.order.orderNumber}</span>
                <Badge variant="secondary">{a.status}</Badge>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function OrdersTab() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    api.get<{ orders: any[] }>('/api/courier/orders')
      .then(r => setOrders(r.orders.filter((o: any) => !['DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED'].includes(o.status))))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load(); const i = setInterval(load, 20000); return () => clearInterval(i) }, [])

  const advance = async (orderId: string, to: string, cashData?: { collectedCash: number; expectedCash: number; changeGiven: number }) => {
    try {
      await api.patch('/api/courier/orders', { orderId, toStatus: to, ...cashData })
      toast.success(`Stav: ${STATUS_LABELS[to as keyof typeof STATUS_LABELS]}`)
      load()
    } catch (e: any) {
      toast.error(e instanceof ApiError ? e.message : 'Chyba.')
    }
  }

  if (loading) return <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}</div>

  return (
    <div className="space-y-3">
      {orders.length === 0 ? (
        <Card className="p-8 text-center bg-[var(--card)] border-[var(--border)]">
          <Truck className="h-10 w-10 mx-auto mb-3 text-[var(--muted-foreground)] opacity-30" />
          <p className="text-[var(--muted-foreground)]">Žiadne aktívne doručenia.</p>
        </Card>
      ) : (
        orders.map(o => (
          <Card key={o.id} className="p-5 bg-[var(--card)] border-[var(--border)]">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-[var(--chocolate)]">{o.orderNumber}</span>
                  <Badge variant="outline" className="border-[var(--gold)]/40 text-[var(--gold)]">{STATUS_LABELS[o.status as keyof typeof STATUS_LABELS]}</Badge>
                </div>
                <div className="text-sm text-[var(--muted-foreground)]">{o.items.map((i: any) => `${i.quantity}× ${i.productName}`).join(', ')}</div>
              </div>
              <Badge variant="secondary">{o.paymentMethod === 'CASH_ON_DELIVERY' ? `Hotovosť ${eur(o.total)}` : 'Karta'}</Badge>
            </div>
            <div className="text-sm space-y-1 mb-3">
              <div className="flex items-center gap-2 text-[var(--chocolate)]"><MapPin className="h-3 w-3 text-[var(--gold)]" /> Odber: {o.branch.name}, {o.branch.street}, {o.branch.city}</div>
              <div className="flex items-center gap-2 text-[var(--chocolate)]"><MapPin className="h-3 w-3 text-[var(--raspberry)]" /> Doručenie: {o.deliveryStreet}, {o.deliveryPostalCode} {o.deliveryCity}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {o.status === 'COURIER_TO_STORE' && <Button size="sm" onClick={() => advance(o.id, 'PICKED_UP')} className="bg-[var(--chocolate)] text-[var(--cream)] hover:bg-[var(--gold)] hover:text-[var(--chocolate)]">Prevzal som</Button>}
              {o.status === 'PICKED_UP' && <Button size="sm" onClick={() => advance(o.id, 'OUT_FOR_DELIVERY')} className="bg-[var(--chocolate)] text-[var(--cream)] hover:bg-[var(--gold)] hover:text-[var(--chocolate)]">Na ceste</Button>}
              {o.status === 'OUT_FOR_DELIVERY' && <Button size="sm" onClick={() => advance(o.id, 'ARRIVING')} className="bg-[var(--chocolate)] text-[var(--cream)] hover:bg-[var(--gold)] hover:text-[var(--chocolate)]">Blížim sa</Button>}
              {o.status === 'ARRIVING' && (
                <Button size="sm" onClick={() => {
                  if (o.paymentMethod === 'CASH_ON_DELIVERY') {
                    const collected = prompt(`Suma na inkaso: ${eur(o.total)}\nZadaná hotovosť:`, String(o.total))
                    if (collected === null) return
                    const c = parseFloat(collected)
                    advance(o.id, 'DELIVERED', { collectedCash: c, expectedCash: o.total, changeGiven: Math.max(0, c - o.total) })
                  } else {
                    advance(o.id, 'DELIVERED')
                  }
                }} className="bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold)]/90">
                  <Check className="h-3 w-3 mr-1" /> Doručené
                </Button>
              )}
              {o.deliveryLatitude && o.deliveryLongitude && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${o.deliveryLatitude},${o.deliveryLongitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-[var(--gold)] rounded-md text-[var(--chocolate)] hover:bg-[var(--gold)]/10"
                >
                  <Navigation className="h-3 w-3" /> Navigácia
                </a>
              )}
            </div>
          </Card>
        ))
      )}
    </div>
  )
}

function GpsTab() {
  const [watching, setWatching] = useState(false)
  const [lastPos, setLastPos] = useState<{ lat: number; lng: number; at: string } | null>(null)
  const [error, setError] = useState('')
  const watchId = useRef<number | null>(null)

  const start = () => {
    if (!('geolocation' in navigator)) {
      setError('Prehliadač nepodporuje geolocation.')
      return
    }
    setWatching(true)
    setError('')
    watchId.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, accuracy, heading, speed } = pos.coords
        setLastPos({ lat: latitude, lng: longitude, at: new Date().toISOString() })
        try {
          await api.post('/api/courier/location', { latitude, longitude, accuracy, heading, speed })
        } catch (e: any) {
          // silent — don't spam toasts
        }
      },
      (err) => { setError(err.message); setWatching(false) },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    )
  }

  const stop = () => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
    setWatching(false)
  }

  useEffect(() => () => { if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current) }, [])

  return (
    <Card className="p-6 bg-[var(--card)] border-[var(--border)]">
      <h2 className="font-display text-xl font-semibold text-[var(--chocolate)] mb-4">Zdieľanie GPS polohy</h2>
      <p className="text-sm text-[var(--muted-foreground)] mb-4">
        Poloha sa zdieľa so zákazníkmi iba počas stavov OUT_FOR_DELIVERY a ARRIVING. Po DELIVERED sa zdieľanie automaticky zastaví.
      </p>
      {error && <div className="p-3 rounded bg-[var(--raspberry)]/10 border border-[var(--raspberry)]/30 text-sm text-[var(--raspberry)] mb-4">{error}</div>}
      {lastPos && (
        <div className="p-3 rounded bg-[var(--gold)]/10 border border-[var(--gold)]/30 mb-4">
          <div className="text-sm text-[var(--chocolate)]">Posledná poloha:</div>
          <div className="font-mono text-xs text-[var(--muted-foreground)]">{lastPos.lat.toFixed(6)}, {lastPos.lng.toFixed(6)}</div>
          <div className="text-xs text-[var(--muted-foreground)]">{skDateTime(lastPos.at)}</div>
        </div>
      )}
      {watching ? (
        <Button onClick={stop} variant="outline" className="border-[var(--raspberry)] text-[var(--raspberry)]">
          Zastaviť zdieľanie
        </Button>
      ) : (
        <Button onClick={start} className="bg-[var(--chocolate)] text-[var(--cream)] hover:bg-[var(--gold)] hover:text-[var(--chocolate)]">
          <Navigation className="h-4 w-4 mr-2" /> Začať zdieľať polohu
        </Button>
      )}
      <p className="text-xs text-[var(--muted-foreground)] mt-3">
        Prehliadač si vyžiada súhlas so zdieľaním polohy. Batériovo úsporné nastavenie s maximálnym vekom 5 s.
      </p>
    </Card>
  )
}

function EarningsTab() {
  const [earnings, setEarnings] = useState<Earning[]>([])
  const [totals, setTotals] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<{ earnings: Earning[]; totals: any }>('/api/courier/earnings')
      .then(r => { setEarnings(r.earnings); setTotals(r.totals) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Skeleton className="h-40 w-full" />

  return (
    <div className="space-y-4">
      {totals && (
        <Card className="p-6 bg-gradient-to-br from-[var(--chocolate)] to-[var(--chocolate)]/90 text-[var(--cream)] border-[var(--gold)]/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-[var(--cream)]/70">Základ</div>
              <div className="font-display text-xl font-bold text-[var(--gold)]">{eur(totals.baseFee)}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--cream)]/70">Vzdialenosť</div>
              <div className="font-display text-xl font-bold text-[var(--gold)]">{eur(totals.distanceFee)}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--cream)]/70">Bonusy</div>
              <div className="font-display text-xl font-bold text-[var(--gold)]">{eur(totals.bonusFee + totals.weekendBonus)}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--cream)]/70">Celkom</div>
              <div className="font-display text-2xl font-bold text-[var(--gold)]">{eur(totals.total)}</div>
            </div>
          </div>
        </Card>
      )}
      <div>
        <h3 className="font-display text-lg font-semibold text-[var(--chocolate)] mb-2">História odmien</h3>
        {earnings.length === 0 ? (
          <Card className="p-6 text-center bg-[var(--card)] border-[var(--border)]">
            <Euro className="h-10 w-10 mx-auto mb-2 text-[var(--muted-foreground)] opacity-30" />
            <p className="text-sm text-[var(--muted-foreground)]">Zatiaľ žiadne odmeny.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {earnings.map(e => (
              <Card key={e.id} className="p-3 bg-[var(--card)] border-[var(--border)] flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-[var(--chocolate)]">{e.order?.orderNumber ?? '—'}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">{skDateTime(e.createdAt)}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[var(--gold)]">{eur(e.total)}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">základ {eur(e.baseFee)} + {eur(e.distanceFee + e.bonusFee + e.weekendBonus)}</div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CashTab() {
  const [entries, setEntries] = useState<CashEntry[]>([])
  const [balance, setBalance] = useState({ collected: 0, handedOver: 0, balance: 0 })
  const [loading, setLoading] = useState(true)
  const [handoverAmount, setHandoverAmount] = useState('')

  const load = () => {
    api.get<{ entries: CashEntry[]; balance: any; settlements: any[] }>('/api/courier/cash')
      .then(r => { setEntries(r.entries); setBalance(r.balance) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handover = async () => {
    const amt = parseFloat(handoverAmount)
    if (!amt || amt <= 0) { toast.error('Neplatná suma.'); return }
    try {
      await api.post('/api/courier/cash', { action: 'HANDOVER', amount: amt, note: 'odovzdanie prevádzke' })
      toast.success('Hotovosť odovzdaná.')
      setHandoverAmount('')
      load()
    } catch (e: any) {
      toast.error(e instanceof ApiError ? e.message : 'Chyba.')
    }
  }

  const settle = async () => {
    if (!confirm('Vytvoriť uzávierku? Zostatok sa vynuluje.')) return
    try {
      await api.post('/api/courier/cash', { action: 'SETTLEMENT', note: 'uzávierka' })
      toast.success('Uzávierka vytvorená.')
      load()
    } catch (e: any) {
      toast.error(e instanceof ApiError ? e.message : 'Chyba.')
    }
  }

  if (loading) return <Skeleton className="h-40 w-full" />

  return (
    <div className="space-y-4">
      <Card className="p-6 bg-[var(--card)] border-[var(--border)]">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <div className="text-xs text-[var(--muted-foreground)]">Inkaso</div>
            <div className="font-display text-xl font-bold text-[var(--chocolate)]">{eur(balance.collected)}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--muted-foreground)]">Odovzdané</div>
            <div className="font-display text-xl font-bold text-[var(--chocolate)]">{eur(balance.handedOver)}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--muted-foreground)]">Zostatok</div>
            <div className="font-display text-xl font-bold text-[var(--gold)]">{eur(balance.balance)}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[160px] space-y-1">
            <Label className="text-[var(--chocolate)] text-xs">Suma na odovzdanie (€)</Label>
            <Input type="number" step="0.01" value={handoverAmount} onChange={e => setHandoverAmount(e.target.value)} />
          </div>
          <Button onClick={handover} className="bg-[var(--chocolate)] text-[var(--cream)] hover:bg-[var(--gold)] hover:text-[var(--chocolate)]">Odovzdať</Button>
          <Button onClick={settle} variant="outline" className="border-[var(--gold)] text-[var(--chocolate)]">Uzávierka</Button>
        </div>
        <p className="text-xs text-[var(--muted-foreground)] mt-3">Cash ledger sa tvorí iba pre hotovostné objednávky. Kartové platby sa do hotovosti nezapočítavajú.</p>
      </Card>

      <div>
        <h3 className="font-display text-lg font-semibold text-[var(--chocolate)] mb-2">História</h3>
        {entries.length === 0 ? (
          <Card className="p-6 text-center bg-[var(--card)] border-[var(--border)]">
            <Wallet className="h-10 w-10 mx-auto mb-2 text-[var(--muted-foreground)] opacity-30" />
            <p className="text-sm text-[var(--muted-foreground)]">Žiadne hotovostné záznamy.</p>
          </Card>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto olajos-scroll">
            {entries.map(e => (
              <Card key={e.id} className="p-3 bg-[var(--card)] border-[var(--border)] flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-[var(--chocolate)]">
                    {e.entryType === 'COLLECT' && 'Inkaso'}
                    {e.entryType === 'HANDOVER' && 'Odovzdanie'}
                    {e.entryType === 'SETTLEMENT' && 'Uzávierka'}
                    {e.entryType === 'ADJUST' && 'Úprava'}
                    {e.order && ` · ${e.order.orderNumber}`}
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)]">{skDateTime(e.createdAt)}{e.note ? ` · ${e.note}` : ''}</div>
                </div>
                <div className={`font-bold ${e.amount >= 0 ? 'text-[var(--gold)]' : 'text-[var(--raspberry)]'}`}>
                  {e.amount >= 0 ? '+' : ''}{eur(e.amount)}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
