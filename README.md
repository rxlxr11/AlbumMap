# Album Web App

Vue 3 + TypeScript + TailwindCSS + Vite frontend.

## Run

1. Copy env file:

```bash
cp .env.example .env
```

2. Install dependencies:

```bash
npm install
```

3. Start dev server:

```bash
npm run dev
```

## Data Source Toggle

- `VITE_DATA_MODE=mock`: use local mock data for UI preview.
- `VITE_DATA_MODE=supabase`: use Supabase RPC/table queries and OSS upload session flow.

## SQL migrations

- `supabase/migrations/001_init.sql`
- `supabase/migrations/002_rls.sql`
- `supabase/migrations/003_rpc.sql`

Run them in order in Supabase SQL editor or via migration CLI.

## Pages

- `/` homepage with map mode and waterfall mode
- `/upload` photo upload form (category, tags, location, note)

## Notes

- Homepage map uses Cesium 3D globe and supports fullscreen mode.
- Upload page location picker uses AMap search and click-to-pick coordinates.
- Map does not fall back to mock mode; valid AMap key and security code are required.
- Clicking a photo opens a detail modal popup on the same page.
