import { ChevronDown, Save } from 'lucide-react'
import { useState } from 'react'

import { Button, Card, Input } from '@/shared/ui'

const CAMPOS_SECUNDARIOS = [
  'distrito',
  'subalcaldia',
  'zonaHomogenea',
  'calle',
  'fechaPlanoAprobado',
  'ci1',
  'ci2',
]

/**
 * Datos generales del edificio. Arriba solo lo que se transcribe siempre; el
 * resto (que igual va a la hoja INICIO del Excel) queda plegado.
 */
export function GeneralDataForm({ datosGenerales, setDatosGenerales, onSave, saving }) {
  const [masAbierto, setMasAbierto] = useState(false)

  const campo = (clave, props = {}) => (
    <Input
      id={`dg-${clave}`}
      value={datosGenerales[clave]}
      onChange={(e) => setDatosGenerales((prev) => ({ ...prev, [clave]: e.target.value }))}
      {...props}
    />
  )

  const completos = CAMPOS_SECUNDARIOS.filter((k) => String(datosGenerales[k] ?? '').trim() !== '').length

  return (
    <Card className="animate-card-in">
      <div className="mb-6">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">Datos generales</h2>
        <p className="mt-1 text-sm text-slate-600">
          Transcríbalos del plano aprobado y de la resolución. Van a la hoja INICIO del Excel.
        </p>
      </div>

      <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          {campo('codigoCatastral', { label: 'Código catastral', placeholder: '00-000-000-0-00-000-000' })}
        </div>
        <div className="sm:col-span-1 lg:col-span-4">
          {campo('edificio', { label: 'Edificio / Proyecto', placeholder: 'Ej. Edificio "Don Juan"' })}
        </div>
        <div className="lg:col-span-2">
          {campo('resolucionEjecutiva', { label: 'N° Resolución Ejecutiva', placeholder: '102/2026' })}
        </div>
        <div className="lg:col-span-2">
          {campo('fechaResolucion', { label: 'Fecha de la R.E.', placeholder: 'DD/MM/AAAA' })}
        </div>
        <div className="lg:col-span-2">
          {campo('supLote', { label: 'Sup. de lote (m²)', type: 'number', inputMode: 'decimal' })}
        </div>
        <div className="sm:col-span-2 lg:col-span-6">
          {campo('propietario', { label: 'Propietario(s)', placeholder: 'Nombre completo' })}
        </div>
      </div>

      <div className="mt-6 border-t border-slate-900/10 pt-4">
        <button
          type="button"
          aria-expanded={masAbierto}
          aria-controls="dg-mas"
          onClick={() => setMasAbierto((v) => !v)}
          className="group -ml-2 inline-flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-700 outline-none transition-[color,transform] duration-150 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-accent-400/60 active:scale-[0.97] motion-reduce:transition-none"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ease-out motion-reduce:transition-none ${
              masAbierto ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
          Más datos
          <span className="text-xs font-medium tabular-nums text-slate-500">
            {completos} de {CAMPOS_SECUNDARIOS.length}
          </span>
        </button>

        <div
          id="dg-mas"
          inert={!masAbierto}
          className={`grid transition-[grid-template-rows,opacity] duration-[260ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${
            masAbierto ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <div className="grid gap-x-4 gap-y-5 p-1 pt-4 sm:grid-cols-2 lg:grid-cols-6">
              <div className="lg:col-span-2">
                {campo('distrito', { label: 'Distrito', type: 'number' })}
              </div>
              <div className="lg:col-span-2">{campo('subalcaldia', { label: 'Subalcaldía' })}</div>
              <div className="lg:col-span-2">
                {campo('zonaHomogenea', { label: 'Zona homogénea', placeholder: 'Ej. ZONA 6' })}
              </div>
              <div className="lg:col-span-3">{campo('calle', { label: 'Calle o avenida' })}</div>
              <div className="lg:col-span-3">
                {campo('fechaPlanoAprobado', { label: 'Fecha de plano aprobado', placeholder: 'DD/MM/AAAA' })}
              </div>
              <div className="lg:col-span-3">
                {campo('ci1', { label: 'C.I. propietario 1', type: 'number' })}
              </div>
              <div className="lg:col-span-3">
                {campo('ci2', { label: 'C.I. propietario 2', type: 'number' })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <Button icon={Save} onClick={onSave} loading={saving}>
          Guardar datos generales
        </Button>
      </div>
    </Card>
  )
}

export default GeneralDataForm
