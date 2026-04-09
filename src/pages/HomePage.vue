<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getMapMarkers, getPhotoDetail, getPhotoTags, getWaterfallPhotos } from '../api/photos'
import GlobeView from '../components/GlobeView.vue'
import MapView from '../components/MapView.vue'
import PhotoCard from '../components/PhotoCard.vue'
import UploadPage from './UploadPage.vue'
import type { MapViewport } from '../types/map'
import type { MapMarker, PhotoDetail, WaterfallPhoto } from '../types/photo'

const mode = ref<'map' | 'waterfall'>('map')
const mapDimension = ref<'2d' | '3d'>('3d')
const panelCollapsed = ref(false)
const loading = ref(false)
const error = ref('')

const markers = ref<MapMarker[]>([])
const photos = ref<WaterfallPhoto[]>([])
const cursorUploadedAt = ref<string | null>(null)
const cursorId = ref<string | null>(null)
const hasMore = ref(true)
const viewport = ref<MapViewport>({ minLat: -85, maxLat: 85, minLng: -180, maxLng: 180 })

const selectedCategory = ref('all')
const selectedTag = ref('all')

const showModal = ref(false)
const modalLoading = ref(false)
const modalError = ref('')
const modalDetail = ref<PhotoDetail | null>(null)
const modalTags = ref<string[]>([])
const showUploadModal = ref(false)
let viewportLoadTimer: ReturnType<typeof window.setTimeout> | null = null
const VIEWPORT_LOAD_DELAY_MS = 180

const isMapMode = computed(() => mode.value === 'map')

const allCategories = computed(() => {
  const set = new Set<string>()
  for (const item of markers.value) {
    if (item.category_name) {
      set.add(item.category_name)
    }
  }
  for (const item of photos.value) {
    if (item.category_name) {
      set.add(item.category_name)
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'zh-CN'))
})

const allTags = computed(() => {
  const set = new Set<string>()
  for (const item of markers.value) {
    for (const tag of item.tags ?? []) {
      set.add(tag)
    }
  }
  for (const item of photos.value) {
    for (const tag of item.tags ?? []) {
      set.add(tag)
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'zh-CN'))
})

const filteredMarkers = computed(() =>
  markers.value.filter((item) => {
    const categoryPass = selectedCategory.value === 'all' || item.category_name === selectedCategory.value
    const tagPass = selectedTag.value === 'all' || (item.tags ?? []).includes(selectedTag.value)
    return categoryPass && tagPass
  }),
)

const filteredPhotos = computed(() =>
  photos.value.filter((item) => {
    const categoryPass = selectedCategory.value === 'all' || item.category_name === selectedCategory.value
    const tagPass = selectedTag.value === 'all' || (item.tags ?? []).includes(selectedTag.value)
    return categoryPass && tagPass
  }),
)

async function loadMarkers(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const queryViewport = mapDimension.value === '2d' ? viewport.value : { minLat: -85, maxLat: 85, minLng: -180, maxLng: 180 }
    markers.value = await getMapMarkers(queryViewport)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load markers'
  } finally {
    loading.value = false
  }
}

function onViewportChange(nextViewport: MapViewport): void {
  viewport.value = nextViewport
  if (mapDimension.value === '2d') {
    if (viewportLoadTimer) {
      window.clearTimeout(viewportLoadTimer)
    }
    viewportLoadTimer = window.setTimeout(() => {
      void loadMarkers()
      viewportLoadTimer = null
    }, VIEWPORT_LOAD_DELAY_MS)
  }
}

async function loadMorePhotos(): Promise<void> {
  if (!hasMore.value || loading.value) {
    return
  }
  loading.value = true
  error.value = ''
  try {
    const next = await getWaterfallPhotos(cursorUploadedAt.value, cursorId.value)
    photos.value.push(...next)
    const last = next[next.length - 1]
    if (!last) {
      hasMore.value = false
    } else {
      cursorUploadedAt.value = last.uploaded_at
      cursorId.value = last.photo_id
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load photos'
  } finally {
    loading.value = false
  }
}

async function openPhotoModal(photoId: string): Promise<void> {
  showModal.value = true
  modalLoading.value = true
  modalError.value = ''
  modalDetail.value = null
  modalTags.value = []

  try {
    modalDetail.value = await getPhotoDetail(photoId)
    modalTags.value = await getPhotoTags(photoId)
  } catch (err) {
    modalError.value = err instanceof Error ? err.message : '加载详情失败'
  } finally {
    modalLoading.value = false
  }
}

function closeModal(): void {
  showModal.value = false
}

function openUploadModal(): void {
  showUploadModal.value = true
}

function closeUploadModal(): void {
  showUploadModal.value = false
}

async function handleUploaded(): Promise<void> {
  showUploadModal.value = false
  await loadMarkers()
  photos.value = []
  hasMore.value = true
  cursorUploadedAt.value = null
  cursorId.value = null
  await loadMorePhotos()
}

function resetFilters(): void {
  selectedCategory.value = 'all'
  selectedTag.value = 'all'
}

function reloadCurrentMode(): void {
  if (isMapMode.value) {
    void loadMarkers()
  } else {
    photos.value = []
    hasMore.value = true
    cursorUploadedAt.value = null
    cursorId.value = null
    void loadMorePhotos()
  }
}

onMounted(async () => {
  await loadMarkers()
  await loadMorePhotos()
})

watch(mapDimension, () => {
  if (isMapMode.value) {
    void loadMarkers()
  }
})

onBeforeUnmount(() => {
  if (viewportLoadTimer) {
    window.clearTimeout(viewportLoadTimer)
    viewportLoadTimer = null
  }
})
</script>

<template>
  <section id="map-fullscreen-scope" class="fixed inset-0 overflow-hidden bg-slate-950">
    <div v-if="isMapMode" class="absolute inset-0">
      <MapView
        v-if="mapDimension === '2d'"
        provider="amap"
        :markers="filteredMarkers"
        fullscreen-scope-id="map-fullscreen-scope"
        @marker-click="openPhotoModal"
        @viewport-change="onViewportChange"
      />
      <GlobeView
        v-else
        :markers="filteredMarkers"
        fullscreen-scope-id="map-fullscreen-scope"
        @marker-click="openPhotoModal"
      />
    </div>

    <div v-else class="absolute inset-0 overflow-auto bg-slate-100 px-6 pb-10 pt-24">
      <div class="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
        <PhotoCard v-for="photo in filteredPhotos" :key="photo.photo_id" :photo="photo" @open="openPhotoModal" />
      </div>
      <div class="mt-5 flex items-center justify-center">
        <button
          v-if="hasMore"
          class="rounded-full bg-slate-900 px-5 py-2 text-sm text-white hover:bg-slate-700"
          :disabled="loading"
          @click="loadMorePhotos"
        >
          {{ loading ? '加载中...' : '加载更多' }}
        </button>
        <p v-else class="text-sm text-slate-500">没有更多图片了</p>
      </div>
    </div>

    <aside class="absolute left-4 top-4 z-[2200] w-[min(94vw,390px)] overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80 shadow-[0_24px_80px_rgba(15,23,42,0.28)] backdrop-blur-xl">
      <button
        class="flex w-full items-center justify-between border-b border-slate-200/70 bg-gradient-to-r from-white/90 via-slate-100/70 to-white/90 px-5 py-4 text-left"
        type="button"
        @click="panelCollapsed = !panelCollapsed"
      >
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-500">Control Panel</p>
          <p class="mt-1 text-base font-semibold text-slate-900">模式与筛选</p>
        </div>
        <span class="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm">{{ panelCollapsed ? '展开' : '收起' }}</span>
      </button>

      <div v-if="!panelCollapsed" class="space-y-4 bg-gradient-to-b from-white/60 via-slate-50/85 to-slate-100/70 px-5 py-5">
        <div class="space-y-2.5">
          <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">展示模式</p>
          <div class="grid grid-cols-2 gap-2">
            <button
              class="rounded-2xl border px-3 py-2 text-xs font-semibold transition"
              :class="mode === 'map' ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'"
              @click="mode = 'map'"
            >
              地图模式
            </button>
            <button
              class="rounded-2xl border px-3 py-2 text-xs font-semibold transition"
              :class="mode === 'waterfall' ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'"
              @click="mode = 'waterfall'"
            >
              瀑布流
            </button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <button class="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50" @click="reloadCurrentMode">刷新</button>
            <button class="rounded-2xl border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700" @click="openUploadModal">上传照片</button>
          </div>
        </div>

        <div class="space-y-2.5">
          <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">地图维度</p>
          <div class="flex gap-2">
            <button
              class="flex-1 rounded-2xl border px-3 py-2 text-xs font-semibold transition"
              :class="mapDimension === '2d' ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-700/25' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'"
              @click="mapDimension = '2d'"
            >
              2D 高德
            </button>
            <button
              class="flex-1 rounded-2xl border px-3 py-2 text-xs font-semibold transition"
              :class="mapDimension === '3d' ? 'border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-700/25' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'"
              @click="mapDimension = '3d'"
            >
              3D 地球
            </button>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-200/80 bg-white/85 p-3.5 shadow-sm">
          <div class="grid grid-cols-2 gap-3">
            <label class="space-y-1">
              <span class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">分类</span>
              <select v-model="selectedCategory" class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-slate-400 focus:outline-none">
                <option value="all">全部分类</option>
                <option v-for="category in allCategories" :key="category" :value="category">{{ category }}</option>
              </select>
            </label>

            <label class="space-y-1">
              <span class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">标签</span>
              <select v-model="selectedTag" class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-slate-400 focus:outline-none">
                <option value="all">全部标签</option>
                <option v-for="tag in allTags" :key="tag" :value="tag">{{ tag }}</option>
              </select>
            </label>
          </div>
        </div>

        <div class="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/85 px-3.5 py-2.5 shadow-sm">
          <p class="text-xs font-medium text-slate-600">当前结果：<span class="font-semibold text-slate-900">{{ isMapMode ? filteredMarkers.length : filteredPhotos.length }}</span></p>
          <button class="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50" @click="resetFilters">重置筛选</button>
        </div>
      </div>
    </aside>

    <div v-if="error" class="absolute bottom-4 left-4 z-[2100] rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{{ error }}</div>

    <div v-if="showModal" class="fixed inset-0 z-[3000] grid place-items-center bg-slate-900/70 px-4 py-6" @click.self="closeModal">
      <div class="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-3xl bg-white p-5 shadow-2xl">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-lg font-semibold text-slate-900">照片详情</h3>
          <button class="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 hover:bg-slate-200" @click="closeModal">关闭</button>
        </div>

        <div v-if="modalLoading" class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">正在加载详情...</div>
        <div v-else-if="modalError" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ modalError }}</div>

        <div v-else-if="modalDetail" class="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <img :src="modalDetail.oss_url" :alt="modalDetail.title ?? 'photo detail'" class="h-auto w-full" />
          </div>
          <div class="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
            <h4 class="text-lg font-semibold text-slate-900">{{ modalDetail.title || '未命名照片' }}</h4>
            <p class="text-sm leading-6 text-slate-700">{{ modalDetail.note || '这张照片没有随笔。' }}</p>

            <dl class="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt class="text-slate-500">分类</dt>
                <dd class="font-medium text-slate-900">{{ modalDetail.category_name || '-' }}</dd>
              </div>
              <div>
                <dt class="text-slate-500">可见性</dt>
                <dd class="font-medium text-slate-900">{{ modalDetail.visibility }}</dd>
              </div>
              <div>
                <dt class="text-slate-500">地点</dt>
                <dd class="font-medium text-slate-900">{{ modalDetail.location_name || '-' }}</dd>
              </div>
              <div>
                <dt class="text-slate-500">经纬度</dt>
                <dd class="font-medium text-slate-900">{{ modalDetail.latitude ?? '-' }}, {{ modalDetail.longitude ?? '-' }}</dd>
              </div>
            </dl>

            <div>
              <p class="mb-2 text-sm text-slate-500">标签</p>
              <div class="flex flex-wrap gap-2">
                <span v-for="tag in modalTags" :key="tag" class="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">#{{ tag }}</span>
                <span v-if="modalTags.length === 0" class="text-sm text-slate-500">暂无标签</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showUploadModal" class="fixed inset-0 z-[3200] grid place-items-center bg-slate-900/75 px-4 py-6" @click.self="closeUploadModal">
      <div class="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-3xl bg-slate-100 p-4 shadow-2xl">
        <UploadPage embedded @uploaded="handleUploaded" @cancel="closeUploadModal" />
      </div>
    </div>
  </section>
</template>
