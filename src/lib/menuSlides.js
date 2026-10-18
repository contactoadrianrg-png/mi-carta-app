export const MAX_MENU_SLIDES = 6

export function normalizeMenuSlides(value) {
  if (!Array.isArray(value)) return []
  return value.flatMap((slide, index) => {
    if (!slide || typeof slide.image_url !== 'string') return []
    try {
      const url = new URL(slide.image_url)
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return []
      return [{ id: typeof slide.id === 'string' ? slide.id : `slide-${index}`, image_url: url.href, title: typeof slide.title === 'string' ? slide.title.slice(0, 160) : '' }]
    } catch { return [] }
  }).slice(0, MAX_MENU_SLIDES)
}
