import type { MapViewport } from '../types/map'
import type { MapMarker, PhotoDetail, WaterfallPhoto } from '../types/photo'
import { queryMapMarkers, queryPhotoDetail, queryPhotoTags, queryWaterfallPhotos } from '../mock/photos'
import { getSupabaseClient } from '../lib/supabase'

type DataMode = 'mock' | 'supabase'

function getDataMode(): DataMode {
  const mode = import.meta.env.VITE_DATA_MODE
  return mode === 'supabase' ? 'supabase' : 'mock'
}

export async function getMapMarkers(viewport: MapViewport): Promise<MapMarker[]> {
  if (getDataMode() === 'mock') {
    return queryMapMarkers(viewport)
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('get_map_markers', {
    in_min_lat: viewport.minLat,
    in_max_lat: viewport.maxLat,
    in_min_lng: viewport.minLng,
    in_max_lng: viewport.maxLng,
    in_limit: 1000,
  })

  if (error) {
    throw error
  }
  return (data ?? []) as MapMarker[]
}

export async function getWaterfallPhotos(
  cursorUploadedAt: string | null,
  cursorId: string | null,
): Promise<WaterfallPhoto[]> {
  if (getDataMode() === 'mock') {
    return queryWaterfallPhotos(cursorUploadedAt, cursorId)
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('get_waterfall_photos', {
    in_cursor_uploaded_at: cursorUploadedAt,
    in_cursor_id: cursorId,
    in_limit: 24,
  })

  if (error) {
    throw error
  }
  return (data ?? []) as WaterfallPhoto[]
}

export async function getPhotoDetail(photoId: string): Promise<PhotoDetail | null> {
  if (getDataMode() === 'mock') {
    return queryPhotoDetail(photoId)
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('photo_detail_view')
    .select('*')
    .eq('photo_id', photoId)
    .maybeSingle()

  if (error) {
    throw error
  }
  return data as PhotoDetail | null
}

export async function getPhotoTags(photoId: string): Promise<string[]> {
  if (getDataMode() === 'mock') {
    return queryPhotoTags(photoId)
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('photo_tags')
    .select('tags(name)')
    .eq('photo_id', photoId)

  if (error) {
    throw error
  }

  const names: string[] = []
  for (const row of data ?? []) {
    const rowWithTag = row as { tags: { name: string }[] | null }
    const tagName = rowWithTag.tags?.[0]?.name
    if (tagName) {
      names.push(tagName)
    }
  }
  return names
}
