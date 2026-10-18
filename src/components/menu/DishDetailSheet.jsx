import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Heart } from 'lucide-react'
import { textOnAccent, accentOnWhite } from '../../lib/menuContrast'

const DEFAULT_THEME = { accent: '#FF6B35', bgTint: '#FFF8F2' }

export default function DishDetailSheet({ dish, onClose, theme, isFavorite = false, onToggleFavorite }) {
  const { accent, bgTint } = theme ?? DEFAULT_THEME
  const dialogRef = useRef(null)
  const [failedImage, setFailedImage] = useState(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    const previousFocus = document.activeElement
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()
    const handleKey = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return }
      if (event.key !== 'Tab') return
      const buttons = [...(dialogRef.current?.querySelectorAll('button:not([disabled]), a[href], [tabindex="0"]') ?? [])]
      const first = buttons[0]
      const last = buttons[buttons.length - 1]
      if (!first) { event.preventDefault(); return }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault(); last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {
        event.preventDefault(); first.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', handleKey)
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [onClose])

  const allergens = Array.isArray(dish.allergens) ? dish.allergens : []

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />

      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="dish-detail-title" tabIndex={-1}
        className="messa-dish-dialog fixed inset-x-0 bottom-0 z-50 flex flex-col overflow-hidden shadow-2xl animate-slide-up outline-none">

        {/* La foto llena todo el recuadro superior, con recorte centrado. */}
        <div className="messa-dish-detail-hero relative" style={{ background: `linear-gradient(145deg, ${accent}, ${bgTint})` }}>
          {dish.image_url && dish.image_url !== failedImage ? (
            <img src={dish.image_url} alt={dish.name} className="w-full h-full object-cover object-center" onError={() => setFailedImage(dish.image_url)} />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: bgTint }}>
              <span className="text-7xl opacity-20">🍽️</span>
            </div>
          )}

          <button
            onClick={onClose}
            className="absolute top-4 left-4 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform"
            aria-label="Cerrar"
          >
            <ArrowLeft size={20} className="text-[#1A1A1A]" />
          </button>
          {onToggleFavorite && <button type="button" onClick={onToggleFavorite} aria-label={isFavorite ? 'Quitar plato de favoritos' : 'Guardar plato en favoritos'} aria-pressed={isFavorite} className="absolute top-4 right-4 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md" style={{ color: accent }}><Heart size={21} fill={isFavorite ? 'currentColor' : 'none'} /></button>}
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto bg-white rounded-t-3xl -mt-5 relative z-10 px-5 pt-6 pb-28">
          <h2 id="dish-detail-title" className="font-bold text-[#1A1A1A]" style={{ fontSize: 26 }}>{dish.name}</h2>

          <div className="mt-4 flex items-baseline gap-3">
            <p className="font-bold" style={{ fontSize: 24, color: accentOnWhite(accent) }}>
              {Number(dish.price).toFixed(2)}€
            </p>
            {Number(dish.original_price) > Number(dish.price) && (
              <p className="text-gray-400 line-through text-base">
                {Number(dish.original_price).toFixed(2)}€
              </p>
            )}
          </div>

          {dish.description && (
            <p className="text-gray-500 mt-2 leading-relaxed" style={{ fontSize: 15 }}>{dish.description}</p>
          )}

          {(dish.is_special || dish.best_seller) && (
            <div className="flex flex-wrap gap-2 mt-4">
              {dish.is_special && (
                <span
                  className="px-3 py-1 text-xs font-semibold rounded-full"
                  style={{ backgroundColor: bgTint, border: `1px solid ${accent}40`, color: accent }}
                >
                  ⭐ Especial de hoy
                </span>
              )}
              {dish.best_seller && (
                <span
                  className="px-3 py-1 text-xs font-semibold rounded-full"
                  style={{ backgroundColor: bgTint, border: `1px solid ${accent}40`, color: accent }}
                >
                  🔥 Más vendido
                </span>
              )}
            </div>
          )}

          {allergens.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Alérgenos</p>
              <div className="flex flex-wrap gap-2">
                {allergens.map((a, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 text-xs font-medium rounded-full"
                    style={{ backgroundColor: bgTint, border: `1px solid ${accent}40`, color: accent }}
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Barra inferior fija */}
        <div className="messa-dish-detail-footer absolute bottom-0 inset-x-0 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-5 py-4 flex flex-wrap gap-3 items-center justify-between z-20">
          <div>
            <p className="text-xs text-gray-400 leading-none mb-1">Precio</p>
            <p className="font-bold text-xl leading-none" style={{ color: accentOnWhite(accent) }}>{Number(dish.price).toFixed(2)}€</p>
          </div>
          {onToggleFavorite && <button
            type="button"
            onClick={onToggleFavorite}
            aria-pressed={isFavorite}
            className="flex items-center gap-2 text-white px-5 py-3.5 rounded-2xl font-semibold text-sm active:scale-95 transition-transform shadow-md"
            style={{ backgroundColor: accent, color: textOnAccent(accent), boxShadow: `0 4px 14px ${accent}50`, maxWidth: '100%' }}
          >
            <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
            {isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
          </button>}
        </div>
      </div>
    </>
  )
}
