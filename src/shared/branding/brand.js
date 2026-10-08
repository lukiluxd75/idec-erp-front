// Prefer the optimized WebP asset while leaving original formats available to
// the stand-alone kiosk screens that still reference their existing files.
const optimizedLogos = import.meta.glob('@/assets/branding/*.webp', {
  eager: true,
  import: 'default',
})
const logos = Object.keys(optimizedLogos).length
  ? optimizedLogos
  : import.meta.glob('@/assets/branding/*.{png,jpg,jpeg,svg}', {
      eager: true,
      import: 'default',
    })

const entradas = Object.entries(logos).sort(([a], [b]) => a.localeCompare(b))

if (import.meta.env.DEV && entradas.length !== 1) {
  console.warn(
    `[brand] Se esperaba exactamente 1 imagen en src/assets/branding/, ` +
      `hay ${entradas.length}. Se usa la primera por orden alfabético.`,
  )
}

const logoSrc = entradas[0]?.[1]

export const BRAND = {
  logoSrc,
  logoAlt: 'Escudo del Gobierno Autónomo Municipal de Cochabamba',
}
