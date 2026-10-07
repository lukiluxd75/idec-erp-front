import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Combina clases condicionales (clsx) y resuelve conflictos de utilidades Tailwind (twMerge). */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
