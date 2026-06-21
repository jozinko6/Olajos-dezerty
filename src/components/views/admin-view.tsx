'use client'

import { useEffect, useState } from 'react'
import { useView, useAuth } from '@/lib/stores'
import { api, ApiError } from '@/lib/api-client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { eur, skDateTime } from '@/lib/format'
import { STATUS_LABELS } from '@/lib/orderStateMachine'
import { toast } from 'sonner'
import { Package, Boxes, ClipboardList, Upload, Plus, Pencil, AlertTriangle, Cake } from 'lucide-react'

interface AdminProduct {
  id: string
  name: string
  slug: string
  description: string | null
  basePrice: number
  isActive: boolean
  isFeatured: boolean
  productionLeadHours: number
  minOrderQty: number
  maxOrderQty: number
  taxRate: number
  category: { id: string; name: string }
  variants: { id: string; name: string; priceDelta: number }[]
  inventory: { quantity: number; reservedQty: number; branch: { name: string } }[]
}
interface Category { id: string; name: string; slug: string }
interface InventoryItem {
  id: string
  quantity: number
  reservedQty: number
  minThreshold: number
  productId: string
  branchId: string
  product: { id: string; name: string; slug: string }
  branch: { id: string; name: string }
}
interface AdminOrder {
  id: string
  orderNumber: string
  status: string
  total: number
  createdAt: string
  deliveryType: string
  paymentMethod: string
  items: { productName: string; quantity: number }[]
  customer: { email: string; fullName: string | null; phone: string | null } | null
}

export function AdminView() {
  const { user } = useAuth()
  const [tab, setTab] = useState('products')

  if (!user) return <div className="container mx-auto px-4 py-20"><Skeleton className="h-40 w-full" /></div>

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-[var(--chocolate)] mb-2">Administrácia</h1>
        <p className="text-[var(--muted-foreground)]">Správa produktov, skladu a objednávok. Prihlásený: {user.email} ({user.role})</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-[var(--secondary)]">
          <TabsTrigger value="products" className="data-[state=active]:bg-[var(--chocolate)] data-[state=active]:text-[var(--cream)]"><Package className="h-4 w-4 mr-1" /> Produkty</TabsTrigger>
          <TabsTrigger value="inventory" className="data-[state=active]:bg-[var(--chocolate)] data-[state=active]:text-[var(--cream)]"><Boxes className="h-4 w-4 mr-1" /> Sklad</TabsTrigger>
          <TabsTrigger value="orders" className="data-[state=active]:bg-[var(--chocolate)] data-[state=active]:text-[var(--cream)]"><ClipboardList className="h-4 w-4 mr-1" /> Objednávky</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-6"><ProductsTab /></TabsContent>
        <TabsContent value="inventory" className="mt-6"><InventoryTab /></TabsContent>
        <TabsContent value="orders" className="mt-6"><OrdersTab /></TabsContent>
      </Tabs>
    </div>
  )
}

function ProductsTab() {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AdminProduct | null>(null)
  const [creating, setCreating] = useState(false)

  const load = () => {
    Promise.all([
      api.get<{ products: AdminProduct[] }>('/api/admin/products'),
      api.get<{ categories: Category[] }>('/api/catalog/categories'),
    ]).then(([p, c]) => { setProducts(p.products); setCategories(c.categories) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  if (loading) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-display text-xl font-semibold text-[var(--chocolate)]">Produkty ({products.length})</h2>
        <Button onClick={() => setCreating(true)} className="bg-[var(--chocolate)] text-[var(--cream)] hover:bg-[var(--gold)] hover:text-[var(--chocolate)]">
          <Plus className="h-4 w-4 mr-1" /> Nový produkt
        </Button>
      </div>

      <div className="space-y-2">
        {products.map(p => (
          <Card key={p.id} className="p-4 bg-[var(--card)] border-[var(--border)] flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-[var(--chocolate)]">{p.name}</span>
                {p.isFeatured && <Badge className="bg-[var(--gold)]/15 text-[var(--gold)]">Odporúčané</Badge>}
                {!p.isActive && <Badge variant="secondary">Neaktívne</Badge>}
              </div>
              <div className="text-sm text-[var(--muted-foreground)]">
                {p.category.name} · {eur(p.basePrice)} · sklad: {p.inventory[0]?.quantity ?? 0} ks (rezervované {p.inventory[0]?.reservedQty ?? 0})
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setEditing(p)} className="border-[var(--gold)] text-[var(--chocolate)]">
              <Pencil className="h-3 w-3 mr-1" /> Upraviť
            </Button>
          </Card>
        ))}
      </div>

      {(editing || creating) && (
        <ProductDialog
          product={editing}
          categories={categories}
          onClose={() => { setEditing(null); setCreating(false) }}
          onSaved={() => { setEditing(null); setCreating(false); load() }}
        />
      )}
    </div>
  )
}

function ProductDialog({ product, categories, onClose, onSaved }: {
  product: AdminProduct | null
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(product?.name || '')
  const [slug, setSlug] = useState(product?.slug || '')
  const [description, setDescription] = useState(product?.description || '')
  const [longDescription, setLongDescription] = useState(product?.longDescription || '')
  const [categoryId, setCategoryId] = useState(product?.category.id || categories[0]?.id || '')
  const [basePrice, setBasePrice] = useState(String(product?.basePrice ?? ''))
  const [productionLeadHours, setProductionLeadHours] = useState(String(product?.productionLeadHours ?? 24))
  const [isActive, setIsActive] = useState(product?.isActive ?? true)
  const [isFeatured, setIsFeatured] = useState(product?.isFeatured ?? false)
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const res = await api.upload<{ url: string }>('/api/upload', file)
      setImageUrl(res.url)
      toast.success('Obrázok nahraný.')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      const payload = {
        name, slug: slug || undefined,
        description, longDescription,
        categoryId, basePrice: parseFloat(basePrice),
        productionLeadHours: parseInt(productionLeadHours),
        isActive, isFeatured, imageUrl,
      }
      if (product) {
        await api.patch('/api/admin/products', { id: product.id, ...payload })
      } else {
        await api.post('/api/admin/products', payload)
      }
      toast.success('Produkt uložený.')
      onSaved()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[var(--card)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--chocolate)]">{product ? 'Upraviť produkt' : 'Nový produkt'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[var(--chocolate)]">Názov</Label>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--chocolate)]">Slug (ponechajte prázdne pre auto)</Label>
              <Input value={slug} onChange={e => setSlug(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[var(--chocolate)]">Kategória</Label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="flex h-10 w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm">
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[var(--chocolate)]">Základná cena (€)</Label>
              <Input type="number" step="0.01" value={basePrice} onChange={e => setBasePrice(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--chocolate)]">Doba výroby (h)</Label>
              <Input type="number" value={productionLeadHours} onChange={e => setProductionLeadHours(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[var(--chocolate)]">Krátky popis</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2">
            <Label className="text-[var(--chocolate)]">Dlhý popis</Label>
            <Textarea value={longDescription} onChange={e => setLongDescription(e.target.value)} rows={4} />
          </div>

          {/* Image upload from PC */}
          <div className="space-y-2">
            <Label className="text-[var(--chocolate)]">Obrázok produktu</Label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
                />
                <span className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--gold)] rounded-md text-sm text-[var(--chocolate)] hover:bg-[var(--gold)]/10">
                  <Upload className="h-4 w-4" /> {uploading ? 'Nahrávam...' : 'Nahrať z PC'}
                </span>
              </label>
              {imageUrl && (
                <div className="flex items-center gap-2">
                  <div className="h-12 w-12 rounded bg-[var(--secondary)] flex items-center justify-center overflow-hidden">
                    {imageUrl.startsWith('/uploads/') || imageUrl.startsWith('/products/') ? (
                      <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Cake className="h-6 w-6 text-[var(--gold)]" />
                    )}
                  </div>
                  <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="flex-1" />
                </div>
              )}
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">JPG, PNG, WebP, AVIF · max 5 MB · MIME validácia server-side.</p>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
              <span className="text-sm text-[var(--chocolate)]">Aktívny</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} />
              <span className="text-sm text-[var(--chocolate)]">Odporúčané</span>
            </label>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t border-[var(--border)]">
            <Button variant="outline" onClick={onClose}>Zrušiť</Button>
            <Button onClick={save} disabled={saving} className="bg-[var(--chocolate)] text-[var(--cream)] hover:bg-[var(--gold)] hover:text-[var(--chocolate)]">
              {saving ? 'Ukladám...' : 'Uložiť'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function InventoryTab() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [lowStock, setLowStock] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [newQty, setNewQty] = useState('')

  const load = () => {
    api.get<{ items: InventoryItem[]; lowStock: InventoryItem[] }>('/api/admin/inventory')
      .then(r => { setItems(r.items); setLowStock(r.lowStock) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const adjust = async () => {
    if (!editing) return
    try {
      await api.post('/api/admin/inventory', {
        productId: editing.productId,
        branchId: editing.branchId,
        newQuantity: parseInt(newQty),
        reason: 'manual adjust',
      })
      toast.success('Sklad upravený.')
      setEditing(null)
      load()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  if (loading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>

  return (
    <div>
      {lowStock.length > 0 && (
        <Card className="p-4 mb-4 bg-[var(--raspberry)]/10 border-[var(--raspberry)]/30">
          <div className="flex items-center gap-2 text-[var(--raspberry)] font-medium mb-2">
            <AlertTriangle className="h-4 w-4" /> Nízky stav skladu ({lowStock.length})
          </div>
          <div className="text-sm text-[var(--chocolate)]">
            {lowStock.map(i => i.product.name).join(', ')}
          </div>
        </Card>
      )}
      <div className="space-y-2">
        {items.map(item => (
          <Card key={item.id} className="p-4 bg-[var(--card)] border-[var(--border)] flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="font-medium text-[var(--chocolate)]">{item.product.name}</div>
              <div className="text-sm text-[var(--muted-foreground)]">{item.branch.name}</div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-[var(--chocolate)]">{item.quantity} ks</div>
              <div className="text-xs text-[var(--muted-foreground)]">rezervované: {item.reservedQty} · min: {item.minThreshold}</div>
            </div>
            <Button size="sm" variant="outline" onClick={() => { setEditing(item); setNewQty(String(item.quantity)) }} className="border-[var(--gold)] text-[var(--chocolate)]">
              Upraviť
            </Button>
          </Card>
        ))}
      </div>

      {editing && (
        <Dialog open onOpenChange={() => setEditing(null)}>
          <DialogContent className="bg-[var(--card)]">
            <DialogHeader>
              <DialogTitle className="text-[var(--chocolate)]">Upraviť sklad: {editing.product.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[var(--chocolate)]">Nové množstvo</Label>
                <Input type="number" min={0} value={newQty} onChange={e => setNewQty(e.target.value)} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditing(null)}>Zrušiť</Button>
                <Button onClick={adjust} className="bg-[var(--chocolate)] text-[var(--cream)] hover:bg-[var(--gold)] hover:text-[var(--chocolate)]">Uložiť</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function OrdersTab() {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  const load = () => {
    api.get<{ orders: AdminOrder[] }>('/api/admin/orders')
      .then(r => setOrders(r.orders))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const filtered = filter ? orders.filter(o => o.status === filter) : orders

  if (loading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>

  return (
    <div>
      <div className="flex gap-2 mb-4 overflow-x-auto olajos-scroll pb-1">
        <Button size="sm" variant={filter === '' ? 'default' : 'outline'} onClick={() => setFilter('')} className={filter === '' ? 'bg-[var(--chocolate)] text-[var(--cream)]' : ''}>Všetko</Button>
        {Object.entries(STATUS_LABELS).slice(0, 12).map(([k, v]) => (
          <Button key={k} size="sm" variant={filter === k ? 'default' : 'outline'} onClick={() => setFilter(k)} className={`whitespace-nowrap ${filter === k ? 'bg-[var(--chocolate)] text-[var(--cream)]' : ''}`}>{v}</Button>
        ))}
      </div>
      <div className="space-y-2">
        {filtered.map(o => (
          <Card key={o.id} className="p-4 bg-[var(--card)] border-[var(--border)]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-[var(--chocolate)]">{o.orderNumber}</span>
                  <Badge variant="outline" className="border-[var(--gold)]/40 text-[var(--gold)]">{STATUS_LABELS[o.status as keyof typeof STATUS_LABELS] || o.status}</Badge>
                  <Badge variant="secondary">{o.paymentMethod}</Badge>
                </div>
                <div className="text-xs text-[var(--muted-foreground)] mb-1">{skDateTime(o.createdAt)} · {o.deliveryType === 'DELIVERY' ? 'Doručenie' : 'Osobný odber'}</div>
                <div className="text-sm text-[var(--muted-foreground)] truncate">
                  {o.items.map(i => `${i.quantity}× ${i.productName}`).join(', ')}
                </div>
                {o.customer && <div className="text-xs text-[var(--muted-foreground)] mt-1">{o.customer.email}</div>}
              </div>
              <div className="text-right">
                <div className="font-bold text-[var(--gold)]">{eur(o.total)}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
