import type { MapViewport } from '../types/map'
import type { MapMarker, PhotoDetail, UploadPhotoInput, WaterfallPhoto } from '../types/photo'

interface MockPhotoRecord {
  id: string
  title: string
  note: string
  categoryName: string
  tags: string[]
  ossUrl: string
  thumbnailUrl: string
  width: number
  height: number
  uploadedAt: string
  takenAt: string
  latitude: number
  longitude: number
  locationName: string
  address: string
  visibility: 'private' | 'public' | 'friends'
}

const now = Date.now()

const records: MockPhotoRecord[] = [
  {
    id: 'photo-ratio-001',
    title: '比例测试 9:16',
    note: '用于瀑布流测试：9:16 竖图。',
    categoryName: '比例测试',
    tags: ['瀑布流', '竖图', '9:16'],
    ossUrl: '/mock-waterfall/wf-portrait-9x16.svg',
    thumbnailUrl: '/mock-waterfall/wf-portrait-9x16.svg',
    width: 900,
    height: 1600,
    uploadedAt: new Date(now - 1000 * 60 * 3).toISOString(),
    takenAt: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
    latitude: 31.2304,
    longitude: 121.4737,
    locationName: '上海静安',
    address: '上海市静安区',
    visibility: 'public',
  },
  {
    id: 'photo-ratio-002',
    title: '比例测试 1:1',
    note: '用于瀑布流测试：1:1 方图。',
    categoryName: '比例测试',
    tags: ['瀑布流', '方图', '1:1'],
    ossUrl: '/mock-waterfall/wf-square-1x1.svg',
    thumbnailUrl: '/mock-waterfall/wf-square-1x1.svg',
    width: 1200,
    height: 1200,
    uploadedAt: new Date(now - 1000 * 60 * 4).toISOString(),
    takenAt: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
    latitude: 30.2741,
    longitude: 120.1551,
    locationName: '杭州上城',
    address: '浙江省杭州市上城区',
    visibility: 'public',
  },
  {
    id: 'photo-ratio-003',
    title: '比例测试 16:9',
    note: '用于瀑布流测试：16:9 横图。',
    categoryName: '比例测试',
    tags: ['瀑布流', '横图', '16:9'],
    ossUrl: '/mock-waterfall/wf-landscape-16x9.svg',
    thumbnailUrl: '/mock-waterfall/wf-landscape-16x9.svg',
    width: 1600,
    height: 900,
    uploadedAt: new Date(now - 1000 * 60 * 5).toISOString(),
    takenAt: new Date(now - 1000 * 60 * 60 * 4).toISOString(),
    latitude: 23.1291,
    longitude: 113.2644,
    locationName: '广州天河',
    address: '广东省广州市天河区',
    visibility: 'public',
  },
  {
    id: 'photo-ratio-004',
    title: '比例测试 21:9',
    note: '用于瀑布流测试：21:9 超宽图。',
    categoryName: '比例测试',
    tags: ['瀑布流', '超宽图', '21:9'],
    ossUrl: '/mock-waterfall/wf-ultrawide-21x9.svg',
    thumbnailUrl: '/mock-waterfall/wf-ultrawide-21x9.svg',
    width: 2100,
    height: 900,
    uploadedAt: new Date(now - 1000 * 60 * 6).toISOString(),
    takenAt: new Date(now - 1000 * 60 * 60 * 5).toISOString(),
    latitude: 32.0603,
    longitude: 118.7969,
    locationName: '南京秦淮',
    address: '江苏省南京市秦淮区',
    visibility: 'public',
  },
  {
    id: 'photo-ratio-005',
    title: '比例测试 3:4',
    note: '用于瀑布流测试：3:4 竖图。',
    categoryName: '比例测试',
    tags: ['瀑布流', '竖图', '3:4'],
    ossUrl: '/mock-waterfall/wf-portrait-3x4.svg',
    thumbnailUrl: '/mock-waterfall/wf-portrait-3x4.svg',
    width: 1200,
    height: 1600,
    uploadedAt: new Date(now - 1000 * 60 * 7).toISOString(),
    takenAt: new Date(now - 1000 * 60 * 60 * 6).toISOString(),
    latitude: 29.563,
    longitude: 106.5516,
    locationName: '重庆渝中',
    address: '重庆市渝中区',
    visibility: 'public',
  },
  {
    id: 'photo-ratio-006',
    title: '比例测试 4:5',
    note: '用于瀑布流测试：4:5 竖图。',
    categoryName: '比例测试',
    tags: ['瀑布流', '竖图', '4:5'],
    ossUrl: '/mock-waterfall/wf-portrait-4x5.svg',
    thumbnailUrl: '/mock-waterfall/wf-portrait-4x5.svg',
    width: 1200,
    height: 1500,
    uploadedAt: new Date(now - 1000 * 60 * 8).toISOString(),
    takenAt: new Date(now - 1000 * 60 * 60 * 7).toISOString(),
    latitude: 30.5928,
    longitude: 114.3055,
    locationName: '武汉江岸',
    address: '湖北省武汉市江岸区',
    visibility: 'public',
  },
  {
    id: 'photo-001',
    title: '城市夜景',
    note: '夜风很舒服，江边有灯光秀。',
    categoryName: '城市',
    tags: ['夜景', '散步'],
    ossUrl: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=600&q=80',
    width: 1200,
    height: 800,
    uploadedAt: new Date(now - 1000 * 60 * 20).toISOString(),
    takenAt: new Date(now - 1000 * 60 * 60 * 30).toISOString(),
    latitude: 31.2304,
    longitude: 121.4737,
    locationName: '上海外滩',
    address: '上海市黄浦区中山东一路',
    visibility: 'public',
  },
  {
    id: 'photo-002',
    title: '山海公路',
    note: '一路向东，云层很低。',
    categoryName: '旅行',
    tags: ['自驾', '海边'],
    ossUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=600&q=80',
    width: 1200,
    height: 900,
    uploadedAt: new Date(now - 1000 * 60 * 45).toISOString(),
    takenAt: new Date(now - 1000 * 60 * 60 * 36).toISOString(),
    latitude: 24.4798,
    longitude: 118.0894,
    locationName: '厦门环岛路',
    address: '福建省厦门市思明区环岛南路',
    visibility: 'public',
  },
  {
    id: 'photo-003',
    title: '清晨码头',
    note: '天刚亮，水面像镜子。',
    categoryName: '日常',
    tags: ['清晨', '港口'],
    ossUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=600&q=80',
    width: 1200,
    height: 800,
    uploadedAt: new Date(now - 1000 * 60 * 75).toISOString(),
    takenAt: new Date(now - 1000 * 60 * 60 * 70).toISOString(),
    latitude: 22.5431,
    longitude: 114.0579,
    locationName: '深圳湾',
    address: '广东省深圳市南山区滨海大道',
    visibility: 'public',
  },
  {
    id: 'photo-004',
    title: '雨后街角',
    note: '路灯把雨后的地面照得很亮。',
    categoryName: '城市',
    tags: ['街拍', '雨天'],
    ossUrl: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=600&q=80',
    width: 1200,
    height: 900,
    uploadedAt: new Date(now - 1000 * 60 * 140).toISOString(),
    takenAt: new Date(now - 1000 * 60 * 60 * 100).toISOString(),
    latitude: 39.9042,
    longitude: 116.4074,
    locationName: '北京东城区',
    address: '北京市东城区',
    visibility: 'public',
  },
  {
    id: 'photo-005',
    title: '林间步道',
    note: '周末徒步，空气特别好。',
    categoryName: '自然',
    tags: ['徒步', '森林'],
    ossUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=600&q=80',
    width: 1200,
    height: 800,
    uploadedAt: new Date(now - 1000 * 60 * 210).toISOString(),
    takenAt: new Date(now - 1000 * 60 * 60 * 140).toISOString(),
    latitude: 30.2741,
    longitude: 120.1551,
    locationName: '杭州西湖',
    address: '浙江省杭州市西湖风景区',
    visibility: 'friends',
  },
  {
    id: 'photo-006',
    title: '海岸线',
    note: '浪很大，风也很大。',
    categoryName: '旅行',
    tags: ['海', '日落'],
    ossUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
    width: 1200,
    height: 800,
    uploadedAt: new Date(now - 1000 * 60 * 280).toISOString(),
    takenAt: new Date(now - 1000 * 60 * 60 * 190).toISOString(),
    latitude: 18.2528,
    longitude: 109.5119,
    locationName: '三亚海湾',
    address: '海南省三亚市',
    visibility: 'public',
  },
]

function sortedRecords(): MockPhotoRecord[] {
  return [...records].sort((a, b) => {
    if (a.uploadedAt === b.uploadedAt) {
      return a.id < b.id ? 1 : -1
    }
    return a.uploadedAt < b.uploadedAt ? 1 : -1
  })
}

export function queryMapMarkers(viewport: MapViewport): MapMarker[] {
  return records
    .filter(
      (item) =>
        item.latitude >= viewport.minLat &&
        item.latitude <= viewport.maxLat &&
        item.longitude >= viewport.minLng &&
        item.longitude <= viewport.maxLng,
    )
    .map((item) => ({
      photo_id: item.id,
      latitude: item.latitude,
      longitude: item.longitude,
      thumbnail_url: item.thumbnailUrl,
      taken_at: item.takenAt,
      note: item.note,
      category_name: item.categoryName,
      tags: [...item.tags],
    }))
}

export function queryWaterfallPhotos(cursorUploadedAt: string | null, cursorId: string | null, limit = 24): WaterfallPhoto[] {
  const all = sortedRecords()
  if (!cursorUploadedAt || !cursorId) {
    return all.slice(0, limit).map((item) => ({
      photo_id: item.id,
      oss_url: item.ossUrl,
      thumbnail_url: item.thumbnailUrl,
      width: item.width,
      height: item.height,
      note: item.note,
      uploaded_at: item.uploadedAt,
      category_name: item.categoryName,
      tags: [...item.tags],
    }))
  }

  const startIndex = all.findIndex((item) => item.uploadedAt === cursorUploadedAt && item.id === cursorId)
  const nextStart = startIndex >= 0 ? startIndex + 1 : all.length
  return all.slice(nextStart, nextStart + limit).map((item) => ({
    photo_id: item.id,
    oss_url: item.ossUrl,
    thumbnail_url: item.thumbnailUrl,
    width: item.width,
    height: item.height,
    note: item.note,
    uploaded_at: item.uploadedAt,
    category_name: item.categoryName,
    tags: [...item.tags],
  }))
}

export function queryPhotoDetail(photoId: string): PhotoDetail | null {
  const item = records.find((record) => record.id === photoId)
  if (!item) {
    return null
  }
  return {
    photo_id: item.id,
    user_id: 'mock-user-1',
    title: item.title,
    note: item.note,
    oss_url: item.ossUrl,
    thumbnail_url: item.thumbnailUrl,
    width: item.width,
    height: item.height,
    size_bytes: null,
    mime_type: 'image/jpeg',
    taken_at: item.takenAt,
    uploaded_at: item.uploadedAt,
    visibility: item.visibility,
    category_id: `category-${item.categoryName}`,
    category_name: item.categoryName,
    location_id: `location-${item.id}`,
    location_name: item.locationName,
    address: item.address,
    latitude: item.latitude,
    longitude: item.longitude,
  }
}

export function queryPhotoTags(photoId: string): string[] {
  const item = records.find((record) => record.id === photoId)
  return item ? [...item.tags] : []
}

export function insertMockPhoto(file: File, input: UploadPhotoInput): string {
  const id = `photo-${Math.random().toString(36).slice(2, 10)}`
  const objectUrl = URL.createObjectURL(file)
  records.unshift({
    id,
    title: input.title?.trim() || '新上传照片',
    note: input.note,
    categoryName: input.categoryName?.trim() || '未分类',
    tags: input.tags,
    ossUrl: objectUrl,
    thumbnailUrl: objectUrl,
    width: 1080,
    height: 720,
    uploadedAt: new Date().toISOString(),
    takenAt: new Date().toISOString(),
    latitude: input.latitude,
    longitude: input.longitude,
    locationName: input.locationName?.trim() || '未命名地点',
    address: input.address?.trim() || '-',
    visibility: input.visibility,
  })
  return id
}
