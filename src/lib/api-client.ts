// src/lib/api-client.ts
// Typed fetch wrapper for the frontend. All requests use relative paths.
'use client'

export class ApiError extends Error {
  status: number
  details?: unknown
  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.status = status
    this.details = details
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  })
  const text = await res.text()
  let json: any = null
  try { json = text ? JSON.parse(text) : null } catch { /* non-json */ }
  if (!res.ok) {
    const message = json?.error || `HTTP ${res.status}`
    throw new ApiError(message, res.status, json?.details)
  }
  return json as T
}

export const api = {
  get: <T>(url: string) => request<T>('GET', url),
  post: <T>(url: string, body?: unknown) => request<T>('POST', url, body),
  patch: <T>(url: string, body?: unknown) => request<T>('PATCH', url, body),
  delete: <T>(url: string) => request<T>('DELETE', url),
  upload: async <T>(url: string, file: File, fieldName = 'file'): Promise<T> => {
    const fd = new FormData()
    fd.append(fieldName, file)
    const res = await fetch(url, { method: 'POST', body: fd, credentials: 'same-origin' })
    const json = await res.json().catch(() => null)
    if (!res.ok) throw new ApiError(json?.error || `HTTP ${res.status}`, res.status, json?.details)
    return json as T
  },
}
