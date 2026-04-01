/// <reference types="vite/client" />
/// <reference types="google.maps" />

interface ImportMetaEnv {
  readonly VITE_DATA_MODE?: 'mock' | 'supabase'
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_AMAP_KEY?: string
  readonly VITE_GOOGLE_MAPS_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
