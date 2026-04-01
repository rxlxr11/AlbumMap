<script setup lang="ts">
import 'cesium/Build/Cesium/Widgets/widgets.css'
import {
  Cartesian2,
  Cartesian3,
  Color,
  defined,
  DistanceDisplayCondition,
  Entity,
  NearFarScalar,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  VerticalOrigin,
  Viewer,
} from 'cesium'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { MapMarker } from '../types/photo'

const props = defineProps<{
  markers: MapMarker[]
  fullscreenScopeId?: string
}>()

const emit = defineEmits<{
  markerClick: [id: string]
}>()

const containerRef = ref<HTMLElement | null>(null)
const globeRootRef = ref<HTMLElement | null>(null)
const isFullscreen = ref(false)
const loading = ref(true)
const error = ref('')

let viewer: Viewer | null = null
let clickHandler: ScreenSpaceEventHandler | null = null

function onFullscreenChange(): void {
  const scopeElement = props.fullscreenScopeId ? document.getElementById(props.fullscreenScopeId) : containerRef.value
  isFullscreen.value = Boolean(scopeElement && document.fullscreenElement === scopeElement)
}

function syncEntities(): void {
  if (!viewer) {
    return
  }

  viewer.entities.removeAll()

  for (const marker of props.markers) {
    viewer.entities.add({
      id: marker.photo_id,
      position: Cartesian3.fromDegrees(marker.longitude, marker.latitude, 18000),
      billboard: {
        image: marker.thumbnail_url,
        width: 66,
        height: 66,
        verticalOrigin: VerticalOrigin.BOTTOM,
        scaleByDistance: new NearFarScalar(2.0e5, 1.0, 2.8e7, 0.3),
        translucencyByDistance: new NearFarScalar(1.5e5, 1.0, 2.6e7, 0.25),
        distanceDisplayCondition: new DistanceDisplayCondition(0, 4.2e7),
      },
      label: {
        text: marker.note ? marker.note.slice(0, 12) : '照片',
        showBackground: true,
        backgroundColor: Color.fromCssColorString('#0f172a').withAlpha(0.66),
        fillColor: Color.WHITE,
        font: '11px sans-serif',
        pixelOffset: new Cartesian2(0, -44),
        verticalOrigin: VerticalOrigin.BOTTOM,
        scaleByDistance: new NearFarScalar(2.0e5, 1.0, 2.4e7, 0.6),
        translucencyByDistance: new NearFarScalar(2.0e5, 1.0, 2.8e7, 0.0),
      },
    })
  }

  viewer.scene.requestRender()
}

function setupClick(): void {
  if (!viewer) {
    return
  }

  clickHandler?.destroy()
  clickHandler = new ScreenSpaceEventHandler(viewer.scene.canvas)
  clickHandler.setInputAction((event: { position: Cartesian2 }) => {
    if (!viewer) {
      return
    }
    const picked = viewer.scene.pick(event.position)
    if (!defined(picked) || !(picked.id instanceof Entity) || typeof picked.id.id !== 'string') {
      return
    }
    emit('markerClick', picked.id.id)
  }, ScreenSpaceEventType.LEFT_CLICK)
}

async function toggleFullscreen(): Promise<void> {
  const scope = props.fullscreenScopeId ? document.getElementById(props.fullscreenScopeId) : null
  const target = scope ?? containerRef.value
  if (!target) {
    return
  }

  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }

    await target.requestFullscreen()
  } catch {
    error.value = '全屏切换失败，请重试'
  }
}

function zoomIn(): void {
  if (!viewer) {
    return
  }
  const height = viewer.camera.positionCartographic.height
  viewer.camera.zoomIn(Math.max(250000, height * 0.26))
  viewer.scene.requestRender()
}

function zoomOut(): void {
  if (!viewer) {
    return
  }
  const height = viewer.camera.positionCartographic.height
  viewer.camera.zoomOut(Math.max(350000, height * 0.34))
  viewer.scene.requestRender()
}

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange)
})

onMounted(() => {
  if (!globeRootRef.value) {
    loading.value = false
    error.value = '地球容器初始化失败'
    return
  }

  try {
    viewer = new Viewer(globeRootRef.value, {
      animation: false,
      timeline: false,
      geocoder: false,
      sceneModePicker: false,
      homeButton: false,
      baseLayerPicker: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      requestRenderMode: true,
      maximumRenderTimeChange: Infinity,
      useBrowserRecommendedResolution: false,
    })

    viewer.resolutionScale = Math.min(1.35, window.devicePixelRatio || 1)
    viewer.scene.postProcessStages.fxaa.enabled = true
    viewer.scene.globe.maximumScreenSpaceError = 2.8
    viewer.scene.screenSpaceCameraController.minimumZoomDistance = 230000
    viewer.scene.screenSpaceCameraController.maximumZoomDistance = 125000000
    viewer.scene.screenSpaceCameraController.inertiaSpin = 0.65
    viewer.scene.screenSpaceCameraController.inertiaTranslate = 0.65
    viewer.scene.screenSpaceCameraController.inertiaZoom = 0.55
    viewer.scene.globe.enableLighting = false

    viewer.scene.backgroundColor = Color.fromCssColorString('#020617')
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(103, 30, 23000000),
      duration: 0,
    })

    syncEntities()
    setupClick()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '地球初始化失败'
  } finally {
    loading.value = false
  }
})

watch(
  () => props.markers,
  () => {
    syncEntities()
  },
  { deep: true },
)

onBeforeUnmount(() => {
  clickHandler?.destroy()
  clickHandler = null
  viewer?.destroy()
  viewer = null
  document.removeEventListener('fullscreenchange', onFullscreenChange)
})
</script>

<template>
  <div
    ref="containerRef"
    class="relative h-full overflow-hidden rounded-none border-none bg-slate-950"
    :class="isFullscreen ? 'h-screen rounded-none border-none' : ''"
  >
    <div ref="globeRootRef" class="h-full w-full" />
    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(147,197,253,0.22),rgba(2,6,23,0.12)_34%,rgba(2,6,23,0)_56%)]" />

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

    <div v-if="loading" class="absolute inset-0 grid place-items-center bg-slate-900/30 text-white">正在加载 3D 地球...</div>
    <div v-if="error" class="absolute bottom-4 left-4 rounded-xl bg-red-600 px-3 py-2 text-sm text-white">{{ error }}</div>
  </div>
</template>
