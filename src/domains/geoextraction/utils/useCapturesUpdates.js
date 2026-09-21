import { useEffect, useRef } from 'react'

import { API_ENDPOINTS } from '@/core/config/endpoints.config'
import { ENV } from '@/core/config/env.config'
import { storageService } from '@/core/storage'
import { geoextractionApi } from '../api/geoextraction.api'

const RETRY_MS = 3000
const PRESENCE_POLL_MS = 3000

function wsUrl() {
  const token = storageService.getToken()
  if (!token) return null
  const base = ENV.API_BASE_URL.replace(/^http/, 'ws')
  return `${base}${API_ENDPOINTS.GEOEXTRACTION.CAPTURES_WS}?token=${encodeURIComponent(token)}`
}

/**
 * Connects to the Captures websocket and calls `onUpdate` whenever the backend
 * reports a change (new photo from the phone, or one was discarded) — avoids
 * manual refresh or sole reliance on polling. Pattern matches useResolutionsUpdates.
 *
 * `onPresenceChange(mobileConnected)` is optional: the caller shows a "phone
 * connected" indicator (see PhoneConnectedBadge) driven by two sources —
 * 1) the `presence` message the backend pushes on this socket whenever another
 *    connection of the SAME account connects/disconnects (instant, but only
 *    reaches this tab when both sockets landed on the same uvicorn worker —
 *    see CapturesConnectionManager, per-process registry, `--workers 4` in
 *    production), and
 * 2) a GET .../captures/presence poll every PRESENCE_POLL_MS as the
 *    cross-worker-safe fallback (each request is independently load-balanced,
 *    so it catches up within a few polls even when the WS push never arrives).
 * The WS itself stays open the whole time here -- it is NOT torn down to
 * refresh presence (that was tried and both throttles in the browser after a
 * few forced reconnects and drops the `update` channel along with it).
 *
 * Reconnects with a fixed delay on any drop (expired token, backend restart,
 * network): exponential backoff is unnecessary at this scale.
 */
export function useCapturesUpdates(onUpdate, onPresenceChange) {
  const onUpdateRef = useRef(onUpdate)
  const onPresenceRef = useRef(onPresenceChange)
  useEffect(() => {
    onUpdateRef.current = onUpdate
    onPresenceRef.current = onPresenceChange
  })

  useEffect(() => {
    let ws
    let closed = false
    let retryTimer

    const connect = () => {
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
        if (closed) return
        retryTimer = setTimeout(connect, RETRY_MS)
      }
      ws.onerror = () => ws.close()
    }

    connect()

    return () => {
      closed = true
      clearTimeout(retryTimer)
      ws?.close()
    }
  }, [])

  useEffect(() => {
    if (!onPresenceChange) return

    let cancelled = false
    const poll = () => {
      geoextractionApi
        .getPresence()
        .then((res) => {
          if (!cancelled) onPresenceRef.current?.(res.mobile_connected)
        })
        .catch(() => {
          // Silent: a failed poll just skips this cycle, the WS push or the
          // next poll (3s later) will correct the badge.
        })
    }

    poll()
    const timer = setInterval(poll, PRESENCE_POLL_MS)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [onPresenceChange])
}
