/** Resumen ejecutivo gerencial (headline + viñetas del backend). */
export function ExecutivePanel({ analysis }) {
  if (!analysis?.executiveHeadline && !(analysis?.executiveBullets || []).length) return null
  return (
    <section className="executive-panel">
      <div className="executive-panel-head">
        <span className="executive-tag">Cuadro ejecutivo</span>
        <h2>Indicadores clave del período</h2>
      </div>
      {analysis.executiveHeadline && <p className="executive-lead">{analysis.executiveHeadline}</p>}
      {(analysis.executiveBullets || []).length > 1 && (
        <ul className="executive-list">
          {analysis.executiveBullets.slice(1).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </section>
  )
}
