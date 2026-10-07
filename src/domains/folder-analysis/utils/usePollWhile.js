import { useEffect, useRef } from 'react'

/** Calls `onTick` every `intervalMs` while `active`. */
export function usePollWhile(active, onTick, intervalMs = 5000) {
  const onTickRef = useRef(onTick)
  useEffect(() => {
    onTickRef.current = onTick
  })

  useEffect(() => {
    if (!active) return undefined
    const timer = setInterval(() => onTickRef.current(), intervalMs)
    return () => clearInterval(timer)
  }, [active, intervalMs])
}
