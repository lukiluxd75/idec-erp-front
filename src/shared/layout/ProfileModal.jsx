import { useState } from 'react'
import { UserIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/solid'
import { KeyRound } from 'lucide-react'
import { Modal, Button, Input, Alert } from '@/shared/ui'
import { validateChangePasswordForm } from '@/shared/utils/validation.util'
import { userService } from '@/auth/services/user.service'

const initialPasswordValues = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

/** Profile modal: authenticated user data + password change (POST /api/change-password-institutional, directorio Zentyal). */
export function ProfileModal({ open, onClose, user }) {
  const [showForm, setShowForm] = useState(false)
  const [values, setValues] = useState(initialPasswordValues)
  const [touched, setTouched] = useState({})
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const errors = validateChangePasswordForm(values)

  function handleClose() {
    setShowForm(false)
    setValues(initialPasswordValues)
    setTouched({})
    setFormError('')
    setSuccessMessage('')
    onClose?.()
  }

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
    setTouched({ currentPassword: true, newPassword: true, confirmPassword: true })
    if (Object.keys(errors).length > 0) return

    if (!user?.username) {
      setFormError('No se pudo determinar el usuario de la sesión. Vuelva a iniciar sesión e intente de nuevo.')
      return
    }

    setSubmitting(true)
    setFormError('')
    setSuccessMessage('')
    try {
      await userService.changeInstitutionalPassword({
        username: user.username,
        newPassword: values.newPassword,
      })
      setSuccessMessage('Contraseña actualizada correctamente.')
      setValues(initialPasswordValues)
      setTouched({})
    } catch (error) {
      setFormError(error?.message || 'No se pudo cambiar la contraseña.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Perfil" icon={UserIcon}>
      <div className="flex items-center gap-3 rounded-2xl border border-white/50 bg-white/40 p-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-800 text-white">
          <UserIcon className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">{user?.username || 'Usuario'}</p>
          {user?.email && <p className="truncate text-xs text-slate-500">{user.email}</p>}
        </div>
      </div>

      <div className="mt-5 border-t border-white/40 pt-5">
        {!showForm ? (
          <Button variant="secondary" size="md" icon={KeyRound} onClick={() => setShowForm(true)} className="w-full">
            Cambiar contraseña
          </Button>
        ) : (
          <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              id="currentPassword"
              name="currentPassword"
              label="Contraseña actual"
              type={showCurrent ? 'text' : 'password'}
              autoComplete="current-password"
              value={values.currentPassword}
              onChange={handleChange('currentPassword')}
              onBlur={handleBlur('currentPassword')}
              error={touched.currentPassword ? errors.currentPassword : undefined}
              icon={LockClosedIcon}
              placeholder="••••••••"
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowCurrent((prev) => !prev)}
                  className="cursor-pointer text-slate-400 hover:text-slate-600 focus:outline-none"
                  tabIndex={-1}
                  aria-label={showCurrent ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showCurrent ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              }
            />

            <Input
              id="newPassword"
              name="newPassword"
              label="Nueva contraseña"
              type={showNew ? 'text' : 'password'}
              autoComplete="new-password"
              value={values.newPassword}
              onChange={handleChange('newPassword')}
              onBlur={handleBlur('newPassword')}
              error={touched.newPassword ? errors.newPassword : undefined}
              icon={LockClosedIcon}
              placeholder="Mínimo 8 caracteres"
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowNew((prev) => !prev)}
                  className="cursor-pointer text-slate-400 hover:text-slate-600 focus:outline-none"
                  tabIndex={-1}
                  aria-label={showNew ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showNew ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              }
            />

            <Input
              id="confirmPassword"
              name="confirmPassword"
              label="Confirmar nueva contraseña"
              type={showNew ? 'text' : 'password'}
              autoComplete="new-password"
              value={values.confirmPassword}
              onChange={handleChange('confirmPassword')}
              onBlur={handleBlur('confirmPassword')}
              error={touched.confirmPassword ? errors.confirmPassword : undefined}
              icon={LockClosedIcon}
              placeholder="Repita la nueva contraseña"
            />

            {formError && <Alert type="error" message={formError} />}
            {successMessage && <Alert type="success" message={successMessage} />}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => {
                  setShowForm(false)
                  setValues(initialPasswordValues)
                  setTouched({})
                  setFormError('')
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="md" loading={submitting} className="flex-1">
                Guardar
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}

export default ProfileModal
