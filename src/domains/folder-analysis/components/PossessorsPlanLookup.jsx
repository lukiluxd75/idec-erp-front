import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CheckCircle2, ClipboardCheck, Download, HelpCircle, ImageIcon, MapPinned, Search, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'

import { folderAnalysisApi } from '@/domains/folder-analysis/api/folderAnalysis.api'
import { Alert, Button, Card, SectionHeader, Spinner } from '@/shared/ui'
import { downloadBlob } from '@/shared/utils'

const SIDE_COLORS = { predio: '#2563eb', via: '#d97706', none: '#94a3b8' }

function formatM(value) {
  return value === null || value === undefined ? '—' : `${Number(value).toFixed(2)} m`
}

function formatM2(value) {
  return value === null || value === undefined ? '—' : `${Number(value).toFixed(2)} m²`
}

function sideLabel(side) {
  if (side.kind === 'predio') return `Lote ${side.name}`
  if (side.kind === 'via') return side.name.charAt(0).toUpperCase() + side.name.slice(1)
  return 'Sin colindante en el GIS'
}

/**
 * El mapa del predio: el lote que el GIS devolvió para el código, sus vecinos, las
 * calles y, si el plano trae su tabla de coordenadas, el lote como lo dibuja el
 * plano -- para ver de un vistazo dónde no coinciden.
 */
function ParcelMap({ result }) {
  const hostRef = useRef(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host || !result?.map) return undefined

    const map = L.map(host, { zoomControl: true, maxZoom: 21 })
    const satellite = L.tileLayer('https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      subdomains: ['0', '1', '2', '3'],
      maxZoom: 21,
      maxNativeZoom: 20,
      attribution: 'Satélite',
    })
    const streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 21,
      maxNativeZoom: 19,
      attribution: '© OpenStreetMap',
    })
    satellite.addTo(map)
    L.control.layers({ Satélite: satellite, Calles: streets }, {}, { collapsed: true }).addTo(map)

    const { map: drawing, plan } = result

    drawing.neighbours.forEach((neighbour) => {
      L.polygon(neighbour.ring, { color: '#e2e8f0', weight: 1.5, fillColor: '#ffffff', fillOpacity: 0.12 })
        .bindTooltip(`Lote ${neighbour.number || neighbour.code}`, { sticky: true })
        .addTo(map)
    })
    drawing.streets.forEach((street) => {
      street.paths.forEach((path) => {
        L.polyline(path, { color: '#fbbf24', weight: 3, dashArray: '6 6', opacity: 0.9 })
          .bindTooltip(street.name, { sticky: true })
          .addTo(map)
      })
    })

    const parcel = L.polygon(drawing.parcel, { color: '#ffffff', weight: 3, fillColor: '#2563eb', fillOpacity: 0.22 })
    parcel.addTo(map)

    drawing.sides.forEach((side) => {
      L.polyline(side.line, { color: SIDE_COLORS[side.kind] || SIDE_COLORS.none, weight: 6, opacity: 0.95 })
        .bindTooltip(`${side.abbreviation} · ${sideLabel(side)} · ${formatM(side.length_m)}`, { sticky: true })
        .addTo(map)
      const middle = [(side.line[0][0] + side.line[1][0]) / 2, (side.line[0][1] + side.line[1][1]) / 2]
      L.marker(middle, {
        interactive: false,
        icon: L.divIcon({
          className: '',
          html: `<span style="background:#0f172a;color:#fff;font:700 11px/1 system-ui;padding:3px 5px;border-radius:6px;white-space:nowrap">${side.abbreviation}</span>`,
          iconSize: [0, 0],
        }),
      }).addTo(map)
    })

    let bounds = parcel.getBounds()
    if (plan?.survey_vertices_latlng?.length >= 3) {
      const drawn = L.polygon(plan.survey_vertices_latlng, {
        color: '#dc2626',
        weight: 2,
        dashArray: '5 5',
        fillOpacity: 0.05,
      })
        .bindTooltip('Lote según el plano (tabla de coordenadas)', { sticky: true })
        .addTo(map)
      plan.survey.vertices.forEach((vertex, index) => {
        L.circleMarker(plan.survey_vertices_latlng[index], { radius: 4, color: '#dc2626', fillOpacity: 1 })
          .bindTooltip(vertex.name, { permanent: true, direction: 'top', offset: [0, -4] })
          .addTo(map)
      })
      bounds = bounds.extend(drawn.getBounds())
    }
    map.fitBounds(bounds.pad(0.6))

    return () => map.remove()
  }, [result])

  return <div ref={hostRef} className="h-[26rem] w-full overflow-hidden rounded-xl border border-slate-200" />
}

/**
 * El croquis de ubicación tal como lo imprimen los certificados: el predio en gris,
 * el círculo rojo y su número sobre las capas del IDE. Lo arma el servidor.
 */
function Croquis({ result }) {
  const [state, setState] = useState({ code: null, blob: null, url: null, failed: false })
  const code = result.code

  useEffect(() => {
    let cancelled = false
    let url = null
    folderAnalysisApi
      .cadastralCroquisBlob(code)
      .then((blob) => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setState({ code, blob, url, failed: false })
      })
      .catch(() => {
        if (!cancelled) setState({ code, blob: null, url: null, failed: true })
      })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [code])

  // Mientras llega la del predio nuevo no se muestra la del anterior.
  const current = state.code === code ? state : { blob: null, url: null, failed: false }

  return (
    <div className="rounded-xl border border-slate-200 p-3.5">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
          <ImageIcon className="h-4 w-4" aria-hidden="true" /> Croquis de ubicación
        </p>
        {current.blob && (
          <Button
            size="sm"
            variant="secondary"
            icon={Download}
            onClick={() => downloadBlob(current.blob, `croquis_${result.code}.png`)}
          >
            Descargar
          </Button>
        )}
      </div>
      <div className="mt-3 flex min-h-40 items-center justify-center">
        {current.url ? (
          <img src={current.url} alt={`Croquis del predio ${result.property_number}`} className="max-w-full rounded-lg border border-slate-200" />
        ) : current.failed ? (
          <p className="text-xs text-slate-500">No se pudo generar el croquis. Intente buscar de nuevo.</p>
        ) : (
          <Spinner className="h-5 w-5" />
        )}
      </div>
    </div>
  )
}

/** Lo que el IDE sabe del predio fuera de sus lados: uso de suelo, ubicación
 * administrativa y la manzana a la que pertenece. */
function IdeData({ result }) {
  const { land_use: use, block_info: block } = result
  const restriction = use?.restriction
  const rows = [
    ['Uso de suelo', use?.use || '—'],
    ['Restricción', restriction === undefined || restriction === null || restriction === 0 ? 'Sin restricción' : String(restriction)],
    ['Subdistrito', [result.subdistrict_number, result.subdistrict].filter(Boolean).join(' · ') || '—'],
    ['Distrito', result.district ?? '—'],
    ['Comuna', result.commune || block?.commune || '—'],
    [`Manzana ${block?.number || result.block}: superficie`, formatM2(block?.area_m2)],
    [`Manzana ${block?.number || result.block}: perímetro`, formatM(block?.perimeter_m)],
  ]
  return (
    <div className="rounded-xl border border-slate-200 p-3.5">
      <p className="text-sm font-bold text-slate-800">Datos del IDE</p>
      <dl className="mt-2 grid gap-1.5 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-slate-500">{label}</dt>
            <dd className="text-right font-semibold text-slate-800">{value}</dd>
          </div>
        ))}
      </dl>
      {!use && (
        <p className="mt-2 text-xs text-slate-500">El GIS no devolvió el uso de suelo de este predio.</p>
      )}
    </div>
  )
}

const CHECK_STATUS = {
  ok: { icon: CheckCircle2, className: 'text-state-success', text: 'Coincide' },
  differs: { icon: XCircle, className: 'text-state-danger', text: 'No coincide' },
  missing: { icon: HelpCircle, className: 'text-slate-400', text: 'No se leyó' },
}

/**
 * El recuadro de ubicación del plano (ZONA, DISTRITO, SUB DISTRITO, MANZANA, LOTE)
 * contra lo que dice el GIS del predio al que apunta el código. Un renglón que no
 * coincide es el que hay que mirar antes de cerrar la carpeta: o el código se leyó
 * mal o el plano se dibujó para otro lote.
 */
function LocationChecks({ result }) {
  const checks = result.plan?.checks
  if (!checks) return null
  const differing = checks.filter((check) => check.status === 'differs')
  return (
    <div className="rounded-xl border border-slate-200 p-3.5">
      <p className="text-sm font-bold text-slate-800">Ubicación del plano contra el IDE</p>
      <table className="mt-2 w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
            <th className="pb-1 font-semibold">Dato</th>
            <th className="pb-1 font-semibold">Plano</th>
            <th className="pb-1 font-semibold">IDE</th>
            <th className="pb-1" />
          </tr>
        </thead>
        <tbody>
          {checks.map((check) => {
            const status = CHECK_STATUS[check.status] || CHECK_STATUS.missing
            const Icon = status.icon
            return (
              <tr key={check.key} className="border-t border-slate-100">
                <td className="py-1.5 text-slate-500">{check.label}</td>
                <td className="py-1.5 font-semibold text-slate-800">{check.plan || '—'}</td>
                <td className="py-1.5 text-slate-700">{check.gis || '—'}</td>
                <td className="py-1.5">
                  <span className={`flex items-center justify-end gap-1 text-xs font-semibold ${status.className}`}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {status.text}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {differing.length > 0 && (
        <Alert type="warning" className="mt-3">
          {`No coincide: ${differing.map((check) => check.label.toLowerCase()).join(', ')}. Compruebe que el código está bien leído y que el plano es de este lote.`}
        </Alert>
      )}
      {result.plan.location?.street && (
        <p className="mt-2 text-xs text-slate-500">Vía que indica el plano: {result.plan.location.street}</p>
      )}
    </div>
  )
}

function Comparison({ result }) {
  const plan = result.plan
  if (!plan) return null
  const survey = plan.survey
  const rows = [
    ['Superficie según el GIS', formatM2(result.area_m2)],
    [
      survey?.area_net_m2 != null
        ? 'Superficie según el plano (por sus coordenadas, sin las esquinas redondeadas)'
        : 'Superficie según el plano (por sus coordenadas)',
      formatM2(survey?.area_net_m2 ?? survey?.area_m2),
    ],
    ['Superficie que el plano declara', formatM2(plan.declared_area_m2)],
  ]
  const difference = plan.area_difference_m2
  return (
    <div className="rounded-xl border border-slate-200 p-3.5">
      <p className="text-sm font-bold text-slate-800">Plano contra GIS</p>
      <dl className="mt-2 grid gap-1.5 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-slate-500">{label}</dt>
            <dd className="font-semibold text-slate-800">{value}</dd>
          </div>
        ))}
      </dl>
      {difference !== null && difference !== undefined && Math.abs(difference) > 1 && (
        <Alert type="warning" className="mt-3">
          El plano y el GIS difieren en {formatM2(Math.abs(difference))}. Es normal en una regularización, pero
          compruebe que el código corresponde a este lote.
        </Alert>
      )}
      {/* La manzana puede llevar letra ("B37"), así que se comparan letras y dígitos. */}
      {plan.printed_code && plan.printed_code.replace(/[^0-9A-Z]/gi, '').toUpperCase().slice(2) !== result.code && (
        <Alert type="warning" className="mt-3">
          El código impreso en el plano ({plan.printed_code}) no es el que se buscó.
        </Alert>
      )}
      {plan.measures?.note && (
        <Alert type="warning" className="mt-3">
          {plan.measures.note}
        </Alert>
      )}
      {plan.measures?.values?.frontage && (
        <p className="mt-3 text-xs text-slate-500">
          Frente {plan.measures.values.frontage}, contra frente {plan.measures.values.rear_frontage}, fondo{' '}
          {plan.measures.values.depth} y fondo 2 {plan.measures.values.depth_2}, calculados con las
          coordenadas del plano. Se pasan a la hoja con "Usar en la hoja".
        </p>
      )}
      {survey && (
        <div className="mt-3 grid gap-x-6 gap-y-1 text-xs text-slate-600 sm:grid-cols-2">
          <p className="col-span-full font-semibold uppercase tracking-wide text-slate-500">
            Lados del plano (entre vértices)
          </p>
          {survey.sides.map((side) => (
            <div key={`${side.from}-${side.to}`} className="flex justify-between">
              <span>
                {side.from} a {side.to}
              </span>
              <span className="font-semibold text-slate-800">{formatM(side.length_m)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Poseedores: ubica el plano en el IDE a partir de su código catastral y de ahí
 * saca lo que la hoja le copia al IDE -- colindancias por punto cardinal (los 8,
 * porque no todos los lotes están a escuadra del norte), calles y número de
 * predio. El código lo lee el OCR del plano; si lo leyó mal, se corrige acá y se
 * vuelve a buscar. Nada se guarda solo: "Usar en la hoja" lo pasa a los campos
 * del documento y queda por guardar la revisión.
 */
export function PossessorsPlanLookup({ documentId, code, onCodeChange, onApply }) {
  const [text, setText] = useState(code || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const searchedFor = useRef(null)

  const search = async (value = text) => {
    const wanted = (value || '').trim()
    if (!wanted) {
      setError('Escriba el código catastral del plano.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const found = await folderAnalysisApi.cadastralParcel(wanted, documentId)
      setResult(found)
      onCodeChange?.(found.printed_code)
    } catch (e) {
      setResult(null)
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // El código que el OCR leyó se busca solo, una vez: es lo que pide el trámite
  // (cargar el plano y ver el mapa). Si no lo leyó, queda el campo para escribirlo.
  useEffect(() => {
    if (code && searchedFor.current === null) {
      searchedFor.current = code
      setText(code)
      search(code)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  const apply = () => {
    // El número de predio no se pasa: arriba va el que dice el plano y la tabla de
    // abajo lo compara con el IDE. Frente y fondos solo si se pudieron calcular.
    onApply({
      cadastral_code: result.printed_code,
      street: result.street_text || null,
      boundaries: result.boundaries || null,
      ...(result.plan?.measures?.values || {}),
    })
    toast.success('Datos del IDE pasados al documento. Guarde la revisión para conservarlos.')
  }

  return (
    <Card className="animate-card-in">
      <SectionHeader
        icon={MapPinned}
        eyebrow="Registro catastral de poseedores"
        title="Plano en el IDE"
        subtitle="Se busca el predio por su código catastral y se sacan del mapa las colindancias, las calles y la superficie."
      />

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          search()
        }}
      >
        <label className="flex min-w-[18rem] flex-1 flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Código catastral
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="00-33-432-012-0-00-000-000"
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 font-mono text-sm normal-case tracking-normal text-slate-800 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-300/40"
          />
        </label>
        <Button type="submit" icon={Search} loading={loading}>
          Buscar en el IDE
        </Button>
      </form>
      {!code && !result && (
        <p className="mt-2 text-xs text-slate-500">
          El OCR no encontró el código impreso en este plano: escríbalo mirando la foto.
        </p>
      )}

      {error && (
        <Alert type="error" className="mt-4">
          {error}
        </Alert>
      )}

      {result && (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="flex flex-col gap-3">
            <ParcelMap result={result} />
            <div className="flex flex-wrap gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-5 rounded" style={{ background: SIDE_COLORS.predio }} /> Lote vecino
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-5 rounded" style={{ background: SIDE_COLORS.via }} /> Calle
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-5 rounded" style={{ background: SIDE_COLORS.none }} /> Sin colindante en el GIS
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0 w-5 border-t-2 border-dashed border-red-600" /> Lote según el plano
              </span>
            </div>
            <Croquis result={result} />
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
              <p className="text-sm font-bold text-slate-800">
                Predio {result.property_number} · Manzana {result.block}
              </p>
              <p className="text-xs text-slate-500">
                {[result.subdistrict, result.district ? `Distrito ${result.district}` : null, result.commune]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <p className="mt-1 font-mono text-xs text-slate-500">{result.printed_code}</p>
            </div>

            <div className="rounded-xl border border-slate-200 p-3.5">
              <p className="text-sm font-bold text-slate-800">Colindancias</p>
              <p className="mb-2 text-xs text-slate-500">
                Por el punto hacia el que mira cada lado. Revise: se leen del GIS, no del plano.
              </p>
              <table className="w-full text-sm">
                <tbody>
                  {result.sides.map((side) => (
                    <tr key={side.index} className="border-t border-slate-100 first:border-0">
                      <td className="w-12 py-1.5 font-bold text-slate-800">{side.abbreviation}</td>
                      <td className="py-1.5 text-slate-700">{sideLabel(side)}</td>
                      <td className="py-1.5 text-right text-slate-500">{formatM(side.length_m)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl border border-slate-200 p-3.5">
              <p className="text-sm font-bold text-slate-800">Calles</p>
              {result.streets.length === 0 ? (
                <p className="mt-1 text-xs text-slate-500">No hay calles del GIS cerca de este predio.</p>
              ) : (
                <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
                  {result.streets.map((street, index) => (
                    <li key={`${street.name}-${index}`} className="flex justify-between gap-3">
                      <span>{street.name.charAt(0).toUpperCase() + street.name.slice(1)}</span>
                      <span className="text-slate-500">a {formatM(street.distance_m)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <IdeData result={result} />

            <LocationChecks result={result} />

            <Comparison result={result} />

            <Button icon={ClipboardCheck} onClick={apply} className="self-start">
              Usar en la hoja
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
