export const DELIVERY_PLATFORMS = [
  { key: 'delivery_glovo_url', label: 'Glovo', placeholder: 'https://glovoapp.com/…' },
  { key: 'delivery_uber_eats_url', label: 'Uber Eats', placeholder: 'https://www.ubereats.com/…' },
  { key: 'delivery_just_eat_url', label: 'Just Eat', placeholder: 'https://www.just-eat.es/…' },
  { key: 'delivery_custom_url', label: 'Pedir online', fieldLabel: 'Web de pedidos propia', placeholder: 'https://pedidos.tu-restaurante.com/…' },
]

export function deliveryUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const url = new URL(value.trim())
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null
    return url.href
  } catch {
    return null
  }
}

export function getDeliveryLinks(restaurant) {
  return DELIVERY_PLATFORMS.flatMap(platform => {
    const href = deliveryUrl(restaurant?.[platform.key])
    return href ? [{ ...platform, href }] : []
  })
}
