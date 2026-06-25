import { useEffect } from 'react'
import { ArrowLeft, Heart } from 'lucide-react'

const DEFAULT_THEME = { accent: '#FF6B35', bgTint: '#FFF8F2' }

export default function DishDetailSheet({ dish, onClose, theme }) {
  const { accent, bgTint } = theme ?? DEFAULT_THEME

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const allergens = Array.isArray(dish.allergens) ? dish.allergens : []

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />

      <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl overflow-hidden shadow-2xl animate-slide-up" style={{ height: '92vh' }}>

        {/* Foto — 45% altura */}
        <div className="relative bg-gray-100" style={{ height: '45%', flexShrink: 0 }}>
          {dish.image_url ? (
            <img src={dish.image_url} alt={dish.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: bgTint }}>
              <span className="text-7xl opacity-20">🍽️</span>
            </div>
          )}

          <button
            onClick={onClose}
            className="absolute top-4 left-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform"
            aria-label="Cerrar"
          >
            <ArrowLeft size={20} className="text-[#1A1A1A]" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto bg-white rounded-t-3xl -mt-5 relative z-10 px-5 pt-6 pb-28">
          <h2 className="font-bold text-[#1A1A1A]" style={{ fontSize: 26 }}>{dish.name}</h2>

          {dish.description && (
            <p className="text-gray-500 mt-2 leading-relaxed" style={{ fontSize: 15 }}>{dish.description}</p>
          )}

          <div className="mt-4 flex items-baseline gap-3">
            <p className="font-bold" style={{ fontSize: 24, color: accent }}>
              {Number(dish.price).toFixed(2)}€
            </p>
            {dish.original_price && (
              <p className="text-gray-400 line-through text-base">
                {Number(dish.original_price).toFixed(2)}€
              </p>
            )}
          </div>

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
        <div className="absolute bottom-0 inset-x-0 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-5 py-4 flex items-center justify-between z-20">
          <div>
            <p className="text-xs text-gray-400 leading-none mb-1">Precio</p>
            <p className="font-bold text-xl leading-none" style={{ color: accent }}>{Number(dish.price).toFixed(2)}€</p>
          </div>
          <button
            className="flex items-center gap-2 text-white px-5 py-3.5 rounded-2xl font-semibold text-sm active:scale-95 transition-transform shadow-md"
            style={{ backgroundColor: accent, boxShadow: `0 4px 14px ${accent}50` }}
          >
            <Heart size={18} />
            Añadir a favoritos
          </button>
        </div>
      </div>
    </>
  )
}
