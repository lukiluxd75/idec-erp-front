/**
 * Validates login form fields
 * @param {{ username?: string, password?: string }} values
 * @returns {Record<string, string>}
 */
export function validateLoginForm(values) {
  const errors = {}

  if (!values?.username || !values.username.trim()) {
    errors.username = 'Ingrese su nombre de usuario o correo.'
  }

  if (!values?.password) {
    errors.password = 'Ingrese su contraseña.'
  }

  return errors
}

/**
 * Validates change-password form fields (Profile screen).
 * @param {{ currentPassword?: string, newPassword?: string, confirmPassword?: string }} values
 * @returns {Record<string, string>}
 */
export function validateChangePasswordForm(values) {
  const errors = {}

  if (!values?.currentPassword) {
    errors.currentPassword = 'Ingrese su contraseña actual.'
  }

  if (!values?.newPassword) {
    errors.newPassword = 'Ingrese una nueva contraseña.'
  } else if (values.newPassword.length < 8) {
    errors.newPassword = 'Debe tener al menos 8 caracteres.'
  } else if (values.newPassword === values.currentPassword) {
    errors.newPassword = 'La nueva contraseña debe ser distinta a la actual.'
  }

  if (!values?.confirmPassword) {
    errors.confirmPassword = 'Confirme la nueva contraseña.'
  } else if (values.confirmPassword !== values.newPassword) {
    errors.confirmPassword = 'Las contraseñas no coinciden.'
  }

  return errors
}
