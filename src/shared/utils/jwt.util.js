import { ENV } from '@/core/config/env.config'

/**
 * Decodifica de forma segura el payload de un token JWT
 * @param {string} token
 * @returns {object|null}
 */
export function parseJwt(token) {
  if (!token || typeof token !== 'string') return null
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

/**
 * Verifica si un token JWT ha expirado
 * @param {string} token
 * @returns {boolean}
 */
export function isTokenExpired(token) {
  const payload = parseJwt(token)
  if (!payload || !payload.exp) return true
  const now = Math.floor(Date.now() / 1000)
  return payload.exp < now
}

/**
 * Extrae la información normalizada de usuario a partir del token JWT
 * @param {string} token
 * @param {string} [fallbackUsername]
 * @returns {object|null}
 */
export function extractUserFromToken(token, fallbackUsername = 'Usuario') {
  if (!token) return null
  const payload = parseJwt(token)
  if (!payload) return null

  return {
    username: payload.preferred_username || payload.username || fallbackUsername || 'Usuario',
    email: payload.email || '',
    roles: payload.realm_access?.roles || [],
    clientId: payload.azp || payload.clientId || ENV.DEFAULT_CLIENT_ID,
  }
}
