/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { api } from '../utils/api';
import { X, Lock, Mail, User, Phone, CheckSquare, Sparkles } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);
  
  // Corporate additional details
  const [isCorporate, setIsCorporate] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyDic, setCompanyDic] = useState('');
  const [companyIcDph, setCompanyIcDph] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      api.setAuth(data.token, data.user);
      onSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Chyba pri prihlasovaní');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        phone,
        marketing_consent: marketingConsent,
        ...(isCorporate ? { company_name: companyName, company_dic: companyDic, company_ic_dph: companyIcDph } : {})
      };

      const data = await api.request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      api.setAuth(data.token, data.user);
      onSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Chyba pri registrácii');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickAccount = (type: 'customer' | 'admin' | 'courier1') => {
    setError('');
    if (type === 'customer') {
      setEmail('jozinko66@gmail.com');
      setPassword('admin123');
    } else if (type === 'admin') {
      setEmail('olajosdezerty@gmail.com');
      setPassword('admin123');
    } else if (type === 'courier1') {
      setEmail('kurier1@olajos.sk');
      setPassword('admin123');
    }
    setIsRegister(false);
  };

  return (
    <div id="auth-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg overflow-hidden bg-stone-50 border border-stone-200 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Banner */}
        <div className="bg-amber-950 text-amber-50 p-6 flex items-center justify-between border-b border-stone-200">
          <div>
            <h3 className="font-serif text-2xl tracking-normal flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              {isRegister ? 'Registrácia v Olajos' : 'Prihlásenie do Olajos'}
            </h3>
            <p className="text-stone-300 text-xs mt-1">
              {isRegister ? 'Staňte sa verným zákazníkom a zbierajte body' : 'Vstúpte do sveta prémiových dezertov'}
            </p>
          </div>
          <button 
            id="close-auth"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-800 text-stone-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* Quick Demo Logins Helper */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <span className="text-amber-950 font-medium text-xs block mb-1.5">Rýchle testovacie kontá (Jedným klikom):</span>
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => fillQuickAccount('customer')} 
                className="px-2.5 py-1 text-xs font-medium rounded-lg border border-amber-300 bg-white text-amber-950 hover:bg-amber-100 transition"
              >
                Zákazník (Novák)
              </button>
              <button 
                onClick={() => fillQuickAccount('admin')} 
                className="px-2.5 py-1 text-xs font-medium rounded-lg border border-amber-300 bg-white text-amber-950 hover:bg-amber-100 transition"
              >
                Admin (Olajos)
              </button>
              <button 
                onClick={() => fillQuickAccount('courier1')} 
                className="px-2.5 py-1 text-xs font-medium rounded-lg border border-amber-300 bg-white text-amber-950 hover:bg-amber-100 transition"
              >
                Kuriér (Rýchly)
              </button>
            </div>
            <p className="text-[10px] text-amber-900 mt-1.5">Kliknutím sa predvyplnia prihlasovacie údaje. Všetky majú heslo: <strong>admin123</strong></p>
          </div>

          {error && (
            <div className="p-3 text-xs bg-red-100 border border-red-300 text-red-700 rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-4">
            
            {isRegister && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Meno</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input 
                      type="text" 
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="napr. Ján" 
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-stone-300 bg-white text-stone-950 focus:border-amber-800 focus:ring-1 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Priezvisko</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input 
                      type="text" 
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="napr. Novák" 
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-stone-300 bg-white text-stone-950 focus:border-amber-800 focus:ring-1 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">E-mailová adresa</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="napr. janko@gmail.com" 
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-stone-300 bg-white text-stone-950 focus:border-amber-800 focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Telefónne číslo</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="napr. +421 905 111 222" 
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-stone-300 bg-white text-stone-950 focus:border-amber-800 focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Prihlasovacie heslo</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Zadajte heslo" 
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-stone-300 bg-white text-stone-950 focus:border-amber-800 focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            {isRegister && (
              <div className="space-y-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsCorporate(!isCorporate)}
                  className="text-xs font-medium text-amber-900 hover:underline flex items-center gap-1"
                >
                  {isCorporate ? '- Nakupujem ako bežný občan' : '+ Pridať firemné fakturačné údaje'}
                </button>

                {isCorporate && (
                  <div className="p-3 border border-stone-200 rounded-lg bg-stone-100 grid grid-cols-3 gap-2">
                    <div className="col-span-3">
                      <label className="text-[10px] text-stone-600 block mb-0.5">Názov firmy / Inštitúcie</label>
                      <input 
                        type="text" 
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Firma s.r.o." 
                        className="w-full p-1.5 text-xs rounded border border-stone-300 text-stone-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-stone-600 block mb-0.5">IČO</label>
                      <input 
                        type="text" 
                        value={companyDic}
                        onChange={(e) => setCompanyDic(e.target.value)}
                        placeholder="5234511" 
                        className="w-full p-1.5 text-xs rounded border border-stone-300 text-stone-900"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-stone-600 block mb-0.5">DIČ / IČ DPH</label>
                      <input 
                        type="text" 
                        value={companyIcDph}
                        onChange={(e) => setCompanyIcDph(e.target.value)}
                        placeholder="SK20211333" 
                        className="w-full p-1.5 text-xs rounded border border-stone-300 text-stone-900"
                      />
                    </div>
                  </div>
                )}

                <label className="flex items-start gap-2 cursor-pointer text-xs text-stone-600 select-none">
                  <input 
                    type="checkbox" 
                    checked={marketingConsent}
                    onChange={(e) => setMarketingConsent(e.target.checked)}
                    className="mt-0.5 rounded text-amber-800" 
                  />
                  <span>Súhlasím so zasielaním noviniek a zliav e-mailom a s narodeninovými bonusmi z vernostného programu Olajos.</span>
                </label>
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-amber-900 hover:bg-amber-950 text-amber-50 font-serif font-medium rounded-lg shadow-md transition disabled:opacity-50"
            >
              {loading ? 'Spracúvam...' : isRegister ? 'Dokončiť registráciu' : 'Prihlásiť sa'}
            </button>

          </form>

          <div className="text-center pt-2">
            <button 
              onClick={() => setIsRegister(!isRegister)}
              className="text-xs text-stone-600 hover:text-amber-900 font-medium underline"
            >
              {isRegister ? 'Už máte vytvorený účet? Prihláste sa' : 'Nemáte ešte účet? Zaregistrujte sa zadarmo'}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
