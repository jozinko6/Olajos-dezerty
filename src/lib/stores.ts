// src/lib/stores.ts
// Client-side stores: view router, auth, cart.
'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// --- View router (single-page app on `/`) ---
export type ViewName =
  | 'home'
  | 'catalog'
  | 'product'
  | 'cart'
  | 'checkout'
  | 'tracking'
  | 'account'
  | 'login'
  | 'register'
  | 'custom-cake'
  | 'catering'
  | 'admin'
  | 'production'
  | 'packing'
  | 'dispatch'
  | 'courier'
  | 'staff-login'

interface ViewState {
  view: ViewName
  params: Record<string, string>
  navigate: (view: ViewName, params?: Record<string, string>) => void
}

export const useView = create<ViewState>((set) => ({
  view: 'home',
  params: {},
  navigate: (view, params = {}) => {
    set({ view, params })
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  },
}))

// --- Auth ---
export interface CurrentUser {
  id: string
  email: string
  fullName: string | null
  phone: string | null
  role: string
  emailVerified: boolean
  courierId?: string
  loyalty?: { points: number; lifetimePoints: number }
}

interface AuthState {
  user: CurrentUser | null
  loading: boolean
  setUser: (u: CurrentUser | null) => void
  setLoading: (b: boolean) => void
  refresh: () => Promise<void>
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  refresh: async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'same-origin' })
      const json = await res.json()
      set({ user: json.user, loading: false })
    } catch {
      set({ user: null, loading: false })
    }
  },
}))

// --- Cart ---
export interface CartItem {
  productId: string
  productName: string
  productSlug: string
  imageUrl?: string
  basePrice: number
  variantId?: string
  variantName?: string
  variantPriceDelta: number
  optionIds: string[]
  optionNames: string[]
  optionsPriceDelta: number
  quantity: number
  unitPrice: number // computed client-side for display only; server recomputes
}

interface CartState {
  items: CartItem[]
  add: (item: CartItem) => void
  remove: (productId: string, variantId?: string) => void
  setQty: (productId: string, variantId: string | undefined, qty: number) => void
  clear: () => void
  count: () => number
  subtotal: () => number
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) => {
        const items = [...get().items]
        const idx = items.findIndex(i => i.productId === item.productId && i.variantId === item.variantId && JSON.stringify(i.optionIds.sort()) === JSON.stringify([...item.optionIds].sort()))
        if (idx >= 0) {
          items[idx] = { ...items[idx], quantity: items[idx].quantity + item.quantity }
        } else {
          items.push(item)
        }
        set({ items })
      },
      remove: (productId, variantId) => {
        set({ items: get().items.filter(i => !(i.productId === productId && i.variantId === variantId)) })
      },
      setQty: (productId, variantId, qty) => {
        const items = get().items.map(i =>
          i.productId === productId && i.variantId === variantId
            ? { ...i, quantity: Math.max(1, qty) }
            : i
        )
        set({ items })
      },
      clear: () => set({ items: [] }),
      count: () => get().items.reduce((s, i) => s + i.quantity, 0),
      subtotal: () => get().items.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
    }),
    { name: 'olajos-cart', storage: createJSONStorage(() => localStorage) },
  ),
)
