import { useEffect, useRef, useState } from 'react'

import { folderAnalysisApi } from '../api/folderAnalysis.api'

const POLL_MS = 3000

// Cuantas consultas seguidas tienen que fallar antes de apagar el indicador.
const FAILURES_BEFORE_DISCONNECT = 3

/** Mantiene el estado de "Celular conectado" de este modulo (ver PhoneConnectedBadge). */
export function usePhonePresence(active = true) {
  const [connected, setConnected] = useState(false)
  const failuresRef = useRef(0)

  useEffect(() => {
    if (!active) return undefined

    let cancelled = false

    const poll = () => {
      folderAnalysisApi
        .presence()
        .then((res) => {
          if (cancelled) return
          failuresRef.current = 0
          setConnected(Boolean(res?.mobile_connected))
        })
        .catch(() => {
          if (cancelled) return
          failuresRef.current += 1
          // Por debajo del umbral se conserva el ultimo estado conocido: un bache de red no es una desconexion del celular.
          if (failuresRef.current >= FAILURES_BEFORE_DISCONNECT) setConnected(false)
        })
    }

    poll()
    const timer = setInterval(poll, POLL_MS)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [active])

  return { connected }
}

export default usePhonePresence
