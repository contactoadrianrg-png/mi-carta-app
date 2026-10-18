import { useState } from 'react'

/* Cabecera de la carta pública: banner y nombre del restaurante. */

const FALLBACK = { accent: '#FF6B35', bg: '#FFF8F2', bgTint: '#FFF8F2' }

export default function RestaurantHeader({ restaurant, theme }) {
  const [failedBanner, setFailedBanner] = useState(null)
  const t = { ...FALLBACK, ...(theme || {}) }
  const banner = restaurant?.banner_url && restaurant.banner_url !== failedBanner ? restaurant.banner_url : null

  return (
    <header className="w-full">
      {/* Banner. Sin imagen: franja del color del tema, nunca un hueco roto */}
      <div
        className="relative w-full aspect-[5/2] overflow-hidden"
        style={{ backgroundColor: banner ? '#ECECEC' : t.bgTint }}
      >
        {banner && (
          <img
            src={banner}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover"
            onError={() => setFailedBanner(banner)}
          />
        )}
      </div>

      {/* Nombre: el restaurante es lo protagonista */}
      <div className="px-4 pt-4 pb-3" style={{ backgroundColor: t.bg }}>
        <h1
          className="text-[26px] sm:text-[30px] font-bold leading-tight tracking-tight break-words"
          style={{ color: t.accent }}
        >
          {restaurant?.name}
        </h1>
      </div>
    </header>
  )
}
