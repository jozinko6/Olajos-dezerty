/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Truck, Navigation, CheckCircle, Navigation2, XCircle, DollarSign, Smartphone, Compass, Clock, MapPin } from 'lucide-react';

interface CourierPanelProps {
  courierId: string;
}

export default function CourierPanel({ courierId }: CourierPanelProps) {
  const [profile, setProfile] = useState<any>(null);
  const [activeJob, setActiveJob] = useState<any>(null);
  const [finance, setFinance] = useState<any>({ earnings: [], cash_balance: 0 });
  const [status, setStatus] = useState<'OFFLINE' | 'AVAILABLE' | 'ON_TRIP' | 'BREAK'>('OFFLINE');
  
  // Simulated location coords (Simulates driving in Hlohovec)
  const [simLat, setSimLat] = useState(48.4275);
  const [simLng, setSimLng] = useState(17.7992);
  const [isDriving, setIsDriving] = useState(false);

  const [loading, setLoading] = useState(false);

  const fetchCourierData = async () => {
    try {
      setLoading(true);
      const prf = await api.request(`/api/admin/couriers`);
      const matched = prf.find((c: any) => c.id === courierId);
      if (matched) {
        setProfile(matched);
        setStatus(matched.status);
        setSimLat(matched.current_latitude || 48.4275);
        setSimLng(matched.current_longitude || 17.7992);
      }

      // Active jobs (assignments where order status is not COMPLETED / CANCELLED)
      const allOrders = await api.request('/api/admin/orders');
      const matchedOrder = allOrders.find((o: any) => 
        o.assignment?.courier_id === courierId && 
        ['COURIER_ASSIGNED', 'COURIER_TO_STORE', 'OUT_FOR_DELIVERY', 'ARRIVING', 'DELIVERED'].includes(o.status)
      );
      setActiveJob(matchedOrder || null);

      const fin = await api.request(`/api/couriers/${courierId}/finance`);
      setFinance(fin);
    } catch (e: any) {
      console.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourierData();
  }, [courierId]);

  const handleStatusToggle = async (newStatus: typeof status) => {
    try {
      await api.request('/api/couriers/status', {
        method: 'POST',
        body: JSON.stringify({ courier_id: courierId, status: newStatus })
      });
      setStatus(newStatus);
      fetchCourierData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleJobStatusUpdate = async (orderId: string, nextStatus: string, logNote: string) => {
    try {
      await api.request(`/api/orders/${orderId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: nextStatus, notes: logNote })
      });
      
      // If completed we should trigger earnings calculation logging/etc
      fetchCourierData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Simulates GPS updates driving towards customer address
  useEffect(() => {
    let interval: any = null;
    if (isDriving && activeJob) {
      // Destination coordinate
      const destLat = 48.4239; // demo address coords
      const destLng = 17.7975;

      interval = setInterval(() => {
        setSimLat(prev => {
          const delta = destLat - prev;
          if (Math.abs(delta) < 0.0005) {
            setIsDriving(false);
            // Auto switch to ARRIVING if very close
            handleJobStatusUpdate(activeJob.id, 'ARRIVING', 'Kuriér sa blíži k dverám s dezertmi');
            return destLat;
          }
          return prev + (delta * 0.25);
        });

        setSimLng(prev => {
          const delta = destLng - prev;
          return prev + (delta * 0.25);
        });
      }, 3000);
    }

    return () => clearInterval(interval);
  }, [isDriving, activeJob]);

  // Push coordinate updates to API server
  useEffect(() => {
    if (status !== 'OFFLINE') {
      api.request('/api/couriers/location', {
        method: 'POST',
        body: JSON.stringify({
          courier_id: courierId,
          latitude: simLat,
          longitude: simLng,
          speed: isDriving ? 45 : 0
        })
      }).catch(err => console.error(err));
    }
  }, [simLat, simLng, isDriving, status]);

  const startDriverSimulation = () => {
    setIsDriving(true);
    if (activeJob) {
      handleJobStatusUpdate(activeJob.id, 'OUT_FOR_DELIVERY', 'Kuriér naložil dezerty a vyráža k vám');
    }
  };

  return (
    <div id="courier-panel" className="bg-stone-100 border border-stone-200 rounded-2xl shadow-xl overflow-hidden max-w-md mx-auto">
      
      {/* Mobile viewport header wrapper */}
      <div className="bg-amber-950 text-amber-50 p-5 flex items-center justify-between border-b border-stone-200">
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-amber-300" />
          <div>
            <h3 className="font-serif text-lg tracking-wide text-amber-100">Kuriér Klientska Zóna</h3>
            <p className="text-[10px] text-stone-300">Prihlásený ako: {profile?.user?.first_name} {profile?.user?.last_name}</p>
          </div>
        </div>
        
        {/* State Toggle badge */}
        <div className="flex gap-1 bg-black/40 p-1 rounded-lg">
          <button 
            id="status-online"
            onClick={() => handleStatusToggle('AVAILABLE')}
            className={`px-2 py-1 text-[10px] font-bold rounded ${status === 'AVAILABLE' ? 'bg-green-500 text-white' : 'text-stone-300 hover:text-white'}`}
          >
            ONLINE
          </button>
          <button 
            id="status-offline"
            onClick={() => handleStatusToggle('OFFLINE')}
            className={`px-2 py-1 text-[10px] font-bold rounded ${status === 'OFFLINE' ? 'bg-red-500 text-white' : 'text-stone-300 hover:text-white'}`}
          >
            OFFLINE
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        
        {/* GPS tracking simulation panel (Visible when activeJob) */}
        {status !== 'OFFLINE' && (
          <div className="bg-white p-4 rounded-xl shadow-sm text-xs space-y-2 border border-stone-200">
            <h4 className="font-serif font-semibold text-stone-900 flex items-center gap-1.5 border-b border-stone-100 pb-1.5">
              <Compass className={`w-4 h-4 text-amber-900 ${isDriving ? 'animate-spin' : ''}`} />
              Simulátor DPS polohy kuriéra
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-stone-600">
              <div>Šírka (Lat): <span className="font-bold text-stone-900">{simLat.toFixed(5)}</span></div>
              <div>Dĺžka (Lng): <span className="font-bold text-stone-900">{simLng.toFixed(5)}</span></div>
            </div>
            
            {activeJob && activeJob.status === 'COURIER_ASSIGNED' && (
              <button 
                onClick={() => handleJobStatusUpdate(activeJob.id, 'COURIER_TO_STORE', 'Kuriér potvrdil trasu a mieri na prevádzku vyzdvihnúť tovar')}
                className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-white rounded font-serif font-medium mt-1 transition"
              >
                Začať trasu na prevádzku (Pribinova)
              </button>
            )}

            {activeJob && activeJob.status === 'COURIER_TO_STORE' && (
              <button 
                onClick={() => handleJobStatusUpdate(activeJob.id, 'PACKING', 'Kuriér prišiel do predajne Olajos')}
                className="w-full py-2 bg-amber-900 hover:bg-amber-950 text-white rounded font-serif font-medium mt-1 transition"
              >
                Nahlásiť príchod na prevádzku na nakládku
              </button>
            )}

            {activeJob && ['COURIER_ASSIGNED', 'COURIER_TO_STORE', 'PACKING'].includes(activeJob.status) && (
              <div className="text-[10px] text-amber-900 bg-amber-50 rounded p-1.5 text-center mt-1">
                Zdieľanie polohy so zákazníkom: <strong>Vypnuté</strong> (aktivuje sa odchodom zo skladu)
              </div>
            )}
            
            {activeJob && activeJob.status === 'PACKING' && (
              <div className="space-y-2 pt-1 border-t border-stone-100">
                <span className="font-semibold text-stone-700 block">Baliaci checklist pre kuriéra:</span>
                <div className="space-y-1 text-[11px] text-stone-600">
                  <div className="flex items-center gap-1.5">
                    <input type="checkbox" required defaultChecked className="rounded text-green-700 focus:ring-0" />
                    <span>Zákusok vyžaduje chladiaci termobox</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input type="checkbox" required defaultChecked className="rounded text-green-700 focus:ring-0" />
                    <span>Torta naložená vo vodorovnej polohe</span>
                  </div>
                </div>
                <button 
                  onClick={startDriverSimulation}
                  className="w-full py-2 bg-green-700 hover:bg-green-800 text-white font-serif font-medium rounded transition"
                >
                  Naložené. Vyrážam k zákazníkovi (Spustiť GPS)
                </button>
              </div>
            )}

            {isDriving && (
              <div className="text-center py-1.5 animate-pulse text-green-800 font-bold bg-green-50 rounded">
                Simulovaná jazda k zákazníkovi prebieha...
              </div>
            )}
          </div>
        )}

        {/* ACTIVE DELIVERIES */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest pl-1">Aktívna úloha doručenia</h4>
          
          {status === 'OFFLINE' ? (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs text-center font-serif">
              Pre prijímanie objednávok sa prepnite do režimu <strong>ONLINE</strong>.
            </div>
          ) : !activeJob ? (
            <div className="bg-white p-6 rounded-xl text-center border border-stone-200 space-y-2 text-xs">
              <Clock className="w-8 h-8 text-stone-400 mx-auto stroke-1" />
              <p className="text-stone-700 font-serif">Aktuálne nemáte žiadne priradené rozvozy.</p>
              <p className="text-[10px] text-stone-400">Počkajte kým dispečer priradí objednávku z administrácie.</p>
            </div>
          ) : (
            <div className="bg-amber-950 text-amber-50 p-5 rounded-xl border border-stone-200 space-y-4 shadow-md">
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <div>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-mono font-bold block w-fit">{activeJob.order_number}</span>
                  <h4 className="font-serif font-medium text-amber-100 text-base mt-1">{activeJob.customer_name}</h4>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-stone-300 block">Suma k inkasu:</span>
                  <span className="font-bold text-amber-300 text-lg">{activeJob.final_price.toFixed(2)} EUR</span>
                </div>
              </div>

              {/* Delivery meta info */}
              <div className="space-y-2 text-xs text-stone-200">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-300" />
                  <span>Požadovaný čas: <strong>{activeJob.scheduled_date} ({activeJob.scheduled_time_slot})</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-amber-300" />
                  <span>Adresa: <strong>M. R. Štefánika 45, Hlohovec</strong></span>
                </div>
              </div>

              {/* Confirm doručenie */}
              {['ARRIVING', 'DELIVERED'].includes(activeJob.status) && (
                <div className="pt-2 space-y-2">
                  <div className="p-2.5 bg-green-950/60 border border-green-800 rounded-lg text-[11px] text-green-300">
                    Smer doručenia: <strong>Zákazník zvolil hotovosť.</strong> Inkasujte sumu a odovzdajte zásielku s úsmevom.
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleJobStatusUpdate(activeJob.id, 'DELIVERED', 'Zásieka bola úspešne odovzdaná a podpísaná')}
                      className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <CheckCircle className="w-4 h-4" /> Označiť ako Doručené
                    </button>
                    <button 
                      onClick={() => handleJobStatusUpdate(activeJob.id, 'COURIER_ASSIGNED', 'Zákazník nedvíhal. Zásielka vrátená na prevádzku.')}
                      className="px-3 bg-red-800 hover:bg-red-900 text-white rounded-lg flex items-center justify-center transition"
                      title="Problém s doručením"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* COURIER EARNINGS & BALANCE SUMMARY */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest pl-1">Moje denné financie</h4>
          <div className="bg-white border border-stone-200 p-4 rounded-xl grid grid-cols-2 gap-4 text-xs">
            <div className="border-r border-stone-100 pr-2">
              <span className="text-stone-400 text-[10px] block uppercase">Pripísané odmeny:</span>
              <span className="font-bold text-stone-900 text-base mt-0.5 block">{(finance.earnings?.length * 4.70 || 0).toFixed(2)} EUR</span>
              <span className="text-[10px] text-stone-500 block leading-tight">Za {finance.earnings?.length || 0} dokončených rozvozov</span>
            </div>
            <div className="pl-2">
              <span className="text-stone-400 text-[10px] block uppercase">Hotovosť na ruke:</span>
              <span className="font-bold text-stone-900 text-base mt-0.5 block">{finance.cash_balance?.toFixed(2) || '0.00'} EUR</span>
              <span className="text-[10px] text-stone-500 block leading-tight">Získané inkasom hotovosti od doručení</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
