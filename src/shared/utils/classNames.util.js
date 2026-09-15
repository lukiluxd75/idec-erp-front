import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combina clases condicionales (clsx) y resuelve conflictos de utilidades Tailwind (twMerge).
 * Useful in components with many conditional style variants.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
