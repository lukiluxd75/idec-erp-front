import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  UserIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/solid'
import { useAuth } from '@/auth/hooks/useAuth'
import { validateLoginForm } from '@/shared/utils/validation.util'
import { Button, Input, Alert } from '@/shared/ui'

const initialValues = {
  username: '',
  password: '',
}

export function LoginForm() {
  const [values, setValues] = useState(initialValues)
  const [touched, setTouched] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [shakeKey, setShakeKey] = useState(0)

  const { login } = useAuth()
  const navigate = useNavigate()

  const errors = validateLoginForm(values)

  function handleChange(field) {
    return (event) => {
      setValues((prev) => ({ ...prev, [field]: event.target.value }))
      if (formError) setFormError('')
    }
  }

  function handleBlur(field) {
    return () => setTouched((prev) => ({ ...prev, [field]: true }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setTouched({ username: true, password: true })

    if (Object.keys(errors).length > 0) {
      setShakeKey((key) => key + 1)
      return
    }

    setSubmitting(true)
    setFormError('')
    setSuccessMessage('')

    try {
      const result = await login({
        username: values.username.trim(),
        password: values.password,
      })
      setSuccessMessage(result.message || 'Autenticación exitosa')

      // Redirigir al dashboard tras confirmación
      setTimeout(() => {
        navigate('/dashboard', { replace: true })
      }, 500)
    } catch (error) {
      setFormError(error?.message || 'Error al autenticar credenciales.')
      setShakeKey((key) => key + 1)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div
        key={shakeKey}
        className={shakeKey ? 'flex flex-col gap-4 animate-field-shake' : 'flex flex-col gap-4'}
      >
        {/* Campo Usuario */}
        <Input
          id="username"
          name="username"
          label="Usuario"
          type="text"
          autoComplete="username"
          value={values.username}
          onChange={handleChange('username')}
          onBlur={handleBlur('username')}
          error={touched.username ? errors.username : undefined}
          icon={UserIcon}
          placeholder="Ej. operador o admin"
        />

        {/* Campo Contraseña */}
        <Input
          id="password"
          name="password"
          label="Contraseña"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          value={values.password}
          onChange={handleChange('password')}
          onBlur={handleBlur('password')}
          error={touched.password ? errors.password : undefined}
          icon={LockClosedIcon}
          placeholder="••••••••"
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
              tabIndex={-1}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
            >
              {showPassword ? (
                <EyeSlashIcon className="h-4 w-4" aria-hidden="true" />
              ) : (
                <EyeIcon className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          }
        />
      </div>

      {/* Alertas de error o éxito */}
      {formError && <Alert type="error" message={formError} />}
      {successMessage && <Alert type="success" message={successMessage} />}

      {/* Botón de Iniciar Sesión */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={submitting}
        icon={ShieldCheckIcon}
        className="mt-1 w-full"
      >
        {submitting ? 'Autenticando…' : 'Iniciar Sesión'}
      </Button>
    </form>
  )
}

export default LoginForm
