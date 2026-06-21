'use client'

import { useEffect, useState } from 'react'
import { useView, useCart, useAuth } from '@/lib/stores'
import { api, ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { eur } from '@/lib/format'
import { toast } from 'sonner'
import { ArrowLeft, ShoppingCart, Truck, Store, CreditCard, Banknote, Check, AlertCircle } from 'lucide-react'

interface Branch {
  id: string
  name: string
  city: string
  street: string
  postalCode: string
}

export function CheckoutView() {
  const { navigate } = useView()
  const { items, subtotal, clear } = useCart()
  const { user } = useAuth()
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [deliveryType, setDeliveryType] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY')
  const [branchId, setBranchId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'CARD_ONLINE' | 'CASH_ON_DELIVERY' | 'CASH_ON_PICKUP'>('CARD_ONLINE')
  const [customerName, setCustomerName] = useState(user?.fullName || '')
  const [customerEmail, setCustomerEmail] = useState(user?.email || '')
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '')
  const [street, setStreet] = useState('')
  const [streetNumber, setStreetNumber] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [deliveryNote, setDeliveryNote] = useState('')
  const [bell, setBell] = useState('')
  const [floor, setFloor] = useState('')
  const [giftPackaging, setGiftPackaging] = useState(false)
  const [giftCardText, setGiftCardText] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [notes, setNotes] = useState('')
  const [gdpr, setGdpr] = useState(false)
  const [scheduledFor, setScheduledFor] = useState('')

  useEffect(() => {
    api.get<{ branches: (Branch & { deliveryZones: any[] })[] }>('/api/catalog/branches')
      .then(r => {
        setBranches(r.branches)
        const main = r.branches.find(b => (b as any).isMain) || r.branches[0]
        if (main) setBranchId(main.id)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (user) {
      setCustomerName(user.fullName || '')
      setCustomerEmail(user.email || '')
      setCustomerPhone(user.phone || '')
    }
  }, [user])

  const submit = async () => {
    if (items.length === 0) {
      toast.error('Košík je prázdny.')
      return
    }
    if (!gdpr) {
      toast.error('Musíte súhlasiť so spracovaním osobných údajov.')
      return
    }
    if (!branchId) {
      toast.error('Vyberte pobočku.')
      return
    }
    if (deliveryType === 'DELIVERY' && (!street || !streetNumber || !city || !postalCode)) {
      toast.error('Vyplňte doručovaciu adresu.')
      return
    }
    if (paymentMethod === 'CASH_ON_PICKUP' && deliveryType === 'DELIVERY') {
      setPaymentMethod('CASH_ON_DELIVERY')
    }

    setSubmitting(true)
    try {
      const res = await api.post<{ order: any; breakdown: any; redirectUrl?: string; paymentProvider: string; productionPayment: boolean }>('/api/checkout', {
        items: items.map(i => ({
          productId: i.productId,
          variantId: i.variantId,
          optionIds: i.optionIds,
          quantity: i.quantity,
        })),
        deliveryType,
        branchId,
        deliveryAddress: deliveryType === 'DELIVERY' ? { street, streetNumber, city, postalCode, country: 'Slovensko', deliveryNote, bell, floor } : undefined,
        scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
        promoCode: promoCode || undefined,
        redeemLoyaltyPoints: 0,
        giftPackaging,
        giftCardText: giftCardText || undefined,
        paymentMethod,
        customerName,
        customerPhone,
        customerEmail,
        notes,
      })

      clear()
      toast.success(`Objednávka ${res.order.orderNumber} bola vytvorená.`)

      if (res.paymentProvider === 'mock' && !res.productionPayment) {
        toast.info('Používate mock platobný provider. V produkcii použite Stripe/GoPay.', { duration: 6000 })
      }

      navigate('tracking', { token: res.order.trackingToken })
    } catch (e: any) {
      if (e instanceof ApiError) toast.error(e.message)
      else toast.error('Nastala chyba pri vytváraní objednávky.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-[var(--muted-foreground)] opacity-30" />
        <h1 className="font-display text-2xl font-bold text-[var(--chocolate)] mb-2">Košík je prázdny</h1>
        <p className="text-[var(--muted-foreground)] mb-6">Pridajte produkty do košíka a vráťte sa k pokladni.</p>
        <Button onClick={() => navigate('catalog')} className="bg-[var(--chocolate)] text-[var(--cream)] hover:bg-[var(--gold)] hover:text-[var(--chocolate)]">
          Prejsť na ponuku
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <Button variant="ghost" className="mb-6 text-[var(--chocolate)]" onClick={() => navigate('catalog')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Späť na nákup
      </Button>
      <h1 className="font-display text-3xl md:text-4xl font-bold text-[var(--chocolate)] mb-8">Pokladňa</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact */}
          <Card className="p-6 bg-[var(--card)] border-[var(--border)]">
            <h2 className="font-display text-xl font-semibold text-[var(--chocolate)] mb-4">Kontaktné údaje</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[var(--chocolate)]">Meno a priezvisko</Label>
                <Input value={customerName} onChange={e => setCustomerName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label className="text-[var(--chocolate)]">Telefón</Label>
                <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} required placeholder="+421 900 000 000" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-[var(--chocolate)]">E-mail</Label>
                <Input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} required />
              </div>
            </div>
          </Card>

          {/* Delivery */}
          <Card className="p-6 bg-[var(--card)] border-[var(--border)]">
            <h2 className="font-display text-xl font-semibold text-[var(--chocolate)] mb-4">Spôsob prevzatia</h2>
            <RadioGroup value={deliveryType} onValueChange={(v) => { setDeliveryType(v as any); if (v === 'PICKUP' && paymentMethod === 'CASH_ON_DELIVERY') setPaymentMethod('CASH_ON_PICKUP') }} className="grid sm:grid-cols-2 gap-3 mb-4">
              <label className={`flex items-center gap-3 border rounded-lg p-4 cursor-pointer ${deliveryType === 'DELIVERY' ? 'border-[var(--gold)] bg-[var(--gold)]/5' : 'border-[var(--border)]'}`}>
                <RadioGroupItem value="DELIVERY" />
                <Truck className="h-5 w-5 text-[var(--gold)]" />
                <div>
                  <div className="font-medium text-[var(--chocolate)]">Doručenie</div>
                  <div className="text-xs text-[var(--muted-foreground)]">Kurier príde až k vám</div>
                </div>
              </label>
              <label className={`flex items-center gap-3 border rounded-lg p-4 cursor-pointer ${deliveryType === 'PICKUP' ? 'border-[var(--gold)] bg-[var(--gold)]/5' : 'border-[var(--border)]'}`}>
                <RadioGroupItem value="PICKUP" />
                <Store className="h-5 w-5 text-[var(--gold)]" />
                <div>
                  <div className="font-medium text-[var(--chocolate)]">Osobný odber</div>
                  <div className="text-xs text-[var(--muted-foreground)]">Vyzdvihnete si u nás</div>
                </div>
              </label>
            </RadioGroup>

            <div className="space-y-2">
              <Label className="text-[var(--chocolate)]">Pobočka</Label>
              <RadioGroup value={branchId} onValueChange={setBranchId} className="space-y-2">
                {branches.map(b => (
                  <label key={b.id} className={`flex items-center gap-3 border rounded-lg p-3 cursor-pointer ${branchId === b.id ? 'border-[var(--gold)] bg-[var(--gold)]/5' : 'border-[var(--border)]'}`}>
                    <RadioGroupItem value={b.id} />
                    <div className="flex-1">
                      <div className="font-medium text-[var(--chocolate)]">{b.name}</div>
                      <div className="text-xs text-[var(--muted-foreground)]">{b.street}, {b.city}, {b.postalCode}</div>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>

            {deliveryType === 'DELIVERY' && (
              <div className="mt-4 space-y-4 border-t border-[var(--border)] pt-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[var(--chocolate)]">Ulica</Label>
                    <Input value={street} onChange={e => setStreet(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[var(--chocolate)]">Číslo</Label>
                    <Input value={streetNumber} onChange={e => setStreetNumber(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[var(--chocolate)]">Mesto</Label>
                    <Input value={city} onChange={e => setCity(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[var(--chocolate)]">PSČ</Label>
                    <Input value={postalCode} onChange={e => setPostalCode(e.target.value)} required placeholder="920 01" />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[var(--chocolate)]">Zvonček / poschodie</Label>
                    <Input value={bell} onChange={e => setBell(e.target.value)} placeholder="2. poschodie, zvonček 3" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[var(--chocolate)]">Poznámka pre kuriéra</Label>
                    <Input value={deliveryNote} onChange={e => setDeliveryNote(e.target.value)} placeholder="Záhrada vľavo..." />
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Payment */}
          <Card className="p-6 bg-[var(--card)] border-[var(--border)]">
            <h2 className="font-display text-xl font-semibold text-[var(--chocolate)] mb-4">Platba</h2>
            <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)} className="space-y-2">
              <label className={`flex items-center gap-3 border rounded-lg p-4 cursor-pointer ${paymentMethod === 'CARD_ONLINE' ? 'border-[var(--gold)] bg-[var(--gold)]/5' : 'border-[var(--border)]'}`}>
                <RadioGroupItem value="CARD_ONLINE" />
                <CreditCard className="h-5 w-5 text-[var(--gold)]" />
                <div className="flex-1">
                  <div className="font-medium text-[var(--chocolate)]">Platba kartou online</div>
                  <div className="text-xs text-[var(--muted-foreground)]">Bezpečne zaplaťte kartou pred doručením</div>
                </div>
              </label>
              {deliveryType === 'DELIVERY' && (
                <label className={`flex items-center gap-3 border rounded-lg p-4 cursor-pointer ${paymentMethod === 'CASH_ON_DELIVERY' ? 'border-[var(--gold)] bg-[var(--gold)]/5' : 'border-[var(--border)]'}`}>
                  <RadioGroupItem value="CASH_ON_DELIVERY" />
                  <Banknote className="h-5 w-5 text-[var(--gold)]" />
                  <div className="flex-1">
                    <div className="font-medium text-[var(--chocolate)]">Hotovosť pri doručení</div>
                    <div className="text-xs text-[var(--muted-foreground)]">Zaplatíte kuriérovi</div>
                  </div>
                </label>
              )}
              {deliveryType === 'PICKUP' && (
                <label className={`flex items-center gap-3 border rounded-lg p-4 cursor-pointer ${paymentMethod === 'CASH_ON_PICKUP' ? 'border-[var(--gold)] bg-[var(--gold)]/5' : 'border-[var(--border)]'}`}>
                  <RadioGroupItem value="CASH_ON_PICKUP" />
                  <Banknote className="h-5 w-5 text-[var(--gold)]" />
                  <div className="flex-1">
                    <div className="font-medium text-[var(--chocolate)]">Hotovosť pri prevzatí</div>
                    <div className="text-xs text-[var(--muted-foreground)]">Zaplatíte pri osobnom odbere</div>
                  </div>
                </label>
              )}
            </RadioGroup>
            <div className="mt-3 p-3 rounded-lg bg-[var(--secondary)]/40 text-xs text-[var(--muted-foreground)] flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-[var(--gold)] flex-shrink-0 mt-0.5" />
              <span>Konečnú cenu vypočíta server pri vytvorení objednávky. Sklad sa rezervuje transakčne.</span>
            </div>
          </Card>

          {/* Extras */}
          <Card className="p-6 bg-[var(--card)] border-[var(--border)]">
            <h2 className="font-display text-xl font-semibold text-[var(--chocolate)] mb-4">Doplnky a poznámky</h2>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox checked={giftPackaging} onCheckedChange={(v) => setGiftPackaging(!!v)} />
                <div>
                  <div className="font-medium text-[var(--chocolate)]">Darčekové balenie (+3,50 €)</div>
                  <div className="text-xs text-[var(--muted-foreground)]">Krásne zabalené do darčekovej krabice</div>
                </div>
              </label>
              <div className="space-y-2">
                <Label className="text-[var(--chocolate)]">Text na darčekovej kartičke (+1,50 €)</Label>
                <Input value={giftCardText} onChange={e => setGiftCardText(e.target.value)} placeholder="Všetko najlepšie..." maxLength={300} />
              </div>
              <div className="space-y-2">
                <Label className="text-[var(--chocolate)]">Promo kód</Label>
                <Input value={promoCode} onChange={e => setPromoCode(e.target.value)} placeholder="VITAJ10" />
              </div>
              <div className="space-y-2">
                <Label className="text-[var(--chocolate)]">Termín (voliteľné)</Label>
                <Input type="datetime-local" value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-[var(--chocolate)]">Poznámka k objednávke</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Špeciálne požiadavky..." maxLength={1000} />
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox checked={gdpr} onCheckedChange={(v) => setGdpr(!!v)} />
                <span className="text-sm text-[var(--muted-foreground)]">
                  Súhlasím so spracovaním osobných údajov pre účely vybavenia objednávky v zmysle GDPR.
                </span>
              </label>
            </div>
          </Card>
        </div>

        {/* Summary */}
        <div>
          <Card className="p-6 bg-[var(--card)] border-[var(--border)] sticky top-24">
            <h2 className="font-display text-xl font-semibold text-[var(--chocolate)] mb-4">Súhrn objednávky</h2>
            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto olajos-scroll">
              {items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <div className="flex-1">
                    <div className="font-medium text-[var(--chocolate)]">{item.productName}</div>
                    <div className="text-xs text-[var(--muted-foreground)]">
                      {item.variantName && <span>{item.variantName} · </span>}
                      {item.quantity}× {eur(item.unitPrice)}
                    </div>
                  </div>
                  <span className="font-medium text-[var(--gold)]">{eur(item.unitPrice * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-[var(--border)] pt-3 space-y-2 text-sm">
              <div className="flex justify-between text-[var(--muted-foreground)]">
                <span>Medzisúčet (orientačný)</span>
                <span>{eur(subtotal())}</span>
              </div>
              {giftPackaging && (
                <div className="flex justify-between text-[var(--muted-foreground)]">
                  <span>Darčekové balenie</span>
                  <span>+{eur(3.50)}</span>
                </div>
              )}
              {giftCardText && (
                <div className="flex justify-between text-[var(--muted-foreground)]">
                  <span>Kartička</span>
                  <span>+{eur(1.50)}</span>
                </div>
              )}
              {deliveryType === 'DELIVERY' && (
                <div className="flex justify-between text-[var(--muted-foreground)]">
                  <span>Doručenie</span>
                  <span>vypočíta server</span>
                </div>
              )}
              <div className="border-t border-[var(--border)] pt-2 flex justify-between font-semibold text-[var(--chocolate)]">
                <span>Orientačná celkom</span>
                <span>{eur(subtotal() + (giftPackaging ? 3.50 : 0) + (giftCardText ? 1.50 : 0))}</span>
              </div>
            </div>
            <Button
              className="w-full mt-4 bg-[var(--chocolate)] text-[var(--cream)] hover:bg-[var(--gold)] hover:text-[var(--chocolate)]"
              onClick={submit}
              disabled={submitting || !gdpr}
            >
              {submitting ? 'Spracúvavam...' : 'Vytvoriť objednávku'}
            </Button>
            <p className="text-xs text-[var(--muted-foreground)] mt-3 flex items-start gap-1.5">
              <Check className="h-3 w-3 text-[var(--gold)] flex-shrink-0 mt-0.5" />
              Bezpečná objednávka s transakčnou rezerváciou skladu.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
