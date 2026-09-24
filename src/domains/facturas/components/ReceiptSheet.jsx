import { cn } from '@/shared/utils'

/**
 * The receipt drawn as it is printed ("FUR - COMPROBANTE DE PAGO", thermal
 * paper): same order, same label: value rows, centered header, big Nº
 * INMUEBLE and the amounts right-aligned -- so the reviewer compares it line by
 * line with the photo. Every value is editable in place; a value the backend
 * read with low confidence (or that breaks a check) is red until touched.
 */

function Value({ k, ctx, align = 'left', multiline = false, className = '' }) {
  const { campos, onChange, readOnly, isRed, confianza, reasons } = ctx
  const value = campos?.[k] ?? ''
  const red = isRed(k)
  const conf = confianza?.[k]
  const title = [
    conf !== null && conf !== undefined ? `Confianza de lectura: ${Math.round(conf * 100)}%` : 'No se leyó',
    ...(reasons?.[k] || []),
  ].join(' · ')
  const Tag = multiline ? 'textarea' : 'input'
  return (
    <Tag
      value={value}
      title={title}
      placeholder="—"
      disabled={readOnly}
      // A second line only when the text needs it (~44 monospace chars per line).
      rows={multiline ? Math.min(3, Math.max(1, Math.ceil(String(value).length / 44))) : undefined}
      onChange={(e) => onChange(k, e.target.value === '' ? null : e.target.value)}
      className={cn(
        'min-w-0 rounded-sm border-b border-dashed bg-transparent px-1 font-mono outline-none transition-colors',
        'focus:border-solid focus:border-accent-500 focus:bg-white disabled:cursor-default',
        multiline && 'resize-none leading-6',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        red
          ? 'border-state-danger bg-state-danger/10 text-state-danger placeholder:text-state-danger/60'
          : 'border-slate-300 text-slate-900',
        className
      )}
    />
  )
}

function Row({ label, k, ctx, multiline = false }) {
  return (
    <div className={cn('flex gap-2', multiline ? 'items-start' : 'items-baseline')}>
      <span className="shrink-0 font-bold">{label}:</span>
      <Value k={k} ctx={ctx} multiline={multiline} className="flex-1" />
    </div>
  )
}

function AmountRow({ label, k, ctx }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="font-bold">{label}:</span>
      <Value k={k} ctx={ctx} align="right" className="w-24" />
    </div>
  )
}

export function ReceiptSheet(props) {
  const ctx = props
  return (
    <div className="mx-auto w-full max-w-[36rem] rounded-sm bg-[#fcfcf9] px-5 py-6 font-mono text-[13px] leading-7 text-slate-900 shadow-md ring-1 ring-slate-200 sm:px-8">
      {/* Header, centered like the print */}
      <div className="flex flex-wrap items-baseline justify-center gap-x-2 text-center">
        <span className="font-bold">FUR - COMPROBANTE DE PAGO Nº:</span>
        <Value k="numero_comprobante" ctx={ctx} className="w-32" />
      </div>
      <p className="text-center font-bold">GAM - COCHABAMBA</p>
      <div className="flex items-baseline justify-center gap-2">
        <span className="font-bold">FECHA:</span>
        <Value k="fecha" ctx={ctx} className="w-48" />
      </div>

      <div className="mt-2 space-y-0.5">
        <Row label="ENTIDAD RECAUDADORA" k="entidad_recaudadora" ctx={ctx} />
        <Row label="CORRESP." k="corresp" ctx={ctx} />
        <Row label="SUCURSAL" k="sucursal" ctx={ctx} />
        <Row label="AGENCIA" k="agencia" ctx={ctx} />
        <Row label="CAJERO" k="cajero" ctx={ctx} />
        <Row label="FOLIO" k="folio" ctx={ctx} />
      </div>

      <div className="mt-3 flex justify-center">
        <Value k="concepto" ctx={ctx} align="center" className="w-full max-w-sm" />
      </div>
      <Row label="CONTRIBUYENTE" k="contribuyente" ctx={ctx} multiline />

      <div className="my-2 flex items-baseline justify-center gap-2 text-lg">
        <span className="font-bold">Nº INMUEBLE:</span>
        <Value k="nro_inmueble" ctx={ctx} className="w-28 text-lg font-bold" />
      </div>

      <div className="space-y-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-bold">COD. CAT.:</span>
          <Value k="cod_cat" ctx={ctx} align="right" className="w-60" />
        </div>
        <Row label="CLASE" k="clase" ctx={ctx} />
        <Row label="TIPO PROPIEDAD" k="tipo_propiedad" ctx={ctx} />
        <Row label="UBICACION" k="ubicacion" ctx={ctx} multiline />
        <Row label="SUP. TERRENO" k="sup_terreno" ctx={ctx} />
        <Row label="SUP. TOTAL CONSTRUCCION" k="sup_total_construccion" ctx={ctx} />
        <Row label="FACTOR ANTIGÜEDAD" k="factor_antiguedad" ctx={ctx} />
      </div>

      <div className="mt-3 space-y-0.5">
        <Row label="UFV" k="ufv" ctx={ctx} />
        <Row label="BASE IMPONIBLE(Bs)" k="base_imponible" ctx={ctx} />
        <AmountRow label="IMPUESTO DETERMINADO(Bs)" k="impuesto_determinado" ctx={ctx} />
        <AmountRow label="EXENCION(Bs)" k="exencion" ctx={ctx} />
        <AmountRow label="DESCUENTO 10%(Bs)" k="descuento_10" ctx={ctx} />
        <AmountRow label="DESCUENTO APP 5%(Bs)" k="descuento_app_5" ctx={ctx} />
        <AmountRow label="IMPORTE A PAGAR(Bs)" k="importe_a_pagar" ctx={ctx} />
        <AmountRow label="MONTO PAGADO(Bs)" k="monto_pagado" ctx={ctx} />
        <AmountRow label="SALDO GESTION(Bs)" k="saldo_gestion" ctx={ctx} />
      </div>

      <p className="mt-5 border-t border-dashed border-slate-300 pt-2 text-center font-sans text-[11px] text-slate-400">
        Declaración jurada y código QR: no se leen.
      </p>
    </div>
  )
}
