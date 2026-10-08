import watermarkCocha from '@/assets/watermark/cocha-skyline-color.webp'

const NOISE_SVG = `
<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'>
  <filter id='n'>
    <feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch' />
  </filter>
  <rect width='100%' height='100%' filter='url(#n)' />
</svg>`
const NOISE_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(NOISE_SVG)}`

/** Fixed app-wide backdrop: institutional gradient + subtle texture for depth. */
export function GisBackdrop() {
  return (
    <div className="gis-backdrop pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-gradient-to-br from-accent-300 via-accent-400 to-accent-500">
      <div
        className="absolute inset-0 opacity-[0.05] mix-blend-soft-light"
        style={{ backgroundImage: `url("${NOISE_DATA_URI}")`, backgroundSize: '180px 180px' }}
      />
      <div
        className="gis-backdrop__watermark absolute inset-0 bg-no-repeat bg-bottom opacity-[0.09]"
        style={{
          backgroundImage: `url("${watermarkCocha}")`,
          backgroundSize: 'min(100vw, 1800px) auto',
        }}
      />
      <svg
        className="gis-backdrop__building-lights"
        viewBox="0 0 1685 934"
        preserveAspectRatio="xMidYMax meet"
        aria-hidden="true"
      >
        <defs>
          <filter id="town-window-glow" x="-300%" y="-300%" width="700%" height="700%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feFlood floodColor="#ffbd62" floodOpacity="0.9" />
            <feComposite in2="blur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="town-ambient-glow" x="-30%" y="-100%" width="160%" height="300%">
            <feGaussianBlur stdDeviation="34" />
          </filter>
        </defs>
        <g className="gis-backdrop__town-glow" filter="url(#town-ambient-glow)">
          <ellipse cx="570" cy="846" rx="170" ry="40" fill="#ffbd62" />
          <ellipse cx="1200" cy="842" rx="200" ry="45" fill="#ffbd62" />
        </g>
        <g className="gis-backdrop__town-windows" filter="url(#town-window-glow)" fill="#ffe3a0">
          {/* Edificio de tres niveles, a la izquierda de la plaza. */}
          <rect x="498" y="745" width="10" height="12" rx="2" />
          <rect x="516" y="746" width="11" height="12" rx="2" />
          <rect x="534" y="747" width="11" height="12" rx="2" opacity="0.4" />
          <rect x="496" y="767" width="11" height="12" rx="2" />
          <rect x="514" y="768" width="11" height="12" rx="2" opacity="0.4" />
          <rect x="533" y="770" width="11" height="11" rx="2" />
          <rect x="495" y="790" width="10" height="11" rx="2" />
          <rect x="513" y="791" width="10" height="12" rx="2" />
          <rect x="531" y="792" width="11" height="12" rx="2" />
          {/* Ventanas altas del ala baja, junto a la fuente. */}
          <rect x="557" y="809" width="13" height="25" rx="2" />
          <rect x="578" y="810" width="13" height="25" rx="2" opacity="0.4" />
          <rect x="600" y="812" width="13" height="23" rx="2" />
          {/* Torre de techo a dos aguas. */}
          <rect x="634" y="768" width="11" height="10" rx="1" />
          <rect x="653" y="769" width="11" height="10" rx="1" opacity="0.4" />
          <rect x="633" y="787" width="11" height="10" rx="1" />
          <rect x="652" y="789" width="11" height="9" rx="1" />
          <rect x="631" y="806" width="11" height="11" rx="1" />
          <rect x="651" y="808" width="11" height="10" rx="1" />
          {/* Campanario de la iglesia: oculo y los dos cuerpos de campanas. */}
          <circle cx="1120" cy="688" r="5" opacity="0.5" />
          <rect x="1112" y="709" width="7" height="11" rx="1" />
          <rect x="1126" y="711" width="6" height="11" rx="1" />
          <rect x="1116" y="742" width="7" height="11" rx="1" opacity="0.4" />
          <rect x="1131" y="743" width="7" height="11" rx="1" />
          {/* Nave de la iglesia, nivel alto. */}
          <rect x="1110" y="778" width="12" height="21" rx="2" />
          <rect x="1127" y="776" width="12" height="22" rx="2" />
          <rect x="1155" y="775" width="11" height="22" rx="2" opacity="0.4" />
          <rect x="1169" y="774" width="12" height="22" rx="2" />
          <rect x="1184" y="773" width="12" height="22" rx="2" />
          <rect x="1211" y="772" width="12" height="22" rx="2" />
          <rect x="1227" y="771" width="11" height="22" rx="2" opacity="0.4" />
          <rect x="1241" y="770" width="12" height="22" rx="2" />
          <rect x="1266" y="769" width="11" height="22" rx="2" />
          <rect x="1283" y="768" width="11" height="21" rx="2" />
          {/* Nave de la iglesia, nivel bajo. */}
          <rect x="1112" y="808" width="12" height="26" rx="2" />
          <rect x="1129" y="807" width="12" height="26" rx="2" opacity="0.4" />
          <rect x="1156" y="806" width="12" height="26" rx="2" />
          <rect x="1171" y="805" width="12" height="26" rx="2" />
          <rect x="1186" y="804" width="12" height="27" rx="2" opacity="0.4" />
          <rect x="1213" y="803" width="12" height="26" rx="2" />
          <rect x="1228" y="802" width="12" height="26" rx="2" />
          <rect x="1243" y="801" width="12" height="27" rx="2" opacity="0.4" />
          <rect x="1267" y="800" width="12" height="26" rx="2" />
          <rect x="1284" y="799" width="12" height="26" rx="2" />
        </g>
      </svg>
      <div className="gis-backdrop__sunlight absolute inset-0" aria-hidden="true" />
      <div className="gis-backdrop__sun" aria-hidden="true" />
      <div className="gis-backdrop__moonlight absolute inset-0" aria-hidden="true" />
      <div className="gis-backdrop__stars absolute inset-0" aria-hidden="true" />
      <div className="gis-backdrop__moon" aria-hidden="true" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(10,13,18,0.14)_100%)]" />
      <div className="gis-backdrop__shade absolute inset-0" />
    </div>
  )
}

export default GisBackdrop
