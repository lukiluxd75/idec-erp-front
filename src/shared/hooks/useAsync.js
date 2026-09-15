import { useState, useCallback } from 'react'

/**
 * Reusable hook to run async services with state handling
 * @param {Function} asyncFunction - Async function to run
 * @param {boolean} [immediate=false] - Si debe ejecutarse de inmediato
 */
export function useAsync(asyncFunction, immediate = false) {
  const [status, setStatus] = useState(immediate ? 'pending' : 'idle')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const execute = useCallback(
    async (...args) => {
      setStatus('pending')
      setError(null)
      try {
        const response = await asyncFunction(...args)
        setData(response)
        setStatus('success')
        return response
      } catch (err) {
        setError(err?.message || 'Ocurrió un error inesperado')
        setStatus('error')
        throw err
      }
    },
    [asyncFunction]
  )

  return {
    execute,
    status,
    data,
    error,
    isLoading: status === 'pending',
    isSuccess: status === 'success',
    isError: status === 'error',
    isIdle: status === 'idle',
    setData,
    setError,
  }
}

export default useAsync
