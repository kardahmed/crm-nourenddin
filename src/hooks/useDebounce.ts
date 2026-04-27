import { useEffect, useState } from 'react'

/**
 * Returns a value that updates `delay` ms after the last change. Lets search
 * inputs drive a single state but feed downstream filters/queries with a
 * stable value, so we don't refilter or refetch on every keystroke.
 */
export function useDebounce<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(id)
  }, [value, delay])
  return debounced
}
