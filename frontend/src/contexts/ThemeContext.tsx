import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

type Theme = 'light' | 'dark'
export type AccentName = 'original' | 'yellow' | 'red' | 'green' | 'blue' | 'purple' | 'pink' | 'orange'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  accent: AccentName
  setAccent: (a: AccentName) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

function getSystemTheme(): Theme {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'dark'
}

const ACCENTS: AccentName[] = ['original', 'yellow', 'red', 'green', 'blue', 'purple', 'pink', 'orange']

function readAccent(): AccentName {
  const saved = localStorage.getItem('accent') as AccentName | null
  return saved && ACCENTS.includes(saved) ? saved : 'original'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme | null
    return saved || 'dark'
  })
  const [accent, setAccentState] = useState<AccentName>(readAccent)

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
    if (accent === 'original') {
      root.removeAttribute('data-accent')
    } else {
      root.setAttribute('data-accent', accent)
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

  const setAccent = (a: AccentName) => {
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
