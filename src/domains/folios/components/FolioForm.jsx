import { Compass, Home, Hash } from 'lucide-react'

import { AsientosEditor } from '@/domains/folios/components/AsientosEditor'
import { FolioField, FolioSelect, FormSection } from '@/domains/folios/components/FolioField'
import { parseNumber } from '@/domains/folios/utils/folioData'

const UNIDADES = [
  { value: 'm2', label: 'm²' },
  { value: 'ha', label: 'ha' },
]

/** Editable view of the whole folio JSON (state lives in FolioFormContext). */
export function FolioForm() {
  return (
    <div className="space-y-4">
      <FormSection title="Matrícula" icon={Hash}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <FolioField label="N° de matrícula" path={['matricula', 'numero']} className="col-span-2" />
          <FolioField label="Estado" path={['matricula', 'estado']} placeholder="VIGENTE" />
          <FolioField label="Zona" path={['matricula', 'zona']} />
        </div>
      </FormSection>

      <FormSection title="Inmueble" icon={Home}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <FolioField label="Tipo de inmueble" path={['tipo_inmueble']} className="col-span-2" />
          <FolioField label="Designación S/TIT" path={['designacion_s_tit']} className="col-span-2" />
          <FolioField label="Ubicación" path={['ubicacion']} className="col-span-2 sm:col-span-4" />
          <FolioField
            label="Superficie"
            path={['superficie', 'valor']}
            flagPath={['superficie']}
            parse={parseNumber}
            placeholder="280.00"
          />
          <FolioSelect label="Unidad" path={['superficie', 'unidad']} options={UNIDADES} />
          <FolioField label="Medidas" path={['medidas']} />
          <FolioField label="Propiedad" path={['propiedad']} />
        </div>
      </FormSection>

      <FormSection title="Linderos" icon={Compass}>
        <div className="grid gap-2 sm:grid-cols-2">
          <FolioField label="Norte" path={['linderos', 'norte']} />
          <FolioField label="Sud" path={['linderos', 'sud']} />
          <FolioField label="Este" path={['linderos', 'este']} />
          <FolioField label="Oeste" path={['linderos', 'oeste']} />
        </div>
      </FormSection>

      <AsientosEditor />
    </div>
  )
}
