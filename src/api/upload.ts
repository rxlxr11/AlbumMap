import type { UploadPhotoInput } from '../types/photo'
import { insertMockPhoto } from '../mock/photos'
import { getSupabaseClient } from '../lib/supabase'

type DataMode = 'mock' | 'supabase'

function getDataMode(): DataMode {
  const mode = import.meta.env.VITE_DATA_MODE
  return mode === 'supabase' ? 'supabase' : 'mock'
}

interface UploadSession {
  host: string
  key: string
  policy: string
  signature: string
  securityToken: string
  credential: string
  date: string
  bucket: string
  region: string
}

async function getUploadSession(fileName: string, mimeType: string): Promise<UploadSession> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.functions.invoke('create-upload-session', {
    body: { fileName, mimeType },
  })
  if (error) {
    throw error
  }
  return data as UploadSession
}

async function ensureCategoryId(userId: string, categoryName?: string): Promise<string | null> {
  if (!categoryName) {
    return null
  }

  const supabase = getSupabaseClient()
  const { data: existed, error: queryError } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', userId)
    .eq('name', categoryName)
    .maybeSingle()

  if (queryError) {
    throw queryError
  }
  if (existed?.id) {
    return existed.id
  }

  const { data: created, error: insertError } = await supabase
    .from('categories')
    .insert({ user_id: userId, name: categoryName })
    .select('id')
    .single()

  if (insertError) {
    throw insertError
  }
  return created.id
}

async function ensureTagIds(userId: string, tags: string[]): Promise<string[]> {
  const normalized = tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0)
  const ids: string[] = []
  const supabase = getSupabaseClient()

  for (const tagName of normalized) {
    const { data: existed, error: queryError } = await supabase
      .from('tags')
      .select('id')
      .eq('user_id', userId)
      .eq('name', tagName)
      .maybeSingle()

    if (queryError) {
      throw queryError
    }

    if (existed?.id) {
      ids.push(existed.id)
      continue
    }

    const { data: created, error: insertError } = await supabase
      .from('tags')
      .insert({ user_id: userId, name: tagName })
      .select('id')
      .single()

    if (insertError) {
      throw insertError
    }
    ids.push(created.id)
  }

  return ids
}

async function createLocation(userId: string, input: UploadPhotoInput): Promise<string> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('locations')
    .insert({
      user_id: userId,
      name: input.locationName,
      address: input.address,
      latitude: input.latitude,
      longitude: input.longitude,
      coord_sys: 'wgs84',
      source: 'manual',
    })
    .select('id')
    .single()

  if (error) {
    throw error
  }
  return data.id
}

async function uploadToSupabase(file: File, input: UploadPhotoInput): Promise<string> {
  const supabase = getSupabaseClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    throw new Error('Please login first')
  }
  const userId = userData.user.id

  const uploadSession = await getUploadSession(file.name, file.type)
  const form = new FormData()
  form.append('key', uploadSession.key)
  form.append('policy', uploadSession.policy)
  form.append('x-oss-signature-version', 'OSS4-HMAC-SHA256')
  form.append('x-oss-credential', uploadSession.credential)
  form.append('x-oss-date', uploadSession.date)
  form.append('x-oss-security-token', uploadSession.securityToken)
  form.append('x-oss-signature', uploadSession.signature)
  form.append('success_action_status', '200')
  form.append('file', file)

  const uploadResponse = await fetch(uploadSession.host, { method: 'POST', body: form })
  if (!uploadResponse.ok) {
    throw new Error(`OSS upload failed: ${uploadResponse.status}`)
  }

  const categoryId = await ensureCategoryId(userId, input.categoryName)
  const locationId = await createLocation(userId, input)
  const publicUrl = `${uploadSession.host.replace(/\/$/, '')}/${uploadSession.key}`

  const { data: photo, error: photoError } = await supabase
    .from('photos')
    .insert({
      user_id: userId,
      category_id: categoryId,
      location_id: locationId,
      title: input.title,
      note: input.note,
      visibility: input.visibility,
      oss_bucket: uploadSession.bucket,
      oss_region: uploadSession.region,
      oss_object_key: uploadSession.key,
      oss_url: publicUrl,
      thumbnail_url: publicUrl,
      size_bytes: file.size,
      mime_type: file.type,
    })
    .select('id')
    .single()

  if (photoError) {
    throw photoError
  }

  const tagIds = await ensureTagIds(userId, input.tags)
  if (tagIds.length > 0) {
    const rows = tagIds.map((tagId) => ({ photo_id: photo.id, tag_id: tagId }))
    const { error: tagError } = await supabase.from('photo_tags').insert(rows)
    if (tagError) {
      throw tagError
    }
  }

  return photo.id as string
}

export async function uploadPhoto(file: File, input: UploadPhotoInput): Promise<string> {
  if (getDataMode() === 'mock') {
    return insertMockPhoto(file, {
      ...input,
      tags: input.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0),
    })
  }
  return uploadToSupabase(file, input)
}
