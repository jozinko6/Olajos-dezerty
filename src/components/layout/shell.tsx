'use client'

import { useEffect, useState } from 'react'
import { useView, useAuth, useCart } from '@/lib/stores'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, Menu, X, User, LogOut, Cake, Phone, MapPin, Clock } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { eur } from '@/lib/format'
import { toast } from 'sonner'
import type { ViewName } from '@/lib/stores'

const NAV_ITEMS: { label: string; view: ViewName }[] = [
  { label: 'Domov', view: 'home' },
  { label: 'Ponuka', view: 'catalog' },
  { label: 'Torty na mieru', view: 'custom-cake' },
  { label: 'Catering', view: 'catering' },
]

const STAFF_VIEWS: { label: string; view: ViewName; roles: string[] }[] = [
  { label: 'Administrácia', view: 'admin', roles: ['ADMIN', 'STORE_MANAGER'] },
  { label: 'Výroba', view: 'production', roles: ['ADMIN', 'STORE_MANAGER', 'PRODUCTION'] },
  { label: 'Balenie', view: 'packing', roles: ['ADMIN', 'STORE_MANAGER', 'PACKING'] },
  { label: 'Dispečing', view: 'dispatch', roles: ['ADMIN', 'STORE_MANAGER', 'DISPATCHER'] },
  { label: 'Kuriér', view: 'courier', roles: ['COURIER'] },
]

export function Header() {
  const { view, navigate } = useView()
  const { user, refresh } = useAuth()
  const { items, remove, setQty, subtotal } = useCart()
  const [cartOpen, setCartOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => { refresh() }, [refresh])

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout')
      await refresh()
      navigate('home')
      toast.success('Boli ste odhlásený.')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const goCheckout = () => {
    setCartOpen(false)
    navigate('checkout')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--gold)]/30 bg-[var(--cream)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--cream)]/80">
      <div className="hidden md:block bg-[var(--chocolate)] text-[var(--cream)] text-xs">
        <div className="container mx-auto flex items-center justify-between px-4 py-1.5">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> +421 905 000 000</span>
            <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Hlohovec, M. R. Štefánika</span>
            <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Po–Pi 8:00–18:00, So 8:00–14:00</span>
          </div>
          <span className="text-[var(--gold)]">Doručujeme do Hlohovca, Šulekova, Leopoldova, Červeníka a okolitých obcí</span>
        </div>
      </div>

      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <button onClick={() => navigate('home')} className="flex items-center gap-2.5 group">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--chocolate)] flex items-center justify-center text-[var(--cream)] shadow-md group-hover:scale-105 transition-transform">
              <Cake className="h-5 w-5" />
            </div>
            <div className="text-left leading-tight">
              <div className="font-display text-lg font-bold text-[var(--chocolate)]">Olajos Dezerty</div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--gold)]">Cukráreň · Hlohovec</div>
            </div>
          </button>

          <nav className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map(item => (
              <button
                key={item.view}
                onClick={() => navigate(item.view)}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${view === item.view ? 'text-[var(--gold)]' : 'text-[var(--chocolate)] hover:text-[var(--gold)]'}`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-[var(--chocolate)] hover:text-[var(--gold)]">
                  <ShoppingCart className="h-5 w-5" />
                  {items.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-[var(--raspberry)] text-[var(--raspberry-foreground)] text-[10px] font-bold flex items-center justify-center">
                      {items.reduce((s, i) => s + i.quantity, 0)}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md flex flex-col bg-[var(--cream)]">
                <SheetHeader>
                  <SheetTitle className="text-[var(--chocolate)]">Váš košík</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto olajos-scroll px-4 py-2 space-y-3">
                  {items.length === 0 ? (
                    <div className="text-center py-12 text-[var(--muted-foreground)]">
                      <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>Košík je prázdny.</p>
                      <Button variant="outline" className="mt-4" onClick={() => { setCartOpen(false); navigate('catalog') }}>
                        Prejsť na ponuku
                      </Button>
                    </div>
                  ) : (
                    items.map((item, i) => (
                      <div key={i} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
                        <div className="flex gap-3">
                          <div className="h-14 w-14 rounded-md bg-[var(--secondary)] flex items-center justify-center text-[var(--gold)] flex-shrink-0">
                            <Cake className="h-6 w-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-[var(--chocolate)] truncate">{item.productName}</div>
                            {item.variantName && <div className="text-xs text-[var(--muted-foreground)]">{item.variantName}</div>}
                            {item.optionNames.length > 0 && (
                              <div className="text-xs text-[var(--muted-foreground)] truncate">{item.optionNames.join(', ')}</div>
                            )}
                            <div className="flex items-center justify-between mt-1">
                              <div className="flex items-center gap-1">
                                <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => setQty(item.productId, item.variantId, item.quantity - 1)}>−</Button>
                                <span className="text-sm w-6 text-center">{item.quantity}</span>
                                <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => setQty(item.productId, item.variantId, item.quantity + 1)}>+</Button>
                              </div>
                              <span className="text-sm font-semibold text-[var(--gold)]">{eur(item.unitPrice * item.quantity)}</span>
                            </div>
                          </div>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-[var(--muted-foreground)]" onClick={() => remove(item.productId, item.variantId)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {items.length > 0 && (
                  <div className="border-t border-[var(--border)] p-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--muted-foreground)]">Medzisúčet</span>
                      <span className="font-semibold text-[var(--chocolate)]">{eur(subtotal())}</span>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)]">Konečnú cenu vypočíta server pri objednávke.</p>
                    <Button className="w-full bg-[var(--chocolate)] text-[var(--cream)] hover:bg-[var(--gold)] hover:text-[var(--chocolate)]" onClick={goCheckout}>
                      Prejsť k pokladni
                    </Button>
                  </div>
                )}
              </SheetContent>
            </Sheet>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-[var(--chocolate)] hover:text-[var(--gold)]">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[var(--card)] border-[var(--border)]">
                  <DropdownMenuLabel className="text-[var(--chocolate)]">
                    <div className="font-medium">{user.fullName || user.email}</div>
                    <div className="text-xs text-[var(--muted-foreground)]">{user.email}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('account')} className="cursor-pointer">Môj účet</DropdownMenuItem>
                  {user.role === 'CUSTOMER' && (
                    <DropdownMenuItem onClick={() => navigate('account')} className="cursor-pointer">
                      Vernostné body: {user.loyalty?.points ?? 0}
                    </DropdownMenuItem>
                  )}
                  {STAFF_VIEWS.filter(sv => sv.roles.includes(user.role)).map(sv => (
                    <DropdownMenuItem key={sv.view} onClick={() => navigate(sv.view)} className="cursor-pointer">
                      {sv.label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-[var(--raspberry)]">
                    <LogOut className="h-4 w-4 mr-2" /> Odhlásiť sa
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="outline" size="sm" onClick={() => navigate('login')} className="border-[var(--gold)] text-[var(--chocolate)] hover:bg-[var(--gold)] hover:text-[var(--chocolate-foreground)]">
                Prihlásiť
              </Button>
            )}

            <Button variant="ghost" size="icon" className="lg:hidden text-[var(--chocolate)]" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-[var(--border)] bg-[var(--cream)]">
          <nav className="container mx-auto px-4 py-3 flex flex-col gap-1">
            {NAV_ITEMS.map(item => (
              <button
                key={item.view}
                onClick={() => { navigate(item.view); setMobileOpen(false) }}
                className={`px-3 py-2 text-left text-sm font-medium rounded-md ${view === item.view ? 'bg-[var(--secondary)] text-[var(--gold)]' : 'text-[var(--chocolate)]'}`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}

export function Footer() {
  const { navigate } = useView()
  return (
    <footer className="mt-auto bg-[var(--chocolate)] text-[var(--cream)]">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--raspberry)] flex items-center justify-center">
                <Cake className="h-4 w-4" />
              </div>
              <span className="font-display text-lg font-bold">Olajos Dezerty</span>
            </div>
            <p className="text-sm text-[var(--cream)]/70">
              Prémiová cukráreň v Hlohovci. Domáce torty na mieru, zákusky a catering s láskou k detailu.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-[var(--gold)]">Ponuka</h4>
            <ul className="space-y-1.5 text-sm text-[var(--cream)]/80">
              <li><button onClick={() => navigate('catalog')} className="hover:text-[var(--gold)]">Katalóg</button></li>
              <li><button onClick={() => navigate('custom-cake')} className="hover:text-[var(--gold)]">Torty na mieru</button></li>
              <li><button onClick={() => navigate('catering')} className="hover:text-[var(--gold)]">Catering</button></li>
              <li><button onClick={() => navigate('tracking')} className="hover:text-[var(--gold)]">Sledovať objednávku</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-[var(--gold)]">Kontakt</h4>
            <ul className="space-y-1.5 text-sm text-[var(--cream)]/80">
              <li className="flex items-center gap-2"><MapPin className="h-3 w-3" /> M. R. Štefánika, Hlohovec</li>
              <li className="flex items-center gap-2"><Phone className="h-3 w-3" /> +421 905 000 000</li>
              <li className="flex items-center gap-2"><Clock className="h-3 w-3" /> Po–Pi 8:00–18:00</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-[var(--gold)]">Doručovacie zóny</h4>
            <ul className="space-y-1.5 text-sm text-[var(--cream)]/80">
              <li>Hlohovec · Šulekovo · Leopoldov</li>
              <li>Červeník · okolité obce</li>
              <li className="text-xs text-[var(--gold)]/80 mt-2">Doručenie zadarmo od 35 €</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[var(--cream)]/20 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--cream)]/60">
          <span>© {new Date().getFullYear()} Olajos Dezerty. Všetky práva vyhradené.</span>
          <span className="flex items-center gap-3">
            <button className="hover:text-[var(--gold)]">Ochrana osobných údajov</button>
            <button className="hover:text-[var(--gold)]">Obchodné podmienky</button>
          </span>
        </div>
      </div>
    </footer>
  )
}
