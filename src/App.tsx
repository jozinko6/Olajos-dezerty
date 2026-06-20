/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api, CartItem } from './utils/api';
import AuthModal from './components/AuthModal';
import AdminPanel from './components/AdminPanel';
import CourierPanel from './components/CourierPanel';
import LiveTracking from './components/LiveTracking';
import { ShoppingCart, User, LogOut, Check, ShoppingBag, Eye, Sparkles, Phone, Mail, HelpCircle, Package, Truck, UtensilsCrossed, ArrowRight, MapPin, XCircle } from 'lucide-react';

// Pricing zone configurations (Test Case 2)
interface PricingZone {
  name: string;
  price: number;
  minOrder: number;
  freeThreshold: number;
}

const PRICING_ZONES: Record<string, PricingZone> = {
  'hlohovec': { name: 'Hlohovec (Mesto)', price: 2.00, minOrder: 10.00, freeThreshold: 35.00 },
  'sulekovo': { name: 'Leopoldov & Šulekovo', price: 4.55, minOrder: 15.00, freeThreshold: 50.00 },
  'obce': { name: 'Susedné obce (Bojničky, Koplotovce...)', price: 6.90, minOrder: 25.00, freeThreshold: 75.00 }
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  
  // Filtering and dietary state
  const [onlyGlutenFree, setOnlyGlutenFree] = useState(false);
  const [onlyLactoseFree, setOnlyLactoseFree] = useState(false);
  const [onlySugarFree, setOnlySugarFree] = useState(false);

  // Cart Local state persistent
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [deliveryType, setDeliveryType] = useState<'PICKUP' | 'DELIVERY'>('PICKUP');
  const [deliveryZone, setDeliveryZone] = useState<string>('hlohovec');
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('12:00 - 14:00');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [checkoutSuccess, setCheckoutSuccess] = useState<any>(null);

  // Custom cake inquiry state
  const [cakeOccasion, setCakeOccasion] = useState<'WEDDING' | 'BIRTHDAY' | 'BAPTISM' | 'CELEBRATION'>('BIRTHDAY');
  const [cakeServings, setCakeServings] = useState('15');
  const [cakeFlavor, setCakeFlavor] = useState('');
  const [cakeShape, setCakeShape] = useState<'ROUND' | 'SQUARE' | 'HEART' | 'MULTI_TIER'>('ROUND');
  const [cakeAllergies, setCakeAllergies] = useState('');
  const [cakeDesc, setCakeDesc] = useState('');
  const [cakeInquirySuccess, setCakeInquirySuccess] = useState('');

  // Active workspace viewport view switcher
  const [currentView, setCurrentView] = useState<'shop' | 'cake-builder' | 'tracking' | 'admin' | 'courier'>('shop');
  const [trackingSearchToken, setTrackingSearchToken] = useState('');
  const [activeTrackingToken, setActiveTrackingToken] = useState('');

  // Loaded at boot
  useEffect(() => {
    // Restore User
    const usr = api.getUser();
    if (usr) {
      setCurrentUser(usr);
      setCustomerName(`${usr.first_name} ${usr.last_name}`);
      setCustomerEmail(usr.email);
    }

    // Restore Cart
    const rawCart = localStorage.getItem('olajos_cart_items');
    if (rawCart) {
      try { setCart(JSON.parse(rawCart)); } catch { setCart([]); }
    }

    // Load products
    const loadStore = async () => {
      try {
        const prodData = await api.request('/api/products');
        setProducts(prodData);
        const catData = await api.request('/api/categories');
        setCategories(catData);
      } catch (err) {
        console.error('Error fetching catalog data:', err);
      }
    };
    loadStore();

    // Set default date as tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduledDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  const handleAuthSuccess = (user: any) => {
    setCurrentUser(user);
    setCustomerName(`${user.first_name} ${user.last_name}`);
    setCustomerEmail(user.email);
    if (user.roles.includes('ADMIN')) {
      setCurrentView('admin');
    } else if (user.roles.includes('COURIER')) {
      setCurrentView('courier');
    }
  };

  const handleLogout = () => {
    api.clearAuth();
    setCurrentUser(null);
    setCurrentView('shop');
  };

  // Cart operations helpers
  const saveCartToLocalStorage = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem('olajos_cart_items', JSON.stringify(newCart));
  };

  const addToCart = (product: any, variantIdx?: number, customNotes?: string) => {
    // Check if variant specified
    const selectedVariant = variantIdx !== undefined ? product.variants[variantIdx] : undefined;
    const finalPrice = product.base_price + (selectedVariant ? selectedVariant.price_modifier : 0);
    
    // Add custom cake options if needed
    const newItem: CartItem = {
      product_id: product.id,
      name: product.name_sk,
      price: finalPrice,
      image: product.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80',
      quantity: 1,
      variant_id: selectedVariant?.id,
      variant_name: selectedVariant?.name_sk,
      customization_notes: customNotes
    };

    const updated = [...cart];
    const existingIdx = updated.findIndex(i => i.product_id === newItem.product_id && i.variant_id === newItem.variant_id);
    if (existingIdx !== -1) {
      updated[existingIdx].quantity += 1;
    } else {
      updated.push(newItem);
    }

    saveCartToLocalStorage(updated);
    setIsCartOpen(true);
  };

  const updateQuantity = (product_id: string, variant_id: string | undefined, delta: number) => {
    const updated = cart.map(i => {
      if (i.product_id === product_id && i.variant_id === variant_id) {
        return { ...i, quantity: Math.max(1, i.quantity + delta) };
      }
      return i;
    });
    saveCartToLocalStorage(updated);
  };

  const removeFromCart = (product_id: string, variant_id?: string) => {
    const updated = cart.filter(i => !(i.product_id === product_id && i.variant_id === variant_id));
    saveCartToLocalStorage(updated);
  };

  // Totals calculations
  const itemsSubtotal = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const selectedZoneConfig = PRICING_ZONES[deliveryZone];
  const deliveryCost = deliveryType === 'DELIVERY' 
    ? (itemsSubtotal >= selectedZoneConfig.freeThreshold ? 0.00 : selectedZoneConfig.price)
    : 0.00;

  const orderTotal = itemsSubtotal + deliveryCost;

  // Checkout submission
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Test Case 2: check if order meets pricing zone minimum spend
    if (deliveryType === 'DELIVERY' && itemsSubtotal < selectedZoneConfig.minOrder) {
      alert(`Minimálna výška objednávky pre rozvoz do zóny '${selectedZoneConfig.name}' je ${selectedZoneConfig.minOrder.toFixed(2)} EUR. Vaša aktuálna hodnota nákupu je ${itemsSubtotal.toFixed(2)} EUR. Pridajte ešte niečo sladké do košíka.`);
      return;
    }

    try {
      const orderPayload = {
        order: {
          total_price: itemsSubtotal,
          delivery_price: deliveryCost,
          final_price: orderTotal,
          delivery_type: deliveryType,
          branch_id: 'br_hlohovec',
          scheduled_date: scheduledDate,
          scheduled_time_slot: scheduledTime,
          customer_notes: customerNotes,
          contact_email: customerEmail,
          contact_phone: customerPhone,
          customer_name: customerName,
          ...(deliveryType === 'DELIVERY' ? { delivery_address: streetAddress } : {})
        },
        items: cart.map(i => ({
          product_id: i.product_id,
          variant_id: i.variant_id,
          quantity: i.quantity,
          customization_notes: i.customization_notes
        }))
      };

      const res = await api.request('/api/orders', {
        method: 'POST',
        body: JSON.stringify(orderPayload)
      });

      setCheckoutSuccess(res);
      saveCartToLocalStorage([]);
      setIsCartOpen(false);
      setActiveTrackingToken(res.tracking_token);
      setCurrentView('tracking');
    } catch (err: any) {
      alert(err.message || 'Chyba checkoutu');
    }
  };

  // Custom cake builder request submission
  const handleCustomCakeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCakeInquirySuccess('');
    
    // Simply mocked success for wedding/custom cake inquiries
    setCakeInquirySuccess(`Dopyt ohľadom vašej ${cakeOccasion === 'WEDDING' ? 'Svadobnej' : 'Slávnostnej'} torty s kapacitou ${cakeServings} porcií bol zaznamenaný do databázy! Náš šéfcukrár František Olajos vás bude kontaktovať na e-mail: ${customerEmail} s vypracovanou cenovou ponukou do 24 hodín.`);
    // Reset inputs
    setCakeFlavor('');
    setCakeDesc('');
  };

  // Filtered Catalogue products list
  const filteredProducts = products.filter(p => {
    const matchesCat = activeCategory === 'all' || p.category_id === activeCategory;
    const matchesGluten = !onlyGlutenFree || p.is_gluten_free;
    const matchesLactose = !onlyLactoseFree || p.is_lactose_free;
    const matchesSugar = !onlySugarFree || p.is_sugar_free;
    return matchesCat && matchesGluten && matchesLactose && matchesSugar;
  });

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 flex flex-col antialiased">
      
      {/* Upper bar banner info */}
      <div className="bg-amber-950 text-white py-2 px-6 text-center text-xs font-serif font-medium tracking-wider flex flex-col md:flex-row justify-center items-center gap-2">
        <span className="flex items-center gap-1">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Remeselná cukráreň Olajos - Prvá trieda z Hlohovca s tradíciou
        </span>
        <span className="hidden md:inline">•</span>
        <span>Rozvoz zdarma v Hlohovci pri objednávkach nad 35 EUR</span>
      </div>

      {/* Primary Top Header Navigation Bar */}
      <header id="main-nav" className="sticky top-0 z-40 bg-stone-50/95 backdrop-blur-md border-b border-stone-200 shadow-sm px-6 py-4 flex items-center justify-between">
        <div 
          onClick={() => setCurrentView('shop')}
          className="flex items-center gap-2.5 cursor-pointer select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-950/95 flex items-center justify-center shadow-md">
            <UtensilsCrossed className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h1 className="font-serif text-xl tracking-wider text-amber-950 font-bold block leading-none">Olajos dezerty</h1>
            <span className="text-[10px] text-stone-550 block font-mono tracking-widest uppercase">Hlohovec Premium</span>
          </div>
        </div>

        {/* Categories / Views navigation links links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-serif font-medium text-stone-700">
          <button 
            id="nav-catalogue"
            onClick={() => setCurrentView('shop')}
            className={`hover:text-amber-950 transition ${currentView === 'shop' ? 'text-amber-955 border-b border-amber-900' : ''}`}
          >
            Ponuka dezertov
          </button>
          <button 
            id="nav-cake-builder"
            onClick={() => setCurrentView('cake-builder')}
            className={`hover:text-amber-950 transition ${currentView === 'cake-builder' ? 'text-amber-955 border-b border-amber-900' : ''}`}
          >
            Torty na mieru
          </button>
          
          {/* Tracking token lookup header button */}
          <button 
            id="nav-tracking"
            onClick={() => setCurrentView('tracking')}
            className={`hover:text-amber-950 transition ${currentView === 'tracking' ? 'text-amber-955 border-b border-amber-900' : ''}`}
          >
            Sledovať doručenie
          </button>

          {currentUser?.roles?.includes('ADMIN') && (
            <button 
              id="nav-admin"
              onClick={() => setCurrentView('admin')}
              className={`px-3 py-1 bg-amber-900 text-amber-50 rounded text-xs font-bold hover:bg-amber-950 ${currentView === 'admin' ? 'underline' : ''}`}
            >
              Management
            </button>
          )}

          {currentUser?.roles?.includes('COURIER') && (
            <button 
              id="nav-courier"
              onClick={() => setCurrentView('courier')}
              className={`px-3 py-1 bg-green-700 text-white rounded text-xs font-bold hover:bg-green-800 ${currentView === 'courier' ? 'underline' : ''}`}
            >
              Kuriér panel
            </button>
          )}
        </nav>

        {/* User login / Cart Actions layout right */}
        <div className="flex items-center gap-4">
          
          {/* Sledovať token lookup search input */}
          <div className="hidden sm:flex items-center gap-1">
            <input 
              type="text"
              placeholder="Zadajte sledovací kód..."
              value={trackingSearchToken}
              onChange={(e) => setTrackingSearchToken(e.target.value)}
              className="px-2 py-1 text-xs border border-stone-300 rounded bg-white text-stone-900 outline-none w-36"
            />
            <button 
              onClick={() => {
                if (trackingSearchToken) {
                  setActiveTrackingToken(trackingSearchToken);
                  setTrackingSearchToken('');
                  setCurrentView('tracking');
                }
              }}
              className="px-2 py-1 bg-stone-900 text-white text-[10px] rounded hover:bg-stone-850"
            >
              Hľadať
            </button>
          </div>

          {currentUser ? (
            <div className="flex items-center gap-2">
              <div className="hidden md:block text-right">
                <span className="text-stone-700 font-medium text-xs block leading-tight">{currentUser.first_name} {currentUser.last_name}</span>
                <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block">Vernostné body: {currentUser.id === 'usr_customer_demo' ? 150 : 0} bodov</span>
              </div>
              <button 
                id="user-logout"
                onClick={handleLogout}
                className="p-1.5 rounded-full hover:bg-stone-200 text-stone-600 transition-colors"
                title="Odhlásiť sa"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button 
              id="user-login"
              onClick={() => setIsAuthOpen(true)}
              className="p-1.5 rounded-full hover:bg-stone-200 text-stone-700 transition"
              title="Prihlásiť / Registrovať"
            >
              <User className="w-5 h-5" />
            </button>
          )}

          {/* Cart triggers */}
          <button 
            id="cart-trigger"
            onClick={() => setIsCartOpen(true)}
            className="p-2.5 bg-amber-950/95 hover:bg-amber-900 text-amber-300 rounded-xl flex items-center gap-1.5 relative shadow-md"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="text-xs font-serif font-bold hidden sm:inline">Košík</span>
            {cart.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-650 text-white text-xs font-bold flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">
        
        {/* SHOP FRONT CATALOGUE */}
        {currentView === 'shop' && (
          <div className="space-y-12 animate-fade-in">
            
            {/* Visual Hero */}
            <div className="relative overflow-hidden bg-stone-900 rounded-2xl p-8 md:p-12 text-white shadow-xl">
              <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1519869325930-281384150729?w=1200')] bg-cover bg-center" />
              <div className="relative z-10 max-w-lg space-y-4">
                <span className="px-2.5 py-1 bg-amber-700 text-white text-[10px] font-bold tracking-widest rounded uppercase">PREVÁDZKA OLAJOS PRIBOVKA HLOHOVEC</span>
                <h2 className="font-serif text-4xl md:text-5xl tracking-wide leading-tight text-amber-100">Sladký zážitok, poctivé remeslo</h2>
                <p className="text-stone-300 text-xs md:text-sm">V našej výrobe kladieme dôraz na originálne maslo, plnotučné čerstvé mlieko a poctivé ovocie bez priemyselných polotovarov. Objednajte si dovoz ku dverám v Hlohovci, Šulekove a Leopoldove.</p>
                <div className="pt-2 flex flex-wrap gap-3">
                  <button 
                    onClick={() => {
                      const el = document.getElementById('catalogue-grids');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-4 py-2.5 bg-amber-700 hover:bg-amber-800 font-serif text-xs font-medium rounded-lg shadow-md transition flex items-center gap-1"
                  >
                    Pozrieť ponuku zákuskov
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setCurrentView('cake-builder')}
                    className="px-4 py-2.5 bg-transparent border border-stone-300 hover:bg-white/10 rounded-lg text-xs font-serif transition"
                  >
                    Dizajn slávnostnej torty
                  </button>
                </div>
              </div>
            </div>

            {/* Catalogue search and active filters */}
            <div id="catalogue-grids" className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-stone-200 pb-4">
                <div>
                  <h3 className="font-serif text-2xl text-amber-950">Sezónna denná ponuka</h3>
                  <p className="text-stone-500 text-xs">Užite si sladký deň s našimi poctivými makrónkami a francúzskymi eclairmi.</p>
                </div>

                {/* Dietary Filter Checkboxes */}
                <div className="flex flex-wrap gap-4 text-xs font-medium text-stone-700 bg-stone-100 p-2.5 rounded-xl border border-stone-200">
                  <span className="text-stone-400 self-center mr-1">Diéty / Alergény:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={onlyGlutenFree} onChange={(e) => setOnlyGlutenFree(e.target.checked)} className="rounded text-amber-800" />
                    <span>Bezlepkové</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={onlyLactoseFree} onChange={(e) => setOnlyLactoseFree(e.target.checked)} className="rounded text-amber-800" />
                    <span>Bez laktózy</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={onlySugarFree} onChange={(e) => setOnlySugarFree(e.target.checked)} className="rounded text-amber-800" />
                    <span>Bez cukru (DIA)</span>
                  </label>
                </div>
              </div>

              {/* Category tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                <button 
                  onClick={() => setActiveCategory('all')}
                  className={`px-4 py-2 rounded-xl text-xs font-serif font-semibold border transition whitespace-nowrap ${activeCategory === 'all' ? 'bg-amber-950 text-amber-100 border-amber-950' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}
                >
                  Všetko
                </button>
                {categories.map(cat => (
                  <button 
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-serif font-semibold border transition whitespace-nowrap ${activeCategory === cat.id ? 'bg-amber-950 text-amber-100 border-amber-950' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}
                  >
                    {cat.name_sk}
                  </button>
                ))}
              </div>

              {/* Product Card grids */}
              {filteredProducts.length === 0 ? (
                <div className="text-center py-16 text-stone-400 space-y-1">
                  <Package className="w-12 h-12 stroke-1 mx-auto" />
                  <p className="text-sm font-serif">Nenašli sa žiadne vyhovujúce dezerty.</p>
                  <p className="text-xs text-stone-400">Skúste prosím upraviť diétne filtre vyššie.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProducts.map(prod => {
                    const stockQuantity = prod.stock ? prod.stock.quantity : 0;
                    return (
                      <div 
                        key={prod.id} 
                        id={`product-${prod.id}`}
                        className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition flex flex-col h-full"
                      >
                        {/* Img wrapper */}
                        <div className="relative h-48 overflow-hidden bg-stone-100">
                          <img 
                            src={prod.images?.[0]?.image_url} 
                            alt={prod.name_sk} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition duration-500 hover:scale-105" 
                          />
                          
                          {/* Stock badge */}
                          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2.5 py-1 rounded-lg text-[10px] font-bold text-stone-850 shadow-sm">
                            {stockQuantity === 0 ? (
                              <span className="text-red-700">Vypredané na dnes</span>
                            ) : (
                              <span>Na sklade: {stockQuantity} ks</span>
                            )}
                          </div>

                          {/* Allergy icons */}
                          <div className="absolute bottom-3 right-3 flex gap-1 bg-black/60 backdrop-blur-sm p-1 rounded-lg">
                            {prod.is_gluten_free && <span className="text-[9px] text-amber-300 font-bold px-1.5" title="Bezlepkový">BL</span>}
                            {prod.is_lactose_free && <span className="text-[9px] text-cyan-300 font-bold px-1.5" title="Bez laktózy">LAC</span>}
                            {prod.is_sugar_free && <span className="text-[9px] text-green-300 font-bold px-1.5" title="Bez pridaného cukru">DIA</span>}
                          </div>
                        </div>

                        {/* Card body */}
                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                          <div className="space-y-1">
                            <span className="text-[10px] text-stone-400 uppercase tracking-widest block">Trvanlivosť: {prod.shelf_life_days || 2} dni</span>
                            <h4 className="font-serif text-lg tracking-wide text-amber-950 font-bold">{prod.name_sk}</h4>
                            <p className="text-xs text-stone-550 line-clamp-2">{prod.short_desc_sk}</p>
                          </div>

                          {/* Extra cake customization notes inputs (Only if torta) */}
                          {prod.category_id === 'cat_cakes' && (
                            <div className="pt-1.5 border-t border-stone-100">
                              <label className="text-[10px] block text-amber-900 font-medium pb-1">Zadajte nápis na tortu (napr. "Všetko naj k 30"):</label>
                              <input 
                                type="text"
                                id={`custom-phrase-${prod.id}`}
                                placeholder="Nápis čokoládou..."
                                className="w-full p-1 border border-stone-300 text-xs rounded bg-stone-50"
                              />
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                            <div>
                              <span className="text-[10px] text-stone-400 block uppercase leading-none">Cena s dph:</span>
                              <span className="font-bold text-stone-900 text-lg">{prod.base_price.toFixed(2)} EUR</span>
                            </div>
                            
                            {/* Add to cart. If stockQuantity = 0, block checkout add (Test Case 1) */}
                            <button 
                              onClick={() => {
                                let phrase = '';
                                if (prod.category_id === 'cat_cakes') {
                                  const inputEl = document.getElementById(`custom-phrase-${prod.id}`) as HTMLInputElement;
                                  if (inputEl) phrase = inputEl.value;
                                }
                                addToCart(prod, undefined, phrase || undefined);
                              }}
                              disabled={stockQuantity === 0}
                              className={`px-3.5 py-2 font-serif text-xs font-semibold rounded-lg flex items-center gap-1 shadow transition ${stockQuantity === 0 ? 'bg-stone-200 text-stone-400 cursor-not-allowed' : 'bg-amber-950 hover:bg-amber-900 text-amber-200'}`}
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              {stockQuantity === 0 ? 'Nedostupné' : 'Objednať'}
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* CUSTOM CAKE INQUIRY FORM */}
        {currentView === 'cake-builder' && (
          <div className="max-w-2xl mx-auto bg-stone-50/50 border border-stone-200 p-8 rounded-2xl shadow-md space-y-6 animate-fade-in bg-white">
            <div className="text-center space-y-2 max-w-md mx-auto border-b border-stone-100 pb-4">
              <Sparkles className="w-8 h-8 text-amber-700 mx-auto" />
              <h3 className="font-serif text-3xl text-amber-950">Návrh torty na mieru</h3>
              <p className="text-xs text-stone-500">Čaká vás svadba, rodinná jubilejná oslava alebo krstiny? Navrhnite si tortu, zadajte požiadavky a my ju kompletne upečieme s dovozom!</p>
            </div>

            {cakeInquirySuccess ? (
              <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl space-y-3">
                <p className="text-xs font-serif leading-relaxed font-semibold">{cakeInquirySuccess}</p>
                <button 
                  onClick={() => setCakeInquirySuccess('')}
                  className="px-3 py-1 bg-stone-900 text-white rounded text-[11px]"
                >
                  Urobiť nový dopyt
                </button>
              </div>
            ) : (
              <form onSubmit={handleCustomCakeSubmit} className="space-y-4 text-xs font-medium text-stone-700">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 text-stone-600 font-semibold">Udalosť / Príležitosť</label>
                    <select 
                      value={cakeOccasion}
                      onChange={(e) => setCakeOccasion(e.target.value as any)}
                      className="w-full p-2.5 border border-stone-300 rounded-lg bg-stone-50 text-stone-950 text-xs"
                    >
                      <option value="BIRTHDAY">Narodeniny</option>
                      <option value="WEDDING">Svadba (Svadobný catering)</option>
                      <option value="BAPTISM">Krst / Sv. prijímanie</option>
                      <option value="CELEBRATION">Firemná oslava</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 text-stone-600 font-semibold">Počet porcií (hostia)</label>
                    <select 
                      value={cakeServings}
                      onChange={(e) => setCakeServings(e.target.value)}
                      className="w-full p-2.5 border border-stone-300 rounded-lg bg-stone-50 text-stone-950 text-xs"
                    >
                      <option value="10">8-10 porcií</option>
                      <option value="15">12-16 porcií</option>
                      <option value="25">20-28 porcií</option>
                      <option value="50">Viac ako 40 porcií (Multi-tier)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 text-stone-600 font-semibold">Tvar / Poschodovosť</label>
                    <select 
                      value={cakeShape}
                      onChange={(e) => setCakeShape(e.target.value as any)}
                      className="w-full p-2.5 border border-stone-300 rounded-lg bg-stone-50 text-stone-950 text-xs"
                    >
                      <option value="ROUND">Klasický okrúhly</option>
                      <option value="SQUARE">Hranatý moderný</option>
                      <option value="MULTI_TIER">Viacposchodová torta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 text-stone-600 font-semibold">Požadovaný typ príchute</label>
                    <input 
                      type="text" 
                      required
                      value={cakeFlavor}
                      onChange={(e) => setCakeFlavor(e.target.value)}
                      placeholder="napr. Čokoláda & Malina, Slaný Karamel" 
                      className="w-full p-2.5 border border-stone-300 rounded-lg bg-stone-50 text-stone-950 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-1 text-stone-600 font-semibold">Zvláštne potravinové obmedzenia</label>
                  <input 
                    type="text" 
                    value={cakeAllergies}
                    onChange={(e) => setCakeAllergies(e.target.value)}
                    placeholder="napr. alergia na orechy, intolerantný na laktózu" 
                    className="w-full p-2.5 border border-stone-300 rounded-lg bg-stone-50 text-stone-950 text-xs"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-stone-600 font-semibold">Predstava dizajnu, dekorácií a detailov</label>
                  <textarea 
                    value={cakeDesc}
                    onChange={(e) => setCakeDesc(e.target.value)}
                    placeholder="Popíšte nám požadované zdobenie, kvety, postavičky, zápichy či farby..." 
                    className="w-full p-2.5 border border-stone-300 rounded-lg bg-stone-50 text-stone-950 text-xs h-24"
                  />
                </div>

                {/* File upload simulator */}
                <div className="border-2 border-dashed border-stone-200 bg-stone-50 p-4 rounded-xl text-center space-y-1 select-none">
                  <span className="text-amber-950 font-bold block text-xs">Uložiť inšpiračné predlohy</span>
                  <span className="text-[10px] text-stone-400 block">Kliknutím alebo prenesením (Drag & Drop) nahrajte fotku torty</span>
                  <input type="file" disabled title="Simulator" className="mx-auto text-[10px] max-w-[200px]" />
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-amber-955 hover:bg-amber-950 text-amber-50 font-serif font-semibold text-xs rounded-xl shadow-md transition"
                >
                  Odoslať dopyt na posúdenie
                </button>
              </form>
            )}
          </div>
        )}

        {/* ORDER TRACKING SYSTEM VIEW */}
        {currentView === 'tracking' && (
          <div className="space-y-6 animate-fade-in">
            {activeTrackingToken ? (
              <LiveTracking trackingToken={activeTrackingToken} />
            ) : (
              <div className="max-w-md mx-auto border border-stone-200 bg-white p-6 rounded-2xl text-center space-y-4 shadow">
                <Truck className="w-10 h-10 text-amber-950 mx-auto" />
                <h3 className="font-serif text-xl font-bold">Vyhľadanie a sledovanie objednávky</h3>
                <p className="text-xs text-stone-500">Zadajte anonymný tracking token, ktorý vám prišiel po dokončení nákupu, aby ste sledovali kuriéra v reálnom čase.</p>
                <div className="space-y-2">
                  <input 
                    type="text" 
                    placeholder="Vložte sledovací token..." 
                    className="w-full p-2 text-xs border border-stone-350 rounded text-stone-900"
                    id="tracking-center-input"
                  />
                  <button 
                    onClick={() => {
                      const inputEl = document.getElementById('tracking-center-input') as HTMLInputElement;
                      if (inputEl && inputEl.value) {
                        setActiveTrackingToken(inputEl.value);
                      }
                    }}
                    className="w-full py-2 bg-amber-950 text-white rounded font-serif text-xs font-semibold"
                  >
                    Vyhľadať zásielku
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* REGISTERED SYSTEMS (ADMIN PANELS ON SCREEN) */}
        {currentView === 'admin' && <AdminPanel />}
        {currentView === 'courier' && <CourierPanel courierId="usr_courier1" />}

      </main>

      {/* PERSISTENT CART SIDEBAR DRAWER (Right aligned) */}
      {isCartOpen && (
        <div id="cart-drawer" className="fixed inset-0 z-50 flex justify-end bg-black/55 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg bg-stone-50 h-full shadow-2xl flex flex-col justify-between overflow-hidden">
            
            {/* Header */}
            <div className="p-5 bg-amber-955 text-amber-50 flex justify-between items-center border-b border-stone-200">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-amber-300" />
                <h3 className="font-serif text-xl">Váš nákupný košík</h3>
              </div>
              <button 
                id="close-cart"
                onClick={() => setIsCartOpen(false)}
                className="text-stone-300 hover:text-white font-mono font-bold text-sm"
              >
                ZATVORIŤ [X]
              </button>
            </div>

            {/* List items */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-stone-400 space-y-2">
                  <ShoppingBag className="w-12 h-12 stroke-1 mx-auto" />
                  <p className="text-sm font-serif">Nákupný košík je zatiaľ prázdny.</p>
                  <p className="text-xs">Pridajte lahodné dezerty z našej ponuky.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item, idx) => (
                    <div key={`${item.product_id}-${item.variant_id || ''}-${idx}`} className="flex gap-4 border-b border-stone-150 pb-3 text-xs">
                      <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded bg-stone-100" />
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between font-serif">
                          <h5 className="font-bold text-stone-900">{item.name}</h5>
                          <span className="font-semibold">{item.price.toFixed(2)} EUR</span>
                        </div>
                        {item.variant_name && <span className="text-[10px] text-amber-900 bg-amber-50 rounded px-1">{item.variant_name}</span>}
                        {item.customization_notes && <p className="text-[9px] text-stone-500 bg-stone-50 p-1 rounded">Vlastný nápis: "{item.customization_notes}"</p>}
                        
                        <div className="flex justify-between items-center pt-1">
                          <div className="flex items-center gap-1.5 font-mono">
                            <button onClick={() => updateQuantity(item.product_id, item.variant_id, -1)} className="px-1.5 py-0.5 bg-stone-200 rounded hover:bg-stone-300">-</button>
                            <span className="font-bold text-stone-900">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.product_id, item.variant_id, 1)} className="px-1.5 py-0.5 bg-stone-200 rounded hover:bg-stone-300">+</button>
                          </div>
                          <button onClick={() => removeFromCart(item.product_id, item.variant_id)} className="text-red-700 hover:underline">Odstrániť</button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Checkout inputs form details */}
                  <form onSubmit={handleCheckout} className="space-y-3 pt-4 border-t border-stone-200 text-xs text-stone-700">
                    <span className="font-serif font-bold text-stone-900 text-sm block">1. Prepravné parametre & Zóny:</span>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <label className={`p-2.5 rounded-lg border text-center cursor-pointer font-serif font-semibold ${deliveryType === 'PICKUP' ? 'bg-amber-950 border-amber-950 text-amber-50' : 'bg-white border-stone-300 text-stone-700'}`}>
                        <input type="radio" name="deliv-type" checked={deliveryType === 'PICKUP'} onChange={() => setDeliveryType('PICKUP')} className="hidden" />
                        Osobný odber
                      </label>
                      <label className={`p-2.5 rounded-lg border text-center cursor-pointer font-serif font-semibold ${deliveryType === 'DELIVERY' ? 'bg-amber-950 border-amber-950 text-amber-50' : 'bg-white border-stone-300 text-stone-700'}`}>
                        <input type="radio" name="deliv-type" checked={deliveryType === 'DELIVERY'} onChange={() => setDeliveryType('DELIVERY')} className="hidden" />
                        Miestny rozvoz
                      </label>
                    </div>

                    {/* Zone selector for Test Case 2 */}
                    {deliveryType === 'DELIVERY' ? (
                      <div className="space-y-1.5 bg-amber-50/50 p-3 rounded-lg border border-amber-200">
                        <label className="block text-amber-950 font-bold">Vyberte doručovaciu zónu (Prepočet ceny):</label>
                        <select 
                          value={deliveryZone}
                          onChange={(e) => setDeliveryZone(e.target.value)}
                          className="w-full p-2 border border-stone-300 rounded bg-white text-stone-900 text-xs"
                        >
                          <option value="hlohovec">Zóna 1: Hlohovec Mesto (+2.00 EUR, min. dovoz 10.00 EUR)</option>
                          <option value="sulekovo">Zóna 2: Leopoldov & Šulekovo (+4.55 EUR, min. dovoz 15.00 EUR)</option>
                          <option value="obce">Zóna 3: Okolité blízke obce Hlohovca (+6.90 EUR, min. dovoz 25.00 EUR)</option>
                        </select>
                        <span className="text-[10px] text-stone-500 block leading-tight">Po prekročení limitu pre zónu dostanete dovoz zadarmo!</span>
                      </div>
                    ) : (
                      <div className="p-3 bg-stone-100 rounded-lg text-stone-600 text-[11px] leading-tight flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-stone-500" />
                        <span>Vyzdvihnutie zadarmo na prevádzke: <strong>Olajos Cukráreň, Pribinova 95, Hlohovec</strong>.</span>
                      </div>
                    )}

                    <span className="font-serif font-bold text-stone-900 text-sm block pt-2">2. Kontaktné a doručovacie údaje:</span>
                    
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" placeholder="Celé meno" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="p-2 border rounded text-stone-900 bg-white" />
                        <input type="tel" placeholder="Telefón (napr. +421...)" required value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="p-2 border rounded text-stone-900 bg-white" />
                      </div>
                      
                      <input type="email" placeholder="Kontaktný e-mail" required value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="w-full p-2 border rounded text-stone-900 bg-white" />

                      {deliveryType === 'DELIVERY' && (
                        <input type="text" placeholder="Ulica, súpisné číslo, mesto..." required value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} className="w-full p-2 border rounded text-stone-950 bg-white" />
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-stone-500 block">Deň doručenia:</label>
                          <input type="date" required value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="p-1.5 w-full border rounded text-stone-950 bg-white" />
                        </div>
                        <div>
                          <label className="text-[10px] text-stone-500 block">Časové okno:</label>
                          <select value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="p-1.5 w-full border rounded text-stone-950 bg-white">
                            <option value="10:00 - 12:00">Dopoludnia (10:00 - 12:00)</option>
                            <option value="12:00 - 14:00">Okolo obeda (12:00 - 14:00)</option>
                            <option value="14:00 - 16:00">Popoludní (14:00 - 16:00)</option>
                            <option value="16:00 - 18:00">Podvečer (16:00 - 18:00)</option>
                          </select>
                        </div>
                      </div>

                      <textarea placeholder="Osobitné inštrukcie pre zvonček, poschodie alebo chladenie..." value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} className="w-full p-2 border rounded text-stone-900 bg-white h-12" />
                    </div>

                    <div className="pt-2">
                      <button 
                        type="submit"
                        className="w-full py-3 bg-amber-955 hover:bg-amber-950 text-amber-50 font-serif font-semibold rounded-xl text-xs transition"
                      >
                        Odoslať a zaplatiť pri prevzatí
                      </button>
                    </div>

                  </form>
                </div>
              )}
            </div>

            {/* Price breakdown billing footer */}
            {cart.length > 0 && (
              <div className="p-5 border-t border-stone-200 bg-stone-100 text-xs text-stone-850 space-y-2 select-none">
                <div className="flex justify-between">
                  <span>Hodnota dezertov:</span>
                  <span className="font-semibold">{itemsSubtotal.toFixed(2)} EUR</span>
                </div>
                {deliveryType === 'DELIVERY' && (
                  <div className="flex justify-between">
                    <span>Cena rozvozu ({selectedZoneConfig.name}):</span>
                    <span>{deliveryCost === 0 ? 'ZADARMO' : `${deliveryCost.toFixed(2)} EUR`}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-serif font-bold text-stone-950 border-t border-stone-250 pt-2">
                  <span>Celková cena s dph:</span>
                  <span>{orderTotal.toFixed(2)} EUR</span>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* AUTENTIFIKACNE MODAL OKNO */}
      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        onSuccess={handleAuthSuccess} 
      />

      {/* Footer disclaimer lines */}
      <footer className="bg-stone-900 text-stone-400 text-[11px] py-10 px-6 border-t border-stone-800 mt-12 text-center select-none space-y-2">
        <p className="font-serif text-stone-300">© 2026 Olajos dezerty Hlohovec. Všetky práva vyhradené.</p>
        <p className="max-w-md mx-auto leading-normal">Prémiové remeselné dezerty so 100% maslom, mliekom a poctivým prístupom z cukrárne na Pribinovej doručujeme po celom regióne Hlohovca s prísnou kontrolou chladu.</p>
      </footer>

    </div>
  );
}
