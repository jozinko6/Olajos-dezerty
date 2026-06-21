'use client'

import { useEffect, useState } from 'react'
import { useView } from '@/lib/stores'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { eur } from '@/lib/format'
import { Cake, Truck, Award, Heart, Clock, MapPin, Star, ArrowRight } from 'lucide-react'
import { ProductImage } from '@/components/shared/product-image'

interface CatalogProduct {
  id: string
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
  basePrice: number
  isFeatured: boolean
  productionLeadHours: number
  category: { id: string; name: string; slug: string }
  availableQty: number
  allergens: { code: string; name: string }[]
}

export function HomeView() {
  const { navigate } = useView()
  const [featured, setFeatured] = useState<CatalogProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<{ products: CatalogProduct[] }>('/api/catalog/products?featured=1')
      .then(r => setFeatured(r.products))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-paper-texture overflow-hidden">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              <Badge className="bg-[var(--gold)]/15 text-[var(--gold)] border-[var(--gold)]/30 hover:bg-[var(--gold)]/20">
                <Star className="h-3 w-3 mr-1" /> Prémiová cukráreň v Hlohovci
              </Badge>
              <h1 className="font-display text-4xl md:text-6xl font-bold text-[var(--chocolate)] leading-tight">
                Torty a dezerty <span className="text-gold-gradient">s láskou</span> k detailu
              </h1>
              <p className="text-lg text-[var(--muted-foreground)] max-w-lg">
                Domáce torty na mieru, čerstvé zákusky a prémiový catering. Všetko pripravujeme z tých najlepších surovín a doručujeme až k vám domov.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" className="bg-[var(--chocolate)] text-[var(--cream)] hover:bg-[var(--gold)] hover:text-[var(--chocolate)]" onClick={() => navigate('catalog')}>
                  Prejsť na ponuku <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button size="lg" variant="outline" className="border-[var(--gold)] text-[var(--chocolate)] hover:bg-[var(--gold)]/10" onClick={() => navigate('custom-cake')}>
                  Torta na mieru
                </Button>
              </div>
              <div className="flex items-center gap-6 pt-4 text-sm text-[var(--muted-foreground)]">
                <span className="flex items-center gap-2"><Truck className="h-4 w-4 text-[var(--gold)]" /> Doručenie do 24 h</span>
                <span className="flex items-center gap-2"><Award className="h-4 w-4 text-[var(--gold)]" /> Vernostné body</span>
                <span className="flex items-center gap-2"><Heart className="h-4 w-4 text-[var(--raspberry)]" /> Domáce receptúry</span>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-full bg-gradient-to-br from-[var(--gold)] via-[var(--raspberry)] to-[var(--chocolate)] p-1 shadow-2xl overflow-hidden">
                <div className="h-full w-full rounded-full overflow-hidden bg-[var(--cream)]">
                  <img src="/products/hero-cake.png" alt="Olajos Dezerty torta" className="h-full w-full object-cover" />
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 bg-[var(--card)] rounded-lg shadow-lg p-4 border border-[var(--gold)]/30">
                <div className="text-2xl font-bold text-[var(--gold)]">100%</div>
                <div className="text-xs text-[var(--muted-foreground)]">čerstvé suroviny</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured products */}
      <section className="container mx-auto px-4 py-16">
        <div className="olajos-divider mb-10">
          <span className="font-display text-sm uppercase tracking-widest">Naše odporúčané</span>
        </div>
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center text-[var(--chocolate)] mb-10">
          Obľúbené torty a dezerty
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-4 bg-[var(--card)] border-[var(--border)]">
                <Skeleton className="aspect-video w-full rounded-md mb-4" />
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-2/3" />
              </Card>
            ))
          ) : (
            featured.map(p => (
              <Card key={p.id} className="card-lift overflow-hidden bg-[var(--card)] border-[var(--border)] cursor-pointer" onClick={() => navigate('product', { slug: p.slug })}>
                <div className="aspect-video bg-gradient-to-br from-[var(--secondary)] to-[var(--cream)] overflow-hidden">
                  <ProductImage src={p.imageUrl} alt={p.name} className="h-full w-full" iconSize="h-16 w-16" />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-display text-lg font-semibold text-[var(--chocolate)]">{p.name}</h3>
                    {p.availableQty <= 0 && <Badge variant="secondary" className="bg-[var(--raspberry)]/15 text-[var(--raspberry)]">Vypredané</Badge>}
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)] line-clamp-2 mb-3">{p.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-[var(--gold)]">{eur(p.basePrice)}</span>
                    <Button size="sm" variant="outline" className="border-[var(--gold)] text-[var(--chocolate)] hover:bg-[var(--gold)] hover:text-[var(--chocolate)]">
                      Detail
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
        <div className="text-center mt-10">
          <Button variant="outline" size="lg" className="border-[var(--chocolate)] text-[var(--chocolate)] hover:bg-[var(--chocolate)] hover:text-[var(--cream)]" onClick={() => navigate('catalog')}>
            Zobraziť celú ponuku <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* Why us */}
      <section className="bg-[var(--chocolate)] text-[var(--cream)] py-16">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-12 text-[var(--gold)]">
            Prečo si vybrať Olajos Dezerty
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { icon: Heart, title: 'Domáce receptúry', text: 'Tradičné postupy a osvedčené recepty našej rodiny.' },
              { icon: Award, title: 'Prémiové suroviny', text: 'Belgická čokoláda, čerstvé ovocie a mliečne produkty.' },
              { icon: Truck, title: 'Rýchle doručenie', text: 'Doručujeme do Hlohovca a okolitých obcí do 24 hodín.' },
              { icon: Clock, title: 'Termín na mieru', text: 'Objednajte si vopred a my pripravíme presne na váš termín.' },
            ].map((f, i) => (
              <div key={i} className="text-center">
                <div className="h-16 w-16 rounded-full bg-[var(--gold)]/20 mx-auto flex items-center justify-center mb-4">
                  <f.icon className="h-7 w-7 text-[var(--gold)]" />
                </div>
                <h3 className="font-semibold mb-2 text-[var(--cream)]">{f.title}</h3>
                <p className="text-sm text-[var(--cream)]/70">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="olajos-divider mb-6">
          <span className="font-display text-sm uppercase tracking-widest">Naplánujeme spolu</span>
        </div>
        <h2 className="font-display text-3xl md:text-4xl font-bold text-[var(--chocolate)] mb-4">
          Plánujete svadbu, narodeniny alebo firemnú akciu?
        </h2>
        <p className="text-[var(--muted-foreground)] max-w-2xl mx-auto mb-8">
          Navrhneme tortu presne podľa vašich predstáv — chuť, vzhľad, veľkosť aj termín. Alebo pripravíme kompletný catering pre vašu udalosť.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button size="lg" className="bg-[var(--raspberry)] text-[var(--raspberry-foreground)] hover:bg-[var(--raspberry)]/90" onClick={() => navigate('custom-cake')}>
            Torta na mieru
          </Button>
          <Button size="lg" variant="outline" className="border-[var(--chocolate)] text-[var(--chocolate)] hover:bg-[var(--chocolate)] hover:text-[var(--cream)]" onClick={() => navigate('catering')}>
            Catering na akciu
          </Button>
        </div>
      </section>
    </div>
  )
}
