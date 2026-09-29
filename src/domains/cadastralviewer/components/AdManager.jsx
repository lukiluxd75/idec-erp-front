import VideoAd from './VideoAd';

export default function AdManager({ media, error, onUpload, onClear }) {
  return (
    <section className="vc-admin">
      <div className="vc-admin-heading">
        <span className="vc-admin-eyebrow">CONFIGURACIÓN</span>
        <h1>Publicidad</h1>
        <p>El video cargado se mostrará en la pantalla de Clientes.</p>
      </div>

      <label className="vc-upload-control">
        <input
          type="file"
          accept="video/*,.m4v,.mov"
          onChange={onUpload}
        />
        <span className="vc-upload-icon" aria-hidden="true">↑</span>
        <span><strong>Seleccionar video</strong><small>MP4, WebM, MOV u otro formato de video</small></span>
      </label>

      {error && <p className="vc-upload-error" role="alert">{error}</p>}

      {media && (
        <div className="vc-ad-file-row">
          <div><strong>{media.file.name}</strong><span>{(media.file.size / 1024 / 1024).toFixed(1)} MB</span></div>
          <button type="button" onClick={onClear} aria-label="Quitar video">Quitar</button>
        </div>
      )}

      <VideoAd source={media?.source} title={media?.file.name || 'Vista previa'} />
    </section>
  );
}