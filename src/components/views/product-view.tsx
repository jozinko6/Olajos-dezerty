'use client'

import { useEffect, useState } from 'react'
import { useView, useCart } from '@/lib/stores'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { eur } from '@/lib/format'
import { toast } from 'sonner'
import { Cake, ShoppingCart, ArrowLeft, Clock, Check, AlertCircle } from 'lucide-react'
import { ProductImage } from '@/components/shared/product-image'

interface ProductDetail {
  id: string
  name: string
  slug: string
  description: string | null
  longDescription: string | null
  imageUrl: string | null
  basePrice: number
  isFeatured: boolean
  productionLeadHours: number
  minOrderQty: number
  maxOrderQty: number
  taxRate: number
  category: { id: string; name: string; slug: string }
  variants: { id: string; name: string; priceDelta: number }[]
  optionGroups: {
    id: string; name: string; isRequired: boolean; maxSelect: number
    options: { id: string; name: string; priceDelta: number }[]
  }[]
  allergens: { code: string; name: string }[]
  availableQty: number
}

export function ProductView() {
  const { params, navigate } = useView()
  const { add } = useCart()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)
  const [variantId, setVariantId] = useState<string | undefined>(undefined)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({})

  useEffect(() => {
    if (!params.slug) { navigate('catalog'); return }
    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        const r = await api.get<{ product: ProductDetail }>(`/api/catalog/product?slug=${params.slug}`)
        if (cancelled) return
        setProduct(r.product)
        setVariantId(r.product.variants[0]?.id)
        setQty(r.product.minOrderQty)
      } catch {
        if (!cancelled) navigate('catalog')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [params.slug, navigate])

  const variant = product?.variants.find(v => v.id === variantId)
  const optionsDelta = Object.values(selectedOptions).flat().reduce((s, id) => {
    const opt = product?.optionGroups.flatMap(g => g.options).find(o => o.id === id)
    return s + (opt?.priceDelta ?? 0)
  }, 0)
  const unitPrice = (product?.basePrice ?? 0) + (variant?.priceDelta ?? 0) + optionsDelta

  const toggleOption = (groupId: string, optionId: string, maxSelect: number) => {
    setSelectedOptions(prev => {
      const current = prev[groupId] ?? []
      if (current.includes(optionId)) {
        return { ...prev, [groupId]: current.filter(id => id !== optionId) }
      }
      if (maxSelect === 1) {
        return { ...prev, [groupId]: [optionId] }
      }
      if (current.length >= maxSelect) {
        toast.warning(`Maximálne ${maxSelect} možnosti.`)
        return prev
      }
      return { ...prev, [groupId]: [...current, optionId] }
    })
  }

  const handleAddToCart = () => {
    if (!product) return
    if (product.availableQty <= 0) {
      toast.error('Produkt je vypredaný.')
      return
    }
    const optionNames: string[] = []
    Object.entries(selectedOptions).forEach(([groupId, ids]) => {
      const group = product.optionGroups.find(g => g.id === groupId)
      ids.forEach(id => {
        const opt = group?.options.find(o => o.id === id)
        if (opt) optionNames.push(opt.name)
      })
    })
    add({
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      imageUrl: product.imageUrl ?? undefined,
      basePrice: product.basePrice,
      variantId,
      variantName: variant?.name,
      variantPriceDelta: variant?.priceDelta ?? 0,
      optionIds: Object.values(selectedOptions).flat(),
      optionNames,
      optionsPriceDelta: optionsDelta,
      quantity: qty,
      unitPrice,
    })
    toast.success(`${product.name} pridaný do košíka.`)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!product) return null

  return (
    <div className="container mx-auto px-4 py-10">
      <Button variant="ghost" className="mb-6 text-[var(--chocolate)]" onClick={() => navigate('catalog')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Späť na ponuku
      </Button>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Image */}
        <div>
          <div className="aspect-square rounded-2xl bg-gradient-to-br from-[var(--secondary)] to-[var(--cream)] flex items-center justify-center border border-[var(--gold)]/20 overflow-hidden">
            <ProductImage src={product.imageUrl} alt={product.name} className="h-full w-full" iconSize="h-40 w-40" />
          </div>
          {product.allergens.length > 0 && (
            <div className="mt-4">
              <div className="text-xs uppercase tracking-wide text-[var(--muted-foreground)] mb-2">Alergény</div>
              <div className="flex flex-wrap gap-2">
                {product.allergens.map(a => (
                  <Badge key={a.code} variant="outline" className="border-[var(--raspberry)]/40 text-[var(--raspberry)]">
                    <AlertCircle className="h-3 w-3 mr-1" /> {a.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-5">
          <div>
            <div className="text-sm text-[var(--gold)] uppercase tracking-wide mb-1">{product.category.name}</div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-[var(--chocolate)]">{product.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-[var(--gold)]">{eur(unitPrice)}</span>
            {variant && variant.priceDelta !== 0 && (
              <span className="text-sm text-[var(--muted-foreground)] line-through">{eur(product.basePrice)}</span>
            )}
          </div>
          {product.description && <p className="text-[var(--foreground)]">{product.description}</p>}
          {product.longDescription && <p className="text-sm text-[var(--muted-foreground)]">{product.longDescription}</p>}

          <div className="flex items-center gap-4 text-sm text-[var(--muted-foreground)]">
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-[var(--gold)]" /> Pripravíme do {product.productionLeadHours} h</span>
            <span className="flex items-center gap-1.5">
              {product.availableQty > 0 ? (
                <><Check className="h-4 w-4 text-[var(--gold)]" /> Skladom ({product.availableQty} ks)</>
              ) : (
                <><AlertCircle className="h-4 w-4 text-[var(--raspberry)]" /> Vypredané</>
              )}
            </span>
          </div>

          {/* Variants */}
          {product.variants.length > 0 && (
            <div>
              <Label className="text-[var(--chocolate)] font-medium">Veľkosť / variant</Label>
              <RadioGroup value={variantId} onValueChange={setVariantId} className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                {product.variants.map(v => (
                  <div key={v.id} className="flex items-center space-x-2 border border-[var(--border)] rounded-lg p-3 cursor-pointer hover:border-[var(--gold)] has-[:checked]:border-[var(--gold)] has-[:checked]:bg-[var(--gold)]/5">
                    <RadioGroupItem value={v.id} id={`v-${v.id}`} />
                    <Label htmlFor={`v-${v.id}`} className="cursor-pointer flex-1">
                      <div className="text-sm font-medium text-[var(--chocolate)]">{v.name}</div>
                      {v.priceDelta !== 0 && <div className="text-xs text-[var(--gold)]">+{eur(v.priceDelta)}</div>}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Option groups */}
          {product.optionGroups.map(g => (
            <div key={g.id}>
              <Label className="text-[var(--chocolate)] font-medium">{g.name}</Label>
              <div className="space-y-2 mt-2">
                {g.options.map(o => {
                  const checked = (selectedOptions[g.id] ?? []).includes(o.id)
                  return (
                    <label key={o.id} className="flex items-center gap-3 border border-[var(--border)] rounded-lg p-3 cursor-pointer hover:border-[var(--gold)] has-[:checked]:border-[var(--gold)] has-[:checked]:bg-[var(--gold)]/5">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleOption(g.id, o.id, g.maxSelect)}
                      />
                      <span className="flex-1 text-sm text-[var(--chocolate)]">{o.name}</span>
                      {o.priceDelta !== 0 && <span className="text-sm text-[var(--gold)]">+{eur(o.priceDelta)}</span>}
                    </label>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Quantity & add to cart */}
          <div className="flex items-end gap-3 pt-4">
            <div>
              <Label className="text-[var(--chocolate)] font-medium">Množstvo</Label>
              <div className="flex items-center gap-2 mt-2 border border-[var(--border)] rounded-lg p-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setQty(Math.max(product.minOrderQty, qty - 1))}>−</Button>
                <span className="w-10 text-center font-medium">{qty}</span>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setQty(Math.min(product.maxOrderQty, qty + 1))}>+</Button>
              </div>
            </div>
            <Button
              size="lg"
              className="flex-1 bg-[var(--chocolate)] text-[var(--cream)] hover:bg-[var(--gold)] hover:text-[var(--chocolate)]"
              onClick={handleAddToCart}
              disabled={product.availableQty <= 0}
            >
              <ShoppingCart className="h-4 w-4 mr-2" /> Pridať do košíka · {eur(unitPrice * qty)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
