// El logo se toma automáticamente de la ÚNICA imagen que haya en
// `src/assets/branding/`. Para cambiarlo: borrá la imagen actual de esa
// carpeta y poné la nueva (cualquier nombre: .png/.jpg/.svg/.webp).
// No hace falta tocar este archivo.
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
