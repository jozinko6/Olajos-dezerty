'use client'

import { useState } from 'react'
import { useView, useAuth } from '@/lib/stores'
import { api, ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Cake, Mail, Lock, User, Phone } from 'lucide-react'
import { toast } from 'sonner'

export function AuthView({ mode }: { mode: 'login' | 'register' }) {
  const { navigate } = useView()
  const { refresh } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        await api.post('/api/auth/login', { email, password })
      } else {
        await api.post('/api/auth/register', { email, password, fullName, phone })
      }
      await refresh()
      toast.success(mode === 'login' ? 'Vitajte späť!' : 'Účet bol vytvorený.')
      navigate('home')
    } catch (e: any) {
      if (e instanceof ApiError) toast.error(e.message)
      else toast.error('Nastala chyba.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--chocolate)] flex items-center justify-center text-[var(--cream)] mx-auto mb-4 shadow-lg">
            <Cake className="h-7 w-7" />
          </div>
          <h1 className="font-display text-3xl font-bold text-[var(--chocolate)]">
            {mode === 'login' ? 'Prihlásenie' : 'Registrácia'}
          </h1>
          <p className="text-[var(--muted-foreground)] mt-2">
            {mode === 'login' ? 'Vitajte späť v Olajos Dezerty.' : 'Vytvorte si účet a získajte vernostné body.'}
          </p>
        </div>

        <Card className="p-6 bg-[var(--card)] border-[var(--border)] shadow-sm">
          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-[var(--chocolate)]">Meno a priezvisko</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                  <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} required className="pl-9" placeholder="Janka Nováková" />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[var(--chocolate)]">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="pl-9" placeholder="vas@email.sk" />
              </div>
            </div>
            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-[var(--chocolate)]">Telefón (voliteľné)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                  <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} className="pl-9" placeholder="+421 900 000 000" />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[var(--chocolate)]">Heslo</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="pl-9" placeholder="••••••••" />
              </div>
              {mode === 'register' && <p className="text-xs text-[var(--muted-foreground)]">Minimálne 8 znakov.</p>}
            </div>
            <Button type="submit" className="w-full bg-[var(--chocolate)] text-[var(--cream)] hover:bg-[var(--gold)] hover:text-[var(--chocolate)]" disabled={loading}>
              {loading ? 'Spracúvavam...' : mode === 'login' ? 'Prihlásiť sa' : 'Vytvoriť účet'}
            </Button>
          </form>
          <div className="text-center mt-4 text-sm text-[var(--muted-foreground)]">
            {mode === 'login' ? (
              <>Nemáte účet? <button onClick={() => navigate('register')} className="text-[var(--gold)] hover:underline">Zaregistrujte sa</button></>
            ) : (
              <>Máte účet? <button onClick={() => navigate('login')} className="text-[var(--gold)] hover:underline">Prihláste sa</button></>
            )}
          </div>
        </Card>

        {mode === 'login' && (
          <div className="mt-6 p-4 rounded-lg bg-[var(--secondary)]/50 border border-[var(--border)] text-sm text-[var(--muted-foreground)]">
            <p className="font-medium text-[var(--chocolate)] mb-1">Zamestnanecké účty:</p>
            <p>Heslá pre jednotlivé roly (admin, manager, výroba, balenie, dispečing, kuriér) boli vygenerované pri seedovaní databázy a vypísané v konzole. Pri produkcii sa heslá nastavujú bezpečne.</p>
          </div>
        )}
      </div>
    </div>
  )
}
