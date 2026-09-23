import { useEffect, useRef } from 'react'

import { API_ENDPOINTS } from '@/core/config/endpoints.config'
import { ENV } from '@/core/config/env.config'
import { storageService } from '@/core/storage'

const RETRY_MS = 3000

function wsUrl() {
  const token = storageService.getToken()
  if (!token) return null
  const base = ENV.API_BASE_URL.replace(/^http/, 'ws')
  return `${base}${API_ENDPOINTS.FOLIOS.BASE}/ws?token=${encodeURIComponent(token)}`
}

/**
 * Calls `onUpdate` whenever the backend reports a change on folios (new scan
 * from the phone, extraction finished, review saved) -- same pattern as
 * useResolutionsUpdates. Reconnects with a fixed delay on any drop.
 */
export function useFoliosUpdates(onUpdate) {
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

/**
 * Backup for the websocket while something is still being extracted: with
 * several backend workers the "done" ping may go out on another worker's socket
 * (see FoliosConnectionManager), so poll every few seconds until it settles.
 */
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
