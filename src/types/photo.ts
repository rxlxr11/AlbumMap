export interface MapMarker {
  photo_id: string
  latitude: number
  longitude: number
  thumbnail_url: string
  taken_at: string | null
  note: string | null
  category_name?: string | null
  tags?: string[]
}

export interface WaterfallPhoto {
  photo_id: string
  oss_url: string
  thumbnail_url: string | null
  width: number | null
  height: number | null
  note: string | null
  uploaded_at: string
  category_name?: string | null
  tags?: string[]
}

export interface PhotoDetail {
  photo_id: string
  user_id: string
  title: string | null
  note: string | null
  oss_url: string
  thumbnail_url: string | null
  width: number | null
  height: number | null
  size_bytes: number | null
  mime_type: string | null
  taken_at: string | null
  uploaded_at: string
  visibility: 'private' | 'public' | 'friends'
  category_id: string | null
  category_name: string | null
  location_id: string | null
  location_name: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
}

export interface UploadPhotoInput {
  title?: string
  note: string
  categoryName?: string
  tags: string[]
  latitude: number
  longitude: number
  locationName?: string
  address?: string
  visibility: 'private' | 'public' | 'friends'
}
