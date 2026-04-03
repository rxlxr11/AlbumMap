<script setup lang="ts">
import AMapLoader from '@amap/amap-jsapi-loader'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

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
  Geocoder: new (options?: Record<string, unknown>) => AMapGeocoder
  TileLayer: AMapTileLayerCtor & {
    Satellite: new (options?: Record<string, unknown>) => AMapTileLayer
    RoadNet: new (options?: Record<string, unknown>) => AMapTileLayer
  }
}

type AMapTileLayer = Record<string, never>
type AMapTileLayerCtor = new (options?: Record<string, unknown>) => AMapTileLayer

type AMapMap = {
  setCenter: (center: [number, number]) => void
  setLayers: (layers: AMapTileLayer[]) => void
  on: (eventName: string, callback: (event: { lnglat: { getLng: () => number; getLat: () => number } }) => void) => void
  destroy: () => void
}

type AMapMarker = {
  setPosition: (position: [number, number]) => void
  setMap: (map: AMapMap | null) => void
}

type AMapGeocoder = {
  getLocation: (
    address: string,
    callback: (status: string, result: { info?: string; geocodes?: Array<{ location?: { lng: number; lat: number }; formattedAddress?: string }> }) => void,
  ) => void
  getAddress: (
    lnglat: [number, number],
    callback: (
      status: string,
      result: {
        info?: string
        regeocode?: {
          formattedAddress?: string
          addressComponent?: { township?: string; district?: string; street?: string }
        }
      },
    ) => void,
  ) => void
}

const props = defineProps<{
  latitude: number
  longitude: number
  locationName: string
  address: string
}>()

const emit = defineEmits<{
  updateLatitude: [value: number]
  updateLongitude: [value: number]
  updateLocationName: [value: string]
  updateAddress: [value: string]
}>()

const mapRootRef = ref<HTMLElement | null>(null)
const query = ref(props.locationName || props.address || '')
const searchError = ref('')
const searching = ref(false)
const amapLayer = ref<'satellite' | 'roadnet'>('satellite')

let amap: AMapApi | null = null
let map: AMapMap | null = null
let marker: AMapMarker | null = null
let geocoder: AMapGeocoder | null = null
let baseLayer: AMapTileLayer | null = null
let satelliteLayer: AMapTileLayer | null = null
let roadNetLayer: AMapTileLayer | null = null

function setAmapLayer(layer: 'satellite' | 'roadnet'): void {
  amapLayer.value = layer
  if (!map || !baseLayer || !satelliteLayer || !roadNetLayer) {
    return
  }
  if (layer === 'satellite') {
    map.setLayers([satelliteLayer, roadNetLayer])
    return
  }
  map.setLayers([baseLayer, roadNetLayer])
}

const amapKey = import.meta.env.VITE_AMAP_KEY || '174814bd5c505da998169b604aaf0501'
const amapSecret = import.meta.env.VITE_AMAP_SECRET || 'e4dedcf2a28330b094c5ce0ec4b03a91'

async function reverseGeocode(lat: number, lng: number): Promise<void> {
  if (!geocoder) {
    return
  }

  await new Promise<void>((resolve) => {
    geocoder?.getAddress([lng, lat], (status, result) => {
      if (status !== 'complete' || result.info !== 'OK' || !result.regeocode) {
        resolve()
        return
      }

      const formatted = result.regeocode.formattedAddress || ''
      const township = result.regeocode.addressComponent?.township || ''
      const district = result.regeocode.addressComponent?.district || ''
      const street = result.regeocode.addressComponent?.street || ''

      emit('updateAddress', formatted)
      emit('updateLocationName', township || street || district || formatted)
      query.value = formatted
      resolve()
    })
  })
}

async function searchLocation(): Promise<void> {
  const keyword = query.value.trim()
  if (!keyword) {
    searchError.value = '请输入地点关键词'
    return
  }
  if (!geocoder) {
    searchError.value = '地图搜索服务尚未准备好'
    return
  }

  searching.value = true
  searchError.value = ''
  await new Promise<void>((resolve) => {
    geocoder?.getLocation(keyword, (status, result) => {
      if (status !== 'complete' || result.info !== 'OK' || !result.geocodes?.[0]?.location) {
        searchError.value = '未找到该地点，请尝试输入更完整的地址'
        searching.value = false
        resolve()
        return
      }

      const target = result.geocodes[0]
      const location = target.location
      if (!location) {
        searchError.value = '定位结果无效，请更换关键词'
        searching.value = false
        resolve()
        return
      }

      const lng = location.lng
      const lat = location.lat

      emit('updateLatitude', lat)
      emit('updateLongitude', lng)
      emit('updateAddress', target.formattedAddress || keyword)
      emit('updateLocationName', keyword)

      marker?.setPosition([lng, lat])
      map?.setCenter([lng, lat])
      searching.value = false
      resolve()
    })
  })
}

onMounted(async () => {
  if (!mapRootRef.value) {
    return
  }

  window._AMapSecurityConfig = { securityJsCode: amapSecret }
  const loaded = await AMapLoader.load({
    key: amapKey,
    version: '2.0',
    plugins: ['AMap.Geocoder'],
  })

  amap = loaded as AMapApi
  map = new amap.Map(mapRootRef.value, {
    viewMode: '3D',
    zoom: 12,
    center: [props.longitude, props.latitude],
  })
  baseLayer = new amap.TileLayer()
  satelliteLayer = new amap.TileLayer.Satellite()
  roadNetLayer = new amap.TileLayer.RoadNet()
  setAmapLayer('satellite')
  marker = new amap.Marker({ position: [props.longitude, props.latitude], map })
  geocoder = new amap.Geocoder({ city: '全国', radius: 1500, extensions: 'all' })

  map.on('click', async (event) => {
    const lng = event.lnglat.getLng()
    const lat = event.lnglat.getLat()
    emit('updateLatitude', lat)
    emit('updateLongitude', lng)
    marker?.setPosition([lng, lat])
    await reverseGeocode(lat, lng)
  })
})

watch(
  () => [props.latitude, props.longitude],
  ([lat, lng]) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return
    }
    marker?.setPosition([lng, lat])
  },
)

onBeforeUnmount(() => {
  marker?.setMap(null)
  marker = null
  geocoder = null
  baseLayer = null
  satelliteLayer = null
  roadNetLayer = null
  map?.destroy()
  map = null
})
</script>

<template>
  <div class="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
    <div class="flex w-fit overflow-hidden rounded-full bg-white p-1 shadow-sm">
      <button
        type="button"
        class="rounded-full px-3 py-1 text-xs font-semibold"
        :class="amapLayer === 'satellite' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'"
        @click="setAmapLayer('satellite')"
      >
        卫星图
      </button>
      <button
        type="button"
        class="rounded-full px-3 py-1 text-xs font-semibold"
        :class="amapLayer === 'roadnet' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'"
        @click="setAmapLayer('roadnet')"
      >
        路网图
      </button>
    </div>

    <div class="flex flex-col gap-2 sm:flex-row">
      <input
        v-model="query"
        class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
        type="text"
        placeholder="输入地点关键词，如 上海外滩"
      />
      <button
        type="button"
        class="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-60"
        :disabled="searching"
        @click="searchLocation"
      >
        {{ searching ? '定位中...' : '搜索定位' }}
      </button>
    </div>

    <div ref="mapRootRef" class="h-56 w-full overflow-hidden rounded-xl border border-slate-200" />

    <p class="text-xs text-slate-500">点击地图可直接选择地点并自动回填经纬度与地址。</p>
    <p v-if="searchError" class="text-xs text-red-600">{{ searchError }}</p>
  </div>
</template>
