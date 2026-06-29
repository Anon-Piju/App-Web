// ── Theme system ──────────────────────────────────────────────
export const THEMES = [
  {
    id: 'sheikah',
    name: 'Sheikah Slate',
    description: 'Azul místico del Zelda',
    accent:  '#00c8ff',
    accentDim: '#0080aa',
    accentBright: '#80e8ff',
    bg:      '#060a0f',
    surface1:'#0d1520',
    surface2:'#142030',
    surface3:'#1c2d40',
    surface4:'#243548',
    text:    '#c8e8f8',
    textMuted:'#5080a0',
    jade:    '#00ffcc',
    amber:   '#ffcc00',
    rose:    '#ff4488',
    sky:     '#00c8ff',
  },
  {
    id: 'void',
    name: 'Void Purple',
    description: 'Oscuro con acento púrpura (predeterminado)',
    accent:  '#7c6af7',
    accentDim: '#4f45a0',
    accentBright: '#a99cf9',
    bg:      '#0c0c0f',
    surface1:'#111114',
    surface2:'#18181c',
    surface3:'#222228',
    surface4:'#2e2e36',
    text:    '#e2e2e8',
    textMuted:'#52525e',
    jade:    '#3ecf8e',
    amber:   '#f4a94e',
    rose:    '#f16b6b',
    sky:     '#5aafee',
  },
  {
    id: 'midnight',
    name: 'Midnight Green',
    description: 'Verde esmeralda sobre negro profundo',
    accent:  '#00c896',
    accentDim: '#007a5c',
    accentBright: '#80e8c8',
    bg:      '#050f0a',
    surface1:'#0a1a12',
    surface2:'#10241a',
    surface3:'#183020',
    surface4:'#203c28',
    text:    '#c8eedd',
    textMuted:'#406050',
    jade:    '#00c896',
    amber:   '#f4c84e',
    rose:    '#f16b6b',
    sky:     '#4ec8f4',
  },
  {
    id: 'crimson',
    name: 'Crimson Dark',
    description: 'Rojo intenso con fondo carbón',
    accent:  '#e8405a',
    accentDim: '#a02840',
    accentBright: '#ff8099',
    bg:      '#0f080a',
    surface1:'#1a0d10',
    surface2:'#241218',
    surface3:'#301820',
    surface4:'#3c2028',
    text:    '#f0d8dc',
    textMuted:'#705060',
    jade:    '#3ecf8e',
    amber:   '#f4a94e',
    rose:    '#e8405a',
    sky:     '#5aafee',
  },
  {
    id: 'amber',
    name: 'Amber Dusk',
    description: 'Dorado cálido sobre negro ahumado',
    accent:  '#f4a030',
    accentDim: '#a06820',
    accentBright: '#ffc870',
    bg:      '#0f0c06',
    surface1:'#1a1508',
    surface2:'#241e0c',
    surface3:'#302810',
    surface4:'#3c3218',
    text:    '#f0e8d0',
    textMuted:'#706040',
    jade:    '#3ecf8e',
    amber:   '#f4a030',
    rose:    '#f16b6b',
    sky:     '#5aafee',
  },
  {
    id: 'slate',
    name: 'Cold Slate',
    description: 'Gris azulado frío y minimalista',
    accent:  '#7ab8e8',
    accentDim: '#4878a8',
    accentBright: '#a8d4f8',
    bg:      '#080c10',
    surface1:'#101620',
    surface2:'#182030',
    surface3:'#202c3c',
    surface4:'#283848',
    text:    '#d8e4f0',
    textMuted:'#506070',
    jade:    '#3ecf8e',
    amber:   '#f4a94e',
    rose:    '#f16b6b',
    sky:     '#7ab8e8',
  },
]

export function applyTheme(theme) {
  const r = document.documentElement.style
  r.setProperty('--accent',        theme.accent)
  r.setProperty('--accent-dim',    theme.accentDim)
  r.setProperty('--accent-bright', theme.accentBright)
  r.setProperty('--bg',            theme.bg)
  r.setProperty('--surface1',      theme.surface1)
  r.setProperty('--surface2',      theme.surface2)
  r.setProperty('--surface3',      theme.surface3)
  r.setProperty('--surface4',      theme.surface4)
  r.setProperty('--text',          theme.text)
  r.setProperty('--text-muted',    theme.textMuted)
  r.setProperty('--jade',          theme.jade)
  r.setProperty('--amber',         theme.amber)
  r.setProperty('--rose',          theme.rose)
  r.setProperty('--sky',           theme.sky)
  document.body.style.background = theme.bg
  document.body.style.color      = theme.text
}

export function loadTheme() {
  try {
    const saved = JSON.parse(localStorage.getItem('orbit_theme'))
    return THEMES.find(t => t.id === saved?.id) || THEMES[0]
  } catch { return THEMES[0] }
}

export function saveTheme(theme) {
  localStorage.setItem('orbit_theme', JSON.stringify({ id: theme.id }))
}
