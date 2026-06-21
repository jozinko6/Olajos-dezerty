'use client'

import { useEffect } from 'react'
import { useView, useAuth } from '@/lib/stores'
import { Header, Footer } from '@/components/layout/shell'
import { HomeView } from '@/components/views/home-view'
import { CatalogView } from '@/components/views/catalog-view'
import { ProductView } from '@/components/views/product-view'
import { CheckoutView } from '@/components/views/checkout-view'
import { TrackingView } from '@/components/views/tracking-view'
import { AccountView } from '@/components/views/account-view'
import { AuthView } from '@/components/views/auth-view'
import { CustomCakeView } from '@/components/views/custom-cake-view'
import { CateringView } from '@/components/views/catering-view'
import { AdminView } from '@/components/views/admin-view'
import { ProductionView } from '@/components/views/production-view'
import { PackingView } from '@/components/views/packing-view'
import { DispatchView } from '@/components/views/dispatch-view'
import { CourierView } from '@/components/views/courier-view'

export default function Home() {
  const { view, navigate } = useView()
  const { user, loading, refresh } = useAuth()

  useEffect(() => { refresh() }, [refresh])

  // Guard staff views
  useEffect(() => {
    if (loading) return
    const staffViews: Record<string, string[]> = {
      admin: ['ADMIN', 'STORE_MANAGER'],
      production: ['ADMIN', 'STORE_MANAGER', 'PRODUCTION'],
      packing: ['ADMIN', 'STORE_MANAGER', 'PACKING'],
      dispatch: ['ADMIN', 'STORE_MANAGER', 'DISPATCHER'],
      courier: ['COURIER'],
    }
    const allowed = staffViews[view]
    if (allowed && (!user || !allowed.includes(user.role))) {
      navigate('login')
    }
  }, [view, user, loading, navigate])

  const renderView = () => {
    switch (view) {
      case 'home': return <HomeView />
      case 'catalog': return <CatalogView />
      case 'product': return <ProductView />
      case 'cart': return <CheckoutView />
      case 'checkout': return <CheckoutView />
      case 'tracking': return <TrackingView />
      case 'account': return <AccountView />
      case 'login': return <AuthView mode="login" />
      case 'register': return <AuthView mode="register" />
      case 'custom-cake': return <CustomCakeView />
      case 'catering': return <CateringView />
      case 'admin': return <AdminView />
      case 'production': return <ProductionView />
      case 'packing': return <PackingView />
      case 'dispatch': return <DispatchView />
      case 'courier': return <CourierView />
      default: return <HomeView />
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {renderView()}
      </main>
      <Footer />
    </div>
  )
}
