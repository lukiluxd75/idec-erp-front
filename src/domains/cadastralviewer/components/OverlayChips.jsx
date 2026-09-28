import { VECTOR_LAYERS } from '../data/wmsConfig';

// Chips to toggle WMS vector layers (manzanas, vías, predios).
export default function OverlayChips({ activeOverlays, onToggle }) {
  return (
    <div className="vc-overlays-bar">
      <span className="vc-ol-label">Capas:</span>
      {Object.entries(VECTOR_LAYERS).map(([key, cfg]) => (
        <button
          key={key}
          type="button"
          className={`vc-ol-chip ${activeOverlays[key] ? 'on' : ''}`}
          onClick={() => onToggle(key)}
        >
          <span className="vc-dot" /> {cfg.label}
        </button>
      ))}
    </div>
  );
}