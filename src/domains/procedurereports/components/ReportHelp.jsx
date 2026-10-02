import { useId, useState } from 'react'
import { CircleHelp } from 'lucide-react'
import { REPORT_GUIDE_SECTIONS, REPORT_HELP } from '../content/reportHelpContent'

export function ReportHelpBlock({ helpId, className = '' }) {
  const content = REPORT_HELP[helpId]
  if (!content) return null
  return (
    <aside className={`help-block ${className}`.trim()} aria-label={`Ayuda: ${content.title}`}>
      <p className="help-block-title">{content.title}</p>
      {content.body && <p className="help-block-body">{content.body}</p>}
      {content.bullets?.length > 0 && (
        <ul className="help-block-list">
          {content.bullets.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </aside>
  )
}

/** Botón compacto que despliega la ayuda de una sección. */
export function ReportHelpHint({ helpId, label = 'Ayuda' }) {
  const content = REPORT_HELP[helpId]
  const [open, setOpen] = useState(false)
  const panelId = useId()
  if (!content) return null

  return (
    <div className="help-hint">
      <button
        type="button"
        className="help-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        title={content.title}
      >
        <CircleHelp className="help-icon" aria-hidden />
        <span>{open ? 'Ocultar ayuda' : label}</span>
      </button>
      {open && (
        <div id={panelId} className="help-popover">
          <ReportHelpBlock helpId={helpId} />
        </div>
      )}
    </div>
  )
}

export function ReportPanelHeading({ title, caption, helpId }) {
  return (
    <div className="panel-head">
      <div className="panel-head-row">
        <h2>{title}</h2>
        {helpId ? <ReportHelpHint helpId={helpId} label="¿Qué significa?" /> : null}
      </div>
      {caption ? <p className="caption">{caption}</p> : null}
    </div>
  )
}

/** Guía general del reporte (índice + textos cortos). */
export function ReportsGuidePanel() {
  return (
    <details className="guide-panel">
      <summary>
        <span>Guía para leer este reporte</span>
        <small>Cómo interpretar cada bloque</small>
        <em>Abrir guía</em>
      </summary>
      <div className="guide-panel-body">
        <p className="guide-intro">
          Este tablero combina <strong>producción del período</strong> (salidas con fecha de salida en el rango) y{' '}
          <strong>bandeja actual</strong> (pendientes sin salida) de la <strong>unidad cartografía</strong> configurada
          en el sistema — certificaciones y registros catastrales, no todos los trámites del catastro. Use los filtros
          arriba antes de sacar conclusiones.
        </p>
        <ReportHelpBlock helpId="scope" className="guide-foot" />
        <div className="guide-grid">
          {REPORT_GUIDE_SECTIONS.map((section) => {
            const helpKey = section.helpId || section.id
            return (
              <article key={section.id} className="guide-card">
                <h3>{section.title}</h3>
                <p>{section.summary}</p>
                {REPORT_HELP[helpKey] ? <ReportHelpHint helpId={helpKey} label="Ver detalle" /> : null}
              </article>
            )
          })}
        </div>
        <ReportHelpBlock helpId="filters" />
      </div>
    </details>
  )
}
