import { useEffect, useRef, useState } from 'react'
import { AlertCircle, LoaderCircle } from 'lucide-react'
import logoUrl from '../../../assets/branding/logo-gamc-cocha.png'
import { cadastralViewerApi } from '../api/cadastralViewerApi'
import AdvertisementPlayer from '../components/AdvertisementPlayer'
import AdManager from '../components/AdManager'
import HowToUse from '../components/HowToUse'
import MapOverlay from '../components/MapOverlay'
import './KioskPage.css'

export default function KioskPage() {
  const [catalog, setCatalog] = useState({ procedures: [], layers: [], advertisements: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isMapOpen, setIsMapOpen] = useState(false)
  const [activeAdvertisementIndex, setActiveAdvertisementIndex] = useState(0)
  const idleTimerRef = useRef(null)

  const [activeSection, setActiveSection] = useState('client')
  const [adMedia, setAdMedia] = useState(null)
  const [uploadError, setUploadError] = useState('')

  useEffect(() => {
    let alive = true
    Promise.all([
      cadastralViewerApi.listProcedures(),
      cadastralViewerApi.listLayers(),
      cadastralViewerApi.listAdvertisements(),
    ]).then(([procedures, layers, advertisements]) => {
      if (alive) setCatalog({ procedures, layers, advertisements })
    }).catch((requestError) => {
      if (alive) setError(requestError?.message || 'No se pudieron cargar los datos del visor.')
    }).finally(() => {
      if (alive) setLoading(false)
    })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!isMapOpen) return undefined
    idleTimerRef.current = window.setTimeout(() => setIsMapOpen(false), 15000)
    return () => window.clearTimeout(idleTimerRef.current)
  }, [isMapOpen])

  const handleAdUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/') && !/\.(mp4|webm|mov|m4v|ogg)$/i.test(file.name)) {
      setUploadError('Seleccione un archivo de video válido.');
      event.target.value = '';
      return;
    }
    setAdMedia({ file, source: URL.createObjectURL(file) });
    setUploadError('');
  };

  const handleClearAd = () => {
    setAdMedia(null);
    setUploadError('');
  };

  function resetIdleTimer() {
    window.clearTimeout(idleTimerRef.current)
    idleTimerRef.current = window.setTimeout(() => setIsMapOpen(false), 15000)
  }

  function openMap() {
    // Solo permitir abrir el mapa si estamos en modo cliente
    if (activeSection === 'client') {
      setIsMapOpen(true)
    }
  }

  function handleLandingKeyDown(event) {
    if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return
    event.preventDefault()
    openMap()
  }

  const activeAdvertisements = catalog.advertisements
    .filter((advertisement) => advertisement.is_active)
    .sort((first, second) => first.display_order - second.display_order)
  const activeAdvertisement = activeAdvertisements[activeAdvertisementIndex]

  return (
    <main className={`vc-root vc-storefront ${activeSection === 'ads' ? 'is-admin' : ''}`}>
      <div className="vc-kiosk vc-storefront-home" onClick={openMap} onKeyDown={handleLandingKeyDown} tabIndex={0}>
        <header className="vc-storefront-topbar">
          <img src={logoUrl} alt="Gobierno Autónomo Municipal de Cochabamba" className="vc-storefront-logo" />
        </header>

        <section className="vc-storefront-content">
          <div className="vc-storefront-intro">
            <span className="vc-storefront-welcome">Bienvenido al kiosco digital</span>
            <h1>Cochabamba <em>avanza contigo</em></h1>
            <p>Toca cualquier parte de la pantalla y se abrirá el visor con todos los buscadores.</p>
          </div>

          {activeSection === 'client' ? (
            <>
              {activeAdvertisement ? (
                <section className="vc-storefront-video" aria-label="Video institucional">
                  <AdvertisementPlayer
                    advertisement={activeAdvertisement}
                    className="vc-storefront-video-player"
                    autoPlay
                    loop={activeAdvertisements.length === 1}
                    onEnded={() => setActiveAdvertisementIndex((index) => (index + 1) % activeAdvertisements.length)}
                  />
                </section>
              ) : adMedia ? (
                <section className="vc-storefront-video" aria-label="Video institucional local">
                  <video src={adMedia.source} title={adMedia.file.name} className="vc-storefront-video-player" autoPlay loop muted />
                </section>
              ) : (
                <div className="vc-storefront-video vc-storefront-video-empty" aria-hidden="true" />
              )}

              <HowToUse />
              <div className="vc-storefront-hint">
                <strong>👆 Toca cualquier parte de la pantalla para abrir el mapa</strong>
                <small>Los buscadores de trámites, calles y predios están en el mapa</small>
              </div>
              <footer className="vc-storefront-foot">Visor Catastral © 2026 · Gobierno Autónomo Municipal de Cochabamba<br />Imágenes: Catastro Municipal</footer>
            </>
          ) : (
            <AdManager media={adMedia} error={uploadError} onUpload={handleAdUpload} onClear={handleClearAd} />
          )}
        </section>
      </div>

      {isMapOpen && <MapOverlay
        visible
        layers={catalog.layers}
        procedures={catalog.procedures}
        onClose={() => setIsMapOpen(false)}
        onActivity={resetIdleTimer}
      />}
      {(loading || error) && <div className="vc-store-status" role={error ? 'alert' : 'status'}>
        {loading ? <LoaderCircle size={17} className="animate-spin" /> : <AlertCircle size={17} />}
        <span>{loading ? 'Cargando información catastral…' : error}</span>
      </div>}
    </main>
  )
}