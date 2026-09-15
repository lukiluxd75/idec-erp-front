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
 * Reconnects with a fixed delay on any drop (expired token, backend restart,
 * network): exponential backoff is unnecessary at this scale.
 */
export function useCapturesUpdates(onUpdate) {
  const onUpdateRef = useRef(onUpdate)
  useEffect(() => {
    onUpdateRef.current = onUpdate
  })

  useEffect(() => {
    let ws
    let closed = false
    let retryTimer

    const connect = () => {
      const url = wsUrl()
      if (!url) return
      ws = new WebSocket(url)
      ws.onmessage = () => onUpdateRef.current()
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
