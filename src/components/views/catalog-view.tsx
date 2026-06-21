'use client'

import { useEffect, useState, useMemo } from 'react'
import { useView } from '@/lib/stores'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { eur } from '@/lib/format'
import { Cake, Search, SlidersHorizontal } from 'lucide-react'
import { ProductImage } from '@/components/shared/product-image'

interface Category { id: string; name: string; slug: string }
interface CatalogProduct {
  id: string
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
  basePrice: number
  isFeatured: boolean
  productionLeadHours: number
  category: Category
  availableQty: number
  allergens: { code: string; name: string }[]
}

export function CatalogView() {
  const { navigate, params } = useView()
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState<string>(params.category || 'all')

  useEffect(() => {
    Promise.all([
      api.get<{ products: CatalogProduct[] }>('/api/catalog/products'),
      api.get<{ categories: Category[] }>('/api/catalog/categories'),
    ]).then(([p, c]) => {
      setProducts(p.products)
      setCategories(c.categories)
    }).finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return products.filter(p => {
      if (activeCat !== 'all' && p.category.slug !== activeCat) return false
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [products, activeCat, search])

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <div className="olajos-divider mb-4">
          <span className="font-display text-sm uppercase tracking-widest">Katalóg</span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-[var(--chocolate)] mb-3">Naša ponuka</h1>
        <p className="text-[var(--muted-foreground)] max-w-2xl mx-auto">
          Vyberte si z našich domácich tort, zákuskov a dezertov. Všetko pripravujeme čerstvé na objednávku.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
          <Input
            placeholder="Hľadať v ponuke..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-[var(--card)] border-[var(--border)]"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto olajos-scroll pb-1">
          <Button
            variant={activeCat === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCat('all')}
            className={activeCat === 'all' ? 'bg-[var(--chocolate)] text-[var(--cream)]' : 'border-[var(--border)] text-[var(--chocolate)]'}
          >
            Všetko
          </Button>
          {categories.map(c => (
            <Button
              key={c.id}
              variant={activeCat === c.slug ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveCat(c.slug)}
              className={activeCat === c.slug ? 'bg-[var(--chocolate)] text-[var(--cream)] whitespace-nowrap' : 'border-[var(--border)] text-[var(--chocolate)] whitespace-nowrap'}
            >
              {c.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="p-4 bg-[var(--card)] border-[var(--border)]">
              <Skeleton className="aspect-square w-full rounded-md mb-4" />
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-1/2" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[var(--muted-foreground)]">
          <Cake className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">Žiadne produkty nezodpovedajú filtru.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map(p => (
            <Card
              key={p.id}
              className="card-lift overflow-hidden bg-[var(--card)] border-[var(--border)] cursor-pointer flex flex-col"
              onClick={() => navigate('product', { slug: p.slug })}
            >
              <div className="aspect-square bg-gradient-to-br from-[var(--secondary)] to-[var(--cream)] flex items-center justify-center relative overflow-hidden">
                <ProductImage src={p.imageUrl} alt={p.name} className="h-full w-full" iconSize="h-20 w-20" />
                {p.isFeatured && (
                  <Badge className="absolute top-2 left-2 bg-[var(--gold)] text-[var(--gold-foreground)]">
                    Odporúčané
                  </Badge>
                )}
                {p.availableQty <= 0 && (
                  <Badge className="absolute top-2 right-2 bg-[var(--raspberry)] text-[var(--raspberry-foreground)]">
                    Vypredané
                  </Badge>
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="text-xs text-[var(--gold)] uppercase tracking-wide mb-1">{p.category.name}</div>
                <h3 className="font-display text-lg font-semibold text-[var(--chocolate)] mb-1">{p.name}</h3>
                <p className="text-sm text-[var(--muted-foreground)] line-clamp-2 mb-3 flex-1">{p.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-[var(--gold)]">{eur(p.basePrice)}</span>
                  <span className="text-xs text-[var(--muted-foreground)]">od {p.productionLeadHours} h</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
