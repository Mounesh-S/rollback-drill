import { useEffect, useLayoutEffect, useRef } from 'react'

/**
 * Calls onLeave when the page is hidden or the window loses focus while `active` is true.
 * Blur also catches a second window placed side by side, which never hides this one.
 */
export function useTabLeave(active: boolean, onLeave: () => void): void {
  const leave = useRef(onLeave)
  useLayoutEffect(() => {
    leave.current = onLeave
  })

  useEffect(() => {
    if (!active) return
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') leave.current()
    }
    const onBlur = () => leave.current()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', onBlur)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', onBlur)
    }
  }, [active])
}
