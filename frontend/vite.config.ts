import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const FALLBACK_API = 'http://127.0.0.1:8000'

const normalize = (url: string) => url.trim().replace(/\/+$/, '')

async function isRentFlowBackend(target: string): Promise<boolean> {
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
    if (await isRentFlowBackend(override)) {
      return override
    }
    console.warn(
      `[vite] VITE_API_URL=${override} is not a reachable RentFlow backend, falling back to ${FALLBACK_API}`
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
    plugins: [react()],
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
