import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * Milliseconds left in a round. Calls onExpire exactly once when time runs out.
 * Derived from the clock on every tick, so a throttled background tab cannot drift.
 */
export function useCountdown(startedAt: number | null, totalMs: number, clock: () => number, onExpire: () => void): number {
  const [left, setLeft] = useState(totalMs)
  const expire = useRef(onExpire)
  useLayoutEffect(() => {
    expire.current = onExpire
  })

  useEffect(() => {
    if (startedAt === null) return
    let fired = false
    const tick = () => {
      const remaining = Math.max(0, totalMs - (clock() - startedAt))
      setLeft(remaining)
      if (remaining === 0 && !fired) {
        fired = true
        expire.current()
      }
    }
    tick()
    const id = setInterval(tick, 200)
    return () => clearInterval(id)
  }, [startedAt, totalMs, clock])

  return left
}
