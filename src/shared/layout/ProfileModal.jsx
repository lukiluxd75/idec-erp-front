import { useState } from 'react'
import { UserIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/solid'
import { KeyRound, Mail, ShieldCheck } from 'lucide-react'
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
  const username = user?.username || 'Usuario'

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
    <Modal open={open} onClose={handleClose} title="Tu perfil" icon={UserIcon} size="lg">
      <div className="grid gap-4 sm:grid-cols-[0.92fr_1.08fr]">
        <section className="relative flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-brand-800 via-brand-900 to-slate-950 p-5 text-white shadow-lg sm:min-h-full">
          <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full border border-white/10 bg-white/5" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-16 right-16 h-40 w-40 rounded-full bg-accent-400/20 blur-2xl" aria-hidden="true" />
          <div className="relative flex items-center justify-between gap-3">
            <span className="rounded-full border border-emerald-200/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-100">
              Sesión institucional
            </span>
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-2xl font-bold uppercase shadow-inner backdrop-blur-sm">
              {String(username).charAt(0)}
            </span>
          </div>
          <div className="relative mt-5 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">Perfil de usuario</p>
            <h3 className="mt-1 break-words text-xl font-bold leading-tight">{username}</h3>
            <p className="mt-3 flex min-w-0 items-start gap-2 text-xs leading-relaxed text-white/75">
              <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="break-all">{user?.email || 'Correo no disponible'}</span>
            </p>
          </div>
        </section>

        {!showForm ? (
          <section className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
            <div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-100 text-accent-700 shadow-sm">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="mt-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-700">Protección de acceso</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">Seguridad de la cuenta</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">Actualice su contraseña institucional periódicamente para mantener protegida su cuenta.</p>
              </div>
            </div>
            <Button variant="secondary" size="md" icon={KeyRound} onClick={() => setShowForm(true)} className="mt-6 w-full justify-center">
              Cambiar contraseña
            </Button>
          </section>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-100 text-accent-700 shadow-sm">
                <KeyRound className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Cambiar contraseña</h3>
                <p className="mt-0.5 text-xs text-slate-500">Ingrese su contraseña nueva y confírmela para guardar.</p>
              </div>
            </div>
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
          </section>
        )}
      </div>
    </Modal>
  )
}

export default ProfileModal
