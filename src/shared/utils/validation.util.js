/**
 * Valida los campos del formulario de inicio de sesión
 * @param {{ username?: string, password?: string }} values
 * @returns {Record<string, string>}
 */
export function validateLoginForm(values) {
  const errors = {}

  if (!values?.username || !values.username.trim()) {
    errors.username = 'Ingresa tu nombre de usuario o correo.'
  }

  if (!values?.password) {
    errors.password = 'Ingresa tu contraseña.'
  }

  return errors
}

/**
 * Valida los campos del formulario de cambio de contraseña (pantalla Perfil).
 * @param {{ currentPassword?: string, newPassword?: string, confirmPassword?: string }} values
 * @returns {Record<string, string>}
 */
export function validateChangePasswordForm(values) {
  const errors = {}

  if (!values?.currentPassword) {
    errors.currentPassword = 'Ingresa tu contraseña actual.'
  }

  if (!values?.newPassword) {
    errors.newPassword = 'Ingresa una nueva contraseña.'
  } else if (values.newPassword.length < 8) {
    errors.newPassword = 'Debe tener al menos 8 caracteres.'
  } else if (values.newPassword === values.currentPassword) {
    errors.newPassword = 'La nueva contraseña debe ser distinta a la actual.'
  }

  if (!values?.confirmPassword) {
    errors.confirmPassword = 'Confirma la nueva contraseña.'
  } else if (values.confirmPassword !== values.newPassword) {
    errors.confirmPassword = 'Las contraseñas no coinciden.'
  }

  return errors
}
