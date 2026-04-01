<script setup lang="ts">
import type { WaterfallPhoto } from '../types/photo'

defineProps<{
  photo: WaterfallPhoto
}>()

const emit = defineEmits<{
  open: [id: string]
}>()
</script>

<template>
  <article
    class="group mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
  >
    <button class="block w-full text-left" type="button" @click="emit('open', photo.photo_id)">
      <img
        :src="photo.thumbnail_url ?? photo.oss_url"
        :alt="photo.note ?? 'photo'"
        class="h-auto w-full"
        loading="lazy"
      />
      <div class="space-y-2 px-3 py-3">
        <p class="line-clamp-2 text-sm text-slate-700">{{ photo.note || '这张照片没有随笔' }}</p>
        <p class="text-xs text-slate-500">{{ new Date(photo.uploaded_at).toLocaleString() }}</p>
      </div>
    </button>
  </article>
</template>
