// Bottom sheet showing the selected property details.
export default function PropertyCard({ property, visible }) {
  if (!property) return null;

  return (
    <div className={`vc-ficha ${visible ? 'show' : ''}`}>
      <div className="vc-ficha-handle" />
      <div className="vc-ficha-head">
        <div>
          <h3>{property.address}</h3>
          <p>Barrio {property.neighborhood} · Cochabamba</p>
        </div>
        <span className="vc-chip-uso">{property.landUse}</span>
      </div>
      <div className="vc-ficha-grid">
        <div className="vc-fg"><span>Código catastral</span><b>{property.cadastralCode}</b></div>
        <div className="vc-fg"><span>Área del terreno</span><b>{property.area}</b></div>
        <div className="vc-fg"><span>Estrato</span><b>{property.stratum}</b></div>
        <div className="vc-fg"><span>Año construcción</span><b>{property.builtYear}</b></div>
      </div>
      <div className="vc-ficha-note">Datos de ejemplo · Fuente: catastro municipal</div>
    </div>
  );
}