/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { FileText, Plus, Check, RefreshCw, Truck, Database, FileSpreadsheet, AlertTriangle, Coins, ShieldAlert, Sparkles, MapPin } from 'lucide-react';

export default function AdminPanel() {
  const [orders, setOrders] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'finance' | 'audit'>('orders');
  
  // Create product form state
  const [pName, setPName] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pCategory, setPCategory] = useState('cat_french');
  const [pLead, setPLead] = useState('12');
  const [pStock, setPStock] = useState('15');
  const [pDesc, setPDesc] = useState('');
  const [pGluten, setPGluten] = useState(false);
  const [pLactose, setPLactose] = useState(false);
  const [pSugar, setPSugar] = useState(false);
  const [pImg, setPImg] = useState('');
  const [productSuccess, setProductSuccess] = useState('');

  // Financial settlement state
  const [selectedCourierId, setSelectedCourierId] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [financeMsg, setFinanceMsg] = useState('');

  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');

  const refreshAll = async () => {
    setLoading(true);
    setGlobalError('');
    try {
      const ords = await api.request('/api/admin/orders');
      setOrders(ords);

      const cours = await api.request('/api/admin/couriers');
      setCouriers(cours);

      const auds = await api.request('/api/admin/audit');
      setAudit(auds);

      const prods = await api.request('/api/products');
      setProducts(prods);
    } catch (e: any) {
      setGlobalError(e.message || 'Chyba pri aktualizácii admin panelu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: string, note: string) => {
    try {
      await api.request(`/api/orders/${orderId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: newStatus, notes: note })
      });
      refreshAll();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const assignCourier = async (orderId: string, courierId: string) => {
    try {
      await api.request('/api/admin/assignments', {
        method: 'POST',
        body: JSON.stringify({ order_id: orderId, courier_id: courierId })
      });
      refreshAll();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setProductSuccess('');
    try {
      const body = {
        name_sk: pName,
        base_price: pPrice,
        category_id: pCategory,
        min_lead_hours: pLead,
        quantity_stock: pStock,
        short_desc_sk: pDesc,
        is_gluten_free: pGluten,
        is_lactose_free: pLactose,
        is_sugar_free: pSugar,
        image_url: pImg || undefined
      };

      await api.request('/api/admin/products', {
        method: 'POST',
        body: JSON.stringify(body)
      });

      setProductSuccess('Nový dezert bol úspešne pridaný s prideleným skladom!');
      setPName('');
      setPPrice('');
      setPDesc('');
      setPStock('15');
      setPImg('');
      setPGluten(false);
      setPLactose(false);
      setPSugar(false);
      refreshAll();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleSettlePayments = async (e: React.FormEvent) => {
    e.preventDefault();
    setFinanceMsg('');
    try {
      await api.request('/api/admin/finance/settle', {
        method: 'POST',
        body: JSON.stringify({
          courier_id: selectedCourierId,
          expected_amount: expAmount,
          received_amount: recAmount
        })
      });
      setFinanceMsg('Finančné vyrovnanie hotovosti bolo s úspechom auditované a zapísané!');
      setExpAmount('');
      setRecAmount('');
      setSelectedCourierId('');
      refreshAll();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const selectCourierForFinance = (cId: string, cashBal: number) => {
    setSelectedCourierId(cId);
    setExpAmount(String(cashBal));
    setRecAmount(String(cashBal));
  };

  return (
    <div id="admin-panel" className="bg-white border border-stone-200 rounded-2xl shadow-xl overflow-hidden">
      
      {/* Admin header */}
      <div className="bg-stone-900 text-stone-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 bg-amber-700 text-white text-xs font-bold rounded">ADMIN</span>
            <h2 className="font-serif text-3xl tracking-wide text-amber-100">Olajos Management</h2>
          </div>
          <p className="text-stone-400 text-xs mt-1">Kompletný panel pre administráciu objednávok, skladu, logistiky a audit logov</p>
        </div>
        <button 
          onClick={refreshAll}
          disabled={loading}
          className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-stone-700 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Aktualizujem...' : 'Aktualizovať panel'}
        </button>
      </div>

      {globalError && (
        <div className="p-4 bg-red-50 border-b border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{globalError}</span>
        </div>
      )}

      {/* Tabs list */}
      <div className="flex border-b border-stone-200 bg-stone-50 overflow-x-auto">
        <button 
          id="tab-orders"
          onClick={() => setActiveTab('orders')}
          className={`flex-1 py-3 px-4 text-center border-b-2 font-serif text-sm font-medium transition whitespace-nowrap ${activeTab === 'orders' ? 'border-amber-950 text-amber-950 bg-white' : 'border-transparent text-stone-600 hover:text-stone-950'}`}
        >
          Objednávky ({orders.length})
        </button>
        <button 
          id="tab-products"
          onClick={() => setActiveTab('products')}
          className={`flex-1 py-3 px-4 text-center border-b-2 font-serif text-sm font-medium transition whitespace-nowrap ${activeTab === 'products' ? 'border-amber-950 text-amber-950 bg-white' : 'border-transparent text-stone-600 hover:text-stone-950'}`}
        >
          Sklad & Produkty
        </button>
        <button 
          id="tab-finance"
          onClick={() => setActiveTab('finance')}
          className={`flex-1 py-3 px-4 text-center border-b-2 font-serif text-sm font-medium transition whitespace-nowrap ${activeTab === 'finance' ? 'border-amber-950 text-amber-950 bg-white' : 'border-transparent text-stone-600 hover:text-stone-950'}`}
        >
          Financie & Kuriéri
        </button>
        <button 
          id="tab-audit"
          onClick={() => setActiveTab('audit')}
          className={`flex-1 py-3 px-4 text-center border-b-2 font-serif text-sm font-medium transition whitespace-nowrap ${activeTab === 'audit' ? 'border-amber-950 text-amber-950 bg-white' : 'border-transparent text-stone-600 hover:text-stone-950'}`}
        >
          Audit Logy ({audit.length})
        </button>
      </div>

      <div className="p-6">
        
        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="space-y-6 animate-fade-in">
            {orders.length === 0 ? (
              <div className="text-center py-12 text-stone-400 space-y-2">
                <FileText className="w-12 h-12 mx-auto stroke-1" />
                <p className="text-sm">Zatiaľ neboli zaznamenané žiadne objednávky v databáze.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((ord) => {
                  const itemsSummary = ord.items.map((it: any) => `${it.quantity}x ${it.product_name_snapshot} (${it.variant_name_snapshot || 'Klasik'})`).join(', ');
                  return (
                    <div key={ord.id} className="border border-stone-200 rounded-xl p-5 hover:bg-stone-50 transition space-y-4 bg-white shadow-sm">
                      <div className="flex flex-col md:flex-row justify-between md:items-center gap-2 border-b border-stone-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded">{ord.order_number}</span>
                            <span className="font-serif font-medium text-stone-900 text-base">{ord.customer_name}</span>
                          </div>
                          <div className="text-xs text-stone-500 mt-0.5 flex flex-wrap gap-2">
                            <span>Vytvorené: {new Date(ord.created_at).toLocaleTimeString('sk-SK', {hour: '2-digit', minute: '2-digit'})}</span>
                            <span>•</span>
                            <span className="text-stone-800 font-medium">Termín: {ord.scheduled_date} ({ord.scheduled_time_slot})</span>
                          </div>
                        </div>

                        {/* Status chip */}
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${ord.status === 'NEW' ? 'bg-indigo-100 text-indigo-800' : ord.status === 'COURIER_ASSIGNED' ? 'bg-blue-100 text-blue-800' : ord.status === 'DELIVERED' || ord.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : ord.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                            {ord.status}
                          </span>
                        </div>
                      </div>

                      {/* Detail list */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-stone-700">
                        <div className="space-y-1">
                          <span className="text-stone-400 block uppercase tracking-wider text-[10px]">Objednané položky:</span>
                          <span className="font-medium text-stone-900 block">{itemsSummary}</span>
                          {ord.customer_notes && (
                            <p className="text-[11px] text-amber-900 italic mt-1 bg-amber-50 p-1.5 rounded">Poznámka: "{ord.customer_notes}"</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <span className="text-stone-400 block uppercase tracking-wider text-[10px]">Logistika a Kontaktné info:</span>
                          <span className="font-medium text-stone-900 block">{ord.delivery_type === 'DELIVERY' ? 'Rozvoz ku dverám' : 'Osobný odber na prevádzke'}</span>
                          <span className="text-stone-600 block">{ord.contact_phone} • {ord.contact_email}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-stone-400 block uppercase tracking-wider text-[10px]">Finančný sumár:</span>
                          <span className="font-bold text-stone-900 text-sm block">{ord.final_price.toFixed(2)} EUR</span>
                          <span className="text-stone-500 text-[10px]">Doprava za zónu: {ord.delivery_price.toFixed(2)} EUR</span>
                        </div>
                      </div>

                      {/* Action trigger flows */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100 text-xs">
                        
                        {ord.status === 'NEW' && (
                          <>
                            <button 
                              onClick={() => handleStatusChange(ord.id, 'IN_PRODUCTION', 'Uvedené do výroby u cukrára')}
                              className="px-3 py-1.5 bg-amber-850 hover:bg-amber-950 text-amber-50 font-serif rounded-lg transition"
                            >
                              Schváliť a poslať do výroby
                            </button>
                            <button 
                              onClick={() => handleStatusChange(ord.id, 'CANCELLED', 'Stornované správcom')}
                              className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition"
                            >
                              Stornovať objednávku (Vráti na sklad)
                            </button>
                          </>
                        )}

                        {ord.status === 'IN_PRODUCTION' && (
                          <button 
                            onClick={() => handleStatusChange(ord.id, 'READY_FOR_PACKING', 'Výroba dokončená')}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
                          >
                            Označiť vyrobené / Poslať na balenie
                          </button>
                        )}

                        {ord.status === 'READY_FOR_PACKING' && (
                          <button 
                            onClick={() => handleStatusChange(ord.id, 'PACKING', 'Zabalené a označené štítkom')}
                            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition"
                          >
                            Zabaliť (Skontrolovať checklist)
                          </button>
                        )}

                        {ord.status === 'PACKING' && (
                          <>
                            {ord.delivery_type === 'DELIVERY' ? (
                              <div className="flex items-center gap-1.5 bg-stone-100 p-1.5 rounded-lg border border-stone-200">
                                <span className="font-medium text-stone-700">Dovoz. Priradiť kuriéra:</span>
                                <div className="flex gap-1">
                                  {couriers.map(c => (
                                    <button 
                                      key={c.id}
                                      onClick={() => assignCourier(ord.id, c.id)}
                                      className={`px-2.5 py-1 text-[11px] rounded font-bold transition ${c.status === 'OFFLINE' ? 'bg-red-50 text-red-400 cursor-not-allowed' : 'bg-amber-950 text-white hover:bg-amber-900'}`}
                                      disabled={c.status === 'OFFLINE'}
                                      title={c.status === 'OFFLINE' ? 'Kuriér je OFFLINE' : 'Priradiť'}
                                    >
                                      {c.user?.first_name} ({c.status})
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <button 
                                onClick={() => handleStatusChange(ord.id, 'READY_FOR_PICKUP', 'Pripravené na výdaj pre zákazníka')}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
                              >
                                Pripraviť na prevádzku pre Osobný Odber
                              </button>
                            )}
                          </>
                        )}

                        {ord.status === 'READY_FOR_PICKUP' && (
                          <button 
                            onClick={() => handleStatusChange(ord.id, 'COMPLETED', 'Prevzaté na pobočke Pribinova')}
                            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition font-serif font-medium"
                          >
                            Dokončiť odber (Odovzdané)
                          </button>
                        )}

                        {ord.status === 'COURIER_ASSIGNED' && (
                          <div className="flex items-center gap-1.5 text-stone-500 italic bg-amber-50 px-3 py-1.5 rounded border border-amber-200">
                            <Truck className="w-4 h-4 text-amber-700 animate-pulse" />
                            <span>Objednávka priradená kuriérovi. Čaká sa na nakládku.</span>
                          </div>
                        )}

                        {ord.status === 'DELIVERED' && (
                          <button 
                            onClick={() => handleStatusChange(ord.id, 'COMPLETED', 'Uzavretá doprava s vyúčtovaním')}
                            className="px-3 py-1.5 bg-green-700 hover:bg-green-800 text-white rounded-lg transition"
                          >
                            Spracovať splnenie (Uzavrieť)
                          </button>
                        )}

                        {ord.status === 'COMPLETED' && (
                          <span className="text-green-700 font-bold flex items-center gap-1">
                            <Check className="w-4 h-4" /> Dokončená a uzavretá
                          </span>
                        )}

                        {ord.status === 'CANCELLED' && (
                          <span className="text-red-700 font-bold">Stornovaná</span>
                        )}

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PRODUCTS & CATALOG INVENTORY TAB */}
        {activeTab === 'products' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            
            {/* Create Product Form */}
            <div className="lg:col-span-1 border border-stone-200 rounded-xl p-5 bg-stone-50 space-y-4">
              <h3 className="font-serif text-lg text-stone-900 border-b border-stone-200 pb-2 flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-950" />
                Nový dezert do ponuky
              </h3>

              {productSuccess && (
                <div className="p-3 text-xs bg-green-100 border border-green-300 text-green-700 rounded-xl">
                  {productSuccess}
                </div>
              )}

              <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Názov dezertu (SK)</label>
                  <input 
                    type="text" 
                    required
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                    placeholder="napr. Parížsky Veterník" 
                    className="w-full p-2 border border-stone-300 rounded bg-white text-stone-950 focus:border-amber-800 focus:ring-1 focus:ring-amber-500 outline-none text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-stone-700 mb-1">Cena (EUR)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      value={pPrice}
                      onChange={(e) => setPPrice(e.target.value)}
                      placeholder="e.g. 3.50" 
                      className="w-full p-2 border border-stone-300 rounded bg-white text-stone-950 focus:border-amber-800 focus:ring-1 focus:ring-amber-500 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-stone-700 mb-1">Skladom teraz (ks)</label>
                    <input 
                      type="number" 
                      required
                      value={pStock}
                      onChange={(e) => setPStock(e.target.value)}
                      placeholder="e.g. 15" 
                      className="w-full p-2 border border-stone-300 rounded bg-white text-stone-950 focus:border-amber-800 focus:ring-1 focus:ring-amber-500 outline-none text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-stone-700 mb-1">Kategória</label>
                  <select 
                    value={pCategory}
                    onChange={(e) => setPCategory(e.target.value)}
                    className="w-full p-2 border border-stone-300 rounded bg-white text-stone-950 focus:border-amber-800 focus:ring-1 focus:ring-amber-500 outline-none text-xs"
                  >
                    <option value="cat_french">Francúzske dezerty</option>
                    <option value="cat_classics">Klasické zákusky</option>
                    <option value="cat_cakes">Torty</option>
                    <option value="cat_icecream">Surová zmrzlina & Poháre</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-stone-700 mb-1">Čas výroby (hod.)</label>
                    <input 
                      type="number" 
                      required
                      value={pLead}
                      onChange={(e) => setPLead(e.target.value)}
                      className="w-full p-2 border border-stone-300 rounded bg-white text-stone-950 focus:border-amber-800 focus:ring-1 focus:ring-amber-500 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-stone-700 mb-1">Foto obrázok (URL)</label>
                    <input 
                      type="text" 
                      value={pImg}
                      onChange={(e) => setPImg(e.target.value)}
                      placeholder="Nechajte prázdne pre placeholder"
                      className="w-full p-2 border border-stone-300 rounded bg-white text-stone-950 focus:border-amber-800 focus:ring-1 focus:ring-amber-500 outline-none text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-stone-700 mb-1">Krátky popis</label>
                  <textarea 
                    value={pDesc}
                    onChange={(e) => setPDesc(e.target.value)}
                    placeholder="Suroviny, príchuť..." 
                    className="w-full p-2 border border-stone-300 rounded bg-white text-stone-950 focus:border-amber-800 focus:ring-1 focus:ring-amber-500 text-xs h-16 outline-none"
                  />
                </div>

                {/* Dietary restrictions checkboxes */}
                <div className="space-y-1.5 pt-1">
                  <span className="block font-semibold text-stone-700">Alergénové kategórie (Zvážiť vylúčenie):</span>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={pGluten} onChange={(e) => setPGluten(e.target.checked)} className="rounded" />
                      <span>Bezlepkový</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={pLactose} onChange={(e) => setPLactose(e.target.checked)} className="rounded" />
                      <span>Bez laktózy</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={pSugar} onChange={(e) => setPSugar(e.target.checked)} className="rounded" />
                      <span>Bez cukru</span>
                    </label>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full py-2.5 bg-amber-950 hover:bg-amber-900 text-amber-50 font-serif font-medium rounded transition text-xs shadow"
                >
                  Uložiť produkt a naskladniť
                </button>
              </form>
            </div>

            {/* Product lists and inventory stocks */}
            <div className="lg:col-span-2 border border-stone-200 rounded-xl p-5 bg-white space-y-4">
              <h3 className="font-serif text-lg text-stone-900 border-b border-stone-200 pb-2 flex items-center gap-2">
                <Database className="w-5 h-5 text-amber-950" />
                Dostupnosť & Skladové stavy na prevádzke (Hlohovec Pribinova)
              </h3>

              <div className="overflow-x-auto text-xs">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200">
                      <th className="p-3 text-left">Názov produktu</th>
                      <th className="p-3 text-center">Základná cena</th>
                      <th className="p-3 text-center">Sklad (ks)</th>
                      <th className="p-3 text-center">Stav zásob</th>
                      <th className="p-3 text-center">Dodanie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => {
                      const stockVal = p.stock ? p.stock.quantity : 0;
                      return (
                        <tr key={p.id} className="border-b border-stone-100 hover:bg-stone-50 transition">
                          <td className="p-3 font-medium text-stone-900">{p.name_sk}</td>
                          <td className="p-3 text-center text-stone-600 font-semibold">{p.base_price.toFixed(2)} EUR</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full font-mono font-bold ${stockVal === 0 ? 'bg-red-100 text-red-800' : stockVal < 5 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                              {stockVal} ks
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {stockVal === 0 ? (
                              <span className="text-red-700 font-semibold">VYPREDANÉ</span>
                            ) : (
                              <span className="text-green-700 font-semibold">SKLADOM</span>
                            )}
                          </td>
                          <td className="p-3 text-center text-stone-500">
                            {p.delivery_allowed ? 'Rozvoz + Odber' : 'Iba Osobný Odber'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* FINANCIALS & COURIERS SETTLEMENT */}
        {activeTab === 'finance' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            
            {/* Settle cash form */}
            <div className="lg:col-span-1 border border-stone-200 rounded-xl p-5 bg-stone-50 space-y-4">
              <h3 className="font-serif text-lg text-stone-900 border-b border-stone-200 pb-2 flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-950" />
                Vyúčtovanie hotovosti kuriéra
              </h3>

              {financeMsg && (
                <div className="p-3 text-xs bg-green-100 border border-green-300 text-green-700 rounded-xl">
                  {financeMsg}
                </div>
              )}

              <form onSubmit={handleSettlePayments} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Zadajte Kuriéra</label>
                  <select 
                    required
                    value={selectedCourierId}
                    onChange={(e) => setSelectedCourierId(e.target.value)}
                    className="w-full p-2 border border-stone-300 rounded bg-white text-stone-950 focus:border-amber-800 focus:ring-1 focus:ring-amber-500 outline-none text-xs"
                  >
                    <option value="">-- Vyberte kuriéra --</option>
                    {couriers.map(c => (
                      <option key={c.id} value={c.id}>{c.user?.first_name} {c.user?.last_name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-stone-700 mb-1">Očakávaná suma (EUR)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                      placeholder="0.00" 
                      className="w-full p-2 border border-stone-300 rounded bg-white text-stone-950"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-stone-700 mb-1">Skutočne odovzdané (EUR)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      value={recAmount}
                      onChange={(e) => setRecAmount(e.target.value)}
                      placeholder="0.00" 
                      className="w-full p-2 border border-stone-300 rounded bg-white text-stone-950"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full py-2.5 bg-green-700 hover:bg-green-800 text-green-50 font-serif font-medium rounded transition text-xs shadow"
                >
                  Potvrdiť uzávierku s odovzdaním
                </button>
              </form>
            </div>

            {/* Courier active states list */}
            <div className="lg:col-span-2 border border-stone-200 rounded-xl p-5 bg-white space-y-4">
              <h3 className="font-serif text-lg text-stone-900 border-b border-stone-200 pb-2 flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-950" />
                Aktívni registrovaní Kuriéri & Vyzdvihnutá hotovosť
              </h3>

              <div className="space-y-3">
                {couriers.map(c => {
                  const balanceVal = orders
                    .filter(o => o.assignment?.courier_id === c.id && o.status === 'DELIVERED')
                    .reduce((sum, o) => sum + o.final_price, 0);

                  return (
                    <div key={c.id} className="border border-stone-150 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50 transition">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${c.status === 'OFFLINE' ? 'bg-red-500' : c.status === 'AVAILABLE' ? 'bg-green-500' : 'bg-amber-500'}`} />
                          <h4 className="font-serif font-medium text-stone-950 text-sm">{c.user?.first_name} {c.user?.last_name}</h4>
                          <span className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded font-bold uppercase">{c.vehicle?.vehicle_type || 'CAR'}</span>
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">Vozidlo: {c.vehicle?.plate_number || 'Bicykel/Chodec'} • Telefón: {c.user?.phone || 'Neuvedený'}</p>
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        <div className="text-right">
                          <span className="text-stone-400 block uppercase tracking-wider text-[9px]">Hotovosť na ruke:</span>
                          <span className="font-bold text-stone-900 text-sm block">{balanceVal.toFixed(2)} EUR</span>
                        </div>
                        {balanceVal > 0 && (
                          <button 
                            onClick={() => selectCourierForFinance(c.id, balanceVal)}
                            className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-serif font-semibold rounded border border-stone-350 transition"
                          >
                            Urobiť uzávierku
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* AUDIT LOG TAB */}
        {activeTab === 'audit' && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="font-serif text-lg text-stone-900 border-b border-stone-200 pb-2 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-700" />
              Sila kontroly: Nezmazateľný audit log zmien
            </h3>

            <div className="border border-stone-200 rounded-xl overflow-hidden bg-stone-50">
              <div className="max-h-[400px] overflow-y-auto text-xs">
                {audit.length === 0 ? (
                  <p className="text-center py-8 text-stone-400 font-serif">Zatiaľ žiadne záznamy v logu.</p>
                ) : (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200 p-2 text-left">
                        <th className="p-3">Časová pečiatka</th>
                        <th className="p-3">Udalosť (Action)</th>
                        <th className="p-3">Tabuľka</th>
                        <th className="p-3">IP Adresa</th>
                        <th className="p-3">Zmeny / Payload</th>
                      </tr>
                    </thead>
                    <tbody>
                      {audit.map(aud => (
                        <tr key={aud.id} className="border-b border-stone-150 hover:bg-stone-50 transition">
                          <td className="p-3 font-mono text-[10px] text-stone-500 whitespace-nowrap">{new Date(aud.created_at).toLocaleString('sk-SK')}</td>
                          <td className="p-3 font-semibold text-stone-800">
                            <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-red-50 text-red-800 border border-red-200 uppercase">{aud.action_type}</span>
                          </td>
                          <td className="p-3 text-stone-600 font-mono text-[10px]">{aud.table_name}</td>
                          <td className="p-3 text-stone-500 font-mono text-[10px]">{aud.ip_address}</td>
                          <td className="p-3 text-stone-500 truncate max-w-xs" title={aud.new_values || aud.old_values}>
                            {aud.new_values || aud.old_values || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
