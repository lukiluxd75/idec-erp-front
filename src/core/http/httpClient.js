import { ENV } from '@/core/config/env.config'
import { API_ENDPOINTS } from '@/core/config/endpoints.config'
import { ApiError } from '@/core/errors/ApiError'
import { storageService } from '@/core/storage/storageService'

/**
 * Cliente HTTP base para comunicación con servicios Backend y Keycloak
 * Encapsula la configuración de cabeceras, interceptores de autenticación, refresh silencioso de sesión y manejo estándar de errores
 */
class HttpClient {
  constructor(baseUrl = ENV.API_BASE_URL) {
    this.baseUrl = baseUrl
    this._refreshPromise = null
  }

  /**
   * Solicita un nuevo access_token con el refresh_token almacenado.
   * Deduplica llamadas concurrentes: si ya hay un refresh en curso, todas las
   * peticiones que reciben un 401 al mismo tiempo esperan la misma promesa.
   * @returns {Promise<string>} el nuevo access_token
   */
  _refreshAccessToken() {
    if (!this._refreshPromise) {
      this._refreshPromise = this._doRefresh().finally(() => {
        this._refreshPromise = null
      })
    }
    return this._refreshPromise
  }

  async _doRefresh() {
    const refreshToken = storageService.getRefreshToken()
    if (!refreshToken) {
      throw new Error('No hay refresh_token disponible.')
    }

    const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.AUTH.REFRESH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    if (!response.ok) {
      throw new Error('No se pudo renovar la sesión.')
    }

    const data = await response.json()
    if (!data.access_token) {
      throw new Error('Respuesta de renovación sin access_token.')
    }

    storageService.setToken(data.access_token)
    if (data.refresh_token) {
      storageService.setRefreshToken(data.refresh_token)
    }
    return data.access_token
  }

  /**
   * Realiza una petición HTTP genérica
   * @param {string} endpoint - Ruta relativa o URL absoluta
   * @param {RequestInit & { requiresAuth?: boolean, token?: string, _isRetry?: boolean }} [options]
   * @returns {Promise<any>}
   */
  async request(endpoint, options = {}) {
    const { requiresAuth = true, token, headers = {}, body, responseType, _isRetry = false, ...customConfig } = options

    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`

    const requestHeaders = new Headers(headers)

    if (!requestHeaders.has('Content-Type') && !(body instanceof FormData)) {
      requestHeaders.set('Content-Type', 'application/json')
    }

    // Inyección de token de autenticación
    if (requiresAuth) {
      const authToken = token || storageService.getToken()
      if (authToken) {
        requestHeaders.set('Authorization', `Bearer ${authToken}`)
      }
    }

    const config = {
      ...customConfig,
      headers: requestHeaders,
    }

    if (body !== undefined) {
      config.body = typeof body === 'object' && !(body instanceof FormData) ? JSON.stringify(body) : body
    }

    let response
    try {
      response = await fetch(url, config)
    } catch (networkError) {
      throw new ApiError(
        'No se pudo conectar con el servidor backend. Verifica que esté en ejecución.',
        null,
        networkError
      )
    }

    // Respuesta binaria (ej. descarga de un ZIP/Shapefile) — no se intenta parsear como JSON/texto
    if (responseType === 'blob') {
      if (!response.ok) {
        if (response.status === 401 && requiresAuth && !_isRetry) {
          return this._retryAfterRefresh(endpoint, options)
        }
        if (response.status === 401 && requiresAuth) this._handleUnauthorized()
        throw new ApiError(`Error en la petición: ${response.status} ${response.statusText}`, response.status)
      }
      return response.blob()
    }

    // Procesar respuesta JSON o texto
    let responseData
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      try {
        responseData = await response.json()
      } catch {
        responseData = null
      }
    } else {
      try {
        responseData = await response.text()
      } catch {
        responseData = null
      }
    }

    // Manejo de errores HTTP
    if (!response.ok) {
      // Access token ausente/expirado: se intenta una renovación silenciosa con el
      // refresh_token y se reintenta la misma petición una sola vez (_isRetry evita loops).
      // Solo si el refresh también falla (refresh_token inválido/expirado) se cierra la sesión.
      if (response.status === 401 && requiresAuth) {
        if (!_isRetry) {
          return this._retryAfterRefresh(endpoint, options)
        }
        this._handleUnauthorized()
        throw new ApiError('Tu sesión expiró. Vuelve a iniciar sesión.', 401, responseData)
      }

      const errorMessage =
        (typeof responseData === 'object' && (responseData?.detail || responseData?.message)) ||
        (typeof responseData === 'string' && responseData) ||
        `Error en la petición: ${response.status} ${response.statusText}`

      throw new ApiError(errorMessage, response.status, responseData)
    }

    return responseData
  }

  /**
   * Intenta renovar el access_token y reintenta la petición original una vez.
   * Si el refresh falla (refresh_token inválido/expirado), cierra la sesión.
   */
  async _retryAfterRefresh(endpoint, options) {
    try {
      const newToken = await this._refreshAccessToken()
      return this.request(endpoint, { ...options, token: newToken, _isRetry: true })
    } catch {
      this._handleUnauthorized()
      throw new ApiError('Tu sesión expiró. Vuelve a iniciar sesión.', 401)
    }
  }

  /** Limpia la sesión inválida y redirige a Login (cuando el refresh_token también expiró). */
  _handleUnauthorized() {
    storageService.clearAuth()
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.location.href = '/'
    }
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' })
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body })
  }

  put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body })
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' })
  }
}

export const httpClient = new HttpClient()
export { HttpClient }
