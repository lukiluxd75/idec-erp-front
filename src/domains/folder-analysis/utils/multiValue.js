/** Cómo viaja un campo que lleva VARIOS valores. */

/** El texto guardado, abierto en sus partes. */
export function splitValues(value) {
  const parts = String(value ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  return parts.length > 0 ? parts : ['']
}

/** Las partes de vuelta en el texto que se guarda. */
export function joinValues(parts) {
  return parts.map((part) => part.trim()).filter(Boolean).join(', ') || null
}
