// Chips to toggle WMS vector layers (manzanas, vías, predios).
export default function OverlayChips({ layers, activeOverlays, onToggle }) {
  return (
    <div className="vc-overlays-bar">
      <span className="vc-ol-label">Capas:</span>
      {layers.map((layer) => (
        <button
          key={layer.code}
          type="button"
          className={`vc-ol-chip ${activeOverlays[layer.code] ? 'on' : ''}`}
          onClick={() => onToggle(layer.code)}
        >
          <span className="vc-dot" /> {layer.name}
        </button>
      ))}
    </div>
  );
}