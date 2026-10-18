import { textOnAccent } from '../../lib/menuContrast'
/* Fila horizontal deslizable con las categorías reales del restaurante.
   Es el único menú de categorías de la carta: no se repite en otra parte.
   El scroll horizontal vive aquí dentro, la página no se mueve. */

const FALLBACK = { accent: '#FF6B35', bg: '#FFF8F2', bgTint: '#FFF8F2' }

export default function CategoryTabs({ categories = [], activeId = null, onChange, theme, onOpenDailyMenu, dailyMenuOpen = false }) {
  const t = { ...FALLBACK, ...(theme || {}) }

  const tabs = [
    { id: null, name: 'Todos' },
    ...(onOpenDailyMenu ? [{ id: 'daily-menu', name: 'Menú del día', onClick: onOpenDailyMenu }] : []),
    ...categories,
  ]

  return (
    <nav
      aria-label="Categorías de la carta"
      className="w-full overflow-x-auto overscroll-x-contain [&::-webkit-scrollbar]:hidden"
      style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', backgroundColor: t.bg }}
    >
      <ul className="flex items-center gap-2 px-4 py-3 w-max">
        {tabs.map((cat) => {
          const active = cat.onClick ? dailyMenuOpen : !dailyMenuOpen && cat.id === activeId
          return (
            <li key={cat.id ?? 'todos'}>
              <button
                type="button"
                onClick={cat.onClick ?? (() => onChange?.(cat.id))}
                aria-pressed={active}
                aria-haspopup={cat.onClick ? 'dialog' : undefined}
                className="whitespace-nowrap rounded-full px-5 py-3 text-base font-extrabold transition-colors"
                style={
                  active
                    ? { backgroundColor: t.accent, color: textOnAccent(t.accent) }
                    : { backgroundColor: t.bgTint, color: t.text ?? '#1A1A1A', border: '1px solid rgba(26,26,26,0.10)' }
                }
              >
                {cat.name}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
