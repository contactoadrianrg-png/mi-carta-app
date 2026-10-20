import { useState } from 'react'
import { ArrowUpRight, UtensilsCrossed, Clock3 } from 'lucide-react'
import DishDetailSheet from './DishDetailSheet'
import { DAILY_MENU_SECTIONS } from '../../lib/dailyMenu'
import { accentOnWhite } from '../../lib/menuContrast'

export function DailyMenuCard({ menu, onOpen }) {
  const [failedImage, setFailedImage] = useState(null)
  return <button type="button" className="messa-daily-card" aria-label={`Ver ${menu.title}`} onClick={onOpen}>
    <span className="messa-daily-card-image">{menu.image_url && menu.image_url !== failedImage ? <img src={menu.image_url} alt="" onError={() => setFailedImage(menu.image_url)} /> : <UtensilsCrossed size={28} />}</span>
    <span className="messa-daily-card-copy"><span className="messa-daily-eyebrow">HOY EN NUESTRA MESA</span><strong>{menu.title}</strong><span>{menu.includes || 'Consulta los platos a elegir'}</span><b>{menu.price.toFixed(2)} € <small>menú completo</small></b></span><ArrowUpRight size={22} />
  </button>
}
export function DailyMenuSheet({ menu, onClose, theme }) {
  const dish = { name: menu.title, image_url: menu.image_url, price: menu.price, description: menu.description }
  return <DishDetailSheet dish={dish} onClose={onClose} theme={theme} priceLabel="Menú completo">
    <div className="messa-daily-sections">
      {menu.availability && <p className="messa-daily-availability"><Clock3 size={16} />{menu.availability}</p>}
      {DAILY_MENU_SECTIONS.filter(({ key }) => menu[key].length).map(({ key, label, hint }) => <section key={key} aria-labelledby={`daily-${key}`}><div className="messa-daily-section-heading"><h3 id={`daily-${key}`}>{label}</h3><span>{hint}</span></div><ul>{menu[key].map((name, index) => <li key={`${index}-${name}`}><span style={{ background: accentOnWhite(theme?.accent || '#FF6B35') }} />{name}</li>)}</ul></section>)}
      {menu.includes && <section className="messa-daily-includes"><h3>El menú incluye</h3><p>{menu.includes}</p></section>}
    </div>
  </DishDetailSheet>
}
