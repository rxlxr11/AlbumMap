import { importLibrary, setOptions } from '@googlemaps/js-api-loader'
import type { MapAdapter, MapViewport, MarkerPoint } from '../types/map'

export class GoogleAdapter implements MapAdapter {
  private map: google.maps.Map | null = null
  private markers: google.maps.Marker[] = []

  async init(container: HTMLElement, center: { lat: number; lng: number }, zoom: number): Promise<void> {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY
    if (!apiKey) {
      throw new Error('Missing VITE_GOOGLE_MAPS_KEY')
    }

    setOptions({ key: apiKey, v: 'weekly' })
    await importLibrary('maps')

    this.map = new google.maps.Map(container, {
      center,
      zoom,
      mapTypeId: 'terrain',
      tilt: 45,
    })
  }

  setMarkers(markers: MarkerPoint[], onClick: (markerId: string) => void): void {
    if (!this.map) {
      return
    }

    for (const marker of this.markers) {
      marker.setMap(null)
    }
    this.markers = []

    for (const marker of markers) {
      const gMarker = new google.maps.Marker({
        position: { lat: marker.lat, lng: marker.lng },
        map: this.map,
        title: marker.note ?? 'photo',
      })
      gMarker.addListener('click', () => onClick(marker.id))
      this.markers.push(gMarker)
    }
  }

  setZoomIn(): void {
    if (!this.map) {
      return
    }
    this.map.setZoom((this.map.getZoom() ?? 2) + 1)
  }

  setZoomOut(): void {
    if (!this.map) {
      return
    }
    this.map.setZoom((this.map.getZoom() ?? 2) - 1)
  }

  getViewport(): MapViewport | null {
    if (!this.map) {
      return null
    }
    const bounds = this.map.getBounds()
    if (!bounds) {
      return null
    }
    const sw = bounds.getSouthWest()
    const ne = bounds.getNorthEast()
    return {
      minLat: sw.lat(),
      maxLat: ne.lat(),
      minLng: sw.lng(),
      maxLng: ne.lng(),
    }
  }

  destroy(): void {
    for (const marker of this.markers) {
      marker.setMap(null)
    }
    this.markers = []
    this.map = null
  }
}
