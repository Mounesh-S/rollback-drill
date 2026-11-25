import { useEffect, useLayoutEffect, useRef } from 'react'

/** Calls onLeave whenever the page becomes hidden while `active` is true. */
export function useTabLeave(active: boolean, onLeave: () => void): void {
  const leave = useRef(onLeave)
  useLayoutEffect(() => {
    leave.current = onLeave
  })

  useEffect(() => {
    if (!active) return
    const handler = () => {
      if (document.visibilityState === 'hidden') leave.current()
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [active])
}
