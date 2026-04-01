<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { uploadPhoto } from '../api/upload'
import LocationPicker from '../components/LocationPicker.vue'
import type { UploadPhotoInput } from '../types/photo'

const props = withDefaults(
  defineProps<{
    embedded?: boolean
  }>(),
  {
    embedded: false,
  },
)

const emit = defineEmits<{
  uploaded: []
  cancel: []
}>()

const router = useRouter()
const file = ref<File | null>(null)
const loading = ref(false)
const error = ref('')
const success = ref('')

const form = ref<UploadPhotoInput>({
  title: '',
  note: '',
  categoryName: '',
  tags: [],
  latitude: 31.2304,
  longitude: 121.4737,
  locationName: '',
  address: '',
  visibility: 'private',
})

const tagsInput = ref('')

const rootClass = computed(() =>
  props.embedded ? 'space-y-4' : 'mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8',
)

function onFileChange(event: Event): void {
  const target = event.target as HTMLInputElement
  file.value = target.files?.[0] ?? null
}

function closeModal(): void {
  emit('cancel')
}

async function submit(): Promise<void> {
  if (!file.value) {
    error.value = '请选择要上传的图片'
    return
  }

  loading.value = true
  error.value = ''
  success.value = ''
  try {
    form.value.tags = tagsInput.value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
    await uploadPhoto(file.value, form.value)
    success.value = '上传成功，已写入当前数据源。'

    if (props.embedded) {
      emit('uploaded')
      return
    }

    await router.push({ name: 'home' })
  } catch (err) {
    error.value = err instanceof Error ? err.message : '上传失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section :class="rootClass">
    <form class="space-y-4 rounded-3xl border border-slate-200 bg-white p-5" @submit.prevent="submit">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-slate-900">上传照片</h2>
        <button
          v-if="embedded"
          type="button"
          class="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 hover:bg-slate-200"
          @click="closeModal"
        >
          关闭
        </button>
      </div>

      <label class="block space-y-1">
        <span class="text-sm text-slate-600">图片文件</span>
        <input class="w-full rounded-xl border border-slate-300 px-3 py-2" type="file" accept="image/*" @change="onFileChange" />
      </label>

      <label class="block space-y-1">
        <span class="text-sm text-slate-600">标题</span>
        <input v-model="form.title" class="w-full rounded-xl border border-slate-300 px-3 py-2" type="text" />
      </label>

      <label class="block space-y-1">
        <span class="text-sm text-slate-600">分类</span>
        <input v-model="form.categoryName" class="w-full rounded-xl border border-slate-300 px-3 py-2" type="text" placeholder="旅行 / 日常 / 城市" />
      </label>

      <label class="block space-y-1">
        <span class="text-sm text-slate-600">标签（逗号分隔）</span>
        <input v-model="tagsInput" class="w-full rounded-xl border border-slate-300 px-3 py-2" type="text" placeholder="海边, 黄昏, 假期" />
      </label>

      <label class="block space-y-1">
        <span class="text-sm text-slate-600">地点名</span>
        <input v-model="form.locationName" class="w-full rounded-xl border border-slate-300 px-3 py-2" type="text" />
      </label>

      <LocationPicker
        :latitude="form.latitude"
        :longitude="form.longitude"
        :location-name="form.locationName || ''"
        :address="form.address || ''"
        @update-latitude="form.latitude = $event"
        @update-longitude="form.longitude = $event"
        @update-location-name="form.locationName = $event"
        @update-address="form.address = $event"
      />

      <div class="grid grid-cols-2 gap-3">
        <label class="block space-y-1">
          <span class="text-sm text-slate-600">纬度</span>
          <input v-model.number="form.latitude" class="w-full rounded-xl border border-slate-300 px-3 py-2" type="number" step="0.000001" />
        </label>
        <label class="block space-y-1">
          <span class="text-sm text-slate-600">经度</span>
          <input v-model.number="form.longitude" class="w-full rounded-xl border border-slate-300 px-3 py-2" type="number" step="0.000001" />
        </label>
      </div>

      <label class="block space-y-1">
        <span class="text-sm text-slate-600">地址</span>
        <input v-model="form.address" class="w-full rounded-xl border border-slate-300 px-3 py-2" type="text" />
      </label>

      <label class="block space-y-1">
        <span class="text-sm text-slate-600">可见性</span>
        <select v-model="form.visibility" class="w-full rounded-xl border border-slate-300 px-3 py-2">
          <option value="private">private</option>
          <option value="friends">friends</option>
          <option value="public">public</option>
        </select>
      </label>

      <label class="block space-y-1">
        <span class="text-sm text-slate-600">随笔</span>
        <textarea v-model="form.note" class="min-h-28 w-full rounded-xl border border-slate-300 px-3 py-2" />
      </label>

      <button
        type="submit"
        class="rounded-full bg-slate-900 px-5 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-60"
        :disabled="loading"
      >
        {{ loading ? '上传中...' : '开始上传' }}
      </button>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <p v-if="success" class="text-sm text-emerald-600">{{ success }}</p>
    </form>
  </section>
</template>
