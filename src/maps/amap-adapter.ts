import AMapLoader from '@amap/amap-jsapi-loader'
import type { MapAdapter, MapViewport, MarkerPoint } from '../types/map'

declare global {
  interface Window {
    _AMapSecurityConfig?: {
      securityJsCode?: string
    }
  }
}

type AMapApi = {
  Map: new (container: HTMLElement, options: Record<string, unknown>) => AMapMap
  Marker: new (options: Record<string, unknown>) => AMapMarker
  InfoWindow: new (options: Record<string, unknown>) => AMapInfoWindow
  Pixel: new (x: number, y: number) => unknown
  TileLayer: AMapTileLayerCtor & {
    Satellite: new (options?: Record<string, unknown>) => AMapTileLayer
    RoadNet: new (options?: Record<string, unknown>) => AMapTileLayer
  }
}

type AMapTileLayer = Record<string, never>

type AMapTileLayerCtor = new (options?: Record<string, unknown>) => AMapTileLayer

type AMapMap = {
  setFitView: () => void
  setZoom: (zoom: number) => void
  getZoom: () => number
  setLayers: (layers: AMapTileLayer[]) => void
  getBounds: () => {
    getSouthWest: () => { getLat: () => number; getLng: () => number }
    getNorthEast: () => { getLat: () => number; getLng: () => number }
  }
  clearMap: () => void
  add: (marker: AMapMarker) => void
  destroy: () => void
  on: (eventName: string, callback: () => void) => void
}

type AMapMarker = {
  on: (eventName: string, callback: () => void) => void
  getPosition: () => unknown
}

type AMapInfoWindow = {
  open: (map: AMapMap, position: unknown) => void
  close: () => void
}

const DEFAULT_AMAP_KEY = '174814bd5c505da998169b604aaf0501'
const DEFAULT_AMAP_SECURITY_CODE = 'e4dedcf2a28330b094c5ce0ec4b03a91'

export class AMapAdapter implements MapAdapter {
  private map: AMapMap | null = null
  private amap: AMapApi | null = null
  private baseLayer: AMapTileLayer | null = null
  private satelliteLayer: AMapTileLayer | null = null
  private roadNetLayer: AMapTileLayer | null = null

  async init(container: HTMLElement, center: { lat: number; lng: number }, zoom: number): Promise<void> {
    const key = import.meta.env.VITE_AMAP_KEY || DEFAULT_AMAP_KEY
    const securityCode = import.meta.env.VITE_AMAP_SECRET || DEFAULT_AMAP_SECURITY_CODE
    if (!key) {
      throw new Error('Missing VITE_AMAP_KEY')
    }
    if (!securityCode) {
      throw new Error('Missing VITE_AMAP_SECRET')
    }

    window._AMapSecurityConfig = {
      securityJsCode: securityCode,
    }

    const loaded = await AMapLoader.load({ key, version: '2.0' })
    this.amap = loaded as AMapApi
    this.map = new this.amap.Map(container, {
      viewMode: '3D',
      zoom,
      center: [center.lng, center.lat],
    })

    this.baseLayer = new this.amap.TileLayer()
    this.satelliteLayer = new this.amap.TileLayer.Satellite()
    this.roadNetLayer = new this.amap.TileLayer.RoadNet()
    this.setBaseLayer('satellite')
  }

  setBaseLayer(layer: 'satellite' | 'roadnet'): void {
    if (!this.map || !this.baseLayer || !this.satelliteLayer || !this.roadNetLayer) {
      return
    }
    if (layer === 'satellite') {
      this.map.setLayers([this.satelliteLayer, this.roadNetLayer])
      return
    }
    this.map.setLayers([this.baseLayer, this.roadNetLayer])
  }

  setMarkers(markers: MarkerPoint[], onClick: (markerId: string) => void): void {
    if (!this.map || !this.amap) {
      return
    }

    this.map.clearMap()
    let openedInfoWindow: AMapInfoWindow | null = null

    for (const marker of markers) {
      const markerHtml = `
        <button style="display:flex;align-items:center;gap:8px;padding:4px 8px;border:none;border-radius:999px;background:rgba(15,23,42,0.8);color:white;box-shadow:0 6px 18px rgba(15,23,42,0.28);cursor:pointer;">
          <img src="${marker.thumbnailUrl}" alt="photo" style="width:32px;height:32px;border-radius:999px;object-fit:cover;border:2px solid rgba(255,255,255,0.85);" />
          <span style="font-size:11px;line-height:1;white-space:nowrap;max-width:120px;overflow:hidden;text-overflow:ellipsis;">${marker.note ?? '照片'}</span>
        </button>
      `
      const m = new this.amap.Marker({
        position: [marker.lng, marker.lat],
        offset: new this.amap.Pixel(-28, -18),
        title: marker.note ?? 'photo',
        content: markerHtml,
      })

      const infoWindow = new this.amap.InfoWindow({
        isCustom: true,
        offset: new this.amap.Pixel(0, -16),
        content: `
          <div style="padding:10px;background:rgba(255,255,255,0.96);border-radius:12px;box-shadow:0 10px 30px rgba(15,23,42,0.18);width:220px;">
            <img src="${marker.thumbnailUrl}" alt="preview" style="width:100%;height:130px;object-fit:cover;border-radius:8px;" />
            <p style="margin:8px 0 0 0;font-size:12px;color:#0f172a;line-height:1.4;">${marker.note ?? '点击查看详情'}</p>
          </div>
        `,
      })

      m.on('mouseover', () => {
        openedInfoWindow?.close()
        infoWindow.open(this.map as AMapMap, m.getPosition())
        openedInfoWindow = infoWindow
      })

      m.on('click', () => onClick(marker.id))
      this.map.add(m)
    }
    if (markers.length > 0) {
      this.map.setFitView()
    }
  }

  setZoomIn(): void {
    if (!this.map) {
      return
    }
    this.map.setZoom(this.map.getZoom() + 1)
  }

  setZoomOut(): void {
    if (!this.map) {
      return
    }
    this.map.setZoom(this.map.getZoom() - 1)
  }

  getViewport(): MapViewport | null {
    if (!this.map) {
      return null
    }
    const bounds = this.map.getBounds()
    const sw = bounds.getSouthWest()
    const ne = bounds.getNorthEast()
    return {
      minLat: sw.getLat(),
      maxLat: ne.getLat(),
      minLng: sw.getLng(),
      maxLng: ne.getLng(),
    }
  }

  destroy(): void {
    this.map?.destroy()
    this.map = null
    this.amap = null
    this.baseLayer = null
    this.satelliteLayer = null
    this.roadNetLayer = null
  }
}
