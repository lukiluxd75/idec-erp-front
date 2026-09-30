// Floating map controls: zoom in/out and recenter.
export default function MapControls({ onZoomIn, onZoomOut, onRecenter }) {
  return (
    <div className="vc-map-tools">
      <button type="button" onClick={onZoomIn}>＋</button>
      <button type="button" onClick={onZoomOut}>－</button>
      <button type="button" onClick={onRecenter} title="Centrar en Cochabamba">◎</button>
    </div>
  );
}