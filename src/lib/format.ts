// src/lib/format.ts
// Slovak formatting helpers for currency, dates, phone masking, etc.

export const eur = (n: number): string =>
  new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(n)

export const eurPlain = (n: number): string =>
  new Intl.NumberFormat('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

export const skDate = (d: Date | string): string =>
  new Intl.DateTimeFormat('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d))

export const skDateTime = (d: Date | string): string =>
  new Intl.DateTimeFormat('sk-SK', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d))

export const skTime = (d: Date | string): string =>
  new Intl.DateTimeFormat('sk-SK', { hour: '2-digit', minute: '2-digit' }).format(new Date(d))

// Masking for public tracking endpoints — never expose full phone/email.
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 6) return '***'
  return `+${digits[0]} ${'*'.repeat(digits.length - 5)}${digits.slice(-3)}`
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split('@')
  if (!domain) return '***'
  if (user.length <= 2) return `${user[0]}***@${domain}`
  return `${user[0]}${'*'.repeat(Math.min(user.length - 1, 4))}@${domain}`
}

export function maskName(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '***'
  return parts.map(p => `${p[0]}.`).join(' ')
}
