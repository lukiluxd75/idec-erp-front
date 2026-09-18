import { Building2, Home, User } from 'lucide-react'

import { Card, SectionHeader } from '@/shared/ui'

function Field({ label, value }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="text-sm text-slate-900">{value}</p>
    </div>
  )
}

function ownerName(owner) {
  if (!owner) return ''
  return owner.legal_name || [owner.first_name, owner.last_name_1, owner.last_name_2].filter(Boolean).join(' ')
}

/**
 * Read-only display of the appraisal's data — the reviewer never edits this, only
 * writes observations underneath (see ObservationsEditor).
 */
export function AppraisalReadOnlyDetails({ owner, property, constructionUnits }) {
  return (
    <div className="space-y-6">
      <Card className="animate-card-in">
        <SectionHeader icon={User} eyebrow="Propietario" title={ownerName(owner) || 'Sin propietario registrado'} />
        {owner && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Tipo de persona" value={owner.person_type === 'juridica' ? 'Jurídica' : 'Natural'} />
            <Field label="N° de documento" value={owner.document_number} />
            <Field label="% de propiedad" value={owner.ownership_percent} />
            <Field label="Teléfono" value={owner.phone} />
            <Field label="Correo" value={owner.email} />
            <Field label="Matrícula" value={owner.registry_matricula} />
            <Field label="Asiento" value={owner.registry_asiento} />
            <Field label="N° de escritura" value={owner.deed_number} />
            <Field label="Fecha de escritura" value={owner.deed_date} />
            <Field label="Notario" value={owner.notary_name} />
          </div>
        )}
      </Card>

      <Card className="animate-card-in">
        <SectionHeader icon={Home} eyebrow="Predio" title={property.address} subtitle="Dirección y código catastral" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="N° de puerta" value={property.door_number} />
          <Field label="Edificio" value={property.building_name} />
          <Field label="Bloque" value={property.block_label} />
          <Field label="Piso" value={property.floor_label} />
          <Field label="Depto./Unidad" value={property.apartment_label} />
          <Field label="Código catastral" value={property.cadastral_code} />
          <Field label="OTB / Subdistrito" value={property.subdistrict} />
          <Field label="Manzano" value={property.block_code} />
          <Field label="Lote" value={property.plot_code} />
          <Field label="Área aprobada (m²)" value={property.approved_area} />
          <Field label="Frente (m)" value={property.front_length} />
          <Field label="Fondo (m)" value={property.depth_length} />
        </div>
        {property.observations && (
          <div className="mt-4">
            <Field label="Observaciones del predio" value={property.observations} />
          </div>
        )}
      </Card>

      <Card className="animate-card-in">
        <SectionHeader
          icon={Building2}
          eyebrow="Unidades de construcción"
          title={`${constructionUnits.length} ${constructionUnits.length === 1 ? 'unidad' : 'unidades'}`}
        />
        <div className="space-y-4">
          {constructionUnits.map((unit, idx) => (
            <div key={unit.id} className="rounded-2xl border border-white/60 bg-white/70 p-4">
              <p className="mb-3 text-sm font-semibold text-slate-800">
                Unidad {unit.unit_number || idx + 1} · {unit.unit_kind}
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Área (m²)" value={unit.area} />
                <Field label="N° de plantas" value={unit.floors_count} />
                <Field label="Año de construcción" value={unit.construction_year} />
                <Field label="Año de modificación" value={unit.modification_year} />
                <Field label="Puntaje total" value={unit.total_score} />
                <Field label="Valor unitario" value={unit.unit_value} />
                <Field label="Observaciones" value={unit.observations} />
              </div>
              {unit.characteristics?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {unit.characteristics.map((c) => (
                    <span
                      key={`${c.group_id}-${c.option_id}`}
                      className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] text-slate-600"
                    >
                      {c.group_name}: {c.option_label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

export default AppraisalReadOnlyDetails
