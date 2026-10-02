import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import {
  isCustomAccent,
  buildAccentVars,
  applyAccentVars,
  clearAccentVars,
} from '../utils/accent'

type Theme = 'light' | 'dark'
export type AccentName = 'original' | 'yellow' | 'red' | 'green' | 'blue' | 'purple' | 'pink' | 'orange'
/**
 * A preset id, or a raw `#rrggbb` picked with the custom colour input.
 * The preset path uses the stylesheet rules in index.css; a raw colour is
 * expanded into the full token set at runtime (see utils/accent.ts).
 */
export type AccentValue = string

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  accent: AccentValue
  setAccent: (a: AccentValue) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

function getSystemTheme(): Theme {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'dark'
}

const ACCENTS: AccentName[] = ['original', 'yellow', 'red', 'green', 'blue', 'purple', 'pink', 'orange']

function readAccent(): AccentValue {
  const saved = localStorage.getItem('accent')
  if (!saved) return 'original'
  if ((ACCENTS as string[]).includes(saved)) return saved
  if (isCustomAccent(saved)) return saved
  return 'original'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme | null
    return saved || 'dark'
  })
  const [accent, setAccentState] = useState<AccentValue>(readAccent)

  useEffect(() => {
    localStorage.setItem('theme', theme)
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
    }
  }, [theme])

  useEffect(() => {
    localStorage.setItem('accent', accent)
    const root = document.documentElement
    if (isCustomAccent(accent)) {
      // Arbitrary colour: no stylesheet rule exists, so drive the tokens inline.
      root.removeAttribute('data-accent')
      const vars = buildAccentVars(accent)
      if (vars) applyAccentVars(vars)
    } else {
      // Preset: clear any inline tokens first — inline styles would otherwise
      // keep winning over the `html[data-accent=…]` rules.
      clearAccentVars()
      if (accent === 'original') {
        root.removeAttribute('data-accent')
      } else {
        root.setAttribute('data-accent', accent)
      }
    }
  }, [accent])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light')
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const setAccent = (a: AccentValue) => {
    setAccentState(a)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
