// src/lib/maps.ts
// Map provider abstraction. Mock returns the branch coordinates for development.
// Mapbox/Google adapters are stubbed and clearly marked as requiring real keys.

export interface GeocodedAddress {
  latitude: number
  longitude: number
  formattedAddress: string
}

export interface RouteInfo {
  distanceKm: number
  durationMinutes: number
}

export interface MapProvider {
  name: string
  geocodeAddress(street: string, city: string, postalCode: string, country: string): Promise<GeocodedAddress>
  calculateRoute(fromLat: number, fromLng: number, toLat: number, toLng: number): Promise<RouteInfo>
  calculateDistance(fromLat: number, fromLng: number, toLat: number, toLng: number): number
  calculateETA(distanceKm: number): number
}

class MockMapProvider implements MapProvider {
  name = 'mock'
  // Default to Hlohovec center
  async geocodeAddress(street: string, city: string): Promise<GeocodedAddress> {
    // Deterministic pseudo-geocode based on city name hash so the same address
    // returns the same coords. NOT for production — clearly marked.
    const hash = simpleHash(`${street} ${city}`) % 1000
    const lat = 48.4336 + (hash - 500) / 50000
    const lng = 17.7967 + (hash - 500) / 50000
    return { latitude: lat, longitude: lng, formattedAddress: `${street}, ${city}` }
  }
  async calculateRoute(fromLat: number, fromLng: number, toLat: number, toLng: number): Promise<RouteInfo> {
    const distanceKm = this.calculateDistance(fromLat, fromLng, toLat, toLng)
    return { distanceKm, durationMinutes: this.calculateETA(distanceKm) }
  }
  calculateDistance(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
    return haversine(fromLat, fromLng, toLat, toLng)
  }
  calculateETA(distanceKm: number): number {
    // assume 30 km/h average urban
    return Math.max(5, Math.round((distanceKm / 30) * 60))
  }
}

class MapboxMapProvider implements MapProvider {
  name = 'mapbox'
  async geocodeAddress(): Promise<GeocodedAddress> {
    if (!process.env.MAPBOX_ACCESS_TOKEN) throw new Error('MAPBOX_ACCESS_TOKEN chýba.')
    throw new Error('Mapbox adapter vyžaduje reálne volanie API. Implementujte po dodaní kľúča.')
  }
  async calculateRoute(): Promise<RouteInfo> { throw new Error('Mapbox adapter nie je nakonfigurovaný.') }
  calculateDistance(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
    return haversine(fromLat, fromLng, toLat, toLng)
  }
  calculateETA(distanceKm: number): number { return Math.max(5, Math.round((distanceKm / 30) * 60)) }
}

class GoogleMapsProvider implements MapProvider {
  name = 'google'
  async geocodeAddress(): Promise<GeocodedAddress> {
    if (!process.env.GOOGLE_MAPS_API_KEY) throw new Error('GOOGLE_MAPS_API_KEY chýba.')
    throw new Error('Google Maps adapter vyžaduje reálne volanie API. Implementujte po dodaní kľúča.')
  }
  async calculateRoute(): Promise<RouteInfo> { throw new Error('Google Maps adapter nie je nakonfigurovaný.') }
  calculateDistance(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
    return haversine(fromLat, fromLng, toLat, toLng)
  }
  calculateETA(distanceKm: number): number { return Math.max(5, Math.round((distanceKm / 30) * 60)) }
}

export function getMapProvider(): MapProvider {
  const p = (process.env.MAP_PROVIDER || 'mock').toLowerCase()
  switch (p) {
    case 'mapbox': return new MapboxMapProvider()
    case 'google': return new GoogleMapsProvider()
    case 'mock':
    default: return new MockMapProvider()
  }
}

export function isProductionMap(): boolean {
  return (process.env.MAP_PROVIDER || 'mock').toLowerCase() !== 'mock'
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

function simpleHash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}
