function browserStorage() {
  try { return window.localStorage } catch { return null }
}

export function readMenuFavorites(slug, storage = browserStorage()) {
  try {
    const ids = JSON.parse(storage?.getItem(`messa:favorites:${slug}`) ?? '[]')
    return Array.isArray(ids) ? [...new Set(ids.filter(id => typeof id === 'string'))] : []
  } catch { return [] }
}

export function saveMenuFavorites(slug, ids, storage = browserStorage()) {
  try {
    if (!storage) return false
    storage.setItem(`messa:favorites:${slug}`, JSON.stringify(ids))
    return true
  } catch { return false }
}
