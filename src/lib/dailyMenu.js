export const DAILY_MENU_SECTIONS = [
  { key: 'firsts', label: 'Primeros', hint: 'Un primero a elegir' },
  { key: 'seconds', label: 'Segundos', hint: 'Un segundo a elegir' },
  { key: 'desserts', label: 'Postres', hint: 'Un postre a elegir' },
]
export function emptyDailyMenu() {
  return { enabled: false, title: 'Menú del día', description: '', price: null, image_url: '', firsts: [], seconds: [], desserts: [], includes: '', availability: '' }
}
export function normalizeDailyMenu(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.enabled !== 'boolean') return null
  const limits = { title: 80, description: 400, image_url: 2048, includes: 200, availability: 160 }
  const menu = { enabled: value.enabled }
  for (const [key, limit] of Object.entries(limits)) {
    if (typeof value[key] !== 'string' || value[key].length > limit) return null
    menu[key] = value[key].trim()
  }
  if (!menu.title) return null
  if (menu.image_url) {
    try { const url = new URL(menu.image_url); if (!['http:', 'https:'].includes(url.protocol)) return null; menu.image_url = url.href }
    catch { return null }
  }
  if (value.price !== null && (typeof value.price !== 'number' || !Number.isFinite(value.price) || value.price < 0 || value.price > 99999.99 || Math.abs(value.price * 100 - Math.round(value.price * 100)) > 0.00001)) return null
  menu.price = value.price
  for (const { key } of DAILY_MENU_SECTIONS) {
    if (!Array.isArray(value[key]) || value[key].length > 10 || value[key].some(item => typeof item !== 'string' || !item.trim() || item.length > 160)) return null
    menu[key] = value[key].map(item => item.trim())
  }
  if (menu.enabled && (menu.price === null || menu.firsts.length + menu.seconds.length === 0)) return null
  return menu
}
export function dailyMenuFromForm(form) {
  const menu = { ...form, title: form.title.trim() || 'Menú del día', price: String(form.price).trim() === '' ? null : Number(String(form.price).replace(',', '.')) }
  for (const { key, label } of DAILY_MENU_SECTIONS) {
    menu[key] = form[key].split('\n').map(item => item.trim()).filter(Boolean)
    if (menu[key].length > 10 || menu[key].some(item => item.length > 160)) throw new Error(`${label}: añade hasta 10 platos, de un máximo de 160 caracteres cada uno.`)
  }
  if (menu.enabled && menu.price === null) throw new Error('Añade el precio del menú completo antes de mostrarlo.')
  if (menu.enabled && menu.firsts.length + menu.seconds.length === 0) throw new Error('Añade al menos un primero o un segundo antes de mostrar el menú.')
  const result = normalizeDailyMenu(menu)
  if (!result) throw new Error('Revisa los campos y el precio: debe ser válido y tener como máximo dos decimales.')
  return result
}
export function dailyMenuToForm(value) {
  const menu = normalizeDailyMenu(value) || emptyDailyMenu()
  const form = { ...menu, price: menu.price === null ? '' : String(menu.price) }
  for (const { key } of DAILY_MENU_SECTIONS) form[key] = menu[key].join('\n')
  return form
}
