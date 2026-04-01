import { AMapAdapter } from './amap-adapter'
import { GoogleAdapter } from './google-adapter'
import type { MapAdapter, MapProvider } from '../types/map'

export function createMapAdapter(provider: MapProvider): MapAdapter {
  if (provider === 'google') {
    return new GoogleAdapter()
  }
  return new AMapAdapter()
}
