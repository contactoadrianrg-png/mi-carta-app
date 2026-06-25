import { useState } from 'react'

const DEFAULT_THEME = { accent: '#FF6B35', bgTint: '#FFF8F2' }

export default function DishCard({ dish, variant = 'grid', onClick, theme }) {
  const [imgError, setImgError] = useState(false)
  const hasImg = dish.image_url && !imgError
  const { accent, bgTint } = theme ?? DEFAULT_THEME

  if (variant === 'featured') {
    return (
      <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 cursor-pointer active:scale-[0.97] transition-transform" onClick={onClick}>
        {hasImg ? (
          <div className="w-full aspect-video overflow-hidden bg-gray-100">
            <img src={dish.image_url} alt={dish.name} className="w-full h-full object-cover" onError={() => setImgError(true)} />
          </div>
        ) : (
          <div className="w-full aspect-video flex items-center justify-center" style={{ backgroundColor: bgTint }}>
            <span className="text-5xl opacity-20">🍽️</span>
          </div>
        )}
        <div className="p-4 text-center">
          <h3 className="font-bold text-[#1A1A1A] text-base leading-snug">{dish.name}</h3>
          {dish.description && (
            <p className="text-gray-400 text-sm mt-1.5 leading-relaxed line-clamp-2">{dish.description}</p>
          )}
          <p className="font-bold text-lg mt-2" style={{ color: accent }}>{Number(dish.price).toFixed(2)}€</p>
        </div>
      </div>
    )
  }

  // grid (default)
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 cursor-pointer active:scale-[0.97] transition-transform" onClick={onClick}>
      {hasImg ? (
        <div className="w-full aspect-square overflow-hidden bg-gray-100">
          <img src={dish.image_url} alt={dish.name} className="w-full h-full object-cover" onError={() => setImgError(true)} />
        </div>
      ) : (
        <div className="w-full aspect-square flex items-center justify-center" style={{ backgroundColor: bgTint }}>
          <span className="text-4xl opacity-20">🍽️</span>
        </div>
      )}
      <div className="p-3 text-center">
        <p className="font-bold text-[#1A1A1A] text-base leading-snug line-clamp-2">{dish.name}</p>
        <p className="font-bold text-lg mt-1.5" style={{ color: accent }}>{Number(dish.price).toFixed(2)}€</p>
      </div>
    </div>
  )
}
