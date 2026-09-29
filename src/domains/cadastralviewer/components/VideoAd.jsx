export default function VideoAd({ source, title = 'Cochabamba, vista desde el espacio.' }) {
	return (
		<section className="vc-ad-card" aria-label="Video de Cochabamba">
			{source ? (
				<video className="vc-ad-video" src={source} autoPlay muted loop controls playsInline preload="auto">
					Tu navegador no puede reproducir este video.
				</video>
			) : (
				<div className="vc-ad-placeholder">
					<span className="vc-ad-play" aria-hidden="true">▶</span>
					<div className="vc-ad-caption">
						<strong>{title}</strong>
						<span>Imágenes satelitales históricas 1964 – 2023 · Catastro Municipal</span>
					</div>
					<div className="vc-ad-progress" aria-hidden="true"><span /></div>
				</div>
			)}
		</section>
	);
}
