/**
 * Clase personalizada para encapsular y estandarizar errores provenientes de la capa de servicios HTTP
 */
export class ApiError extends Error {
  constructor(message, status = null, data = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }

  get isUnauthorized() {
    return this.status === 401
  }

  get isForbidden() {
    return this.status === 403
  }

  get isNotFound() {
    return this.status === 404
  }

  get isServerError() {
    return this.status !== null && this.status >= 500
  }
}
