/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Truck, MapPin, Clock, Compass, ShieldCheck, PhoneCall, Check, Map, XCircle } from 'lucide-react';

interface LiveTrackingProps {
  trackingToken: string;
}

export default function LiveTracking({ trackingToken }: LiveTrackingProps) {
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchTracking = async () => {
    try {
      const data = await api.request(`/api/orders/track/${trackingToken}`);
      setOrder(data);
    } catch (e: any) {
      setError(e.message || 'Sledovanie nedostupné');
    }
  };

  useEffect(() => {
    fetchTracking();
    const interval = setInterval(fetchTracking, 5000); // Poll every 5s for realtime updates
    return () => clearInterval(interval);
  }, [trackingToken]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-2xl text-center space-y-2 max-w-md mx-auto">
        <XCircle className="w-10 h-10 text-red-650 mx-auto" />
        <h4 className="font-serif font-bold text-lg">Chyba sledovania</h4>
        <p className="text-xs">{error}</p>
        <p className="text-[11px] text-stone-500">Skontrolujte prosím správnosť odkazu vo vašom e-maile.</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12 text-stone-500 font-serif animate-pulse">
        Načítavam živé sledovanie doručenia...
      </div>
    );
  }

  // Calculating simulated vector offset
  // Base prevadzka (Pribinova): 48.4275, 17.7992
  // Customer address (MR Stefanika): 48.4239, 17.7975
  const courierLat = order.courier?.latitude || 48.4275;
  const courierLng = order.courier?.longitude || 17.7992;
  
  const totalLatDelta = 48.4275 - 48.4239;
  const currLatDelta = courierLat - 48.4239;
  const percentageCompleted = Math.max(0, Math.min(100, (1 - (currLatDelta / totalLatDelta)) * 100));

  // Simulating ETA based on distance completion
  const etaMins = Math.max(1, Math.round((1 - (percentageCompleted / 100)) * 12));

  return (
    <div id="live-tracking" className="bg-white border border-stone-200 rounded-2xl shadow-xl overflow-hidden max-w-xl mx-auto">
      
      {/* Visual Tracking header */}
      <div className="bg-amber-950 text-amber-50 p-6 border-b border-stone-150 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-mono font-bold uppercase">Sledovanie zásielky</span>
          <h3 className="font-serif text-2xl text-amber-100 mt-1">{order.order_number}</h3>
          <p className="text-[11px] text-stone-300">Určené pre: {order.customer_name}</p>
        </div>
        <div className="text-left sm:text-right bg-black/30 px-4 py-2.5 rounded-xl border border-white/10">
          <span className="text-[10px] text-stone-400 block uppercase">Predpokladaný čas (ETA):</span>
          {order.status === 'COMPLETED' ? (
            <span className="font-serif font-bold text-green-400 text-lg">DORUČENÉ</span>
          ) : order.status === 'OUT_FOR_DELIVERY' || order.status === 'ARRIVING' ? (
            <span className="font-serif font-bold text-amber-300 text-lg">Cca {etaMins} Minút</span>
          ) : (
            <span className="font-serif font-bold text-stone-300 text-base uppercase">Pripravujeme</span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        
        {/* Realtime tracking status steps timeline */}
        <div className="relative flex justify-between items-center w-full text-center text-[11px]">
          
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-stone-200 -translate-y-1/2 z-0" />
          
          {/* Progress fill bar */}
          <div 
            className="absolute top-1/2 left-0 h-0.5 bg-amber-900 -translate-y-1/2 z-0 transition-all duration-1000"
            style={{ width: `${order.status === 'NEW' ? 25 : order.status === 'IN_PRODUCTION' ? 50 : ['COURIER_ASSIGNED', 'COURIER_TO_STORE', 'PACKING'].includes(order.status) ? 75 : 100}%` }}
          />

          <div className="relative z-10 flex flex-col items-center gap-1 bg-white px-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold font-serif text-xs ${['NEW', 'IN_PRODUCTION', 'READY_FOR_PACKING', 'PACKING', 'COURIER_ASSIGNED', 'OUT_FOR_DELIVERY', 'ARRIVING', 'DELIVERED', 'COMPLETED'].includes(order.status) ? 'bg-amber-900 text-amber-50' : 'bg-stone-200 text-stone-600'}`}>1</span>
            <span className="font-semibold text-stone-800">Prijaté</span>
          </div>
          
          <div className="relative z-10 flex flex-col items-center gap-1 bg-white px-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold font-serif text-xs ${['IN_PRODUCTION', 'READY_FOR_PACKING', 'PACKING', 'COURIER_ASSIGNED', 'OUT_FOR_DELIVERY', 'ARRIVING', 'DELIVERED', 'COMPLETED'].includes(order.status) ? 'bg-amber-900 text-amber-50' : 'bg-stone-200 text-stone-600'}`}>2</span>
            <span className="font-semibold text-stone-800">Výroba</span>
          </div>

          <div className="relative z-10 flex flex-col items-center gap-1 bg-white px-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold font-serif text-xs ${['COURIER_ASSIGNED', 'OUT_FOR_DELIVERY', 'ARRIVING', 'DELIVERED', 'COMPLETED'].includes(order.status) ? 'bg-amber-900 text-amber-50' : 'bg-stone-200 text-stone-600'}`}>3</span>
            <span className="font-semibold text-stone-800">Rozvoz</span>
          </div>

          <div className="relative z-10 flex flex-col items-center gap-1 bg-white px-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold font-serif text-xs ${['DELIVERED', 'COMPLETED'].includes(order.status) ? 'bg-amber-900 text-amber-50' : 'bg-stone-200 text-stone-600'}`}>4</span>
            <span className="font-semibold text-stone-800">Hotovo</span>
          </div>
        </div>

        {/* Realtime geolocated map visualization vector design */}
        {['OUT_FOR_DELIVERY', 'ARRIVING', 'DELIVERED'].includes(order.status) && (
          <div className="pt-2">
            <span className="text-stone-400 font-bold uppercase tracking-wider text-[9px] block mb-2">Živé monitorovanie trasy na mape Hlohovca:</span>
            
            <div className="relative w-full h-[220px] bg-stone-100 rounded-xl border border-stone-200 overflow-hidden flex flex-col justify-between p-4">
              
              {/* grid grid-roads vector rendering */}
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="w-full h-full bg-[linear-gradient(90deg,#ccc_1px,transparent_1px),linear-gradient(#ccc_1px,transparent_1px)] bg-[size:28px_28px]" />
                <div className="absolute left-[33%] top-0 bottom-0 w-1.5 bg-stone-900" />
                <div className="absolute left-0 right-0 top-[42%] h-1.5 bg-stone-900" />
                <div className="absolute left-[70%] top-0 bottom-0 w-1.5 bg-stone-900" />
              </div>

              {/* Prevádzka Olajos starting flag */}
              <div className="relative flex items-center gap-2 z-10 w-fit">
                <div className="w-8 h-8 rounded-full bg-amber-950 flex items-center justify-center shadow-md">
                  <MapPin className="w-4 h-4 text-amber-300" />
                </div>
                <div className="bg-white/90 border border-stone-200 rounded p-1 text-[10px] text-stone-800 shadow-sm leading-tight">
                  <strong className="block">Olajos Pribinova</strong>
                  Sklad a expedícia
                </div>
              </div>

              {/* Vector Courier animation dot */}
              {order.status !== 'COMPLETED' && (
                <div 
                  className="absolute z-20 flex flex-col items-center transition-all duration-1000"
                  style={{ 
                    left: `${20 + (percentageCompleted * 0.6)}%`, 
                    top: `${40 + (percentageCompleted * 0.2)}%` 
                  }}
                >
                  <div className="p-1.5 bg-amber-100 border-2 border-amber-950 rounded-full shadow-lg flex items-center justify-center animate-bounce">
                    <Truck className="w-4 h-4 text-amber-950" />
                  </div>
                  <span className="bg-stone-900 text-stone-100 px-1.5 py-0.5 rounded text-[9px] mt-0.5 font-bold uppercase tracking-wide shadow whitespace-nowrap">
                    Kuriér {order.courier?.name || 'Olajos'}
                  </span>
                </div>
              )}

              {/* Final target address point */}
              <div className="relative flex items-center gap-2 z-10 w-fit self-end mt-4">
                <div className="bg-white/90 border border-stone-200 rounded p-1 text-[10px] text-stone-800 shadow-sm leading-tight text-right">
                  <strong className="block text-amber-900">M. R. Štefánika 45</strong>
                  Vaša adresa doručenia
                </div>
                <div className="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center shadow-md">
                  <MapPin className="w-4 h-4 text-green-300" />
                </div>
              </div>

            </div>
            
            <div className="flex gap-2 justify-between items-center text-[10px] text-stone-500 mt-2 font-mono">
              <span>Vyzdvihol: {order.courier?.name}</span>
              <span>Posledný GPS signál: {new Date(order.courier?.last_updated || Date.now()).toLocaleTimeString()}</span>
            </div>
          </div>
        )}

        {/* Detailed status summary details */}
        <div className="border border-stone-150 p-4 rounded-xl space-y-2 bg-stone-50">
          <h4 className="font-serif font-semibold text-stone-900 text-sm">Status objednávky:</h4>
          
          <div className="text-xs text-stone-800 space-y-2">
            <p>
              Aktuálny stav: <strong className="text-amber-950 font-serif">{order.status === 'NEW' ? 'Zaregistrovaná a čaká na schválenie recepciou' : order.status === 'IN_PRODUCTION' ? 'Pripravovaná šikovnými cukrármi v kuchyni' : order.status === 'COURIER_ASSIGNED' ? 'Dovoz bol priradený kuriérovi' : order.status === 'OUT_FOR_DELIVERY' ? 'Vaše dezerty sú naložené a miera k vám!' : order.status === 'DELIVERED' ? 'Zásielka odovzdaná doručovacím dňom' : order.status}</strong>
            </p>
            <p className="text-stone-600">
              Spôsob doručenia: <strong>{order.delivery_type === 'DELIVERY' ? 'Lokálny rozvoz Hlohovec' : 'Osobný odber Pribinova 95'}</strong>
            </p>
          </div>
        </div>

        {/* Safe GDPR compliance courier contacts widget */}
        {order.courier && (
          <div className="border border-stone-150 p-4 rounded-xl flex items-center justify-between bg-amber-50/50">
            <div className="flex items-center gap-2">
              <div className="p-2.5 bg-amber-100 rounded-xl">
                <ShieldCheck className="w-5 h-5 text-amber-950" />
              </div>
              <div>
                <h5 className="font-serif font-semibold text-stone-900 text-xs">Bezpečné spojenie s kuriérom</h5>
                <p className="text-[10px] text-stone-500">Meno: Kuriér {order.courier.name} • Maskovaný prenos polohy</p>
              </div>
            </div>
            <button 
              onClick={() => alert(`Prepojovací hovor chránený GDPR smeruje na číslo kuriéra: +421 903 333 444`)}
              className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-amber-50 text-xs font-serif font-medium rounded-lg flex items-center gap-1 shadow-sm transition"
            >
              <PhoneCall className="w-3.5 h-3.5 text-amber-300" />
              Zavolať
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
