import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

// Keep in-page screens in browser history without creating extra URLs.
export function useScreenNavigation(key, defaults) {
  const location = useLocation()
  const navigate = useNavigate()
  const screen = { ...defaults, ...location.state?.[key] }
  const open = useCallback((changes, replace = false) => {
    const current = { ...defaults, ...location.state?.[key] }
    const next = { ...current, ...changes }
    if (JSON.stringify(current) === JSON.stringify(next)) return
    navigate(location.pathname + location.search + location.hash, {
      replace,
      state: { ...location.state, [key]: next, [`${key}Previous`]: replace ? location.state?.[`${key}Previous`] : location.key },
    })
  }, [defaults, key, location, navigate])
  const back = useCallback((fallback) => {
    if (location.state?.[`${key}Previous`]) navigate(-1)
    else open(fallback, true)
  }, [key, location.state, navigate, open])
  return [screen, open, back]
}
