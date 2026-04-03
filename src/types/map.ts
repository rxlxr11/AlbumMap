export type MapProvider = 'amap' | 'google'

export interface MarkerPoint {
  id: string
  lat: number
  lng: number
  thumbnailUrl: string
  note: string | null
}

export interface MapViewport {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

export interface MapAdapter {
  init(container: HTMLElement, center: { lat: number; lng: number }, zoom: number): Promise<void>
  setMarkers(markers: MarkerPoint[], onClick: (markerId: string) => void): void
  setZoomIn(): void
  setZoomOut(): void
  setBaseLayer?: (layer: 'satellite' | 'roadnet') => void
  getViewport(): MapViewport | null
  destroy(): void
}
