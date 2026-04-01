<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { createMapAdapter } from '../maps/factory'
import type { MapAdapter, MapProvider, MapViewport, MarkerPoint } from '../types/map'
import type { MapMarker } from '../types/photo'

const props = defineProps<{
  markers: MapMarker[]
  provider: MapProvider
  fullscreenScopeId?: string
}>()

const emit = defineEmits<{
  markerClick: [id: string]
  viewportChange: [viewport: MapViewport]
}>()

const rootRef = ref<HTMLElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const adapter = ref<MapAdapter | null>(null)
const loading = ref(true)
const error = ref('')
const isFullscreen = ref(false)

function onFullscreenChange(): void {
  isFullscreen.value = Boolean(document.fullscreenElement)
}

const markerPoints = computed<MarkerPoint[]>(() =>
  props.markers.map((item) => ({
    id: item.photo_id,
    lat: item.latitude,
    lng: item.longitude,
    thumbnailUrl: item.thumbnail_url,
    note: item.note,
  })),
)

function emitViewport(): void {
  const viewport = adapter.value?.getViewport()
  if (viewport) {
    emit('viewportChange', viewport)
  }
}

function zoomIn(): void {
  adapter.value?.setZoomIn()
  emitViewport()
}

function zoomOut(): void {
  adapter.value?.setZoomOut()
  emitViewport()
}

async function toggleFullscreen(): Promise<void> {
  const scope = props.fullscreenScopeId ? document.getElementById(props.fullscreenScopeId) : null
  const target = scope ?? containerRef.value
  if (!target) {
    return
  }

  if (document.fullscreenElement) {
    await document.exitFullscreen()
    return
  }

  await target.requestFullscreen()
}

onMounted(async () => {
  if (!rootRef.value) {
    loading.value = false
    return
  }

  loading.value = true
  error.value = ''
  try {
    adapter.value = createMapAdapter(props.provider)
    await adapter.value.init(rootRef.value, { lat: 31.2304, lng: 121.4737 }, 4)
    adapter.value.setMarkers(markerPoints.value, (id) => emit('markerClick', id))
    emitViewport()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '地图加载失败'
  } finally {
    loading.value = false
  }
})

watch(
  () => markerPoints.value,
  (markers) => {
    adapter.value?.setMarkers(markers, (id) => emit('markerClick', id))
  },
)

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange)
})

onBeforeUnmount(() => {
  adapter.value?.destroy()
  document.removeEventListener('fullscreenchange', onFullscreenChange)
})
</script>

<template>
  <div
    ref="containerRef"
    class="relative h-full overflow-hidden rounded-none border-none bg-slate-200"
    :class="isFullscreen ? 'h-screen rounded-none border-none' : ''"
  >
    <div ref="rootRef" class="h-full w-full" />

    <div class="absolute right-4 top-4 z-10 flex flex-col gap-2">
      <button
        class="rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-slate-900 shadow hover:bg-white"
        type="button"
        @click="zoomIn"
      >
        +
      </button>
      <button
        class="rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-slate-900 shadow hover:bg-white"
        type="button"
        @click="zoomOut"
      >
        -
      </button>
      <button
        class="rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-slate-900 shadow hover:bg-white"
        type="button"
        @click="toggleFullscreen"
      >
        {{ isFullscreen ? '退出全屏' : '全屏' }}
      </button>
    </div>

    <div v-if="loading" class="absolute inset-0 grid place-items-center bg-slate-900/20 text-white">正在加载地图...</div>

    <div v-if="error" class="absolute bottom-4 left-4 rounded-xl bg-red-600 px-3 py-2 text-sm text-white">{{ error }}</div>
  </div>
</template>
