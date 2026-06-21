'use client'

import { useState } from 'react'
import { useView } from '@/lib/stores'
import { api, ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Utensils, Calendar, Users, Euro, MapPin, Check } from 'lucide-react'

export function CateringView() {
  const { navigate } = useView()
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const [form, setForm] = useState({
    contactName: '', contactEmail: '', contactPhone: '',
    eventType: 'Svadba', eventDate: '', eventLocation: '', guestCount: 50,
    services: '', budgetFrom: '', budgetTo: '', message: '',
    gdprConsent: false as boolean, contactConsent: false as boolean,
  })

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.gdprConsent || !form.contactConsent) {
      toast.error('Musíte súhlasiť s podmienkami.')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/api/catering', {
        ...form,
        eventDate: form.eventDate ? new Date(form.eventDate).toISOString() : new Date().toISOString(),
        budgetFrom: form.budgetFrom ? parseFloat(form.budgetFrom) : undefined,
        budgetTo: form.budgetTo ? parseFloat(form.budgetTo) : undefined,
        guestCount: Number(form.guestCount),
      })
      setDone(true)
      toast.success('Dopyt na catering bol odoslaný.')
    } catch (e: any) {
      if (e instanceof ApiError) toast.error(e.message)
      else toast.error('Nastala chyba.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="container mx-auto px-4 py-20">
        <Card className="max-w-lg mx-auto p-10 text-center bg-[var(--card)] border-[var(--gold)]/30">
          <div className="h-16 w-16 rounded-full bg-[var(--gold)]/15 flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-[var(--gold)]" />
          </div>
          <h1 className="font-display text-2xl font-bold text-[var(--chocolate)] mb-2">Ďakujeme za dopyt!</h1>
          <p className="text-[var(--muted-foreground)] mb-6">
            Pripravíme vám cenový návrh cateringového balíka a ozveme sa čo najskôr.
          </p>
          <Button onClick={() => navigate('home')} className="bg-[var(--chocolate)] text-[var(--cream)] hover:bg-[var(--gold)] hover:text-[var(--chocolate)]">
            Späť domov
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="olajos-divider mb-4">
            <span className="font-display text-sm uppercase tracking-widest">Catering</span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-[var(--chocolate)] mb-3">Catering na vašu udalosť</h1>
          <p className="text-[var(--muted-foreground)]">
            Svadby, firemné akcie, oslavy, candy bary. Pripravíme dezerty presne podľa vašich predstáv.
          </p>
        </div>

        <Card className="p-6 bg-[var(--card)] border-[var(--border)]">
          <form onSubmit={submit} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[var(--chocolate)]">Meno a priezvisko *</Label>
                <Input value={form.contactName} onChange={e => set('contactName', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label className="text-[var(--chocolate)]">Telefón *</Label>
                <Input value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} required placeholder="+421 900 000 000" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--chocolate)]">E-mail *</Label>
              <Input type="email" value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} required />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[var(--chocolate)]">Typ akcie *</Label>
                <select
                  value={form.eventType}
                  onChange={e => set('eventType', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm"
                >
                  <option>Svadba</option>
                  <option>Firemná akcia</option>
                  <option>Oslava</option>
                  <option>Candy bar</option>
                  <option>Krstiny</option>
                  <option>Iné</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-[var(--chocolate)] flex items-center gap-1"><Calendar className="h-3 w-3" /> Dátum akcie *</Label>
                <Input type="date" value={form.eventDate} onChange={e => set('eventDate', e.target.value)} required />
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-[var(--chocolate)] flex items-center gap-1"><Users className="h-3 w-3" /> Počet hostí *</Label>
                <Input type="number" min={1} value={form.guestCount} onChange={e => set('guestCount', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label className="text-[var(--chocolate)] flex items-center gap-1"><Euro className="h-3 w-3" /> Rozpočet od (€)</Label>
                <Input type="number" min={0} value={form.budgetFrom} onChange={e => set('budgetFrom', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-[var(--chocolate)] flex items-center gap-1"><Euro className="h-3 w-3" /> Rozpočet do (€)</Label>
                <Input type="number" min={0} value={form.budgetTo} onChange={e => set('budgetTo', e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[var(--chocolate)] flex items-center gap-1"><MapPin className="h-3 w-3" /> Miesto konania *</Label>
              <Input value={form.eventLocation} onChange={e => set('eventLocation', e.target.value)} required placeholder="Reštaurácia, sála, adresa..." />
            </div>

            <div className="space-y-2">
              <Label className="text-[var(--chocolate)]">Služby (dezertový stôl, torta, zákusky, obsluha...)</Label>
              <Input value={form.services} onChange={e => set('services', e.target.value)} placeholder="Aké služby potrebujete?" />
            </div>

            <div className="space-y-2">
              <Label className="text-[var(--chocolate)]">Detaily a požiadavky *</Label>
              <Textarea value={form.message} onChange={e => set('message', e.target.value)} rows={5} required placeholder="Téma, farby, špecifické požiadavky..." />
            </div>

            <div className="space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox checked={form.gdprConsent} onCheckedChange={(v) => set('gdprConsent', !!v)} />
                <span className="text-sm text-[var(--muted-foreground)]">Súhlasím so spracovaním osobných údajov v zmysle GDPR.</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox checked={form.contactConsent} onCheckedChange={(v) => set('contactConsent', !!v)} />
                <span className="text-sm text-[var(--muted-foreground)]">Súhlasím so kontaktovaním za účelom vybavenia dopytu.</span>
              </label>
            </div>

            <Button type="submit" className="w-full bg-[var(--chocolate)] text-[var(--cream)] hover:bg-[var(--gold)] hover:text-[var(--chocolate)]" disabled={submitting}>
              <Utensils className="h-4 w-4 mr-2" /> {submitting ? 'Odosielam...' : 'Odoslať dopyt na catering'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
