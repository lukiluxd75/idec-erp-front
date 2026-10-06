import { useEffect, useRef, useState } from 'react'

import { API_ENDPOINTS } from '@/core/config/endpoints.config'
import { ENV } from '@/core/config/env.config'
import { storageService } from '@/core/storage'
import { resolutionsApi } from '../api/resolutions.api'

const RETRY_MS = 3000
const PRESENCE_POLL_MS = 3000
const FALLBACK_POLL_MS = 4000

function wsUrl() {
  const token = storageService.getToken()
  if (!token) return null
  const base = ENV.API_BASE_URL.replace(/^http/, 'ws')
  return `${base}${API_ENDPOINTS.RESOLUTIONS.BASE}/ws?token=${encodeURIComponent(token)}`
}

export function useResolutionsUpdates(onUpdate, onPresenceChange) {
  const onUpdateRef = useRef(onUpdate)
  const onPresenceRef = useRef(onPresenceChange)
  const [fallbackMode, setFallbackMode] = useState(false)
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
      ws.onopen = () => setFallbackMode(false)
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
      ws.onclose = (event) => {
        if (!event.wasClean) setFallbackMode(true)
        if (cerrado) return
        reintentoTimer = setTimeout(conectar, RETRY_MS)
      }
      ws.onerror = () => {
        setFallbackMode(true)
        ws.close()
      }
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
          // Silent: a failed poll just skips this cycle, the WS push or the next poll (3s later) will correct the badge.
        })
    }

    poll()
    const timer = setInterval(poll, PRESENCE_POLL_MS)

    return () => {
      cancelado = true
      clearInterval(timer)
    }
  }, [onPresenceChange])

  useEffect(() => {
    if (!fallbackMode) return

    const interval = setInterval(() => onUpdateRef.current(), FALLBACK_POLL_MS)
    return () => clearInterval(interval)
  }, [fallbackMode])

  return { fallbackMode }
}
