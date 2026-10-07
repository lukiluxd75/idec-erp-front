const ALPHANUMERIC_ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', '-', '.'],
]

const NUMERIC_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', ''],
]

export default function OnScreenKeyboard({ onKey, onClose, numericOnly = false }) {
  const rows = numericOnly ? NUMERIC_ROWS : ALPHANUMERIC_ROWS
  return (
    <section className={`vc-onscreen-keyboard ${numericOnly ? 'numeric' : ''}`} aria-label="Teclado en pantalla" onClick={(event) => event.stopPropagation()}>
      <div className="vc-onscreen-keyboard-rows">
        {rows.map((row, index) => (
          <div className="vc-onscreen-keyboard-row" key={index}>
            {row.map((key, keyIndex) => (
              key
                ? <button key={key} type="button" onPointerDown={(event) => event.preventDefault()} onClick={() => onKey(key)}>{key}</button>
                : <span key={`spacer-${keyIndex}`} aria-hidden="true" />
            ))}
            {!numericOnly && index === 3 && (
              <button type="button" className="vc-keyboard-action" onPointerDown={(event) => event.preventDefault()} onClick={() => onKey('Backspace')} aria-label="Borrar carácter">
                ⌫
              </button>
            )}
          </div>
        ))}
        <div className="vc-onscreen-keyboard-row vc-onscreen-keyboard-bottom">
          <button type="button" className="vc-keyboard-action" onPointerDown={(event) => event.preventDefault()} onClick={() => onKey('Clear')}>Limpiar</button>
          {numericOnly
            ? <button type="button" className="vc-keyboard-action" onPointerDown={(event) => event.preventDefault()} onClick={() => onKey('Backspace')} aria-label="Borrar carácter">⌫</button>
            : <button type="button" className="vc-keyboard-space" onPointerDown={(event) => event.preventDefault()} onClick={() => onKey(' ')} aria-label="Espacio">Espacio</button>}
          <button type="button" className="vc-keyboard-done" onClick={onClose}>Listo</button>
        </div>
      </div>
    </section>
  )
}
