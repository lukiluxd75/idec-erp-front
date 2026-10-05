// Logo is taken automatically from the ONLY image in `src/assets/branding/`.
const logos = import.meta.glob('@/assets/branding/*.{png,jpg,jpeg,svg,webp}', {
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
