'use client'

import { Cake } from 'lucide-react'

interface ProductImageProps {
  src?: string | null
  alt: string
  className?: string
  iconSize?: string
}

export function ProductImage({ src, alt, className = '', iconSize = 'h-20 w-20' }: ProductImageProps) {
  if (src && (src.startsWith('/products/') || src.startsWith('/uploads/') || src.startsWith('http'))) {
    return (
      <img
        src={src}
        alt={alt}
        className={`object-cover w-full h-full ${className}`}
        loading="lazy"
      />
    )
  }
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Cake className={`${iconSize} text-[var(--gold)]`} strokeWidth={1} />
    </div>
  )
}
