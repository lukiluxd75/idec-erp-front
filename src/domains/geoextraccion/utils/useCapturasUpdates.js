import { useEffect, useRef } from 'react'

import { API_ENDPOINTS } from '@/core/config/endpoints.config'
import { ENV } from '@/core/config/env.config'
import { storageService } from '@/core/storage/storageService'

const RETRY_MS = 3000

function wsUrl() {
  const token = storageService.getToken()
  if (!token) return null
  const base = ENV.API_BASE_URL.replace(/^http/, 'ws')
  return `${base}${API_ENDPOINTS.GEOEXTRACCION.CAPTURAS_WS}?token=${encodeURIComponent(token)}`
}

/**
 * Conecta al websocket de Capturas y llama `onUpdate` cada vez que el backend avisa
 * un cambio (llegó una foto nueva desde el celular, o se descartó una) — evita tener
 * que refrescar a mano o hacer polling. Calco de useResolucionesUpdates.js.
 *
 * Reconecta con un delay fijo ante cualquier corte (token vencido, backend
 * reiniciado, red): no hace falta backoff exponencial para esta escala.
 */
export function useCapturasUpdates(onUpdate) {
  const onUpdateRef = useRef(onUpdate)
  useEffect(() => {
    onUpdateRef.current = onUpdate
  })

  useEffect(() => {
    let ws
    let cerrado = false
    let reintentoTimer

    const conectar = () => {
      const url = wsUrl()
      if (!url) return
      ws = new WebSocket(url)
      ws.onmessage = () => onUpdateRef.current()
      ws.onclose = () => {
        if (cerrado) return
        reintentoTimer = setTimeout(conectar, RETRY_MS)
      }
      ws.onerror = () => ws.close()
    }

    conectar()

    return () => {
      cerrado = true
      clearTimeout(reintentoTimer)
      ws?.close()
    }
  }, [])
}
