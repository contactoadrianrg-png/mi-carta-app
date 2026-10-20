import { useState } from 'react'
import { ArrowUpRight, Heart, UtensilsCrossed } from 'lucide-react'

export default function DishGridCard({ dish, theme, onClick, isFavorite = false }) {
  const [failedImage, setFailedImage] = useState(null)
  const img = dish?.image_url && dish.image_url !== failedImage ? dish.image_url : null
  const hasOffer = Number(dish?.original_price) > Number(dish?.price)
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} className="messa-dish-card flex flex-col" style={{ '--menu-accent': theme?.accent ?? '#FF6B35' }}>
      <div className="messa-dish-card-image">
        {img ? <img src={img} alt="" loading="lazy" onError={() => setFailedImage(img)} /> : <div className="messa-dish-no-photo"><UtensilsCrossed size={30} aria-hidden="true" /><span>Preparado en nuestra cocina</span></div>}
        {(hasOffer || dish?.best_seller) && <span className="messa-dish-label">{hasOffer ? 'En oferta' : 'Más vendido'}</span>}
        <span className={`messa-dish-heart ${isFavorite ? 'is-favorite' : ''}`} aria-hidden="true"><Heart size={17} fill={isFavorite ? 'currentColor' : 'none'} /></span>
      </div>
      <div className="messa-dish-card-copy"><h3>{dish?.name}</h3>{dish?.description?.trim() && <p>{dish.description}</p>}<div className="messa-dish-card-bottom"><div><strong>{Number(dish?.price ?? 0).toFixed(2)}€</strong>{hasOffer && <del>{Number(dish.original_price).toFixed(2)}€</del>}</div><ArrowUpRight size={16} aria-hidden="true" /></div></div>
    </Tag>
  )
}
