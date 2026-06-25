export const THEMES = [
  {
    id: 'orange',
    name: 'Naranja',
    primary: '#FF6B35',
    accent: '#FF6B35',
    bg: '#FFF8F2',
    bgTint: '#FFF8F2',
    swatches: ['#FF6B35', '#FFF8F2'],
  },
  {
    id: 'ocean',
    name: 'Azul Océano',
    primary: '#052659',
    accent: '#7DA0CA',
    bg: '#C1E8FF',
    bgTint: '#E4F3FF',
    swatches: ['#052659', '#7DA0CA', '#C1E8FF'],
  },
  {
    id: 'purple',
    name: 'Púrpura',
    primary: '#49225B',
    accent: '#A56ABD',
    bg: '#F5EBFA',
    bgTint: '#F5EBFA',
    swatches: ['#49225B', '#A56ABD', '#F5EBFA'],
  },
]

export function getTheme(colorTheme) {
  return THEMES.find(t => t.id === colorTheme) ?? THEMES[0]
}

// ── Temas visuales (asignados por Super Admin, aplicados como CSS variables) ──
const VISUAL_THEMES = {
  default: {
    '--color-bg':          '#ffffff',
    '--color-accent':      '#FF6B35',
    '--color-text':        '#1a1a1a',
    '--color-card-bg':     '#f9f9f9',
    '--color-card-border': '#e5e7eb',
  },
  jungle: {
    '--color-bg':          '#0d1a0a',
    '--color-accent':      '#c9a84c',
    '--color-text':        '#e8dfc8',
    '--color-card-bg':     '#0f1e0b',
    '--color-card-border': '#1e3010',
  },
  maibacht: {
    '--color-bg':          '#0a120a',
    '--color-accent':      '#b8952a',
    '--color-text':        '#f0ead6',
    '--color-card-bg':     '#111a0d',
    '--color-card-border': '#162010',
  },
}

export function applyTheme(themeId) {
  const vars = VISUAL_THEMES[themeId] ?? VISUAL_THEMES.default
  const root = document.documentElement
  Object.entries(vars).forEach(([key, value]) => root.style.setProperty(key, value))
}
