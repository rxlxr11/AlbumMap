<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getPhotoDetail, getPhotoTags } from '../api/photos'
import type { PhotoDetail } from '../types/photo'

const route = useRoute()
const loading = ref(false)
const error = ref('')
const detail = ref<PhotoDetail | null>(null)
const tags = ref<string[]>([])

const photoId = computed(() => String(route.params.id ?? ''))

async function loadDetail(): Promise<void> {
  if (!photoId.value) {
    return
  }
  loading.value = true
  error.value = ''
  try {
    detail.value = await getPhotoDetail(photoId.value)
    tags.value = await getPhotoTags(photoId.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载详情失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadDetail()
})
</script>

<template>
  <section class="space-y-4">
    <div v-if="loading" class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
      正在加载详情...
    </div>
    <div v-else-if="!detail" class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
      未找到这张照片。
    </div>

    <div v-if="detail" class="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <div class="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <img :src="detail.oss_url" :alt="detail.title ?? 'photo detail'" class="h-auto w-full" />
      </div>
      <div class="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
        <h2 class="text-xl font-semibold text-slate-900">{{ detail.title || '未命名照片' }}</h2>
        <p class="text-sm leading-6 text-slate-700">{{ detail.note || '这张照片没有随笔。' }}</p>

        <dl class="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt class="text-slate-500">分类</dt>
            <dd class="font-medium text-slate-900">{{ detail.category_name || '-' }}</dd>
          </div>
          <div>
            <dt class="text-slate-500">可见性</dt>
            <dd class="font-medium text-slate-900">{{ detail.visibility }}</dd>
          </div>
          <div>
            <dt class="text-slate-500">地点</dt>
            <dd class="font-medium text-slate-900">{{ detail.location_name || '-' }}</dd>
          </div>
          <div>
            <dt class="text-slate-500">经纬度</dt>
            <dd class="font-medium text-slate-900">{{ detail.latitude ?? '-' }}, {{ detail.longitude ?? '-' }}</dd>
          </div>
          <div class="col-span-2">
            <dt class="text-slate-500">地址</dt>
            <dd class="font-medium text-slate-900">{{ detail.address || '-' }}</dd>
          </div>
          <div>
            <dt class="text-slate-500">上传时间</dt>
            <dd class="font-medium text-slate-900">{{ new Date(detail.uploaded_at).toLocaleString() }}</dd>
          </div>
          <div>
            <dt class="text-slate-500">尺寸</dt>
            <dd class="font-medium text-slate-900">{{ detail.width ?? '-' }} x {{ detail.height ?? '-' }}</dd>
          </div>
        </dl>

        <div>
          <p class="mb-2 text-sm text-slate-500">标签</p>
          <div class="flex flex-wrap gap-2">
            <span v-for="tag in tags" :key="tag" class="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
              #{{ tag }}
            </span>
            <span v-if="tags.length === 0" class="text-sm text-slate-500">暂无标签</span>
          </div>
        </div>
      </div>
    </div>

    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
  </section>
</template>
