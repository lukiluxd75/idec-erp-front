import { useEffect, useRef } from 'react'

import { API_ENDPOINTS } from '@/core/config/endpoints.config'
import { ENV } from '@/core/config/env.config'
import { storageService } from '@/core/storage'

const RETRY_MS = 3000

function wsUrl() {
  const token = storageService.getToken()
  if (!token) return null
  const base = ENV.API_BASE_URL.replace(/^http/, 'ws')
  return `${base}${API_ENDPOINTS.RESOLUTIONS.BASE}/ws?token=${encodeURIComponent(token)}`
}

/**
 * Connects to the Resolutions websocket and calls `onUpdate` whenever the
 * backend reports a change (someone uploaded/edited/deleted a resolution, from
 * phone or another tab) -- replaces the manual "Actualizar" button.
 *
 * `onPresenceChange(mobileConnected)` is optional: the backend also pushes a
 * `presence` message whenever another connection of the SAME account
 * connects/disconnects, so the caller can show a "phone connected" indicator
 * (see PhoneConnectedBadge) — see ResolutionsConnectionManager on the backend.
 *
 * Reconnects with a fixed delay on any drop (expired token, backend restart,
 * network): exponential backoff is unnecessary at this scale.
 */
export function useResolutionsUpdates(onUpdate, onPresenceChange) {
  const onUpdateRef = useRef(onUpdate)
  const onPresenceRef = useRef(onPresenceChange)
  useEffect(() => {
    onUpdateRef.current = onUpdate
    onPresenceRef.current = onPresenceChange
  })

  useEffect(() => {
    let ws
    let cerrado = false
    let reintentoTimer

    const conectar = () => {
      const url = wsUrl()
      if (!url) return
      ws = new WebSocket(url)
      ws.onmessage = (event) => {
        let msg
        try {
          msg = JSON.parse(event.data)
        } catch {
          return
        }
        if (msg.type === 'update') onUpdateRef.current()
        else if (msg.type === 'presence') onPresenceRef.current?.(msg.mobile_connected)
      }
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
