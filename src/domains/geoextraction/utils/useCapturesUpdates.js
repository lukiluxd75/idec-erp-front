import { useEffect, useRef } from 'react'

import { API_ENDPOINTS } from '@/core/config/endpoints.config'
import { ENV } from '@/core/config/env.config'
import { storageService } from '@/core/storage'

const RETRY_MS = 3000

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
 * `onPresenceChange(mobileConnected)` is optional: the backend also pushes a
 * `presence` message whenever another connection of the SAME account
 * connects/disconnects, so the caller can show a "phone connected" indicator
 * (see PhoneConnectedBadge) — see CapturesConnectionManager on the backend.
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
}
