import { useEffect, useRef } from 'react'

import { API_ENDPOINTS } from '@/core/config/endpoints.config'
import { ENV } from '@/core/config/env.config'
import { storageService } from '@/core/storage'
import { resolutionsApi } from '../api/resolutions.api'

const RETRY_MS = 3000
const PRESENCE_POLL_MS = 3000

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
 * `onPresenceChange(mobileConnected)` is optional: the caller shows a "phone
 * connected" indicator (see PhoneConnectedBadge) driven by two sources —
 * 1) the `presence` message the backend pushes on this socket whenever another
 *    connection of the SAME account connects/disconnects (instant, but only
 *    reaches this tab when both sockets landed on the same uvicorn worker —
 *    see ResolutionsConnectionManager, per-process registry, `--workers 4` in
 *    production), and
 * 2) a GET .../resolutions/presence poll every PRESENCE_POLL_MS as the
 *    cross-worker-safe fallback (each request is independently load-balanced,
 *    so it catches up within a few polls even when the WS push never arrives).
 * The WS itself stays open the whole time here -- it is NOT torn down to
 * refresh presence (that was tried and both throttles in the browser after a
 * few forced reconnects and drops the `update` channel along with it).
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

  useEffect(() => {
    if (!onPresenceChange) return

    let cancelado = false
    const poll = () => {
      resolutionsApi
        .getPresence()
        .then((res) => {
          if (!cancelado) onPresenceRef.current?.(res.mobile_connected)
        })
        .catch(() => {
          // Silent: a failed poll just skips this cycle, the WS push or the
          // next poll (3s later) will correct the badge.
        })
    }

    poll()
    const timer = setInterval(poll, PRESENCE_POLL_MS)

    return () => {
      cancelado = true
      clearInterval(timer)
    }
  }, [onPresenceChange])
}
