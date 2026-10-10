import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const FALLBACK_API = 'http://127.0.0.1:8000'

// One id per build. It goes into the bundle as __BUILD_ID__ and into
// version.json as buildId: an open tab compares the two and reloads itself
// when they differ, which is what makes a deploy reach people who never
// press F5. A timestamp is enough — it only ever has to change.
const buildId = Date.now().toString(36)

function emitVersionFile(): Plugin {
  return {
    name: 'rent-hub:emit-version',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ buildId, builtAt: new Date().toISOString() }),
      })
    },
  }
}

const normalize = (url: string) => url.trim().replace(/\/+$/, '')

async function isRentHubBackend(target: string): Promise<boolean> {
  try {
    const res = await fetch(new URL('/health', target), {
      signal: AbortSignal.timeout(1500),
    })
    if (!res.ok) return false
    const body = (await res.json()) as { status?: string }
    return body?.status === 'healthy'
  } catch {
    return false
  }
}

async function resolveApiTarget(env: Record<string, string>): Promise<string> {
  const override = env.VITE_API_URL ? normalize(env.VITE_API_URL) : ''
  if (override && override !== normalize(FALLBACK_API)) {
    if (await isRentHubBackend(override)) {
      return override
    }
    console.warn(
      `[vite] VITE_API_URL=${override} is not a reachable RentHub backend, falling back to ${FALLBACK_API}`
    )
  }
  return FALLBACK_API
}

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = await resolveApiTarget(env)
  console.log(`[vite] API proxy target: ${target}`)

  const proxy = {
    '/api': { target, changeOrigin: true },
    '/uploads': { target, changeOrigin: true },
  }

  return {
    define: {
      __BUILD_ID__: JSON.stringify(buildId),
    },
    plugins: [react(), emitVersionFile()],
    server: {
      port: 3000,
      proxy,
    },
    preview: {
      port: 3000,
      proxy,
    },
  }
})
