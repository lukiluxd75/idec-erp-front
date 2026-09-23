import { ChevronDown, Plus, Sparkles, Trash2, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'

import { FolioField, FolioSelect, FormSection } from '@/domains/folios/components/FolioField'
import { EMPTY_PERSON, emptyAsiento, getAt } from '@/domains/folios/utils/folioData'
import { useFolioForm, useIsLow } from '@/domains/folios/utils/folioFormContext'
import { cn } from '@/shared/utils'

const ASIENTOS = ['titularidad_dominio', 'asientos']

const ROLES = [
  { value: 'titular', label: 'Titular' },
  { value: 'vendedor', label: 'Vendedor' },
]

const ESTADOS_CIVILES = [
  { value: 'soltero(a)', label: 'Soltero(a)' },
  { value: 'casado(a)', label: 'Casado(a)' },
  { value: 'viudo(a)', label: 'Viudo(a)' },
  { value: 'divorciado(a)', label: 'Divorciado(a)' },
]

function SmallButton({ icon: Icon, children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40',
        className
      )}
      {...props}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  )
}

function Persona({ base, index, flagPath }) {
  const { update, data, readOnly } = useFolioForm()
  const personasPath = [...base, 'personas']
  const path = [...personasPath, index]
  const remove = () => update(personasPath, getAt(data, personasPath).filter((_, i) => i !== index), flagPath)

  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200/70 bg-white/70 p-2.5 sm:grid-cols-6">
      <FolioField label="Nombre" path={[...path, 'nombre']} flagPath={flagPath} className="col-span-2 sm:col-span-3" />
      <FolioSelect label="Rol" path={[...path, 'rol']} options={ROLES} />
      <FolioField label="Proporción" path={[...path, 'proporcion']} flagPath={flagPath} placeholder="1/1" />
      <div className="flex items-end justify-end">
        {!readOnly && (
          <SmallButton icon={Trash2} onClick={remove} className="text-state-danger hover:bg-state-danger/10" title="Quitar persona">
            Quitar
          </SmallButton>
        )}
      </div>
      <FolioSelect label="Estado civil" path={[...path, 'estado_civil']} options={ESTADOS_CIVILES} className="sm:col-span-2" />
      <FolioField label="C.I." path={[...path, 'ci']} flagPath={flagPath} className="sm:col-span-2" />
      <FolioField label="Expedido" path={[...path, 'expedido']} flagPath={flagPath} placeholder="CBA" />
    </div>
  )
}

function Asiento({ index, total }) {
  const { data, update, readOnly } = useFolioForm()
  const base = [...ASIENTOS, index]
  const flagPath = base // backend flags a whole asiento: 'titularidad_dominio.asientos.N'
  const asiento = getAt(data, base)
  const low = useIsLow(flagPath)
  const [showText, setShowText] = useState(false)

  const personas = asiento.personas || []
  const addPersona = () => update([...base, 'personas'], [...personas, { ...EMPTY_PERSON }], flagPath)
  const remove = () => update(ASIENTOS, getAt(data, ASIENTOS).filter((_, i) => i !== index))

  return (
    <div className={cn('rounded-2xl border p-3', low ? 'border-state-danger/40 bg-state-danger/5' : 'border-slate-200/80 bg-white/50')}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-accent-50 px-2 py-0.5 text-xs font-bold text-accent-700 ring-1 ring-accent-200">
          Asiento {asiento.numero ?? '¿?'}
        </span>
        {asiento.numero_inferido && <span className="text-[11px] text-slate-400">(número deducido)</span>}
        {asiento.completado_por_ia && (
          <span className="inline-flex items-center gap-1 text-[11px] text-accent-600" title={asiento.completado_por_ia.join(', ')}>
            <Sparkles className="h-3 w-3" /> completado con IA
          </span>
        )}
        {low && <span className="rounded bg-state-danger/10 px-1.5 text-[10px] font-semibold text-state-danger">revisar</span>}
        <span className="ml-auto" />
        {!readOnly && total > 0 && (
          <SmallButton icon={Trash2} onClick={remove} className="text-state-danger hover:bg-state-danger/10">
            Eliminar asiento
          </SmallButton>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <FolioField
          label="N° asiento"
          path={[...base, 'numero']}
          flagPath={flagPath}
          parse={(t) => (t === '' ? null : Number.isFinite(Number(t)) ? Number(t) : t)}
        />
        <FolioField label="Acto" path={[...base, 'acto']} flagPath={flagPath} className="sm:col-span-3" placeholder="Compra Venta" />
      </div>

      <div className="mt-3 space-y-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
          <Users className="h-3.5 w-3.5" /> Personas
        </p>
        {personas.length === 0 && <p className="text-xs text-slate-400">No se detectaron personas en este asiento.</p>}
        {personas.map((_, i) => (
          <Persona key={i} base={base} index={i} flagPath={flagPath} />
        ))}
        {!readOnly && (
          <SmallButton icon={UserPlus} onClick={addPersona}>
            Agregar persona
          </SmallButton>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <FolioField label="Documento" path={[...base, 'documento', 'descripcion']} flagPath={flagPath} className="col-span-2 sm:col-span-3" />
        <FolioField label="Fecha documento" path={[...base, 'documento', 'fecha']} flagPath={flagPath} placeholder="dd/mm/aaaa" />
        <FolioField label="Autoridad (notario / juez)" path={[...base, 'autoridad']} flagPath={flagPath} className="col-span-2 sm:col-span-4" />
        <FolioField label="Presentación N°" path={[...base, 'presentacion', 'numero']} flagPath={flagPath} />
        <FolioField label="Fecha" path={[...base, 'presentacion', 'fecha']} flagPath={flagPath} placeholder="dd/mm/aaaa" />
        <FolioField label="Hora" path={[...base, 'presentacion', 'hora']} flagPath={flagPath} placeholder="hh:mm:ss" />
      </div>

      {asiento.texto && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowText((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            <ChevronDown className={cn('h-3.5 w-3.5 transition', showText && 'rotate-180')} />
            Texto leído por OCR
          </button>
          {showText && (
            <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-900/90 p-2.5 font-mono text-[11px] leading-relaxed text-slate-100">
              {asiento.texto}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

export function AsientosEditor() {
  const { data, update, readOnly } = useFolioForm()
  const asientos = getAt(data, ASIENTOS) || []
  const owners = getAt(data, ['titularidad_dominio', 'titulares_actuales']) || []
  const orphans = getAt(data, ['titularidad_dominio', 'lineas_sin_asiento']) || []

  const addAsiento = () => {
    const last = asientos.reduce((max, a) => (typeof a.numero === 'number' && a.numero > max ? a.numero : max), -1)
    update(ASIENTOS, [...asientos, emptyAsiento(last + 1)])
  }

  return (
    <FormSection
      title="A) Titularidad sobre el dominio"
      icon={Users}
      actions={
        !readOnly && (
          <SmallButton icon={Plus} onClick={addAsiento}>
            Agregar asiento
          </SmallButton>
        )
      }
    >
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <FolioField label="Antecedente dominial" path={['titularidad_dominio', 'antecedente_dominial']} className="col-span-2 sm:col-span-3" />
        <FolioField
          label="Último asiento (según folio)"
          path={['titularidad_dominio', 'ultimo_asiento']}
          parse={(t) => (t === '' ? null : Number.isFinite(Number(t)) ? Number(t) : t)}
        />
      </div>

      {owners.length > 0 && (
        <div className="mb-3 rounded-xl border border-state-success/30 bg-state-success/5 px-3 py-2 text-xs text-slate-700">
          <span className="font-semibold">Titulares actuales: </span>
          {owners.map((o) => `${o.nombre}${o.ci ? ` (C.I. ${o.ci})` : ''}${o.proporcion ? ` · ${o.proporcion}` : ''}`).join('; ')}
          <span className="text-slate-400"> — se recalcula al guardar</span>
        </div>
      )}

      <div className="space-y-3">
        {asientos.length === 0 && <p className="text-sm text-slate-400">No se detectaron asientos en la columna A.</p>}
        {asientos.map((_, i) => (
          <Asiento key={i} index={i} total={asientos.length} />
        ))}
      </div>

      {orphans.length > 0 && (
        <p className="mt-3 text-xs text-slate-500">
          <span className="font-semibold">Texto sin asiento: </span>
          {orphans.join(' · ')}
        </p>
      )}
    </FormSection>
  )
}
