import { useEffect, useMemo, useState } from 'react'
import { Alert, Badge, EmptyState, Spinner } from '@/shared/ui'
import { Building, FileSearch, Scale, UserRound } from 'lucide-react'
import { detectionApi } from '../api/detection.api'

function getAsientosPayload(row) {
  return row?.asientos_catastro || row?.asientos_fields?.asientos_catastro || null
}

function Fact({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 break-words text-sm font-semibold text-slate-900">
        {value == null || value === '' ? '—' : String(value)}
      </p>
    </div>
  )
}

/**
 * SISCAT fiscal card oriented to quick architect validation:
 * does what is seen in the image match what is declared in cadastre?
 */
export default function FiscalParcelPanel({ row, onOpenFullExpediente }) {
  const [detalle, setDetalle] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedRegId, setSelectedRegId] = useState(null)

  const payload = useMemo(() => getAsientosPayload(row), [row])
  const regs = payload?.registros || []
  const constr = payload?.construcciones || []
  const vigente = regs.find((r) => r.vigente) || regs[0] || null

  useEffect(() => {
    setDetalle(null)
    setError('')
    setSelectedRegId(null)
  }, [row?.codigo_catastral, row?.prob_pct, row?.tipo, row?.tipo_cambio])

  useEffect(() => {
    if (!vigente?.idRegistroCatastral) return undefined
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      setSelectedRegId(vigente.idRegistroCatastral)
      try {
        const data = await detectionApi.getCadastralRecord(vigente.idRegistroCatastral)
        if (!cancelled) setDetalle(data)
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'No se pudo cargar el expediente SISCAT.')
          setDetalle(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [vigente?.idRegistroCatastral])

  if (!row) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8">
        <EmptyState
          icon={FileSearch}
          title="Seleccione un hallazgo"
          subtitle="Al elegir una fila verá aquí la ficha SISCAT del predio para contrastarla con la imagen."
        />
      </div>
    )
  }

  if (!payload) {
    return (
      <div className="space-y-3">
        <HeaderCodigo row={row} />
        <Alert
          type="warning"
          title="Sin cruce SISCAT"
          message={
            row.codigo_catastral
              ? `No hay asientos asociados al código ${row.codigo_catastral}.`
              : 'El hallazgo no trae código catastral; no es posible contrastar con SISCAT.'
          }
        />
      </div>
    )
  }

  const rc = detalle?.registro_catastral || {}
  const legales = detalle?.informes_legales || []
  const tecnicos = detalle?.informes_tecnicos || []
  const propietarios = legales.flatMap((il) => il.propietarios || [])
  const tipo = row.tipo || row.tipo_cambio || '—'
  const detectionHint =
    String(tipo).toLowerCase().includes('nueva')
      ? 'Detectado como NUEVA: verifique si figura entre las construcciones declaradas o si podría ser obra no registrada.'
      : String(tipo).toLowerCase().includes('elimin')
        ? 'Detectado como ELIMINADA: contraste con lo declarado y con la ortofoto A (antes).'
        : 'Detectado como CAMBIO: contraste la huella visual con superficies / años declarados.'

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <HeaderCodigo row={row} resumen={payload.resumen} />

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-950">
        <p className="font-semibold">Guía de contraste (inteligencia fiscal)</p>
        <p className="mt-0.5">{detectionHint}</p>
      </div>

      {!payload.disponible ? (
        <Alert
          type="warning"
          title="Asientos no disponibles"
          message={payload.detalle || payload.motivo || 'No hay datos disponibles para este código.'}
        />
      ) : (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-center gap-2">
              <Scale className="h-4 w-4 text-brand-700" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Registro catastral
              </h4>
              {loading && <Spinner className="h-3.5 w-3.5" />}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Fact label="Asiento vigente" value={rc.asiento ?? vigente?.asiento} />
              <Fact label="N.º inscripción" value={rc.nroInscripcion ?? vigente?.nroInscripcion} />
              <Fact label="Estado" value={rc.estado || rc.estadoActual || vigente?.estado} />
              <Fact
                label="Fecha emisión"
                value={rc.fechaEmision || vigente?.fechaEmision}
              />
              <Fact
                label="Resolución"
                value={
                  rc.resolucionMunicipal != null
                    ? `${rc.resolucionMunicipal}/${rc.gestionResolucionMunicipal || ''}`
                    : vigente?.resolucionMunicipal != null
                      ? `${vigente.resolucionMunicipal}/${vigente.gestionResolucionMunicipal || ''}`
                      : null
                }
              />
              <Fact label="Urbanización / sitio" value={rc.nombreUrbanizacion || rc.sitio} />
            </div>
            {regs.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {regs.map((r) => {
                  const id = r.idRegistroCatastral
                  const active = selectedRegId === id
                  const label = r.asiento || (r.nroInscripcion != null ? `Insc. ${r.nroInscripcion}` : '—')
                  return (
                    <button
                      key={id || `${r.asiento}-${r.nroInscripcion}-${r.nroRegistro}`}
                      type="button"
                      className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${
                        active
                          ? 'bg-brand-800 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                      onClick={async () => {
                        if (!id) return
                        setSelectedRegId(id)
                        setLoading(true)
                        setError('')
                        try {
                          const data = await detectionApi.getCadastralRecord(id)
                          setDetalle(data)
                        } catch (err) {
                          setError(err.message || 'No se pudo cargar el asiento.')
                        } finally {
                          setLoading(false)
                        }
                      }}
                    >
                      Asiento {label}
                      {r.vigente ? ' · vigente' : ''}
                    </button>
                  )
                })}
              </div>
            )}
            {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-center gap-2">
              <UserRound className="h-4 w-4 text-brand-700" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Propietarios ({propietarios.length})
              </h4>
            </div>
            {!loading && propietarios.length === 0 ? (
              <p className="text-xs text-slate-500">Sin propietarios en el informe legal cargado.</p>
            ) : (
              <ul className="max-h-28 space-y-1.5 overflow-auto text-xs">
                {propietarios.map((p, i) => (
                  <li
                    key={`${p.numeroDocumento || p.nombreCompleto}-${i}`}
                    className="rounded-lg bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-100"
                  >
                    <span className="font-semibold text-slate-900">
                      {p.nombreCompleto || '—'}
                    </span>
                    <span className="text-slate-600">
                      {' · '}
                      {p.numeroDocumento || 's/doc'}
                      {p.porcentajeAccionDerecho != null
                        ? ` · ${p.porcentajeAccionDerecho}%`
                        : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="min-h-0 flex-1 rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-brand-700" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Construcciones declaradas ({constr.length})
                </h4>
              </div>
              <Badge variant="neutral">SISCAT</Badge>
            </div>
            {constr.length === 0 ? (
              <p className="text-xs text-slate-500">
                No hay construcciones declaradas en el cruce. Una detección «nueva» puede indicar
                obra no registrada.
              </p>
            ) : (
              <div className="max-h-44 overflow-auto rounded-lg border border-slate-100">
                <table className="min-w-full text-left text-[11px]">
                  <thead className="sticky top-0 bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="px-2 py-1.5">Unidad</th>
                      <th className="px-2 py-1.5">Sup. m²</th>
                      <th className="px-2 py-1.5">Año</th>
                      <th className="px-2 py-1.5">Matrícula</th>
                    </tr>
                  </thead>
                  <tbody>
                    {constr.map((c, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-2 py-1.5 text-slate-800">
                          {c.nombreUnidad || c.nominacionRM || c.nroInmueble || c.nroMejora || '—'}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums text-slate-800">
                          {c.superficieConstTotal ?? c.superficiePrivada ?? c.shapeArea ?? '—'}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums text-slate-800">
                          {c.anioConstruccion ?? '—'}
                        </td>
                        <td className="px-2 py-1.5 text-slate-800">{c.matricula ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {tecnicos[0] && (
              <div className="mt-2 grid gap-2 rounded-lg bg-slate-50 px-2.5 py-2 sm:grid-cols-2">
                <Fact
                  label="Sup. predio (inf. técnico)"
                  value={tecnicos[0].superficiePredio}
                />
                <Fact
                  label="Sup. construida total"
                  value={tecnicos[0].superficieConstruidaTotal}
                />
              </div>
            )}
          </section>

          {onOpenFullExpediente && (
            <button
              type="button"
              onClick={() => onOpenFullExpediente(row)}
              className="text-left text-xs font-semibold text-accent-600 hover:underline"
            >
              Abrir expediente SISCAT completo →
            </button>
          )}
        </>
      )}
    </div>
  )
}

function HeaderCodigo({ row, resumen }) {
  const tipo = row.tipo || row.tipo_cambio || '—'
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        Predio en validación
      </p>
      <p className="mt-0.5 text-sm font-bold text-slate-900">
        {row.codigo_catastral || 'Sin código catastral'}
      </p>
      <p className="mt-0.5 text-[11px] text-slate-600">
        {String(tipo).toUpperCase()}
        {row.prob_pct != null ? ` · ${row.prob_pct}%` : ''}
        {resumen ? ` · ${resumen}` : ''}
      </p>
    </div>
  )
}
