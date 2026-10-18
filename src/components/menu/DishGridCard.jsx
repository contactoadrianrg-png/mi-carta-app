import { useState } from 'react'

/* Tarjeta de plato para la rejilla: foto, nombre, descripción breve y precio.
   Sin botón de añadir: la carta no tiene función de pedidos. */

const FALLBACK = { accent: '#FF6B35', bg: '#FFF8F2', bgTint: '#FFF8F2' }

export default function DishGridCard({ dish, theme, onClick }) {
  const [failedImage, setFailedImage] = useState(null)
  const t = { ...FALLBACK, ...(theme || {}) }
  const img = dish?.image_url && dish.image_url !== failedImage ? dish.image_url : null
  const hasOffer = dish?.original_price && Number(dish.original_price) > Number(dish.price)

  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className="flex w-full flex-col overflow-hidden rounded-2xl bg-white text-left transition-transform active:scale-[0.98]"
      style={{ border: '1px solid rgba(26,26,26,0.08)' }}
    >
      {/* Foto. Sin foto: recuadro gris, nunca un plato inventado */}
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-[#ECECEC]">
        {img && (
          <img
            src={img}
            alt={dish.name}
            loading="lazy"
            className="h-full w-full object-cover"
            onError={() => setFailedImage(img)}
          />
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="text-[14px] font-semibold leading-snug text-[#1A1A1A] line-clamp-2">
          {dish?.name}
        </h3>

        {dish?.description?.trim() && (
          <p className="mt-1 text-[12px] leading-snug text-[#1A1A1A]/55 line-clamp-2">
            {dish.description}
          </p>
        )}

        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="text-[15px] font-bold" style={{ color: t.accent }}>
            {Number(dish?.price ?? 0).toFixed(2)}€
          </span>
          {hasOffer && (
            <span className="text-[12px] text-[#1A1A1A]/40 line-through">
              {Number(dish.original_price).toFixed(2)}€
            </span>
          )}
        </div>
      </div>
    </Tag>
  )
}
