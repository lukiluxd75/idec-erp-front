import { ENV } from '@/core/config/env.config'
import { API_ENDPOINTS } from '@/core/config/endpoints.config'
import { ApiError } from '@/core/errors/ApiError'
import { storageService } from '@/core/storage/storageService'

/**
 * Base HTTP client for Backend and Keycloak services.
 * Encapsulates header setup, auth interceptors, silent session refresh, and standard error handling.
 */
class HttpClient {
  constructor(baseUrl = ENV.API_BASE_URL) {
    this.baseUrl = baseUrl
    this._refreshPromise = null
  }

  /**
   * Requests a new access_token using the stored refresh_token.
   * Deduplicates concurrent calls: if a refresh is already in progress, all
   * requests that get a 401 at the same time await the same promise.
   * @returns {Promise<string>} the new access_token
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
   * Performs a generic HTTP request
   * @param {string} endpoint - Relative path or absolute URL
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

    // Inject authentication token
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
        'No se pudo conectar con el servidor backend. Verifique que esté en ejecución.',
        null,
        networkError
      )
    }

    // Binary response (e.g. ZIP/Shapefile download) — do not parse as JSON/text
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

    // Process JSON or text response
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

    // HTTP error handling
    if (!response.ok) {
      // Missing/expired access token: try a silent refresh with the refresh_token and
      // retry the same request once (_isRetry avoids loops). Only if refresh also fails
      // (invalid/expired refresh_token) is the session closed.
      if (response.status === 401 && requiresAuth) {
        if (!_isRetry) {
          return this._retryAfterRefresh(endpoint, options)
        }
        this._handleUnauthorized()
        throw new ApiError('Su sesión expiró. Vuelva a iniciar sesión.', 401, responseData)
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
   * Tries to renew the access_token and retries the original request once.
   * If refresh fails (invalid/expired refresh_token), closes the session.
   */
  async _retryAfterRefresh(endpoint, options) {
    try {
      const newToken = await this._refreshAccessToken()
      return this.request(endpoint, { ...options, token: newToken, _isRetry: true })
    } catch {
      this._handleUnauthorized()
      throw new ApiError('Su sesión expiró. Vuelva a iniciar sesión.', 401)
    }
  }

  /** Clears the invalid session and redirects to Login (when refresh_token also expired). */
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
