import { useEffect, useRef, useState } from 'react'
import { Alert, Badge, EmptyState, Spinner } from '@/shared/ui'
import { FileSearch } from 'lucide-react'
import { deteccionApi } from '../api/deteccion.api'

function getAsientosPayload(row) {
  return row?.asientos_catastro || row?.asientos_fields?.asientos_catastro || null
}

const RC_FIELDS = [
  ['asiento', 'Asiento'],
  ['codigoCatastral', 'Código catastral'],
  ['nroInscripcion', 'N.º inscripción'],
  ['nroRegistro', 'N.º registro'],
  ['nroFormulario', 'N.º formulario'],
  ['estado', 'Estado'],
  ['estadoActual', 'Estado actual'],
  ['estadoInscripcion', 'Estado inscripción'],
  ['estadoEmision', 'Estado emisión'],
  ['fechaIngresoCatastro', 'Fecha ingreso catastro'],
  ['fechaEmision', 'Fecha emisión'],
  ['fechaTransferencia', 'Fecha transferencia'],
  ['resolucionMunicipal', 'Resolución municipal'],
  ['gestionResolucionMunicipal', 'Gestión resolución'],
  ['aclaracionRegistro', 'Aclaración registro'],
  ['aclaracionTransferencia', 'Aclaración transferencia'],
  ['observacionRegistro', 'Observación'],
  ['nombreUrbanizacion', 'Urbanización'],
  ['sitio', 'Sitio'],
]

/** Claves técnicas / PK de tablas: no mostrar en UI. */
function isInternalIdKey(key) {
  const k = String(key || '')
  if (!k) return true
  if (k === 'id' || k === 'uuid' || k === 'guid') return true
  if (/_id$/i.test(k) || /Id$/.test(k)) return true
  if (/^id[A-Z_]/.test(k)) return true
  if (/^id_/i.test(k)) return true
  return false
}

function humanizeKey(key) {
  return String(key)
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^\w/, (c) => c.toUpperCase())
}

function KvGrid({ obj, fields }) {
  if (!obj || typeof obj !== 'object') return null
  const entries = fields
    ? fields
        .filter(([k]) => !isInternalIdKey(k))
        .map(([k, label]) => [k, label, obj[k]])
        .filter(([, , v]) => v != null && v !== '')
    : Object.entries(obj)
        .filter(([k, v]) => !isInternalIdKey(k) && v != null && v !== '' && typeof v !== 'object')
        .map(([k, v]) => [k, humanizeKey(k), v])

  if (!entries.length) {
    return <p className="text-xs text-slate-500">Sin datos en esta sección.</p>
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map(([k, label, v]) => (
        <div key={k} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-0.5 break-words text-sm font-medium text-slate-900">{String(v)}</p>
        </div>
      ))}
    </div>
  )
}

function DataTable({ rows, columns }) {
  if (!rows?.length) return <p className="text-xs text-slate-500">Sin registros.</p>
  const cols = (columns || Object.keys(rows[0] || {}))
    .filter((k) => !isInternalIdKey(k))
    .filter((k) => {
      if (columns) return true
      const v = rows[0][k]
      return v == null || typeof v !== 'object'
    })
  if (!cols.length) return null

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-left text-xs">
        <thead className="bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-700">
          <tr>
            {cols.map((c) => (
              <th key={c} className="px-2.5 py-2 whitespace-nowrap">
                {humanizeKey(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white">
          {rows.map((row, idx) => (
            <tr key={idx} className="border-t border-slate-100">
              {cols.map((c) => (
                <td key={c} className="px-2.5 py-1.5 text-slate-800 whitespace-nowrap">
                  {row[c] == null || row[c] === '' ? '—' : String(row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SectionBlock({ title, children }) {
  return (
    <section className="space-y-2">
      <h4 className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{title}</h4>
      {children}
    </section>
  )
}

/**
 * Panel SISCAT + expediente completo (trámite, informes legales/técnicos, etc.).
 */
export default function AsientosPanel({ row }) {
  const [detalle, setDetalle] = useState(null)
  const [loadingId, setLoadingId] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [error, setError] = useState(null)
  const detalleRef = useRef(null)

  useEffect(() => {
    setDetalle(null)
    setError(null)
    setSelectedId(null)
  }, [row])

  if (!row) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8">
        <EmptyState
          icon={FileSearch}
          title="Sin fila seleccionada"
          subtitle="Vuelva a Hallazgos, seleccione un registro y abra esta pestaña."
        />
      </div>
    )
  }

  const p = getAsientosPayload(row)
  if (!p) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8">
        <EmptyState
          icon={FileSearch}
          title="Sin datos SISCAT"
          subtitle={
            row.codigo_catastral
              ? `No hay asientos asociados al código ${row.codigo_catastral}.`
              : 'La fila seleccionada no incluye código catastral.'
          }
        />
      </div>
    )
  }

  const regs = p.registros || []
  const constr = p.construcciones || []

  async function openRegistro(id) {
    if (!id) return
    setLoadingId(id)
    setSelectedId(id)
    setError(null)
    try {
      const data = await deteccionApi.getRegistroCatastral(id)
      setDetalle(data)
      requestAnimationFrame(() => {
        detalleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
    } catch (err) {
      setError(err.message || 'No se pudo cargar el expediente catastral.')
      setDetalle(null)
    } finally {
      setLoadingId(null)
    }
  }

  const rc = detalle?.registro_catastral || {}
  const legales = detalle?.informes_legales || []
  const tecnicos = detalle?.informes_tecnicos || []
  const anotaciones = detalle?.anotaciones || []
  const constrCatastro = detalle?.construcciones_catastro || []

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <p className="text-sm font-semibold text-slate-900">
          {(row.tipo || row.tipo_cambio || 'Hallazgo') +
            ` · ${row.codigo_catastral || p.codigo_catastral || '—'}`}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-600">
          {(p.resumen ? `${p.resumen} · ` : '') +
            'Seleccione un asiento (A-1, A-2…) para abrir el expediente.'}
        </p>
      </div>

      {!p.disponible ? (
        <Alert
          type="warning"
          title="Asientos no disponibles"
          message={p.detalle || p.motivo || 'No hay datos disponibles para este código.'}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-brand-800 text-[10px] font-bold uppercase tracking-wider text-white">
              <tr>
                <th className="px-3 py-2">Asiento</th>
                <th className="px-3 py-2">N.º inscripción</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Fecha emisión</th>
                <th className="px-3 py-2">Resolución</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {regs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-slate-600">
                    No hay asientos registrados para este código.
                  </td>
                </tr>
              ) : (
                regs.map((r) => {
                  const id = r.idRegistroCatastral
                  const selected = selectedId === id
                  const asientoLabel = r.asiento || '—'
                  return (
                    <tr
                      key={id || `${r.asiento}-${r.nroInscripcion}-${r.nroRegistro}`}
                      className={`cursor-pointer border-t border-slate-100 transition-colors hover:bg-accent-50 ${
                        r.vigente ? 'bg-state-success/5' : ''
                      } ${selected ? 'bg-accent-50 ring-1 ring-inset ring-accent-300' : ''}`}
                      onClick={() => openRegistro(id)}
                      title="Seleccione para ver el expediente completo"
                    >
                      <td className="px-3 py-2 font-semibold text-slate-900">
                        <span className="inline-flex flex-wrap items-center gap-1.5">
                          {asientoLabel}
                          {r.vigente ? <Badge variant="success">Vigente</Badge> : null}
                          {loadingId === id ? <Spinner className="h-3.5 w-3.5" /> : null}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-700">{r.nroInscripcion ?? '—'}</td>
                      <td className="px-3 py-2 text-slate-700">{r.estado || r.estadoActual || '—'}</td>
                      <td className="px-3 py-2 text-slate-700">{r.fechaEmision || '—'}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {r.resolucionMunicipal != null
                          ? `${r.resolucionMunicipal}/${r.gestionResolucionMunicipal || ''}`
                          : '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {constr.length > 0 && (
        <SectionBlock title="Construcciones declaradas (cruce)">
          <DataTable
            rows={constr}
            columns={[
              'nroInmueble',
              'nombreUnidad',
              'superficieConstTotal',
              'anioConstruccion',
              'matricula',
            ]}
          />
        </SectionBlock>
      )}

      {error && <Alert type="error" title="Error al consultar" message={error} />}

      {detalle && (
        <div
          ref={detalleRef}
          className="space-y-5 rounded-2xl border border-accent-200 bg-accent-50/50 p-4 sm:p-5"
        >
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Expediente · asiento {detalle.asiento || rc.asiento || '—'}
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              {[
                detalle.codigo_catastral,
                (detalle.asiento || rc.asiento) && `asiento ${detalle.asiento || rc.asiento}`,
                rc.nroInscripcion != null ? `inscripción ${rc.nroInscripcion}` : null,
                detalle.resumen,
                detalle.es_ph ? 'PH' : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>

          <SectionBlock title="Registro catastral">
            <KvGrid obj={rc} fields={RC_FIELDS} />
          </SectionBlock>

          {detalle.tramite && (
            <SectionBlock title="Trámite">
              <KvGrid obj={detalle.tramite} />
            </SectionBlock>
          )}

          <SectionBlock title={`Informes legales (${legales.length})`}>
            {!legales.length ? (
              <p className="text-xs text-slate-500">Sin informe legal asociado.</p>
            ) : (
              <div className="space-y-4">
                {legales.map((il, idx) => (
                  <div key={il.idInformeLegal || idx} className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold text-slate-800">
                      Informe legal #{idx + 1} · n.º {il.nroInformeLegal ?? '—'}/
                      {il.gestionInformeLegal ?? '—'} · estado {il.estado || '—'}
                    </p>
                    <KvGrid
                      obj={il}
                      fields={[
                        ['nroInformeLegal', 'N.º informe'],
                        ['gestionInformeLegal', 'Gestión'],
                        ['fechaInformeLegal', 'Fecha'],
                        ['matricula', 'Matrícula'],
                        ['asiento', 'Asiento'],
                        ['superficie', 'Superficie'],
                        ['porcentajeTransferencia', '% transferencia'],
                        ['baseCalculo', 'Base cálculo'],
                        ['notaTransferencia', 'Nota transferencia'],
                        ['notaAclaratoria', 'Nota aclaratoria'],
                        ['fechaLegalizacionTransferencia', 'Legalización'],
                        ['estado', 'Estado'],
                      ]}
                    />
                    {(il.propietarios || []).length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Propietarios
                        </p>
                        <DataTable
                          rows={il.propietarios}
                          columns={[
                            'nombreCompleto',
                            'numeroDocumento',
                            'estadoCivil',
                            'porcentajeAccionDerecho',
                            'superficieUtil',
                            'superficieIdeal',
                            'estadoPropietario',
                            'estado',
                          ]}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionBlock>

          <SectionBlock title={`Informes técnicos (${tecnicos.length})`}>
            {!tecnicos.length ? (
              <p className="text-xs text-slate-500">Sin informe técnico asociado.</p>
            ) : (
              <div className="space-y-4">
                {tecnicos.map((it, idx) => (
                  <div key={it.idInformeTecnico || idx} className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold text-slate-800">
                      Informe técnico #{idx + 1} · n.º {it.nroInformeTecnico ?? '—'}/
                      {it.gestionInformeTecnico ?? '—'}
                    </p>
                    <KvGrid
                      obj={it}
                      fields={[
                        ['nroInformeTecnico', 'N.º informe'],
                        ['gestionInformeTecnico', 'Gestión'],
                        ['fechaInformeTecnico', 'Fecha'],
                        ['superficiePredio', 'Sup. predio'],
                        ['superficieIdeal', 'Sup. ideal'],
                        ['superficieConstruidaTotal', 'Sup. construida'],
                        ['perimetro', 'Perímetro'],
                        ['avaluoCatastral', 'Avalúo'],
                        ['fechaAvaluo', 'Fecha avalúo'],
                        ['nroResolucionMunicipal', 'Resolución'],
                        ['nombreCalle', 'Calle'],
                        ['nroPuerta', 'N.º puerta'],
                        ['notaAclaratoria', 'Nota aclaratoria'],
                        ['notaPrimerRegistro', 'Nota primer registro'],
                        ['estado', 'Estado'],
                      ]}
                    />
                    {(it.construcciones || []).length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Construcciones en informe técnico
                        </p>
                        <DataTable rows={it.construcciones} />
                      </div>
                    )}
                    {(it.colindancias || []).length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Colindancias
                        </p>
                        <DataTable rows={it.colindancias} />
                      </div>
                    )}
                    {(it.coordenadas || []).length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Coordenadas
                        </p>
                        <DataTable rows={it.coordenadas} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionBlock>

          {anotaciones.length > 0 && (
            <SectionBlock title={`Anotaciones (${anotaciones.length})`}>
              <DataTable rows={anotaciones} />
            </SectionBlock>
          )}

          {constrCatastro.length > 0 && (
            <SectionBlock title={`Construcciones en catastro (${constrCatastro.length})`}>
              <DataTable
                rows={constrCatastro}
                columns={[
                  'nroInmueble',
                  'asiento',
                  'nombreUnidad',
                  'superficieConstTotal',
                  'superficiePrivada',
                  'anioConstruccion',
                  'matricula',
                  'estado',
                ]}
              />
            </SectionBlock>
          )}
        </div>
      )}
    </div>
  )
}
