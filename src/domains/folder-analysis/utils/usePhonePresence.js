import { useEffect, useRef, useState } from 'react'

import { folderAnalysisApi } from '../api/folderAnalysis.api'

const POLL_MS = 3000

// Cuantas consultas seguidas tienen que fallar antes de apagar el indicador.
//
// Sin esto, un unico timeout o un 502 de paso lo pondria en gris aunque el
// celular siga ahi, que es justo el parpadeo que este modulo tenia que evitar.
// Con 3 fallos a 3s, hacen falta ~9s de problemas reales de red para que se
// apague, y una consulta buena reinicia la cuenta.
const FAILURES_BEFORE_DISCONNECT = 3

/**
 * Mantiene el estado de "Celular conectado" de este modulo (ver
 * PhoneConnectedBadge).
 *
 * A diferencia de geoextraccion y resoluciones, aqui no hay websocket: el
 * contrato con la app movil (docs/FOLDER_ANALYSIS_API_MOVIL.md) es un
 * `POST /captures` y nada mas, asi que la presencia se deriva de esa actividad
 * y se lee por REST. El backend la guarda en Postgres, de modo que la respuesta
 * no depende de que worker atienda la consulta -- la version por proceso hacia
 * que 3 de cada 4 consultas dijeran "no conectado".
 *
 * Devuelve `{ connected }`. Empieza en `false` y nunca en `null`: el indicador
 * se muestra siempre, encendido o apagado, y no debe aparecer a medio camino.
 */
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
          // Por debajo del umbral se conserva el ultimo estado conocido: un
          // bache de red no es una desconexion del celular.
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
