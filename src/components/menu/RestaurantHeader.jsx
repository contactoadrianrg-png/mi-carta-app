import { useState } from 'react'
import { Heart, UtensilsCrossed } from 'lucide-react'

export default function RestaurantHeader({ restaurant, showFavorites = false, favoriteCount = 0, onToggleFavorites }) {
  const [failedLogo, setFailedLogo] = useState(null)
  const logo = restaurant?.logo_url && restaurant.logo_url !== failedLogo ? restaurant.logo_url : null

  return (
    <header className="messa-restaurant-header">
      <div className="messa-restaurant-identity">
        <span className="messa-restaurant-logo">
          {logo ? <img src={logo} alt="" onError={() => setFailedLogo(logo)} /> : <UtensilsCrossed size={25} aria-hidden="true" />}
        </span>
        <div className="messa-restaurant-name"><p>BIENVENIDO A NUESTRA MESA</p><h1>{restaurant?.name}</h1>{restaurant?.description && <span>{restaurant.description}</span>}</div>
        {onToggleFavorites && <button type="button" onClick={onToggleFavorites} aria-pressed={showFavorites} aria-label={showFavorites ? 'Ver toda la carta' : 'Ver favoritos'} className="messa-menu-favorites"><Heart size={20} fill={showFavorites ? 'currentColor' : 'none'} /><span>{favoriteCount}</span></button>}
      </div>
    </header>
  )
}
